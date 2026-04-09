import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, nombre, whatsapp, comentarios, items, total } = body

    if (!userId || !nombre || !whatsapp || !items?.length) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // Find or create client
    const { data: existing } = await supabase
      .from('clients').select('id').eq('user_id', userId).eq('whatsapp', whatsapp).maybeSingle()

    let clientId = existing?.id
    if (!clientId) {
      const { data: newClient } = await supabase
        .from('clients').insert({ user_id: userId, name: nombre, whatsapp }).select('id').single()
      clientId = newClient?.id
    }

    // Generate code
    const codigo = `WEB-${Date.now().toString(36).toUpperCase()}`

    // Fetch business profile for the presupuesto header
    const [{ data: profile }, { data: wsRow }] = await Promise.all([
      supabase.from('profiles').select('business_name,business_cuit,business_address,business_phone,business_email,business_instagram,business_logo_url').eq('id', userId).single(),
      supabase.from('workshop_settings').select('settings').eq('user_id', userId).single(),
    ])
    const wsSettings = (wsRow?.settings || {}) as Record<string, unknown>
    const bizProfile = {
      ...profile,
      business_name: (wsSettings.nombre_tienda as string) || profile?.business_name || 'Mi Taller',
    }

    // Create presupuesto
    const { error } = await supabase.from('presupuestos').insert({
      user_id: userId, client_id: clientId || null, codigo,
      numero: codigo, client_name: nombre,
      items: items.map((i: { name: string; variant: string; quantity: number; price: number }) => ({
        nombre: `${i.name}${i.variant ? ` (${i.variant})` : ''}`,
        cantidad: i.quantity, precioUnit: i.price, subtotal: i.price * i.quantity,
      })),
      total, origen: 'catalogo_web',
      notas: comentarios || null,
      business_profile: bizProfile || {},
    })

    if (error) {
      console.error('Presupuesto insert error:', error)
      return NextResponse.json({ codigo, warning: 'Presupuesto no se pudo crear' })
    }

    return NextResponse.json({ codigo, clientId })
  } catch (e) {
    console.error('Catalog order error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
