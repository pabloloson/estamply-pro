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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    if (!planLookupKey || typeof planLookupKey !== 'string') {
      return NextResponse.json({ error: 'Missing planLookupKey' }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Cancel ALL existing subscriptions for this customer
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
    if (!prices.data.length) {
      return NextResponse.json({ error: `Price not found for: ${planLookupKey}` }, { status: 404 })
    }

    // Create subscription with immediate payment (no trial)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: prices.data[0].id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { userId: session.user.id },
    })
    console.log('[stripe-subscribe] sub created:', subscription.id, 'status:', subscription.status)

    // Get invoice ID
    const invoiceId = typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id

    if (!invoiceId) {
      return NextResponse.json({ error: 'No invoice on subscription' }, { status: 500 })
    }

    // Retrieve the invoice — in Stripe SDK v22 (API 2024+), the client_secret
    // is in invoice.confirmation_secret.client_secret, NOT invoice.payment_intent
    const invoice = await stripe.invoices.retrieve(invoiceId)
    console.log('[stripe-subscribe] invoice:', invoice.id, 'confirmation_secret:', invoice.confirmation_secret)

    const clientSecret = invoice.confirmation_secret?.client_secret

    if (!clientSecret) {
      console.error('[stripe-subscribe] No confirmation_secret on invoice:', {
        id: invoice.id,
        status: invoice.status,
        confirmation_secret: invoice.confirmation_secret,
      })
      return NextResponse.json({ error: 'No client secret on invoice' }, { status: 500 })
    }

    console.log('[stripe-subscribe] SUCCESS')
    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[stripe-subscribe] ERROR:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
