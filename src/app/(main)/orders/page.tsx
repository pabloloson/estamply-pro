'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type OrderStatus = 'pending' | 'production' | 'ready' | 'delivered' | 'cancelled'

interface Order {
  id: string
  status: OrderStatus
  total_price: number
  total_cost: number
  advance_payment: number
  due_date: string | null
  notes: string | null
  created_at: string
  clients: { name: string; phone: string | null } | null
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  production: 'En producción',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_NEXT: Record<OrderStatus, OrderStatus | null> = {
  pending: 'production',
  production: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
}

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, clients(name, phone)')
      .order('created_at', { ascending: false })
    setOrders((data || []) as Order[])
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  async function advanceStatus(order: Order) {
    const next = STATUS_NEXT[order.status]
    if (!next) return
    setUpdatingId(order.id)
    await supabase.from('orders').update({ status: next }).eq('id', order.id)
    await loadOrders()
    setUpdatingId(null)
  }

  async function addAdvance(orderId: string, amount: number) {
    await supabase.from('orders').update({ advance_payment: amount }).eq('id', orderId)
    await loadOrders()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'production')
  const doneOrders = orders.filter(o => o.status === 'ready' || o.status === 'delivered' || o.status === 'cancelled')

  function OrderCard({ order }: { order: Order }) {
    const isExpanded = expanded === order.id
    const profit = order.total_price - order.total_cost
    const remaining = order.total_price - order.advance_payment
    const [advInput, setAdvInput] = useState(String(order.advance_payment))

    return (
      <div className="card overflow-hidden">
        <div
          className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpanded(isExpanded ? null : order.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-gray-900">{order.clients?.name || 'Sin cliente'}</span>
              <span className={`badge-${order.status}`}>{STATUS_LABELS[order.status]}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>${Number(order.total_price).toLocaleString('es-AR')}</span>
              {order.due_date && (
                <span>Entrega: {format(new Date(order.due_date), "dd MMM", { locale: es })}</span>
              )}
              <span className="text-xs">{format(new Date(order.created_at), "dd/MM/yy")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {STATUS_NEXT[order.status] && (
              <button
                onClick={e => { e.stopPropagation(); advanceStatus(order) }}
                disabled={updatingId === order.id}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: 'rgba(108,92,231,0.1)', color: '#6C5CE7' }}
              >
                {updatingId === order.id ? '...' : `→ ${STATUS_LABELS[STATUS_NEXT[order.status]!]}`}
              </button>
            )}
            {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Precio total', value: `$${Number(order.total_price).toLocaleString('es-AR')}` },
                { label: 'Costo real', value: `$${Number(order.total_cost).toLocaleString('es-AR')}` },
                { label: 'Ganancia', value: `$${Math.round(profit).toLocaleString('es-AR')}`, green: profit > 0 },
                { label: 'Saldo restante', value: `$${Math.round(remaining).toLocaleString('es-AR')}`, red: remaining > 0 },
              ].map(({ label, value, green, red }) => (
                <div key={label} className="bg-white rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={`font-bold text-sm ${green ? 'text-green-600' : red ? 'text-orange-500' : 'text-gray-800'}`}>{value}</p>
                </div>
              ))}
            </div>
            
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Seña registrada ($)</label>
                <input
                  type="number"
                  value={advInput}
                  onChange={e => setAdvInput(e.target.value)}
                  className="input-base"
                  placeholder="0"
                />
              </div>
              <button
                onClick={() => addAdvance(order.id, parseFloat(advInput) || 0)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#6C5CE7' }}
              >
                Guardar
              </button>
            </div>

            {order.notes && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">Notas</p>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">{activeOrders.length} activos · {doneOrders.length} finalizados</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">Sin pedidos aún</p>
          <p className="text-gray-300 text-sm">Los pedidos aparecerán aquí una vez que los agregues desde la base de datos</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Activos</h2>
              <div className="space-y-3">
                {activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
              </div>
            </div>
          )}
          {doneOrders.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Finalizados</h2>
              <div className="space-y-3">
                {doneOrders.map(o => <OrderCard key={o.id} order={o} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
