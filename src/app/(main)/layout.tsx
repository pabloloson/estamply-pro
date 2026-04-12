import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/shared/components/Sidebar'
import TrialBanner from '@/shared/components/TrialBanner'
import { PresupuestoProvider } from '@/features/presupuesto/context/PresupuestoContext'
import { PermissionsProvider } from '@/shared/context/PermissionsContext'
import { LocaleProvider } from '@/shared/context/LocaleContext'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let workshopName = 'Mi Taller'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('workshop_name, onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_completed) {
      redirect('/onboarding')
    }

    if (profile?.workshop_name) workshopName = profile.workshop_name
  }

  return (
    <LocaleProvider>
    <PermissionsProvider>
    <PresupuestoProvider>
      <div className="flex min-h-screen" style={{ background: '#F4F5F8' }}>
        <Sidebar workshopName={workshopName} />
        <div className="flex-1 flex flex-col min-w-0">
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
