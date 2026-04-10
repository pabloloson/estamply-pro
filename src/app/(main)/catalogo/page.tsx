'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Eye, EyeOff, AlertTriangle, Upload, Image as ImageIcon, FolderOpen } from 'lucide-react'
import type { Category } from '@/features/taller/types'
import CategoryModal from '@/features/taller/components/CategoryModal'
import NumericInput from '@/shared/components/NumericInput'

interface CatalogProduct {
  id: string; name: string; description: string | null; category_id: string | null; photos: string[]
  cost_mode: 'calculated' | 'manual'; unit_cost: number; selling_price: number
  base_product_id: string | null; technique: string | null; zone_config: unknown; production_config: unknown; cost_breakdown: unknown
  manage_stock: boolean; current_stock: number; min_stock: number; visible_in_catalog: boolean
  sizes: string[] | null; colors: Array<{ name: string; hex: string }> | null; estimated_delivery: string | null
  precio_anterior: number | null; guia_talles_id: string | null
}
interface StockMovement { id: string; product_id: string; type: string; quantity: number; note: string | null; created_at: string }

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }
function marginColor(m: number) { return m >= 40 ? 'text-green-600' : m >= 20 ? 'text-amber-600' : 'text-red-500' }

export default function CatalogoPage() {
  const supabase = createClient()
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [guiasTalles, setGuiasTalles] = useState<Array<{ id: string; nombre: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [catModal, setCatModal] = useState<Partial<CatalogProduct> | null>(null)
  const [stockModal, setStockModal] = useState<{ product: CatalogProduct; type: 'produce' | 'sell' | 'adjust' | 'history'; qty: number; note: string; movements: StockMovement[] } | null>(null)
  const [stockPopover, setStockPopover] = useState<string | null>(null)
  const [showCats, setShowCats] = useState(false)
  const [catFilter, setCatFilter] = useState('all')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [{ data: cp }, { data: c }, { data: gt }] = await Promise.all([
      supabase.from('catalog_products').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('guias_talles').select('id,nombre').order('orden'),
    ])
    setCatalogProducts((cp || []) as CatalogProduct[]); setCategories(c || []); if (gt) setGuiasTalles(gt); setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Photo upload
  async function uploadPhoto(file: File) {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user?.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('product-photos').upload(path, file)
    setUploading(false)
    if (error) { alert('Error subiendo foto'); return null }
    const { data: { publicUrl } } = supabase.storage.from('product-photos').getPublicUrl(path)
    return publicUrl
  }
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !catModal) return
    const currentPhotos = catModal.photos || []
    if (currentPhotos.length >= 3) return
    for (const file of Array.from(files).slice(0, 3 - currentPhotos.length)) {
      const url = await uploadPhoto(file)
      if (url) setCatModal(prev => prev ? { ...prev, photos: [...(prev.photos || []), url] } : prev)
    }
    if (fileRef.current) fileRef.current.value = ''
  }
  function removePhoto(idx: number) {
    if (!catModal) return
    setCatModal({ ...catModal, photos: (catModal.photos || []).filter((_, i) => i !== idx) })
  }

  // Catalog product CRUD
  async function saveCatalogProduct() {
    if (!catModal?.name) return; setSaving(true)
    const payload = {
      name: catModal.name, description: catModal.description || null,
      category_id: catModal.category_id || null, photos: catModal.photos || [],
      cost_mode: catModal.cost_mode || 'manual',
      base_product_id: catModal.base_product_id || null, technique: catModal.technique || null,
      zone_config: catModal.zone_config || null, production_config: catModal.production_config || null,
      unit_cost: catModal.unit_cost || 0, cost_breakdown: catModal.cost_breakdown || null,
      selling_price: catModal.selling_price || 0,
      manage_stock: catModal.manage_stock ?? false, current_stock: catModal.current_stock || 0,
      min_stock: catModal.min_stock || 0, visible_in_catalog: catModal.visible_in_catalog ?? true,
      sizes: (catModal.sizes?.length) ? catModal.sizes : null,
      colors: (catModal.colors?.length) ? catModal.colors : null,
      estimated_delivery: catModal.estimated_delivery || null,
      precio_anterior: catModal.precio_anterior || null,
      guia_talles_id: catModal.guia_talles_id || null,
    }
    if (catModal.id) await supabase.from('catalog_products').update(payload).eq('id', catModal.id)
    else await supabase.from('catalog_products').insert(payload)
    setCatModal(null); setSaving(false); load()
  }
  async function deleteCatalogProduct(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('catalog_products').delete().eq('id', id); load() } }

  // Stock
  async function doStockAction() {
    if (!stockModal) return
    const { product, type, qty, note } = stockModal
    let delta = type === 'produce' ? qty : type === 'sell' ? -qty : qty - product.current_stock
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

  const filtered = catalogProducts.filter(p => {
    if (catFilter === 'stock') return p.manage_stock && p.current_stock > 0
    if (catFilter === 'ondemand') return !p.manage_stock
    if (catFilter === 'visible') return p.visible_in_catalog
    if (catFilter === 'hidden') return !p.visible_in_catalog
    return true
  })

  const catMargin = (catModal?.selling_price || 0) > 0 && (catModal?.unit_cost || 0) > 0
    ? Math.round((((catModal?.selling_price || 0) - (catModal?.unit_cost || 0)) / (catModal?.selling_price || 1)) * 100) : 0

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div onClick={() => stockPopover && setStockPopover(null)}>
      <div className="flex items-start justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-500 text-sm mt-1">Tus productos de venta y marca propia</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowCats(true)} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <FolderOpen size={14} /> Categorías
          </button>
          <button onClick={() => setCatModal({ cost_mode: 'manual', unit_cost: 0, selling_price: 0, manage_stock: false, current_stock: 0, min_stock: 0, visible_in_catalog: true, photos: [] })}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}><Plus size={14} /> Agregar</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[['all', 'Todos'], ['stock', 'Con stock'], ['ondemand', 'A pedido'], ['visible', 'Visible'], ['hidden', 'No visible']].map(([id, label]) => (
          <button key={id} onClick={() => setCatFilter(id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${catFilter === id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>
        ))}
      </div>

      {/* Product table */}
      <div className="card" style={{ overflow: 'visible' }}>
        <div>
          <table className="w-full"><thead><tr className="border-b border-gray-100">
            {['', 'Nombre', 'Costo', 'Precio', 'Margen', 'Stock', '', ''].map((h, i) =>
              <th key={i} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">{h}</th>)}
          </tr></thead><tbody>
            {filtered.map(p => {
              const margin = p.selling_price > 0 ? Math.round(((p.selling_price - p.unit_cost) / p.selling_price) * 100) : 0
              const lowStock = p.manage_stock && p.current_stock <= p.min_stock
              const photo = (p.photos || [])[0]
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 w-10">
                    {photo ? <img src={photo} alt="" className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><ImageIcon size={14} className="text-gray-300" /></div>}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.description}</p>}
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-sm">{fmt(p.unit_cost)}</td>
                  <td className="px-3 py-3 font-semibold text-gray-800 text-sm">{fmt(p.selling_price)}</td>
                  <td className="px-3 py-3"><span className={`text-sm font-medium ${marginColor(margin)}`}>{margin}%</span></td>
                  <td className="px-3 py-3 text-sm">
                    {p.manage_stock ? (
                      <div className="relative inline-block">
                        <button onClick={e => { e.stopPropagation(); setStockPopover(stockPopover === p.id ? null : p.id) }} className={`flex items-center gap-1 cursor-pointer ${lowStock ? 'text-red-500 font-medium' : 'text-gray-600 hover:text-gray-800'}`}>
                          {lowStock && <AlertTriangle size={12} />}{p.current_stock} u.
                        </button>
                        {stockPopover === p.id && (
                          <div className="absolute left-0 top-full mt-1 w-48 py-2 bg-white rounded-lg z-50" onClick={e => e.stopPropagation()}
                            style={{ border: '1px solid #e5e5e5', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            <p className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1 pb-1.5">Stock: {p.current_stock} u.</p>
                            <button onClick={() => { setStockPopover(null); setStockModal({ product: p, type: 'produce', qty: 0, note: '', movements: [] }) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 text-gray-700 transition-colors">+ Producir</button>
                            <button onClick={() => { setStockPopover(null); setStockModal({ product: p, type: 'sell', qty: 0, note: '', movements: [] }) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 text-gray-700 transition-colors">− Vender</button>
                            <button onClick={() => { setStockPopover(null); setStockModal({ product: p, type: 'adjust', qty: p.current_stock, note: '', movements: [] }) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 text-gray-700 transition-colors">⟳ Ajustar</button>
                            <div className="border-t border-gray-100 mt-1 pt-1">
                              <button onClick={() => { setStockPopover(null); openHistory(p) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 text-gray-400 transition-colors">📋 Historial</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : <span className="text-gray-400 text-xs">A pedido</span>}
                  </td>
                  <td className="px-3 py-3">{p.visible_in_catalog ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-gray-300" />}</td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={() => setCatModal(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                    <button onClick={() => deleteCatalogProduct(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                  </div></td>
                </tr>
              )
            })}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No hay productos en esta vista.</div>}
        </div>
      </div>

      {/* Catalog Product Modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{catModal.id ? 'Editar' : 'Nuevo'} producto</h3>
              <button onClick={() => setCatModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fotos</label>
                <div className="flex gap-2 flex-wrap">
                  {(catModal.photos || []).map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X size={14} className="text-white" /></button>
                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-purple-600 text-white">Principal</span>}
                    </div>
                  ))}
                  {(catModal.photos || []).length < 3 && (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-purple-300 transition-colors">
                      {uploading ? <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" /> : <Upload size={16} className="text-gray-300" />}
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={catModal.name || ''} onChange={e => setCatModal({ ...catModal, name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea className="input-base text-sm" rows={2} value={catModal.description || ''} onChange={e => setCatModal({ ...catModal, description: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select className="input-base" value={catModal.category_id || ''} onChange={e => setCatModal({ ...catModal, category_id: e.target.value || null })}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>

              {/* Cost & Price */}
              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Costo ($)</label>
                    <NumericInput className="input-base" value={catModal.unit_cost || 0} onChange={v => setCatModal({ ...catModal, unit_cost: v })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio ($) *</label>
                    <NumericInput className="input-base" value={catModal.selling_price || 0} onChange={v => setCatModal({ ...catModal, selling_price: v })} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio anterior</label>
                    <NumericInput className="input-base" value={catModal.precio_anterior || 0} onChange={v => setCatModal({ ...catModal, precio_anterior: v || null })} /></div>
                </div>
                {catMargin > 0 && <p className={`text-xs font-medium mt-1.5 ${marginColor(catMargin)}`}>Margen: {catMargin}%</p>}
                {(catModal.precio_anterior || 0) > (catModal.selling_price || 0) && <p className="text-xs text-red-500 mt-0.5">-{Math.round((1 - (catModal.selling_price || 0) / (catModal.precio_anterior || 1)) * 100)}% de descuento</p>}
              </div>

              {/* Variants */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Variantes <span className="font-normal text-gray-400">(opcional)</span></p>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Talles</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => {
                      const active = (catModal.sizes || []).includes(s)
                      return <button key={s} type="button" onClick={() => setCatModal({ ...catModal, sizes: active ? (catModal.sizes || []).filter(x => x !== s) : [...(catModal.sizes || []), s] })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${active ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{s}</button>
                    })}
                    <button type="button" onClick={() => { const t = prompt('Talle personalizado:'); if (t?.trim()) setCatModal({ ...catModal, sizes: [...(catModal.sizes || []), t.trim()] }) }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-400 hover:bg-gray-100">+ Otro</button>
                  </div>
                  {(catModal.sizes || []).filter(s => !['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(s)).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 mt-1 mr-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs">{s}
                      <button onClick={() => setCatModal({ ...catModal, sizes: (catModal.sizes || []).filter(x => x !== s) })} className="text-purple-400 hover:text-purple-600"><X size={10} /></button></span>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Colores</label>
                  <div className="space-y-1.5">
                    {(catModal.colors || []).map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="color" className="w-7 h-7 rounded border border-gray-200 cursor-pointer" value={c.hex}
                          onChange={e => { const arr = [...(catModal.colors || [])]; arr[i] = { ...arr[i], hex: e.target.value }; setCatModal({ ...catModal, colors: arr }) }} />
                        <input className="input-base text-sm flex-1" value={c.name} placeholder="Nombre del color"
                          onChange={e => { const arr = [...(catModal.colors || [])]; arr[i] = { ...arr[i], name: e.target.value }; setCatModal({ ...catModal, colors: arr }) }} />
                        <button onClick={() => setCatModal({ ...catModal, colors: (catModal.colors || []).filter((_, j) => j !== i) })} className="p-1 hover:bg-red-50 rounded"><Trash2 size={12} className="text-red-400" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setCatModal({ ...catModal, colors: [...(catModal.colors || []), { name: '', hex: '#000000' }] })}
                      className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"><Plus size={12} /> Agregar color</button>
                  </div>
                </div>
              </div>

              {/* Size guide */}
              {(catModal.sizes?.length ?? 0) > 0 && guiasTalles.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guía de talles</label>
                  <select className="input-base text-sm" value={catModal.guia_talles_id || ''} onChange={e => setCatModal({ ...catModal, guia_talles_id: e.target.value || null })}>
                    <option value="">Sin guía</option>
                    {guiasTalles.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Delivery time */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo de entrega <span className="font-normal text-gray-400">(opcional)</span></label>
                <input className="input-base text-sm" placeholder="Ej: 3-5 días hábiles" value={catModal.estimated_delivery || ''} onChange={e => setCatModal({ ...catModal, estimated_delivery: e.target.value })} />
              </div>

              {/* Stock */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Stock</p>
                  <button type="button" onClick={() => setCatModal({ ...catModal, manage_stock: !catModal.manage_stock })}
                    className="relative w-9 h-5 rounded-full transition-colors" style={{ background: catModal.manage_stock ? '#6C5CE7' : '#D1D5DB' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: catModal.manage_stock ? 'translateX(16px)' : 'translateX(0)' }} />
                  </button>
                </div>
                {catModal.manage_stock && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Stock actual</label>
                      <NumericInput className="input-base" value={catModal.current_stock || 0} onChange={v => setCatModal({ ...catModal, current_stock: v })} /></div>
                    <div><label className="block text-xs font-medium text-gray-600 mb-1">Stock mínimo</label>
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
                      <td className="px-2 py-1.5"><span className={`text-xs font-medium ${m.type === 'produce' ? 'text-green-600' : m.type === 'sell' ? 'text-blue-600' : 'text-gray-600'}`}>{m.type === 'produce' ? 'Producción' : m.type === 'sell' ? 'Venta' : 'Ajuste'}</span></td>
                      <td className="px-2 py-1.5 text-xs font-medium">{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                      <td className="px-2 py-1.5 text-xs text-gray-400 truncate max-w-[120px]">{m.note || '—'}</td>
                    </tr>
                  ))}
                </tbody></table>
              ) : <p className="text-sm text-gray-400 text-center py-6">Sin movimientos.</p>}
              <button onClick={() => setStockModal(null)} className="w-full mt-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cerrar</button>
            </>) : (<>
              <h3 className="font-bold text-gray-900 mb-4">
                {stockModal.type === 'produce' ? '+ Producir' : stockModal.type === 'sell' ? '− Vender' : '⟳ Ajustar stock'}
              </h3>
              <p className="text-sm text-gray-500 mb-3">{stockModal.product.name} — Stock: {stockModal.product.current_stock} u.</p>
              <div className="space-y-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{stockModal.type === 'adjust' ? 'Nuevo stock' : 'Cantidad'}</label>
                  <NumericInput className="input-base" min={0} value={stockModal.qty} onChange={v => setStockModal({ ...stockModal, qty: v })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nota (opcional)</label>
                  <input className="input-base text-sm" value={stockModal.note} onChange={e => setStockModal({ ...stockModal, note: e.target.value })} /></div>
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
