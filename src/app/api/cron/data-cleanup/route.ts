/**
 * Cron job: Data cleanup for inactive accounts (3 months)
 *
 * Ejecutar diariamente a las 10:00 AM UTC:
 *
 *   0 10 * * * curl -s -X POST https://app.estamply.app/api/cron/data-cleanup \
 *     -H "Authorization: Bearer $CRON_SECRET" > /dev/null
 *
 * Env var requerida: CRON_SECRET
 *
 * Fase 1 (83-90 días): Envía email de aviso de eliminación
 * Fase 2 (90+ días): Elimina datos de negocio (no el usuario ni el profile)
 */

import { prisma } from '@/lib/db/prisma'
import { sendDataDeletionWarning } from '@/lib/email'
import { unsubscribe } from '@/lib/mailerlite'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const day83Ago = new Date(now.getTime() - 83 * 24 * 60 * 60 * 1000)
  const day90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  let warningsSent = 0
  let accountsCleaned = 0

  // Find all expired/cancelled profiles (not admin)
  const expiredProfiles = await prisma.profile.findMany({
    where: {
      planStatus: { in: ['expired', 'cancelled'] },
      stripeSubscriptionId: null,
    },
    select: {
      id: true,
      userId: true,
      email: true,
      fullName: true,
      planStatus: true,
      stripeCurrentPeriodEnd: true,
      trialEndsAt: true,
      createdAt: true,
    },
  })

  // Read dataDeletionNoticedAt via raw SQL (column may not exist in Prisma client yet)
  const noticeDates = new Map<string, Date | null>()
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; dataDeletionNoticedAt: Date | null }[]>(
      `SELECT id, "dataDeletionNoticedAt" FROM profiles WHERE "planStatus" IN ('expired', 'cancelled')`
    )
    for (const r of rows) noticeDates.set(r.id, r.dataDeletionNoticedAt)
  } catch { /* column doesn't exist yet */ }

  for (const profile of expiredProfiles) {
    // Skip admins
    if (profile.email && ADMIN_EMAILS.includes(profile.email.toLowerCase())) continue

    // Determine when the account became inactive
    const inactiveDate = profile.stripeCurrentPeriodEnd || profile.trialEndsAt || profile.createdAt
    if (!inactiveDate) continue

    const daysSinceInactive = Math.floor((now.getTime() - inactiveDate.getTime()) / (1000 * 60 * 60 * 24))
    const dataDeletionNoticedAt = noticeDates.get(profile.id) || null

    // FASE 1: Warning (83-90 days, no notice sent yet)
    if (daysSinceInactive >= 83 && daysSinceInactive < 90 && !dataDeletionNoticedAt) {
      if (profile.email) {
        const deletionDate = new Date(inactiveDate.getTime() + 90 * 24 * 60 * 60 * 1000)
        sendDataDeletionWarning(profile.email, profile.fullName || '', formatDate(deletionDate)).catch(() => {})
        console.log(`[data-cleanup] Warning sent to ${profile.email}, deletion date: ${formatDate(deletionDate)}`)

        // Mark as noticed
        await prisma.$executeRawUnsafe(
          `UPDATE profiles SET "dataDeletionNoticedAt" = $1 WHERE id = $2`,
          now, profile.id
        ).catch(() => {})

        warningsSent++
      }
      continue
    }

    // FASE 2: Deletion (90+ days AND notice was sent)
    if (daysSinceInactive >= 90 && dataDeletionNoticedAt) {
      console.log(`[data-cleanup] Deleting business data for ${profile.email} (userId=${profile.userId})`)

      const userId = profile.userId

      // Delete in order to respect foreign keys
      await prisma.$executeRawUnsafe(`DELETE FROM stock_movements WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] stock_movements:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM pedido_materiales WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] pedido_materiales:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM operators WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] operators:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM payments WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] payments:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM orders WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] orders:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM presupuestos WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] presupuestos:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM guias_talles WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] guias_talles:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM coupons WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] coupons:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM promotions WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] promotions:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM medios_pago WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] medios_pago:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM catalog_products WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] catalog_products:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM products WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] products:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM categories WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] categories:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM clients WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] clients:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM suppliers WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] suppliers:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM equipment WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] equipment:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM insumos WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] insumos:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM tecnicas WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] tecnicas:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM team_members WHERE owner_id = $1`, userId).catch(e => console.error('[data-cleanup] team_members:', e))
      await prisma.$executeRawUnsafe(`DELETE FROM workshop_settings WHERE user_id = $1`, userId).catch(e => console.error('[data-cleanup] workshop_settings:', e))

      // Unsubscribe from MailerLite
      if (profile.email) {
        unsubscribe(profile.email)
      }

      console.log(`[data-cleanup] Datos eliminados para ${profile.email}`)
      accountsCleaned++
    }
  }

  console.log(`[data-cleanup] Resumen: ${warningsSent} avisos enviados, ${accountsCleaned} cuentas limpiadas`)

  return NextResponse.json({
    ok: true,
    warningsSent,
    accountsCleaned,
  })
}
