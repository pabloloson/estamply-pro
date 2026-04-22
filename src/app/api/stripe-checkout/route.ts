import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { lookupKey, priceId: directPriceId } = await req.json()
    if (!lookupKey && !directPriceId) return NextResponse.json({ error: 'lookupKey o priceId requerido' }, { status: 400 })

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    // Resolve priceId from lookup key if needed
    let priceId = directPriceId
    if (lookupKey && !priceId) {
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true })
      if (!prices.data.length) return NextResponse.json({ error: 'Precio no encontrado' }, { status: 404 })
      priceId = prices.data[0].id
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: profile.stripeCustomerId || undefined,
      customer_email: !profile.stripeCustomerId ? session.user.email! : undefined,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: session.user.id },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/planes?payment=cancelled`,
      subscription_data: { metadata: { userId: session.user.id } },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 })
  }
}
