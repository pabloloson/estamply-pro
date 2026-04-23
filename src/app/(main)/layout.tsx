import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTeamOwnerId } from '@/lib/db/tenant'
import { Sidebar } from '@/shared/components/Sidebar'
import TrialBanner from '@/shared/components/TrialBanner'
import DemoBanner from '@/shared/components/DemoBanner'
import { PresupuestoProvider } from '@/features/presupuesto/context/PresupuestoContext'
import { PermissionsProvider } from '@/shared/context/PermissionsContext'
import { LocaleProvider } from '@/shared/context/LocaleContext'

export const dynamic = 'force-dynamic'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ownerId = await getTeamOwnerId(session.user.id)
  const profile = await prisma.profile.findUnique({
    where: { userId: ownerId },
    select: { workshopName: true, onboardingCompleted: true },
  })

  if (profile && !profile.onboardingCompleted) {
    redirect('/onboarding')
  }

  const workshopName = profile?.workshopName || 'Mi Taller'

  return (
    <LocaleProvider>
    <PermissionsProvider>
    <PresupuestoProvider>
      <div className="flex min-h-screen bg-[#FAFAF8]">
        <Sidebar workshopName={workshopName} />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <main className="flex-1 pt-14 lg:pt-0">
            <TrialBanner />
            <DemoBanner />
            <div className="px-3 pt-4 pb-4 lg:px-8 lg:pb-8 lg:pt-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </PresupuestoProvider>
    </PermissionsProvider>
    </LocaleProvider>
  )
}
