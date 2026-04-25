import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTeamOwnerId } from '@/lib/db/tenant'
import { sendQuoteEmail } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { to, presupuestoId } = await req.json()
  if (!to || !presupuestoId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const ownerId = await getTeamOwnerId(session.user.id)
  const [presupuesto, profile] = await Promise.all([
    prisma.presupuesto.findFirst({ where: { id: presupuestoId, userId: ownerId } }),
    prisma.profile.findUnique({ where: { userId: ownerId } }),
  ])

  if (!presupuesto) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

  const workshopName = profile?.workshopName || profile?.businessName || 'Mi Taller'
  const total = `$${Number(presupuesto.total || 0).toLocaleString('es-AR')}`
  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'}/p/${presupuesto.codigo}`

  await sendQuoteEmail(to, workshopName, presupuesto.codigo, total, quoteUrl)

  return NextResponse.json({ ok: true })
}
