import { prisma } from '@/lib/db/prisma'
import type { Metadata } from 'next'
import CatalogPage from './CatalogClient'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  // Find workshop by catalog_slug in JSONB settings
  const allSettings = await prisma.workshopSettings.findMany({ select: { settings: true, userId: true } })
  const match = allSettings.find((ws: typeof allSettings[number]) => (ws.settings as Record<string, unknown>)?.catalog_slug === slug)

  if (!match) return { title: 'Catálogo no encontrado' }

  const s = match.settings as Record<string, unknown>
  const userId = match.userId

  const prof = await prisma.profile.findUnique({
    where: { userId },
    select: { businessName: true, businessLogoUrl: true },
  })

  const nombre = (s.nombre_tienda as string) || prof?.businessName || 'Mi Taller'
  const description = (s.descripcion_tienda as string) || (s.brand_description as string) || 'Catálogo de productos personalizados'
  const image = (s.banner_url as string) || prof?.businessLogoUrl || 'https://estamply.app/logo-icon.png'
  const url = `https://estamply.app/catalogo/${slug}`

  return {
    title: nombre,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: nombre, description, url, siteName: 'Estamply', images: [{ url: image, width: 1200, height: 630 }], type: 'website' },
    twitter: { card: 'summary_large_image', title: nombre, description, images: [image] },
  }
}

export default function Page() {
  return <CatalogPage />
}
