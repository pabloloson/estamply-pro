'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Download } from 'lucide-react'

const FLAGS: Record<string, string> = {
  AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', EC: '🇪🇨',
  UY: '🇺🇾', PY: '🇵🇾', BO: '🇧🇴', BR: '🇧🇷', VE: '🇻🇪',
  CR: '🇨🇷', PA: '🇵🇦', GT: '🇬🇹', DO: '🇩🇴',
}

const PLAN_LABELS: Record<string, string> = {
  emprendedor: 'Emprendedor', crecimiento: 'Crecimiento', negocio: 'Negocio',
}
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  trial: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Trial' },
  active: { bg: 'bg-green-50', text: 'text-green-600', label: 'Activo' },
  expired: { bg: 'bg-red-50', text: 'text-red-500', label: 'Expirado' },
  disabled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Desactivado' },
}

interface Taller {
  id: string; email: string; full_name: string; workshop_name: string
  plan: string; plan_status: string; trial_ends_at: string | null
  onboarding_completed: boolean; created_at: string
  pais: string | null; catalog_slug: string | null
}

export default function TalleresPage() {
  const router = useRouter()
  const [talleres, setTalleres] = useState<Taller[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ action: 'talleres', filter })
    if (search) params.set('search', search)
    fetch(`/api/admin?${params}`)
      .then(r => r.json())
      .then(d => { setTalleres(d.talleres || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])
  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [search])

  function trialDaysLeft(t: Taller): string {
    if (t.plan_status !== 'trial' || !t.trial_ends_at) return ''
    const days = Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days > 0 ? `(${days}d)` : '(exp.)'
  }

  function exportCSV() {
    if (talleres.length === 0) return
    const headers = ['Taller', 'Email', 'Nombre', 'País', 'Plan', 'Estado', 'Trial hasta', 'Onboarding', 'Registrado']
    const rows = talleres.map(t => [
      t.workshop_name || '', t.email, t.full_name || '', t.pais || '',
      t.plan, t.plan_status, t.trial_ends_at || '', t.onboarding_completed ? 'Sí' : 'No',
      new Date(t.created_at).toLocaleDateString('es'),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `estamply-talleres-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const FILTERS = [
    { id: 'all', label: 'Todos' },
    { id: 'trial', label: 'Trial' },
    { id: 'paid', label: 'Pagos' },
    { id: 'free', label: 'Gratis' },
    { id: 'expired', label: 'Expirados' },
  ]

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talleres</h1>
          <p className="text-sm text-gray-500 mt-1">{talleres.length} talleres registrados</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-teal-300"
            placeholder="Buscar taller, email..." />
        </div>
        <button onClick={exportCSV} disabled={talleres.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 flex-shrink-0">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>
        ) : talleres.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No hay talleres</div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {['Taller', 'Email', 'País', 'Plan', 'Estado', 'Registrado'].map(h =>
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
              )}
            </tr></thead>
            <tbody>
              {talleres.map(t => {
                const ss = STATUS_STYLES[t.plan_status] || STATUS_STYLES.active
                return (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/talleres/${t.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#0F766E' }}>
                          {(t.workshop_name || t.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{t.workshop_name || t.full_name || '—'}</p>
                          {!t.onboarding_completed && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500 font-bold">Sin onboarding</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.email}</td>
                    <td className="px-4 py-3 text-sm">{FLAGS[t.pais || ''] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-gray-600">{PLAN_LABELS[t.plan] || t.plan}</span>
                      {t.plan_status === 'trial' && <span className="text-[10px] text-amber-500 ml-1">{trialDaysLeft(t)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ss.bg} ${ss.text}`}>{ss.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('es')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
