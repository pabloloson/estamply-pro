import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '../DashboardClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: orders }, { data: payments }, { data: presupuestos }, { data: wsData }, { count: materialsCount }, { count: equipmentCount }, { count: productsCount }] = await Promise.all([
    supabase.from('profiles').select('business_name,business_logo_url').eq('id', user.id).single(),
    supabase.from('orders').select('id, status, total_price, total_cost, due_date, created_at, items, notes, clients(name, whatsapp)'),
    supabase.from('payments').select('order_id, monto, fecha'),
    supabase.from('presupuestos').select('id, codigo, total, origen, created_at, client_name').order('created_at', { ascending: false }).limit(10),
    supabase.from('workshop_settings').select('settings').single(),
    supabase.from('insumos').select('*', { count: 'exact', head: true }),
    supabase.from('equipment').select('*', { count: 'exact', head: true }),
    supabase.from('catalog_products').select('*', { count: 'exact', head: true }),
  ])

  const s = (wsData?.settings || {}) as Record<string, unknown>
  const shopName = (s.nombre_tienda as string) || profile?.business_name || 'Mi Taller'
  const tipoCambio = (s.tipo_cambio as number) || 0
  const monedaRef = (s.moneda_referencia as string) || 'USD'

  return (
    <DashboardClient
      shopName={shopName}
      orders={(orders || []) as Record<string, unknown>[]}
      payments={(payments || []) as Record<string, unknown>[]}
      presupuestos={(presupuestos || []) as Record<string, unknown>[]}
      setupCounts={{ materials: materialsCount || 0, equipment: equipmentCount || 0, products: productsCount || 0 }}
      exchangeRate={tipoCambio > 1 ? { value: tipoCambio, currency: monedaRef } : undefined}
    />
  )
}
