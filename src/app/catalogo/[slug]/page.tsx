'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart, X, Plus, Minus, Trash2, MessageCircle, ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import esMsg from '../../../../messages/es.json'
import ptMsg from '../../../../messages/pt.json'
import { formatCurrency, getCountry } from '@/shared/lib/currency'

// ── Types ──
interface CatalogProduct {
  id: string; name: string; description: string | null; photos: string[]
  selling_price: number; manage_stock: boolean; current_stock: number
  category_id: string | null; visible_in_catalog: boolean
  sizes: string[] | null; colors: Array<{ name: string; hex: string }> | null
  estimated_delivery: string | null; precio_anterior: number | null
  guia_talles_id: string | null; featured: boolean; sort_order: number
}
interface SizeGuide { id: string; nombre: string; columnas: string[]; filas: Array<Record<string, string>>; imagen_referencia: string | null }
interface Category { id: string; name: string }
interface ShopInfo {
  nombre: string; logo: string | null; color: string; description: string
  whatsapp: string; instagram: string; user_id: string; banner: string | null; direccion: string; city: string
  website: string; facebook: string; tiktok: string; youtube: string
  mediosPago: Array<{ id: string; nombre: string; tipo_ajuste: string; porcentaje: number }>
  lang: string; countryCode: string
  anuncio: { activo: boolean; texto: string; bgColor: string; textColor: string }
  waBotonVisible: boolean; waMensaje: string
}
interface CartItem { productId: string; name: string; price: number; quantity: number; photo: string; variant: string }

// ── Cart Context ──
const CartCtx = createContext<{
  items: CartItem[]; add: (p: CatalogProduct, qty: number, variant: string) => void
  update: (key: string, qty: number) => void; remove: (key: string) => void; total: number
}>({ items: [], add: () => {}, update: () => {}, remove: () => {}, total: 0 })

function CartProvider({ children, slug }: { children: React.ReactNode; slug: string }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(`cart-${slug}`) || '[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem(`cart-${slug}`, JSON.stringify(items)) }, [items, slug])
  const add = useCallback((p: CatalogProduct, qty: number, variant: string) => {
    const key = variant ? `${p.id}::${variant}` : p.id
    setItems(prev => {
      const existing = prev.find(i => (i.variant ? `${i.productId}::${i.variant}` : i.productId) === key)
      if (existing) return prev.map(i => (i.variant ? `${i.productId}::${i.variant}` : i.productId) === key ? { ...i, quantity: i.quantity + qty } : i)
      return [...prev, { productId: p.id, name: p.name, price: p.selling_price, quantity: qty, photo: (p.photos || [])[0] || '', variant }]
    })
  }, [])
  const itemKey = (i: CartItem) => i.variant ? `${i.productId}::${i.variant}` : i.productId
  const update = useCallback((key: string, qty: number) => {
    if (qty <= 0) setItems(prev => prev.filter(i => itemKey(i) !== key))
    else setItems(prev => prev.map(i => itemKey(i) === key ? { ...i, quantity: qty } : i))
  }, [])
  const remove = useCallback((key: string) => setItems(prev => prev.filter(i => itemKey(i) !== key)), [])
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  return <CartCtx.Provider value={{ items, add, update, remove, total }}>{children}</CartCtx.Provider>
}

// Currency formatting — set when shop loads
let _countryConfig = getCountry('AR')
let _msgs = esMsg as unknown as Record<string, Record<string, string>>
function fmt(n: number) { return formatCurrency(n, _countryConfig) }
function tc(ns: string, key: string) { return _msgs[ns]?.[key] || (esMsg as unknown as Record<string, Record<string, string>>)[ns]?.[key] || key }

// ── Main Page ──
export default function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>()
  const supabase = createClient()
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Find workshop by slug
      const { data: ws } = await supabase.from('workshop_settings').select('*')
      const match = ws?.find((w: Record<string, unknown>) => {
        const s = w.settings as Record<string, unknown> | null
        return s?.catalog_slug === slug
      })
      if (!match) { setError('Catálogo no encontrado'); setLoading(false); return }
      const s = match.settings as Record<string, unknown>
      const userId = match.user_id as string
      // Fetch profile for business info (phone, name, logo, instagram, address)
      const { data: prof } = await supabase.from('profiles').select('business_name,business_phone,business_instagram,business_logo_url,business_address,city,business_website,facebook,tiktok,youtube').eq('id', userId).single()
      const p = (prof || {}) as Record<string, string>
      setShop({
        nombre: (s.nombre_tienda as string) || (s.nombre_taller as string) || (p.business_name as string) || 'Mi Taller',
        logo: (s.logo_url as string) || (p.business_logo_url as string) || null,
        color: (s.brand_color as string) || '#6C5CE7',
        description: (s.descripcion_tienda as string) || (s.brand_description as string) || '',
        whatsapp: (p.business_phone as string) || '',
        instagram: (p.business_instagram as string) || '',
        user_id: userId,
        banner: (s.banner_url as string) || null,
        direccion: (p.business_address as string) || '',
        city: (p.city as string) || '',
        website: (p.business_website as string) || '',
        facebook: (p.facebook as string) || '',
        tiktok: (p.tiktok as string) || '',
        youtube: (p.youtube as string) || '',
        anuncio: {
          activo: !!(s.anuncio_activo) && !!(s.anuncio_texto),
          texto: (s.anuncio_texto as string) || '',
          bgColor: (s.anuncio_color_fondo as string) || (s.brand_color as string) || '#6C5CE7',
          textColor: (s.anuncio_color_texto as string) || '#FFFFFF',
        },
        mediosPago: [],
        lang: (s.idioma as string) || 'es',
        countryCode: (s.pais as string) || 'AR',
        waBotonVisible: s.wa_boton_visible !== false,
        waMensaje: (s.wa_mensaje as string) || '',
      })
      // Set module-level formatting
      _countryConfig = getCountry((s.pais as string) || 'AR')
      _msgs = ((s.idioma as string) === 'pt' ? ptMsg : esMsg) as unknown as Record<string, Record<string, string>>
      const [{ data: prods }, { data: cats }, { data: mp }, { data: sg }] = await Promise.all([
        supabase.from('catalog_products').select('id,name,description,photos,selling_price,manage_stock,current_stock,category_id,visible_in_catalog,sizes,colors,estimated_delivery,precio_anterior,guia_talles_id,featured,sort_order').eq('user_id', userId).eq('visible_in_catalog', true).gt('selling_price', 0).order('sort_order').order('name'),
        supabase.from('categories').select('id,name').eq('user_id', userId),
        supabase.from('medios_pago').select('id,nombre,tipo_ajuste,porcentaje').eq('user_id', userId).eq('activo', true).order('orden'),
        supabase.from('guias_talles').select('id,nombre,columnas,filas,imagen_referencia').eq('user_id', userId),
      ])
      if (mp?.length) setShop(prev => prev ? { ...prev, mediosPago: mp as ShopInfo['mediosPago'] } : prev)
      if (sg) setSizeGuides(sg as SizeGuide[])
      setProducts((prods || []) as CatalogProduct[])
      setCategories((cats || []) as Category[])
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>
  if (error || !shop) return <div className="flex items-center justify-center min-h-screen text-gray-500">{error || 'No encontrado'}</div>

  return (
    <CartProvider slug={slug}>
      <CatalogContent shop={shop} products={products} categories={categories} sizeGuides={sizeGuides} />
    </CartProvider>
  )
}

// ── Catalog Content ──
function CatalogContent({ shop, products, categories, sizeGuides }: { shop: ShopInfo; products: CatalogProduct[]; categories: Category[]; sizeGuides: SizeGuide[] }) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [detail, setDetail] = useState<CatalogProduct | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [annDismissed, setAnnDismissed] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const { items } = useContext(CartCtx)
  const color = shop.color
  const searchLower = search.toLowerCase()
  let filtered = selectedCat ? products.filter(p => p.category_id === selectedCat) : products
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchLower) || (p.description || '').toLowerCase().includes(searchLower))
  if (sortBy === 'price_asc') filtered = [...filtered].sort((a, b) => a.selling_price - b.selling_price)
  else if (sortBy === 'price_desc') filtered = [...filtered].sort((a, b) => b.selling_price - a.selling_price)
  else if (sortBy === 'newest') filtered = [...filtered].reverse()
  else filtered = [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sort_order - b.sort_order)
  const featuredProducts = products.filter(p => p.featured)
  const usedCats = categories.filter(c => products.some(p => p.category_id === c.id))
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  function stockStatus(p: CatalogProduct): 'instock' | 'ondemand' | 'soldout' {
    if (!p.manage_stock) return 'ondemand'
    return p.current_stock > 0 ? 'instock' : 'soldout'
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Announcement bar */}
      {shop.anuncio.activo && !annDismissed && (
        <div className="flex items-center justify-center px-4 py-2 text-sm" style={{ background: shop.anuncio.bgColor, color: shop.anuncio.textColor }}>
          <span className="flex-1 text-center">{shop.anuncio.texto}</span>
          <button onClick={() => setAnnDismissed(true)} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="relative text-white overflow-hidden" style={shop.banner ? {} : { background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
        {shop.banner ? (<>
          <img src={shop.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.35) 100%)' }} />
        </>) : (
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        )}
        <div className="relative px-4 py-8 sm:py-6" style={{ minHeight: shop.banner ? undefined : 'auto' }}>
          {/* Mobile: taller aspect for banner images */}
          {shop.banner && <div className="sm:hidden" style={{ paddingTop: '20%' }} />}
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              {shop.logo && <img src={shop.logo} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover bg-white/20 flex-shrink-0" />}
              <div>
                <h1 className="text-lg sm:text-xl font-bold drop-shadow-sm">{shop.nombre}</h1>
                {shop.description && <p className="text-xs sm:text-sm opacity-80 mt-0.5 drop-shadow-sm">{shop.description}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {usedCats.length > 1 && (
        <div className="px-4 py-3 overflow-x-auto whitespace-nowrap border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex gap-2">
            <button onClick={() => setSelectedCat(null)}
              className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
              style={!selectedCat ? { background: color, color: '#fff' } : { background: '#F1F1F1', color: '#666' }}>Todo</button>
            {usedCats.map(c => (
              <button key={c.id} onClick={() => setSelectedCat(c.id)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
                style={selectedCat === c.id ? { background: color, color: '#fff' } : { background: '#F1F1F1', color: '#666' }}>{c.name}</button>
            ))}
          </div>
        </div>
      )}

      {/* Search + Sort */}
      <div className="max-w-5xl mx-auto px-4 pt-3 flex gap-2 items-center">
        <div className="flex-1 relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={tc('webCatalog', 'searchProducts')}
            className="w-full px-3 py-2 pl-9 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-purple-300" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-2 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white">
          <option value="default">{tc('webCatalog', 'featured')}</option>
          <option value="price_asc">{tc('webCatalog', 'priceLow')}</option>
          <option value="price_desc">{tc('webCatalog', 'priceHigh')}</option>
          <option value="newest">{tc('webCatalog', 'newest')}</option>
        </select>
      </div>

      {/* Featured section */}
      {featuredProducts.length > 0 && sortBy === 'default' && !search && !selectedCat && (
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
          <p className="text-sm font-bold mb-2" style={{ color }}>{tc('webCatalog', 'featured')}</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
            {featuredProducts.map(p => {
              const photo = (p.photos || [])[0]
              return (
                <div key={p.id} className="flex-shrink-0 w-36 bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setDetail(p)}>
                  <div className="aspect-square bg-gray-100">
                    {photo ? <img src={photo} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📷</div>}
                  </div>
                  <div className="p-2">
                    <p className="font-semibold text-gray-800 text-xs leading-tight truncate">{p.name}</p>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">{fmt(p.selling_price)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(p => {
            const status = stockStatus(p)
            const photo = (p.photos || [])[0]
            return (
              <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetail(p)}>
                <div className="relative aspect-square bg-gray-100">
                  {photo ? <img src={photo} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">📷</div>}
                  {status === 'soldout' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">{tc('webCatalog', 'outOfStock')}</span></div>}
                  {(p.precio_anterior || 0) > p.selling_price && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">-{Math.round((1 - p.selling_price / (p.precio_anterior || 1)) * 100)}%</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-800 text-sm leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</p>
                  <div className="mt-1">
                    {(p.precio_anterior || 0) > p.selling_price && <span className="text-xs text-gray-400 line-through mr-1.5">{fmt(p.precio_anterior!)}</span>}
                    <span className="font-bold text-gray-900">{status === 'ondemand' && <span className="text-xs font-normal text-gray-400">desde </span>}{fmt(p.selling_price)}</span>
                  </div>
                  <p className={`text-xs mt-0.5 ${status === 'instock' ? 'text-green-600' : status === 'soldout' ? 'text-red-500' : 'text-gray-400'}`}>
                    {status === 'instock' ? tc('webCatalog', 'inStock') : status === 'soldout' ? tc('webCatalog', 'soldOut') : tc('webCatalog', 'madeToOrder')}
                    {p.estimated_delivery && status === 'ondemand' && <span className="text-gray-400"> · {p.estimated_delivery}</span>}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">{search ? tc('webCatalog', 'noResults').replace('{query}', search) : selectedCat ? 'No encontramos productos en esta categoría.' : tc('webCatalog', 'noProducts')}</p>
            {(search || selectedCat) && (
              <button onClick={() => { setSearch(''); setSelectedCat(null) }} className="text-sm font-semibold mt-2" style={{ color }}>{selectedCat && search ? 'Limpiar filtros' : search ? 'Limpiar búsqueda' : 'Ver todos'}</button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-100 px-4 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            {shop.logo && <img src={shop.logo} alt="" className="w-10 h-10 rounded-xl object-cover" />}
            <span className="font-bold text-gray-800">{shop.nombre}</span>
          </div>
          <div className="space-y-1 text-sm text-gray-500 mb-4">
            {(shop.city || shop.direccion) && <p>📍 {[shop.direccion, shop.city, getCountry(shop.countryCode).name].filter(Boolean).join(', ')}</p>}
            {shop.whatsapp && <p>📱 {shop.whatsapp}</p>}
            {shop.website && <p>🌐 {shop.website}</p>}
          </div>
          {(shop.instagram || shop.whatsapp || shop.facebook || shop.tiktok || shop.youtube) && (
            <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
              {shop.instagram && <a href={`https://instagram.com/${shop.instagram.replace('@', '')}`} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors" title={shop.instagram}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg></a>}
              {shop.facebook && <a href={shop.facebook.startsWith('http') ? shop.facebook : `https://facebook.com/${shop.facebook.replace(/^facebook\.com\/?/, '')}`} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors" title={shop.facebook}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>}
              {shop.tiktok && <a href={`https://tiktok.com/${shop.tiktok.startsWith('@') ? shop.tiktok : '@' + shop.tiktok}`} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors" title={shop.tiktok}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg></a>}
              {shop.youtube && <a href={shop.youtube.startsWith('http') ? shop.youtube : `https://youtube.com/${shop.youtube.startsWith('@') ? shop.youtube : '@' + shop.youtube}`} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors" title={shop.youtube}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg></a>}
              {shop.whatsapp && <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors" title={shop.whatsapp}><MessageCircle size={16} /></a>}
            </div>
          )}
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">{tc('webCatalog', 'poweredBy')} <img src="/logo-icon.png" alt="" className="inline-block w-3.5 h-3.5" /><a href="https://www.estamply.app" className="font-semibold hover:text-gray-500">Estamply</a></p>
        </div>
      </div>

      {/* WhatsApp floating button */}
      {shop.whatsapp && shop.waBotonVisible && !showCart && (
        <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(shop.waMensaje || `Hola, vi tu catálogo en ${shop.nombre} y quiero hacer una consulta.`)}`} target="_blank" rel="noopener noreferrer"
          className="fixed right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all"
          style={{ background: '#25D366', bottom: (itemCount > 0 && !detail) ? '88px' : '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <MessageCircle size={24} />
        </a>
      )}

      {/* Cart bar */}
      {itemCount > 0 && !showCart && !detail && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-4 right-4 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg z-30 max-w-lg mx-auto"
          style={{ background: color }}>
          <ShoppingCart size={18} /> Ver pedido ({itemCount}) &middot; {fmt(items.reduce((s, i) => s + i.price * i.quantity, 0))}
        </button>
      )}

      {/* Product Detail */}
      {detail && <ProductDetail product={detail} shop={shop} sizeGuides={sizeGuides} onClose={() => setDetail(null)} />}

      {/* Cart Screen */}
      {showCart && <CartScreen shop={shop} onClose={() => setShowCart(false)} />}
    </div>
  )
}

// ── Product Detail ──
function ProductDetail({ product, shop, sizeGuides, onClose }: { product: CatalogProduct; shop: ShopInfo; sizeGuides: SizeGuide[]; onClose: () => void }) {
  const { add } = useContext(CartCtx)
  const [qty, setQty] = useState(1)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [selSize, setSelSize] = useState<string | null>(null)
  const [selColor, setSelColor] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [addToast, setAddToast] = useState(false)
  const guide = product.guia_talles_id ? sizeGuides.find(g => g.id === product.guia_talles_id) : null
  const photos = (product.photos || []).slice(0, 3)
  const sizes = product.sizes || []
  const colors = product.colors || []
  const status = !product.manage_stock ? 'ondemand' : product.current_stock > 0 ? 'instock' : 'soldout'
  const canAdd = status === 'instock'
  const hasDiscount = (product.precio_anterior || 0) > product.selling_price

  function handleAdd() {
    if (sizes.length && !selSize) { setSizeError(true); return }
    const parts = [selSize, selColor].filter(Boolean)
    add(product, qty, parts.join(', '))
    setQty(1)
    setJustAdded(true)
    setAddToast(true)
    setTimeout(() => setJustAdded(false), 1500)
    setTimeout(() => setAddToast(false), 3500)
  }

  const consultUrl = `https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! 👋 Me interesa este producto de tu catálogo:\n\n📦 ${product.name}\n💰 ${status === 'ondemand' ? 'desde ' : ''}${fmt(product.selling_price)}\n\n¿Podrías darme más info?`)}`

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <button onClick={onClose} className="flex items-center gap-1 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> {tc('common', 'back')}
        </button>

        <div className="relative aspect-square bg-gray-100">
          {photos.length > 0 ? (
            <img src={photos[photoIdx]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">📷</div>
          )}
          {photos.length > 1 && (<>
            <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow"><ChevronLeft size={16} /></button>
            <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow"><ChevronRight size={16} /></button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i === photoIdx ? 'bg-white' : 'bg-white/50'}`} />)}
            </div>
          </>)}
        </div>

        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          <div className="mt-1">
            {hasDiscount && <p className="text-sm text-gray-400 line-through">{fmt(product.precio_anterior!)}</p>}
            <p className="text-2xl font-black text-gray-900">{status === 'ondemand' && <span className="text-sm font-normal text-gray-400">desde </span>}{fmt(product.selling_price)}
              {hasDiscount && <span className="ml-2 text-sm font-bold text-red-500">-{Math.round((1 - product.selling_price / (product.precio_anterior || 1)) * 100)}%</span>}
            </p>
          </div>
          <p className={`text-sm mt-1 ${status === 'instock' ? 'text-green-600' : status === 'soldout' ? 'text-red-500' : 'text-gray-400'}`}>
            {status === 'instock' ? tc('webCatalog', 'inStock') : status === 'soldout' ? tc('webCatalog', 'soldOut') : tc('webCatalog', 'madeToOrder')}
            {product.estimated_delivery && <span className="text-gray-400"> · {product.estimated_delivery}</span>}
          </p>
          {product.description && <p className="text-sm text-gray-600 mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>}

          {canAdd ? (
            <div className="mt-6 space-y-4">
              {/* Size selector */}
              {sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">Talle:</p>
                    {guide && <button type="button" onClick={() => setShowGuide(true)} className="text-xs text-gray-400 hover:text-gray-600">📏 Ver guía</button>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {sizes.map(s => (
                      <button key={s} onClick={() => { setSelSize(s); setSizeError(false) }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all min-w-[44px] ${selSize === s ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                        style={selSize === s ? { background: shop.color } : {}}>{s}</button>
                    ))}
                  </div>
                  {sizeError && <p className="text-xs text-red-500 mt-1">{tc('webCatalog', 'selectSize')}</p>}
                </div>
              )}

              {/* Color selector */}
              {colors.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Color:</p>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map(c => (
                      <button key={c.name} onClick={() => setSelColor(c.name)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selColor === c.name ? 'ring-2 ring-offset-1' : 'bg-gray-100'}`}
                        style={selColor === c.name ? { '--tw-ring-color': shop.color } as React.CSSProperties : {}}>
                        <span className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ background: c.hex }} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Cantidad:</span>
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"><Minus size={14} /></button>
                  <span className="w-10 h-10 flex items-center justify-center font-bold text-gray-900 border-x border-gray-200">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"><Plus size={14} /></button>
                </div>
              </div>

              <button onClick={handleAdd}
                className={`w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all ${justAdded ? 'scale-95' : ''}`}
                style={{ background: justAdded ? '#22C55E' : shop.color }}>
                {justAdded ? <><Check size={16} /> Agregado</> : <><ShoppingCart size={16} /> {tc('webCatalog', 'addToOrder')} — {fmt(product.selling_price * qty)}</>}
              </button>
              {addToast && (
                <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto">
                  <div className="bg-gray-800 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
                    <span>Producto agregado al pedido</span>
                    <button onClick={() => { setAddToast(false); onClose() }} className="text-xs font-semibold text-purple-300 hover:text-white ml-3 whitespace-nowrap">Ver pedido →</button>
                  </div>
                </div>
              )}
              {shop.whatsapp && (
                <a href={consultUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full mt-2 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50">
                  <MessageCircle size={14} /> {tc('webCatalog', 'consultWhatsapp')}
                </a>
              )}
            </div>
          ) : (
            <a href={consultUrl} target="_blank" rel="noopener noreferrer"
              className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2"
              style={{ borderColor: shop.color, color: shop.color }}>
              <MessageCircle size={16} /> {tc('webCatalog', 'consultWhatsapp')}
            </a>
          )}
        </div>
      </div>

      {/* Size guide modal */}
      {showGuide && guide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowGuide(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Guía de talles — {guide.nombre}</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
            </div>
            {guide.imagen_referencia && (
              <img src={guide.imagen_referencia} alt="Guía de talles" className="w-full rounded-lg mb-4 object-contain max-h-64" />
            )}
            {guide.filas.length > 0 && guide.columnas.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
                  <th className="text-left px-2 py-2 font-semibold text-gray-600">Talle</th>
                  {guide.columnas.map((c, i) => <th key={i} className="text-left px-2 py-2 font-semibold text-gray-600">{c}</th>)}
                </tr></thead><tbody>
                  {guide.filas.map((f, fi) => (
                    <tr key={fi} className="border-b border-gray-50">
                      <td className="px-2 py-2 font-medium text-gray-800">{f.talle}</td>
                      {guide.columnas.map((c, ci) => <td key={ci} className="px-2 py-2 text-gray-600">{f[c] || '—'}</td>)}
                    </tr>
                  ))}
                </tbody></table>
              </div>
            )}
            {!guide.imagen_referencia && (!guide.filas.length || !guide.columnas.length) && (
              <p className="text-sm text-gray-400 text-center py-4">El taller aún no ha completado la guía de talles.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Cart Screen ──
function CartScreen({ shop, onClose }: { shop: ShopInfo; onClose: () => void }) {
  const { items, update, remove, total } = useContext(CartCtx)
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [sending, setSending] = useState(false)
  const [orderResult, setOrderResult] = useState<{ codigo: string; waUrl: string } | null>(null)
  const [selectedMedioPago, setSelectedMedioPago] = useState(shop.mediosPago[0]?.id || '')

  const medio = shop.mediosPago.find(m => m.id === selectedMedioPago)
  const ajustePct = medio ? (medio.tipo_ajuste === 'descuento' ? -medio.porcentaje : medio.tipo_ajuste === 'recargo' ? medio.porcentaje : 0) : 0
  const ajusteMonto = Math.round(total * ajustePct / 100)
  const totalFinal = total + ajusteMonto

  const itemKey = (i: CartItem) => i.variant ? `${i.productId}::${i.variant}` : i.productId

  async function sendOrder() {
    if (!nombre.trim() || !whatsapp.trim()) return
    setSending(true)
    let codigo = ''
    try {
      const res = await fetch('/api/catalog-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: shop.user_id, nombre, whatsapp, comentarios, items: items.map(i => ({ name: i.name, variant: i.variant, quantity: i.quantity, price: i.price })), total: totalFinal, medioPago: medio?.nombre || null, ajustePorcentaje: ajustePct, ajusteMonto }),
      })
      const data = await res.json()
      codigo = data.codigo || ''
    } catch { /* continue without presupuesto */ }
    // Build WhatsApp URL (user clicks it directly — no popup blocked)
    const lines = items.map(i => `• ${i.quantity}× ${i.name}${i.variant ? ` (${i.variant})` : ''} — ${fmt(i.price * i.quantity)}`).join('\n')
    const presLink = codigo ? `\n\n📄 Ver presupuesto: https://www.estamply.app/p/${codigo}` : ''
    const medioLine = medio && ajustePct !== 0 ? `\n💳 Medio de pago: ${medio.nombre} (${ajustePct > 0 ? '+' : ''}${ajustePct}%)` : medio ? `\n💳 Medio de pago: ${medio.nombre}` : ''
    const msg = `Hola! Hice un pedido desde tu catálogo web:\n\n${lines}${medioLine}\n\n💰 Total: ${fmt(totalFinal)}${presLink}\n\nNombre: ${nombre}`
    const waUrl = `https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
    setSending(false)
    setOrderResult({ codigo, waUrl })
  }

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <button onClick={onClose} className="flex items-center gap-1 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> {orderResult ? tc('common', 'back') : tc('webCatalog', 'yourOrder')}
        </button>

        {/* Confirmation screen */}
        {orderResult ? (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <p className="text-4xl mb-3">✅</p>
              <h3 className="font-bold text-gray-900 text-xl">{tc('webCatalog', 'orderSent')}</h3>
              {orderResult.codigo && <p className="text-sm text-gray-500 mt-1">Presupuesto: <span className="font-semibold text-gray-700">#{orderResult.codigo}</span></p>}
            </div>
            {/* Order summary */}
            <div className="rounded-xl bg-gray-50 p-4 mb-4 space-y-2">
              {items.map(i => (
                <div key={itemKey(i)} className="flex justify-between text-sm">
                  <span className="text-gray-600">{i.name}{i.variant && ` (${i.variant})`} × {i.quantity}</span>
                  <span className="font-semibold text-gray-800">{fmt(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center mb-5">Te contactaremos por WhatsApp para confirmar disponibilidad y coordinar el pago.</p>
            {/* WhatsApp button — direct <a> link, no popup issues */}
            <a href={orderResult.waUrl} target="_blank" rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 mb-3"
              style={{ background: '#25D366' }}>
              <MessageCircle size={16} /> {tc('webCatalog', 'sendWhatsapp')}
            </a>
            {orderResult.codigo && (
              <a href={`/p/${orderResult.codigo}`} target="_blank" rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1 text-gray-600 border border-gray-200 mb-3">
                {tc('webCatalog', 'viewQuote')}
              </a>
            )}
            <button onClick={onClose} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">{tc('common', 'back')} al catálogo</button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
            <p>{tc('webCatalog', 'emptyCart')}</p>
          </div>
        ) : (<>
          <div className="px-4 space-y-3">
            {items.map(item => {
              const key = itemKey(item)
              return (
              <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {item.photo ? <img src={item.photo} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.name}{item.variant && <span className="font-normal text-gray-500"> ({item.variant})</span>}</p>
                  <p className="text-xs text-gray-500">{fmt(item.price)} × {item.quantity} = <span className="font-bold text-gray-800">{fmt(item.price * item.quantity)}</span></p>
                  <div className="flex items-center gap-0 mt-1 border border-gray-200 rounded-lg overflow-hidden w-fit">
                    <button onClick={() => update(key, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100"><Minus size={12} /></button>
                    <span className="w-7 h-7 flex items-center justify-center text-xs font-bold border-x border-gray-200">{item.quantity}</span>
                    <button onClick={() => update(key, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100"><Plus size={12} /></button>
                  </div>
                </div>
                <button onClick={() => remove(key)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
              </div>
            )})}
          </div>

          <div className="px-4 mt-4 pt-4 border-t border-gray-200">
            {/* Payment methods */}
            {shop.mediosPago.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Medio de pago</p>
                <div className="space-y-1.5">
                  {shop.mediosPago.map(m => {
                    const pct = m.tipo_ajuste === 'descuento' ? -m.porcentaje : m.tipo_ajuste === 'recargo' ? m.porcentaje : 0
                    const mTotal = total + Math.round(total * pct / 100)
                    return (
                      <label key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedMedioPago === m.id ? 'border-purple-300 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <input type="radio" name="medioPago" checked={selectedMedioPago === m.id} onChange={() => setSelectedMedioPago(m.id)} className="text-purple-600" />
                        <span className="flex-1 text-sm font-medium text-gray-800">{m.nombre}
                          {pct !== 0 && <span className={`ml-1.5 text-xs ${pct < 0 ? 'text-green-600' : 'text-red-500'}`}>{pct > 0 ? '+' : ''}{pct}%</span>}
                        </span>
                        <span className="text-sm font-bold text-gray-800">{fmt(mTotal)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="mb-4 space-y-1">
              {ajustePct !== 0 && (<>
                <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>{fmt(total)}</span></div>
                <div className="flex justify-between text-sm"><span className={ajustePct < 0 ? 'text-green-600' : 'text-red-500'}>{medio?.nombre} ({ajustePct > 0 ? '+' : ''}{ajustePct}%)</span><span className={ajustePct < 0 ? 'text-green-600' : 'text-red-500'}>{ajusteMonto > 0 ? '+' : ''}{fmt(ajusteMonto)}</span></div>
              </>)}
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-semibold text-gray-800">Total</span>
                <span className="text-xl font-black text-gray-900">{fmt(totalFinal)}</span>
              </div>
            </div>

            {/* Contact form */}
            <div className="space-y-3 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tus datos</p>
              <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" placeholder={tc('webCatalog', 'name')} value={nombre} onChange={e => setNombre(e.target.value)} />
              <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" placeholder={tc('webCatalog', 'whatsapp')} inputMode="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
              <textarea className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" rows={2} placeholder={tc('webCatalog', 'comments')} value={comentarios} onChange={e => setComentarios(e.target.value)} />
            </div>
            <button onClick={sendOrder} disabled={!nombre.trim() || !whatsapp.trim() || sending}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 mb-6"
              style={{ background: shop.color }}>
              {sending ? tc('common', 'loading') : tc('webCatalog', 'sendOrder')}
            </button>
          </div>
        </>)}
      </div>
    </div>
  )
}
