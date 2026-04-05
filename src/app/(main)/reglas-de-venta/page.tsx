'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save } from 'lucide-react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier } from '@/features/presupuesto/types'
import type { Category } from '@/features/taller/types'

function DiscountTable({ title, tiers, onChange }: { title: string; tiers: DiscountTier[]; onChange: (t: DiscountTier[]) => void }) {
  const update = (i: number, field: keyof DiscountTier, val: number) => onChange(tiers.map((t, j) => j === i ? { ...t, [field]: val } : t))
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <button onClick={() => onChange([...tiers, { desde: 0, hasta: 9999, porcentaje: 0 }])} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}><Plus size={12} /> Fila</button>
      </div>
      <table className="w-full"><thead><tr className="border-b border-gray-100">
        {['Desde', 'Hasta', 'Desc (%)', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">{h}</th>)}
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
      {tiers.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Sin reglas</p>}
    </div>
  )
}

export default function ReglasDeVentaPage() {
  const supabase = createClient()
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: wsData }, { data: cats }] = await Promise.all([
        supabase.from('workshop_settings').select('settings').single(),
        supabase.from('categories').select('*').order('name'),
      ])
      if (wsData?.settings) setWs({ ...DEFAULT_SETTINGS, ...(wsData.settings as Partial<WorkshopSettings>) })
      setCategories(cats || []); setLoading(false)
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
  const globalEnabled = ws.descuento_global_enabled ?? false

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Reglas de Venta</h1>
        <p className="text-gray-500 text-sm mt-1">Márgenes por categoría, descuentos y mano de obra</p></div>

      <div className="space-y-6">
        {/* Margins by category */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Márgenes por Categoría</h2>
          {categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium text-gray-700">{c.name}</span>
                  <span className="text-sm font-bold" style={{ color: '#6C5CE7' }}>{c.margen_sugerido}%</span>
                </div>
              ))}
              <p className="text-xs text-gray-400">Editá los márgenes desde Catálogo &gt; Categorías</p>
            </div>
          ) : <p className="text-sm text-gray-400">No hay categorías. Crealas en Catálogo de Productos.</p>}
        </div>

        {/* Discounts */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <button type="button" onClick={() => setWs({ ...ws, descuento_global_enabled: !globalEnabled })}
              className="relative w-11 h-6 rounded-full transition-colors" style={{ background: globalEnabled ? '#6C5CE7' : '#D1D5DB' }}>
              <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: globalEnabled ? 'translateX(20px)' : 'translateX(0)' }} />
            </button>
            <span className="text-sm font-semibold text-gray-700">Tabla de descuentos única para todas las técnicas</span>
          </div>
          {globalEnabled ? (
            <DiscountTable title="Descuentos Globales" tiers={ws.descuentos_global ?? []} onChange={tiers => setWs({ ...ws, descuentos_global: tiers })} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <DiscountTable title="Sublimación" tiers={ws.descuentos_subli} onChange={tiers => setWs({ ...ws, descuentos_subli: tiers })} />
              <DiscountTable title="DTF" tiers={ws.descuentos_dtf} onChange={tiers => setWs({ ...ws, descuentos_dtf: tiers })} />
              <DiscountTable title="Vinilo" tiers={ws.descuentos_vinyl} onChange={tiers => setWs({ ...ws, descuentos_vinyl: tiers })} />
            </div>
          )}
        </div>

        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
          <Save size={15} />{saving ? 'Guardando...' : 'Guardar reglas'}
        </button>
      </div>
    </div>
  )
}
