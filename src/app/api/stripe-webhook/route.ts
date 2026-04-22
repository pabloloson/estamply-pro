import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // Legacy: kept for backwards compat with old hosted checkout sessions
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId || session.mode !== 'subscription') break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceItem = subscription.items.data[0]
        const lookupKey = priceItem.price.lookup_key || ''
        const plan = getPlanFromPriceId(lookupKey)

        await prisma.profile.update({
          where: { userId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceItem.price.id,
            plan,
            planStatus: 'active',
            stripeCurrentPeriodEnd: new Date(
              (priceItem as unknown as { current_period_end?: number }).current_period_end
                ? (priceItem as unknown as { current_period_end: number }).current_period_end * 1000
                : Date.now()
            ),
          },
        })
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        if (!userId) break

        const priceItem = subscription.items.data[0]
        const lookupKey = priceItem.price.lookup_key || ''
        const plan = getPlanFromPriceId(lookupKey)

        await prisma.profile.update({
          where: { userId },
          data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceItem.price.id,
            plan,
            planStatus: subscription.status === 'trialing' ? 'active' : 'incomplete',
            stripeCurrentPeriodEnd: new Date(
              (priceItem as unknown as { current_period_end?: number }).current_period_end
                ? (priceItem as unknown as { current_period_end: number }).current_period_end * 1000
                : Date.now()
            ),
          },
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const invoiceAny = invoice as unknown as Record<string, unknown>
        const subscriptionId = typeof invoiceAny.subscription === 'string'
          ? invoiceAny.subscription
          : (invoiceAny.subscription as { id?: string })?.id
        if (!subscriptionId) break

        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = subscription.metadata?.userId
        const customerId = typeof invoiceAny.customer === 'string' ? invoiceAny.customer : (invoiceAny.customer as { id?: string })?.id

        // Try to find profile by userId from subscription metadata, or by stripeCustomerId
        const profile = userId
          ? await prisma.profile.findUnique({ where: { userId } })
          : customerId
            ? await prisma.profile.findUnique({ where: { stripeCustomerId: customerId } })
            : null
        if (!profile) break

        const priceItem = subscription.items.data[0]
        const lookupKey = priceItem.price.lookup_key || ''
        const plan = getPlanFromPriceId(lookupKey)

        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceItem.price.id,
            plan,
            planStatus: 'active',
            stripeCurrentPeriodEnd: new Date(
              (priceItem as unknown as { current_period_end?: number }).current_period_end
                ? (priceItem as unknown as { current_period_end: number }).current_period_end * 1000
                : Date.now()
            ),
          },
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        if (!userId) break

        const priceItem = subscription.items.data[0]
        const lookupKey = priceItem.price.lookup_key || ''
        const plan = getPlanFromPriceId(lookupKey)
        const status = subscription.status === 'active' || subscription.status === 'trialing'
          ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'inactive'

        await prisma.profile.update({
          where: { userId },
          data: {
            stripePriceId: priceItem.price.id,
            plan,
            planStatus: status,
            stripeCurrentPeriodEnd: new Date(
              (priceItem as unknown as { current_period_end?: number }).current_period_end
                ? (priceItem as unknown as { current_period_end: number }).current_period_end * 1000
                : Date.now()
            ),
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        if (!userId) break

        await prisma.profile.update({
          where: { userId },
          data: { planStatus: 'cancelled', stripeSubscriptionId: null, stripePriceId: null },
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
        const subscriptionId = invoice.subscription
        if (!subscriptionId) break

        await prisma.profile.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: { planStatus: 'past_due' },
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
