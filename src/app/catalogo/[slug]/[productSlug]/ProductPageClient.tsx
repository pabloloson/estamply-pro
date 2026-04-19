// @ts-nocheck
'use client'

import { useState, useEffect, useContext } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db/client'
import { ShoppingCart, Plus, Minus, X, MessageCircle, ArrowLeft, ChevronLeft, ChevronRight, Check, Share2 } from 'lucide-react'
import esMsg from '../../../../../messages/es.json'
import ptMsg from '../../../../../messages/pt.json'
import { formatCurrency, getCountry } from '@/shared/lib/currency'
import { CartCtx } from '../layout'

interface Product {
  id: string; name: string; description: string | null; photos: string[]
  selling_price: number; manage_stock: boolean; current_stock: number
  sizes: string[] | null; colors: Array<{ name: string; hex: string }> | null
  estimated_delivery: string | null; precio_anterior: number | null
  guia_talles_id: string | null
}
interface SizeGuide { id: string; nombre: string; columnas: string[]; filas: Array<Record<string, string>>; imagen_referencia: string | null }

let _cc = getCountry('AR')
let _m = esMsg as unknown as Record<string, Record<string, string>>
function fmt(n: number) { return formatCurrency(n, _cc) }
function tc(ns: string, key: string) { return _m[ns]?.[key] || key }

export default function ProductPageClient() {
  const { slug, productSlug } = useParams<{ slug: string; productSlug: string }>()
  const productId = productSlug // will be resolved by slug or UUID lookup
  const supabase = createClient()
  const { add, items, total } = useContext(CartCtx)
  const [product, setProduct] = useState<Product | null>(null)
  const [shop, setShop] = useState<{ nombre: string; color: string; whatsapp: string; waMensaje: string } | null>(null)
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([])
  const [promoPrice, setPromoPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)

  // Product detail state
  const [qty, setQty] = useState(1)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [selSize, setSelSize] = useState<string | null>(null)
  const [selColor, setSelColor] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [addToast, setAddToast] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: ws } = await supabase.from('workshop_settings').select('*')
      const match = ws?.find((w: Record<string, unknown>) => (w.settings as Record<string, unknown>)?.catalog_slug === slug)
      if (!match) { setLoading(false); return }
      const s = match.settings as Record<string, unknown>
      const userId = match.user_id as string
      _cc = getCountry((s.pais as string) || 'AR')
      _m = ((s.idioma as string) === 'pt' ? ptMsg : esMsg) as unknown as Record<string, Record<string, string>>

      const { data: prof } = await supabase.from('profiles').select('business_name,business_phone').eq('id', userId).single()
      setShop({
        nombre: (s.nombre_tienda as string) || (prof?.business_name as string) || 'Mi Taller',
        color: (s.brand_color as string) || '#6C5CE7',
        whatsapp: (prof?.business_phone as string) || '',
        waMensaje: (s.wa_mensaje as string) || '',
      })

      const [{ data: sg }, { data: promos }] = await Promise.all([
        supabase.from('guias_talles').select('id,nombre,columnas,filas,imagen_referencia').eq('user_id', userId),
        supabase.from('promotions').select('product_ids,discount_type,discount_value').eq('user_id', userId).eq('status', 'active'),
      ])
      // Lookup by slug first, fallback to UUID
      let { data: prod } = await supabase.from('catalog_products').select('id,name,description,photos,selling_price,manage_stock,current_stock,sizes,colors,estimated_delivery,precio_anterior,guia_talles_id').eq('slug', productSlug).single()
      if (!prod) { const r = await supabase.from('catalog_products').select('id,name,description,photos,selling_price,manage_stock,current_stock,sizes,colors,estimated_delivery,precio_anterior,guia_talles_id').eq('id', productSlug).single(); prod = r.data }
      if (prod) setProduct(prod as Product)
      if (sg) setSizeGuides(sg as SizeGuide[])
      if (promos && prod) {
        const pr = (promos as Array<{ product_ids: string[]; discount_type: string; discount_value: number }>).find(p => p.product_ids.includes(prod!.id))
        if (pr && prod) {
          setPromoPrice(pr.discount_type === 'percentage' ? Math.round((prod as Product).selling_price * (1 - pr.discount_value / 100)) : Math.max(0, (prod as Product).selling_price - pr.discount_value))
        }
      }
      setLoading(false)
    }
    load()
  }, [slug, productSlug])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" /></div>
  if (!product || !shop) return <div className="flex items-center justify-center min-h-screen text-gray-500">Producto no encontrado</div>

  const photos = (product.photos || []).slice(0, 3)
  const sizes = product.sizes || []
  const colors = product.colors || []
  const status = !product.manage_stock ? 'ondemand' : product.current_stock > 0 ? 'instock' : 'soldout'
  const canAdd = status === 'instock'
  const effectivePrice = promoPrice ?? product.selling_price
  const hasDiscount = promoPrice !== null || (product.precio_anterior || 0) > product.selling_price
  const guide = product.guia_talles_id ? sizeGuides.find(g => g.id === product.guia_talles_id) : null
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const consultUrl = `https://wa.me/${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Me interesa ${product.name} de tu catálogo:\n${fmt(effectivePrice)}\n¿Podrías darme más info?`)}`

  function handleAdd() {
    if (sizes.length && !selSize) { setSizeError(true); return }
    const parts = [selSize, selColor].filter(Boolean)
    if (!product) return
    add({ id: product.id, name: product.name, selling_price: effectivePrice, photos: product.photos }, qty, parts.join(', '))
    setQty(1); setJustAdded(true); setAddToast(true)
    setTimeout(() => setJustAdded(false), 1500)
    setTimeout(() => setAddToast(false), 3500)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky back bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto">
          <Link href={`/catalogo/${slug}`} className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold text-gray-700 hover:text-gray-900" style={{ minHeight: 44 }}>
            <ArrowLeft size={16} /> Volver al catálogo
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Photos */}
        <div className="relative aspect-square bg-gray-100">
          {photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
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

        {/* Product info */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
            <button onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.share) {
                navigator.share({ title: product.name, text: `${product.name} — ${fmt(effectivePrice)} en ${shop.nombre}`, url: window.location.href }).catch(() => {})
              } else { navigator.clipboard.writeText(window.location.href) }
            }} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 mt-0.5"><Share2 size={16} className="text-gray-400" /></button>
          </div>
          <div className="mt-1">
            {hasDiscount && !promoPrice && <p className="text-sm text-gray-400 line-through">{fmt(product.precio_anterior!)}</p>}
            <p className="text-2xl font-black text-gray-900">
              {promoPrice !== null && <span className="text-base text-gray-400 line-through mr-2 font-medium">{fmt(product.selling_price)}</span>}
              {status === 'ondemand' && <span className="text-sm font-normal text-gray-400">desde </span>}
              <span className={promoPrice !== null ? 'text-green-600' : ''}>{fmt(effectivePrice)}</span>
              {promoPrice !== null && <span className="ml-2 text-sm font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: shop.color }}>PROMO</span>}
            </p>
          </div>
          <p className={`text-sm mt-1 ${status === 'instock' ? 'text-green-600' : status === 'soldout' ? 'text-red-500' : 'text-gray-400'}`}>
            {status === 'instock' ? tc('webCatalog', 'inStock') : status === 'soldout' ? tc('webCatalog', 'soldOut') : tc('webCatalog', 'madeToOrder')}
            {product.estimated_delivery && <span className="text-gray-400"> · {product.estimated_delivery}</span>}
          </p>
          {product.description && <p className="text-sm text-gray-600 mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>}

          {canAdd ? (
            <div className="mt-6 space-y-4">
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
                {justAdded ? <><Check size={16} /> Agregado</> : <><ShoppingCart size={16} /> {tc('webCatalog', 'addToOrder')} — {fmt(effectivePrice * qty)}</>}
              </button>
              {addToast && (
                <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto">
                  <div className="bg-gray-800 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center justify-between">
                    <span>Producto agregado al pedido</span>
                    <Link href={`/catalogo/${slug}`} className="text-xs font-semibold text-purple-300 hover:text-white ml-3 whitespace-nowrap">Ver pedido →</Link>
                  </div>
                </div>
              )}
              {shop.whatsapp && (
                <a href={consultUrl} target="_blank" rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-gray-200 text-gray-600 hover:bg-gray-50">
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

      {/* Cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-30 max-w-lg mx-auto">
          <Link href={`/catalogo/${slug}`}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
            style={{ background: shop.color }}>
            <ShoppingCart size={18} /> Ver pedido ({itemCount}) · {fmt(total)}
          </Link>
        </div>
      )}

      {/* Size guide modal */}
      {showGuide && guide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowGuide(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Guía de talles{guide.nombre.toLowerCase().startsWith('guía de talles') || guide.nombre.toLowerCase().startsWith('guia de talles') ? '' : ` — ${guide.nombre}`}</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
            </div>
            {guide.imagen_referencia && <img src={guide.imagen_referencia} alt="" className="w-full rounded-lg mb-4 object-contain max-h-64" />}
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
                <p className="text-[10px] text-gray-400 mt-2 text-right">Todas las medidas están en centímetros.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
