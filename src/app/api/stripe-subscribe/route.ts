import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { planLookupKey } = await req.json()
    if (!planLookupKey || typeof planLookupKey !== 'string') {
      return NextResponse.json({ error: 'Missing planLookupKey' }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Create Stripe customer if needed
    let customerId = profile.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: { userId: session.user.id },
      })
      customerId = customer.id
      await prisma.profile.update({
        where: { userId: session.user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // Look up the price
    const prices = await stripe.prices.list({ lookup_keys: [planLookupKey], active: true, limit: 1 })
    if (!prices.data.length) {
      return NextResponse.json({ error: 'Price not found' }, { status: 404 })
    }

    // Determine if user should get a trial (only if never had one)
    const hadTrial = !!profile.trialEndsAt
    const trialDays = hadTrial ? undefined : 14

    // Create the subscription with incomplete payment
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: prices.data[0].id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: session.user.id },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    })

    const invoice = subscription.latest_invoice
    if (!invoice || typeof invoice === 'string') {
      return NextResponse.json({ error: 'No invoice' }, { status: 500 })
    }

    const paymentIntent = (invoice as unknown as { payment_intent?: { client_secret?: string } | string | null }).payment_intent
    if (!paymentIntent || typeof paymentIntent === 'string') {
      // Trial subscription — no payment needed yet
      if (subscription.status === 'trialing') {
        return NextResponse.json({
          subscriptionId: subscription.id,
          status: 'trialing',
        })
      }
      return NextResponse.json({ error: 'No payment intent' }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    })
  } catch (error: unknown) {
    console.error('Stripe subscribe error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
