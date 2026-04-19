'use client'

import Link from 'next/link'
import { Check, MessageCircle, Calendar, AlertTriangle, ShoppingBag } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'
import { usePermissions } from '@/shared/context/PermissionsContext'

interface Props {
  shopName: string
  orders: Record<string, unknown>[]
  payments: Record<string, unknown>[]
  presupuestos: Record<string, unknown>[]
  setupCounts?: { materials: number; equipment: number; products: number }
  exchangeRate?: { value: number; currency: string }
}

const SL: Record<string, string> = { pending: 'Pendiente', production: 'En producción', ready: 'Listo' }
const SC: Record<string, string> = { pending: '#FDCB6E', production: '#6C5CE7', ready: '#00B894' }

export default function DashboardClient({ shopName, orders, payments, presupuestos, setupCounts, exchangeRate }: Props) {
  const t = useTranslations('dashboard')
  const { fmt } = useLocale()
  const { showPrices } = usePermissions()
  const now = new Date()
  const h = now.getHours()
  const greetingKey = h < 12 ? 'goodMorning' : h < 19 ? 'goodAfternoon' : 'goodEvening'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStr = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const paidMap = new Map<string, number>()
  payments.forEach(p => { const oid = p.order_id as string; paidMap.set(oid, (paidMap.get(oid) || 0) + (p.monto as number || 0)) })
  const paidFor = (oid: string) => paidMap.get(oid) || 0

  const active = orders.filter(o => o.status !== 'delivered')
  const overdue = active.filter(o => o.due_date && new Date(o.due_date as string) < today)
  const pendingColl = orders.filter(o => (o.total_price as number) - paidFor(o.id as string) > 0 && o.status !== 'delivered')
  const totalPorCobrar = pendingColl.reduce((s, o) => s + ((o.total_price as number) - paidFor(o.id as string)), 0)
  const webPres = presupuestos.filter(p => p.origen === 'catalogo_web')
  const oldPres = presupuestos.filter(p => {
    const age = (now.getTime() - new Date(p.created_at as string).getTime()) / 86400000
    return age > 5 && !p.estado
  })

  const countBy = { pending: 0, production: 0, ready: 0 }
  const amountBy = { pending: 0, production: 0, ready: 0 }
  active.forEach(o => { const s = o.status as keyof typeof countBy; if (s in countBy) { countBy[s]++; amountBy[s] += (o.total_price as number || 0) } })

  // Today's metrics
  const todayOrders = orders.filter(o => new Date(o.created_at as string) >= today)
  const yesterdayStart = new Date(today.getTime() - 86400000)
  const yesterdayOrders = orders.filter(o => { const d = new Date(o.created_at as string); return d >= yesterdayStart && d < today })
  const todayRev = todayOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const yesterdayRev = yesterdayOrders.reduce((s, o) => s + (o.total_price as number || 0), 0)
  const todayCompleted = todayOrders.filter(o => o.status === 'delivered').length
  const convTotal = presupuestos.length
  const convConverted = presupuestos.filter(p => p.estado === 'aceptado').length
  const convRate = convTotal > 0 ? Math.round((convConverted / convTotal) * 100) : 0

  // Próximas entregas
  const upcoming = active
    .filter(o => o.due_date)
    .sort((a, b) => new Date(a.due_date as string).getTime() - new Date(b.due_date as string).getTime())
    .slice(0, 5)

  // Onboarding for new workshops
  const isNewWorkshop = presupuestos.length === 0 && orders.length === 0
  const steps = [
    { icon: '📦', label: 'Cargá tus insumos', desc: 'Papel, tinta, film — con tus precios reales.', href: '/settings/insumos', done: (setupCounts?.materials || 0) > 0 },
    { icon: '🖨', label: 'Cargá tu equipamiento', desc: 'Impresora, plancha — para calcular amortización.', href: '/settings/equipamiento', done: (setupCounts?.equipment || 0) > 0 },
    { icon: '👕', label: 'Cargá tus productos', desc: 'Remeras, tazas, lo que vendas.', href: '/catalogo', done: (setupCounts?.products || 0) > 0 },
    { icon: '🧮', label: 'Cotizá tu primer trabajo', desc: 'Con todo configurado, el cotizador calcula costos y ganancia automáticamente.', href: '/cotizador', done: presupuestos.length > 0 },
  ]

  if (isNewWorkshop) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-gray-900">¡Bienvenido a Estamply! 👋</h1>
          <p className="text-gray-500 mt-2">Configurá tu taller para empezar a cotizar con precisión.</p>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isFirst = !step.done && steps.slice(0, i).every(s => s.done)
            return (
              <Link key={i} href={step.href}
                className={`block p-5 rounded-xl border-2 transition-all ${step.done ? 'border-green-100 bg-green-50/50 opacity-70' : isFirst ? 'border-purple-200 bg-white shadow-sm' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${step.done ? 'bg-green-100' : isFirst ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    {step.done ? <Check size={18} className="text-green-600" /> : step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Paso {i + 1}</span>
                      {step.done && <span className="text-[10px] font-bold text-green-600">Completado</span>}
                    </div>
                    <p className={`font-semibold text-sm ${step.done ? 'text-gray-500' : 'text-gray-800'}`}>{step.label}</p>
                    {!step.done && <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>}
                  </div>
                  {!step.done && <span className="text-gray-300 mt-2">→</span>}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  const alerts: Array<{ color: string; icon: string; text: string; detail?: string; href: string; items?: Array<{ name: string; info: string; wa?: string }> }> = []
  if (overdue.length > 0) alerts.push({ color: '#EF4444', icon: '🔴', text: `Tenés ${overdue.length} pedido${overdue.length > 1 ? 's' : ''} atrasado${overdue.length > 1 ? 's' : ''}`, href: '/orders' })
  if (totalPorCobrar > 0 && showPrices) alerts.push({ color: '#F97316', icon: '🟠', text: `Tenés ${fmt(totalPorCobrar)} por cobrar de ${pendingColl.length} pedido${pendingColl.length > 1 ? 's' : ''}`, href: '/orders',
    items: pendingColl.sort((a, b) => ((b.total_price as number) - paidFor(b.id as string)) - ((a.total_price as number) - paidFor(a.id as string))).slice(0, 3).map(o => ({ name: (o.clients as Record<string, string>)?.name || 'Sin cliente', info: fmt((o.total_price as number) - paidFor(o.id as string)), wa: (o.clients as Record<string, string>)?.whatsapp })) })
  if (oldPres.length > 0) alerts.push({ color: '#EAB308', icon: '🟡', text: `${oldPres.length} presupuesto${oldPres.length > 1 ? 's' : ''} espera${oldPres.length > 1 ? 'n' : ''} respuesta hace más de 5 días`, href: '/presupuesto' })
  if (webPres.length > 0) alerts.push({ color: '#3B82F6', icon: '🔵', text: `Tenés ${webPres.length} presupuesto${webPres.length > 1 ? 's' : ''} nuevo${webPres.length > 1 ? 's' : ''} del catálogo web`, href: '/presupuesto' })

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">{t(greetingKey, { name: shopName })} 👋</h1>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">{dateStr}</p>
      </div>

      {/* Exchange rate */}
      {exchangeRate && (
        <Link href="/settings/moneda" className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 mb-4 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-2"><span className="text-lg">💱</span><span className="text-sm font-medium text-blue-800">1 {exchangeRate.currency} = {fmt(exchangeRate.value)}</span></div>
          <span className="text-xs text-blue-500">Editar →</span>
        </Link>
      )}

      {/* Alerts — Atención requerida */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, i) => (
            <Link key={i} href={alert.href} className="block p-4 rounded-xl bg-white border border-gray-100 hover:shadow-sm transition-shadow" style={{ borderLeftWidth: 4, borderLeftColor: alert.color }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800"><span className="mr-1.5">{alert.icon}</span>{alert.text}</p>
                <span className="text-xs text-gray-400">Ver →</span>
              </div>
              {alert.items && (
                <div className="mt-2 space-y-1">
                  {alert.items.map((item, j) => (
                    <div key={j} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">{item.info}</span>
                        {item.wa && <a href={`https://wa.me/${item.wa.replace(/[\s\-\(\)]/g, '')}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-green-600 hover:text-green-700"><MessageCircle size={12} /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Summary KPIs */}
      {showPrices && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="card p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Facturación hoy</p>
            <p className="text-xl font-black text-gray-900 mt-1">{fmt(todayRev)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">vs {fmt(yesterdayRev)} ayer</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pedidos hoy</p>
            <p className="text-xl font-black text-gray-900 mt-1">{todayOrders.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{todayOrders.length - todayCompleted} nuevos, {todayCompleted} completados</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Por cobrar</p>
            <p className="text-xl font-black text-gray-900 mt-1">{fmt(totalPorCobrar)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{pendingColl.length} pedido{pendingColl.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Conversión</p>
            <p className="text-xl font-black text-gray-900 mt-1">{convRate}%</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{convConverted} de {convTotal} convertidos</p>
          </div>
        </div>
      )}

      {/* Pedidos en curso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">{t('activeOrders')}</h2>
            <Link href="/orders" className="text-xs text-purple-600 font-semibold">{t('viewAll')}</Link>
          </div>
          <div className="space-y-3">
            {(['pending', 'production', 'ready'] as const).map(s => (
              <Link key={s} href="/orders" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: SC[s] }} />
                  <span className="text-sm font-medium text-gray-700">{SL[s]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-800">{countBy[s]}</span>
                  {showPrices && amountBy[s] > 0 && <span className="text-xs text-gray-400">{fmt(amountBy[s])}</span>}
                </div>
              </Link>
            ))}
          </div>
          {active.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No hay pedidos activos</p>}
        </div>

        {/* Próximas entregas */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-800 mb-4">Próximas entregas</h2>
          {upcoming.length > 0 ? (
            <div className="space-y-1">
              {upcoming.map(o => {
                const dueDate = new Date(o.due_date as string)
                const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
                const isOD = daysLeft < 0
                const isTomorrow = daysLeft === 0 || daysLeft === 1
                const cl = o.clients as Record<string, string> | null
                return (
                  <Link key={o.id as string} href="/orders" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{cl?.name || 'Sin cliente'}</p>
                      {showPrices && <p className="text-xs text-gray-400">{fmt(o.total_price as number)}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400"><Calendar size={10} className="inline mr-1" />{dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                      {isOD && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">Atrasado</span>}
                      {isTomorrow && !isOD && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold">Mañana</span>}
                      {!isOD && !isTomorrow && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-bold">{daysLeft}d</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : <p className="text-sm text-gray-400 py-4 text-center">Sin entregas programadas</p>}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-800 mb-4">{t('recentActivity')}</h2>
        <div className="space-y-1">
          {[
            ...presupuestos.slice(0, 8).map(p => ({
              icon: p.origen === 'catalogo_web' ? '🛒' : '📋',
              text: `${p.origen === 'catalogo_web' ? 'Pedido web' : 'Presupuesto'} #${(p.codigo as string || '').slice(0, 8)}`,
              detail: `${p.client_name || ''}${showPrices && p.total ? ` — ${fmt(p.total as number)}` : ''}`,
              date: new Date(p.created_at as string), href: '/presupuesto',
            })),
            ...orders.filter(o => o.status === 'delivered').slice(0, 5).map(o => ({
              icon: '✅', text: `Pedido entregado #${(o.id as string).slice(0, 6).toUpperCase()}`,
              detail: `${(o.clients as Record<string, string>)?.name || ''}${showPrices ? ` — ${fmt(o.total_price as number)}` : ''}`,
              date: new Date(o.created_at as string), href: '/orders',
            })),
            ...payments.slice(0, 5).map(p => ({
              icon: '💰', text: `Pago registrado`,
              detail: showPrices ? fmt(p.monto as number) : '',
              date: new Date(p.fecha as string), href: '/orders',
            })),
          ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10).map((ev, i, arr) => {
            const isToday = ev.date.toDateString() === now.toDateString()
            const isYesterday = ev.date.toDateString() === new Date(now.getTime() - 86400000).toDateString()
            const dayLabel = isToday ? 'Hoy' : isYesterday ? 'Ayer' : ev.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            const showDayHeader = i === 0 || arr[i - 1].date.toDateString() !== ev.date.toDateString()
            return (
              <div key={i}>
                {showDayHeader && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-3 mb-1 first:mt-0">{dayLabel}</p>}
                <Link href={ev.href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-base flex-shrink-0">{ev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{ev.text}</p>
                    {ev.detail && <p className="text-xs text-gray-400 truncate">{ev.detail}</p>}
                  </div>
                  <span className="text-[10px] text-gray-300 flex-shrink-0">{ev.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                </Link>
              </div>
            )
          })}
          {presupuestos.length === 0 && orders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay actividad reciente</p>}
        </div>
      </div>
    </div>
  )
}
