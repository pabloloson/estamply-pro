import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Configurá SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel para poder invitar usuarios.' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verify inviter is an owner (not a team member)
    const { data: isMember } = await supabaseAdmin.from('team_members').select('id').eq('user_id', user.id).maybeSingle()
    if (isMember) return NextResponse.json({ error: 'Solo el dueño del taller puede invitar usuarios' }, { status: 403 })

    const { nombre, email, password, permisos } = await req.json()
    if (!nombre || !email || !password) return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })

    // Create auth user with admin API
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: nombre },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Create team member record
    const { error: teamError } = await supabaseAdmin.from('team_members').insert({
      owner_id: user.id, user_id: newUser.user?.id || null,
      nombre, email, rol: 'personalizado', estado: 'activo', permisos,
    })
    if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 })

    return NextResponse.json({ ok: true, userId: newUser.user?.id })
  } catch (e) {
    console.error('Team invite error:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
