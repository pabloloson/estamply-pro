import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No hay suscripción activa' }, { status: 400 })
    }

    if (profile.planStatus !== 'canceling') {
      return NextResponse.json({ error: 'La suscripción no está en proceso de cancelación' }, { status: 400 })
    }

    // Revert cancellation in Stripe
    await stripe.subscriptions.update(profile.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })

    // Update local DB immediately (webhook will also fire but this gives instant UI feedback)
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        planStatus: 'active',
        stripeCancelAt: null,
      },
    })

    return NextResponse.json({ ok: true, planStatus: 'active' })
  } catch (error) {
    console.error('Revert cancel error:', error)
    return NextResponse.json({ error: 'Error al revertir la cancelación' }, { status: 500 })
  }
}
