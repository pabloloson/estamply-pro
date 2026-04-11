import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes(email.toLowerCase())
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // Dashboard data
    if (action === 'dashboard') {
      const [
        { data: allProfiles, count: totalTalleres },
        { data: trialProfiles },
        { data: recentProfiles },
      ] = await Promise.all([
        admin.from('profiles').select('id, email, full_name, workshop_name, plan, plan_status, trial_ends_at, onboarding_completed, created_at', { count: 'exact' }),
        admin.from('profiles').select('id, workshop_name, trial_ends_at').eq('plan_status', 'trial'),
        admin.from('profiles').select('id, full_name, workshop_name, email, plan, plan_status, created_at').order('created_at', { ascending: false }).limit(10),
      ])

      // Get workshop settings for country data
      const { data: allSettings } = await admin.from('workshop_settings').select('user_id, settings')

      // Count by plan
      const planCounts: Record<string, number> = {}
      const countryCounts: Record<string, number> = {}
      let onboardingCompleted = 0

      for (const p of allProfiles || []) {
        const plan = p.plan_status === 'trial' ? 'trial' : (p.plan || 'emprendedor')
        planCounts[plan] = (planCounts[plan] || 0) + 1
        if (p.onboarding_completed) onboardingCompleted++
      }

      // Country distribution from settings
      for (const s of allSettings || []) {
        const settings = s.settings as Record<string, unknown>
        const pais = (settings?.pais as string) || 'AR'
        countryCounts[pais] = (countryCounts[pais] || 0) + 1
      }

      // Trials expiring this week
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const trialsExpiringSoon = (trialProfiles || []).filter(t => {
        if (!t.trial_ends_at) return false
        const ends = new Date(t.trial_ends_at)
        return ends >= now && ends <= weekFromNow
      }).length

      // Registration by day (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const registrationsByDay: Record<string, number> = {}
      for (const p of allProfiles || []) {
        const d = new Date(p.created_at)
        if (d >= thirtyDaysAgo) {
          const key = d.toISOString().split('T')[0]
          registrationsByDay[key] = (registrationsByDay[key] || 0) + 1
        }
      }

      return NextResponse.json({
        totalTalleres: totalTalleres || 0,
        onboardingCompleted,
        planCounts,
        countryCounts,
        trialsExpiringSoon,
        trialCount: (trialProfiles || []).length,
        recentProfiles: recentProfiles || [],
        registrationsByDay,
      })
    }

    // List talleres
    if (action === 'talleres') {
      const filter = url.searchParams.get('filter') || 'all'
      const search = url.searchParams.get('search') || ''

      let query = admin.from('profiles').select('id, email, full_name, workshop_name, plan, plan_status, trial_ends_at, onboarding_completed, created_at')

      if (filter === 'trial') query = query.eq('plan_status', 'trial')
      else if (filter === 'paid') query = query.in('plan', ['crecimiento', 'negocio']).neq('plan_status', 'trial')
      else if (filter === 'free') query = query.eq('plan', 'emprendedor').neq('plan_status', 'trial')
      else if (filter === 'expired') query = query.eq('plan_status', 'expired')

      if (search) {
        query = query.or(`workshop_name.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`)
      }

      const { data: talleres } = await query.order('created_at', { ascending: false })

      // Get settings for country info
      const userIds = (talleres || []).map(t => t.id)
      const { data: settings } = await admin.from('workshop_settings').select('user_id, settings').in('user_id', userIds.length > 0 ? userIds : ['none'])

      const settingsMap: Record<string, Record<string, unknown>> = {}
      for (const s of settings || []) {
        settingsMap[s.user_id] = s.settings as Record<string, unknown>
      }

      const enriched = (talleres || []).map(t => ({
        ...t,
        pais: (settingsMap[t.id]?.pais as string) || null,
        catalog_slug: (settingsMap[t.id]?.catalog_slug as string) || null,
      }))

      return NextResponse.json({ talleres: enriched })
    }

    // Taller detail
    if (action === 'taller-detail') {
      const tallerId = url.searchParams.get('id')
      if (!tallerId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

      const [
        { data: profile },
        { data: settings },
        { data: orders },
        { data: presupuestos },
        { data: clients },
        { data: catalogProducts },
        { data: teamMembers },
      ] = await Promise.all([
        admin.from('profiles').select('*').eq('id', tallerId).single(),
        admin.from('workshop_settings').select('settings').eq('user_id', tallerId).single(),
        admin.from('orders').select('id, total_price, status, created_at').eq('user_id', tallerId).order('created_at', { ascending: false }),
        admin.from('presupuestos').select('id, total, created_at').eq('user_id', tallerId),
        admin.from('clients').select('id').eq('user_id', tallerId),
        admin.from('catalog_products').select('id').eq('user_id', tallerId),
        admin.from('team_members').select('id, nombre, email, rol, estado').eq('owner_id', tallerId),
      ])

      return NextResponse.json({
        profile,
        settings: settings?.settings || {},
        orderCount: orders?.length || 0,
        orders: (orders || []).slice(0, 10),
        presupuestoCount: presupuestos?.length || 0,
        clientCount: clients?.length || 0,
        productCount: catalogProducts?.length || 0,
        teamMembers: teamMembers || [],
      })
    }

    // Admin actions
    if (action === 'update-taller') {
      return NextResponse.json({ error: 'Use POST' }, { status: 405 })
    }

    if (action === 'platform-activity') {
      const [
        { count: orderCount },
        { count: presupuestoCount },
        { count: clientCount },
        { count: productCount },
      ] = await Promise.all([
        admin.from('orders').select('*', { count: 'exact', head: true }),
        admin.from('presupuestos').select('*', { count: 'exact', head: true }),
        admin.from('clients').select('*', { count: 'exact', head: true }),
        admin.from('catalog_products').select('*', { count: 'exact', head: true }),
      ])

      return NextResponse.json({
        orders: orderCount || 0,
        presupuestos: presupuestoCount || 0,
        clients: clientCount || 0,
        products: productCount || 0,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Admin API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST for write operations
export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const body = await req.json()
    const { action, tallerId, ...params } = body

    if (action === 'change-plan') {
      await admin.from('profiles').update({
        plan: params.plan,
        plan_status: params.plan === 'emprendedor' ? 'active' : params.planStatus || 'active',
      }).eq('id', tallerId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'extend-trial') {
      const days = params.days || 7
      const { data: profile } = await admin.from('profiles').select('trial_ends_at').eq('id', tallerId).single()
      const base = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : new Date()
      const newEnd = new Date(Math.max(base.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000)
      await admin.from('profiles').update({
        trial_ends_at: newEnd.toISOString(),
        plan_status: 'trial',
        plan: 'crecimiento',
      }).eq('id', tallerId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'toggle-active') {
      await admin.from('profiles').update({
        plan_status: params.active ? 'active' : 'disabled',
      }).eq('id', tallerId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('Admin POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
