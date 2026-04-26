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
    prisma.profile.findUnique({ where: { userId: ownerId }, select: { plan: true, planStatus: true, trialEndsAt: true } }),
    prisma.workshopSettings.findFirst({ where: { userId: ownerId }, select: { settings: true } }),
  ])

  // Read stripeCancelAt via raw SQL (column may not exist in Prisma client yet)
  let stripeCancelAt: string | null = null
  try {
    const rows = await prisma.$queryRawUnsafe<{ stripeCancelAt: Date | null }[]>(
      `SELECT "stripeCancelAt" FROM profiles WHERE "userId" = $1 LIMIT 1`, ownerId
    )
    if (rows[0]?.stripeCancelAt) stripeCancelAt = rows[0].stripeCancelAt.toISOString()
  } catch { /* column doesn't exist yet */ }

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
    stripeCancelAt,
    locale: {
      pais: settings.pais || 'AR',
      moneda: settings.moneda_display || 'ARS',
      tipoCambio: settings.tipo_cambio || 1,
    },
  })
}
