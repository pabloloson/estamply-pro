import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTeamOwnerId } from '@/lib/db/tenant'
import { Sidebar } from '@/shared/components/Sidebar'
import TrialBanner from '@/shared/components/TrialBanner'
import DemoBanner from '@/shared/components/DemoBanner'
import PlanGate from '@/shared/components/PlanGate'
import { PresupuestoProvider } from '@/features/presupuesto/context/PresupuestoContext'
import { PermissionsProvider } from '@/shared/context/PermissionsContext'
import { LocaleProvider } from '@/shared/context/LocaleContext'

export const dynamic = 'force-dynamic'

function isPlanExpired(profile: { planStatus: string; trialEndsAt: Date | null } | null): boolean {
  if (!profile) return false
  const { planStatus, trialEndsAt } = profile
  if (planStatus === 'expired' || planStatus === 'cancelled') return true
  if (planStatus === 'trial' && trialEndsAt && trialEndsAt.getTime() < Date.now()) return true
  return false
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ownerId = await getTeamOwnerId(session.user.id)
  const profile = await prisma.profile.findUnique({
    where: { userId: ownerId },
    select: {
      workshopName: true,
      onboardingCompleted: true,
      planStatus: true,
      trialEndsAt: true,
    },
  })

  if (profile && !profile.onboardingCompleted) {
    redirect('/onboarding')
  }

  const planExpired = isPlanExpired(profile)
  const workshopName = profile?.workshopName || 'Mi Taller'

  return (
    <LocaleProvider>
    <PermissionsProvider>
    <PresupuestoProvider>
      <div className="flex min-h-screen bg-[#FAFAF8]">
        <Sidebar workshopName={workshopName} />
        <div className="flex-1 flex flex-col min-w-0" style={{ overflowX: 'clip' }}>
          <main className="flex-1 pt-14 lg:pt-0">
            <TrialBanner />
            <DemoBanner />
            <PlanGate expired={planExpired}>
            <div className="px-3 pt-4 pb-4 lg:px-8 lg:pb-8 lg:pt-8">
              {children}
            </div>
            </PlanGate>
          </main>
        </div>
      </div>
    </PresupuestoProvider>
    </PermissionsProvider>
    </LocaleProvider>
  )
}
