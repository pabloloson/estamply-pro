import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/features/admin/components/AdminSidebar'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes(email.toLowerCase())
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email || '')) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>
      <AdminSidebar email={user.email || ''} />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 min-w-0 overflow-x-hidden" style={{ background: '#F4F5F8' }}>
        {children}
      </main>
    </div>
  )
}
