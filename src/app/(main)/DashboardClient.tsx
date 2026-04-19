'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, MessageCircle, Calendar, DollarSign, ShoppingBag, Clock, TrendingUp, ChevronDown } from 'lucide-react'
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

  const [activityOpen, setActivityOpen] = useState(true)

  // 7-day chart data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000)
    const dayOrders = orders.filter(o => { const od = new Date(o.created_at as string); return od >= d && od < new Date(d.getTime() + 86400000) })
    return { day: d.toLocaleDateString('es-AR', { day: '2-digit' }), value: dayOrders.reduce((s, o) => s + (o.total_price as number || 0), 0) }
  })
  const max7 = Math.max(...last7.map(d => d.value), 1)

  // Onboarding checklist
  const onboardingSteps = [
    { label: 'Datos del taller', done: !!shopName && shopName !== 'Mi Taller', href: '/settings' },
    { label: 'Equipamiento', done: (setupCounts?.equipment || 0) > 0, href: '/settings/equipamiento' },
    { label: 'Insumos y costos', done: (setupCounts?.materials || 0) > 0, href: '/settings/insumos' },
    { label: 'Primer producto', done: (setupCounts?.products || 0) > 0, href: '/catalogo' },
    { label: 'Primera cotización', done: presupuestos.length > 0, href: '/cotizador' },
  ]
  const onboardingDone = onboardingSteps.filter(s => s.done).length
  const showOnboarding = onboardingDone < onboardingSteps.length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">{t(greetingKey, { name: shopName })} 👋</h1>
        <p className="text-sm text-gray-400 mt-0.5">{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>
      </div>

      {/* Exchange rate */}
      {exchangeRate && (
        <Link href="/settings/moneda" className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-2"><span className="text-lg">💱</span><span className="text-sm font-medium text-blue-800">1 {exchangeRate.currency} = {fmt(exchangeRate.value)}</span></div>
          <span className="text-xs text-blue-500">Editar →</span>
        </Link>
      )}

      {/* Alerts — Atención requerida */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Link key={i} href={alert.href} className="block p-5 rounded-xl hover:shadow-md transition-all" style={{ borderLeft: `4px solid ${alert.color}`, background: `${alert.color}08`, border: `1px solid ${alert.color}20`, borderLeftWidth: 4, borderLeftColor: alert.color }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl mt-0.5">{alert.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{alert.text}</p>
                    {alert.items && (
                      <div className="mt-2 space-y-1.5">
                        {alert.items.map((item, j) => (
                          <div key={j} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-700">{item.info}</span>
                              {item.wa && <a href={`https://wa.me/${item.wa.replace(/[\s\-\(\)]/g, '')}`} target="_blank" rel="noopener" onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(`https://wa.me/${item.wa!.replace(/[\s\-\(\)]/g, '')}`, '_blank') }} className="text-green-600 hover:text-green-700"><MessageCircle size={13} /></a>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: alert.color }}>Ver →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Summary KPIs */}
      {showPrices && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Facturación hoy', value: fmt(todayRev), sub: `vs ${fmt(yesterdayRev)} ayer`, icon: DollarSign, color: '#22C55E', href: '/estadisticas' },
            { label: 'Pedidos hoy', value: String(todayOrders.length), sub: `${todayOrders.length - todayCompleted} nuevos, ${todayCompleted} completados`, icon: ShoppingBag, color: '#6C5CE7', href: '/orders' },
            { label: 'Por cobrar', value: fmt(totalPorCobrar), sub: `${pendingColl.length} pedido${pendingColl.length !== 1 ? 's' : ''}`, icon: Clock, color: '#F59E0B', href: '/orders', highlight: totalPorCobrar > 100000 },
            { label: 'Conversión', value: `${convRate}%`, sub: `${convConverted} de ${convTotal}`, icon: TrendingUp, color: '#3B82F6', href: '/estadisticas' },
          ].map(c => (
            <Link key={c.label} href={c.href} className={`card p-5 hover:shadow-md transition-all cursor-pointer ${(c as { highlight?: boolean }).highlight ? 'ring-1 ring-amber-200' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15` }}>
                  <c.icon size={16} style={{ color: c.color }} />
                </div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Mini 7-day chart */}
      {showPrices && (
        <Link href="/estadisticas" className="card p-4 hover:shadow-md transition-all hidden md:block">
          <div className="flex items-end gap-1 h-16">
            {last7.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t" style={{ height: `${Math.max((d.value / max7) * 56, 2)}px`, background: '#6C5CE7', opacity: i === 6 ? 1 : 0.5 }} title={`${d.day}: ${fmt(d.value)}`} />
                <span className="text-[9px] text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </Link>
      )}

      {/* Pedidos en curso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">{t('activeOrders')}</h2>
            <Link href="/orders" className="text-xs text-purple-600 font-semibold hover:text-purple-800">{t('viewAll')} →</Link>
          </div>
          <div className="space-y-1">
            {(['pending', 'production', 'ready'] as const).map(s => (
              <Link key={s} href="/orders" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: SC[s] }} />
                  <span className={`text-sm font-medium ${countBy[s] > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{SL[s]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${countBy[s] > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{countBy[s]}</span>
                  {showPrices && amountBy[s] > 0 && <span className="text-xs text-gray-400">{fmt(amountBy[s])}</span>}
                  <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Próximas entregas */}
        <div className={`card ${upcoming.length > 0 ? 'p-6' : 'p-6'}`}>
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
                  <Link key={o.id as string} href="/orders" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{cl?.name || 'Sin cliente'}</p>
                      {showPrices && <p className="text-xs text-gray-400">{fmt(o.total_price as number)}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
                      {isOD ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">Atrasado</span>
                        : isTomorrow ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold">Mañana</span>
                        : <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-bold">{daysLeft}d</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Calendar size={24} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Sin entregas programadas</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity — collapsible */}
      <div className="card p-6">
        <button onClick={() => setActivityOpen(!activityOpen)} className="flex items-center justify-between w-full text-left">
          <h2 className="font-bold text-gray-800">{t('recentActivity')}</h2>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${activityOpen ? '' : '-rotate-90'}`} />
        </button>
        {activityOpen && (
          <div className="mt-4 space-y-0.5">
            {[
              ...presupuestos.slice(0, 8).map(p => ({
                icon: p.origen === 'catalogo_web' ? '🛒' : '📋',
                text: `${p.origen === 'catalogo_web' ? 'Pedido web' : 'Presupuesto'} #${(p.codigo as string || '').slice(0, 8)}`,
                detail: [p.client_name, showPrices && p.total ? fmt(p.total as number) : ''].filter(Boolean).join(' · '),
                date: new Date(p.created_at as string), href: '/presupuesto',
              })),
              ...orders.filter(o => o.status === 'delivered').slice(0, 5).map(o => ({
                icon: '✅', text: `Entregado #${(o.id as string).slice(0, 6).toUpperCase()}`,
                detail: [(o.clients as Record<string, string>)?.name, showPrices ? fmt(o.total_price as number) : ''].filter(Boolean).join(' · '),
                date: new Date(o.created_at as string), href: '/orders',
              })),
              ...payments.slice(0, 5).map(p => ({
                icon: '💰', text: 'Pago registrado',
                detail: showPrices ? fmt(p.monto as number) : '',
                date: new Date(p.fecha as string), href: '/orders',
              })),
            ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8).map((ev, i, arr) => {
              const isToday = ev.date.toDateString() === now.toDateString()
              const isYesterday = ev.date.toDateString() === new Date(now.getTime() - 86400000).toDateString()
              const dayLabel = isToday ? 'HOY' : isYesterday ? 'AYER' : ev.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).toUpperCase()
              const showDayHeader = i === 0 || arr[i - 1].date.toDateString() !== ev.date.toDateString()
              return (
                <div key={i}>
                  {showDayHeader && <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mt-3 mb-1 first:mt-0">{dayLabel}</p>}
                  <Link href={ev.href} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm flex-shrink-0">{ev.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-gray-700">{ev.text}{ev.detail ? <span className="text-gray-400"> · {ev.detail}</span> : ''}</p>
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0">{ev.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </Link>
                </div>
              )
            })}
            {presupuestos.length === 0 && orders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay actividad reciente</p>}
          </div>
        )}
      </div>

      {/* Onboarding checklist */}
      {showOnboarding && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-3">Configurá tu taller</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(onboardingDone / onboardingSteps.length) * 100}%`, background: '#22C55E' }} />
            </div>
            <span className="text-xs font-semibold text-gray-500">{onboardingDone}/{onboardingSteps.length}</span>
          </div>
          <div className="space-y-1">
            {onboardingSteps.map((step, i) => (
              <Link key={i} href={step.href} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${step.done ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-green-100' : 'border-2 border-gray-200'}`}>
                  {step.done && <Check size={11} className="text-green-600" />}
                </div>
                <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{step.label}</span>
                {!step.done && <span className="ml-auto text-xs text-gray-300">→</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
