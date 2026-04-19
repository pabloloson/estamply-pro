// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { Plus, Pencil, Trash2, X, Save, Package, Cpu, Settings2, Users } from 'lucide-react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier, type ManoDeObraConfig, type ManoDeObraModo, type ComisionBase, type VinylMaterial, DEFAULT_MO_CONFIG } from '@/features/presupuesto/types'

interface Product {
  id: string
  name: string
  base_cost: number
  category: string
  time_subli: number
  time_dtf: number
  time_vinyl: number
  press_equipment_id: string | null
}

interface Equipment {
  id: string
  name: string
  type: string
  cost: number
  lifespan_uses: number
}

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
  printer_subli: 'Impresora Subli',
  printer_dtf: 'Impresora DTF',
  horno_dtf: 'Horno DTF',
  plotter: 'Plotter de Corte',
  press_flat: 'Plancha Plana',
  press_mug: 'Plancha Tazas',
}

const TABS = ['Productos', 'Equipos', 'Insumos', 'Descuentos', 'Mano de Obra'] as const
type Tab = typeof TABS[number]

function DiscountTable({ title, tiers, onChange }: {
  title: string
  tiers: DiscountTier[]
  onChange: (tiers: DiscountTier[]) => void
}) {
  const update = (i: number, field: keyof DiscountTier, val: number) =>
    onChange(tiers.map((t, j) => j === i ? { ...t, [field]: val } : t))
  const addRow = () => onChange([...tiers, { desde: 0, hasta: 9999, porcentaje: 0 }])
  const removeRow = (i: number) => onChange(tiers.filter((_, j) => j !== i))

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">{title}</span>
        <button onClick={addRow} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}>
          <Plus size={12} /> Fila
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {['Desde (u)', 'Hasta (u)', 'Descuento (%)', ''].map(h => (
              <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tiers.map((t, i) => (
            <tr key={i} className="border-b border-gray-50">
              <td className="px-4 py-2"><input type="number" value={t.desde} onChange={e => update(i, 'desde', parseInt(e.target.value) || 0)} className="w-20 input-base text-sm py-1.5" /></td>
              <td className="px-4 py-2"><input type="number" value={t.hasta} onChange={e => update(i, 'hasta', parseInt(e.target.value) || 0)} className="w-20 input-base text-sm py-1.5" /></td>
              <td className="px-4 py-2"><input type="number" min={0} max={100} step={1} value={Math.round(t.porcentaje * 100)} onChange={e => update(i, 'porcentaje', (parseFloat(e.target.value) || 0) / 100)} className="w-20 input-base text-sm py-1.5" /></td>
              <td className="px-4 py-2"><button onClick={() => removeRow(i)} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {tiers.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Sin reglas. Agregá una fila.</p>}
    </div>
  )
}

export default function BaseDeCostosPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('Productos')
  const [products, setProducts] = useState<Product[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalProduct, setModalProduct] = useState<Partial<Product> | null>(null)
  const [modalEquip, setModalEquip] = useState<Partial<Equipment> | null>(null)
  const [insumoTab, setInsumoTab] = useState<'subli' | 'dtf' | 'vinyl'>('subli')

  async function load() {
    const [{ data: prods }, { data: equips }, { data: wsData }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('equipment').select('*').order('name'),
      supabase.from('workshop_settings').select('settings').single(),
    ])
    setProducts(prods || [])
    setEquipment(equips || [])
    if (wsData?.settings) setWs({ ...DEFAULT_SETTINGS, ...(wsData.settings as Partial<WorkshopSettings>) })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveSettings() {
    setSaving(true)
    const { data: existing } = await supabase.from('workshop_settings').select('id').single()
    if (existing) {
      await supabase.from('workshop_settings').update({ settings: ws }).eq('id', existing.id)
    } else {
      await supabase.from('workshop_settings').insert({ settings: ws })
    }
    setSaving(false)
    alert('Guardado ✓')
  }

  async function saveProduct() {
    if (!modalProduct?.name) return
    setSaving(true)
    const payload = {
      name: modalProduct.name,
      base_cost: modalProduct.base_cost || 0,
      category: modalProduct.category || 'General',
      time_subli: modalProduct.time_subli || 0,
      time_dtf: modalProduct.time_dtf || 0,
      time_vinyl: modalProduct.time_vinyl || 0,
      press_equipment_id: modalProduct.press_equipment_id || null,
    }
    if (modalProduct.id) {
      await supabase.from('products').update(payload).eq('id', modalProduct.id)
    } else {
      await supabase.from('products').insert(payload)
    }
    setModalProduct(null)
    setSaving(false)
    load()
  }

  async function deleteProduct(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('products').delete().eq('id', id)
    load()
  }

  async function saveEquipment() {
    if (!modalEquip?.name) return
    setSaving(true)
    const payload = {
      name: modalEquip.name,
      type: modalEquip.type || 'press_flat',
      cost: modalEquip.cost || 0,
      lifespan_uses: modalEquip.lifespan_uses || 1000,
    }
    if (modalEquip.id) {
      await supabase.from('equipment').update(payload).eq('id', modalEquip.id)
    } else {
      await supabase.from('equipment').insert(payload)
    }
    setModalEquip(null)
    setSaving(false)
    load()
  }

  async function deleteEquipment(id: string) {
    if (!confirm('¿Eliminar este equipo?')) return
    await supabase.from('equipment').delete().eq('id', id)
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  const pressEquipment = equipment.filter(e => e.type === 'press_flat' || e.type === 'press_mug')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Base de Costos</h1>
        <p className="text-gray-500 text-sm mt-1">La matemática del sistema: productos, equipos, insumos y descuentos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#F3F4F6' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t ? 'tab-active text-purple-700' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Productos */}
      {tab === 'Productos' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-gray-400" />
              <span className="font-semibold text-gray-800">Catálogo de Productos</span>
            </div>
            <button onClick={() => setModalProduct({ time_subli: 0, time_dtf: 0, time_vinyl: 0, base_cost: 0 })} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}>
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nombre', 'Costo base', 'Categoría', 'Tiempos (min)', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600">${Number(p.base_cost).toLocaleString('es-AR')}</td>
                    <td className="px-5 py-3 text-gray-500 text-sm">{p.category}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.time_subli > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(108,92,231,0.1)', color: '#6C5CE7' }}>S: {p.time_subli}m</span>}
                        {p.time_dtf > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(225,112,85,0.1)', color: '#E17055' }}>D: {p.time_dtf}m</span>}
                        {p.time_vinyl > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(232,67,147,0.1)', color: '#E84393' }}>V: {p.time_vinyl}m</span>}
                        {!p.time_subli && !p.time_dtf && !p.time_vinyl && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setModalProduct(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <div className="text-center py-12 text-gray-400">No hay productos. Creá el primero.</div>}
          </div>
        </div>
      )}

      {/* Equipos */}
      {tab === 'Equipos' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-gray-400" />
              <span className="font-semibold text-gray-800">Equipos del Taller</span>
            </div>
            <button onClick={() => setModalEquip({ type: 'press_flat', cost: 0, lifespan_uses: 10000 })} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}>
              <Plus size={14} /> Agregar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nombre', 'Tipo', 'Valor', 'Vida útil (usos)', 'Amort./uso', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipment.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{e.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{EQUIPMENT_TYPE_LABELS[e.type] || e.type}</td>
                    <td className="px-5 py-3 text-gray-600">${Number(e.cost).toLocaleString('es-AR')}</td>
                    <td className="px-5 py-3 text-gray-600">{Number(e.lifespan_uses).toLocaleString('es-AR')}</td>
                    <td className="px-5 py-3 text-green-600 font-medium">${Math.round(e.cost / e.lifespan_uses).toLocaleString('es-AR')}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setModalEquip(e)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                        <button onClick={() => deleteEquipment(e.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {equipment.length === 0 && <div className="text-center py-12 text-gray-400">No hay equipos.</div>}
          </div>
        </div>
      )}

      {/* Insumos */}
      {tab === 'Insumos' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex rounded-full p-1 gap-1 w-fit" style={{ background: '#F1F1F1' }}>
            {([['subli', 'Sublimación', '#6C5CE7'], ['dtf', 'DTF', '#E17055'], ['vinyl', 'Vinilo', '#E84393']] as const).map(([id, label, color]) => (
              <button
                key={id}
                onClick={() => setInsumoTab(id)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={insumoTab === id
                  ? { background: '#fff', color, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: '#888' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── SUBLIMACIÓN ── */}
          {insumoTab === 'subli' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: '#6C5CE7' }} />
                <span className="font-semibold text-gray-800">Insumos Sublimación</span>
              </div>
              {/* Formato toggle */}
              <div className="flex rounded-full p-0.5 gap-0.5" style={{ background: '#F1F1F1' }}>
                {(['hojas', 'rollo'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setWs({ ...ws, subli_papel_formato: f })}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={(ws.subli_papel_formato ?? 'hojas') === f
                      ? { background: '#fff', color: '#6C5CE7', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                      : { color: '#888' }
                    }
                  >
                    {f === 'hojas' ? 'Hojas' : 'Rollo'}
                  </button>
                ))}
              </div>
            </div>

            {(ws.subli_papel_formato ?? 'hojas') === 'hojas' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Precio resma ($)</label>
                  <input type="number" value={ws.subli_papel_precio} onChange={e => setWs({ ...ws, subli_papel_precio: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Hojas por resma</label>
                  <input type="number" value={ws.subli_papel_hojas} onChange={e => setWs({ ...ws, subli_papel_hojas: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Ancho hoja (cm)</label>
                  <input type="number" value={ws.subli_papel_ancho ?? 21} onChange={e => setWs({ ...ws, subli_papel_ancho: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Alto hoja (cm)</label>
                  <input type="number" value={ws.subli_papel_alto ?? 29.7} onChange={e => setWs({ ...ws, subli_papel_alto: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Precio rollo ($)</label>
                  <input type="number" value={ws.subli_rollo_precio ?? 0} onChange={e => setWs({ ...ws, subli_rollo_precio: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Ancho rollo (cm)</label>
                  <input type="number" value={ws.subli_rollo_ancho ?? 61} onChange={e => setWs({ ...ws, subli_rollo_ancho: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Largo rollo (metros)</label>
                  <input type="number" value={ws.subli_rollo_largo ?? 100} onChange={e => setWs({ ...ws, subli_rollo_largo: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              </div>
            )}

            {/* Tinta (aplica para ambos) */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tinta</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Precio set/litro ($)</label>
                  <input type="number" value={ws.subli_tinta_precio} onChange={e => setWs({ ...ws, subli_tinta_precio: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Rendimiento (hojas equiv.)</label>
                  <input type="number" value={ws.subli_tinta_rendimiento} onChange={e => setWs({ ...ws, subli_tinta_rendimiento: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              </div>
            </div>
          </div>
          )}

          {/* ── DTF TERCERIZADO ── */}
          {insumoTab === 'dtf' && (<>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: '#E17055' }} />
              <span className="font-semibold text-gray-800">DTF Tercerizado</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Mando a imprimir</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Precio por metro lineal ($)</label>
                <input type="number" value={ws.dtf_precio_metro} onChange={e => setWs({ ...ws, dtf_precio_metro: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Ancho rollo (cm)</label>
                <input type="number" value={ws.dtf_ancho_rollo} onChange={e => setWs({ ...ws, dtf_ancho_rollo: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
            </div>
          </div>

          {/* ── DTF PROPIA ── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: '#E17055' }} />
              <span className="font-semibold text-gray-800">DTF Impresora Propia</span>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Compras a granel</span>
            </div>

            {/* Film */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Film</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Precio rollo ($)</label>
                <input type="number" value={ws.dtf_film_rollo_precio ?? 0} onChange={e => setWs({ ...ws, dtf_film_rollo_precio: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Ancho (cm)</label>
                <input type="number" value={ws.dtf_film_ancho ?? 60} onChange={e => setWs({ ...ws, dtf_film_ancho: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Largo (metros)</label>
                <input type="number" value={ws.dtf_film_largo ?? 100} onChange={e => setWs({ ...ws, dtf_film_largo: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
            </div>

            {/* Tinta */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tinta (CMYK+W)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 max-w-md">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Precio por litro ($)</label>
                <input type="number" value={ws.dtf_tinta_precio_litro ?? 0} onChange={e => setWs({ ...ws, dtf_tinta_precio_litro: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Rendimiento (m²/litro)</label>
                <input type="number" value={ws.dtf_tinta_rendimiento_m2 ?? 40} onChange={e => setWs({ ...ws, dtf_tinta_rendimiento_m2: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
            </div>

            {/* Polvo */}
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Polvo Poliamida</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Precio por kilo ($)</label>
                <input type="number" value={ws.dtf_polvo_precio_kilo ?? 0} onChange={e => setWs({ ...ws, dtf_polvo_precio_kilo: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Rendimiento (m²/kg)</label>
                <input type="number" value={ws.dtf_polvo_rendimiento_m2 ?? 50} onChange={e => setWs({ ...ws, dtf_polvo_rendimiento_m2: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
            </div>
          </div>
          </>)}

          {/* ── VINILO: Materiales con variantes ── */}
          {insumoTab === 'vinyl' && (<>
          {(ws.vinyl_materiales ?? []).map((mat: VinylMaterial, mi: number) => {
            const updateMat = (patch: Partial<VinylMaterial>) => {
              const arr = [...(ws.vinyl_materiales ?? [])]
              arr[mi] = { ...arr[mi], ...patch }
              setWs({ ...ws, vinyl_materiales: arr })
            }
            return (
              <div key={mi} className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#E84393' }} />
                    <span className="font-semibold text-gray-800">
                      {mat.acabado || 'Material'} {mat.aplicacion === 'autoadhesivo' ? '(Autoadhesivo)' : '(Textil)'}
                    </span>
                  </div>
                  <button onClick={() => setWs({ ...ws, vinyl_materiales: (ws.vinyl_materiales ?? []).filter((_: VinylMaterial, j: number) => j !== mi) })}
                    className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                </div>

                {/* Parent fields */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Aplicación</label>
                    <select className="input-base text-sm" value={mat.aplicacion} onChange={e => updateMat({ aplicacion: e.target.value as 'textil' | 'autoadhesivo' })}>
                      <option value="textil">Textil</option>
                      <option value="autoadhesivo">Autoadhesivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Acabado</label>
                    <select className="input-base text-sm" value={mat.acabado} onChange={e => updateMat({ acabado: e.target.value })}>
                      {['Liso', 'Glitter', 'Flock', 'Reflectivo', 'Metalizado', 'Holográfico', 'Puff', 'Otro'].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Precio/metro ($)</label>
                    <input type="number" className="input-base text-sm" min={0} value={mat.precio_metro}
                      onChange={e => updateMat({ precio_metro: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Ancho rollo (cm)</label>
                    <input type="number" className="input-base text-sm" min={1} value={mat.ancho_rollo}
                      onChange={e => updateMat({ ancho_rollo: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor / Marca (opcional)</label>
                  <input type="text" className="input-base text-sm" placeholder="Ej: Siser, Forever..." value={mat.proveedor}
                    onChange={e => updateMat({ proveedor: e.target.value })} />
                </div>

                {/* Children: colores */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Colores disponibles</span>
                    <button onClick={() => updateMat({ colores: [...(mat.colores ?? []), ''] })}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded font-semibold" style={{ color: '#E84393', background: 'rgba(232,67,147,0.08)' }}>
                      <Plus size={10} /> Color
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(mat.colores ?? []).map((color: string, ci: number) => (
                      <div key={ci} className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 border border-gray-100">
                        <input type="text" className="bg-transparent outline-none text-sm w-20" placeholder="Color..."
                          value={color} onChange={e => {
                            const cols = [...(mat.colores ?? [])]
                            cols[ci] = e.target.value
                            updateMat({ colores: cols })
                          }} />
                        <button onClick={() => updateMat({ colores: (mat.colores ?? []).filter((_: string, j: number) => j !== ci) })}
                          className="text-gray-300 hover:text-red-400"><X size={12} /></button>
                      </div>
                    ))}
                    {(mat.colores ?? []).length === 0 && <span className="text-xs text-gray-300">Sin colores</span>}
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => setWs({ ...ws, vinyl_materiales: [...(ws.vinyl_materiales ?? []), { aplicacion: 'textil', acabado: 'Liso', precio_metro: 0, ancho_rollo: 50, proveedor: '', colores: ['Blanco', 'Negro'] }] })}
            className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-semibold text-white" style={{ background: '#E84393' }}>
            <Plus size={14} /> Agregar material
          </button>
          </>)}

          <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Save size={15} />{saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* Descuentos */}
      {tab === 'Descuentos' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Escalas de descuento por cantidad, aplicadas automáticamente en la calculadora.</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DiscountTable title="Sublimación" tiers={ws.descuentos_subli} onChange={tiers => setWs({ ...ws, descuentos_subli: tiers })} />
            <DiscountTable title="DTF" tiers={ws.descuentos_dtf} onChange={tiers => setWs({ ...ws, descuentos_dtf: tiers })} />
            <DiscountTable title="Vinilo" tiers={ws.descuentos_vinyl} onChange={tiers => setWs({ ...ws, descuentos_vinyl: tiers })} />
          </div>
          <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Save size={15} />{saving ? 'Guardando...' : 'Guardar descuentos'}
          </button>
        </div>
      )}

      {/* Mano de Obra */}
      {tab === 'Mano de Obra' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Configurá cómo se calcula la mano de obra. Se aplicará automáticamente en la calculadora.</p>
          <div className="card p-5 max-w-lg">
            <div className="flex items-center gap-2 mb-5">
              <Users size={16} className="text-gray-400" />
              <span className="font-semibold text-gray-800">Regla de Mano de Obra</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Modo de pago</label>
                <select
                  className="input-base"
                  value={ws.mano_de_obra?.modo ?? 'por_unidad'}
                  onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), modo: e.target.value as ManoDeObraModo } })}
                >
                  <option value="sueldo_fijo">Sueldo Fijo</option>
                  <option value="por_unidad">Por Unidad (A destajo)</option>
                  <option value="porcentaje">Porcentaje (Comisión)</option>
                </select>
              </div>

              {(ws.mano_de_obra?.modo ?? 'por_unidad') === 'sueldo_fijo' && (
                <div className="space-y-3 p-4 rounded-xl" style={{ background: '#F8F9FA' }}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sueldo Fijo</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Sueldo mensual ($)</label>
                      <input
                        type="number"
                        className="input-base"
                        min={0}
                        value={ws.mano_de_obra?.sueldo_mensual ?? 0}
                        onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), sueldo_mensual: Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Horas/mes trabajadas</label>
                      <input
                        type="number"
                        className="input-base"
                        min={1}
                        value={ws.mano_de_obra?.horas_mensuales ?? 160}
                        onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), horas_mensuales: Number(e.target.value) } })}
                      />
                    </div>
                  </div>
                  {(ws.mano_de_obra?.horas_mensuales ?? 160) > 0 && (ws.mano_de_obra?.sueldo_mensual ?? 0) > 0 && (
                    <p className="text-xs text-green-600 font-medium">
                      Costo por minuto: ${((ws.mano_de_obra?.sueldo_mensual ?? 0) / ((ws.mano_de_obra?.horas_mensuales ?? 160) * 60)).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {(ws.mano_de_obra?.modo ?? 'por_unidad') === 'por_unidad' && (
                <div className="space-y-3 p-4 rounded-xl" style={{ background: '#F8F9FA' }}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Por Unidad</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Monto por unidad ($)</label>
                    <input
                      type="number"
                      className="input-base"
                      min={0}
                      value={ws.mano_de_obra?.monto_por_unidad ?? 0}
                      onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), monto_por_unidad: Number(e.target.value) } })}
                    />
                  </div>
                </div>
              )}

              {(ws.mano_de_obra?.modo ?? 'por_unidad') === 'porcentaje' && (
                <div className="space-y-3 p-4 rounded-xl" style={{ background: '#F8F9FA' }}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comisión</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">% de comisión</label>
                      <input
                        type="number"
                        className="input-base"
                        min={0}
                        max={100}
                        value={ws.mano_de_obra?.porcentaje_comision ?? 10}
                        onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), porcentaje_comision: Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Base de cálculo</label>
                      <select
                        className="input-base"
                        value={ws.mano_de_obra?.comision_base ?? 'venta'}
                        onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), comision_base: e.target.value as ComisionBase } })}
                      >
                        <option value="venta">Sobre el Precio de Venta</option>
                        <option value="ganancia">Sobre la Ganancia</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Save size={15} />{saving ? 'Guardando...' : 'Guardar regla'}
          </button>
        </div>
      )}

      {/* Modal Producto */}
      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modalProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setModalProduct(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label><input value={modalProduct.name || ''} onChange={e => setModalProduct({ ...modalProduct, name: e.target.value })} className="input-base" placeholder="Ej: Remera Algodón" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Costo base ($)</label><input type="number" value={modalProduct.base_cost || 0} onChange={e => setModalProduct({ ...modalProduct, base_cost: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label><input value={modalProduct.category || ''} onChange={e => setModalProduct({ ...modalProduct, category: e.target.value })} className="input-base" placeholder="Textil" /></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Tiempos de producción (min/unidad)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['time_subli', 'Sublimación', '#6C5CE7'], ['time_dtf', 'DTF', '#E17055'], ['time_vinyl', 'Vinilo', '#E84393']].map(([key, label, color]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium mb-1" style={{ color }}>{label}</label>
                      <input type="number" min={0} step={0.5} value={(modalProduct as Record<string, number>)[key] || 0} onChange={e => setModalProduct({ ...modalProduct, [key]: parseFloat(e.target.value) || 0 })} className="input-base text-center" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plancha (equipo)</label>
                <select value={modalProduct.press_equipment_id || ''} onChange={e => setModalProduct({ ...modalProduct, press_equipment_id: e.target.value || null })} className="input-base">
                  <option value="">Sin plancha</option>
                  {pressEquipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalProduct(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveProduct} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Equipo */}
      {modalEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modalEquip.id ? 'Editar Equipo' : 'Nuevo Equipo'}</h3>
              <button onClick={() => setModalEquip(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label><input value={modalEquip.name || ''} onChange={e => setModalEquip({ ...modalEquip, name: e.target.value })} className="input-base" placeholder="Ej: Plancha Plana 38x38" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                <select value={modalEquip.type || 'press_flat'} onChange={e => setModalEquip({ ...modalEquip, type: e.target.value })} className="input-base">
                  {Object.entries(EQUIPMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Valor de compra ($)</label><input type="number" value={modalEquip.cost || 0} onChange={e => setModalEquip({ ...modalEquip, cost: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Vida útil (usos estimados)</label><input type="number" value={modalEquip.lifespan_uses || 10000} onChange={e => setModalEquip({ ...modalEquip, lifespan_uses: parseInt(e.target.value) || 1 })} className="input-base" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalEquip(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveEquipment} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
