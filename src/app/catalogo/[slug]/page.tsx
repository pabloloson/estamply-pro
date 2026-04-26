import { prisma } from '@/lib/db/prisma'
import type { Metadata } from 'next'
import CatalogPage from './CatalogClient'
import CatalogUnavailable from './CatalogUnavailable'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

async function findWorkshopBySlug(slug: string) {
  const allSettings = await prisma.workshopSettings.findMany({ select: { settings: true, userId: true } })
  return allSettings.find((ws: typeof allSettings[number]) => (ws.settings as Record<string, unknown>)?.catalog_slug === slug) || null
}

function isOwnerPlanExpired(profile: { planStatus: string; trialEndsAt: Date | null } | null): boolean {
  if (!profile) return true
  const { planStatus, trialEndsAt } = profile
  if (planStatus === 'expired' || planStatus === 'cancelled') return true
  if (planStatus === 'trial' && trialEndsAt && trialEndsAt.getTime() < Date.now()) return true
  return false
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const match = await findWorkshopBySlug(slug)

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

export default async function Page({ params }: Props) {
  const { slug } = await params
  const match = await findWorkshopBySlug(slug)

  if (!match) return <CatalogUnavailable />

  const profile = await prisma.profile.findUnique({
    where: { userId: match.userId },
    select: { planStatus: true, trialEndsAt: true },
  })

  if (isOwnerPlanExpired(profile)) return <CatalogUnavailable />

  return <CatalogPage />
}
