import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe, getPriceId } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { planLookupKey } = await req.json()
    if (!planLookupKey || typeof planLookupKey !== 'string') {
      return NextResponse.json({ error: 'Missing planLookupKey' }, { status: 400 })
    }

    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // 1. Get price ID from cache (0ms after first call)
    const priceId = await getPriceId(planLookupKey)
    if (!priceId) {
      return NextResponse.json({ error: `Price not found for: ${planLookupKey}` }, { status: 404 })
    }

    // 2. Get or create Stripe customer (only hits Stripe on first subscription)
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

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

    // 3. Create subscription (~800ms)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: { userId: session.user.id },
    })

    // 4. Get invoice ID
    const invoiceId = typeof subscription.latest_invoice === 'string'
      ? subscription.latest_invoice
      : subscription.latest_invoice?.id

    if (!invoiceId) {
      return NextResponse.json({ error: 'No invoice on subscription' }, { status: 500 })
    }

    // 5. Retrieve invoice to get payment info (~400ms)
    const invoice = await stripe.invoices.retrieve(invoiceId)

    // Try confirmation_secret first (Stripe API 2024+)
    let clientSecret: string | null | undefined = invoice.confirmation_secret?.client_secret

    // Fallback: get from payments array
    if (!clientSecret && invoice.payments?.data?.length) {
      const pi = invoice.payments.data[0].payment?.payment_intent
      if (pi && typeof pi === 'object' && 'client_secret' in pi) {
        clientSecret = (pi as { client_secret: string }).client_secret
      } else if (typeof pi === 'string') {
        const fullPi = await stripe.paymentIntents.retrieve(pi)
        clientSecret = fullPi.client_secret || null
      }
    }

    if (!clientSecret) {
      console.error('[stripe-subscribe] No client_secret:', {
        invoiceId: invoice.id,
        status: invoice.status,
        confirmation_secret: invoice.confirmation_secret,
        paymentsCount: invoice.payments?.data?.length ?? 0,
      })
      return NextResponse.json({ error: 'No client secret found' }, { status: 500 })
    }

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
