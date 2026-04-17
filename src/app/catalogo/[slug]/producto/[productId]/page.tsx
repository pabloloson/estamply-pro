import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { RedirectToProduct } from './RedirectClient'

interface Props { params: Promise<{ slug: string; productId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productId } = await params
  const supabase = await createClient()

  // Get shop info
  const { data: match } = await supabase
    .from('workshop_settings')
    .select('settings, user_id')
    .filter('settings->>catalog_slug', 'eq', slug)
    .single()

  if (!match) return { title: 'Producto no encontrado' }

  const s = match.settings as Record<string, unknown>
  const userId = match.user_id as string

  // Get product + profile in parallel
  const [{ data: product }, { data: prof }] = await Promise.all([
    supabase.from('catalog_products').select('name, description, photos, selling_price, precio_anterior').eq('id', productId).eq('user_id', userId).single(),
    supabase.from('profiles').select('business_name, business_logo_url').eq('id', userId).single(),
  ])

  if (!product) return { title: 'Producto no encontrado' }

  const storeName = (s.nombre_tienda as string) || (prof?.business_name as string) || 'Mi Taller'
  const title = `${product.name} | ${storeName}`
  const description = (product.description as string) || `Disponible en ${storeName}. Hacé tu pedido online.`
  const image = ((product.photos as string[]) || [])[0] || (s.banner_url as string) || (prof?.business_logo_url as string) || 'https://www.estamply.app/logo-icon.png'
  const url = `https://www.estamply.app/catalogo/${slug}/producto/${productId}`

  // Check for active promotions
  const { data: promos } = await supabase.from('promotions').select('discount_type, discount_value').eq('user_id', userId).eq('status', 'active')
  const promo = (promos || []).find((p: Record<string, unknown>) => ((p as Record<string, unknown>).product_ids as string[] || []).includes(productId))
  let promoDesc = ''
  if (promo) {
    const origPrice = product.selling_price as number
    const discounted = (promo as Record<string, unknown>).discount_type === 'percentage'
      ? Math.round(origPrice * (1 - ((promo as Record<string, unknown>).discount_value as number) / 100))
      : origPrice - ((promo as Record<string, unknown>).discount_value as number)
    promoDesc = ` — ${(promo as Record<string, unknown>).discount_value}% OFF`
    if (discounted > 0) promoDesc = ` — Antes $${origPrice.toLocaleString()}, ahora $${discounted.toLocaleString()}`
  }

  return {
    title,
    description: description + promoDesc,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: description + promoDesc,
      url,
      siteName: 'Estamply',
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description + promoDesc,
      images: [image],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug, productId } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('workshop_settings')
    .select('settings')
    .filter('settings->>catalog_slug', 'eq', slug)
    .single()

  if (!match) notFound()

  const { data: product } = await supabase
    .from('catalog_products')
    .select('id')
    .eq('id', productId)
    .single()

  if (!product) notFound()

  // Render page with OG tags in HTML (for scrapers), then client-side redirect for users
  return <RedirectToProduct slug={slug} productId={productId} />
}
