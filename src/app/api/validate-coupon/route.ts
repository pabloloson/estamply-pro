import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { code, userId, clientWhatsapp, subtotal } = await req.json()
    if (!code || !userId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code.toUpperCase().trim())
      .single()

    if (!coupon) return NextResponse.json({ error: 'El código ingresado no es válido.' }, { status: 400 })
    if (coupon.status === 'paused') return NextResponse.json({ error: 'Este cupón está pausado.' }, { status: 400 })
    if (coupon.status === 'exhausted' || (coupon.max_uses && coupon.used_count >= coupon.max_uses))
      return NextResponse.json({ error: 'Este cupón ya fue utilizado el máximo de veces.' }, { status: 400 })
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return NextResponse.json({ error: 'Este cupón ya no está disponible.' }, { status: 400 })
    if (coupon.min_amount > 0 && subtotal < coupon.min_amount)
      return NextResponse.json({ error: `Este cupón requiere un pedido mínimo de $${Math.round(coupon.min_amount).toLocaleString()}.` }, { status: 400 })
    if (coupon.one_per_client && clientWhatsapp && (coupon.used_by_clients || []).includes(clientWhatsapp))
      return NextResponse.json({ error: 'Ya utilizaste este cupón.' }, { status: 400 })

    return NextResponse.json({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
