import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import AdminSidebar from '@/features/admin/components/AdminSidebar'

function isAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes(email.toLowerCase())
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>
      <AdminSidebar email={session.user.email} />
      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8 min-w-0 overflow-x-hidden" style={{ background: '#F4F5F8' }}>
        {children}
      </main>
    </div>
  )
}
