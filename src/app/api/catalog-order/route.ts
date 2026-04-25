import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { sendNewOrderFromCatalog } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, nombre, whatsapp, comentarios, items, total, medioPago, ajustePorcentaje, ajusteMonto, couponCode } = body

    if (!userId || !nombre || !whatsapp || !items?.length) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // Find or create client
    let client = await prisma.client.findFirst({ where: { userId, whatsapp } })
    if (!client) {
      client = await prisma.client.create({ data: { userId, name: nombre, whatsapp } })
    }

    const codigo = `WEB-${Date.now().toString(36).toUpperCase()}`

    const [profile, wsRow] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.workshopSettings.findFirst({ where: { userId }, select: { settings: true } }),
    ])
    const wsSettings = (wsRow?.settings || {}) as Record<string, unknown>
    const bizProfile = {
      business_name: (wsSettings.nombre_tienda as string) || profile?.businessName || 'Mi Taller',
      business_logo_url: profile?.businessLogoUrl, business_cuit: profile?.businessCuit,
      business_address: profile?.businessAddress, business_phone: profile?.businessPhone,
      business_email: profile?.businessEmail, business_instagram: profile?.businessInstagram,
      business_website: profile?.businessWebsite, city: profile?.city, province: profile?.province,
    }

    const rawCond = wsSettings.condiciones_default as Array<string | { text: string; activa: boolean }> | undefined
    const condicionesText = rawCond
      ? rawCond.filter(c => typeof c === 'string' || (c as { activa: boolean }).activa !== false).map(c => typeof c === 'string' ? `· ${c}` : `· ${(c as { text: string }).text}`).join('\n')
      : null

    await prisma.presupuesto.create({
      data: {
        userId, clientId: client.id, codigo, numero: codigo, clientName: nombre,
        items: items.map((i: { name: string; variant: string; quantity: number; price: number }) => ({
          nombre: `${i.name}${i.variant ? ` (${i.variant})` : ''}`,
          cantidad: i.quantity, precioUnit: i.price, subtotal: i.price * i.quantity,
        })),
        total, origen: 'catalogo_web', notas: comentarios || null,
        condiciones: condicionesText, businessProfile: bizProfile,
        medioPagoNombre: medioPago || null, ajustePorcentaje: ajustePorcentaje || 0,
        ajusteMonto: ajusteMonto || 0, totalFinal: total,
      },
    })

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({ where: { userId, code: couponCode.toUpperCase() } })
      if (coupon) {
        const usedBy = [...(coupon.usedByClients || []), whatsapp].filter(Boolean)
        await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: coupon.usedCount + 1, usedByClients: usedBy } })
      }
    }

    // Notify taller owner by email (fire-and-forget)
    if (profile?.email) {
      const ownerName = profile.fullName || ''
      const totalFormatted = `$${Number(total).toLocaleString('es-AR')}`
      sendNewOrderFromCatalog(profile.email, ownerName, nombre, totalFormatted, `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'}/presupuesto`).catch(() => {})
    }

    return NextResponse.json({ codigo, clientId: client.id })
  } catch (e) {
    console.error('Catalog order error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
