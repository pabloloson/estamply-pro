import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/shared/components/Sidebar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let workshopName = 'Mi Taller'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('workshop_name')
      .eq('id', user.id)
      .single()
    if (profile?.workshop_name) workshopName = profile.workshop_name
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F4F5F8' }}>
      <Sidebar workshopName={workshopName} />
      <main className="flex-1 lg:p-8 pt-16 lg:pt-0 p-4 min-w-0">
        {children}
      </main>
    </div>
  )
}
