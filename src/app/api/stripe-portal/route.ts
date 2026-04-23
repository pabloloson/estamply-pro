import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BASE = () => process.env.NEXTAUTH_URL || 'https://app.estamply.app'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.redirect(`${BASE()}/login`)

    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
    if (!profile?.stripeCustomerId) return NextResponse.redirect(`${BASE()}/cuenta?error=no_subscription`)

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${BASE()}/cuenta`,
    })

    return NextResponse.redirect(portalSession.url)
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.redirect(`${BASE()}/cuenta?error=portal_failed`)
  }
}
