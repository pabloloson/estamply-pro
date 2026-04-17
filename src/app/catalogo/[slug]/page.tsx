import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import CatalogPage from './CatalogClient'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('workshop_settings')
    .select('settings, user_id')
    .filter('settings->>catalog_slug', 'eq', slug)
    .single()

  if (!match) return { title: 'Catálogo no encontrado' }

  const s = match.settings as Record<string, unknown>
  const userId = match.user_id as string

  const { data: prof } = await supabase
    .from('profiles')
    .select('business_name, business_logo_url')
    .eq('id', userId)
    .single()

  const nombre = (s.nombre_tienda as string) || (prof?.business_name as string) || 'Mi Taller'
  const description = (s.descripcion_tienda as string) || (s.brand_description as string) || 'Catálogo de productos personalizados'
  const image = (s.banner_url as string) || (prof?.business_logo_url as string) || 'https://www.estamply.app/logo-icon.png'
  const url = `https://www.estamply.app/catalogo/${slug}`

  return {
    title: nombre,
    description,
    openGraph: {
      title: nombre,
      description,
      url,
      siteName: 'Estamply',
      images: [{ url: image, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: nombre,
      description,
      images: [image],
    },
  }
}

export default function Page() {
  return <CatalogPage />
}
