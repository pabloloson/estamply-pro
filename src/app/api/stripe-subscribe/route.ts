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

    // Create subscription — no expand, retrieve invoice + PI separately
    console.log('[stripe-subscribe] creating sub, customer:', customerId, 'price:', priceId)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { userId: session.user.id },
    })
    console.log('[stripe-subscribe] sub created:', subscription.id, 'status:', subscription.status)

    // Retrieve the latest invoice separately
    const invoiceId = typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id

    if (!invoiceId) {
      console.error('[stripe-subscribe] No invoice on subscription', subscription.id)
      return NextResponse.json({ error: 'No invoice' }, { status: 500 })
    }

    const invoice = await stripe.invoices.retrieve(invoiceId) as any
    console.log('[stripe-subscribe] invoice:', invoice.id, 'payment_intent:', invoice.payment_intent)

    // Get the PaymentIntent from the invoice
    const paymentIntentId = typeof invoice.payment_intent === 'string'
      ? invoice.payment_intent
      : invoice.payment_intent?.id

    if (!paymentIntentId) {
      console.error('[stripe-subscribe] No payment_intent on invoice', invoice.id)
      return NextResponse.json({ error: 'No payment intent' }, { status: 500 })
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    console.log('[stripe-subscribe] clientSecret obtained for', subscription.id)

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
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
