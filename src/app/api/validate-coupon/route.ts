import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { code, userId, clientWhatsapp, subtotal } = await req.json()
    if (!code || !userId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const coupon = await prisma.coupon.findFirst({
      where: { userId, code: code.toUpperCase().trim() },
    })

    if (!coupon) return NextResponse.json({ error: 'El código ingresado no es válido.' }, { status: 400 })
    if (coupon.status === 'paused') return NextResponse.json({ error: 'Este cupón está pausado.' }, { status: 400 })
    if (coupon.status === 'exhausted' || (coupon.maxUses && coupon.usedCount >= coupon.maxUses))
      return NextResponse.json({ error: 'Este cupón ya fue utilizado el máximo de veces.' }, { status: 400 })
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      return NextResponse.json({ error: 'Este cupón ya no está disponible.' }, { status: 400 })
    if (coupon.minAmount && coupon.minAmount > 0 && subtotal < coupon.minAmount)
      return NextResponse.json({ error: `Este cupón requiere un pedido mínimo de $${Math.round(coupon.minAmount).toLocaleString()}.` }, { status: 400 })
    if (coupon.onePerClient && clientWhatsapp && coupon.usedByClients.includes(clientWhatsapp))
      return NextResponse.json({ error: 'Ya utilizaste este cupón.' }, { status: 400 })

    return NextResponse.json({
      id: coupon.id, code: coupon.code,
      discount_type: coupon.discountType, discount_value: coupon.discountValue,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
