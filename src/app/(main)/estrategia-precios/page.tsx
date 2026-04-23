// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { Plus, Trash2, Save } from 'lucide-react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier } from '@/features/presupuesto/types'

function DiscountTable({ title, tiers, onChange }: { title: string; tiers: DiscountTier[]; onChange: (t: DiscountTier[]) => void }) {
  const update = (i: number, field: keyof DiscountTier, val: number) => onChange(tiers.map((t, j) => j === i ? { ...t, [field]: val } : t))
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <button onClick={() => onChange([...tiers, { desde: 0, hasta: 9999, porcentaje: 0 }])} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#0F766E' }}><Plus size={12} /> Fila</button>
      </div>
      <table className="w-full"><thead><tr className="border-b border-gray-100">
        {['Desde (u)', 'Hasta (u)', 'Descuento (%)', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">{h}</th>)}
      </tr></thead><tbody>
        {tiers.map((t, i) => (
          <tr key={i} className="border-b border-gray-50">
            <td className="px-4 py-2"><input type="number" value={t.desde} onChange={e => update(i, 'desde', parseInt(e.target.value) || 0)} className="w-20 input-base text-sm py-1.5" /></td>
            <td className="px-4 py-2"><input type="number" value={t.hasta} onChange={e => update(i, 'hasta', parseInt(e.target.value) || 0)} className="w-20 input-base text-sm py-1.5" /></td>
            <td className="px-4 py-2"><input type="number" min={0} max={100} value={Math.round(t.porcentaje * 100)} onChange={e => update(i, 'porcentaje', (parseFloat(e.target.value) || 0) / 100)} className="w-20 input-base text-sm py-1.5" /></td>
            <td className="px-4 py-2"><button onClick={() => onChange(tiers.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button></td>
          </tr>
        ))}
      </tbody></table>
      {tiers.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Sin reglas. Agregá una fila.</p>}
    </div>
  )
}

export default function EstrategiaPreciosPage() {
  const supabase = createClient()
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('workshop_settings').select('settings').single()
      if (data?.settings) setWs({ ...DEFAULT_SETTINGS, ...(data.settings as Partial<WorkshopSettings>) })
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    const { data: existing } = await supabase.from('workshop_settings').select('id').single()
    if (existing) await supabase.from('workshop_settings').update({ settings: ws }).eq('id', existing.id)
    else await supabase.from('workshop_settings').insert({ settings: ws })
    setSaving(false); alert('Guardado ✓')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>

  const globalEnabled = ws.descuento_global_enabled ?? false

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estrategia de Precios</h1>
        <p className="text-gray-500 text-sm mt-1">Márgenes y descuentos por volumen</p>
      </div>

      <div className="space-y-6">
        {/* Default margin */}
        <div className="card p-5 max-w-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Margen de ganancia sugerido (%)</label>
          <input type="number" className="input-base" min={0} value={ws.margen_sugerido ?? 50}
            onChange={e => setWs({ ...ws, margen_sugerido: Number(e.target.value) })} />
          <p className="text-xs text-gray-400 mt-1.5">Se usará como valor inicial en el Cotizador</p>
        </div>

        {/* Global discount toggle */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <button type="button" onClick={() => setWs({ ...ws, descuento_global_enabled: !globalEnabled })}
              className="relative w-11 h-6 rounded-full transition-colors" style={{ background: globalEnabled ? '#0F766E' : '#D1D5DB' }}>
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: globalEnabled ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
            <span className="text-sm font-semibold text-gray-700">Aplicar misma tabla de descuentos a todas las técnicas</span>
          </div>

          {globalEnabled ? (
            <div>
              <DiscountTable title="Descuentos Globales" tiers={ws.descuentos_global ?? []}
                onChange={tiers => setWs({ ...ws, descuentos_global: tiers })} />
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">Escalas de descuento individuales por técnica.</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <DiscountTable title="Sublimación" tiers={ws.descuentos_subli} onChange={tiers => setWs({ ...ws, descuentos_subli: tiers })} />
                <DiscountTable title="DTF" tiers={ws.descuentos_dtf} onChange={tiers => setWs({ ...ws, descuentos_dtf: tiers })} />
                <DiscountTable title="Vinilo" tiers={ws.descuentos_vinyl} onChange={tiers => setWs({ ...ws, descuentos_vinyl: tiers })} />
              </div>
            </div>
          )}
        </div>

        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0F766E' }}>
          <Save size={15} />{saving ? 'Guardando...' : 'Guardar estrategia'}
        </button>
      </div>
    </div>
  )
}
