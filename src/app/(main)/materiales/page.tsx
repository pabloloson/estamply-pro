'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, FolderOpen } from 'lucide-react'
import type { Category, Insumo, InsumoTipo, InsumoConfig } from '@/features/taller/types'
import CategoryModal from '@/features/taller/components/CategoryModal'
import NumericInput from '@/shared/components/NumericInput'

// ── Shared types ──
interface Product {
  id: string; name: string; base_cost: number; category: string; category_id: string | null
  time_subli: number; time_dtf: number; time_vinyl: number
  press_equipment_id: string | null; printer_equipment_id: string | null; stock: number; stock_minimo: number
}
interface Equipment { id: string; name: string; type: string }

// ── Insumo constants ──
const TIPO_LABELS: Record<InsumoTipo, string> = {
  papel: 'Papel', tinta: 'Tinta', film: 'Film', polvo: 'Polvo', vinilo: 'Vinilo',
  tinta_serigrafica: 'Tinta serigráfica', servicio_impresion: 'Servicio impresión', emulsion: 'Emulsión', otro: 'Otro',
}
const TIPO_COLORS: Record<InsumoTipo, string> = {
  papel: '#6C5CE7', tinta: '#00B894', film: '#E17055', polvo: '#FDCB6E', vinilo: '#E84393',
  tinta_serigrafica: '#e67e22', servicio_impresion: '#3498db', emulsion: '#9b59b6', otro: '#636e72',
}
const TEC_LABELS: Record<string, string> = { subli: 'Subli', dtf: 'DTF', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía', compartido: 'Compartido' }

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

  // Base product CRUD
  async function saveProduct() {
    if (!modal?.name) return; setSaving(true)
    const payload = {
      name: modal.name, base_cost: modal.base_cost || 0, category: modal.category || 'General',
      category_id: modal.category_id || null,
      time_subli: modal.time_subli || 0, time_dtf: modal.time_dtf || 0, time_vinyl: modal.time_vinyl || 0,
      press_equipment_id: modal.press_equipment_id || null, printer_equipment_id: modal.printer_equipment_id || null,
      stock: modal.stock || 0, stock_minimo: modal.stock_minimo || 0,
    }
    if (modal.id) await supabase.from('products').update(payload).eq('id', modal.id)
    else await supabase.from('products').insert(payload)
    setModal(null); setSaving(false); load()
  }
  async function deleteProduct(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('products').delete().eq('id', id); load() } }

  // Insumo CRUD
  async function saveInsumo() {
    if (!insModal?.nombre) return; setSaving(true)
    const payload = {
      nombre: insModal.nombre, tipo: insModal.tipo || 'otro',
      tecnica_asociada: insModal.tecnica_asociada || 'compartido',
      config: insModal.config || { tipo: insModal.tipo || 'otro', precio: 0 },
    }
    if (insModal.id) await supabase.from('insumos').update(payload).eq('id', insModal.id)
    else await supabase.from('insumos').insert(payload)
    setInsModal(null); setSaving(false); load()
  }
  async function deleteInsumo(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('insumos').delete().eq('id', id); load() } }

  // Categories
  async function saveCat(cat: Partial<Category>) {
    if (cat.id) await supabase.from('categories').update({ name: cat.name, margen_sugerido: cat.margen_sugerido }).eq('id', cat.id)
    else await supabase.from('categories').insert({ name: cat.name, margen_sugerido: cat.margen_sugerido })
    load()
  }
  async function deleteCat(id: string) { await supabase.from('categories').delete().eq('id', id); load() }

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

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button onClick={() => setTab('base')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'base' ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>Productos base</button>
        <button onClick={() => setTab('insumos')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'insumos' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`} style={tab === 'insumos' ? { background: '#00B894' } : {}}>Insumos</button>
      </div>

      {/* ══ Tab: Productos base ══ */}
      {tab === 'base' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div><span className="font-semibold text-gray-800">Productos base</span><p className="text-xs text-gray-400 mt-0.5">Prendas, tazas, blanks y soportes</p></div>
            <button onClick={() => setModal({ time_subli: 0, time_dtf: 0, time_vinyl: 0, base_cost: 0, stock: 0, stock_minimo: 0 })} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}><Plus size={14} /> Agregar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full"><thead><tr className="border-b border-gray-100">
              {['Nombre', 'Costo', 'Categoría', 'Plancha', 'Impresora', ''].map(h =>
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
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
                      <button onClick={() => setModal(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody></table>
            {products.length === 0 && <div className="text-center py-12 text-gray-400">No hay productos base.</div>}
          </div>
        </div>
      )}

      {/* ══ Tab: Insumos ══ */}
      {tab === 'insumos' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div><span className="font-semibold text-gray-800">Insumos</span><p className="text-xs text-gray-400 mt-0.5">Papel, tinta, vinilo y consumibles</p></div>
            <button onClick={() => setInsModal({ tipo: 'papel', tecnica_asociada: 'compartido', config: { tipo: 'papel', formato: 'hojas', precio_resma: 0, hojas_resma: 100, ancho: 21, alto: 29.7, precio_rollo: 0, rollo_ancho: 61, rollo_largo: 100 } })}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#00B894' }}><Plus size={14} /> Agregar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full"><thead><tr className="border-b border-gray-100">
              {['Tipo', 'Nombre', 'Técnica', 'Detalle', ''].map(h =>
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr></thead><tbody>
              {insumos.map(ins => {
                const color = TIPO_COLORS[ins.tipo] || '#636e72'
                return (
                  <tr key={ins.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: color }}>{TIPO_LABELS[ins.tipo] || ins.tipo}</span></td>
                    <td className="px-4 py-3 font-medium text-gray-800">{ins.nombre}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{TEC_LABELS[ins.tecnica_asociada] || ins.tecnica_asociada}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{insumoDetail(ins)}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => setInsModal(ins)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={() => deleteInsumo(ins.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div></td>
                  </tr>
                )
              })}
            </tbody></table>
            {insumos.length === 0 && <div className="text-center py-12 text-gray-400">No hay insumos.</div>}
          </div>
        </div>
      )}

      {/* Base Product Modal */}
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
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.margen_sugerido}%)</option>)}
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
                      <NumericInput className="input-base text-center" value={(modal as Record<string, number>)[k as string] || 0}
                        onChange={v => setModal({ ...modal, [k as string]: v })} /></div>
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

      {/* Insumo Modal — simplified (nombre, tipo, técnica, precio básico) */}
      {insModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{insModal.id ? 'Editar' : 'Nuevo'} Insumo</h3>
              <button onClick={() => setInsModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={insModal.nombre || ''} onChange={e => setInsModal({ ...insModal, nombre: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="input-base" value={insModal.tipo || 'papel'} onChange={e => setInsModal({ ...insModal, tipo: e.target.value as InsumoTipo })}>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Técnica asociada</label>
                  <select className="input-base" value={insModal.tecnica_asociada || 'compartido'} onChange={e => setInsModal({ ...insModal, tecnica_asociada: e.target.value })}>
                    {Object.entries(TEC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
              </div>
              <p className="text-[10px] text-gray-400">La configuración detallada del insumo se edita desde la sección Insumos existente (/insumos).</p>
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

function insumoDetail(ins: Insumo): string {
  const c = ins.config as Record<string, unknown>
  switch (ins.tipo) {
    case 'papel': return c.formato === 'hojas' ? `$${(c.precio_resma as number || 0).toLocaleString('es-AR')} · ${c.hojas_resma} hojas` : `$${(c.precio_rollo as number || 0).toLocaleString('es-AR')} · ${c.rollo_ancho}cm × ${c.rollo_largo}m`
    case 'tinta': return `$${(c.precio as number || 0).toLocaleString('es-AR')} · ${c.rendimiento} ${c.unidad_rendimiento || 'hojas'}`
    case 'film': return `$${(c.precio_rollo as number || 0).toLocaleString('es-AR')} · ${c.ancho}cm × ${c.largo}m`
    case 'vinilo': return `$${(c.precio_metro as number || 0).toLocaleString('es-AR')}/m · ${c.ancho}cm`
    case 'servicio_impresion': return `$${(c.precio_metro as number || 0).toLocaleString('es-AR')}/m`
    default: return `$${(c.precio as number || c.precio_kg as number || 0).toLocaleString('es-AR')}`
  }
}
