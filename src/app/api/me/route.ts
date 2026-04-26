import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTeamOwnerId } from '@/lib/db/tenant'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const userId = session.user.id
  const ownerId = await getTeamOwnerId(userId)

  const [member, profile, workshopSettings] = await Promise.all([
    prisma.teamMember.findFirst({ where: { userId }, select: { permisos: true, ownerId: true } }),
    prisma.profile.findUnique({ where: { userId: ownerId }, select: { plan: true, planStatus: true, trialEndsAt: true, stripeCancelAt: true } }),
    prisma.workshopSettings.findFirst({ where: { userId: ownerId }, select: { settings: true } }),
  ])

  const settings = (workshopSettings?.settings || {}) as Record<string, unknown>

  return NextResponse.json({
    userId,
    ownerId,
    email: session.user.email || '',
    isOwner: !member || member.ownerId === userId,
    permisos: member?.permisos || null,
    plan: profile?.plan || 'pro',
    planStatus: profile?.planStatus || 'trial',
    trialEndsAt: profile?.trialEndsAt || null,
    stripeCancelAt: profile?.stripeCancelAt || null,
    locale: {
      pais: settings.pais || 'AR',
      moneda: settings.moneda_display || 'ARS',
      tipoCambio: settings.tipo_cambio || 1,
    },
  })
}
