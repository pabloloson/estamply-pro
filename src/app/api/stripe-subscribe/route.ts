import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planLookupKey } = body
    console.log('stripe-subscribe called', { planLookupKey })

    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

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
      console.log('Created Stripe customer', customerId)
    }

    // Look up the price
    const prices = await stripe.prices.list({ lookup_keys: [planLookupKey], active: true, limit: 1 })
    console.log('Prices found:', prices.data.length, prices.data.map(p => ({ id: p.id, lookup_key: p.lookup_key })))
    if (!prices.data.length) {
      return NextResponse.json({ error: `Price not found for key: ${planLookupKey}` }, { status: 404 })
    }

    // Create subscription — NO trial_period_days, trial is managed internally
    // via profile.planStatus='trial' and profile.trialEndsAt
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: prices.data[0].id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: session.user.id },
    })
    console.log('Subscription created', { id: subscription.id, status: subscription.status })

    const invoice = subscription.latest_invoice
    if (!invoice || typeof invoice === 'string') {
      console.error('No expanded invoice on subscription', subscription.id)
      return NextResponse.json({ error: 'No invoice on subscription' }, { status: 500 })
    }

    const paymentIntent = (invoice as unknown as { payment_intent?: { client_secret?: string } | string | null }).payment_intent
    if (!paymentIntent || typeof paymentIntent === 'string') {
      console.error('No payment_intent on invoice', { invoiceId: invoice.id, paymentIntent })
      return NextResponse.json({ error: 'No payment intent on invoice' }, { status: 500 })
    }

    console.log('Returning clientSecret for subscription', subscription.id)
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
