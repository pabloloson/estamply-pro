import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  sendSubscriptionConfirmed,
  sendPaymentSuccess,
  sendPaymentFailed,
  sendPlanUpgraded,
  sendPlanDowngraded,
  sendSubscriptionCanceled,
} from '@/lib/email'
import { changePlan, removeFromGroup } from '@/lib/mailerlite'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function getProfileByCustomerId(customerId: string) {
  return prisma.profile.findUnique({ where: { stripeCustomerId: customerId } })
}

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
        const periodEnd = (priceItem as unknown as { current_period_end?: number }).current_period_end
        const endDate = new Date(periodEnd ? periodEnd * 1000 : Date.now())

        await prisma.profile.update({
          where: { userId },
          data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceItem.price.id,
            plan,
            planStatus: subscription.status === 'trialing' ? 'active' : 'incomplete',
            stripeCurrentPeriodEnd: endDate,
          },
        })

        // Send subscription confirmed email
        const profile = await prisma.profile.findUnique({ where: { userId } })
        if (profile?.email) {
          const price = priceItem.price.unit_amount ? `$${(priceItem.price.unit_amount / 100).toFixed(0)}` : ''
          sendSubscriptionConfirmed(profile.email, profile.fullName || '', plan, price, formatDate(endDate)).catch(() => {})
          // Move subscriber to new plan group in MailerLite
          changePlan(profile.email, plan as 'trial' | 'emprendedor' | 'pro' | 'negocio')
        }
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

        const profile = userId
          ? await prisma.profile.findUnique({ where: { userId } })
          : customerId
            ? await getProfileByCustomerId(customerId)
            : null
        if (!profile) break

        const priceItem = subscription.items.data[0]
        const lookupKey = priceItem.price.lookup_key || ''
        const plan = getPlanFromPriceId(lookupKey)
        const periodEnd = (priceItem as unknown as { current_period_end?: number }).current_period_end

        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceItem.price.id,
            plan,
            planStatus: 'active',
            stripeCurrentPeriodEnd: new Date(periodEnd ? periodEnd * 1000 : Date.now()),
          },
        })

        // Send payment success email
        if (profile.email) {
          const amount = invoice.amount_paid ? `$${(invoice.amount_paid / 100).toFixed(2)}` : ''
          const invoiceUrl = (invoice as unknown as { hosted_invoice_url?: string }).hosted_invoice_url || undefined
          sendPaymentSuccess(profile.email, profile.fullName || '', amount, invoiceUrl).catch(() => {})
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        if (!userId) break

        const priceItem = subscription.items.data[0]
        const lookupKey = priceItem.price.lookup_key || ''
        const newPlan = getPlanFromPriceId(lookupKey)
        const status = subscription.status === 'active' || subscription.status === 'trialing'
          ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'inactive'
        const periodEnd = (priceItem as unknown as { current_period_end?: number }).current_period_end

        // Get current plan before update
        const profileBefore = await prisma.profile.findUnique({ where: { userId } })
        const oldPlan = profileBefore?.plan || ''

        await prisma.profile.update({
          where: { userId },
          data: {
            stripePriceId: priceItem.price.id,
            plan: newPlan,
            planStatus: status,
            stripeCurrentPeriodEnd: new Date(periodEnd ? periodEnd * 1000 : Date.now()),
          },
        })

        // Send upgrade/downgrade email if plan changed
        if (profileBefore?.email && oldPlan && oldPlan !== newPlan) {
          const price = priceItem.price.unit_amount ? `$${(priceItem.price.unit_amount / 100).toFixed(0)}/mes` : ''
          const hierarchy = ['emprendedor', 'pro', 'negocio']
          const isUpgrade = hierarchy.indexOf(newPlan) > hierarchy.indexOf(oldPlan)
          if (isUpgrade) {
            sendPlanUpgraded(profileBefore.email, profileBefore.fullName || '', oldPlan, newPlan, price).catch(() => {})
          } else {
            const endDate = formatDate(new Date(periodEnd ? periodEnd * 1000 : Date.now()))
            sendPlanDowngraded(profileBefore.email, profileBefore.fullName || '', oldPlan, newPlan, endDate).catch(() => {})
          }
          // Update MailerLite group
          changePlan(profileBefore.email, newPlan as 'trial' | 'emprendedor' | 'pro' | 'negocio')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId
        if (!userId) break

        const profile = await prisma.profile.findUnique({ where: { userId } })

        await prisma.profile.update({
          where: { userId },
          data: { planStatus: 'cancelled', stripeSubscriptionId: null, stripePriceId: null },
        })

        // Send cancellation email
        if (profile?.email) {
          const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end
          const accessUntil = periodEnd ? formatDate(new Date(periodEnd * 1000)) : 'hoy'
          sendSubscriptionCanceled(profile.email, profile.fullName || '', accessUntil).catch(() => {})
          // Remove from plan group in MailerLite (stays in Todos)
          const planGroup = profile.plan as 'trial' | 'emprendedor' | 'pro' | 'negocio'
          const groupId = {
            trial: process.env.MAILERLITE_GROUP_TRIAL,
            emprendedor: process.env.MAILERLITE_GROUP_EMPRENDEDOR,
            pro: process.env.MAILERLITE_GROUP_PRO,
            negocio: process.env.MAILERLITE_GROUP_NEGOCIO,
          }[planGroup]
          if (groupId) removeFromGroup(profile.email, groupId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string }
        const subscriptionId = invoice.subscription
        if (!subscriptionId) break

        const profile = await prisma.profile.findUnique({ where: { stripeSubscriptionId: subscriptionId } })

        await prisma.profile.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { planStatus: 'past_due' },
        })

        // Send payment failed email
        if (profile?.email) {
          sendPaymentFailed(profile.email, profile.fullName || '', `${APP_URL}/cuenta`).catch(() => {})
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
