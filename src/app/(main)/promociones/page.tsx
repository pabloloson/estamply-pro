'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Pause, Play, Check, Search, Copy } from 'lucide-react'
import { useLocale } from '@/shared/context/LocaleContext'

interface Promotion {
  id: string; name: string; discount_type: 'percentage' | 'fixed'; discount_value: number
  product_ids: string[]; starts_at: string; ends_at: string; show_countdown: boolean
  status: 'scheduled' | 'active' | 'paused' | 'finished'; created_at: string
}
interface CatProduct { id: string; name: string; category_id: string | null; selling_price: number; photos: string[] }

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Programada', color: '#3B82F6', bg: '#EFF6FF' },
  active: { label: 'Activa', color: '#22C55E', bg: '#F0FDF4' },
  paused: { label: 'Pausada', color: '#EAB308', bg: '#FEFCE8' },
  finished: { label: 'Finalizada', color: '#9CA3AF', bg: '#F3F4F6' },
}

export default function PromocionesPage() {
  const supabase = createClient()
  const { fmt: fmtCurrency } = useLocale()
  const [promos, setPromos] = useState<Promotion[]>([])
  const [products, setProducts] = useState<CatProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Promotion> | null>(null)
  const [searchProd, setSearchProd] = useState('')
  const [toast, setToast] = useState('')

  async function load() {
    const [{ data: p }, { data: cp }] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('catalog_products').select('id,name,category_id,selling_price,photos').order('name'),
    ])
    // Auto-update statuses
    const now = new Date()
    const updated = ((p || []) as Promotion[]).map(promo => {
      if (promo.status === 'scheduled' && new Date(promo.starts_at) <= now && new Date(promo.ends_at) > now) return { ...promo, status: 'active' as const }
      if ((promo.status === 'active' || promo.status === 'scheduled') && new Date(promo.ends_at) <= now) return { ...promo, status: 'finished' as const }
      return promo
    })
    // Persist status changes
    for (const promo of updated) {
      const orig = (p as Promotion[]).find(x => x.id === promo.id)
      if (orig && orig.status !== promo.status) await supabase.from('promotions').update({ status: promo.status }).eq('id', promo.id)
    }
    setPromos(updated)
    setProducts((cp || []) as CatProduct[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function savePromo() {
    if (!modal?.name || !modal.discount_value || !(modal.product_ids?.length) || !modal.ends_at) return
    const payload = {
      name: modal.name, discount_type: modal.discount_type || 'percentage',
      discount_value: modal.discount_value, product_ids: modal.product_ids,
      starts_at: modal.starts_at || new Date().toISOString(),
      ends_at: modal.ends_at, show_countdown: modal.show_countdown || false,
      status: new Date(modal.starts_at || Date.now()) <= new Date() ? 'active' : 'scheduled',
    }
    if (modal.id) {
      await supabase.from('promotions').update(payload).eq('id', modal.id)
    } else {
      const { data: ownerId } = await supabase.rpc('get_team_owner_id')
      let userId = ownerId as string | null
      if (!userId) { const { data: { user } } = await supabase.auth.getUser(); userId = user?.id || null }
      await supabase.from('promotions').insert({ ...payload, user_id: userId })
    }
    setModal(null); load(); showToast(modal.id ? 'Promoción actualizada' : 'Promoción creada')
  }

  async function deletePromo(id: string) {
    if (!confirm('¿Eliminar esta promoción? Los precios volverán a la normalidad.')) return
    await supabase.from('promotions').delete().eq('id', id); load(); showToast('Promoción eliminada')
  }

  async function togglePause(p: Promotion) {
    const newStatus = p.status === 'paused' ? (new Date(p.starts_at) <= new Date() ? 'active' : 'scheduled') : 'paused'
    await supabase.from('promotions').update({ status: newStatus }).eq('id', p.id)
    load(); showToast(newStatus === 'paused' ? 'Promoción pausada' : 'Promoción reanudada')
  }

  async function finishEarly(p: Promotion) {
    await supabase.from('promotions').update({ status: 'finished', ends_at: new Date().toISOString() }).eq('id', p.id)
    load(); showToast('Promoción finalizada')
  }

  function duplicatePromo(p: Promotion) {
    setModal({ name: `${p.name} (copia)`, discount_type: p.discount_type, discount_value: p.discount_value, product_ids: [...p.product_ids], show_countdown: p.show_countdown, starts_at: '', ends_at: '' })
  }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  const toggleProduct = (id: string) => {
    const ids = modal?.product_ids || []
    setModal({ ...modal, product_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] })
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-gray-500 text-sm mt-1">Descuentos temporales para tu catálogo web.</p></div>
        <button onClick={() => setModal({ discount_type: 'percentage', discount_value: 0, product_ids: [], show_countdown: false, starts_at: new Date().toISOString().slice(0, 16), ends_at: '' })}
          className="flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}><Plus size={14} /> Crear promoción</button>
      </div>

      {promos.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3 opacity-50">🏷️</p>
          <p className="text-gray-500 text-sm">Todavía no creaste promociones.</p>
          <p className="text-gray-400 text-xs mt-1">Creá la primera para ofrecer descuentos temporales en tu catálogo.</p>
        </div>
      ) : (<>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {promos.map(p => {
            const st = STATUS_LABELS[p.status]
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{p.name}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: '#6C5CE7' }}>
                      {p.discount_type === 'percentage' ? `-${p.discount_value}%` : `-${fmtCurrency(p.discount_value)}`}
                      <span className="text-xs text-gray-400 font-normal ml-2">{p.product_ids.length} productos</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}</p>
                <div className="flex gap-1 mt-2">
                  {(p.status === 'active' || p.status === 'paused') && <button onClick={() => togglePause(p)} className="p-1.5 rounded hover:bg-gray-100">{p.status === 'paused' ? <Play size={13} className="text-green-500" /> : <Pause size={13} className="text-amber-500" />}</button>}
                  {p.status === 'active' && <button onClick={() => finishEarly(p)} className="p-1.5 rounded hover:bg-gray-100"><Check size={13} className="text-gray-400" /></button>}
                  <button onClick={() => duplicatePromo(p)} className="p-1.5 rounded hover:bg-gray-100"><Copy size={13} className="text-gray-400" /></button>
                  <button onClick={() => setModal(p)} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
                  <button onClick={() => deletePromo(p.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block card overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-100">
            {['Nombre', 'Descuento', 'Productos', 'Inicio', 'Fin', 'Estado', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
          </tr></thead><tbody>
            {promos.map(p => {
              const st = STATUS_LABELS[p.status]
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#6C5CE7' }}>{p.discount_type === 'percentage' ? `-${p.discount_value}%` : `-${fmtCurrency(p.discount_value)}`}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.product_ids.length}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(p.starts_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(p.ends_at)}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    {(p.status === 'active' || p.status === 'paused') && <button onClick={() => togglePause(p)} className="p-1.5 rounded-lg hover:bg-gray-100" title={p.status === 'paused' ? 'Reanudar' : 'Pausar'}>{p.status === 'paused' ? <Play size={14} className="text-green-500" /> : <Pause size={14} className="text-amber-500" />}</button>}
                    {p.status === 'active' && <button onClick={() => finishEarly(p)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Finalizar"><Check size={14} className="text-gray-400" /></button>}
                    <button onClick={() => duplicatePromo(p)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Duplicar"><Copy size={14} className="text-gray-400" /></button>
                    <button onClick={() => setModal(p)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                    <button onClick={() => deletePromo(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                  </div></td>
                </tr>
              )
            })}
          </tbody></table>
        </div>
      </>)}

      {/* Tip */}
      {promos.some(p => p.status === 'active') && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
          💡 Tip: Activá la barra de anuncio en Tienda online para promocionar tu descuento.
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar' : 'Nueva'} promoción</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={modal.name || ''} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="Ej: Promo Día de la Madre, Hot Sale..." /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de descuento</label>
                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                    {[['percentage', '% Porcentaje'], ['fixed', '$ Monto fijo']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setModal({ ...modal, discount_type: v as 'percentage' | 'fixed' })}
                        className={`px-3 py-1.5 text-xs font-semibold transition-all ${modal.discount_type === v ? 'text-white' : 'text-gray-500'}`}
                        style={modal.discount_type === v ? { background: '#6C5CE7' } : {}}>{l}</button>
                    ))}
                  </div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                  <input type="number" className="input-base" min={1} max={modal.discount_type === 'percentage' ? 99 : undefined}
                    value={modal.discount_value || ''} onChange={e => setModal({ ...modal, discount_value: Number(e.target.value) })} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio *</label>
                  <input type="datetime-local" className="input-base text-sm" value={(modal.starts_at || '').slice(0, 16)} onChange={e => setModal({ ...modal, starts_at: new Date(e.target.value).toISOString() })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin *</label>
                  <input type="datetime-local" className="input-base text-sm" value={(modal.ends_at || '').slice(0, 16)} onChange={e => setModal({ ...modal, ends_at: new Date(e.target.value).toISOString() })} /></div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Contador regresivo</label>
                <button type="button" onClick={() => setModal({ ...modal, show_countdown: !modal.show_countdown })}
                  className="relative w-9 h-5 rounded-full transition-colors" style={{ background: modal.show_countdown ? '#6C5CE7' : '#D1D5DB' }}>
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: modal.show_countdown ? 'translateX(16px)' : 'translateX(0)' }} />
                </button>
              </div>

              {/* Product selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Productos *
                  <span className="text-xs text-gray-400 ml-2">{(modal.product_ids || []).length} seleccionados</span>
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input className="input-base text-sm w-full" style={{ paddingLeft: 36 }} placeholder="Buscar producto..." value={searchProd} onChange={e => setSearchProd(e.target.value)} />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {products.filter(p => !searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())).map(p => (
                    <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                      <input type="checkbox" checked={(modal.product_ids || []).includes(p.id)} onChange={() => toggleProduct(p.id)}
                        className="rounded border-gray-300" style={{ accentColor: '#6C5CE7' }} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-gray-400">{fmtCurrency(p.selling_price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={savePromo} disabled={!modal.name?.trim() || !modal.discount_value || !(modal.product_ids?.length) || !modal.ends_at}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
