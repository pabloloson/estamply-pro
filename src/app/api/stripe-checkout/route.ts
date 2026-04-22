import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.redirect(new URL('/login', req.url))

    const lookupKey = req.nextUrl.searchParams.get('plan') || 'pro_mensual'
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.redirect(new URL('/cuenta', req.url))

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true })
    if (!prices.data.length) return NextResponse.redirect(new URL('/cuenta?error=price_not_found', req.url))

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: profile.stripeCustomerId || undefined,
      customer_email: !profile.stripeCustomerId ? session.user.email! : undefined,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      metadata: { userId: session.user.id },
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/cuenta?payment=cancelled`,
      subscription_data: { metadata: { userId: session.user.id } },
    })

    return NextResponse.redirect(checkoutSession.url!)
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.redirect(new URL('/cuenta?error=checkout_failed', req.url))
  }
}
