import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/shared/components/Sidebar'
import TrialBanner from '@/shared/components/TrialBanner'
import { PresupuestoProvider } from '@/features/presupuesto/context/PresupuestoContext'
import { PermissionsProvider } from '@/shared/context/PermissionsContext'
import { LocaleProvider } from '@/shared/context/LocaleContext'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Still using Supabase for DB queries (will migrate in FASE 4B)
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('workshop_name, onboarding_completed')
    .eq('id', session.user.id)
    .single()

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const workshopName = profile?.workshop_name || 'Mi Taller'

  return (
    <LocaleProvider>
    <PermissionsProvider>
    <PresupuestoProvider>
      <div className="flex min-h-screen" style={{ background: '#F4F5F8' }}>
        <Sidebar workshopName={workshopName} />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <TrialBanner />
          <main className="flex-1 p-4 pt-20 lg:px-8 lg:pb-8 lg:pt-10">
            {children}
          </main>
        </div>
      </div>
    </PresupuestoProvider>
    </PermissionsProvider>
    </LocaleProvider>
  )
}
