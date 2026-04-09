'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Package, FolderOpen, Eye, EyeOff, AlertTriangle, ArrowUpDown } from 'lucide-react'
import type { Category } from '@/features/taller/types'
import CategoryModal from '@/features/taller/components/CategoryModal'
import NumericInput from '@/shared/components/NumericInput'

interface Product {
  id: string; name: string; base_cost: number; category: string; category_id: string | null
  time_subli: number; time_dtf: number; time_vinyl: number
  press_equipment_id: string | null; printer_equipment_id: string | null; stock: number; stock_minimo: number
}
interface Equipment { id: string; name: string; type: string }
interface CatalogProduct {
  id: string; name: string; description: string | null; category_id: string | null
  cost_mode: 'calculated' | 'manual'; unit_cost: number; selling_price: number
  manage_stock: boolean; current_stock: number; min_stock: number
  visible_in_catalog: boolean; base_product_id: string | null; technique: string | null
}
interface StockMovement { id: string; product_id: string; type: string; quantity: number; note: string | null; created_at: string }

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

export default function CatalogoPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'base' | 'catalog'>('base')
  const [products, setProducts] = useState<Product[]>([])
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<Partial<Product> | null>(null)
  const [catModal, setCatModal] = useState<Partial<CatalogProduct> | null>(null)
  const [stockModal, setStockModal] = useState<{ product: CatalogProduct; type: 'produce' | 'sell' | 'adjust' | 'history'; qty: number; note: string; movements: StockMovement[] } | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [catFilter, setCatFilter] = useState('all')

  async function load() {
    const [{ data: p }, { data: cp }, { data: e }, { data: c }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('catalog_products').select('*').order('name'),
      supabase.from('equipment').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    setProducts(p || []); setCatalogProducts((cp || []) as CatalogProduct[]); setEquipment(e || []); setCategories(c || []); setLoading(false)
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
      press_equipment_id: modal.press_equipment_id || null,
      printer_equipment_id: modal.printer_equipment_id || null,
      stock: modal.stock || 0, stock_minimo: modal.stock_minimo || 0,
    }
    if (modal.id) await supabase.from('products').update(payload).eq('id', modal.id)
    else await supabase.from('products').insert(payload)
    setModal(null); setSaving(false); load()
  }
  async function deleteProduct(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('products').delete().eq('id', id); load() } }

  // Catalog product CRUD
  async function saveCatalogProduct() {
    if (!catModal?.name) return; setSaving(true)
    const payload = {
      name: catModal.name, description: catModal.description || null,
      category_id: catModal.category_id || null, cost_mode: catModal.cost_mode || 'manual',
      base_product_id: catModal.base_product_id || null, technique: catModal.technique || null,
      unit_cost: catModal.unit_cost || 0, selling_price: catModal.selling_price || 0,
      manage_stock: catModal.manage_stock ?? false, current_stock: catModal.current_stock || 0,
      min_stock: catModal.min_stock || 0, visible_in_catalog: catModal.visible_in_catalog ?? true,
    }
    if (catModal.id) await supabase.from('catalog_products').update(payload).eq('id', catModal.id)
    else await supabase.from('catalog_products').insert(payload)
    setCatModal(null); setSaving(false); load()
  }
  async function deleteCatalogProduct(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('catalog_products').delete().eq('id', id); load() } }

  // Stock operations
  async function doStockAction() {
    if (!stockModal) return
    const { product, type, qty, note } = stockModal
    let delta = 0
    if (type === 'produce') delta = qty
    else if (type === 'sell') delta = -qty
    else if (type === 'adjust') delta = qty - product.current_stock
    if (delta === 0 && type !== 'adjust') return
    await supabase.from('stock_movements').insert({ product_id: product.id, type, quantity: delta, note: note || null })
    await supabase.from('catalog_products').update({ current_stock: product.current_stock + delta }).eq('id', product.id)
    setStockModal(null); load()
  }
  async function openHistory(product: CatalogProduct) {
    const { data } = await supabase.from('stock_movements').select('*').eq('product_id', product.id).order('created_at', { ascending: false }).limit(50)
    setStockModal({ product, type: 'history', qty: 0, note: '', movements: (data || []) as StockMovement[] })
  }

  // Categories
  async function saveCat(cat: Partial<Category>) {
    if (cat.id) await supabase.from('categories').update({ name: cat.name, margen_sugerido: cat.margen_sugerido }).eq('id', cat.id)
    else await supabase.from('categories').insert({ name: cat.name, margen_sugerido: cat.margen_sugerido })
    load()
  }
  async function deleteCat(id: string) { await supabase.from('categories').delete().eq('id', id); load() }

  // Filter catalog products
  const filteredCatalog = catalogProducts.filter(p => {
    if (catFilter === 'stock') return p.manage_stock && p.current_stock > 0
    if (catFilter === 'ondemand') return !p.manage_stock
    if (catFilter === 'visible') return p.visible_in_catalog
    if (catFilter === 'hidden') return !p.visible_in_catalog
    return true
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de productos base y productos de tu marca</p></div>
        <button onClick={() => setShowCats(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
          <FolderOpen size={14} /> Categorías
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button onClick={() => setTab('base')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'base' ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>Productos base</button>
        <button onClick={() => setTab('catalog')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'catalog' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-600'}`} style={tab === 'catalog' ? { background: '#6C5CE7' } : {}}>Mis productos</button>
      </div>

      {/* ══ Tab: Productos base ══ */}
      {tab === 'base' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div><span className="font-semibold text-gray-800">Productos base</span><p className="text-xs text-gray-400 mt-0.5">Materia prima: prendas, tazas, blanks y soportes</p></div>
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

      {/* ══ Tab: Mis productos ══ */}
      {tab === 'catalog' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5 flex-wrap">
              {[['all', 'Todos'], ['stock', 'Con stock'], ['ondemand', 'A pedido'], ['visible', 'Visible'], ['hidden', 'No visible']].map(([id, label]) => (
                <button key={id} onClick={() => setCatFilter(id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${catFilter === id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>
              ))}
            </div>
            <button onClick={() => setCatModal({ cost_mode: 'manual', unit_cost: 0, selling_price: 0, manage_stock: false, current_stock: 0, min_stock: 0, visible_in_catalog: true })}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}><Plus size={14} /> Agregar</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr className="border-b border-gray-100">
                {['Nombre', 'Costo', 'Precio', 'Margen', 'Stock', 'Visible', ''].map(h =>
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
              </tr></thead><tbody>
                {filteredCatalog.map(p => {
                  const margin = p.selling_price > 0 ? Math.round(((p.selling_price - p.unit_cost) / p.selling_price) * 100) : 0
                  const lowStock = p.manage_stock && p.current_stock <= p.min_stock
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmt(p.unit_cost)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{fmt(p.selling_price)}</td>
                      <td className="px-4 py-3"><span className={`text-sm font-medium ${margin >= 40 ? 'text-green-600' : margin >= 20 ? 'text-amber-600' : 'text-red-500'}`}>{margin}%</span></td>
                      <td className="px-4 py-3 text-sm">
                        {p.manage_stock ? (
                          <button onClick={() => openHistory(p)} className={`flex items-center gap-1 ${lowStock ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                            {lowStock && <AlertTriangle size={12} />}{p.current_stock} u.
                          </button>
                        ) : <span className="text-gray-400 text-xs">A pedido</span>}
                      </td>
                      <td className="px-4 py-3">{p.visible_in_catalog ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-gray-300" />}</td>
                      <td className="px-4 py-3"><div className="flex gap-1">
                        {p.manage_stock && (<>
                          <button onClick={() => setStockModal({ product: p, type: 'produce', qty: 0, note: '', movements: [] })} className="p-1 rounded hover:bg-green-50 text-xs text-green-600 font-medium" title="Producir">+</button>
                          <button onClick={() => setStockModal({ product: p, type: 'sell', qty: 0, note: '', movements: [] })} className="p-1 rounded hover:bg-blue-50 text-xs text-blue-600 font-medium" title="Vender">−</button>
                        </>)}
                        <button onClick={() => setCatModal(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                        <button onClick={() => deleteCatalogProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                      </div></td>
                    </tr>
                  )
                })}
              </tbody></table>
              {filteredCatalog.length === 0 && <div className="text-center py-12 text-gray-400">No hay productos en esta vista.</div>}
            </div>
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
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Plancha asignada</label>
                  <select className="input-base" value={modal.press_equipment_id || ''} onChange={e => setModal({ ...modal, press_equipment_id: e.target.value || null })}>
                    <option value="">Sin plancha</option>
                    {presses.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Impresora asignada</label>
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

      {/* Catalog Product Modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{catModal.id ? 'Editar' : 'Nuevo'} producto</h3>
              <button onClick={() => setCatModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={catModal.name || ''} onChange={e => setCatModal({ ...catModal, name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea className="input-base text-sm" rows={2} value={catModal.description || ''} onChange={e => setCatModal({ ...catModal, description: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select className="input-base" value={catModal.category_id || ''} onChange={e => setCatModal({ ...catModal, category_id: e.target.value || null })}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Costos</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario ($)</label>
                    <NumericInput className="input-base" value={catModal.unit_cost || 0} onChange={v => setCatModal({ ...catModal, unit_cost: v })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta ($) *</label>
                    <NumericInput className="input-base" value={catModal.selling_price || 0} onChange={v => setCatModal({ ...catModal, selling_price: v })} /></div>
                </div>
                {(catModal.selling_price || 0) > 0 && (catModal.unit_cost || 0) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Margen: {Math.round((((catModal.selling_price || 0) - (catModal.unit_cost || 0)) / (catModal.selling_price || 1)) * 100)}%</p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Stock</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-gray-500">Gestionar stock</span>
                    <button type="button" onClick={() => setCatModal({ ...catModal, manage_stock: !catModal.manage_stock })}
                      className="relative w-9 h-5 rounded-full transition-colors" style={{ background: catModal.manage_stock ? '#6C5CE7' : '#D1D5DB' }}>
                      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: catModal.manage_stock ? 'translateX(16px)' : 'translateX(0)' }} />
                    </button>
                  </label>
                </div>
                {catModal.manage_stock && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Stock actual</label>
                      <NumericInput className="input-base" value={catModal.current_stock || 0} onChange={v => setCatModal({ ...catModal, current_stock: v })} /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo (alerta)</label>
                      <NumericInput className="input-base" value={catModal.min_stock || 0} onChange={v => setCatModal({ ...catModal, min_stock: v })} /></div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600" checked={catModal.visible_in_catalog ?? true}
                    onChange={() => setCatModal({ ...catModal, visible_in_catalog: !catModal.visible_in_catalog })} />
                  <span className="text-sm text-gray-700">Visible en catálogo web</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCatModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveCatalogProduct} disabled={saving || !catModal.name?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>{saving ? 'Guardando...' : 'Guardar producto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setStockModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {stockModal.type === 'history' ? (<>
              <h3 className="font-bold text-gray-900 mb-4">Historial — {stockModal.product.name}</h3>
              {stockModal.movements.length > 0 ? (
                <table className="w-full"><thead><tr className="border-b border-gray-100">
                  {['Fecha', 'Tipo', 'Cant.', 'Nota'].map(h => <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase px-2 py-1.5">{h}</th>)}
                </tr></thead><tbody>
                  {stockModal.movements.map(m => (
                    <tr key={m.id} className="border-b border-gray-50">
                      <td className="px-2 py-1.5 text-xs text-gray-500">{new Date(m.created_at).toLocaleDateString('es-AR')}</td>
                      <td className="px-2 py-1.5"><span className={`text-xs font-medium ${m.type === 'production' ? 'text-green-600' : m.type === 'sale' ? 'text-blue-600' : 'text-gray-600'}`}>{m.type === 'production' ? 'Producción' : m.type === 'sale' ? 'Venta' : 'Ajuste'}</span></td>
                      <td className="px-2 py-1.5 text-xs font-medium">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                      <td className="px-2 py-1.5 text-xs text-gray-400 truncate max-w-[120px]">{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody></table>
              ) : <p className="text-sm text-gray-400 text-center py-6">Sin movimientos registrados.</p>}
              <button onClick={() => setStockModal(null)} className="w-full mt-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cerrar</button>
            </>) : (<>
              <h3 className="font-bold text-gray-900 mb-4">
                {stockModal.type === 'produce' ? 'Producir unidades' : stockModal.type === 'sell' ? 'Registrar venta' : 'Ajustar stock'}
              </h3>
              <p className="text-sm text-gray-500 mb-3">{stockModal.product.name} — Stock actual: {stockModal.product.current_stock} u.</p>
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{stockModal.type === 'adjust' ? 'Nuevo stock' : 'Cantidad'}</label>
                  <NumericInput className="input-base" min={0} value={stockModal.qty} onChange={v => setStockModal({ ...stockModal, qty: v })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                  <input className="input-base text-sm" value={stockModal.note} onChange={e => setStockModal({ ...stockModal, note: e.target.value })} placeholder="Ej: Lote enero, Venta ML..." /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStockModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
                <button onClick={doStockAction} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>Confirmar</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {showCats && <CategoryModal categories={categories} onSave={saveCat} onDelete={deleteCat} onClose={() => { setShowCats(false); load() }} />}
    </div>
  )
}
