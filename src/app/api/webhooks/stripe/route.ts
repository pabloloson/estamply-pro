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
import { changePlan, removeFromGroup, moveToCancelled } from '@/lib/mailerlite'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.estamply.app'

const MAILERLITE_GROUPS = {
  trial: '185765216948061997',
  emprendedor: '185765240191845421',
  pro: '185765256598914620',
  negocio: '185765269312898329',
} as const

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function getProfileByCustomerId(customerId: string) {
  return prisma.profile.findUnique({ where: { stripeCustomerId: customerId } })
}

async function getProfileBySubscriptionId(subscriptionId: string) {
  return prisma.profile.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
}

/** Resolve profile from subscription: try metadata.userId first, then customerId, then subscriptionId */
async function resolveProfile(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (userId) {
    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (profile) return profile
  }
  // Fallback: find by customer ID
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (customerId) {
    const profile = await getProfileByCustomerId(customerId)
    if (profile) return profile
  }
  // Fallback: find by subscription ID
  const profile = await getProfileBySubscriptionId(subscription.id)
  if (profile) return profile
  return null
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

  console.log(`[webhook] Received event: ${event.type}`)

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

        const profileCheckout = await prisma.profile.findUnique({ where: { userId }, select: { email: true } })

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

        // Move to plan group in MailerLite (handles reactivation from cancelled too)
        if (profileCheckout?.email) {
          console.log(`[webhook] checkout.completed: calling changePlan for ${profileCheckout.email} → ${plan}`)
          changePlan(profileCheckout.email, plan as 'trial' | 'emprendedor' | 'pro' | 'negocio').catch(() => {})
        }
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
          changePlan(profile.email, plan as 'trial' | 'emprendedor' | 'pro' | 'negocio').catch(() => {})
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
        const profileUpd = await resolveProfile(subscription)
        if (!profileUpd) {
          console.error(`[webhook] subscription.updated: no profile found for sub=${subscription.id}`)
          break
        }
        console.log(`[webhook] subscription.updated for profile=${profileUpd.id}, email=${profileUpd.email}`)

        const priceItem = subscription.items.data[0]
        const lookupKey = priceItem.price.lookup_key || ''
        const newPlan = getPlanFromPriceId(lookupKey)
        const periodEnd = (priceItem as unknown as { current_period_end?: number }).current_period_end
        const cancelAtPeriodEnd = (subscription as unknown as { cancel_at_period_end?: boolean }).cancel_at_period_end
        const cancelAt = (subscription as unknown as { cancel_at?: number | null }).cancel_at

        const oldPlan = profileUpd.plan || ''
        const wasCanceling = profileUpd.planStatus === 'canceling'

        console.log(`[webhook] cancel_at_period_end=${cancelAtPeriodEnd}, cancel_at=${cancelAt}, wasCanceling=${wasCanceling}`)

        // A) User scheduled cancellation (cancel_at_period_end = true OR cancel_at is set)
        if (cancelAtPeriodEnd || (cancelAt && cancelAt > Math.floor(Date.now() / 1000))) {
          const cancelDate = cancelAt ? new Date(cancelAt * 1000) : (periodEnd ? new Date(periodEnd * 1000) : new Date())
          console.log(`[webhook] Setting planStatus=canceling, cancelDate=${cancelDate.toISOString()}`)

          await prisma.profile.update({
            where: { id: profileUpd.id },
            data: {
              planStatus: 'canceling',
              stripeCurrentPeriodEnd: new Date(periodEnd ? periodEnd * 1000 : Date.now()),
            },
          })

          // Also store cancel date via raw SQL since column may not exist in Prisma client yet
          await prisma.$executeRawUnsafe(
            `UPDATE profiles SET "stripeCancelAt" = $1 WHERE id = $2`,
            cancelDate, profileUpd.id
          ).catch(err => console.error('[webhook] stripeCancelAt update failed (column may not exist):', err))

          // Send cancellation scheduled email + move to Cancelados in MailerLite
          if (profileUpd.email) {
            sendSubscriptionCanceled(profileUpd.email, profileUpd.fullName || '', formatDate(cancelDate)).catch(() => {})
            moveToCancelled(profileUpd.email, profileUpd.plan, 'cancelled').catch(() => {})
          }
          break
        }

        // B) User reverted cancellation (was canceling, now no cancel scheduled)
        if (wasCanceling && !cancelAtPeriodEnd && !cancelAt) {
          console.log(`[webhook] Cancellation reverted`)
          await prisma.profile.update({
            where: { id: profileUpd.id },
            data: {
              planStatus: 'active',
              stripeCurrentPeriodEnd: new Date(periodEnd ? periodEnd * 1000 : Date.now()),
            },
          })
          // Move back to plan group in MailerLite
          if (profileUpd.email) {
            changePlan(profileUpd.email, profileUpd.plan as 'trial' | 'emprendedor' | 'pro' | 'negocio').catch(() => {})
          }
          await prisma.$executeRawUnsafe(
            `UPDATE profiles SET "stripeCancelAt" = NULL WHERE id = $1`,
            profileUpd.id
          ).catch(() => {})
          break
        }

        // C) Normal plan change (upgrade/downgrade)
        const status = subscription.status === 'active' || subscription.status === 'trialing'
          ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'inactive'

        await prisma.profile.update({
          where: { id: profileUpd.id },
          data: {
            stripePriceId: priceItem.price.id,
            plan: newPlan,
            planStatus: status,
            stripeCurrentPeriodEnd: new Date(periodEnd ? periodEnd * 1000 : Date.now()),
          },
        })
        await prisma.$executeRawUnsafe(
          `UPDATE profiles SET "stripeCancelAt" = NULL WHERE id = $1`,
          profileUpd.id
        ).catch(() => {})

        // Always update MailerLite group (handles upgrade, downgrade, and reactivation)
        if (profileUpd.email) {
          console.log(`[webhook] subscription.updated C: calling changePlan for ${profileUpd.email} → ${newPlan}`)
          changePlan(profileUpd.email, newPlan as 'trial' | 'emprendedor' | 'pro' | 'negocio').catch(() => {})
        }

        // Send upgrade/downgrade email if plan changed
        if (profileUpd.email && oldPlan && oldPlan !== newPlan) {
          const price = priceItem.price.unit_amount ? `$${(priceItem.price.unit_amount / 100).toFixed(0)}/mes` : ''
          const hierarchy = ['emprendedor', 'pro', 'negocio']
          const isUpgrade = hierarchy.indexOf(newPlan) > hierarchy.indexOf(oldPlan)
          if (isUpgrade) {
            sendPlanUpgraded(profileUpd.email, profileUpd.fullName || '', oldPlan, newPlan, price).catch(() => {})
          } else {
            const endDate = formatDate(new Date(periodEnd ? periodEnd * 1000 : Date.now()))
            sendPlanDowngraded(profileUpd.email, profileUpd.fullName || '', oldPlan, newPlan, endDate).catch(() => {})
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const profileDel = await resolveProfile(subscription)
        if (!profileDel) {
          console.error(`[webhook] subscription.deleted: no profile found for sub=${subscription.id}`)
          break
        }
        console.log(`[webhook] subscription.deleted for profile=${profileDel.id}, email=${profileDel.email}`)

        await prisma.profile.update({
          where: { id: profileDel.id },
          data: {
            planStatus: 'expired',
            stripeSubscriptionId: null,
            stripePriceId: null,
          },
        })
        await prisma.$executeRawUnsafe(
          `UPDATE profiles SET "stripeCancelAt" = NULL WHERE id = $1`,
          profileDel.id
        ).catch(() => {})

        // Send cancellation email only if we didn't already send it during "canceling" phase
        if (profileDel.email && profileDel.planStatus !== 'canceling') {
          const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end
          const accessUntil = periodEnd ? formatDate(new Date(periodEnd * 1000)) : 'hoy'
          sendSubscriptionCanceled(profileDel.email, profileDel.fullName || '', accessUntil).catch(() => {})
        }

        // Move to Cancelados in MailerLite (stays in Todos)
        if (profileDel.email) {
          moveToCancelled(profileDel.email, profileDel.plan, 'cancelled').catch(() => {})
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
