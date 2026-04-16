'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Plus, Trash2 } from 'lucide-react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier } from '@/features/presupuesto/types'
import { TECHNIQUE_DEFAULTS, TECNICA_LABELS, ALL_TECNICA_SLUGS, type Tecnica, type TecnicaConfig, type TecnicaSlug, type DTFConfig, type SerigrafiaConfig } from '@/features/taller/types'
import NumericInput from '@/shared/components/NumericInput'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'

interface Operator {
  id: string; name: string; hourly_rate: number; techniques: string[]
  calculation_mode: 'salary' | 'percentage' | 'fixed'
  monthly_salary: number; monthly_hours: number
  percentage: number; percentage_base: 'cost' | 'profit'
  fixed_amount: number
}
function opSummary(op: Operator, fmtCurrency: (n: number) => string): string {
  if (op.calculation_mode === 'salary') return `${fmtCurrency(op.hourly_rate)}/h (sueldo)`
  if (op.calculation_mode === 'percentage') return `${op.percentage}% sobre ${op.percentage_base === 'cost' ? 'precio de venta' : 'ganancia'}`
  return `${fmtCurrency(op.fixed_amount)}/unidad`
}

const TEC_LABELS: Record<string, string> = { subli: 'Subli', dtf: 'DTF', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía' }
const TEC_COLORS: Record<string, string> = { subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E' }

function DiscountTable({ tiers, onChange }: { tiers: DiscountTier[]; onChange: (t: DiscountTier[]) => void }) {
  const up = (i: number, f: keyof DiscountTier, v: number) => onChange(tiers.map((t, j) => j === i ? { ...t, [f]: v } : t))
  return (<div>
    <table className="w-full"><thead><tr className="border-b border-gray-100">
      {['Desde', 'Hasta', 'Desc(%)', ''].map(h => <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">{h}</th>)}
    </tr></thead><tbody>
      {tiers.map((t, i) => (<tr key={i} className="border-b border-gray-50">
        <td className="px-2 py-1"><input type="number" value={t.desde} onChange={e => up(i, 'desde', parseInt(e.target.value) || 0)} className="w-16 input-base text-xs py-0.5" /></td>
        <td className="px-2 py-1"><input type="number" value={t.hasta} onChange={e => up(i, 'hasta', parseInt(e.target.value) || 0)} className="w-16 input-base text-xs py-0.5" /></td>
        <td className="px-2 py-1"><input type="number" min={0} max={100} value={Math.round(t.porcentaje * 100)} onChange={e => up(i, 'porcentaje', (parseFloat(e.target.value) || 0) / 100)} className="w-16 input-base text-xs py-0.5" /></td>
        <td className="px-2 py-1"><button onClick={() => onChange(tiers.filter((_, j) => j !== i))} className="p-0.5 rounded hover:bg-red-50"><Trash2 size={10} className="text-red-400" /></button></td>
      </tr>))}
    </tbody></table>
    <button onClick={() => onChange([...tiers, { desde: (tiers.at(-1)?.hasta ?? 0) + 1, hasta: 9999, porcentaje: 0 }])} className="flex items-center gap-1 text-[10px] px-2 py-0.5 mt-1 rounded font-semibold text-purple-600 hover:bg-purple-50"><Plus size={9} /> Agregar tramo</button>
  </div>)
}

export default function ProduccionPage() {
  const supabase = createClient()
  const t = useTranslations('productionSection')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency } = useLocale()
  const [tecnicas, setTecnicas] = useState<Tecnica[]>([])
  const [operators, setOperators] = useState<Operator[]>([])
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('')
  const [opModal, setOpModal] = useState<Partial<Operator> | null>(null)


  async function load() {
    const [{ data: t }, { data: wsData }, { data: ops }] = await Promise.all([
      supabase.from('tecnicas').select('*'),
      supabase.from('workshop_settings').select('settings').single(),
      supabase.from('operators').select('*').order('name'),
    ])
    let tecs = (t || []) as Tecnica[]
    if (tecs.length === 0) {
      for (const slug of ALL_TECNICA_SLUGS) {
        const def = TECHNIQUE_DEFAULTS[slug]
        await supabase.from('tecnicas').insert({ slug, nombre: def.nombre, color: def.color, config: def.config, equipment_ids: [], insumo_ids: [], activa: def.activa })
      }
      const { data: seeded } = await supabase.from('tecnicas').select('*')
      tecs = (seeded || []) as Tecnica[]
    }
    if (tecs.length === 0) {
      tecs = ALL_TECNICA_SLUGS.map(slug => ({ id: `local-${slug}`, user_id: '', slug, created_at: '', ...TECHNIQUE_DEFAULTS[slug], equipment_ids: [], insumo_ids: [] }))
    }
    setTecnicas(tecs)
    if (!activeTab && tecs.length > 0) setActiveTab(tecs.sort((a, b) => ALL_TECNICA_SLUGS.indexOf(a.slug) - ALL_TECNICA_SLUGS.indexOf(b.slug))[0].id)
    setOperators((ops || []) as Operator[])
    if (wsData?.settings) setWs({ ...DEFAULT_SETTINGS, ...(wsData.settings as Partial<WorkshopSettings>) })
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveSettings(patch: Partial<WorkshopSettings>) {
    const updated = { ...ws, ...patch }
    setWs(updated)
    setSaving('general')
    await supabase.from('workshop_settings').upsert({ id: 1, settings: updated }, { onConflict: 'id' })
    setSaving(null)
  }

  async function saveTecnica(tec: Tecnica) {
    if (tec.id.startsWith('local-')) return; setSaving(tec.id)
    await supabase.from('tecnicas').update({ config: tec.config, activa: tec.activa }).eq('id', tec.id)
    setSaving(null); setSaved(tec.id)
    setTimeout(() => setSaved(s => s === tec.id ? null : s), 2000)
  }

  function updateConfig(tecId: string, patch: Partial<TecnicaConfig>) {
    setTecnicas(prev => prev.map(t => t.id === tecId ? { ...t, config: { ...t.config, ...patch } as TecnicaConfig } : t))
  }
  function toggleActiva(tecId: string) {
    setTecnicas(prev => prev.map(t => t.id === tecId ? { ...t, activa: !t.activa } : t))
  }

  async function saveOperator() {
    if (!opModal?.name) return
    const mode = opModal.calculation_mode || 'salary'
    const mSalary = opModal.monthly_salary || 0
    const mHours = opModal.monthly_hours || 160
    const rate = mode === 'salary' && mHours > 0 ? Math.round(mSalary / mHours) : (opModal.hourly_rate || 0)
    const payload = {
      name: opModal.name, techniques: opModal.techniques || [],
      calculation_mode: mode, hourly_rate: rate,
      monthly_salary: mSalary, monthly_hours: mHours,
      percentage: opModal.percentage || 0, percentage_base: opModal.percentage_base || 'cost',
      fixed_amount: opModal.fixed_amount || 0,
    }
    if (opModal.id) await supabase.from('operators').update(payload).eq('id', opModal.id)
    else await supabase.from('operators').insert(payload)
    setOpModal(null); load()
  }
  async function delOperator(id: string) { if (confirm('¿Eliminar operario?')) { await supabase.from('operators').delete().eq('id', id); load() } }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  const sortedTecs = [...tecnicas].sort((a, b) => ALL_TECNICA_SLUGS.indexOf(a.slug) - ALL_TECNICA_SLUGS.indexOf(b.slug))
  const activeTec = tecnicas.find(t => t.id === activeTab)

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Técnicas</h1>
        <p className="text-gray-500 text-sm mt-1">Configurá las reglas de producción de cada técnica.</p></div>

      {/* Technique tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {sortedTecs.map(tec => (
          <button key={tec.id} onClick={() => setActiveTab(tec.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tec.id === activeTab ? 'text-white shadow-md' : tec.activa ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-300 italic'}`}
            style={tec.id === activeTab ? { background: tec.color } : {}}>
            {tec.nombre}{!tec.activa && <span className="ml-1 text-[9px]">(off)</span>}
          </button>
        ))}
      </div>

      {/* ══ Technique Tabs ══ */}
      {activeTec && (() => {
        const tec = activeTec
        const cfg = tec.config
        const color = tec.color

        return (
          <div className="card overflow-hidden">
            <div className="h-1.5" style={{ background: color }} />
            <div className="p-5 space-y-6">
              {/* Header + active toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: color }}>{tec.nombre[0]}</div>
                  <h2 className="font-bold text-gray-900 text-lg">{tec.nombre}</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-400">{tec.activa ? 'Activa' : 'Inactiva'}</span>
                  <button type="button" onClick={() => toggleActiva(tec.id)}
                    className="relative w-10 h-5 rounded-full transition-colors" style={{ background: tec.activa ? color : '#D1D5DB' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: tec.activa ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </label>
              </div>

              {/* Section 1: Reglas de producción */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">1 &middot; {t('productionRules')}</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-lg">
                  {/* Modo por defecto — all techniques */}
                  <div className="col-span-2 lg:col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Modo por defecto</label>
                    <select className="input-base text-sm max-w-xs" value={(cfg as { modo?: string }).modo || 'propia'}
                      onChange={e => updateConfig(tec.id, { modo: e.target.value as 'tercerizado' | 'propia' })}>
                      <option value="propia">Producción propia</option>
                      <option value="tercerizado">Tercerizado</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-0.5">Si tercerizás esta técnica, el costo se calcula como precio por unidad del proveedor.</p>
                  </div>

                  {/* Margen de seguridad — subli, dtf, vinyl */}
                  {(cfg.tipo === 'subli' || cfg.tipo === 'dtf' || cfg.tipo === 'dtf_uv' || cfg.tipo === 'vinyl') && (
                    <div><label className="block text-xs text-gray-500 mb-1">Margen seguridad (cm)</label>
                      <NumericInput className="input-base text-sm" value={(cfg as { margen_seguridad?: number }).margen_seguridad ?? (cfg.tipo === 'dtf' || cfg.tipo === 'dtf_uv' ? 0.3 : 0.5)}
                        onChange={v => updateConfig(tec.id, { margen_seguridad: v })} />
                      <p className="text-[10px] text-gray-400 mt-0.5">cm extra alrededor del diseño para corte.</p></div>
                  )}

                  {/* Desperdicio / Merma */}
                  <div><label className="block text-xs text-gray-500 mb-1">Desperdicio / Merma (%)</label>
                    <NumericInput className="input-base text-sm"
                      value={cfg.tipo === 'vinyl' ? (cfg.desperdicio_pelado_pct ?? 15) : ((cfg as { desperdicio_pct?: number }).desperdicio_pct ?? 5)}
                      onChange={v => updateConfig(tec.id, cfg.tipo === 'vinyl' ? { desperdicio_pelado_pct: v } : { desperdicio_pct: v })} />
                    <p className="text-[10px] text-gray-400 mt-0.5">% de material que se pierde en el proceso.</p></div>

                  {/* Pedido mínimo */}
                  <div><label className="block text-xs text-gray-500 mb-1">Pedido mínimo</label>
                    <NumericInput className="input-base text-sm" min={1}
                      value={(cfg as { pedido_minimo?: number }).pedido_minimo ?? 1}
                      onChange={v => updateConfig(tec.id, { pedido_minimo: v })} />
                    <p className="text-[10px] text-gray-400 mt-0.5">Cantidad mínima para aceptar un trabajo.</p></div>

                  {/* Tiempo de preparación — all techniques */}
                  {cfg.tipo !== 'serigrafia' && (
                    <div><label className="block text-xs text-gray-500 mb-1">Tiempo preparación (min)</label>
                      <NumericInput className="input-base text-sm"
                        value={(cfg as { tiempo_preparacion?: number }).tiempo_preparacion ?? 0}
                        onChange={v => updateConfig(tec.id, { tiempo_preparacion: v })} />
                      <p className="text-[10px] text-gray-400 mt-0.5">Tiempo fijo antes de producir (calentar plancha, etc.).</p></div>
                  )}

                  {/* Serigrafía-specific fields */}
                  {cfg.tipo === 'serigrafia' && (<>
                    <div><label className="block text-xs text-gray-500 mb-1">Costo pantalla/color ($)</label>
                      <NumericInput className="input-base text-sm"
                        value={(cfg as SerigrafiaConfig).costo_pantalla_por_color ?? 5000}
                        onChange={v => updateConfig(tec.id, { costo_pantalla_por_color: v })} />
                      <p className="text-[10px] text-gray-400 mt-0.5">Costo de cada pantalla de serigrafía por color.</p></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Prep. pantalla (min/color)</label>
                      <NumericInput className="input-base text-sm"
                        value={Math.round(((cfg as SerigrafiaConfig).tiempo_preparacion_por_color ?? 600) / 60)}
                        onChange={v => updateConfig(tec.id, { tiempo_preparacion_por_color: v * 60 })} />
                      <p className="text-[10px] text-gray-400 mt-0.5">Minutos de preparación por cada pantalla/color.</p></div>
                  </>)}
                </div>
              </div>

              {/* Save */}
              <button onClick={() => saveTecnica(tec)} disabled={saving === tec.id || tec.id.startsWith('local-')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-colors ${saved === tec.id ? 'bg-green-500' : ''}`}
                style={saved !== tec.id ? { background: color } : {}}>
                <Save size={14} />{saving === tec.id ? tc('saving') : saved === tec.id ? 'Guardado ✓' : t('saveButton')}
              </button>
            </div>
          </div>
        )
      })()}

      {/* Operator modal */}
      {opModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900">{opModal.id ? 'Editar' : 'Nuevo'} operario</h3>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input className="input-base" value={opModal.name || ''} onChange={e => setOpModal({ ...opModal, name: e.target.value })} /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Técnicas *</label>
              <div className="flex gap-3 flex-wrap">
                {ALL_TECNICA_SLUGS.map(slug => {
                  const checked = (opModal.techniques || []).includes(slug)
                  return (
                    <label key={slug} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={checked} className="rounded border-gray-300"
                        style={{ accentColor: TEC_COLORS[slug] }}
                        onChange={() => setOpModal({ ...opModal, techniques: checked ? (opModal.techniques || []).filter(s => s !== slug) : [...(opModal.techniques || []), slug] })} />
                      <span className="text-sm text-gray-700">{TEC_LABELS[slug]}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Modo de cálculo *</label>
              <select className="input-base" value={opModal.calculation_mode || 'salary'} onChange={e => setOpModal({ ...opModal, calculation_mode: e.target.value as Operator['calculation_mode'] })}>
                <option value="salary">Sueldo fijo</option>
                <option value="percentage">Porcentaje</option>
                <option value="fixed">Monto fijo por unidad</option>
              </select></div>

            {(opModal.calculation_mode || 'salary') === 'salary' && (
              <div className="space-y-3 p-3 rounded-xl bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Sueldo ($)</label>
                    <NumericInput className="input-base" value={opModal.monthly_salary || 0} onChange={v => setOpModal({ ...opModal, monthly_salary: v })} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Horas</label>
                    <NumericInput className="input-base" min={1} value={opModal.monthly_hours || 160} onChange={v => setOpModal({ ...opModal, monthly_hours: v })} /></div>
                </div>
                {(opModal.monthly_hours || 160) > 0 && (opModal.monthly_salary || 0) > 0 && (
                  <p className="text-sm font-medium text-green-600">Costo por hora: {fmtCurrency(Math.round((opModal.monthly_salary || 0) / (opModal.monthly_hours || 160)))}/h</p>
                )}
              </div>
            )}

            {(opModal.calculation_mode) === 'percentage' && (
              <div className="space-y-3 p-3 rounded-xl bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Porcentaje (%)</label>
                    <NumericInput className="input-base" value={opModal.percentage || 0} onChange={v => setOpModal({ ...opModal, percentage: v })} /></div>
                  <div><label className="block text-xs font-medium text-gray-600 mb-1">Aplicar sobre</label>
                    <select className="input-base" value={opModal.percentage_base || 'cost'} onChange={e => setOpModal({ ...opModal, percentage_base: e.target.value as 'cost' | 'profit' })}>
                      <option value="cost">Precio de venta</option>
                      <option value="profit">Ganancia</option>
                    </select></div>
                </div>
              </div>
            )}

            {(opModal.calculation_mode) === 'fixed' && (
              <div className="p-3 rounded-xl bg-gray-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Monto por unidad ($)</label>
                <NumericInput className="input-base" value={opModal.fixed_amount || 0} onChange={v => setOpModal({ ...opModal, fixed_amount: v })} />
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setOpModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
              <button onClick={saveOperator} disabled={!opModal.name?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>{t('saveButton')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
