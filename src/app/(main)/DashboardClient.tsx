'use client'

import Link from 'next/link'
import { ShoppingBag, TrendingUp, AlertTriangle, Calculator, Users, Calendar, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, CheckCircle } from 'lucide-react'

interface Order {
  id: string; status: string; total_price: number; total_cost: number; due_date: string | null
  created_at: string; items: Array<{ tecnica: string; nombre: string; cantidad: number; subtotal: number }>
  client_id: string | null; clients?: { name: string } | null
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

const SL: Record<string, string> = { pending: 'Pendiente', production: 'En producción', ready: 'Listo', delivered: 'Entregado' }
const SC: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FAEEDA', text: '#854F0B' }, production: { bg: '#E6F1FB', text: '#0C447C' },
  ready: { bg: '#EAF3DE', text: '#27500A' }, delivered: { bg: '#F1EFE8', text: '#444441' },
}
const TL: Record<string, string> = { subli: 'Sublimación', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía' }
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function daysAgo(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000) }
function isOverdue(d: string | null) { return d ? new Date(d) < new Date(new Date().toDateString()) : false }
function daysUntil(d: string | null) { return d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : Infinity }

export default function DashboardClient({ userName, tallerName, orders, payments, clientCount }: {
  userName: string; tallerName: string; orders: Order[]; payments: Array<{ order_id: string; monto: number }>; clientCount: number
}) {
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  // Payment lookup
  const paidByOrder: Record<string, number> = {}
  payments.forEach(p => { paidByOrder[p.order_id] = (paidByOrder[p.order_id] || 0) + Number(p.monto) })

  // Active orders
  const active = orders.filter(o => o.status !== 'delivered')
  const pending = active.filter(o => o.status === 'pending').length
  const inProd = active.filter(o => o.status === 'production').length
  const ready = active.filter(o => o.status === 'ready').length

  // Monthly revenue
  const monthOrders = (m: number, y: number) => orders.filter(o => { const d = new Date(o.created_at); return d.getMonth() === m && d.getFullYear() === y })
  const thisMonthOrders = monthOrders(thisMonth, thisYear)
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
  const lastMonthOrders = monthOrders(lastMonth, lastMonthYear)

  const thisMonthRev = thisMonthOrders.reduce((s, o) => s + Number(o.total_price), 0)
  const thisMonthCost = thisMonthOrders.reduce((s, o) => s + Number(o.total_cost), 0)
  const lastMonthRev = lastMonthOrders.reduce((s, o) => s + Number(o.total_price), 0)
  const monthProfit = thisMonthRev - thisMonthCost
  const monthMargin = thisMonthRev > 0 ? Math.round((monthProfit / thisMonthRev) * 100) : 0
  const revChange = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : null

  // Por cobrar
  const porCobrar = active.reduce((s, o) => s + Math.max(Number(o.total_price) - (paidByOrder[o.id] || 0), 0), 0)
  const conSaldo = active.filter(o => Number(o.total_price) - (paidByOrder[o.id] || 0) > 0).length

  // Attention required
  const urgent = active.filter(o => {
    if (isOverdue(o.due_date)) return true
    if (o.due_date && daysUntil(o.due_date) <= 1) return true
    if (o.status === 'ready' && daysAgo(o.created_at) > 2) return true
    return false
  }).sort((a, b) => {
    const oa = isOverdue(a.due_date) ? 0 : daysUntil(a.due_date) <= 1 ? 1 : 2
    const ob = isOverdue(b.due_date) ? 0 : daysUntil(b.due_date) <= 1 ? 1 : 2
    return oa - ob
  }).slice(0, 5)

  // 6 month chart data
  const chartData: { label: string; value: number; current: boolean }[] = []
  for (let i = 5; i >= 0; i--) {
    const m = (thisMonth - i + 12) % 12
    const y = thisMonth - i < 0 ? thisYear - 1 : thisYear
    const rev = monthOrders(m, y).reduce((s, o) => s + Number(o.total_price), 0)
    chartData.push({ label: MONTHS[m], value: rev, current: i === 0 })
  }
  const maxChart = Math.max(...chartData.map(d => d.value), 1)

  // Rankings (this month)
  const productRank: Record<string, number> = {}
  const tecnicaRank: Record<string, number> = {}
  const clientRank: Record<string, number> = {}
  thisMonthOrders.forEach(o => {
    const cn = o.clients?.name || 'Sin cliente'
    clientRank[cn] = (clientRank[cn] || 0) + Number(o.total_price)
    ;(o.items || []).forEach((item: { tecnica: string; nombre: string; cantidad: number; subtotal: number }) => {
      productRank[item.nombre] = (productRank[item.nombre] || 0) + item.cantidad
      tecnicaRank[item.tecnica] = (tecnicaRank[item.tecnica] || 0) + item.subtotal
    })
  })
  const topProducts = Object.entries(productRank).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const topTecnicas = Object.entries(tecnicaRank).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const topClients = Object.entries(clientRank).sort((a, b) => b[1] - a[1]).slice(0, 3)

  const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hola, {userName} 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">{tallerName ? `${tallerName} · ` : ''}{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>
      </div>

      {/* BLOCK 1: Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos activos</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(108,92,231,0.08)' }}><ShoppingBag size={16} style={{ color: '#6C5CE7' }} /></div>
          </div>
          <p className="text-3xl font-black text-gray-900">{active.length}</p>
          <p className="text-[11px] text-gray-400 mt-1">{pending} pendientes · {inProd} en prod. · {ready} listos</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingresos del mes</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,184,148,0.08)' }}><TrendingUp size={16} style={{ color: '#00B894' }} /></div>
          </div>
          <p className="text-3xl font-black text-gray-900">{fmt(thisMonthRev)}</p>
          {revChange !== null && (
            <p className={`text-[11px] mt-1 flex items-center gap-0.5 ${revChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {revChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {revChange >= 0 ? '+' : ''}{revChange}% vs mes anterior
            </p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ganancia del mes</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(225,112,85,0.08)' }}><DollarSign size={16} style={{ color: '#E17055' }} /></div>
          </div>
          <p className="text-3xl font-black text-gray-900">{fmt(monthProfit)}</p>
          <p className="text-[11px] text-gray-400 mt-1">Margen: {monthMargin}%</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Por cobrar</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232,67,147,0.08)' }}><CreditCard size={16} style={{ color: '#E84393' }} /></div>
          </div>
          <p className="text-3xl font-black text-gray-900">{fmt(porCobrar)}</p>
          <p className="text-[11px] text-gray-400 mt-1">{conSaldo} pedidos con saldo</p>
        </div>
      </div>

      {/* BLOCK 2: Attention + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Attention required (~60%) */}
        <div className="lg:col-span-3 card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Atención requerida</p>
          {urgent.length > 0 ? (
            <div className="space-y-2">
              {urgent.map(o => {
                const cn = o.clients?.name || 'Sin cliente'
                const od = isOverdue(o.due_date)
                const du = daysUntil(o.due_date)
                const sc = SC[o.status]
                let urgText = ''
                if (od) urgText = `vencido hace ${daysAgo(o.due_date!)} días`
                else if (du === 0) urgText = 'entrega hoy'
                else if (du === 1) urgText = 'entrega mañana'
                else if (o.status === 'ready') urgText = `listo hace ${daysAgo(o.created_at)} días`
                return (
                  <Link key={o.id} href="/orders" className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${od ? 'text-red-500' : 'text-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-800 text-sm truncate">{cn}</span>
                        <span className="text-sm font-bold text-gray-700 flex-shrink-0">{fmt(o.total_price)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: sc?.bg, color: sc?.text }}>{SL[o.status]}</span>
                        {o.due_date && <span className={`text-xs ${od ? 'text-red-500 font-bold' : 'text-amber-600'}`}><Calendar size={10} className="inline mr-0.5" />{urgText}</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4 justify-center">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-sm text-green-600 font-medium">Todo al día — no hay pedidos urgentes</span>
            </div>
          )}
        </div>

        {/* Quick actions (~40%) */}
        <div className="lg:col-span-2 space-y-3">
          <Link href="/calculator" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(108,92,231,0.1)' }}><Calculator size={18} style={{ color: '#6C5CE7' }} /></div>
            <span className="font-semibold text-gray-800 group-hover:text-purple-700">Nueva cotización</span>
          </Link>
          <Link href="/orders" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(225,112,85,0.1)' }}><ShoppingBag size={18} style={{ color: '#E17055' }} /></div>
            <span className="font-semibold text-gray-800 group-hover:text-orange-600">Ver pedidos</span>
          </Link>
          <Link href="/clients" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,184,148,0.1)' }}><Users size={18} style={{ color: '#00B894' }} /></div>
            <span className="font-semibold text-gray-800 group-hover:text-green-700">Ver clientes</span>
          </Link>
        </div>
      </div>

      {/* BLOCK 3: Monthly summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart */}
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Ingresos mensuales</p>
          {chartData.some(d => d.value > 0) ? (
            <div className="flex items-end gap-2 h-40">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative group">
                    <div className="w-full rounded-t-md transition-all" style={{
                      height: `${Math.max((d.value / maxChart) * 130, 4)}px`,
                      background: d.current ? 'linear-gradient(180deg, #6C5CE7, #a29bfe)' : '#E0DCF8',
                      opacity: d.current ? 1 : 0.7,
                    }} />
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">{fmt(d.value)}</div>
                  </div>
                  <span className={`text-[10px] ${d.current ? 'font-bold text-purple-600' : 'text-gray-400'}`}>{d.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Sin datos suficientes</div>
          )}
        </div>

        {/* Rankings */}
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Más vendidos del mes</p>
          <div className="space-y-4">
            {/* By product */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Por producto</p>
              {topProducts.length > 0 ? topProducts.map(([name, qty], i) => (
                <div key={name} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-600"><span className="text-gray-400 mr-1.5">{i + 1}.</span>{name}</span>
                  <span className="text-xs font-semibold text-gray-700">{qty} u.</span>
                </div>
              )) : <p className="text-xs text-gray-400">Sin datos</p>}
            </div>

            {/* By technique */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Por técnica</p>
              {topTecnicas.length > 0 ? topTecnicas.map(([tec, amount], i) => (
                <div key={tec} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-600"><span className="text-gray-400 mr-1.5">{i + 1}.</span>{TL[tec] || tec}</span>
                  <span className="text-xs font-semibold text-gray-700">{fmt(amount)}</span>
                </div>
              )) : <p className="text-xs text-gray-400">Sin datos</p>}
            </div>

            {/* Top clients */}
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Top clientes</p>
              {topClients.length > 0 ? topClients.map(([name, amount], i) => (
                <div key={name} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-600"><span className="text-gray-400 mr-1.5">{i + 1}.</span>{name}</span>
                  <span className="text-xs font-semibold text-gray-700">{fmt(amount)}</span>
                </div>
              )) : <p className="text-xs text-gray-400">Sin datos</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
