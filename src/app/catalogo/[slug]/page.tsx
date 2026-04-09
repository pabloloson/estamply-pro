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
}
interface Category { id: string; name: string }
interface ShopInfo { nombre: string; logo: string | null; color: string; description: string; whatsapp: string; instagram: string; user_id: string }
interface CartItem { productId: string; name: string; price: number; quantity: number; photo: string }

// ── Cart Context ──
const CartCtx = createContext<{
  items: CartItem[]; add: (p: CatalogProduct, qty: number) => void
  update: (id: string, qty: number) => void; remove: (id: string) => void; total: number
}>({ items: [], add: () => {}, update: () => {}, remove: () => {}, total: 0 })

function CartProvider({ children, slug }: { children: React.ReactNode; slug: string }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(`cart-${slug}`) || '[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem(`cart-${slug}`, JSON.stringify(items)) }, [items, slug])
  const add = useCallback((p: CatalogProduct, qty: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === p.id)
      if (existing) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + qty } : i)
      return [...prev, { productId: p.id, name: p.name, price: p.selling_price, quantity: qty, photo: (p.photos || [])[0] || '' }]
    })
  }, [])
  const update = useCallback((id: string, qty: number) => {
    if (qty <= 0) setItems(prev => prev.filter(i => i.productId !== id))
    else setItems(prev => prev.map(i => i.productId === id ? { ...i, quantity: qty } : i))
  }, [])
  const remove = useCallback((id: string) => setItems(prev => prev.filter(i => i.productId !== id)), [])
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
      setShop({
        nombre: (s.nombre_taller as string) || 'Mi Taller',
        logo: (s.logo_url as string) || null,
        color: (s.brand_color as string) || '#6C5CE7',
        description: (s.brand_description as string) || '',
        whatsapp: (s.whatsapp as string) || '',
        instagram: (s.instagram as string) || '',
        user_id: userId,
      })
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('catalog_products').select('id,name,description,photos,selling_price,manage_stock,current_stock,category_id,visible_in_catalog').eq('user_id', userId).eq('visible_in_catalog', true),
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
      {/* Header */}
      <div style={{ background: color }} className="px-4 py-6 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            {shop.logo && <img src={shop.logo} alt="" className="w-12 h-12 rounded-xl object-cover bg-white/20" />}
            <div>
              <h1 className="text-xl font-bold">{shop.nombre}</h1>
              {shop.description && <p className="text-sm opacity-80 mt-0.5">{shop.description}</p>}
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            {shop.whatsapp && <a href={`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1"><MessageCircle size={14} /> WhatsApp</a>}
            {shop.instagram && <a href={`https://instagram.com/${shop.instagram.replace('@', '')}`} target="_blank" rel="noopener" className="text-sm opacity-80 hover:opacity-100">@{shop.instagram.replace('@', '')}</a>}
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
                </div>
                <div className="p-3">
                  <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                  <p className="font-bold text-gray-900 mt-0.5">{status === 'ondemand' && <span className="text-xs font-normal text-gray-400">desde </span>}{fmt(p.selling_price)}</p>
                  <p className={`text-xs mt-1 ${status === 'instock' ? 'text-green-600' : status === 'soldout' ? 'text-red-500' : 'text-gray-400'}`}>
                    {status === 'instock' ? '✓ En stock' : status === 'soldout' ? '✗ Agotado' : '⏱ A pedido'}
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
  const photos = product.photos || []
  const status = !product.manage_stock ? 'ondemand' : product.current_stock > 0 ? 'instock' : 'soldout'
  const canAdd = status === 'instock'

  function handleConsult() {
    const msg = encodeURIComponent(`Hola! 👋 Vi en tu catálogo el producto "${product.name}" (${status === 'ondemand' ? 'desde ' : ''}${fmt(product.selling_price)}) y me gustaría consultar.\n\n(Visto en estamply.app)`)
    window.open(`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
      <div className="max-w-lg mx-auto">
        {/* Back */}
        <button onClick={onClose} className="flex items-center gap-1 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Volver
        </button>

        {/* Photos */}
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

        {/* Info */}
        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          <p className="text-2xl font-black text-gray-900 mt-1">{status === 'ondemand' && <span className="text-sm font-normal text-gray-400">desde </span>}{fmt(product.selling_price)}</p>
          <p className={`text-sm mt-1 ${status === 'instock' ? 'text-green-600' : status === 'soldout' ? 'text-red-500' : 'text-gray-400'}`}>
            {status === 'instock' ? '✓ En stock' : status === 'soldout' ? '✗ Agotado' : '⏱ A pedido'}
          </p>
          {product.description && <p className="text-sm text-gray-600 mt-4 leading-relaxed">{product.description}</p>}

          {canAdd ? (
            <div className="mt-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-500">Cantidad:</span>
                <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"><Minus size={14} /></button>
                  <span className="w-10 h-10 flex items-center justify-center font-bold text-gray-900 border-x border-gray-200">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50"><Plus size={14} /></button>
                </div>
              </div>
              <button onClick={() => { add(product, qty); onClose() }}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                style={{ background: shop.color }}>
                <ShoppingCart size={16} /> Agregar al pedido — {fmt(product.selling_price * qty)}
              </button>
            </div>
          ) : (
            <button onClick={handleConsult}
              className="w-full mt-6 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2"
              style={{ borderColor: shop.color, color: shop.color }}>
              <MessageCircle size={16} /> Consultar por WhatsApp
            </button>
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
  const [telefono, setTelefono] = useState('')
  const [comentarios, setComentarios] = useState('')

  function sendWhatsApp() {
    const lines = items.map(i => `• ${i.quantity}× ${i.name} — ${fmt(i.price * i.quantity)}`).join('\n')
    const msg = `Hola! 👋 Quiero hacer un pedido:\n\n${lines}\n\nTotal: ${fmt(total)}\n\nNombre: ${nombre}\nTel: ${telefono}${comentarios ? `\nComentarios: ${comentarios}` : ''}\n\n(Pedido desde estamply.app)`
    window.open(`https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <button onClick={onClose} className="flex items-center gap-1 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} /> Tu pedido
        </button>

        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Tu pedido está vacío</p>
          </div>
        ) : (<>
          <div className="px-4 space-y-3">
            {items.map(item => (
              <div key={item.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                {item.photo ? <img src={item.photo} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" /> : <div className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{fmt(item.price)} × {item.quantity} = <span className="font-bold text-gray-800">{fmt(item.price * item.quantity)}</span></p>
                  <div className="flex items-center gap-0 mt-1 border border-gray-200 rounded-lg overflow-hidden w-fit">
                    <button onClick={() => update(item.productId, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100"><Minus size={12} /></button>
                    <span className="w-7 h-7 flex items-center justify-center text-xs font-bold border-x border-gray-200">{item.quantity}</span>
                    <button onClick={() => update(item.productId, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-gray-100"><Plus size={12} /></button>
                  </div>
                </div>
                <button onClick={() => remove(item.productId)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-400" /></button>
              </div>
            ))}
          </div>

          <div className="px-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-xl font-black text-gray-900">{fmt(total)}</span>
            </div>

            <div className="space-y-3 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tus datos</p>
              <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" placeholder="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)} />
              <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" placeholder="Teléfono *" value={telefono} onChange={e => setTelefono(e.target.value)} />
              <textarea className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm" rows={2} placeholder="Comentarios (opcional)" value={comentarios} onChange={e => setComentarios(e.target.value)} />
            </div>

            <button onClick={sendWhatsApp} disabled={!nombre.trim() || !telefono.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 mb-6"
              style={{ background: shop.color }}>
              <MessageCircle size={16} /> Enviar pedido por WhatsApp
            </button>
          </div>
        </>)}
      </div>
    </div>
  )
}
