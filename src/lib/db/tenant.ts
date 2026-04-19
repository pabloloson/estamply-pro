import { prisma } from './prisma'

/**
 * Reemplaza la función get_team_owner_id() de Supabase RLS.
 * Dado un userId, retorna el owner_id del equipo (o el userId mismo si es owner).
 */
export async function getTeamOwnerId(userId: string): Promise<string> {
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId },
    select: { ownerId: true },
  })
  return teamMember?.ownerId ?? userId
}

/**
 * Helper para agregar filtro de tenant a cualquier query Prisma.
 * Uso: prisma.order.findMany({ where: { ...tenantFilter(ownerId), status: 'pending' } })
 */
export function tenantFilter(ownerId: string) {
  return { userId: ownerId }
}
