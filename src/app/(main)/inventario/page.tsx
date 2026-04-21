// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { Plus, Pencil, Trash2, X, Save, Package } from 'lucide-react'

interface Product {
  id: string; name: string; base_cost: number; category: string
  time_subli: number; time_dtf: number; time_vinyl: number
  press_equipment_id: string | null
}

interface Equipment { id: string; name: string; type: string; cost: number; lifespan_uses: number }

export default function InventarioPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<Partial<Product> | null>(null)

  async function load() {
    const [{ data: prods }, { data: equips }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('equipment').select('*').order('name'),
    ])
    setProducts(prods || [])
    setEquipment(equips || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const pressEquipment = equipment.filter(e => e.type === 'press_flat' || e.type === 'press_mug')

  async function saveProduct() {
    if (!modal?.name) return
    setSaving(true)
    const payload = {
      name: modal.name, base_cost: modal.base_cost || 0, category: modal.category || 'General',
      time_subli: modal.time_subli || 0, time_dtf: modal.time_dtf || 0, time_vinyl: modal.time_vinyl || 0,
      press_equipment_id: modal.press_equipment_id || null,
    }
    if (modal.id) await supabase.from('products').update(payload).eq('id', modal.id)
    else await supabase.from('products').insert(payload)
    setModal(null); setSaving(false); load()
  }

  async function deleteProduct(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('products').delete().eq('id', id); load()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <p className="text-gray-500 text-sm mt-1">Productos base del taller (prendas, tazas, etc.)</p>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><Package size={18} className="text-gray-400" /><span className="font-semibold text-gray-800">Catálogo de Productos</span></div>
          <button onClick={() => setModal({ time_subli: 0, time_dtf: 0, time_vinyl: 0, base_cost: 0 })} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Plus size={14} /> Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {['Nombre', 'Costo base', 'Plancha asignada', 'Tiempos (seg)', ''].map(h =>
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {products.map(p => {
                const press = equipment.find(e => e.id === p.press_equipment_id)
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600">${Number(p.base_cost).toLocaleString('es-AR')}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{press?.name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.time_subli > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(108,92,231,0.1)', color: '#6C5CE7' }}>S: {p.time_subli}s</span>}
                        {p.time_dtf > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(225,112,85,0.1)', color: '#E17055' }}>D: {p.time_dtf}s</span>}
                        {p.time_vinyl > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(232,67,147,0.1)', color: '#E84393' }}>V: {p.time_vinyl}s</span>}
                        {!p.time_subli && !p.time_dtf && !p.time_vinyl && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setModal(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {products.length === 0 && <div className="text-center py-12 text-gray-400">No hay productos. Creá el primero.</div>}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                <input value={modal.name || ''} onChange={e => setModal({ ...modal, name: e.target.value })} className="input-base" placeholder="Ej: Remera Algodón" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Costo base ($)</label>
                  <input type="number" value={modal.base_cost || 0} onChange={e => setModal({ ...modal, base_cost: parseFloat(e.target.value) || 0 })} className="input-base" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
                  <input value={modal.category || ''} onChange={e => setModal({ ...modal, category: e.target.value })} className="input-base" placeholder="Textil" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Plancha asignada</label>
                <select value={modal.press_equipment_id || ''} onChange={e => setModal({ ...modal, press_equipment_id: e.target.value || null })} className="input-base">
                  <option value="">Sin plancha</option>
                  {pressEquipment.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Tiempos de planchado (segundos/unidad)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['time_subli', 'Sublimación', '#6C5CE7'], ['time_dtf', 'DTF Textil', '#E17055'], ['time_vinyl', 'Vinilo Textil', '#E84393']].map(([key, label, color]) => (
                    <div key={key}><label className="block text-xs font-medium mb-1" style={{ color: color as string }}>{label as string}</label>
                      <input type="number" min={0} step={1} value={(modal as Record<string, number>)[key as string] || 0} onChange={e => setModal({ ...modal, [key as string]: parseInt(e.target.value) || 0 })} className="input-base text-center" /></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveProduct} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
