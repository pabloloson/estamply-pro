import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.redirect(new URL('/login', req.url))

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile?.stripeCustomerId) return NextResponse.redirect(new URL('/cuenta?error=no_subscription', req.url))

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
    })

    return NextResponse.redirect(portalSession.url)
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.redirect(new URL('/cuenta?error=portal_failed', req.url))
  }
}
