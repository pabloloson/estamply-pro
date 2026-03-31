import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calculator, ShoppingBag, Package, TrendingUp } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  
  const [ordersRes, productsRes, clientsRes] = await Promise.all([
    supabase.from('orders').select('id, status, total_price, total_cost, created_at').eq('user_id', user.id),
    supabase.from('products').select('id').eq('user_id', user.id),
    supabase.from('clients').select('id').eq('user_id', user.id),
  ])

  const orders = ordersRes.data || []
  const products = productsRes.data || []
  const clients = clientsRes.data || []

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total_price), 0)
  const totalCost = orders.reduce((s, o) => s + Number(o.total_cost), 0)
  const totalProfit = totalRevenue - totalCost
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'production').length

  const stats = [
    { label: 'Pedidos activos', value: activeOrders, icon: ShoppingBag, color: '#6C5CE7', bg: 'rgba(108,92,231,0.08)' },
    { label: 'Ingresos totales', value: `$${totalRevenue.toLocaleString('es-AR')}`, icon: TrendingUp, color: '#00B894', bg: 'rgba(0,184,148,0.08)' },
    { label: 'Ganancia neta', value: `$${totalProfit.toLocaleString('es-AR')}`, icon: TrendingUp, color: '#E17055', bg: 'rgba(225,112,85,0.08)' },
    { label: 'Productos', value: products.length, icon: Package, color: '#E84393', bg: 'rgba(232,67,147,0.08)' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {profile?.full_name?.split(' ')[0] || 'Taller'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Resumen de {profile?.workshop_name || 'tu taller'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/calculator" className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(108,92,231,0.1)' }}>
            <Calculator size={22} style={{ color: '#6C5CE7' }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-purple-700">Nueva cotización</h3>
            <p className="text-sm text-gray-500">Calculá precios de Subli, DTF o Vinilo</p>
          </div>
        </Link>
        <Link href="/orders" className="card p-6 flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(225,112,85,0.1)' }}>
            <ShoppingBag size={22} style={{ color: '#E17055' }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-orange-600">Ver pedidos</h3>
            <p className="text-sm text-gray-500">{activeOrders} pedidos activos de {clients.length} clientes</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
