// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/db/client'
import { Plus, Pencil, Trash2, X, Eye, EyeOff, AlertTriangle, Upload, Image as ImageIcon, FolderOpen, Star, Package, ExternalLink, Globe, Copy, MessageCircle } from 'lucide-react'

import type { Category } from '@/features/taller/types'
import CategoryModal from '@/features/taller/components/CategoryModal'
import NumericInput from '@/shared/components/NumericInput'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'
import { usePermissions } from '@/shared/context/PermissionsContext'

interface CatalogProduct {
  id: string; name: string; description: string | null; category_id: string | null; photos: string[]
  cost_mode: 'calculated' | 'manual'; unit_cost: number; selling_price: number
  base_product_id: string | null; technique: string | null; zone_config: unknown; production_config: unknown; cost_breakdown: unknown
  manage_stock: boolean; current_stock: number; min_stock: number; visible_in_catalog: boolean
  sizes: string[] | null; colors: Array<{ name: string; hex: string }> | null; estimated_delivery: string | null
  precio_anterior: number | null; guia_talles_id: string | null
  featured: boolean; sort_order: number; slug: string | null
}
interface StockMovement { id: string; product_id: string; type: string; quantity: number; note: string | null; created_at: string }

function marginColor(m: number) { return m >= 40 ? 'text-green-600' : m >= 20 ? 'text-amber-600' : 'text-red-500' }
function generateSlug(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[×]/g, 'x').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function CatalogoPage() {
  const supabase = createClient()
  const t = useTranslations('catalog')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency } = useLocale()
  const { showCosts } = usePermissions()
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
  const [catCategoryFilter, setCatCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [catalogSlug, setCatalogSlug] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [{ data: cp }, { data: c }, { data: gt }, { data: ws }] = await Promise.all([
      supabase.from('catalog_products').select('*').order('sort_order').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('guias_talles').select('id,nombre').order('orden'),
      supabase.from('workshop_settings').select('settings').single(),
    ])
    setCatalogProducts((cp || []) as CatalogProduct[]); setCategories(c || []); if (gt) setGuiasTalles(gt)
    if (ws?.settings && (ws.settings as Record<string, unknown>).catalog_slug) {
      setCatalogSlug((ws.settings as Record<string, unknown>).catalog_slug as string)
    }
    setLoading(false)
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
  const [priceError, setPriceError] = useState('')
  async function saveCatalogProduct() {
    if (!catModal?.name) return
    if (!catModal.selling_price || catModal.selling_price <= 0) { setPriceError('El precio debe ser mayor a 0'); return }
    setPriceError(''); setSaving(true)
    const slug = catModal.slug || generateSlug(catModal.name)
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
      slug,
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

  async function toggleFeatured(p: CatalogProduct) {
    const newVal = !p.featured
    await supabase.from('catalog_products').update({ featured: newVal }).eq('id', p.id)
    setCatalogProducts(prev => prev.map(x => x.id === p.id ? { ...x, featured: newVal } : x))
  }
  async function toggleVisibility(p: CatalogProduct) {
    const newVal = !p.visible_in_catalog
    await supabase.from('catalog_products').update({ visible_in_catalog: newVal }).eq('id', p.id)
    setCatalogProducts(prev => prev.map(x => x.id === p.id ? { ...x, visible_in_catalog: newVal } : x))
  }

  function effectivePrice(p: CatalogProduct) { return (p.precio_anterior && p.precio_anterior > 0 && p.selling_price < p.precio_anterior) ? p.selling_price : p.selling_price }
  function effectiveMargin(p: CatalogProduct) {
    const price = effectivePrice(p)
    return price > 0 && p.unit_cost > 0 ? Math.round(((price - p.unit_cost) / price) * 100) : 0
  }

  const filterOptions: [string, string][] = [['all', t('allProducts')], ['featured', 'Destacados'], ['stock', t('withStock')], ['ondemand', t('onDemand')], ['visible', t('visible')], ['hidden', t('hidden')]]
  const activeFilterCount = (catFilter !== 'all' ? 1 : 0) + (catCategoryFilter ? 1 : 0)

  const filtered = catalogProducts.filter(p => {
    // Status filter
    if (catFilter === 'stock' && !(p.manage_stock && p.current_stock > 0)) return false
    if (catFilter === 'ondemand' && p.manage_stock) return false
    if (catFilter === 'visible' && !p.visible_in_catalog) return false
    if (catFilter === 'hidden' && p.visible_in_catalog) return false
    if (catFilter === 'featured' && !p.featured) return false
    // Category filter
    if (catCategoryFilter === 'none' && p.category_id) return false
    if (catCategoryFilter && catCategoryFilter !== 'none' && p.category_id !== catCategoryFilter) return false
    // Search
    if (search) {
      const s = search.toLowerCase()
      const catName = categories.find(c => c.id === p.category_id)?.name || ''
      if (!p.name.toLowerCase().includes(s) && !(p.description || '').toLowerCase().includes(s) && !catName.toLowerCase().includes(s)) return false
    }
    return true
  })

  const catMargin = (catModal?.selling_price || 0) > 0 && (catModal?.unit_cost || 0) > 0
    ? Math.round((((catModal?.selling_price || 0) - (catModal?.unit_cost || 0)) / (catModal?.selling_price || 1)) * 100) : 0

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>

  return (
    <div onClick={() => stockPopover && setStockPopover(null)}>
      {/* Header — compact on mobile */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1 hidden md:block">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {catalogSlug && (
            <>
              <a href={`/catalogo/${catalogSlug}`} target="_blank"
                className="lg:hidden w-10 h-10 rounded-xl border border-[#E5E5E3] text-gray-500 flex items-center justify-center hover:bg-[#F8F7F4] transition-colors">
                <ExternalLink size={18} />
              </a>
              <a href={`/catalogo/${catalogSlug}`} target="_blank"
                className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors">
                <ExternalLink size={16} /> Ver tienda
              </a>
            </>
          )}
          <button onClick={() => setShowCats(true)} className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors">
            <FolderOpen size={14} /> {t('categories')}
          </button>
          <button onClick={() => setCatModal({ cost_mode: 'manual', unit_cost: 0, selling_price: 0, manage_stock: false, current_stock: 0, min_stock: 0, visible_in_catalog: true, photos: [] })}
            className="lg:hidden w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center hover:bg-[#0D9488] transition-colors"><Plus size={20} /></button>
          <button onClick={() => setCatModal({ cost_mode: 'manual', unit_cost: 0, selling_price: 0, manage_stock: false, current_stock: 0, min_stock: 0, visible_in_catalog: true, photos: [] })}
            className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors"><Plus size={16} /> {t('addProduct')}</button>
        </div>
      </div>

      {/* Desktop filters — inline chips */}
      <div className="hidden md:flex gap-1.5 mb-3 flex-wrap items-center">
        {filterOptions.map(([id, label]) => (
          <button key={id} onClick={() => setCatFilter(id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${catFilter === id ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-[#F3F3F1]'}`}>{label}</button>
        ))}
        {categories.length > 0 && (
          <select value={catCategoryFilter} onChange={e => setCatCategoryFilter(e.target.value)}
            className="text-xs font-semibold rounded-full px-3 py-1 bg-gray-100 text-gray-500 border-none outline-none cursor-pointer">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="none">Sin categoría</option>
          </select>
        )}
      </div>

      {/* Mobile: Filtros button + Search in one row */}
      <div className="md:hidden flex gap-2 mb-2">
        <button onClick={() => setMobileFiltersOpen(true)}
          className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${activeFilterCount > 0 ? 'border-teal-300 text-teal-700 bg-teal-50' : 'border-gray-200 text-gray-500'}`}>
          Filtros{activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-teal-700 text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>}
        </button>
        <div className="relative flex-1">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-base text-xs !py-2 !pl-8 w-full" placeholder="Buscar..." />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">🔍</span>
        </div>
      </div>
      {/* Mobile active filter chips */}
      {activeFilterCount > 0 && (
        <div className="md:hidden flex gap-1.5 flex-wrap mb-2">
          {catFilter !== 'all' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 flex items-center gap-1">
              {filterOptions.find(([id]) => id === catFilter)?.[1]}
              <button onClick={() => setCatFilter('all')}>✕</button>
            </span>
          )}
          {catCategoryFilter && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 flex items-center gap-1">
              {catCategoryFilter === 'none' ? 'Sin categoría' : categories.find(c => c.id === catCategoryFilter)?.name}
              <button onClick={() => setCatCategoryFilter('')}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* Desktop search — full width below filters */}
      <div className="relative mb-4 hidden md:block">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          className="input-base text-sm !pl-9" placeholder="Buscar por nombre, categoría o código..." />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      </div>

      {/* URL bar — public catalog link */}
      {catalogSlug && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8F7F4] border border-[#E5E5E3] mb-4">
          <Globe size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate flex-1">
            estamply.app/catalogo/{catalogSlug}
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(`https://www.estamply.app/catalogo/${catalogSlug}`); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E5E5E3] text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <Copy size={12} /> {linkCopied ? '¡Copiado!' : 'Copiar'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent('Mirá mi catálogo: https://www.estamply.app/catalogo/' + catalogSlug)}`}
            target="_blank"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] text-white text-xs font-medium hover:bg-[#20BD5A] transition-colors flex-shrink-0"
          >
            <MessageCircle size={12} /> <span className="hidden sm:inline">Compartir</span>
          </a>
        </div>
      )}

      {/* Mobile bottom sheet for filters */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-5 pb-8 max-h-[60vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 200ms ease-out' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Filtros</h3>
              <button onClick={() => setMobileFiltersOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Estado</p>
                <div className="flex gap-1.5 flex-wrap">
                  {filterOptions.map(([id, label]) => (
                    <button key={id} onClick={() => setCatFilter(id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${catFilter === id ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>
                  ))}
                </div>
              </div>
              {categories.length > 0 && <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Categoría</p>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setCatCategoryFilter('')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${!catCategoryFilter ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-[#F3F3F1]'}`}>Todas</button>
                  {categories.map(c => (
                    <button key={c.id} onClick={() => setCatCategoryFilter(c.id)} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${catCategoryFilter === c.id ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-[#F3F3F1]'}`}>{c.name}</button>
                  ))}
                  <button onClick={() => setCatCategoryFilter('none')} className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${catCategoryFilter === 'none' ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-[#F3F3F1]'}`}>Sin categoría</button>
                </div>
              </div>}
            </div>
            <button onClick={() => setMobileFiltersOpen(false)} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0F766E' }}>Aplicar</button>
            {activeFilterCount > 0 && (
              <button onClick={() => { setCatFilter('all'); setCatCategoryFilter(''); setMobileFiltersOpen(false) }}
                className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 text-center">Limpiar filtros</button>
            )}
          </div>
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map(p => {
          const margin = effectiveMargin(p)
          const lowStock = p.manage_stock && p.current_stock <= p.min_stock && p.current_stock > 0
          const photo = (p.photos || [])[0]
          const catName = categories.find(c => c.id === p.category_id)?.name
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 active:bg-gray-50 transition-colors"
              onClick={() => setCatModal(p)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {photo
                    ? <img src={photo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><ImageIcon size={14} className="text-gray-300" /></div>}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{catName || 'Sin categoría'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); toggleFeatured(p) }} className="p-1">
                    <Star size={14} className={p.featured ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); toggleVisibility(p) }} className="p-1">
                    {p.visible_in_catalog ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-gray-300" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteCatalogProduct(p.id) }} className="p-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <div>
                  <span className="text-gray-400">{t('price')}</span>
                  {p.precio_anterior && p.precio_anterior > 0 && p.selling_price < p.precio_anterior
                    ? <p className="font-semibold"><span className="text-gray-400 line-through text-[10px]">{fmtCurrency(p.precio_anterior)}</span> <span className="text-green-600">{fmtCurrency(p.selling_price)}</span></p>
                    : <p className="font-semibold text-gray-700">{fmtCurrency(p.selling_price)}</p>}
                </div>
                {showCosts && (
                  <div>
                    <span className="text-gray-400">{t('cost')}</span>
                    <p className="font-semibold text-gray-700">{p.unit_cost ? fmtCurrency(p.unit_cost) : '—'}</p>
                  </div>
                )}
                {showCosts && (
                  <div>
                    <span className="text-gray-400">{t('margin')}</span>
                    <p className={`font-semibold ${p.unit_cost ? marginColor(margin) : 'text-gray-300'}`}>{p.unit_cost ? `${margin}%` : '—'}</p>
                  </div>
                )}
                <div className="ml-auto text-right">
                  {p.manage_stock ? (
                    p.current_stock <= 0 ? (
                      <p className="font-medium text-red-500">Sin stock</p>
                    ) : lowStock ? (
                      <p className="font-medium text-amber-600">⚠ {p.current_stock}</p>
                    ) : (
                      <p className="font-medium text-gray-600">{p.current_stock} en stock</p>
                    )
                  ) : (
                    <span className="text-green-600 font-medium">Disponible</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (catalogProducts.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E5E5E3] bg-[#FAFAF8] flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center">
                <Package size={24} className="text-[#0F766E]" />
              </div>
              <div className="text-center px-8">
                <p className="text-sm font-semibold text-gray-700">Cargá los productos de tu tienda</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Productos terminados con diseño y precio de venta para tu catálogo web</p>
              </div>
              <button onClick={() => setCatModal({})} className="mt-2 px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors">
                + Agregar producto
              </button>
            </div> : <div className="text-center py-12 text-gray-400">No hay productos en esta vista.</div>)}
      </div>

      {/* Product table */}
      <div className="hidden md:block card" style={{ overflow: 'visible' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]"><thead><tr className="border-b border-gray-100">
            {['', t('productName').replace(' *', ''), t('price'), ...(showCosts ? [t('cost')] : []), ...(showCosts ? [t('margin')] : []), 'Disponibilidad', '', ''].map((h, i) =>
              <th key={i} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">{h}</th>)}
          </tr></thead><tbody>
            {filtered.map(p => {
              const margin = effectiveMargin(p)
              const lowStock = p.manage_stock && p.current_stock <= p.min_stock && p.current_stock > 0
              const noStock = p.manage_stock && p.current_stock <= 0
              const photo = (p.photos || [])[0]
              const catName = categories.find(c => c.id === p.category_id)?.name
              const hasPromo = p.precio_anterior && p.precio_anterior > 0 && p.selling_price < p.precio_anterior
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setCatModal(p)}>
                  <td className="px-3 py-2 w-10">
                    {photo ? <img src={photo} alt="" className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><ImageIcon size={14} className="text-gray-300" /></div>}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[250px]">{[p.description, catName].filter(Boolean).join(' · ') || ''}</p>
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {hasPromo ? (
                      <div><span className="text-gray-400 line-through text-xs">{fmtCurrency(p.precio_anterior!)}</span> <span className="font-semibold text-green-600">{fmtCurrency(p.selling_price)}</span></div>
                    ) : <span className="font-semibold text-gray-800">{fmtCurrency(p.selling_price)}</span>}
                  </td>
                  {showCosts && <td className="px-3 py-3 text-gray-600 text-sm">{p.unit_cost ? fmtCurrency(p.unit_cost) : '—'}</td>}
                  {showCosts && <td className="px-3 py-3"><span className={`text-sm font-medium ${p.unit_cost ? marginColor(margin) : 'text-gray-300'}`}>{p.unit_cost ? `${margin}%` : '—'}</span></td>}
                  <td className="px-3 py-3 text-sm">
                    {p.manage_stock ? (
                      noStock ? (
                        <span className="text-red-500 font-medium text-xs">Sin stock</span>
                      ) : (
                        <div className="relative inline-block">
                          <button onClick={e => { e.stopPropagation(); setStockPopover(stockPopover === p.id ? null : p.id) }} className={`flex items-center gap-1 cursor-pointer ${lowStock ? 'text-amber-600 font-semibold' : 'text-gray-600'} hover:text-gray-800`}>
                            {lowStock && <AlertTriangle size={12} />}{p.current_stock} en stock
                          </button>
                          {stockPopover === p.id && (
                            <div className="absolute left-0 top-full mt-1 w-48 py-2 bg-white rounded-lg z-50" onClick={e => e.stopPropagation()}
                              style={{ border: '1px solid #e5e5e5', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                              <p className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100 mb-1 pb-1.5">Stock: {p.current_stock} u.</p>
                              <button onClick={() => { setStockPopover(null); setStockModal({ product: p, type: 'produce', qty: 0, note: '', movements: [] }) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 text-gray-700 transition-colors">+ Producir</button>
                              <button onClick={() => { setStockPopover(null); setStockModal({ product: p, type: 'sell', qty: 0, note: '', movements: [] }) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 text-gray-700 transition-colors">− Vender</button>
                              <button onClick={() => { setStockPopover(null); setStockModal({ product: p, type: 'adjust', qty: p.current_stock, note: '', movements: [] }) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 text-gray-700 transition-colors">⟳ Ajustar</button>
                              <div className="border-t border-gray-100 mt-1 pt-1">
                                <button onClick={() => { setStockPopover(null); openHistory(p) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-teal-50 text-gray-400 transition-colors">📋 Historial</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    ) : <span className="text-green-600 text-xs font-medium">Disponible</span>}
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={e => { e.stopPropagation(); toggleVisibility(p) }} className="p-1 rounded hover:bg-gray-100" title={p.visible_in_catalog ? 'Ocultar del catálogo' : 'Mostrar en catálogo'}>
                      {p.visible_in_catalog ? <Eye size={14} className="text-green-500" /> : <EyeOff size={14} className="text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-3 py-3"><div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); toggleFeatured(p) }} className="p-1.5 rounded-lg hover:bg-amber-50" title={p.featured ? 'Quitar destacado' : 'Destacar'}>
                      <Star size={14} className={p.featured ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                    </button>
                    <button onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                    <button onClick={e => { e.stopPropagation(); deleteCatalogProduct(p.id) }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                  </div></td>
                </tr>
              )
            })}
          </tbody></table>
          {filtered.length === 0 && (catalogProducts.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E5E5E3] bg-[#FAFAF8] flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center">
                <Package size={24} className="text-[#0F766E]" />
              </div>
              <div className="text-center px-8">
                <p className="text-sm font-semibold text-gray-700">Cargá los productos de tu tienda</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Productos terminados con diseño y precio de venta para tu catálogo web</p>
              </div>
              <button onClick={() => setCatModal({})} className="mt-2 px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors">
                + Agregar producto
              </button>
            </div> : <div className="text-center py-12 text-gray-400">No hay productos en esta vista.</div>)}
        </div>
      </div>

      {/* Catalog Product Modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{catModal.id ? t('editProduct') : t('newProduct')}</h3>
              <button onClick={() => setCatModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {/* Photos */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('photos')}</label>
                <div className="flex gap-2 flex-wrap">
                  {(catModal.photos || []).map((url, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X size={14} className="text-white" /></button>
                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-teal-700 text-white">{t('main')}</span>}
                    </div>
                  ))}
                  {(catModal.photos || []).length < 3 && (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-teal-300 transition-colors">
                      {uploading ? <div className="w-4 h-4 border-2 border-teal-300 border-t-teal-700 rounded-full animate-spin" /> : <Upload size={16} className="text-gray-300" />}
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('productName')}</label>
                <input className="input-base" value={catModal.name || ''} onChange={e => setCatModal({ ...catModal, name: e.target.value })} /></div>
              <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('description')}</label>
                <textarea className="input-base text-sm" rows={2} value={catModal.description || ''} onChange={e => setCatModal({ ...catModal, description: e.target.value })} /></div>
              <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('category')}</label>
                <select className="input-base" value={catModal.category_id || ''} onChange={e => setCatModal({ ...catModal, category_id: e.target.value || null })}>
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>

              {/* Cost & Price — responsive: 2 rows on mobile, 1 row on desktop */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className={`grid gap-3 grid-cols-2 ${showCosts ? 'md:grid-cols-3' : ''}`}>
                  <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('salePrice')} *</label>
                    <NumericInput className={`input-base ${priceError ? '!border-red-400' : ''}`} value={catModal.selling_price || 0} onChange={v => { setCatModal({ ...catModal, selling_price: v }); if (v > 0) setPriceError('') }} />
                    {priceError && <p className="text-[10px] text-red-500 mt-0.5">{priceError}</p>}</div>
                  {showCosts && <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('unitCost')}</label>
                    <NumericInput className="input-base" value={catModal.unit_cost || 0} onChange={v => setCatModal({ ...catModal, unit_cost: v })} /></div>}
                  <div className={showCosts ? 'hidden md:block' : ''}><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Precio promo ($)</label>
                    <NumericInput className="input-base" value={catModal.precio_anterior || 0} onChange={v => setCatModal({ ...catModal, precio_anterior: v || null })} /></div>
                </div>
                {showCosts && catMargin > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    <p className={`text-xs font-medium ${marginColor(catMargin)}`}>Margen: {catMargin}%</p>
                    {(catModal.precio_anterior || 0) > 0 && (catModal.selling_price || 0) > 0 && (catModal.unit_cost || 0) > 0 && (() => {
                      const promoMargin = Math.round(((catModal.selling_price! - catModal.unit_cost!) / catModal.selling_price!) * 100)
                      return catModal.precio_anterior! > catModal.selling_price! ? <p className="text-xs font-medium text-orange-500">Margen promo: {promoMargin}%</p> : null
                    })()}
                  </div>
                )}
                {/* Promo field on mobile — shown below margin when showCosts hides it from grid */}
                {showCosts && <div className="md:hidden"><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Precio promo ($)</label>
                  <NumericInput className="input-base" value={catModal.precio_anterior || 0} onChange={v => setCatModal({ ...catModal, precio_anterior: v || null })} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Si lo completás, aparece como oferta.</p></div>}
                {(catModal.precio_anterior || 0) > (catModal.selling_price || 0) && <p className="text-xs text-red-500">-{Math.round((1 - (catModal.selling_price || 0) / (catModal.precio_anterior || 1)) * 100)}% {t('discount')}</p>}
              </div>

              {/* Variants */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{t('variants')}</p>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('sizes')}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => {
                      const active = (catModal.sizes || []).includes(s)
                      return <button key={s} type="button" onClick={() => setCatModal({ ...catModal, sizes: active ? (catModal.sizes || []).filter(x => x !== s) : [...(catModal.sizes || []), s] })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? 'bg-[#0F766E] text-white' : 'bg-[#F3F3F1] text-gray-500 hover:bg-[#EBEBEA]'}`}>{s}</button>
                    })}
                    <button type="button" onClick={() => { const t = prompt('Talle personalizado:'); if (t?.trim()) setCatModal({ ...catModal, sizes: [...(catModal.sizes || []), t.trim()] }) }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-400 hover:bg-gray-100">+ Otro</button>
                  </div>
                  {(catModal.sizes || []).filter(s => !['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(s)).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 mt-1 mr-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-xs">{s}
                      <button onClick={() => setCatModal({ ...catModal, sizes: (catModal.sizes || []).filter(x => x !== s) })} className="text-teal-500 hover:text-teal-700"><X size={10} /></button></span>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('colors')}</label>
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
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"><Plus size={12} /> {t('addColor')}</button>
                  </div>
                </div>
              </div>

              {/* Size guide */}
              {(catModal.sizes?.length ?? 0) > 0 && guiasTalles.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('sizeGuide')}</label>
                  <select className="input-base text-sm" value={catModal.guia_talles_id || ''} onChange={e => setCatModal({ ...catModal, guia_talles_id: e.target.value || null })}>
                    <option value="">Sin guía</option>
                    {guiasTalles.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Delivery time */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('deliveryTime')}</label>
                <input className="input-base text-sm" placeholder="Ej: 3-5 días hábiles" value={catModal.estimated_delivery || ''} onChange={e => setCatModal({ ...catModal, estimated_delivery: e.target.value })} />
              </div>

              {/* Disponibilidad */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Disponibilidad</p>
                <div className="space-y-2">
                  {([
                    ['disponible', 'Siempre disponible', 'No maneja stock. Se muestra como disponible.'],
                    ['stock', 'Con stock', 'Se descuenta al vender. Alerta cuando llega al mínimo.'],
                    ['pedido', 'A pedido', 'Requiere consulta o personalización del cliente.'],
                  ] as const).map(([val, label, desc]) => {
                    const current = catModal.manage_stock ? 'stock' : ((catModal as Record<string, unknown>).disponibilidad === 'pedido' ? 'pedido' : 'disponible')
                    return (
                      <label key={val} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-all ${current === val ? 'border-[#CCFBF1] bg-[#F0FDFA]' : 'border-[#E5E5E3] hover:border-gray-300'}`}>
                        <input type="radio" name="disponibilidad" checked={current === val}
                          onChange={() => setCatModal({ ...catModal, manage_stock: val === 'stock', ...(val === 'pedido' ? { disponibilidad: 'pedido' } as Record<string, unknown> : { disponibilidad: val } as Record<string, unknown>) })}
                          className="mt-0.5 accent-[#0F766E]" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-[10px] text-gray-400">{desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {catModal.manage_stock && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('currentStock')}</label>
                      <NumericInput className="input-base" value={catModal.current_stock || 0} onChange={v => setCatModal({ ...catModal, current_stock: v })} /></div>
                    <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('minStock')}</label>
                      <NumericInput className="input-base" value={catModal.min_stock || 0} onChange={v => setCatModal({ ...catModal, min_stock: v })} /></div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 accent-[#0F766E]" checked={catModal.visible_in_catalog ?? true}
                    onChange={() => setCatModal({ ...catModal, visible_in_catalog: !catModal.visible_in_catalog })} />
                  <span className="text-sm text-gray-700">{t('visibleInCatalog')}</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCatModal(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors">{tc('cancel')}</button>
              <button onClick={saveCatalogProduct} disabled={saving || !catModal.name?.trim()} className="flex-1 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors disabled:opacity-40">{saving ? tc('saving') : t('saveProduct')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setStockModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              <button onClick={() => setStockModal(null)} className="w-full mt-4 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('close')}</button>
            </>) : (<>
              <h3 className="font-bold text-gray-900 mb-4">
                {stockModal.type === 'produce' ? '+ Producir' : stockModal.type === 'sell' ? '− Vender' : '⟳ Ajustar stock'}
              </h3>
              <p className="text-sm text-gray-500 mb-3">{stockModal.product.name} — Stock: {stockModal.product.current_stock} u.</p>
              <div className="space-y-3">
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{stockModal.type === 'adjust' ? 'Nuevo stock' : 'Cantidad'}</label>
                  <NumericInput className="input-base" min={0} value={stockModal.qty} onChange={v => setStockModal({ ...stockModal, qty: v })} /></div>
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Nota (opcional)</label>
                  <input className="input-base text-sm" value={stockModal.note} onChange={e => setStockModal({ ...stockModal, note: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStockModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
                <button onClick={doStockAction} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0F766E' }}>{tc('confirm')}</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {showCats && <CategoryModal categories={categories} onSave={saveCat} onDelete={deleteCat} onClose={() => { setShowCats(false); load() }} />}
    </div>
  )
}
