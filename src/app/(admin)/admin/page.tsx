'use client'

import { useState, useEffect } from 'react'
import { Users, Clock, CreditCard, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const FLAGS: Record<string, string> = {
  AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', EC: '🇪🇨',
  UY: '🇺🇾', PY: '🇵🇾', BO: '🇧🇴', BR: '🇧🇷', VE: '🇻🇪',
  CR: '🇨🇷', PA: '🇵🇦', GT: '🇬🇹', DO: '🇩🇴',
}

const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina', MX: 'México', CO: 'Colombia', CL: 'Chile', PE: 'Perú',
  EC: 'Ecuador', UY: 'Uruguay', PY: 'Paraguay', BO: 'Bolivia', BR: 'Brasil',
  VE: 'Venezuela', CR: 'Costa Rica', PA: 'Panamá', GT: 'Guatemala', DO: 'Rep. Dominicana',
}

const PLAN_COLORS: Record<string, string> = {
  emprendedor: '#94A3B8', crecimiento: '#6C5CE7', negocio: '#E17055', trial: '#FDCB6E', expired: '#EF4444',
}
const PLAN_LABELS: Record<string, string> = {
  emprendedor: 'Emprendedor (gratis)', crecimiento: 'Crecimiento', negocio: 'Negocio', trial: 'Trial', expired: 'Expirado',
}

const DONUT_COLORS = ['#6C5CE7', '#E17055', '#00B894', '#E84393', '#FDCB6E', '#636e72', '#3498db', '#94A3B8']

interface DashboardData {
  totalTalleres: number
  onboardingCompleted: number
  planCounts: Record<string, number>
  countryCounts: Record<string, number>
  trialsExpiringSoon: number
  trialCount: number
  recentProfiles: Array<{
    id: string; full_name: string; workshop_name: string; email: string
    plan: string; plan_status: string; created_at: string
  }>
  registrationsByDay: Record<string, number>
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin?action=dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
  if (!data) return <div className="text-center py-16 text-gray-400">Error cargando datos</div>

  const paidCount = (data.planCounts['crecimiento'] || 0) + (data.planCounts['negocio'] || 0)

  // Country chart data
  const countryData = Object.entries(data.countryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([code, count]) => ({ name: COUNTRY_NAMES[code] || code, value: count, code }))

  // Plan chart data
  const planData = Object.entries(data.planCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([plan, count]) => ({ plan, count, label: PLAN_LABELS[plan] || plan, color: PLAN_COLORS[plan] || '#94A3B8' }))

  // Registration by month (from recent profiles, simplified)
  const monthCounts: Record<string, number> = {}
  for (const p of data.recentProfiles) {
    const month = new Date(p.created_at).toLocaleDateString('es', { month: 'short' })
    monthCounts[month] = (monthCounts[month] || 0) + 1
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen de la plataforma Estamply</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50"><Users size={16} className="text-purple-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Talleres</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{data.totalTalleres}</p>
          <p className="text-xs text-gray-400 mt-1">{data.onboardingCompleted} completaron onboarding</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50"><CreditCard size={16} className="text-green-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pagos</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{paidCount}</p>
          <p className="text-xs text-gray-400 mt-1">{data.totalTalleres > 0 ? Math.round(paidCount / data.totalTalleres * 100) : 0}% del total</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50"><Clock size={16} className="text-amber-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">En Trial</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{data.trialCount}</p>
          <p className="text-xs text-amber-500 mt-1 font-medium">{data.trialsExpiringSoon} vencen esta semana</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50"><TrendingUp size={16} className="text-blue-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conversion</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{data.onboardingCompleted > 0 ? Math.round(paidCount / data.onboardingCompleted * 100) : 0}%</p>
          <p className="text-xs text-gray-400 mt-1">onboarding → pago</p>
        </div>
      </div>

      {/* Registration chart */}
      {data.registrationsByDay && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Nuevos registros (últimos 30 días)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(data.registrationsByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date: new Date(date).toLocaleDateString('es', { day: '2-digit', month: 'short' }), count }))}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Country distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Talleres por pais</h3>
          {countryData.length > 0 ? (
            <div className="flex gap-6">
              <div className="w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={countryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2}>
                      {countryData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {countryData.map((c, i) => (
                  <div key={c.code} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-gray-600">{FLAGS[c.code] || ''} {c.name}</span>
                    <span className="ml-auto font-semibold text-gray-800">{c.value}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{data.totalTalleres > 0 ? Math.round(c.value / data.totalTalleres * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">Sin datos</p>}
        </div>

        {/* Plan distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Talleres por plan</h3>
          <div className="space-y-3">
            {planData.map(p => (
              <div key={p.plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{p.label}</span>
                  <span className="text-gray-500">{p.count} <span className="text-xs text-gray-400">{data.totalTalleres > 0 ? Math.round(p.count / data.totalTalleres * 100) : 0}%</span></span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${data.totalTalleres > 0 ? (p.count / data.totalTalleres) * 100 : 0}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Funnel de conversion</h3>
        <div className="space-y-2">
          {[
            { label: 'Registrados', value: data.totalTalleres, pct: 100 },
            { label: 'Onboarding OK', value: data.onboardingCompleted, pct: data.totalTalleres > 0 ? Math.round(data.onboardingCompleted / data.totalTalleres * 100) : 0 },
            { label: 'Convirtio a pago', value: paidCount, pct: data.totalTalleres > 0 ? Math.round(paidCount / data.totalTalleres * 100) : 0 },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-32">{step.label}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full flex items-center px-3" style={{ width: `${step.pct}%`, background: '#6C5CE7', minWidth: '2rem' }}>
                  <span className="text-[10px] font-bold text-white">{step.value}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 w-10 text-right">{step.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent registrations */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Actividad reciente</h3>
        <div className="space-y-2">
          {data.recentProfiles.map(p => (
            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#6C5CE7' }}>
                {(p.workshop_name || p.full_name || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.workshop_name || p.full_name}</p>
                <p className="text-xs text-gray-400">{p.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.plan_status === 'trial' ? 'bg-amber-50 text-amber-600' : p.plan_status === 'expired' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                  {PLAN_LABELS[p.plan_status === 'trial' ? 'trial' : p.plan] || p.plan}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleDateString('es')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
