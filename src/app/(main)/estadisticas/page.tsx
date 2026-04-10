'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, ShoppingBag, FileText, DollarSign, BarChart3 } from 'lucide-react'

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default function EstadisticasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Record<string, unknown>[]>([])
  const [payments, setPayments] = useState<Record<string, unknown>[]>([])
  const [presupuestos, setPresupuestos] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: p }, { data: pr }] = await Promise.all([
        supabase.from('orders').select('id,status,total_price,total_cost,created_at,items,clients(name)'),
        supabase.from('payments').select('order_id,monto,fecha'),
        supabase.from('presupuestos').select('id,origen,created_at,total'),
      ])
      setOrders((o || []) as Record<string, unknown>[])
      setPayments((p || []) as Record<string, unknown>[])
      setPresupuestos((pr || []) as Record<string, unknown>[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  const now = new Date()
  const thisMonth = now.getMonth(), thisYear = now.getFullYear()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear

  const inMonth = (d: string, m: number, y: number) => { const dt = new Date(d); return dt.getMonth() === m && dt.getFullYear() === y }
  const thisMonthOrders = orders.filter(o => inMonth(o.created_at as string, thisMonth, thisYear))
  const lastMonthOrders = orders.filter(o => inMonth(o.created_at as string, lastMonth, lastYear))
  const thisMonthPres = presupuestos.filter(p => inMonth(p.created_at as string, thisMonth, thisYear))
  const lastMonthPres = presupuestos.filter(p => inMonth(p.created_at as string, lastMonth, lastYear))

  const facturacion = thisMonthOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const facturacionPrev = lastMonthOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const pedidosCount = thisMonthOrders.length
  const pedidosPrev = lastMonthOrders.length
  const ticket = pedidosCount > 0 ? Math.round(facturacion / pedidosCount) : 0
  const ticketPrev = pedidosPrev > 0 ? Math.round(facturacionPrev / pedidosPrev) : 0
  const presCount = thisMonthPres.length
  const presPrev = lastMonthPres.length

  function pctChange(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const countByStatus: Record<string, number> = {}
  thisMonthOrders.forEach(o => { const s = o.status as string; countByStatus[s] = (countByStatus[s] || 0) + 1 })
  const totalStatusCount = Object.values(countByStatus).reduce((s, v) => s + v, 0)

  const SL: Record<string, string> = { pending: 'Pendiente', production: 'En producción', ready: 'Listo', delivered: 'Entregado' }
  const SC: Record<string, string> = { pending: '#FDCB6E', production: '#6C5CE7', ready: '#00B894', delivered: '#636e72' }

  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{monthName}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Facturación', value: fmt(facturacion), change: pctChange(facturacion, facturacionPrev), icon: DollarSign, color: '#6C5CE7' },
          { label: 'Pedidos', value: String(pedidosCount), change: pctChange(pedidosCount, pedidosPrev), icon: ShoppingBag, color: '#E17055' },
          { label: 'Ticket promedio', value: fmt(ticket), change: pctChange(ticket, ticketPrev), icon: BarChart3, color: '#00B894' },
          { label: 'Presupuestos', value: String(presCount), change: pctChange(presCount, presPrev), icon: FileText, color: '#E84393' },
        ].map(card => (
          <div key={card.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="text-xl font-black text-gray-900">{card.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {card.change >= 0 ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
              <span className={`text-xs font-medium ${card.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{card.change > 0 ? '+' : ''}{card.change}% vs mes anterior</span>
            </div>
          </div>
        ))}
      </div>

      {/* Orders by status */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-3">Pedidos por estado (mes actual)</h2>
        <div className="flex gap-4 mb-3 flex-wrap">
          {Object.entries(SL).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: SC[k] }} />
              <span className="text-sm text-gray-600">{v}: <span className="font-bold">{countByStatus[k] || 0}</span></span>
            </div>
          ))}
        </div>
        {totalStatusCount > 0 && (
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
            {Object.entries(SL).map(([k]) => {
              const pct = totalStatusCount > 0 ? ((countByStatus[k] || 0) / totalStatusCount) * 100 : 0
              return pct > 0 ? <div key={k} style={{ width: `${pct}%`, background: SC[k] }} /> : null
            })}
          </div>
        )}
      </div>

      {/* Upgrade teaser */}
      <div className="card p-6 text-center" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}>
        <p className="text-lg font-bold text-gray-800 mb-2">🔓 Más estadísticas próximamente</p>
        <p className="text-sm text-gray-500 max-w-md mx-auto">Gráficos de facturación, rentabilidad, productos más vendidos, ventas por técnica, y conversión de presupuestos.</p>
      </div>
    </div>
  )
}
