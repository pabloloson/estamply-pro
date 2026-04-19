import { prisma } from '@/lib/db/prisma'
import { notFound } from 'next/navigation'
import PublicQuoteView from './PublicQuoteView'

export default async function PublicPresupuestoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params

  const presupuesto = await prisma.presupuesto.findUnique({ where: { codigo } })
  if (!presupuesto) notFound()

  // Map to snake_case for PublicQuoteView compatibility
  const data = {
    id: presupuesto.id, codigo: presupuesto.codigo, numero: presupuesto.numero,
    fecha: presupuesto.fecha?.toISOString() || '', validez_dias: presupuesto.validezDias || 15,
    client_name: presupuesto.clientName, items: presupuesto.items, total: presupuesto.total || 0,
    condiciones: presupuesto.condiciones, business_profile: presupuesto.businessProfile,
    origen: presupuesto.origen, notas: presupuesto.notas, medio_pago_nombre: presupuesto.medioPagoNombre,
  }

  return <PublicQuoteView presupuesto={data as never} />
}
