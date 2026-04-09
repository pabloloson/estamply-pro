'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, FolderOpen } from 'lucide-react'
import type { Category, Insumo, InsumoTipo, InsumoConfig } from '@/features/taller/types'
import CategoryModal from '@/features/taller/components/CategoryModal'
import NumericInput from '@/shared/components/NumericInput'

interface Product {
  id: string; name: string; base_cost: number; category_id: string | null
  time_subli: number; time_dtf: number; time_vinyl: number
  press_equipment_id: string | null; printer_equipment_id: string | null
}
interface Equipment { id: string; name: string; type: string }

const TIPO_LABELS: Record<InsumoTipo, string> = {
  papel: 'Papel', tinta: 'Tinta', film: 'Film', polvo: 'Polvo', vinilo: 'Vinilo',
  tinta_serigrafica: 'Tinta serigráfica', servicio_impresion: 'Servicio impresión', emulsion: 'Emulsión', otro: 'Otro',
}
const TIPO_COLORS: Record<InsumoTipo, string> = {
  papel: '#6C5CE7', tinta: '#00B894', film: '#E17055', polvo: '#FDCB6E', vinilo: '#E84393',
  tinta_serigrafica: '#e67e22', servicio_impresion: '#3498db', emulsion: '#9b59b6', otro: '#636e72',
}
const TECNICA_FILTER_TABS = [
  { id: '', label: 'Todos' },
  { id: 'subli', label: 'Sublimación', color: '#6C5CE7' },
  { id: 'dtf', label: 'DTF', color: '#E17055' },
  { id: 'vinyl', label: 'Vinilo', color: '#E84393' },
  { id: 'serigrafia', label: 'Serigrafía', color: '#FDCB6E' },
]
const TECNICA_OPTS: [string, string][] = [['compartido', 'Compartido'], ['subli', 'Sublimación'], ['dtf', 'DTF Textil'], ['dtf_uv', 'DTF UV'], ['vinyl', 'Vinilo'], ['serigrafia', 'Serigrafía']]
const TIPO_TECNICA_DEFAULT: Partial<Record<InsumoTipo, string>> = {
  papel: 'subli', tinta: 'subli', film: 'dtf', polvo: 'dtf', vinilo: 'vinyl',
  tinta_serigrafica: 'serigrafia', emulsion: 'serigrafia', servicio_impresion: 'compartido',
}

function emptyConfig(tipo: InsumoTipo): InsumoConfig {
  switch (tipo) {
    case 'papel': return { tipo: 'papel', formato: 'hojas', precio_resma: 0, hojas_resma: 100, ancho: 21, alto: 29.7, precio_rollo: 0, rollo_ancho: 61, rollo_largo: 100 }
    case 'tinta': return { tipo: 'tinta', precio: 0, rendimiento: 4000, unidad_rendimiento: 'hojas' }
    case 'film': return { tipo: 'film', precio_rollo: 0, ancho: 60, largo: 100 }
    case 'polvo': return { tipo: 'polvo', precio_kg: 0, rendimiento_m2: 50 }
    case 'vinilo': return { tipo: 'vinilo', aplicacion: 'textil', acabado: 'Liso', precio_metro: 0, ancho: 50, colores: ['Blanco', 'Negro'] }
    case 'tinta_serigrafica': return { tipo: 'tinta_serigrafica', precio_kg: 0, rendimiento_estampadas_kg: 100, color: '' }
    case 'servicio_impresion': return { tipo: 'servicio_impresion', precio_metro: 0, ancho_material: 60, proveedor: '' }
    case 'emulsion': return { tipo: 'emulsion', precio_kg: 0, rendimiento_pantallas_kg: 20 }
    case 'otro': return { tipo: 'otro', precio: 0, unidad: 'metro', rendimiento: 1, unidad_rendimiento: 'm²' }
  }
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default function MaterialesPage() {
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [tab, setTab] = useState<'base' | 'insumos'>(searchParams.get('tab') === 'insumos' ? 'insumos' : 'base')
  const [products, setProducts] = useState<Product[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<Partial<Product> | null>(null)
  const [insModal, setInsModal] = useState<Partial<Insumo> | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [filterTecnica, setFilterTecnica] = useState('')

  async function load() {
    const [{ data: p }, { data: e }, { data: c }, { data: ins }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('equipment').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('insumos').select('*').order('nombre'),
    ])
    setProducts(p || []); setEquipment(e || []); setCategories(c || []); setInsumos((ins || []) as Insumo[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const presses = equipment.filter(e => e.type.startsWith('press'))
  const printersList = equipment.filter(e => e.type.startsWith('printer') || e.type === 'plotter')

  // ── Base product CRUD ──
  async function saveProduct() {
    if (!modal?.name) return; setSaving(true)
    const payload = {
      name: modal.name, base_cost: modal.base_cost || 0, category_id: modal.category_id || null,
      time_subli: modal.time_subli || 0, time_dtf: modal.time_dtf || 0, time_vinyl: modal.time_vinyl || 0,
      press_equipment_id: modal.press_equipment_id || null, printer_equipment_id: modal.printer_equipment_id || null,
    }
    if (modal.id) await supabase.from('products').update(payload).eq('id', modal.id)
    else await supabase.from('products').insert(payload)
    setModal(null); setSaving(false); load()
  }
  async function deleteProduct(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('products').delete().eq('id', id); load() } }

  // ── Insumo CRUD (with auto-vinculation) ──
  async function saveInsumo() {
    if (!insModal?.nombre) return; setSaving(true)
    const payload = { nombre: insModal.nombre, tipo: insModal.tipo || 'otro', tecnica_asociada: insModal.tecnica_asociada || 'compartido', config: insModal.config || emptyConfig('otro') }
    const tecAsociada = payload.tecnica_asociada
    if (insModal.id) {
      const oldInsumo = insumos.find(i => i.id === insModal.id)
      const oldTec = oldInsumo?.tecnica_asociada
      await supabase.from('insumos').update(payload).eq('id', insModal.id)
      if (oldTec && oldTec !== tecAsociada && oldTec !== 'compartido') {
        const { data: oldTecRow } = await supabase.from('tecnicas').select('id, insumo_ids').eq('slug', oldTec).single()
        if (oldTecRow) await supabase.from('tecnicas').update({ insumo_ids: (oldTecRow.insumo_ids || []).filter((id: string) => id !== insModal.id) }).eq('id', oldTecRow.id)
      }
      if (tecAsociada !== 'compartido') {
        const { data: newTecRow } = await supabase.from('tecnicas').select('id, insumo_ids').eq('slug', tecAsociada).single()
        if (newTecRow && !(newTecRow.insumo_ids || []).includes(insModal.id)) await supabase.from('tecnicas').update({ insumo_ids: [...(newTecRow.insumo_ids || []), insModal.id] }).eq('id', newTecRow.id)
      }
    } else {
      const { data: inserted } = await supabase.from('insumos').insert(payload).select('id').single()
      if (inserted && tecAsociada !== 'compartido') {
        const { data: tecRow } = await supabase.from('tecnicas').select('id, insumo_ids').eq('slug', tecAsociada).single()
        if (tecRow) await supabase.from('tecnicas').update({ insumo_ids: [...(tecRow.insumo_ids || []), inserted.id] }).eq('id', tecRow.id)
      }
    }
    setInsModal(null); setSaving(false); load()
  }
  async function deleteInsumo(id: string) {
    if (!confirm('¿Eliminar?')) return
    const { data: allTecs } = await supabase.from('tecnicas').select('id, insumo_ids')
    if (allTecs) for (const tec of allTecs) { if ((tec.insumo_ids || []).includes(id)) await supabase.from('tecnicas').update({ insumo_ids: (tec.insumo_ids || []).filter((iid: string) => iid !== id) }).eq('id', tec.id) }
    await supabase.from('insumos').delete().eq('id', id); load()
  }
  function openNewInsumo(tipo: InsumoTipo = 'otro') {
    setInsModal({ nombre: '', tipo, tecnica_asociada: TIPO_TECNICA_DEFAULT[tipo] || 'compartido', config: emptyConfig(tipo) })
  }
  function changeTipo(tipo: InsumoTipo) {
    setInsModal(prev => prev ? { ...prev, tipo, tecnica_asociada: TIPO_TECNICA_DEFAULT[tipo] || prev.tecnica_asociada || 'compartido', config: emptyConfig(tipo) } : null)
  }
  function up(patch: Record<string, unknown>) {
    if (!insModal) return
    setInsModal({ ...insModal, config: { ...(insModal.config as Record<string, unknown>), ...patch } as InsumoConfig })
  }

  // Categories
  async function saveCat(cat: Partial<Category>) {
    if (cat.id) await supabase.from('categories').update({ name: cat.name, margen_sugerido: cat.margen_sugerido }).eq('id', cat.id)
    else await supabase.from('categories').insert({ name: cat.name, margen_sugerido: cat.margen_sugerido })
    load()
  }
  async function deleteCat(id: string) { await supabase.from('categories').delete().eq('id', id); load() }

  const filteredInsumos = filterTecnica
    ? insumos.filter(i => i.tecnica_asociada === filterTecnica || (filterTecnica === 'dtf' && (i.tecnica_asociada === 'dtf' || i.tecnica_asociada === 'dtf_uv')) || i.tecnica_asociada === 'compartido')
    : insumos

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Materiales</h1>
          <p className="text-gray-500 text-sm mt-1">Todo lo que comprás para producir</p></div>
        <button onClick={() => setShowCats(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
          <FolderOpen size={14} /> Categorías
        </button>
      </div>

      <div className="flex gap-1 mb-6">
        <button onClick={() => setTab('base')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'base' ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>Productos base</button>
        <button onClick={() => setTab('insumos')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'insumos' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`} style={tab === 'insumos' ? { background: '#00B894' } : {}}>Insumos</button>
      </div>

      {/* ══ PRODUCTOS BASE ══ */}
      {tab === 'base' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div><span className="font-semibold text-gray-800">Productos base</span><p className="text-xs text-gray-400 mt-0.5">Prendas, tazas, blanks y soportes</p></div>
            <button onClick={() => setModal({ time_subli: 0, time_dtf: 0, time_vinyl: 0, base_cost: 0 } as Partial<Product>)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}><Plus size={14} /> Agregar</button>
          </div>
          <table className="w-full"><thead><tr className="border-b border-gray-100">
            {['Nombre', 'Costo', 'Categoría', 'Plancha', 'Impresora', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
          </tr></thead><tbody>
            {products.map(p => {
              const cat = categories.find(c => c.id === p.category_id)
              const press = equipment.find(e => e.id === p.press_equipment_id)
              const printer = equipment.find(e => e.id === p.printer_equipment_id)
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(p.base_cost)}</td>
                  <td className="px-4 py-3">{cat ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-600">{cat.name}</span> : <span className="text-xs text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{press?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{printer?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => setModal(p as Partial<Product>)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                  </div></td>
                </tr>
              )
            })}
          </tbody></table>
          {products.length === 0 && <div className="text-center py-12 text-gray-400">No hay productos base.</div>}
        </div>
      )}

      {/* ══ INSUMOS ══ */}
      {tab === 'insumos' && (<>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {TECNICA_FILTER_TABS.map(t => (
              <button key={t.id} onClick={() => setFilterTecnica(t.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterTecnica === t.id ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
                style={filterTecnica === t.id ? { background: t.color || '#374151' } : {}}>{t.label}</button>
            ))}
          </div>
          <button onClick={() => openNewInsumo()} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#00B894' }}><Plus size={14} /> Agregar</button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-100">
            {['Nombre', 'Tipo', 'Técnica', 'Datos clave', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
          </tr></thead><tbody>
            {filteredInsumos.map(ins => {
              const c = ins.config as Record<string, unknown>
              const tipo = ins.tipo as InsumoTipo
              let keyData = ''
              if (tipo === 'papel') keyData = c.formato === 'hojas' ? `${fmt(c.precio_resma as number || 0)} / ${c.hojas_resma} hojas · ${c.ancho}×${c.alto} cm` : `${fmt(c.precio_rollo as number || 0)} / ${c.rollo_ancho}cm × ${c.rollo_largo || '?'}m`
              else if (tipo === 'tinta') keyData = `${fmt(c.precio as number || 0)} — ${c.rendimiento} ${c.unidad_rendimiento || 'hojas'}`
              else if (tipo === 'film') keyData = `${fmt(c.precio_rollo as number || 0)} / ${c.ancho || '?'}cm × ${c.largo || '?'}m`
              else if (tipo === 'polvo') keyData = `${fmt(c.precio_kg as number || 0)}/kg — ${c.rendimiento_m2} m²/kg`
              else if (tipo === 'vinilo') keyData = `${fmt(c.precio_metro as number || 0)}/m — ${c.ancho}cm`
              else if (tipo === 'tinta_serigrafica') keyData = `${fmt(c.precio_kg as number || 0)}/kg — ${c.color || '?'}`
              else if (tipo === 'servicio_impresion') keyData = `${fmt(c.precio_metro as number || 0)}/m — ${c.ancho_material}cm`
              else keyData = `${fmt(c.precio as number || c.precio_kg as number || 0)}`
              return (
                <tr key={ins.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{ins.nombre}</td>
                  <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: TIPO_COLORS[tipo] || '#636e72' }}>{TIPO_LABELS[tipo] || tipo}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{TECNICA_OPTS.find(o => o[0] === ins.tecnica_asociada)?.[1] || ins.tecnica_asociada}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{keyData}</td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={() => setInsModal(ins)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                    <button onClick={() => deleteInsumo(ins.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                  </div></td>
                </tr>
              )
            })}
          </tbody></table>
          {filteredInsumos.length === 0 && <div className="text-center py-12 text-gray-400">No hay insumos{filterTecnica ? ' para esta técnica' : ''}.</div>}
        </div>
      </>)}

      {/* ── Base Product Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar' : 'Nuevo'} Producto base</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={modal.name || ''} onChange={e => setModal({ ...modal, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Costo base ($)</label>
                  <NumericInput className="input-base" value={modal.base_cost || 0} onChange={v => setModal({ ...modal, base_cost: v })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select className="input-base" value={modal.category_id || ''} onChange={e => setModal({ ...modal, category_id: e.target.value || null })}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Plancha</label>
                  <select className="input-base" value={modal.press_equipment_id || ''} onChange={e => setModal({ ...modal, press_equipment_id: e.target.value || null })}>
                    <option value="">Sin plancha</option>
                    {presses.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Impresora</label>
                  <select className="input-base" value={modal.printer_equipment_id || ''} onChange={e => setModal({ ...modal, printer_equipment_id: e.target.value || null })}>
                    <option value="">Sin impresora</option>
                    {printersList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-sm font-semibold text-gray-600 mb-2">Tiempos de planchado (seg/unidad)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['time_subli', 'Subli', '#6C5CE7'], ['time_dtf', 'DTF', '#E17055'], ['time_vinyl', 'Vinilo', '#E84393']].map(([k, l, c]) => (
                    <div key={k}><label className="block text-xs font-medium mb-1" style={{ color: c as string }}>{l as string}</label>
                      <NumericInput className="input-base text-center" value={(modal as Record<string, number>)[k as string] || 0} onChange={v => setModal({ ...modal, [k as string]: v })} /></div>
                  ))}
                </div></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveProduct} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Insumo Modal (full form) ── */}
      {insModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{insModal.id ? 'Editar' : 'Nuevo'} Insumo</h3>
              <button onClick={() => setInsModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={insModal.nombre || ''} onChange={e => setInsModal({ ...insModal, nombre: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="input-base" value={insModal.tipo || 'otro'} onChange={e => changeTipo(e.target.value as InsumoTipo)}>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Técnica asociada</label>
                  <select className="input-base" value={insModal.tecnica_asociada || 'compartido'} onChange={e => setInsModal({ ...insModal, tecnica_asociada: e.target.value })}>
                    {TECNICA_OPTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
              </div>

              {/* Type-specific fields */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                {insModal.tipo === 'papel' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<>
                    <div className="flex gap-2">
                      {(['hojas', 'rollo'] as const).map(f => (
                        <button key={f} type="button" onClick={() => up({ formato: f })}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${c.formato === f ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{f === 'hojas' ? 'Hojas' : 'Rollo'}</button>))}
                    </div>
                    {c.formato === 'hojas' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs text-gray-500 mb-1">Precio resma ($)</label><NumericInput className="input-base" value={c.precio_resma as number || 0} onChange={v => up({ precio_resma: v })} /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Hojas/resma</label><NumericInput className="input-base" value={c.hojas_resma as number || 100} onChange={v => up({ hojas_resma: v })} /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><NumericInput className="input-base" value={c.ancho as number || 21} onChange={v => up({ ancho: v })} /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Alto (cm)</label><NumericInput className="input-base" value={c.alto as number || 29.7} onChange={v => up({ alto: v })} /></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-xs text-gray-500 mb-1">Precio rollo ($)</label><NumericInput className="input-base" value={c.precio_rollo as number || 0} onChange={v => up({ precio_rollo: v })} /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><NumericInput className="input-base" value={c.rollo_ancho as number || 61} onChange={v => up({ rollo_ancho: v })} /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Largo (m)</label><NumericInput className="input-base" value={c.rollo_largo as number || 100} onChange={v => up({ rollo_largo: v })} /></div>
                      </div>
                    )}
                  </>)
                })()}
                {insModal.tipo === 'tinta' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Precio ($)</label><NumericInput className="input-base" value={c.precio as number || 0} onChange={v => up({ precio: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Rendimiento</label><NumericInput className="input-base" value={c.rendimiento as number || 0} onChange={v => up({ rendimiento: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Unidad</label><select className="input-base" value={c.unidad_rendimiento as string || 'hojas'} onChange={e => up({ unidad_rendimiento: e.target.value })}><option value="hojas">Hojas</option><option value="m2">m²</option></select></div>
                  </div>)
                })()}
                {insModal.tipo === 'film' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Precio rollo ($)</label><NumericInput className="input-base" value={c.precio_rollo as number || 0} onChange={v => up({ precio_rollo: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><NumericInput className="input-base" value={c.ancho as number || 60} onChange={v => up({ ancho: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Largo (m)</label><NumericInput className="input-base" value={c.largo as number || 100} onChange={v => up({ largo: v })} /></div>
                  </div>)
                })()}
                {insModal.tipo === 'polvo' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Precio/kg ($)</label><NumericInput className="input-base" value={c.precio_kg as number || 0} onChange={v => up({ precio_kg: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Rendimiento (m²/kg)</label><NumericInput className="input-base" value={c.rendimiento_m2 as number || 50} onChange={v => up({ rendimiento_m2: v })} /></div>
                  </div>)
                })()}
                {insModal.tipo === 'vinilo' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  const colores = (c.colores as string[]) || []
                  return (<>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">Aplicación</label><select className="input-base" value={c.aplicacion as string || 'textil'} onChange={e => up({ aplicacion: e.target.value })}><option value="textil">Textil</option><option value="rigido">Rígido</option></select></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Acabado</label><select className="input-base" value={c.acabado as string || 'Liso'} onChange={e => up({ acabado: e.target.value })}>{['Liso', 'Flock', 'Glitter', 'Holográfico', 'Reflectivo', 'Otro'].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">$/metro</label><NumericInput className="input-base" value={c.precio_metro as number || 0} onChange={v => up({ precio_metro: v })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><NumericInput className="input-base" value={c.ancho as number || 50} onChange={v => up({ ancho: v })} /></div>
                    </div>
                    <div><label className="block text-xs text-gray-500 mb-1">Colores</label>
                      <div className="flex flex-wrap gap-1.5">
                        {colores.map((col: string, ci: number) => (
                          <div key={ci} className="flex items-center gap-0.5 bg-gray-50 rounded px-2 py-0.5 border border-gray-100">
                            <input type="text" className="bg-transparent outline-none text-xs w-16" value={col} onChange={e => { const a = [...colores]; a[ci] = e.target.value; up({ colores: a }) }} />
                            <button onClick={() => up({ colores: colores.filter((_: string, j: number) => j !== ci) })} className="text-gray-300 hover:text-red-400"><X size={10} /></button>
                          </div>
                        ))}
                        <button onClick={() => up({ colores: [...colores, ''] })} className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold"><Plus size={10} /></button>
                      </div>
                    </div>
                  </>)
                })()}
                {insModal.tipo === 'tinta_serigrafica' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Precio/kg ($)</label><NumericInput className="input-base" value={c.precio_kg as number || 0} onChange={v => up({ precio_kg: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Rendimiento (est/kg)</label><NumericInput className="input-base" value={c.rendimiento_estampadas_kg as number || 100} onChange={v => up({ rendimiento_estampadas_kg: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Color</label><input className="input-base" value={c.color as string || ''} onChange={e => up({ color: e.target.value })} /></div>
                  </div>)
                })()}
                {insModal.tipo === 'servicio_impresion' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">Precio/metro ($)</label><NumericInput className="input-base" value={c.precio_metro as number || 0} onChange={v => up({ precio_metro: v })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Ancho material (cm)</label><NumericInput className="input-base" value={c.ancho_material as number || 60} onChange={v => up({ ancho_material: v })} /></div>
                    </div>
                    <div><label className="block text-xs text-gray-500 mb-1">Proveedor</label><input className="input-base" value={c.proveedor as string || ''} onChange={e => up({ proveedor: e.target.value })} /></div>
                  </div>)
                })()}
                {insModal.tipo === 'emulsion' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Precio/kg ($)</label><NumericInput className="input-base" value={c.precio_kg as number || 0} onChange={v => up({ precio_kg: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Rendimiento (pantallas/kg)</label><NumericInput className="input-base" value={c.rendimiento_pantallas_kg as number || 20} onChange={v => up({ rendimiento_pantallas_kg: v })} /></div>
                  </div>)
                })()}
                {insModal.tipo === 'otro' && (() => {
                  const c = (insModal.config || {}) as Record<string, unknown>
                  return (<div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Precio ($)</label><NumericInput className="input-base" value={c.precio as number || 0} onChange={v => up({ precio: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Unidad</label><input className="input-base" value={c.unidad as string || ''} onChange={e => up({ unidad: e.target.value })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Rendimiento</label><NumericInput className="input-base" value={c.rendimiento as number || 0} onChange={v => up({ rendimiento: v })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Unidad rend.</label><input className="input-base" value={c.unidad_rendimiento as string || ''} onChange={e => up({ unidad_rendimiento: e.target.value })} /></div>
                  </div>)
                })()}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setInsModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveInsumo} disabled={saving || !insModal.nombre?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#00B894' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {showCats && <CategoryModal categories={categories} onSave={saveCat} onDelete={deleteCat} onClose={() => { setShowCats(false); load() }} />}
    </div>
  )
}
