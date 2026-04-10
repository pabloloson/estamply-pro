import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { nombre, email, password, rol, permisos } = await req.json()
    if (!nombre || !email || !password) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    // Create auth user
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: nombre },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Create team member record
    const { error: teamError } = await supabaseAdmin.from('team_members').insert({
      owner_id: user.id, user_id: newUser.user?.id || null,
      nombre, email, rol, estado: 'activo', permisos,
    })
    if (teamError) return NextResponse.json({ error: teamError.message }, { status: 500 })

    // Copy RLS context: make the new user's queries return the owner's data
    // by setting user_id defaults on relevant tables to match the owner
    // This is handled by checking team_members in queries

    return NextResponse.json({ ok: true, userId: newUser.user?.id })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
