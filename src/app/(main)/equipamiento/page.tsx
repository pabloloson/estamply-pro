'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

interface Equipment { id: string; name: string; marca: string | null; type: string; clasificacion: string; cost: number; lifespan_uses: number; tecnicas_slugs: string[] }

const CLASIF_LABELS: Record<string, string> = { impresora: 'Impresora', plotter: 'Plotter', plancha: 'Plancha', pulpo: 'Pulpo' }
const CLASIF_COLORS: Record<string, string> = { impresora: '#E17055', plotter: '#00B894', plancha: '#6C5CE7', pulpo: '#FDCB6E' }
const CLASIF_TABS = [
  { id: '', label: 'Todos' },
  { id: 'impresora', label: 'Impresoras', color: '#E17055' },
  { id: 'plotter', label: 'Plotters', color: '#00B894' },
  { id: 'plancha', label: 'Planchas', color: '#6C5CE7' },
  { id: 'pulpo', label: 'Pulpos', color: '#FDCB6E' },
]

const TYPES_BY_CLASIF: Record<string, Array<[string, string]>> = {
  impresora: [['printer_subli', 'Impresora Sublimación'], ['printer_dtf', 'Impresora DTF'], ['printer_uv', 'Impresora UV'], ['printer_other', 'Otra impresora']],
  plotter: [['plotter', 'Plotter de corte'], ['plotter_other', 'Otro plotter']],
  plancha: [['press_flat', 'Plancha Plana'], ['press_mug', 'Plancha Tazas'], ['press_cap', 'Plancha Gorras'], ['press_5in1', 'Plancha 5 en 1'], ['press_pneumatic', 'Plancha Neumática'], ['press_other', 'Otra plancha']],
  pulpo: [['pulpo_manual', 'Pulpo manual'], ['pulpo_auto', 'Pulpo automático'], ['estacion', 'Estación de estampado'], ['pulpo_other', 'Otro']],
}
const ALL_TYPES: Record<string, string> = Object.fromEntries(Object.values(TYPES_BY_CLASIF).flat())

const TEC_LABELS: Record<string, string> = { subli: 'Subli', dtf: 'DTF', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía' }
const TEC_COLORS: Record<string, string> = { subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E' }
const ALL_TECS = ['subli', 'dtf', 'dtf_uv', 'vinyl', 'serigrafia']

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default function EquipamientoPage() {
  const supabase = createClient()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<Partial<Equipment> | null>(null)
  const [filter, setFilter] = useState('')

  async function load() {
    const { data } = await supabase.from('equipment').select('*').order('name')
    setEquipment((data || []) as Equipment[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveEquip() {
    if (!modal?.name) return; setSaving(true)
    const payload = { name: modal.name, marca: modal.marca || null, type: modal.type || 'press_flat', clasificacion: modal.clasificacion || 'plancha', cost: modal.cost || 0, lifespan_uses: modal.lifespan_uses || 1000, tecnicas_slugs: modal.tecnicas_slugs || [] }
    if (modal.id) await supabase.from('equipment').update(payload).eq('id', modal.id)
    else await supabase.from('equipment').insert(payload)
    setModal(null); setSaving(false); load()
  }

  async function delEquip(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('equipment').delete().eq('id', id); load() } }

  const filtered = filter ? equipment.filter(e => e.clasificacion === filter) : equipment
  const amort = (e: Equipment) => e.lifespan_uses > 0 ? Math.round(e.cost / e.lifespan_uses) : 0
  const modalAmort = modal && (modal.lifespan_uses || 0) > 0 ? Math.round((modal.cost || 0) / (modal.lifespan_uses || 1)) : 0
  const modalTypes = TYPES_BY_CLASIF[modal?.clasificacion || 'plancha'] || TYPES_BY_CLASIF.plancha

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Equipamiento</h1>
          <p className="text-gray-500 text-sm mt-1">Máquinas y amortización</p></div>
        <button onClick={() => setModal({ clasificacion: 'plancha', type: 'press_flat', cost: 0, lifespan_uses: 10000, tecnicas_slugs: [] })}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}>
          <Plus size={14} /> Agregar equipo
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {CLASIF_TABS.map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === tab.id ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
            style={filter === tab.id ? { background: tab.color || '#374151' } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {['Nombre', 'Clasificación', 'Tipo', 'Técnicas', 'Valor', 'Vida útil', '$/uso', ''].map(h =>
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{e.name}</span>
                    {e.marca && <span className="text-xs text-gray-400 ml-1.5">{e.marca}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: CLASIF_COLORS[e.clasificacion] || '#636e72' }}>
                      {CLASIF_LABELS[e.clasificacion] || e.clasificacion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{ALL_TYPES[e.type] || e.type}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(e.tecnicas_slugs || []).map(s => (
                        <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${TEC_COLORS[s] || '#999'}18`, color: TEC_COLORS[s] || '#999' }}>
                          {TEC_LABELS[s] || s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmt(e.cost)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.lifespan_uses.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-semibold">{fmt(amort(e))}/uso</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal(e)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={() => delEquip(e.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">{filter ? 'Sin equipos en esta categoría.' : 'No hay equipos. Agregá el primero.'}</div>}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar' : 'Nuevo'} Equipo</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={modal.name || ''} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="Ej: Impresora Epson EcoTank" /></div>

              <div><label className="block text-sm font-medium text-gray-700 mb-1">Marca / Modelo</label>
                <input className="input-base" value={modal.marca || ''} onChange={e => setModal({ ...modal, marca: e.target.value })} placeholder="Ej: Epson L8050" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Clasificación *</label>
                  <select className="input-base" value={modal.clasificacion || 'plancha'} onChange={e => {
                    const cl = e.target.value
                    const firstType = (TYPES_BY_CLASIF[cl] || [])[0]?.[0] || ''
                    setModal({ ...modal, clasificacion: cl, type: firstType })
                  }}>
                    {Object.entries(CLASIF_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select className="input-base" value={modal.type || ''} onChange={e => setModal({ ...modal, type: e.target.value })}>
                    {modalTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Técnicas que lo usan *</label>
                <div className="flex gap-3 flex-wrap">
                  {ALL_TECS.map(slug => {
                    const checked = (modal.tecnicas_slugs || []).includes(slug)
                    return (
                      <label key={slug} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={checked} className="rounded border-gray-300"
                          style={{ accentColor: TEC_COLORS[slug] }}
                          onChange={() => setModal({ ...modal, tecnicas_slugs: checked ? (modal.tecnicas_slugs || []).filter(s => s !== slug) : [...(modal.tecnicas_slugs || []), slug] })} />
                        <span className="text-sm text-gray-700">{TEC_LABELS[slug]}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor de compra ($) *</label>
                  <input type="number" className="input-base" value={modal.cost || 0} onChange={e => setModal({ ...modal, cost: parseFloat(e.target.value) || 0 })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Vida útil (usos) *</label>
                  <input type="number" className="input-base" value={modal.lifespan_uses || 10000} onChange={e => setModal({ ...modal, lifespan_uses: parseInt(e.target.value) || 1 })} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Usos estimados antes de reemplazar</p></div>
              </div>

              {modalAmort > 0 && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
                  <p className="text-xs text-gray-500">Amortización</p>
                  <p className="text-lg font-black text-green-600">{fmt(modalAmort)} <span className="text-sm font-medium">por uso</span></p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveEquip} disabled={saving || !modal.name?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
