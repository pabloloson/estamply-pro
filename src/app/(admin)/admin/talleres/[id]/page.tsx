'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Users, ShoppingBag, FileText, Package, Clock, ChevronDown } from 'lucide-react'

const FLAGS: Record<string, string> = {
  AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', EC: '🇪🇨',
  UY: '🇺🇾', PY: '🇵🇾', BO: '🇧🇴', BR: '🇧🇷', VE: '🇻🇪',
}
const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina', MX: 'México', CO: 'Colombia', CL: 'Chile', PE: 'Perú',
  EC: 'Ecuador', UY: 'Uruguay', PY: 'Paraguay', BO: 'Bolivia', BR: 'Brasil', VE: 'Venezuela',
}
const PLAN_LABELS: Record<string, string> = {
  emprendedor: 'Emprendedor', crecimiento: 'Crecimiento', negocio: 'Negocio',
}

interface TallerDetail {
  profile: {
    id: string; email: string; full_name: string; workshop_name: string
    business_name: string; business_phone: string; business_email: string
    plan: string; plan_status: string; trial_ends_at: string | null
    onboarding_completed: boolean; created_at: string
  }
  settings: Record<string, unknown>
  orderCount: number
  orders: Array<{ id: string; total_price: number; status: string; created_at: string }>
  presupuestoCount: number
  clientCount: number
  productCount: number
  teamMembers: Array<{ id: string; nombre: string; email: string; rol: string; estado: string }>
}

export default function TallerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tallerId = params.id as string

  const [data, setData] = useState<TallerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPlanDropdown, setShowPlanDropdown] = useState(false)

  function load() {
    fetch(`/api/admin?action=taller-detail&id=${tallerId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [tallerId])

  async function doAction(action: string, extraParams: Record<string, unknown> = {}) {
    setActionLoading(true)
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, tallerId, ...extraParams }),
    })
    load()
    setActionLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>
  if (!data?.profile) return <div className="text-center py-16 text-gray-400">Taller no encontrado</div>

  const p = data.profile
  const pais = (data.settings?.pais as string) || ''
  const trialDays = p.trial_ends_at ? Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0
  const totalRevenue = data.orders.reduce((s, o) => s + (o.total_price || 0), 0)

  return (
    <div>
      <button onClick={() => router.push('/admin/talleres')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft size={14} /> Volver
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white" style={{ background: '#0F766E' }}>
              {(p.workshop_name || p.full_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{p.workshop_name || p.full_name}</h1>
              <p className="text-sm text-gray-500">
                {FLAGS[pais]} {COUNTRY_NAMES[pais] || pais} · {p.full_name} · {p.email}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Plan: <span className="font-semibold text-gray-600">{PLAN_LABELS[p.plan] || p.plan}</span>
                {p.plan_status === 'trial' && <span className="text-amber-500 ml-1">· Trial ({trialDays > 0 ? `${trialDays} días` : 'expirado'})</span>}
                {p.plan_status === 'expired' && <span className="text-red-500 ml-1">· Expirado</span>}
                · Desde: {new Date(p.created_at).toLocaleDateString('es')}
              </p>
            </div>
          </div>

          {/* Plan dropdown */}
          <div className="relative">
            <button onClick={() => setShowPlanDropdown(!showPlanDropdown)} disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              Cambiar plan <ChevronDown size={12} />
            </button>
            {showPlanDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[160px]">
                {['emprendedor', 'crecimiento', 'negocio'].map(plan => (
                  <button key={plan} onClick={() => { doAction('change-plan', { plan }); setShowPlanDropdown(false) }}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${p.plan === plan ? 'font-bold text-teal-700' : 'text-gray-700'}`}>
                    {PLAN_LABELS[plan]} {p.plan === plan && '✓'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { icon: Package, label: 'Productos', value: data.productCount, color: '#0F766E' },
          { icon: ShoppingBag, label: 'Pedidos', value: data.orderCount, color: '#E17055' },
          { icon: Users, label: 'Clientes', value: data.clientCount, color: '#00B894' },
          { icon: FileText, label: 'Presupuestos', value: data.presupuestoCount, color: '#E84393' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <m.icon size={14} style={{ color: m.color }} />
              <span className="text-xs text-gray-400 font-semibold">{m.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent orders */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Últimos pedidos</h3>
          {data.orders.length > 0 ? (
            <div className="space-y-2">
              {data.orders.map(o => (
                <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-700">#{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString('es')}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">${Math.round(o.total_price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Sin pedidos</p>}
        </div>

        {/* Team + actions */}
        <div className="space-y-4">
          {/* Team */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Usuarios del taller</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 py-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#0F766E' }}>{(p.full_name || '?')[0]}</div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{p.full_name} <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold ml-1">Dueño</span></p>
                  <p className="text-xs text-gray-400">{p.email}</p>
                </div>
              </div>
              {data.teamMembers.map(tm => (
                <div key={tm.id} className="flex items-center gap-2 py-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-200 text-gray-600">{tm.nombre[0]}</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{tm.nombre} <span className="text-[10px] text-gray-400">{tm.rol}</span></p>
                    <p className="text-xs text-gray-400">{tm.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Acciones</h3>
            <div className="space-y-2">
              {p.plan_status === 'trial' || p.plan_status === 'expired' ? (
                <div className="flex gap-2">
                  <button onClick={() => doAction('extend-trial', { days: 7 })} disabled={actionLoading}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50">+7 días trial</button>
                  <button onClick={() => doAction('extend-trial', { days: 14 })} disabled={actionLoading}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50">+14 días trial</button>
                  <button onClick={() => doAction('extend-trial', { days: 30 })} disabled={actionLoading}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50">+30 días trial</button>
                </div>
              ) : null}
              <a href={`mailto:${p.email}`} target="_blank" rel="noopener noreferrer"
                className="w-full py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 text-center block">
                Enviar email al dueño
              </a>
              <button onClick={() => doAction('toggle-active', { active: p.plan_status === 'disabled' })} disabled={actionLoading}
                className={`w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${p.plan_status === 'disabled' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                {p.plan_status === 'disabled' ? 'Reactivar taller' : 'Desactivar taller'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
