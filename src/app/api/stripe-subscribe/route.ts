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
    console.log('[stripe-subscribe] profile:', {
      stripeCustomerId: profile.stripeCustomerId,
      stripeSubscriptionId: profile.stripeSubscriptionId,
      planStatus: profile.planStatus,
    })

    // Cancel ALL incomplete/active subscriptions for this customer to avoid duplicates
    if (profile.stripeCustomerId) {
      try {
        const existingSubs = await stripe.subscriptions.list({
          customer: profile.stripeCustomerId,
          status: 'all',
          limit: 10,
        })
        for (const sub of existingSubs.data) {
          if (['active', 'trialing', 'past_due', 'incomplete'].includes(sub.status)) {
            console.log('[stripe-subscribe] cancelling sub:', sub.id, sub.status)
            await stripe.subscriptions.cancel(sub.id)
          }
        }
      } catch (e: unknown) {
        console.log('[stripe-subscribe] error cleaning subs:', (e as Error)?.message)
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
      console.log('[stripe-subscribe] created customer:', customerId)
    }

    // Look up the price
    const prices = await stripe.prices.list({ lookup_keys: [planLookupKey], active: true, limit: 1 })
    console.log('[stripe-subscribe] prices:', prices.data.map(p => ({ id: p.id, key: p.lookup_key, amount: p.unit_amount })))
    if (!prices.data.length) {
      return NextResponse.json({ error: `Price not found for: ${planLookupKey}` }, { status: 404 })
    }

    const priceId = prices.data[0].id

    // Create subscription — DO NOT use expand, retrieve invoice separately
    console.log('[stripe-subscribe] creating sub, customer:', customerId, 'price:', priceId)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { userId: session.user.id },
    })
    console.log('[stripe-subscribe] sub created:', subscription.id, 'status:', subscription.status)

    // Get the invoice ID from the subscription
    const invoiceId = typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id
    console.log('[stripe-subscribe] invoiceId:', invoiceId)

    if (!invoiceId) {
      return NextResponse.json({ error: 'No invoice on subscription' }, { status: 500 })
    }

    // Retrieve the invoice with payment_intent expanded
    const invoice = await stripe.invoices.retrieve(invoiceId, {
      expand: ['payment_intent'],
    })
    console.log('[stripe-subscribe] invoice:', invoice.id, 'status:', invoice.status, 'amount_due:', invoice.amount_due)

    // Get client_secret from the expanded payment_intent
    let clientSecret: string | null = null
    const pi = (invoice as any).payment_intent

    console.log('[stripe-subscribe] payment_intent:', typeof pi, pi ? (typeof pi === 'string' ? pi : pi.id) : 'null')

    if (pi && typeof pi === 'object' && pi.client_secret) {
      clientSecret = pi.client_secret
    } else if (typeof pi === 'string') {
      // Fallback: retrieve PaymentIntent directly
      console.log('[stripe-subscribe] retrieving PI directly:', pi)
      const fullPi = await stripe.paymentIntents.retrieve(pi)
      clientSecret = fullPi.client_secret
    }

    if (!clientSecret) {
      // Last resort: check if invoice has no amount due (free plan?)
      console.error('[stripe-subscribe] NO client_secret. Full invoice dump:', JSON.stringify({
        id: invoice.id,
        status: invoice.status,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        payment_intent: pi,
        subscription: (invoice as any).subscription,
      }))
      return NextResponse.json({
        error: 'Could not get payment secret. Check server logs for details.',
      }, { status: 500 })
    }

    console.log('[stripe-subscribe] SUCCESS, returning clientSecret')
    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[stripe-subscribe] ERROR:', message)
    if (error instanceof Error && error.stack) {
      console.error('[stripe-subscribe] stack:', error.stack)
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
