'use client'

import Link from 'next/link'
import { Calculator, ShoppingBag, Users, Package, Check } from 'lucide-react'
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

// fmt moved to useLocale().fmt

const SL: Record<string, string> = { pending: 'Pendiente', production: 'En producción', ready: 'Listo' }
const SC: Record<string, string> = { pending: '#FDCB6E', production: '#6C5CE7', ready: '#00B894' }

export default function DashboardClient({ shopName, orders, payments, presupuestos, setupCounts, exchangeRate }: Props) {
  const t = useTranslations('dashboard')
  const ts = useTranslations('sidebar')
  const { fmt } = useLocale()
  const { showPrices } = usePermissions()
  const now = new Date()
  const h = now.getHours()
  const greetingKey = h < 12 ? 'goodMorning' : h < 19 ? 'goodAfternoon' : 'goodEvening'
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekFromNow = new Date(today.getTime() + 7 * 86400000)

  const paidMap = new Map<string, number>()
  payments.forEach(p => { const oid = p.order_id as string; paidMap.set(oid, (paidMap.get(oid) || 0) + (p.monto as number || 0)) })
  const paidFor = (oid: string) => paidMap.get(oid) || 0

  const active = orders.filter(o => o.status !== 'delivered')
  const overdue = active.filter(o => o.due_date && new Date(o.due_date as string) < today)
  const thisWeek = active.filter(o => o.due_date && new Date(o.due_date as string) >= today && new Date(o.due_date as string) <= weekFromNow)
  const webPres = presupuestos.filter(p => p.origen === 'catalogo_web')

  const pendingColl = orders.filter(o => (o.total_price as number) - paidFor(o.id as string) > 0 && o.status !== 'delivered')
  const totalPorCobrar = pendingColl.reduce((s, o) => s + ((o.total_price as number) - paidFor(o.id as string)), 0)

  const countBy = { pending: 0, production: 0, ready: 0 }
  active.forEach(o => { const s = o.status as keyof typeof countBy; if (s in countBy) countBy[s]++ })

  const hasAlerts = overdue.length > 0 || webPres.length > 0 || thisWeek.length > 0 || totalPorCobrar > 0

  // Welcome panel for new workshops
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">{t(greetingKey, { name: shopName })} 👋</h1>
      </div>

      {/* Exchange rate widget */}
      {exchangeRate && (
        <Link href="/settings/moneda" className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100 mb-4 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-lg">💱</span>
            <span className="text-sm font-medium text-blue-800">1 {exchangeRate.currency} = {fmt(exchangeRate.value)}</span>
          </div>
          <span className="text-xs text-blue-500">Editar →</span>
        </Link>
      )}

      {/* Alerts */}
      <div className={`rounded-xl p-4 mb-6 ${hasAlerts ? 'bg-amber-50 border border-amber-100' : 'bg-green-50 border border-green-100'}`}>
        {hasAlerts ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {overdue.length > 0 && <Link href="/orders" className="flex items-center gap-2 text-sm"><span className="text-red-500 font-bold">🔴 {overdue.length}</span><span className="text-gray-700">{t('overdueOrders')}</span></Link>}
            {webPres.length > 0 && <Link href="/presupuesto" className="flex items-center gap-2 text-sm"><span className="text-amber-500 font-bold">🟡 {webPres.length}</span><span className="text-gray-700">{t('webQuotes')}</span></Link>}
            {thisWeek.length > 0 && <Link href="/orders" className="flex items-center gap-2 text-sm"><span className="text-blue-500 font-bold">📅 {thisWeek.length}</span><span className="text-gray-700">{t('thisWeek')}</span></Link>}
            {totalPorCobrar > 0 && showPrices && <div className="flex items-center gap-2 text-sm"><span className="text-purple-500 font-bold">💰</span><span className="text-gray-700">{fmt(totalPorCobrar)} {t('toCollect')}</span></div>}
          </div>
        ) : <p className="text-sm text-green-700 font-medium">✅ {t('allClear')}</p>}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { href: '/cotizador', icon: Calculator, label: ts('quoter'), color: '#6C5CE7' },
          { href: '/orders', icon: ShoppingBag, label: ts('orders'), color: '#E17055' },
          { href: '/clients', icon: Users, label: ts('clients'), color: '#00B894' },
          { href: '/catalogo', icon: Package, label: ts('catalog'), color: '#E84393' },
        ].map(a => (
          <Link key={a.href} href={a.href} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}15` }}>
              <a.icon size={20} style={{ color: a.color }} />
            </div>
            <span className="font-semibold text-gray-800 text-sm">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Active orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">{t('activeOrders')}</h2>
            <Link href="/orders" className="text-xs text-purple-600 font-semibold">{t('viewAll')}</Link>
          </div>
          <div className="flex gap-3 mb-3">
            {(['pending', 'production', 'ready'] as const).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: SC[s] }} />
                <span className="text-xs text-gray-500">{SL[s]} ({countBy[s]})</span>
              </div>
            ))}
          </div>
          {active.length > 0 ? (
            <div className="space-y-1">
              {[...active].sort((a, b) => {
                const da = a.due_date ? new Date(a.due_date as string).getTime() : Infinity
                const db = b.due_date ? new Date(b.due_date as string).getTime() : Infinity
                return da - db
              }).slice(0, 5).map(o => {
                const isOD = o.due_date && new Date(o.due_date as string) < today
                const cl = o.clients as Record<string, string> | null
                return (
                  <Link key={o.id as string} href="/orders" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{cl?.name || 'Sin cliente'}</p>
                      {showPrices && <p className="text-xs text-gray-400">{fmt(o.total_price as number)}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!!o.due_date && <span className="text-xs text-gray-400">📅 {new Date(o.due_date as string).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>}
                      {!!isOD && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">{t('overdue')}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : <p className="text-sm text-gray-400 py-4 text-center">No hay pedidos activos</p>}
        </div>

        {/* Pending collections */}
        {showPrices && <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">{t('pendingPayments')}</h2>
            <Link href="/orders" className="text-xs text-purple-600 font-semibold">{t('viewAll')}</Link>
          </div>
          {pendingColl.length > 0 ? (
            <div className="space-y-1">
              {pendingColl.slice(0, 5).map(o => {
                const cl = o.clients as Record<string, string> | null
                const p = paidFor(o.id as string), saldo = (o.total_price as number) - p
                return (
                  <Link key={o.id as string} href="/orders" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{cl?.name || 'Sin cliente'}</p>
                      <p className="text-xs text-gray-400">{fmt(o.total_price as number)} total</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{fmt(saldo)}</p>
                      <p className={`text-[10px] ${p > 0 ? 'text-amber-500' : 'text-red-500'}`}>{p > 0 ? t('depositPaid') : t('noPayments')}</p>
                    </div>
                  </Link>
                )
              })}
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-100">
                <span className="text-xs text-gray-500">{t('totalToCollect')}</span>
                <span className="font-bold text-gray-800">{fmt(totalPorCobrar)}</span>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400 py-4 text-center">No hay cobros pendientes</p>}
        </div>}
      </div>

      {/* Recent activity */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-800 mb-4">{t('recentActivity')}</h2>
        <div className="space-y-2">
          {[
            ...presupuestos.slice(0, 5).map(p => ({
              icon: p.origen === 'catalogo_web' ? '🛒' : '📋',
              text: `${p.origen === 'catalogo_web' ? 'Presupuesto web' : 'Presupuesto'} #${(p.codigo as string || '').slice(0, 12)}`,
              detail: `${p.client_name || 'Sin cliente'}${showPrices ? ` — ${fmt(p.total as number)}` : ''}`,
              date: new Date(p.created_at as string), href: '/presupuesto',
            })),
            ...orders.filter(o => o.status === 'delivered').slice(0, 3).map(o => ({
              icon: '✅', text: 'Pedido entregado',
              detail: `${(o.clients as Record<string, string>)?.name || ''}${showPrices ? ` — ${fmt(o.total_price as number)}` : ''}`,
              date: new Date(o.created_at as string), href: '/orders',
            })),
          ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5).map((ev, i) => {
            const isToday = ev.date.toDateString() === now.toDateString()
            const isYesterday = ev.date.toDateString() === new Date(now.getTime() - 86400000).toDateString()
            const ds = isToday ? 'Hoy' : isYesterday ? 'Ayer' : ev.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
            return (
              <Link key={i} href={ev.href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <span className="text-lg flex-shrink-0">{ev.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{ev.text}</p>
                  <p className="text-xs text-gray-400 truncate">{ev.detail}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{ds}</span>
              </Link>
            )
          })}
          {presupuestos.length === 0 && orders.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay actividad reciente</p>}
        </div>
      </div>
    </div>
  )
}
