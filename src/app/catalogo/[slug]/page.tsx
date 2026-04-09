'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart, X, Plus, Minus, Trash2, MessageCircle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Types ──
interface CatalogProduct {
  id: string; name: string; description: string | null; photos: string[]
  selling_price: number; manage_stock: boolean; current_stock: number
  category_id: string | null; visible_in_catalog: boolean
  sizes: string[] | null; colors: Array<{ name: string; hex: string }> | null
  estimated_delivery: string | null; precio_anterior: number | null
}
interface Category { id: string; name: string }
interface ShopInfo {
  nombre: string; logo: string | null; color: string; description: string
  whatsapp: string; instagram: string; user_id: string; banner: string | null; direccion: string
  anuncio: { activo: boolean; texto: string; bgColor: string; textColor: string }
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

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

// ── Main Page ──
export default function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>()
  const supabase = createClient()
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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
      const { data: prof } = await supabase.from('profiles').select('business_name,business_phone,business_instagram,business_logo_url,business_address').eq('id', userId).single()
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
        anuncio: {
          activo: !!(s.anuncio_activo) && !!(s.anuncio_texto),
          texto: (s.anuncio_texto as string) || '',
          bgColor: (s.anuncio_color_fondo as string) || (s.brand_color as string) || '#6C5CE7',
          textColor: (s.anuncio_color_texto as string) || '#FFFFFF',
        },
      })
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('catalog_products').select('id,name,description,photos,selling_price,manage_stock,current_stock,category_id,visible_in_catalog,sizes,colors,estimated_delivery,precio_anterior').eq('user_id', userId).eq('visible_in_catalog', true).gt('selling_price', 0),
        supabase.from('categories').select('id,name').eq('user_id', userId),
      ])
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
      <CatalogContent shop={shop} products={products} categories={categories} />
    </CartProvider>
  )
}

// ── Catalog Content ──
function CatalogContent({ shop, products, categories }: { shop: ShopInfo; products: CatalogProduct[]; categories: Category[] }) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [detail, setDetail] = useState<CatalogProduct | null>(null)
  const [showCart, setShowCart] = useState(false)
  const [annDismissed, setAnnDismissed] = useState(false)
  const { items } = useContext(CartCtx)
  const color = shop.color
  const filtered = selectedCat ? products.filter(p => p.category_id === selectedCat) : products
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
      <div className="relative text-white" style={shop.banner ? {} : { background: color }}>
        {shop.banner && (<>
          <img src={shop.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.7))' }} />
        </>)}
        <div className="relative px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            {shop.logo && <img src={shop.logo} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/20" />}
            <div>
              <h1 className="text-xl font-bold">{shop.nombre}</h1>
              {shop.description && <p className="text-sm opacity-80 mt-0.5">{shop.description}</p>}
            </div>
          </div>
          <div className="flex gap-3 mt-3 flex-wrap">
            {shop.whatsapp && <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1"><MessageCircle size={14} /> WhatsApp</a>}
            {shop.instagram && <a href={`https://instagram.com/${shop.instagram.replace('@', '')}`} target="_blank" rel="noopener" className="text-sm opacity-80 hover:opacity-100">@{shop.instagram.replace('@', '')}</a>}
            {shop.direccion && <a href={`https://maps.google.com/?q=${encodeURIComponent(shop.direccion)}`} target="_blank" rel="noopener" className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1">📍 {shop.direccion}</a>}
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
                  {status === 'soldout' && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">SIN STOCK</span></div>}
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
                    {status === 'instock' ? '✓ En stock' : status === 'soldout' ? '✗ Agotado' : '⏱ A pedido'}
                    {p.estimated_delivery && status === 'ondemand' && <span className="text-gray-400"> · {p.estimated_delivery}</span>}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-12">No hay productos disponibles.</p>}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-gray-400">
        Powered by <a href="https://www.estamply.app" className="font-semibold hover:text-gray-600">Estamply</a>
      </div>

      {/* Cart bar */}
      {itemCount > 0 && !showCart && !detail && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-4 left-4 right-4 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg z-30 max-w-lg mx-auto"
          style={{ background: color }}>
          <ShoppingCart size={18} /> Ver pedido ({itemCount}) &middot; {fmt(items.reduce((s, i) => s + i.price * i.quantity, 0))}
        </button>
      )}

      {/* Product Detail */}
      {detail && <ProductDetail product={detail} shop={shop} onClose={() => setDetail(null)} />}

      {/* Cart Screen */}
      {showCart && <CartScreen shop={shop} onClose={() => setShowCart(false)} />}
    </div>
  )
}

// ── Product Detail ──
function ProductDetail({ product, shop, onClose }: { product: CatalogProduct; shop: ShopInfo; onClose: () => void }) {
  const { add } = useContext(CartCtx)
  const [qty, setQty] = useState(1)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [selSize, setSelSize] = useState<string | null>(null)
  const [selColor, setSelColor] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState(false)
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
    onClose()
  }

  const consultUrl = `https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! 👋 Me interesa este producto de tu catálogo:\n\n📦 ${product.name}\n💰 ${status === 'ondemand' ? 'desde ' : ''}${fmt(product.selling_price)}\n\n¿Podrías darme más info?`)}`

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <button onClick={onClose} className="flex items-center gap-1 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Volver
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
            {status === 'instock' ? '✓ En stock' : status === 'soldout' ? '✗ Agotado' : '⏱ A pedido'}
            {product.estimated_delivery && <span className="text-gray-400"> · {product.estimated_delivery}</span>}
          </p>
          {product.description && <p className="text-sm text-gray-600 mt-4 leading-relaxed">{product.description}</p>}

          {canAdd ? (
            <div className="mt-6 space-y-4">
              {/* Size selector */}
              {sizes.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Talle:</p>
                  <div className="flex gap-2 flex-wrap">
                    {sizes.map(s => (
                      <button key={s} onClick={() => { setSelSize(s); setSizeError(false) }}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all min-w-[44px] ${selSize === s ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
                        style={selSize === s ? { background: shop.color } : {}}>{s}</button>
                    ))}
                  </div>
                  {sizeError && <p className="text-xs text-red-500 mt-1">Seleccioná un talle</p>}
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
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                style={{ background: shop.color }}>
                <ShoppingCart size={16} /> Agregar al pedido — {fmt(product.selling_price * qty)}
              </button>
            </div>
          ) : (
            <a href={consultUrl} target="_blank" rel="noopener noreferrer"
              className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2"
              style={{ borderColor: shop.color, color: shop.color }}>
              <MessageCircle size={16} /> Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
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

  const itemKey = (i: CartItem) => i.variant ? `${i.productId}::${i.variant}` : i.productId

  async function sendOrder() {
    if (!nombre.trim() || !whatsapp.trim()) return
    setSending(true)
    let codigo = ''
    try {
      const res = await fetch('/api/catalog-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: shop.user_id, nombre, whatsapp, comentarios, items: items.map(i => ({ name: i.name, variant: i.variant, quantity: i.quantity, price: i.price })), total }),
      })
      const data = await res.json()
      codigo = data.codigo || ''
    } catch { /* continue without presupuesto */ }
    // Build WhatsApp URL (user clicks it directly — no popup blocked)
    const lines = items.map(i => `• ${i.quantity}× ${i.name}${i.variant ? ` (${i.variant})` : ''} — ${fmt(i.price * i.quantity)}`).join('\n')
    const presLink = codigo ? `\n\n📄 Ver presupuesto: https://www.estamply.app/p/${codigo}` : ''
    const msg = `Hola! Hice un pedido desde tu catálogo web:\n\n${lines}\n\n💰 Total: ${fmt(total)}${presLink}\n\nNombre: ${nombre}`
    const waUrl = `https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
    setSending(false)
    setOrderResult({ codigo, waUrl })
  }

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <button onClick={onClose} className="flex items-center gap-1 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> {orderResult ? 'Volver' : 'Tu pedido'}
        </button>

        {/* Confirmation screen */}
        {orderResult ? (
          <div className="px-4 py-6">
            <div className="text-center mb-6">
              <p className="text-4xl mb-3">✅</p>
              <h3 className="font-bold text-gray-900 text-xl">Pedido enviado</h3>
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
              <MessageCircle size={16} /> Enviar por WhatsApp
            </a>
            {orderResult.codigo && (
              <a href={`/p/${orderResult.codigo}`} target="_blank" rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1 text-gray-600 border border-gray-200 mb-3">
                Ver presupuesto
              </a>
            )}
            <button onClick={onClose} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600">Volver al catálogo</button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Tu pedido está vacío</p>
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
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-xl font-black text-gray-900">{fmt(total)}</span>
            </div>
            <div className="space-y-3 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tus datos</p>
              <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" placeholder="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)} />
              <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" placeholder="WhatsApp *" inputMode="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
              <textarea className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" rows={2} placeholder="Comentarios (opcional)" value={comentarios} onChange={e => setComentarios(e.target.value)} />
            </div>
            <button onClick={sendOrder} disabled={!nombre.trim() || !whatsapp.trim() || sending}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 mb-6"
              style={{ background: shop.color }}>
              {sending ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </div>
        </>)}
      </div>
    </div>
  )
}
