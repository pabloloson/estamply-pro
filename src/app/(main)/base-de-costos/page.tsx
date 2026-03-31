'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Save, Package, Cpu, Settings2 } from 'lucide-react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier } from '@/features/presupuesto/types'

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
  plotter: 'Plotter de Corte',
  press_flat: 'Plancha Plana',
  press_mug: 'Plancha Tazas',
}

const TABS = ['Productos', 'Equipos', 'Insumos', 'Descuentos'] as const
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
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full" style={{ background: '#6C5CE7' }} /><span className="font-semibold text-gray-800">Insumos Sublimación</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {([['subli_papel_precio', 'Resma papel ($)'], ['subli_papel_hojas', 'Hojas por resma'], ['subli_tinta_precio', 'Tinta set ($)'], ['subli_tinta_rendimiento', 'Rend. tinta (hojas)']] as const).map(([key, label]) => (
                <div key={key}><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label><input type="number" value={ws[key]} onChange={e => setWs({ ...ws, [key]: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full" style={{ background: '#E17055' }} /><span className="font-semibold text-gray-800">Insumos DTF</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {([['dtf_precio_metro', 'Metro lineal ($)'], ['dtf_ancho_rollo', 'Ancho rollo (cm)'], ['dtf_film_costo', 'Film por uso ($)'], ['dtf_tinta_costo', 'Tinta por uso ($)'], ['dtf_polvo_costo', 'Polvo por uso ($)'], ['dtf_amort_impresora', 'Amort. impresora ($)'], ['dtf_amort_horno', 'Amort. horno ($)']] as const).map(([key, label]) => (
                <div key={key}><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label><input type="number" value={ws[key]} onChange={e => setWs({ ...ws, [key]: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><div className="w-3 h-3 rounded-full" style={{ background: '#E84393' }} /><span className="font-semibold text-gray-800">Insumos Vinilo</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {([['vinyl_precio_metro', 'Metro cuadrado ($)'], ['vinyl_ancho_rollo', 'Ancho rollo (cm)']] as const).map(([key, label]) => (
                <div key={key}><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label><input type="number" value={ws[key]} onChange={e => setWs({ ...ws, [key]: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><Settings2 size={15} className="text-gray-400" /><span className="font-semibold text-gray-800">General</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Setup global (min)</label><input type="number" value={ws.setup_min} onChange={e => setWs({ ...ws, setup_min: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Gastos fijos mensuales ($)</label><input type="number" value={ws.fixed_costs_monthly} onChange={e => setWs({ ...ws, fixed_costs_monthly: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
            </div>
          </div>
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

      {/* Modal Producto */}
      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
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
