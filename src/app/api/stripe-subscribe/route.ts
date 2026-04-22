import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planLookupKey } = body
    console.log('[stripe-subscribe] called with:', { planLookupKey })

    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      console.log('[stripe-subscribe] not authenticated')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    console.log('[stripe-subscribe] user:', session.user.id, session.user.email)

    if (!planLookupKey || typeof planLookupKey !== 'string') {
      return NextResponse.json({ error: 'Missing planLookupKey' }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    console.log('[stripe-subscribe] profile found:', {
      stripeCustomerId: profile.stripeCustomerId,
      stripeSubscriptionId: profile.stripeSubscriptionId,
      planStatus: profile.planStatus,
    })

    // If user already has an active subscription, cancel the old one first
    if (profile.stripeSubscriptionId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId)
        if (existingSub.status === 'active' || existingSub.status === 'trialing' || existingSub.status === 'past_due') {
          console.log('[stripe-subscribe] cancelling existing subscription:', profile.stripeSubscriptionId)
          await stripe.subscriptions.cancel(profile.stripeSubscriptionId)
        }
      } catch (e: unknown) {
        // Subscription may not exist in Stripe anymore, ignore
        console.log('[stripe-subscribe] could not cancel old sub:', (e as Error)?.message)
      }
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
      console.log('[stripe-subscribe] created Stripe customer:', customerId)
    }

    // Look up the price by lookup_key
    const prices = await stripe.prices.list({ lookup_keys: [planLookupKey], active: true, limit: 1 })
    console.log('[stripe-subscribe] prices found:', prices.data.length, prices.data.map(p => ({ id: p.id, lookup_key: p.lookup_key })))
    if (!prices.data.length) {
      return NextResponse.json({ error: `Price not found for lookup_key: ${planLookupKey}` }, { status: 404 })
    }

    // Create subscription with immediate payment (no trial — managed internally)
    console.log('[stripe-subscribe] creating subscription for customer:', customerId, 'price:', prices.data[0].id)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: prices.data[0].id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: session.user.id },
    })
    console.log('[stripe-subscribe] subscription created:', { id: subscription.id, status: subscription.status })

    // Get the client secret from the subscription's latest invoice
    const invoice = subscription.latest_invoice as any

    if (!invoice) {
      console.error('[stripe-subscribe] no invoice on subscription:', subscription.id)
      return NextResponse.json({ error: 'No invoice on subscription' }, { status: 500 })
    }

    console.log('[stripe-subscribe] invoice details:', {
      invoiceId: invoice.id,
      paymentIntentType: typeof invoice.payment_intent,
      paymentIntentValue: invoice.payment_intent,
    })

    // payment_intent can be a string (ID) if not properly expanded, or an object
    let clientSecret: string | null = null

    if (invoice.payment_intent && typeof invoice.payment_intent === 'object') {
      clientSecret = invoice.payment_intent.client_secret
    } else if (typeof invoice.payment_intent === 'string') {
      // If it came as a string ID, retrieve the full PaymentIntent
      const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent)
      clientSecret = pi.client_secret
    }

    if (!clientSecret) {
      console.error('[stripe-subscribe] could not get client_secret:', {
        invoiceId: invoice.id,
        paymentIntent: invoice.payment_intent,
      })
      return NextResponse.json({ error: 'No payment intent' }, { status: 500 })
    }

    console.log('[stripe-subscribe] success, returning clientSecret for subscription:', subscription.id)
    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('[stripe-subscribe] CATCH error:', message)
    if (stack) console.error('[stripe-subscribe] stack:', stack)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
