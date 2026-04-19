'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, ShoppingBag, FileText, DollarSign, BarChart3, Download, FileDown } from 'lucide-react'
import EmptyState from '@/shared/components/EmptyState'
import { ComposedChart, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'
import { usePermissions } from '@/shared/context/PermissionsContext'

// fmt provided by useLocale().fmt
function fmtK(n: number) { return n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}` }
function pct(cur: number, prev: number) { return prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100) }

const TL: Record<string, string> = { subli: 'Sublimación', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo Textil', vinyl_adhesivo: 'V. Autoadhesivo', serigrafia: 'Serigrafía' }
const TC: Record<string, string> = { subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', vinyl_adhesivo: '#D63384', serigrafia: '#FDCB6E' }
// SL moved inside component to use translations
const SC: Record<string, string> = { pending: '#FDCB6E', production: '#6C5CE7', ready: '#00B894', delivered: '#636e72' }
const DONUT_COLORS = ['#6C5CE7', '#E17055', '#00B894', '#E84393', '#FDCB6E', '#636e72']

type Order = Record<string, unknown>
type Pres = Record<string, unknown>

export default function EstadisticasPage() {
  const t = useTranslations('statistics')
  const to = useTranslations('orders')
  const tc = useTranslations('common')
  const { fmt } = useLocale()
  const { showCosts } = usePermissions()
  const SL: Record<string, string> = { pending: to('pending'), production: to('inProduction'), ready: to('ready'), delivered: to('delivered') }
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Record<string, unknown>[]>([])
  const [presupuestos, setPresupuestos] = useState<Pres[]>([])
  const now = new Date()
  const [period, setPeriod] = useState('30d')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [statsTab, setStatsTab] = useState<'resumen' | 'ventas' | 'productos' | 'clientes' | 'avanzado'>('resumen')
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

  const PERIOD_OPTIONS: Array<{ id: string; label: string }> = [
    { id: 'today', label: 'Hoy' }, { id: 'yesterday', label: 'Ayer' },
    { id: '7d', label: 'Últimos 7 días' }, { id: '30d', label: 'Últimos 30 días' },
    { id: 'this_month', label: 'Este mes' }, { id: 'last_month', label: 'Mes anterior' },
    { id: '3m', label: 'Últimos 3 meses' }, { id: '12m', label: 'Últimos 12 meses' },
    { id: 'this_year', label: 'Este año' }, { id: 'last_year', label: 'Año anterior' },
    { id: 'custom', label: 'Personalizado' },
  ]

  // Period calculation
  const { start, end, prevStart, prevEnd, label } = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 86400000)
    let s: Date, e: Date
    switch (period) {
      case 'today': s = today; e = tomorrow; break
      case 'yesterday': s = new Date(today.getTime() - 86400000); e = today; break
      case '7d': s = new Date(tomorrow.getTime() - 7 * 86400000); e = tomorrow; break
      case 'this_month': s = new Date(now.getFullYear(), now.getMonth(), 1); e = tomorrow; break
      case 'last_month': s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 1); break
      case '3m': s = new Date(tomorrow.getTime() - 90 * 86400000); e = tomorrow; break
      case '12m': s = new Date(tomorrow.getTime() - 365 * 86400000); e = tomorrow; break
      case 'this_year': s = new Date(now.getFullYear(), 0, 1); e = tomorrow; break
      case 'last_year': s = new Date(now.getFullYear() - 1, 0, 1); e = new Date(now.getFullYear(), 0, 1); break
      case 'custom': s = customFrom ? new Date(customFrom) : new Date(tomorrow.getTime() - 30 * 86400000); e = customTo ? new Date(new Date(customTo).getTime() + 86400000) : tomorrow; break
      default: s = new Date(tomorrow.getTime() - 30 * 86400000); e = tomorrow
    }
    const days = Math.max(Math.round((e.getTime() - s.getTime()) / 86400000), 1)
    const prevEnd = new Date(s)
    const prevStart = new Date(prevEnd.getTime() - days * 86400000)
    const lbl = PERIOD_OPTIONS.find(o => o.id === period)?.label || 'Últimos 30 días'
    return { start: s, end: e, prevStart, prevEnd, label: lbl }
  }, [period, customFrom, customTo])

  const inRange = (d: string, s: Date, e: Date) => { const dt = new Date(d); return dt >= s && dt < e }
  const curOrders = orders.filter(o => inRange(o.created_at as string, start, end))
  const prevOrders = orders.filter(o => inRange(o.created_at as string, prevStart, prevEnd))
  const curPres = presupuestos.filter(p => inRange(p.created_at as string, start, end))
  const prevPres = presupuestos.filter(p => inRange(p.created_at as string, prevStart, prevEnd))

  // Summary
  const facturacion = curOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const facPrev = prevOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const pedidos = curOrders.length, pedPrev = prevOrders.length
  const pedidosCompleted = curOrders.filter(o => o.status === 'delivered').length
  const pedidosInProcess = curOrders.filter(o => o.status === 'production').length
  const ticket = pedidos > 0 ? Math.round(facturacion / pedidos) : 0
  const ticketPrev = pedPrev > 0 ? Math.round(facPrev / pedPrev) : 0
  const ticketMin = pedidos > 0 ? Math.min(...curOrders.map(o => o.total_price as number || 0)) : 0
  const ticketMax = pedidos > 0 ? Math.max(...curOrders.map(o => o.total_price as number || 0)) : 0
  const presCount = curPres.length, presPrev = prevPres.length

  // Status counts + amounts
  const statusCounts: Record<string, number> = {}
  const statusAmounts: Record<string, number> = {}
  curOrders.forEach(o => { const s = o.status as string; statusCounts[s] = (statusCounts[s] || 0) + 1; statusAmounts[s] = (statusAmounts[s] || 0) + (o.total_price as number || 0) })
  const totalStatus = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  // Payment methods
  const payMethodMap = new Map<string, number>()
  payments.filter(p => {
    const orderId = p.order_id as string
    return curOrders.some(o => o.id === orderId)
  }).forEach(p => {
    const method = (p.metodo as string) || 'Sin especificar'
    payMethodMap.set(method, (payMethodMap.get(method) || 0) + (p.monto as number || 0))
  })
  const payMethodData = [...payMethodMap.entries()].map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value)
  const payMethodTotal = payMethodData.reduce((s, d) => s + d.value, 0)

  // Production stats
  const totalUnits = curOrders.reduce((s, o) => ((o.items || []) as Array<Record<string, unknown>>).reduce((sum, i) => sum + ((i.cantidad as number) || 1), s), 0)
  const daysInPeriod = Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), 1)
  const ordersPerDay = (pedidos / daysInPeriod).toFixed(1)

  // Facturación por día de la semana
  const dayOfWeekData = useMemo(() => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const daySums: number[] = [0, 0, 0, 0, 0, 0, 0]
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0]
    curOrders.forEach(o => { const d = new Date(o.created_at as string).getDay(); daySums[d] += (o.total_price as number || 0); dayCounts[d]++ })
    // Count weeks in period to get averages
    const weeks = Math.max(daysInPeriod / 7, 1)
    return [1, 2, 3, 4, 5, 6, 0].map(d => ({ name: dayNames[d], value: Math.round(daySums[d] / weeks), orders: dayCounts[d] }))
  }, [curOrders, daysInPeriod])
  const bestDay = dayOfWeekData.reduce((a, b) => b.value > a.value ? b : a, dayOfWeekData[0])
  const worstDay = dayOfWeekData.reduce((a, b) => b.value < a.value ? b : a, dayOfWeekData[0])

  // Clientes nuevos vs recurrentes
  const { newClients, recurringClients } = useMemo(() => {
    const clientFirstOrder = new Map<string, Date>()
    orders.forEach(o => {
      const name = (o.clients as Record<string, string>)?.name
      if (!name) return
      const d = new Date(o.created_at as string)
      if (!clientFirstOrder.has(name) || d < clientFirstOrder.get(name)!) clientFirstOrder.set(name, d)
    })
    let newC = { count: 0, revenue: 0 }, recC = { count: 0, revenue: 0 }
    const counted = new Set<string>()
    curOrders.forEach(o => {
      const name = (o.clients as Record<string, string>)?.name
      if (!name || counted.has(name)) return
      counted.add(name)
      const firstDate = clientFirstOrder.get(name)
      if (firstDate && firstDate >= start) { newC.count++; newC.revenue += (o.total_price as number || 0) }
      else { recC.count++; recC.revenue += (o.total_price as number || 0) }
    })
    // Add revenue from all orders for recurring
    curOrders.forEach(o => {
      const name = (o.clients as Record<string, string>)?.name
      if (!name) return
      const firstDate = clientFirstOrder.get(name)
      if (firstDate && firstDate >= start) return // already counted as new
      if (!counted.has(name + '_rev')) { counted.add(name + '_rev') } // just for tracking
    })
    return { newClients: newC, recurringClients: recC }
  }, [curOrders, orders, start])

  // Clientes sin actividad reciente (60 días)
  const atRiskClients = useMemo(() => {
    const clientData = new Map<string, { lastOrder: Date; totalRevenue: number; phone?: string }>()
    orders.forEach(o => {
      const cl = o.clients as Record<string, string> | null
      if (!cl?.name) return
      const d = new Date(o.created_at as string)
      const existing = clientData.get(cl.name)
      if (!existing || d > existing.lastOrder) {
        clientData.set(cl.name, { lastOrder: d, totalRevenue: (existing?.totalRevenue || 0) + (o.total_price as number || 0), phone: cl.whatsapp || cl.phone })
      } else {
        existing.totalRevenue += (o.total_price as number || 0)
      }
    })
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)
    return [...clientData.entries()]
      .filter(([, v]) => v.lastOrder < sixtyDaysAgo)
      .map(([name, v]) => ({ name, lastOrder: v.lastOrder, daysSince: Math.round((now.getTime() - v.lastOrder.getTime()) / 86400000), totalRevenue: v.totalRevenue, phone: v.phone }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
  }, [orders])

  // Productos sin ventas en el período
  const productsWithoutSales = useMemo(() => {
    const soldNames = new Set<string>()
    curOrders.forEach(o => { ((o.items || []) as Array<Record<string, unknown>>).forEach(i => { if (i.nombre) soldNames.add(i.nombre as string) }) })
    // Get all product names from ALL orders (historical)
    const allProducts = new Map<string, { lastSale: Date | null; price: number }>()
    orders.forEach(o => {
      ((o.items || []) as Array<Record<string, unknown>>).forEach(i => {
        const name = i.nombre as string
        if (!name) return
        const d = new Date(o.created_at as string)
        const existing = allProducts.get(name)
        if (!existing || (d > (existing.lastSale || new Date(0)))) allProducts.set(name, { lastSale: d, price: (i.precioUnit as number) || 0 })
      })
    })
    return [...allProducts.entries()]
      .filter(([name]) => !soldNames.has(name))
      .map(([name, v]) => ({ name, lastSale: v.lastSale, daysSince: v.lastSale ? Math.round((now.getTime() - v.lastSale.getTime()) / 86400000) : 999, price: v.price }))
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 10)
  }, [curOrders, orders])

  // Chart data
  const chartData = useMemo(() => {
    const days = Math.round((end.getTime() - start.getTime()) / 86400000)
    const buckets: Record<string, number> = {}
    const fmt2 = (d: Date) => {
      if (days <= 31) return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
      if (days <= 100) return `Sem ${Math.ceil(((d.getTime() - start.getTime()) / 86400000 + 1) / 7)}`
      return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    }
    const orderCounts: Record<string, number> = {}
    curOrders.forEach(o => {
      const d = new Date(o.created_at as string)
      const key = fmt2(d)
      buckets[key] = (buckets[key] || 0) + (o.total_price as number || 0)
      orderCounts[key] = (orderCounts[key] || 0) + 1
    })
    // Build data with trend line (3-point moving average)
    const raw = Object.entries(buckets).map(([name, value]) => ({ name, value, orders: orderCounts[name] || 0, trend: 0 }))
    for (let i = 0; i < raw.length; i++) {
      const window = [raw[i - 1]?.value || 0, raw[i].value, raw[i + 1]?.value || 0].filter((_, j) => (i === 0 ? j >= 1 : i === raw.length - 1 ? j <= 1 : true))
      raw[i].trend = Math.round(window.reduce((a, b) => a + b, 0) / window.length)
    }
    return raw
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
  const originData = [{ name: t('manual'), value: manualRev || facturacion }, ...(webRev > 0 ? [{ name: t('webCatalog'), value: webRev }] : [])]

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

  // Conversion — only count presupuestos explicitly marked as 'aceptado' (converted to order)
  const convertedCount = Math.min(curPres.filter(p => p.estado === 'aceptado').length, curPres.length)
  const convRate = curPres.length > 0 ? Math.min(Math.round((convertedCount / curPres.length) * 100), 100) : 0
  const prevConverted = Math.min(prevPres.filter(p => p.estado === 'aceptado').length, prevPres.length)
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
      conversion: pp.length > 0 ? Math.min(Math.round((pp.filter(p => p.estado === 'aceptado').length / pp.length) * 100), 100) : 0,
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
      { Metrica: t('revenue'), Valor: facturacion }, { Metrica: t('orders'), Valor: pedidos },
      { Metrica: t('avgTicket'), Valor: ticket }, { Metrica: t('quotesCount'), Valor: presCount },
      { Metrica: t('grossMargin'), Valor: `${margen}%` },
    ]), 'Resumen')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topSold.map(([n, v]) => ({ Producto: n, Unidades: v.units, [t('revenue')]: v.revenue }))), 'Productos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientRanking.map(([n, v]) => ({ Cliente: n, [t('orders')]: v.pedidos, [t('revenue')]: v.revenue }))), 'Clientes')
    XLSX.writeFile(wb, `Estamply_Estadisticas_${label.replace(/\s/g, '')}.xlsx`)
  }

  function Donut({ data, total }: { data: Array<{ name: string; value: number }>; total: number }) {
    if (data.length <= 1) {
      const d = data[0]
      return d ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <span className="w-3 h-3 rounded-full" style={{ background: DONUT_COLORS[0] }} />
          <span className="text-sm font-semibold text-gray-700">{d.name}</span>
          <span className="text-sm text-gray-400">— {fmt(d.value)} (100%)</span>
        </div>
      ) : null
    }
    return (<>
      <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>{data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
      <div className="space-y-1 mt-2">{data.map((d, i) => <div key={d.name} className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} /><span className="flex-1 text-gray-600">{d.name}</span><span className="font-semibold text-gray-800">{total > 0 ? Math.round(d.value / total * 100) : 0}%</span><span className="text-gray-400">{fmt(d.value)}</span></div>)}</div>
    </>)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  if (orders.length === 0 && presupuestos.length === 0) return <EmptyState icon="📊" title="Todavía no hay datos para mostrar." description="Las estadísticas se generan a partir de tus presupuestos y pedidos. Empezá a cotizar y vas a ver tus métricas acá." actionLabel="Ir al Cotizador" actionHref="/cotizador" />

  return (
    <div className="max-w-5xl mx-auto" id="stats-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period dropdown */}
          <div className="relative">
            <button onClick={() => setPeriodOpen(!periodOpen)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white shadow-sm">
              {label} <span className="text-[9px] opacity-70">▾</span>
            </button>
            {periodOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {PERIOD_OPTIONS.map(o => (
                  <button key={o.id} onClick={() => { if (o.id !== 'custom') { setPeriod(o.id); setPeriodOpen(false) } else { setPeriod('custom') } }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${period === o.id ? 'font-bold text-purple-600' : 'text-gray-700'}`}>
                    {o.label} {period === o.id && '✓'}
                  </button>
                ))}
                {period === 'custom' && (
                  <div className="px-3 py-2 border-t border-gray-100 space-y-2">
                    <input type="date" className="input-base text-xs !py-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                    <input type="date" className="input-base text-xs !py-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                    <button onClick={() => setPeriodOpen(false)} className="w-full py-1 rounded text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>Aplicar</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={exportExcel} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <Download size={12} /> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <FileDown size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 -mt-2">
        {([['resumen', 'Resumen'], ['ventas', 'Ventas'], ['productos', 'Productos'], ['clientes', 'Clientes'], ['avanzado', 'Avanzado']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setStatsTab(id)} className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${statsTab === id ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`} style={statsTab === id ? { background: '#6C5CE7' } : {}}>{label}</button>
        ))}
      </div>

      {/* Summary cards — Resumen */}
      {statsTab === 'resumen' && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: t('revenue'), value: fmt(facturacion), change: pct(facturacion, facPrev), hasPrev: facPrev > 0, icon: DollarSign, color: '#6C5CE7', sub: facPrev > 0 ? `vs ${fmt(facPrev)} anterior` : '' },
          { label: t('orders'), value: String(pedidos), change: pct(pedidos, pedPrev), hasPrev: pedPrev > 0, icon: ShoppingBag, color: '#E17055', sub: `${pedidosCompleted} completados${pedidosInProcess > 0 ? `, ${pedidosInProcess} en proceso` : ''}` },
          { label: t('avgTicket'), value: fmt(ticket), change: pct(ticket, ticketPrev), hasPrev: ticketPrev > 0, icon: BarChart3, color: '#00B894', sub: pedidos > 0 ? `Mín: ${fmt(ticketMin)} — Máx: ${fmt(ticketMax)}` : '' },
          { label: t('quotesCount'), value: String(presCount), change: pct(presCount, presPrev), hasPrev: presPrev > 0, icon: FileText, color: '#E84393', sub: `${convertedCount} convertidos (${convRate}%)` },
        ].map(c => (
          <div key={c.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15` }}><c.icon size={16} style={{ color: c.color }} /></div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.label}</span>
            </div>
            <p className="text-xl font-black text-gray-900">{c.value}</p>
            {c.hasPrev ? (
              <div className="flex items-center gap-1 mt-1">
                {c.change >= 0 ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
                <span className={`text-xs font-medium ${c.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>{c.change > 0 ? '+' : ''}{c.change}%</span>
              </div>
            ) : <p className="text-[10px] text-gray-300 mt-1">Sin datos previos</p>}
            {c.sub && <p className="text-[10px] text-gray-400 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>}

      {/* Status bar — Resumen */}
      {statsTab === 'resumen' && <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-3">{t('ordersByStatus')}</h2>
        <div className="flex gap-4 mb-3 flex-wrap">
          {Object.entries(SL).map(([k, v]) => <button key={k} onClick={() => router.push('/orders')} className="flex items-center gap-1.5 hover:bg-gray-50 px-1.5 py-0.5 rounded-lg transition-colors"><span className="w-3 h-3 rounded-full" style={{ background: SC[k] }} /><span className="text-sm text-gray-600">{v}: <span className="font-bold">{statusCounts[k] || 0}</span>{(statusAmounts[k] || 0) > 0 && <span className="text-gray-400 ml-1">({fmt(statusAmounts[k])})</span>}</span></button>)}
        </div>
        {totalStatus > 0 && <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">{Object.keys(SL).map(k => { const p = ((statusCounts[k] || 0) / totalStatus) * 100; return p > 0 ? <div key={k} style={{ width: `${p}%`, background: SC[k] }} /> : null })}</div>}
      </div>}

      {/* Revenue chart — Resumen */}
      {statsTab === 'resumen' && chartData.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">{t('revenueChart')}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} width={60} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload as { name: string; value: number; orders: number }
                return <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 text-xs"><p className="font-semibold text-gray-800">{d.name}</p><p className="text-gray-600">{fmt(d.value)}</p><p className="text-gray-400">{d.orders} pedido{d.orders !== 1 ? 's' : ''}</p></div>
              }} />
              <Bar dataKey="value" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="trend" stroke="#a29bfe" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3 text-sm text-gray-500">
            <span>{t('totalPeriod')}: <span className="font-bold text-gray-800">{fmt(facturacion)}</span></span>
            <span>{t('dailyAvg')}: <span className="font-bold text-gray-800">{fmt(Math.round(facturacion / Math.max(chartData.length, 1)))}</span>/día</span>
          </div>
        </div>
      )}

      {/* Rentabilidad — Ventas */}
      {statsTab === 'ventas' && showCosts && (
      <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">{t('profitability')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('revenue')}</p><p className="text-lg font-black text-gray-900">{fmt(facConCosto)}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('costs')}</p><p className="text-lg font-black text-gray-900">{fmt(costos)}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('grossMargin')}</p><p className="text-lg font-black" style={{ color: '#6C5CE7' }}>{fmt(facConCosto - costos)}</p><p className="text-xs font-semibold" style={{ color: '#6C5CE7' }}>{margen}%</p></div>
        </div>
        {facConCosto > 0 && <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 mb-2"><div style={{ width: `${margen}%`, background: '#6C5CE7' }} /><div style={{ width: `${100 - margen}%`, background: '#E0DCF8' }} /></div>}
        <div className="flex gap-4 text-xs text-gray-500"><span>■ {t('profit')} {margen}%</span><span className="text-gray-300">□ {t('costs')} {100 - margen}%</span></div>
        {sinCosto > 0 && <p className="text-xs text-amber-600 mt-2">⚠️ {sinCosto} {t('noCostWarning')}</p>}
      </div>
      )}

      {/* Products — Productos */}
      {statsTab === 'productos' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">{t('topSelling')}</h2>
          {topSold.length > 0 ? <div className="space-y-2">{topSold.map(([n, v], i) => <div key={n} className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{n}</p><p className="text-xs text-gray-400">{v.units} u. — {fmt(v.revenue)}</p></div></div>)}</div> : <p className="text-sm text-gray-400">{tc('noData')}</p>}
        </div>
        {showCosts && (
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">{t('topProfitable')}</h2>
          {topMargin.length > 0 ? <div className="space-y-2">{topMargin.map((p, i) => <div key={p.name} className="flex items-center gap-2"><span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{p.name}</p><p className="text-xs text-gray-400">margen {p.margin}% — {fmt(p.profit)}</p></div></div>)}</div> : (
            <div className="text-center py-6">
              <DollarSign size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Cargá los costos de tus productos para ver cuáles son más rentables</p>
              <button onClick={() => router.push('/catalogo')} className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-800">Ir al Catálogo →</button>
            </div>
          )}
        </div>
        )}
      </div>}

      {/* By technique + origin — Ventas */}
      {statsTab === 'ventas' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">{t('salesByTechnique')}</h2>
          {techData.length > 0 && techTotal > 0 ? <Donut data={techData} total={techTotal} /> : <p className="text-sm text-gray-400">{tc('noData')}</p>}
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">{t('salesByOrigin')}</h2>
          {facturacion > 0 ? <Donut data={originData} total={facturacion} /> : <p className="text-sm text-gray-400">{tc('noData')}</p>}
        </div>
      </div>}

      {/* Client ranking — Clientes */}
      {statsTab === 'clientes' && <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-3">{t('clientRanking')}</h2>
        {clientRanking.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-100">
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">#</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Cliente</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">{t('orders')}</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">{t('revenue')}</th>
              {showCosts && <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">{t('grossMargin')}</th>}
            </tr></thead><tbody>
              {clientRanking.map(([n, v], i) => {
                const m = v.cost > 0 ? Math.round(((v.revenue - v.cost) / v.revenue) * 100) : null
                return (
                  <tr key={n} className="border-b border-gray-50">
                    <td className="px-2 py-2 text-gray-400 font-bold">{i + 1}</td>
                    <td className="px-2 py-2 font-medium text-gray-800">{n === 'Sin cliente' ? <span className="text-amber-600 flex items-center gap-1 cursor-pointer" onClick={() => router.push('/orders')}>⚠ Sin cliente</span> : <span className="cursor-pointer hover:text-purple-600" onClick={() => router.push('/clients')}>{n}</span>}</td>
                    <td className="px-2 py-2 text-gray-600">{v.pedidos}</td>
                    <td className="px-2 py-2 font-semibold text-gray-800">{fmt(v.revenue)}</td>
                    {showCosts && <td className="px-2 py-2">{m !== null ? <span className={m >= 40 ? 'text-green-600' : m >= 20 ? 'text-amber-600' : 'text-red-500'}>{m}%</span> : <span className="text-gray-300">—</span>}</td>}
                  </tr>
                )
              })}
            </tbody></table>
          </div>
        ) : <p className="text-sm text-gray-400">{tc('noData')}</p>}
      </div>}

      {/* Conversion — Resumen */}
      {statsTab === 'resumen' && <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">{t('quoteConversion')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('created')}</p><p className="text-lg font-black text-gray-900">{curPres.length}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('converted')}</p><p className="text-lg font-black text-gray-900">{convertedCount}</p></div>
          <div className="p-3 rounded-lg bg-gray-50"><p className="text-xs text-gray-500">{t('rate')}</p><p className="text-lg font-black" style={{ color: '#6C5CE7' }}>{convRate}%</p>
            {prevConvRate > 0 && <p className={`text-xs ${convRate >= prevConvRate ? 'text-green-600' : 'text-red-500'}`}>{convRate >= prevConvRate ? '↑' : '↓'} {Math.abs(convRate - prevConvRate)}pp</p>}
          </div>
        </div>
        {curPres.length > 0 && (
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
            <div style={{ width: `${Math.min(convRate, 100)}%`, background: '#6C5CE7' }} />
            <div style={{ width: `${100 - Math.min(convRate, 100)}%`, background: '#E0DCF8' }} />
          </div>
        )}
        <div className="flex gap-4 text-xs text-gray-500 mt-2"><span>■ {t('converted')} {convRate}%</span><span className="text-gray-300">□ {100 - Math.min(convRate, 100)}%</span></div>
        {convertedCount > 0 && <p className="text-xs text-gray-400 mt-2">Convertidos: {convertedCount} ({fmt(curPres.filter(p => p.estado === 'aceptado').reduce((s, p) => s + ((p.total as number) || 0), 0))} de {fmt(curPres.reduce((s, p) => s + ((p.total as number) || 0), 0))} presupuestados)</p>}

        {/* Funnel */}
        {curPres.length > 0 && (() => {
          const created = curPres.length
          const sent = curPres.filter(p => p.estado === 'enviado' || p.estado === 'aceptado').length || created
          const accepted = convertedCount
          const createdAmt = curPres.reduce((s, p) => s + ((p.total as number) || 0), 0)
          const acceptedAmt = curPres.filter(p => p.estado === 'aceptado').reduce((s, p) => s + ((p.total as number) || 0), 0)
          const steps = [
            { label: 'Creados', count: created, pct: 100, amount: createdAmt },
            { label: 'Convertidos a pedido', count: accepted, pct: created > 0 ? Math.round((accepted / created) * 100) : 0, amount: acceptedAmt },
          ]
          return (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Embudo de conversión</p>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{step.label}</span>
                      <span className="text-gray-500">{step.count} ({step.pct}%) · {fmt(step.amount)}</span>
                    </div>
                    <div className="h-6 rounded-lg overflow-hidden" style={{ background: '#F3F4F6' }}>
                      <div className="h-full rounded-lg transition-all" style={{ width: `${step.pct}%`, background: i === 0 ? '#6C5CE7' : '#a29bfe' }} />
                    </div>
                    {i < steps.length - 1 && steps[i].count > steps[i + 1].count && (
                      <p className="text-[10px] text-red-400 mt-0.5 ml-1">↓ Perdidos: {steps[i].count - steps[i + 1].count} ({100 - steps[i + 1].pct}%)</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>}

      {/* Payment methods + Production — Ventas */}
      {statsTab === 'ventas' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">Facturación por método de pago</h2>
          {payMethodData.length > 0 ? <Donut data={payMethodData} total={payMethodTotal} /> : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">Sin datos de pagos registrados.</p>
              <p className="text-xs text-gray-300 mt-1">Registrá pagos en tus pedidos para ver esta estadística.</p>
            </div>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-3">Producción del período</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-gray-500 uppercase font-semibold">Unidades</p><p className="text-lg font-black text-gray-900">{totalUnits.toLocaleString('es-AR')}</p></div>
            <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-gray-500 uppercase font-semibold">Pedidos/día</p><p className="text-lg font-black text-gray-900">{ordersPerDay}</p></div>
            <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-gray-500 uppercase font-semibold">Completados</p><p className="text-lg font-black text-gray-900">{pedidosCompleted}</p></div>
            <div className="p-3 rounded-lg bg-gray-50"><p className="text-[10px] text-gray-500 uppercase font-semibold">Completitud</p><p className="text-lg font-black text-gray-900">{pedidos > 0 ? Math.round((pedidosCompleted / pedidos) * 100) : 0}%</p></div>
          </div>
        </div>
      </div>}

      {/* Day of week — Ventas */}
      {statsTab === 'ventas' && facturacion > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-3">Facturación por día de la semana</h2>
          <div className="space-y-2">
            {dayOfWeekData.map(d => {
              const maxVal = bestDay.value || 1
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-600 w-20">{d.name}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / maxVal) * 100}%`, background: d === bestDay ? '#22C55E' : d === worstDay ? '#D1D5DB' : '#6C5CE7' }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-20 text-right">{fmt(d.value)}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">Mejor día: <span className="font-semibold text-green-600">{bestDay.name}</span> ({fmt(bestDay.value)} promedio)</p>
        </div>
      )}

      {/* Clientes nuevos vs recurrentes — Clientes */}
      {statsTab === 'clientes' && (newClients.count + recurringClients.count) > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-3">Clientes nuevos vs recurrentes</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-[10px] text-green-600 uppercase font-semibold">Nuevos</p>
              <p className="text-lg font-black text-green-700">{newClients.count}</p>
              <p className="text-xs text-green-600">{fmt(newClients.revenue)}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-[10px] text-purple-600 uppercase font-semibold">Recurrentes</p>
              <p className="text-lg font-black text-purple-700">{recurringClients.count}</p>
              <p className="text-xs text-purple-600">{fmt(recurringClients.revenue)}</p>
            </div>
          </div>
          {(newClients.revenue + recurringClients.revenue) > 0 && (
            <p className="text-xs text-gray-400">{Math.round((recurringClients.revenue / (newClients.revenue + recurringClients.revenue)) * 100)}% de tu facturación viene de clientes recurrentes</p>
          )}
        </div>
      )}

      {/* Clientes sin actividad reciente — Clientes */}
      {statsTab === 'clientes' && atRiskClients.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-3">Clientes sin actividad reciente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-100">
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Cliente</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Última compra</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Días sin comprar</th>
              <th className="text-right px-2 py-2 text-xs text-gray-400 font-semibold">Facturación total</th>
              <th className="px-2 py-2"></th>
            </tr></thead><tbody>
              {atRiskClients.map(c => (
                <tr key={c.name} className="border-b border-gray-50">
                  <td className="px-2 py-2 font-medium text-gray-800">{c.name}</td>
                  <td className="px-2 py-2 text-gray-500">{c.lastOrder.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</td>
                  <td className="px-2 py-2"><span className="text-red-500 font-semibold">{c.daysSince}d</span></td>
                  <td className="px-2 py-2 text-right font-semibold text-gray-800">{fmt(c.totalRevenue)}</td>
                  <td className="px-2 py-2">{c.phone && <a href={`https://wa.me/${c.phone.replace(/[\s\-\(\)]/g, '')}`} target="_blank" rel="noopener" className="text-green-600 hover:text-green-700" title="WhatsApp">💬</a>}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}

      {/* Productos sin ventas — Productos */}
      {statsTab === 'productos' && productsWithoutSales.length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-bold text-gray-800 mb-3">Productos sin ventas en el período</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-100">
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Producto</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Última venta</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400 font-semibold">Días sin venta</th>
              <th className="text-right px-2 py-2 text-xs text-gray-400 font-semibold">Precio</th>
            </tr></thead><tbody>
              {productsWithoutSales.map(p => (
                <tr key={p.name} className="border-b border-gray-50">
                  <td className="px-2 py-2 font-medium text-gray-800">{p.name}</td>
                  <td className="px-2 py-2 text-gray-500">{p.lastSale ? p.lastSale.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '—'}</td>
                  <td className="px-2 py-2"><span className="text-amber-600 font-semibold">{p.daysSince}d</span></td>
                  <td className="px-2 py-2 text-right text-gray-600">{p.price ? fmt(p.price) : '—'}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      )}

      {/* Evolution — Ventas */}
      {statsTab === 'ventas' && showCosts && <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">{t('profitEvolution')}</h2>
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
            <span>{t('average')}: <span className="font-bold text-gray-800">{evoAvg}%</span></span>
            {evoBest && <span>{t('bestMonth')}: <span className="font-bold text-green-600">{evoBest.name} ({evoBest.margin}%)</span></span>}
            {evoWorst && evoWorst.revenue > 0 && <span>{t('worstMonth')}: <span className="font-bold text-red-500">{evoWorst.name} ({evoWorst.margin}%)</span></span>}
          </div>
        </>) : <p className="text-sm text-gray-400">{t('noSufficientData')}</p>}
      </div>}

      {/* Compare periods — Ventas */}
      {statsTab === 'ventas' && <div className="card p-5 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">{t('comparePeriods')}</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
          <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">{t('periodA')}</label><input type="date" className="input-base text-sm" value={cmpA} onChange={e => setCmpA(e.target.value)} /></div>
          <span className="text-gray-400 text-sm hidden sm:block pb-2">vs</span>
          <div className="flex-1"><label className="block text-xs text-gray-500 mb-1">{t('periodB')}</label><input type="date" className="input-base text-sm" value={cmpB} onChange={e => setCmpB(e.target.value)} /></div>
          <button onClick={() => setShowCmp(true)} disabled={!cmpA || !cmpB} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>{t('compare')}</button>
        </div>
        {showCmp && cmpA && cmpB && (() => {
          const a = calcPeriodMetrics(new Date(cmpA), new Date(new Date(cmpA).getTime() + 30 * 86400000))
          const b = calcPeriodMetrics(new Date(cmpB), new Date(new Date(cmpB).getTime() + 30 * 86400000))
          const rows = [
            { label: t('revenue'), va: fmt(a.facturacion), vb: fmt(b.facturacion), change: pct(b.facturacion, a.facturacion), unit: '%' },
            { label: t('orders'), va: String(a.pedidos), vb: String(b.pedidos), change: pct(b.pedidos, a.pedidos), unit: '%' },
            { label: t('avgTicket'), va: fmt(a.ticket), vb: fmt(b.ticket), change: pct(b.ticket, a.ticket), unit: '%' },
            ...(showCosts ? [{ label: t('grossMargin'), va: `${a.margen}%`, vb: `${b.margen}%`, change: b.margen - a.margen, unit: 'pp' }] : []),
            { label: t('quoteConversion'), va: `${a.conversion}%`, vb: `${b.conversion}%`, change: b.conversion - a.conversion, unit: 'pp' },
          ]
          return (
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]"><thead><tr className="border-b border-gray-100">
              <th className="text-left px-2 py-2 text-xs text-gray-400">#</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400">{t('periodA')}</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400">{t('periodB')}</th>
              <th className="text-left px-2 py-2 text-xs text-gray-400">{t('change')}</th>
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
            </div>
          )
        })()}
      </div>}

      {/* Avanzado — placeholder */}
      {statsTab === 'avanzado' && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3 opacity-30">🔮</p>
          <p className="font-semibold text-gray-500">Próximamente</p>
          <p className="text-sm text-gray-400 mt-1">Rentabilidad por técnica, frecuencia de compra, insights automáticos</p>
        </div>
      )}
    </div>
  )
}
