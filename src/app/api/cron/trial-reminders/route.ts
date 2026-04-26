/**
 * Cron job: Trial reminders
 *
 * Debe ejecutarse diariamente a las 9:00 AM UTC.
 * Configurar en Coolify o crontab del VPS:
 *
 *   0 9 * * * curl -s -X POST https://app.estamply.app/api/cron/trial-reminders \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Env var requerida: CRON_SECRET
 */

import { prisma } from '@/lib/db/prisma'
import { sendTrialExpiring, sendTrialExpired } from '@/lib/email'
import { moveToCancelled } from '@/lib/mailerlite'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let expiringCount = 0
  let expiredCount = 0

  // 1. Trial expiring in 3 days
  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const startOfDay3 = new Date(threeDaysFromNow.getFullYear(), threeDaysFromNow.getMonth(), threeDaysFromNow.getDate())
  const endOfDay3 = new Date(startOfDay3.getTime() + 24 * 60 * 60 * 1000)

  const expiringProfiles = await prisma.profile.findMany({
    where: {
      planStatus: 'trial',
      trialEndsAt: { gte: startOfDay3, lt: endOfDay3 },
    },
    select: { email: true, fullName: true },
  })

  for (const p of expiringProfiles) {
    if (p.email) {
      sendTrialExpiring(p.email, p.fullName || '', 3, `${APP_URL}/planes`).catch(() => {})
      expiringCount++
    }
  }

  // 2. Trial expired today
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)

  const expiredProfiles = await prisma.profile.findMany({
    where: {
      planStatus: 'trial',
      trialEndsAt: { gte: startOfToday, lt: endOfToday },
    },
    select: { email: true, fullName: true },
  })

  for (const p of expiredProfiles) {
    if (p.email) {
      sendTrialExpired(p.email, p.fullName || '', `${APP_URL}/planes`).catch(() => {})
      // Move from Trial to Cancelados in MailerLite (stays in Todos)
      moveToCancelled(p.email, 'trial', 'expired')
      expiredCount++
    }
  }

  console.log(`[trial-reminders] Expiring: ${expiringCount}, Expired: ${expiredCount}`)

  return NextResponse.json({
    ok: true,
    expiringEmails: expiringCount,
    expiredEmails: expiredCount,
  })
}
