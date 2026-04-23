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

    const [session, newPriceId] = await Promise.all([
      auth(),
      getPriceId(planLookupKey),
    ])

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!newPriceId) {
      return NextResponse.json({ error: `Price not found for: ${planLookupKey}` }, { status: 404 })
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    // Get current subscription to find the subscription item ID
    const subscription = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId)
    const subscriptionItemId = subscription.items.data[0]?.id

    if (!subscriptionItemId) {
      return NextResponse.json({ error: 'No subscription item found' }, { status: 500 })
    }

    // Update subscription with proration
    // Stripe handles proration automatically:
    // - Upgrade: charges difference immediately (prorated)
    // - Downgrade: creates credit for remaining period
    const updatedSubscription = await stripe.subscriptions.update(
      profile.stripeSubscriptionId,
      {
        items: [{
          id: subscriptionItemId,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations',
      }
    )

    // Update profile for immediate UI feedback (webhook will also update)
    const planName = planLookupKey.split('_')[0] // "pro_mensual" → "pro"
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        plan: planName,
        stripePriceId: newPriceId,
      },
    })

    return NextResponse.json({
      success: true,
      plan: planName,
      status: updatedSubscription.status,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[stripe-change-plan] ERROR:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
