import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTeamOwnerId } from '@/lib/db/tenant'
import DashboardClient from '../DashboardClient'

// test auto-deploy webhook
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ownerId = await getTeamOwnerId(session.user.id)

  const [profile, orders, payments, presupuestos, wsData, materialsCount, equipmentCount, productsCount] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: ownerId }, select: { businessName: true, businessLogoUrl: true } }),
    prisma.order.findMany({ where: { userId: ownerId }, include: { client: { select: { name: true, whatsapp: true } } } }),
    prisma.payment.findMany({ where: { userId: ownerId }, select: { orderId: true, monto: true, fecha: true } }),
    prisma.presupuesto.findMany({ where: { userId: ownerId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, codigo: true, total: true, origen: true, createdAt: true, clientName: true, estado: true } }),
    prisma.workshopSettings.findFirst({ where: { userId: ownerId }, select: { settings: true } }),
    prisma.insumo.count({ where: { userId: ownerId } }),
    prisma.equipment.count({ where: { userId: ownerId } }),
    prisma.catalogProduct.count({ where: { userId: ownerId } }),
  ])

  const s = (wsData?.settings || {}) as Record<string, unknown>
  const shopName = (s.nombre_tienda as string) || profile?.businessName || 'Mi Taller'
  const tipoCambio = (s.tipo_cambio as number) || 0
  const monedaRef = (s.moneda_referencia as string) || 'USD'

  // Map Prisma results to the format DashboardClient expects
  const ordersData = orders.map((o: typeof orders[number]) => ({
    id: o.id, status: o.status, total_price: o.totalPrice, total_cost: o.totalCost,
    due_date: o.dueDate?.toISOString() || null, created_at: o.createdAt.toISOString(),
    items: o.items, notes: o.notes,
    clients: o.client ? { name: o.client.name, whatsapp: o.client.whatsapp } : null,
  }))

  const paymentsData = payments.map((p: typeof payments[number]) => ({
    order_id: p.orderId, monto: p.monto, fecha: p.fecha.toISOString(),
  }))

  const presData = presupuestos.map((p: typeof presupuestos[number]) => ({
    id: p.id, codigo: p.codigo, total: p.total, origen: p.origen,
    created_at: p.createdAt.toISOString(), client_name: p.clientName, estado: p.estado,
  }))

  return (
    <DashboardClient
      shopName={shopName}
      orders={ordersData as Record<string, unknown>[]}
      payments={paymentsData as Record<string, unknown>[]}
      presupuestos={presData as Record<string, unknown>[]}
      setupCounts={{ materials: materialsCount, equipment: equipmentCount, products: productsCount }}
      exchangeRate={tipoCambio > 1 ? { value: tipoCambio, currency: monedaRef } : undefined}
    />
  )
}
