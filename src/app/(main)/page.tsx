import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [ordersRes, paymentsRes, clientsRes] = await Promise.all([
    supabase.from('orders').select('id, status, total_price, total_cost, due_date, created_at, items, client_id, clients(name)').eq('user_id', user.id),
    supabase.from('payments').select('order_id, monto'),
    supabase.from('clients').select('id'),
  ])

  return (
    <DashboardClient
      userName={profile?.full_name?.split(' ')[0] || 'Taller'}
      tallerName={profile?.business_name || profile?.workshop_name || ''}
      orders={(ordersRes.data || []) as any[]}
      payments={(paymentsRes.data || []) as any[]}
      clientCount={(clientsRes.data || []).length}
    />
  )
}
