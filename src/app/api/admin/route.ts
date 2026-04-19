import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes(email.toLowerCase())
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'dashboard') {
      const [allProfiles, trialProfiles, recentProfiles, allSettings] = await Promise.all([
        prisma.profile.findMany({ select: { id: true, email: true, fullName: true, workshopName: true, plan: true, planStatus: true, trialEndsAt: true, onboardingCompleted: true, createdAt: true } }),
        prisma.profile.findMany({ where: { planStatus: 'trial' }, select: { id: true, workshopName: true, trialEndsAt: true } }),
        prisma.profile.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, fullName: true, workshopName: true, email: true, plan: true, planStatus: true, createdAt: true } }),
        prisma.workshopSettings.findMany({ select: { userId: true, settings: true } }),
      ])

      const planCounts: Record<string, number> = {}
      const countryCounts: Record<string, number> = {}
      let onboardingCompleted = 0
      for (const p of allProfiles) {
        const plan = p.planStatus === 'trial' ? 'trial' : (p.plan || 'emprendedor')
        planCounts[plan] = (planCounts[plan] || 0) + 1
        if (p.onboardingCompleted) onboardingCompleted++
      }
      for (const s of allSettings) {
        const settings = s.settings as Record<string, unknown>
        const pais = (settings?.pais as string) || 'AR'
        countryCounts[pais] = (countryCounts[pais] || 0) + 1
      }

      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 86400000)
      const trialsExpiringSoon = trialProfiles.filter(t => t.trialEndsAt && t.trialEndsAt >= now && t.trialEndsAt <= weekFromNow).length

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
      const registrationsByDay: Record<string, number> = {}
      for (const p of allProfiles) { const d = p.createdAt; if (d >= thirtyDaysAgo) { const key = d.toISOString().split('T')[0]; registrationsByDay[key] = (registrationsByDay[key] || 0) + 1 } }

      return NextResponse.json({
        totalTalleres: allProfiles.length, onboardingCompleted, planCounts, countryCounts,
        trialsExpiringSoon, trialCount: trialProfiles.length,
        recentProfiles: recentProfiles.map(p => ({ id: p.id, full_name: p.fullName, workshop_name: p.workshopName, email: p.email, plan: p.plan, plan_status: p.planStatus, created_at: p.createdAt.toISOString() })),
        registrationsByDay,
      })
    }

    if (action === 'talleres') {
      const filter = url.searchParams.get('filter') || 'all'
      const search = url.searchParams.get('search') || ''
      const where: Record<string, unknown> = {}
      if (filter === 'trial') where.planStatus = 'trial'
      else if (filter === 'paid') { where.plan = { in: ['pro', 'crecimiento', 'negocio'] }; where.planStatus = { not: 'trial' } }
      else if (filter === 'free') { where.plan = 'emprendedor'; where.planStatus = { not: 'trial' } }
      else if (filter === 'expired') where.planStatus = 'expired'
      if (search) { where.OR = [{ workshopName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { fullName: { contains: search, mode: 'insensitive' } }] }

      const talleres = await prisma.profile.findMany({ where: where as never, orderBy: { createdAt: 'desc' } })
      const userIds = talleres.map(t => t.userId)
      const settings = await prisma.workshopSettings.findMany({ where: { userId: { in: userIds } }, select: { userId: true, settings: true } })
      const settingsMap: Record<string, Record<string, unknown>> = {}
      for (const s of settings) settingsMap[s.userId] = s.settings as Record<string, unknown>

      const enriched = talleres.map(t => ({
        id: t.userId, email: t.email, full_name: t.fullName, workshop_name: t.workshopName,
        plan: t.plan, plan_status: t.planStatus, trial_ends_at: t.trialEndsAt?.toISOString() || null,
        onboarding_completed: t.onboardingCompleted, created_at: t.createdAt.toISOString(),
        pais: settingsMap[t.userId]?.pais || null, catalog_slug: settingsMap[t.userId]?.catalog_slug || null,
      }))
      return NextResponse.json({ talleres: enriched })
    }

    if (action === 'taller-detail') {
      const tallerId = url.searchParams.get('id')
      if (!tallerId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const [profile, settings, orders, presupuestos, clientCount, productCount, teamMembers] = await Promise.all([
        prisma.profile.findUnique({ where: { userId: tallerId } }),
        prisma.workshopSettings.findFirst({ where: { userId: tallerId }, select: { settings: true } }),
        prisma.order.findMany({ where: { userId: tallerId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, totalPrice: true, status: true, createdAt: true } }),
        prisma.presupuesto.count({ where: { userId: tallerId } }),
        prisma.client.count({ where: { userId: tallerId } }),
        prisma.catalogProduct.count({ where: { userId: tallerId } }),
        prisma.teamMember.findMany({ where: { ownerId: tallerId }, select: { id: true, nombre: true, email: true, rol: true, estado: true } }),
      ])
      return NextResponse.json({
        profile: profile ? { ...profile, id: profile.userId, created_at: profile.createdAt.toISOString() } : null,
        settings: settings?.settings || {}, orderCount: orders.length,
        orders: orders.map(o => ({ id: o.id, total_price: o.totalPrice, status: o.status, created_at: o.createdAt.toISOString() })),
        presupuestoCount: presupuestos, clientCount: clientCount, productCount: productCount, teamMembers,
      })
    }

    if (action === 'platform-activity') {
      const [orders, presupuestos, clients, products] = await Promise.all([
        prisma.order.count(), prisma.presupuesto.count(), prisma.client.count(), prisma.catalogProduct.count(),
      ])
      return NextResponse.json({ orders, presupuestos, clients, products })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) { console.error('Admin API error:', err); return NextResponse.json({ error: 'Internal error' }, { status: 500 }) }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { action, tallerId, ...params } = body

    if (action === 'change-plan') {
      await prisma.profile.update({ where: { userId: tallerId }, data: { plan: params.plan, planStatus: params.plan === 'emprendedor' ? 'active' : params.planStatus || 'active' } })
      return NextResponse.json({ ok: true })
    }
    if (action === 'extend-trial') {
      const days = params.days || 7
      const profile = await prisma.profile.findUnique({ where: { userId: tallerId }, select: { trialEndsAt: true } })
      const base = profile?.trialEndsAt || new Date()
      const newEnd = new Date(Math.max(base.getTime(), Date.now()) + days * 86400000)
      await prisma.profile.update({ where: { userId: tallerId }, data: { trialEndsAt: newEnd, planStatus: 'trial', plan: 'pro' } })
      return NextResponse.json({ ok: true })
    }
    if (action === 'toggle-active') {
      await prisma.profile.update({ where: { userId: tallerId }, data: { planStatus: params.active ? 'active' : 'disabled' } })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) { console.error('Admin POST error:', err); return NextResponse.json({ error: 'Internal error' }, { status: 500 }) }
}
