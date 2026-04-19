import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ProductPageClient from './ProductPageClient'

interface Props { params: Promise<{ slug: string; productSlug: string }> }

async function findWorkshopBySlug(slug: string) {
  const all = await prisma.workshopSettings.findMany({ select: { settings: true, userId: true } })
  return all.find((ws: typeof all[number]) => (ws.settings as Record<string, unknown>)?.catalog_slug === slug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params
  const match = await findWorkshopBySlug(slug)
  if (!match) return { title: 'Producto no encontrado' }

  const s = match.settings as Record<string, unknown>
  const userId = match.userId

  let product = await prisma.catalogProduct.findFirst({ where: { slug: productSlug, userId }, select: { name: true, description: true, photos: true, sellingPrice: true } })
  if (!product) product = await prisma.catalogProduct.findFirst({ where: { id: productSlug, userId }, select: { name: true, description: true, photos: true, sellingPrice: true } })
  if (!product) return { title: 'Producto no encontrado' }

  const prof = await prisma.profile.findUnique({ where: { userId }, select: { businessName: true, businessLogoUrl: true } })

  const storeName = (s.nombre_tienda as string) || prof?.businessName || 'Mi Taller'
  const title = `${product.name} | ${storeName}`
  const description = product.description || `Disponible en ${storeName}. Hacé tu pedido online.`
  const photos = (product.photos || []) as string[]
  const image = photos[0] || (s.banner_url as string) || prof?.businessLogoUrl || 'https://www.estamply.app/logo-icon.png'
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
  const match = await findWorkshopBySlug(slug)
  if (!match) notFound()

  let product = await prisma.catalogProduct.findFirst({ where: { slug: productSlug, userId: match.userId }, select: { id: true } })
  if (!product) product = await prisma.catalogProduct.findFirst({ where: { id: productSlug, userId: match.userId }, select: { id: true } })
  if (!product) notFound()

  return <ProductPageClient />
}
