'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, ShoppingBag, FileText, DollarSign, BarChart3, Download, FileDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }
function fmtK(n: number) { return n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}` }
function pct(cur: number, prev: number) { return prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100) }

const TL: Record<string, string> = { subli: 'Sublimación', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía' }
const TC: Record<string, string> = { subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E' }
const SL: Record<string, string> = { pending: 'Pendiente', production: 'En producción', ready: 'Listo', delivered: 'Entregado' }
const SC: Record<string, string> = { pending: '#FDCB6E', production: '#6C5CE7', ready: '#00B894', delivered: '#636e72' }
const DONUT_COLORS = ['#6C5CE7', '#E17055', '#00B894', '#E84393', '#FDCB6E', '#636e72']

type Order = Record<string, unknown>
type Pres = Record<string, unknown>

export default function EstadisticasPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Record<string, unknown>[]>([])
  const [presupuestos, setPresupuestos] = useState<Pres[]>([])
  const now = new Date()
  const [period, setPeriod] = useState('30d')
  const [cmpA, setCmpA] = useState('')
  const [cmpB, setCmpB] = useState('')
  const [showCmp, setShowCmp] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: p }, { data: pr }] = await Promise.all([
        supabase.from('orders').select('id,status,total_price,total_cost,created_at,items,clients(name)'),
        supabase.from('payments').select('order_id,monto,fecha'),
        supabase.from('presupuestos').select('id,codigo,origen,created_at,total,estado'),
      ])
      setOrders((o || []) as Order[]); setPayments((p || []) as Record<string, unknown>[]); setPresupuestos((pr || []) as Pres[]); setLoading(false)
    }
    load()
  }, [])

  // Period calculation
  const { start, end, prevStart, prevEnd, label } = useMemo(() => {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    let days = 30
    if (period === '7d') days = 7
    else if (period === '3m') days = 90
    else if (period === '12m') days = 365
    const start = new Date(end.getTime() - days * 86400000)
    const prevEnd = new Date(start)
    const prevStart = new Date(prevEnd.getTime() - days * 86400000)
    return { start, end, prevStart, prevEnd, label: period === '7d' ? '7 días' : period === '30d' ? '30 días' : period === '3m' ? '3 meses' : '12 meses' }
  }, [period])

  const inRange = (d: string, s: Date, e: Date) => { const dt = new Date(d); return dt >= s && dt < e }
  const curOrders = orders.filter(o => inRange(o.created_at as string, start, end))
  const prevOrders = orders.filter(o => inRange(o.created_at as string, prevStart, prevEnd))
  const curPres = presupuestos.filter(p => inRange(p.created_at as string, start, end))
  const prevPres = presupuestos.filter(p => inRange(p.created_at as string, prevStart, prevEnd))

  // Summary
  const facturacion = curOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const facPrev = prevOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const pedidos = curOrders.length, pedPrev = prevOrders.length
  const ticket = pedidos > 0 ? Math.round(facturacion / pedidos) : 0
  const ticketPrev = pedPrev > 0 ? Math.round(facPrev / pedPrev) : 0
  const presCount = curPres.length, presPrev = prevPres.length

  // Status counts
  const statusCounts: Record<string, number> = {}
  curOrders.forEach(o => { const s = o.status as string; statusCounts[s] = (statusCounts[s] || 0) + 1 })
  const totalStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  // Chart data
  const chartData = useMemo(() => {
    const days = Math.round((end.getTime() - start.getTime()) / 86400000)
    const buckets: Record<string, number> = {}
    const fmt2 = (d: Date) => {
      if (days <= 31) return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
      if (days <= 100) return `Sem ${Math.ceil(((d.getTime() - start.getTime()) / 86400000 + 1) / 7)}`
      return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    }
    curOrders.forEach(o => {
      const d = new Date(o.created_at as string)
      const key = fmt2(d)
      buckets[key] = (buckets[key] || 0) + (o.total_price as number || 0)
    })
    return Object.entries(buckets).map(([name, value]) => ({ name, value }))
  }, [curOrders, start, end])

  // Rentabilidad
  const ordersWithCost = curOrders.filter(o => (o.total_cost as number) > 0)
  const facConCosto = ordersWithCost.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const costos = ordersWithCost.reduce((s, o) => s + (o.total_cost as number || 0), 0)
  const margen = facConCosto > 0 ? Math.round(((facConCosto - costos) / facConCosto) * 100) : 0
  const sinCosto = curOrders.length - ordersWithCost.length

  // Products
  const productMap = new Map<string, { units: number; revenue: number; cost: number }>()
  curOrders.forEach(o => {
    const items = (o.items || []) as Array<Record<string, unknown>>
    items.forEach(i => {
      const name = (i.nombre as string) || 'Sin nombre'
      const entry = productMap.get(name) || { units: 0, revenue: 0, cost: 0 }
      entry.units += (i.cantidad as number) || 1
      entry.revenue += (i.subtotal as number) || 0
      entry.cost += ((i.costoUnit as number) || 0) * ((i.cantidad as number) || 1)
      productMap.set(name, entry)
    })
  })
  const topSold = [...productMap.entries()].sort((a, b) => b[1].units - a[1].units).slice(0, 5)
  const topMargin = [...productMap.entries()].filter(([, v]) => v.cost > 0).map(([k, v]) => ({ name: k, margin: Math.round(((v.revenue - v.cost) / v.revenue) * 100), profit: v.revenue - v.cost })).sort((a, b) => b.margin - a.margin).slice(0, 5)

  // By technique
  const techMap = new Map<string, number>()
  curOrders.forEach(o => { const items = (o.items || []) as Array<Record<string, unknown>>; items.forEach(i => { const t = (i.tecnica as string) || 'other'; techMap.set(t, (techMap.get(t) || 0) + ((i.subtotal as number) || 0)) }) })
  const techData = [...techMap.entries()].map(([k, v]) => ({ name: TL[k] || 'Sin técnica', value: v })).sort((a, b) => b.value - a.value)
  const techTotal = techData.reduce((s, d) => s + d.value, 0)

  // By origin
  const manualRev = curOrders.filter(o => !o.origen || o.origen === 'manual').reduce((s, o) => s + (o.total_price as number || 0), 0)
  const webRev = curOrders.filter(o => o.origen === 'catalogo_web').reduce((s, o) => s + (o.total_price as number || 0), 0)
  const originData = [{ name: 'Manual', value: manualRev || facturacion }, ...(webRev > 0 ? [{ name: 'Catálogo Web', value: webRev }] : [])]

  // Conversion
  // Simplified: count presupuestos that have a matching order (by client or by code)
  const convertedPres = 0 // placeholder — proper tracking needs a field on presupuestos
  const conversionRate = curPres.length > 0 ? Math.round((convertedPres / curPres.length) * 100) : 0

  // Client ranking
  const clientMap = new Map<string, { pedidos: number; revenue: number; cost: number }>()
  curOrders.forEach(o => {
    const cl = (o.clients as Record<string, string>)?.name || 'Sin cliente'
    const entry = clientMap.get(cl) || { pedidos: 0, revenue: 0, cost: 0 }
    entry.pedidos++
    entry.revenue += (o.total_price as number) || 0
    entry.cost += (o.total_cost as number) || 0
    clientMap.set(cl, entry)
  })
  const clientRanking = [...clientMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 10)

  // Conversion — count presupuestos that progressed beyond 'borrador'
  const convertedCount = curPres.filter(p => p.estado && p.estado !== 'borrador').length
  const convRate = curPres.length > 0 ? Math.min(Math.round((convertedCount / curPres.length) * 100), 100) : 0
  const prevConverted = prevPres.filter(p => p.estado && p.estado !== 'borrador').length
  const prevConvRate = prevPres.length > 0 ? Math.min(Math.round((prevConverted / prevPres.length) * 100), 100) : 0

  // Evolution — last 6 months margin
  const evolutionData = useMemo(() => {
    const data: Array<{ name: string; margin: number; revenue: number; cost: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const mo = orders.filter(o => { const dt = new Date(o.created_at as string); return dt >= d && dt < monthEnd && (o.total_cost as number) > 0 })
      const rev = mo.reduce((s, o) => s + (o.total_price as number || 0), 0)
      const cost = mo.reduce((s, o) => s + (o.total_cost as number || 0), 0)
      const mg = rev > 0 ? Math.round(((rev - cost) / rev) * 100) : 0
      data.push({ name: d.toLocaleDateString('es-AR', { month: 'short' }), margin: mg, revenue: rev, cost })
    }
    return data
  }, [orders])
  const evoAvg = evolutionData.length > 0 ? Math.round(evolutionData.reduce((s, d) => s + d.margin, 0) / evolutionData.length) : 0
  const evoBest = evolutionData.length > 0 ? evolutionData.reduce((best, d) => d.margin > best.margin ? d : best) : null
  const evoWorst = evolutionData.length > 0 ? evolutionData.reduce((worst, d) => d.margin < worst.margin && d.revenue > 0 ? d : worst) : null

  // Comparison helper
  function calcPeriodMetrics(s: Date, e: Date) {
    const po = orders.filter(o => inRange(o.created_at as string, s, e))
    const pp = presupuestos.filter(p => inRange(p.created_at as string, s, e))
    const fac = po.reduce((sum, o) => sum + (o.total_price as number || 0), 0)
    const withCost = po.filter(o => (o.total_cost as number) > 0)
    const costsT = withCost.reduce((sum, o) => sum + (o.total_cost as number || 0), 0)
    const facC = withCost.reduce((sum, o) => sum + (o.total_price as number || 0), 0)
    return {
      facturacion: fac, pedidos: po.length,
      ticket: po.length > 0 ? Math.round(fac / po.length) : 0,
      margen: facC > 0 ? Math.round(((facC - costsT) / facC) * 100) : 0,
      conversion: pp.length > 0 ? Math.min(Math.round((pp.filter(p => p.estado && p.estado !== 'borrador').length / pp.length) * 100), 100) : 0,
      presupuestos: pp.length,
    }
  }

  // PDF export
  async function exportPDF() {
    const el = document.getElementById('stats-content')
    if (!el) return
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgW = 190, imgH = (canvas.height * imgW) / canvas.width
    let y = 10
    const pageH = 277
    // Split into pages if needed
    if (imgH <= pageH) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, y, imgW, imgH)
    } else {
      let srcY = 0
      while (srcY < canvas.height) {
        const sliceH = Math.min(canvas.height - srcY, (pageH / imgH) * canvas.height)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width; sliceCanvas.height = sliceH
        sliceCanvas.getContext('2d')?.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const h = (sliceH * imgW) / canvas.width
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 10, 10, imgW, h)
        srcY += sliceH
        if (srcY < canvas.height) pdf.addPage()
      }
    }
    pdf.save(`Estamply_Reporte_${label.replace(/\s/g, '')}.pdf`)
  }

  // Export
  function exportExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metrica: 'Facturación', Valor: facturacion }, { Metrica: 'Pedidos', Valor: pedidos },
      { Metrica: 'Ticket promedio', Valor: ticket }, { Metrica: 'Presupuestos', Valor: presCount },
      { Metrica: 'Margen bruto', Valor: `${margen}%` },
    ]), 'Resumen')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topSold.map(([n, v]) => ({ Producto: n, Unidades: v.units, Facturación: v.revenue }))), 'Productos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientRanking.map(([n, v]) => ({ Cliente: n, Pedidos: v.pedidos, Facturación: v.revenue }))), 'Clientes')
    XLSX.writeFile(wb, `Estamply_Estadisticas_${label.replace(/\s/g, '')}.xlsx`)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div className="max-w-5xl mx-auto" id="stats-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {[['7d', '7d'], ['30d', '30d'], ['3m', '3m'], ['12m', '12m']].map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${period === k ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
            ))}
          </div>
          <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <Download size={12} /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <FileDown size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Facturación', value: fmt(facturacion), change: pct(facturacion, facPrev), icon: DollarSign, color: '#6C5CE7' },
          { label: 'Pedidos', value: String(pedidos), change: pct(pedidos, pedPrev), icon: ShoppingBag, color: '#E17055' },
          { label: 'Ticket promedio', value: fmt(ticket), change: pct(ticket, ticketPrev), icon: BarChart3, color: '#00B894' },
          { label: 'Presupuestos', value: String(presCount), change: pct(presCount, presPrev), icon: FileText, color: '#E84393' },
        ].map(c => (
          <div key={c.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15` }}><c.icon size={16} style={{ color: c.color }} /></div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="text-xl font-black text-gray-900">{c.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {c.change >= 0 ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
              <span className={`text-xs font-medium ${c.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{c.change > 0 ? '+' : ''}{c.change}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-3">Pedidos por estado</h2>
        <div className="flex gap-4 mb-3 flex-wrap">
          {Object.entries(SL).map(([k, v]) => <div key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: SC[k] }} /><span className="text-sm text-gray-600">{v}: <span className="font-bold">{statusCounts[k] || 0}</span></span></div>)}
        </div>
        {totalStatus > 0 && <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">{Object.keys(SL).map(k => { const p = ((statusCounts[k] || 0) / totalStatus) * 100; return p > 0 ? <div key={k} style={{ width: `${p}%`, background: SC[k] }} /> : null })}</div>}
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">Facturación</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={60} /><Tooltip formatter={(v) => fmt(Number(v))} /><Bar dataKey="value" fill="#6C5CE7" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3 text-sm text-gray-500">
            <span>Total: <span className="font-bold text-gray-800">{fmt(facturacion)}</span></span>
            <span>Promedio: <span className="font-bold text-gray-800">{fmt(Math.round(facturacion / Math.max(chartData.length, 1)))}</span>/día</span>
          </div>
        </div>
      )}

      {/* Rentabilidad */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Rentabilidad</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Facturación</p><p className="text-lg font-black text-gray-900">{fmt(facConCosto)}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Costos</p><p className="text-lg font-black text-gray-900">{fmt(costos)}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Margen bruto</p><p className="text-lg font-black" style={{ color: '#6C5CE7' }}>{fmt(facConCosto - costos)}</p><p className="text-xs font-semibold" style={{ color: '#6C5CE7' }}>{margen}%</p></div>
        </div>
        {facConCosto > 0 && <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 mb-2"><div style={{ width: `${margen}%`, background: '#6C5CE7' }} /><div style={{ width: `${100 - margen}%`, background: '#E0DCF8' }} /></div>}
        <div className="flex gap-4 text-xs text-gray-500"><span>■ Ganancia {margen}%</span><span className="text-gray-300">□ Costos {100 - margen}%</span></div>
        {sinCosto > 0 && <p className="text-xs text-amber-600 mt-2">⚠️ {sinCosto} pedidos sin datos de costo</p>}
      </div>

      {/* Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">Más vendidos</h2>
          {topSold.length > 0 ? <div className="space-y-2">{topSold.map(([n, v], i) => <div key={n} className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{n}</p><p className="text-xs text-gray-400">{v.units} u. — {fmt(v.revenue)}</p></div></div>)}</div> : <p className="text-sm text-gray-400">Sin datos</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">Más rentables</h2>
          {topMargin.length > 0 ? <div className="space-y-2">{topMargin.map((p, i) => <div key={p.name} className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{p.name}</p><p className="text-xs text-gray-400">margen {p.margin}% — {fmt(p.profit)}</p></div></div>)}</div> : <p className="text-sm text-gray-400">Sin datos de costos</p>}
        </div>
      </div>

      {/* By technique + origin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">Ventas por técnica</h2>
          {techData.length > 0 && techTotal > 0 ? (<>
            <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={techData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>{techData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
            <div className="space-y-1 mt-2">{techData.map((d, i) => <div key={d.name} className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} /><span className="flex-1 text-gray-600">{d.name}</span><span className="font-semibold text-gray-800">{Math.round(d.value / techTotal * 100)}%</span><span className="text-gray-400">{fmt(d.value)}</span></div>)}</div>
          </>) : <p className="text-sm text-gray-400">Sin datos</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">Ventas por origen</h2>
          {facturacion > 0 ? (<>
            <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={originData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>{originData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
            <div className="space-y-1 mt-2">{originData.map((d, i) => <div key={d.name} className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} /><span className="flex-1 text-gray-600">{d.name}</span><span className="font-semibold text-gray-800">{Math.round(d.value / facturacion * 100)}%</span><span className="text-gray-400">{fmt(d.value)}</span></div>)}</div>
          </>) : <p className="text-sm text-gray-400">Sin datos</p>}
        </div>
      </div>

      {/* Client ranking */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-3">Ranking de clientes</h2>
        {clientRanking.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-100">
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">#</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Cliente</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Pedidos</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Facturación</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Margen</th>
            </tr></thead><tbody>
              {clientRanking.map(([n, v], i) => {
                const m = v.cost > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : null
                return (
                  <tr key={n} className="border-b border-gray-50">
                    <td className="px-2 py-2 text-gray-400 font-bold">{i + 1}</td>
                    <td className="px-2 py-2 font-medium text-gray-800">{n}</td>
                    <td className="px-2 py-2 text-gray-600">{v.pedidos}</td>
                    <td className="px-2 py-2 font-semibold text-gray-800">{fmt(v.revenue)}</td>
                    <td className="px-2 py-2">{m !== null ? <span className={m >= 40 ? 'text-green-600' : m >= 20 ? 'text-amber-600' : 'text-red-500'}>{m}%</span> : <span className="text-gray-300">—</span>}</td>
                  </tr>
                )
              })}
            </tbody></table>
          </div>
        ) : <p className="text-sm text-gray-400">Sin datos</p>}
      </div>

      {/* Conversion */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Conversión de presupuestos</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Creados</p><p className="text-lg font-black text-gray-900">{curPres.length}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Convertidos</p><p className="text-lg font-black text-gray-900">{convertedCount}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">Tasa</p><p className="text-lg font-black" style={{ color: '#6C5CE7' }}>{convRate}%</p>
            {prevConvRate > 0 && <p className={`text-xs ${convRate >= prevConvRate ? 'text-green-600' : 'text-red-500'}`}>{convRate >= prevConvRate ? '↑' : '↓'} {Math.abs(convRate - prevConvRate)}pp</p>}
          </div>
        </div>
        {curPres.length > 0 && (
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
            <div style={{ width: `${Math.min(convRate, 100)}%`, background: '#6C5CE7' }} />
            <div style={{ width: `${100 - Math.min(convRate, 100)}%`, background: '#E0DCF8' }} />
          </div>
        )}
        <div className="flex gap-4 text-xs text-gray-500 mt-2"><span>■ Convertidos {convRate}%</span><span className="text-gray-300">□ No convertidos {100 - Math.min(convRate, 100)}%</span></div>
      </div>

      {/* Evolution */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Evolución de rentabilidad (últimos 6 meses)</h2>
        {evolutionData.some(d => d.revenue > 0) ? (<>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evolutionData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} width={40} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="margin" stroke="#6C5CE7" strokeWidth={2.5} dot={{ fill: '#6C5CE7', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3 text-sm text-gray-500 flex-wrap">
            <span>Promedio: <span className="font-bold text-gray-800">{evoAvg}%</span></span>
            {evoBest && <span>Mejor: <span className="font-bold text-green-600">{evoBest.name} ({evoBest.margin}%)</span></span>}
            {evoWorst && evoWorst.revenue > 0 && <span>Peor: <span className="font-bold text-red-500">{evoWorst.name} ({evoWorst.margin}%)</span></span>}
          </div>
        </>) : <p className="text-sm text-gray-400">Sin datos suficientes</p>}
      </div>

      {/* Compare periods */}
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Comparar períodos</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
          <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">Período A</label><input type="date" className="input-base text-sm" value={cmpA} onChange={e => setCmpA(e.target.value)} /></div>
          <span className="text-gray-400 text-sm hidden sm:block pb-2">vs</span>
          <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">Período B</label><input type="date" className="input-base text-sm" value={cmpB} onChange={e => setCmpB(e.target.value)} /></div>
          <button onClick={() => setShowCmp(true)} disabled={!cmpA || !cmpB} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>Comparar</button>
        </div>
        {showCmp && cmpA && cmpB && (() => {
          const a = calcPeriodMetrics(new Date(cmpA), new Date(new Date(cmpA).getTime() + 30 * 86400000))
          const b = calcPeriodMetrics(new Date(cmpB), new Date(new Date(cmpB).getTime() + 30 * 86400000))
          const rows = [
            { label: 'Facturación', va: fmt(a.facturacion), vb: fmt(b.facturacion), change: pct(b.facturacion, a.facturacion), unit: '%' },
            { label: 'Pedidos', va: String(a.pedidos), vb: String(b.pedidos), change: pct(b.pedidos, a.pedidos), unit: '%' },
            { label: 'Ticket promedio', va: fmt(a.ticket), vb: fmt(b.ticket), change: pct(b.ticket, a.ticket), unit: '%' },
            { label: 'Margen bruto', va: `${a.margen}%`, vb: `${b.margen}%`, change: b.margen - a.margen, unit: 'pp' },
            { label: 'Conversión', va: `${a.conversion}%`, vb: `${b.conversion}%`, change: b.conversion - a.conversion, unit: 'pp' },
          ]
          return (
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-100">
              <th className="text-left px-2 py-2 text-xs text-gray-400">Métrica</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400">Período A</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400">Período B</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400">Cambio</th>
            </tr></thead><tbody>
              {rows.map(r => (
                <tr key={r.label} className="border-b border-gray-50">
                  <td className="px-2 py-2 font-medium text-gray-800">{r.label}</td>
                  <td className="px-2 py-2 text-gray-600">{r.va}</td>
                  <td className="px-2 py-2 text-gray-600">{r.vb}</td>
                  <td className="px-2 py-2"><span className={r.change >= 0 ? 'text-green-600' : 'text-red-500'}>{r.change >= 0 ? '↑' : '↓'} {Math.abs(r.change)}{r.unit}</span></td>
                </tr>
              ))}
            </tbody></table>
          )
        })()}
      </div>
    </div>
  )
}
