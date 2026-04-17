import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ProductPageClient from './ProductPageClient'

interface Props { params: Promise<{ slug: string; productSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('workshop_settings')
    .select('settings, user_id')
    .filter('settings->>catalog_slug', 'eq', slug)
    .single()

  if (!match) return { title: 'Producto no encontrado' }

  const s = match.settings as Record<string, unknown>
  const userId = match.user_id as string

  // Try by slug first, fallback to id for backward compat
  let { data: product } = await supabase.from('catalog_products').select('name, description, photos, selling_price').eq('slug', productSlug).eq('user_id', userId).single()
  if (!product) {
    const r = await supabase.from('catalog_products').select('name, description, photos, selling_price').eq('id', productSlug).eq('user_id', userId).single()
    product = r.data
  }

  if (!product) return { title: 'Producto no encontrado' }

  const { data: prof } = await supabase.from('profiles').select('business_name, business_logo_url').eq('id', userId).single()

  const storeName = (s.nombre_tienda as string) || (prof?.business_name as string) || 'Mi Taller'
  const title = `${product.name} | ${storeName}`
  const description = (product.description as string) || `Disponible en ${storeName}. Hacé tu pedido online.`
  const image = ((product.photos as string[]) || [])[0] || (s.banner_url as string) || (prof?.business_logo_url as string) || 'https://www.estamply.app/logo-icon.png'
  const url = `https://www.estamply.app/catalogo/${slug}/${productSlug}`

  return {
    title, description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url, siteName: 'Estamply', images: [{ url: image, width: 1200, height: 630 }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug, productSlug } = await params
  const supabase = await createClient()

  const { data: match } = await supabase.from('workshop_settings').select('settings').filter('settings->>catalog_slug', 'eq', slug).single()
  if (!match) notFound()

  const userId = (match as Record<string, unknown>).user_id as string || ''
  // Try slug first, then UUID fallback
  let { data: product } = await supabase.from('catalog_products').select('id').eq('slug', productSlug).single()
  if (!product) {
    const r = await supabase.from('catalog_products').select('id').eq('id', productSlug).single()
    product = r.data
  }
  if (!product) notFound()

  return <ProductPageClient />
}
