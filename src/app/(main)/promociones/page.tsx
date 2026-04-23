// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { Plus, Pencil, Trash2, X, Check, Search, Copy, MoreHorizontal, Share2, Tag, Ticket } from 'lucide-react'
import { useLocale } from '@/shared/context/LocaleContext'

interface Promotion {
  id: string; name: string; discount_type: 'percentage' | 'fixed'; discount_value: number
  product_ids: string[]; starts_at: string; ends_at: string; show_countdown: boolean
  status: 'scheduled' | 'active' | 'paused' | 'finished'; created_at: string
}
interface Coupon {
  id: string; code: string; discount_type: 'percentage' | 'fixed'; discount_value: number
  max_uses: number | null; used_count: number; one_per_client: boolean
  min_amount: number; expires_at: string | null; status: string; created_at: string
}
interface CatProduct { id: string; name: string; category_id: string | null; selling_price: number; photos: string[] }

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Programada', color: '#3B82F6', bg: '#EFF6FF' },
  active: { label: 'Activa', color: '#22C55E', bg: '#F0FDF4' },
  paused: { label: 'Pausada', color: '#EAB308', bg: '#FEFCE8' },
  finished: { label: 'Finalizada', color: '#9CA3AF', bg: '#F3F4F6' },
  exhausted: { label: 'Agotado', color: '#9CA3AF', bg: '#F3F4F6' },
  expired: { label: 'Vencido', color: '#9CA3AF', bg: '#F3F4F6' },
}

export default function PromocionesPage() {
  const supabase = createClient()
  const { fmt: fmtCurrency } = useLocale()
  const [tab, setTab] = useState<'promos' | 'cupones'>('promos')
  const [promos, setPromos] = useState<Promotion[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [products, setProducts] = useState<CatProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [promoModal, setPromoModal] = useState<Partial<Promotion> | null>(null)
  const [couponModal, setCouponModal] = useState<Partial<Coupon> | null>(null)
  const [searchProd, setSearchProd] = useState('')
  const [prodCatFilter, setProdCatFilter] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [toast, setToast] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  async function load() {
    const [{ data: p }, { data: cp }, { data: cu }, { data: cats }] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('catalog_products').select('id,name,category_id,selling_price,photos').order('name'),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name').order('name'),
    ])
    const now = new Date()
    const updated = ((p || []) as Promotion[]).map(pr => {
      if (pr.status === 'scheduled' && new Date(pr.starts_at) <= now && new Date(pr.ends_at) > now) return { ...pr, status: 'active' as const }
      if ((pr.status === 'active' || pr.status === 'scheduled') && new Date(pr.ends_at) <= now) return { ...pr, status: 'finished' as const }
      return pr
    })
    for (const pr of updated) {
      const orig = (p as Promotion[]).find(x => x.id === pr.id)
      if (orig && orig.status !== pr.status) await supabase.from('promotions').update({ status: pr.status }).eq('id', pr.id)
    }
    setPromos(updated)
    setProducts((cp || []) as CatProduct[]); if (cats) setCategories(cats)
    setCoupons((cu || []) as Coupon[])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  // Close menus on outside click via parent div onClick

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // ── Promo CRUD ──
  async function savePromo() {
    if (!promoModal?.name || !promoModal.discount_value || !(promoModal.product_ids?.length) || !promoModal.ends_at) return
    const payload = { name: promoModal.name, discount_type: promoModal.discount_type || 'percentage', discount_value: promoModal.discount_value, product_ids: promoModal.product_ids, starts_at: promoModal.starts_at || new Date().toISOString(), ends_at: promoModal.ends_at, show_countdown: promoModal.show_countdown || false, status: new Date(promoModal.starts_at || Date.now()) <= new Date() ? 'active' : 'scheduled' }
    if (promoModal.id) { await supabase.from('promotions').update(payload).eq('id', promoModal.id) }
    else { const { data: oid } = await supabase.rpc('get_team_owner_id'); let uid = oid as string | null; if (!uid) { const { data: { user } } = await supabase.auth.getUser(); uid = user?.id || null }; await supabase.from('promotions').insert({ ...payload, user_id: uid }) }
    setPromoModal(null); load(); showToast(promoModal.id ? 'Promoción actualizada' : 'Promoción creada')
  }
  async function togglePromo(p: Promotion) {
    const ns = p.status === 'paused' ? (new Date(p.starts_at) <= new Date() ? 'active' : 'scheduled') : 'paused'
    await supabase.from('promotions').update({ status: ns }).eq('id', p.id); load(); showToast(ns === 'paused' ? 'Promoción pausada' : 'Promoción reanudada')
  }
  async function finishPromo(id: string) { await supabase.from('promotions').update({ status: 'finished', ends_at: new Date().toISOString() }).eq('id', id); load(); showToast('Promoción finalizada'); setOpenMenu(null) }
  async function deletePromo(id: string) { if (!confirm('¿Eliminar esta promoción?')) return; await supabase.from('promotions').delete().eq('id', id); load(); showToast('Eliminada'); setOpenMenu(null) }
  function duplicatePromo(p: Promotion) { setPromoModal({ name: `${p.name} (copia)`, discount_type: p.discount_type, discount_value: p.discount_value, product_ids: [...p.product_ids], show_countdown: p.show_countdown, starts_at: '', ends_at: '' }); setOpenMenu(null) }

  // ── Coupon CRUD ──
  async function saveCoupon() {
    if (!couponModal?.code || !couponModal.discount_value) return
    const payload = { code: couponModal.code.toUpperCase().trim(), discount_type: couponModal.discount_type || 'percentage', discount_value: couponModal.discount_value, max_uses: couponModal.max_uses || null, one_per_client: couponModal.one_per_client || false, min_amount: couponModal.min_amount || 0, expires_at: couponModal.expires_at || null, status: 'active' }
    if (couponModal.id) { await supabase.from('coupons').update(payload).eq('id', couponModal.id) }
    else { const { data: oid } = await supabase.rpc('get_team_owner_id'); let uid = oid as string | null; if (!uid) { const { data: { user } } = await supabase.auth.getUser(); uid = user?.id || null }; await supabase.from('coupons').insert({ ...payload, user_id: uid }) }
    setCouponModal(null); load(); showToast(couponModal.id ? 'Cupón actualizado' : 'Cupón creado')
  }
  async function toggleCoupon(c: Coupon) {
    const ns = c.status === 'paused' ? 'active' : 'paused'
    await supabase.from('coupons').update({ status: ns }).eq('id', c.id); load(); showToast(ns === 'paused' ? 'Cupón pausado' : 'Cupón activado')
  }
  async function deleteCoupon(id: string) { if (!confirm('¿Eliminar este cupón?')) return; await supabase.from('coupons').delete().eq('id', id); load(); showToast('Cupón eliminado'); setOpenMenu(null) }

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  const toggleProduct = (id: string) => { const ids = promoModal?.product_ids || []; setPromoModal({ ...promoModal, product_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] }) }
  const genCode = () => `EST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>

  return (
    <div onClick={() => openMenu && setOpenMenu(null)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-gray-500 text-sm mt-1">Descuentos y cupones para tu catálogo web.</p></div>
        <button onClick={() => tab === 'promos' ? setPromoModal({ discount_type: 'percentage', discount_value: 0, product_ids: [], show_countdown: false, starts_at: new Date().toISOString().slice(0, 10), ends_at: '' }) : setCouponModal({ discount_type: 'percentage', discount_value: 0, code: '' })}
          className="lg:hidden w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center hover:bg-[#0D9488] transition-colors"><Plus size={20} /></button>
        <button onClick={() => tab === 'promos' ? setPromoModal({ discount_type: 'percentage', discount_value: 0, product_ids: [], show_countdown: false, starts_at: new Date().toISOString().slice(0, 10), ends_at: '' }) : setCouponModal({ discount_type: 'percentage', discount_value: 0, code: '' })}
          className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors"><Plus size={16} /> {tab === 'promos' ? 'Crear promoción' : 'Crear cupón'}</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button onClick={() => setTab('promos')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'promos' ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-[#F3F3F1]'}`}>Promociones</button>
        <button onClick={() => setTab('cupones')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'cupones' ? 'bg-[#0F766E] text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-[#F3F3F1]'}`}>Cupones</button>
      </div>

      {/* ══ PROMOTIONS TAB ══ */}
      {tab === 'promos' && (<>
        {promos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E5E3] bg-[#FAFAF8] flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center">
              <Tag size={24} className="text-[#0F766E]" />
            </div>
            <div className="text-center px-8">
              <p className="text-sm font-semibold text-gray-700">Todavía no creaste promociones</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Creá descuentos para incentivar las ventas en tu catálogo</p>
            </div>
            <button onClick={() => setPromoModal({ discount_type: 'percentage', discount_value: 0, product_ids: [], show_countdown: false, starts_at: new Date().toISOString().slice(0, 10), ends_at: '' })}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors">+ Crear promoción</button>
          </div>
        ) : (<>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {promos.map(p => { const st = STATUS_LABELS[p.status]; return (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div><p className="font-semibold text-gray-800">{p.name}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: '#0F766E' }}>{p.discount_type === 'percentage' ? `-${p.discount_value}%` : `-${fmtCurrency(p.discount_value)}`} <span className="text-xs text-gray-400 font-normal ml-1">{p.product_ids.length} prod.</span></p>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}</p></div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {(p.status === 'active' || p.status === 'paused' || p.status === 'scheduled') && (
                    <button type="button" onClick={() => togglePromo(p)} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: p.status !== 'paused' ? '#22C55E' : '#D1D5DB' }}>
                      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: p.status !== 'paused' ? 'translateX(16px)' : 'translateX(0)' }} /></button>
                  )}
                  <button onClick={() => setPromoModal(p)} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
                  <div className="relative ml-auto"><button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === p.id ? null : p.id) }} className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal size={14} className="text-gray-400" /></button>
                    {openMenu === p.id && (<div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                      {p.status === 'active' && <button onClick={() => finishPromo(p.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">Finalizar</button>}
                      <button onClick={() => duplicatePromo(p)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">Duplicar</button>
                      <button onClick={() => deletePromo(p.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">Eliminar</button>
                    </div>)}</div>
                </div>
              </div>
            )})}
          </div>
          {/* Desktop */}
          <div className="hidden md:block card" style={{ overflow: 'visible' }}>
            <table className="w-full"><thead><tr className="border-b border-gray-100">
              {['Nombre', 'Descuento', 'Productos', 'Período', 'Estado', ''].map(h => <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr></thead><tbody>
              {promos.map(p => { const st = STATUS_LABELS[p.status]; return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setPromoModal(p)}>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#0F766E' }}>{p.discount_type === 'percentage' ? `-${p.discount_value}%` : `-${fmtCurrency(p.discount_value)}`}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.product_ids.length}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(p.starts_at)} → {fmtDate(p.ends_at)}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">
                    {(p.status === 'active' || p.status === 'paused' || p.status === 'scheduled') && (
                      <button type="button" onClick={e => { e.stopPropagation(); togglePromo(p) }} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: p.status !== 'paused' ? '#22C55E' : '#D1D5DB' }}>
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: p.status !== 'paused' ? 'translateX(16px)' : 'translateX(0)' }} /></button>
                    )}
                    <button onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                    <div className="relative"><button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === `p-${p.id}` ? null : `p-${p.id}`) }} className="p-1.5 rounded-lg hover:bg-gray-100"><MoreHorizontal size={14} className="text-gray-400" /></button>
                      {openMenu === `p-${p.id}` && (<div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                        {p.status === 'active' && <button onClick={() => finishPromo(p.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">Finalizar</button>}
                        <button onClick={() => duplicatePromo(p)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">Duplicar</button>
                        <button onClick={() => deletePromo(p.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">Eliminar</button>
                      </div>)}</div>
                  </div></td>
                </tr>
              )})}
            </tbody></table>
          </div>
        </>)}
      </>)}

      {/* ══ COUPONS TAB ══ */}
      {tab === 'cupones' && (<>
        {coupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E5E3] bg-[#FAFAF8] flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F0FDFA] flex items-center justify-center">
              <Ticket size={24} className="text-[#0F766E]" />
            </div>
            <div className="text-center px-8">
              <p className="text-sm font-semibold text-gray-700">Todavía no creaste cupones</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Creá códigos de descuento para compartir con tus clientes</p>
            </div>
            <button onClick={() => setCouponModal({ discount_type: 'percentage', discount_value: 0, code: '' })}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors">+ Crear cupón</button>
          </div>
        ) : (<>
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {coupons.map(c => { const st = STATUS_LABELS[c.status] || STATUS_LABELS.active; return (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div><p className="font-mono font-bold text-gray-800">{c.code}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: '#0F766E' }}>{c.discount_type === 'percentage' ? `-${c.discount_value}%` : `-${fmtCurrency(c.discount_value)}`}</p>
                    <p className="text-xs text-gray-400 mt-1">{c.used_count}/{c.max_uses || '∞'} usos{c.expires_at ? ` · vence ${fmtDate(c.expires_at)}` : ''}</p></div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {c.status !== 'exhausted' && c.status !== 'expired' && (
                    <button type="button" onClick={() => toggleCoupon(c)} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: c.status === 'active' ? '#22C55E' : '#D1D5DB' }}>
                      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: c.status === 'active' ? 'translateX(16px)' : 'translateX(0)' }} /></button>
                  )}
                  <button onClick={() => setCouponModal(c)} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
                  <div className="relative ml-auto"><button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === c.id ? null : c.id) }} className="p-1.5 rounded hover:bg-gray-100"><MoreHorizontal size={14} className="text-gray-400" /></button>
                    {openMenu === c.id && (<div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { navigator.clipboard.writeText(c.code); showToast('Código copiado'); setOpenMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Copy size={12} /> Copiar código</button>
                      <button onClick={() => deleteCoupon(c.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Eliminar</button>
                    </div>)}</div>
                </div>
              </div>
            )})}
          </div>
          {/* Desktop */}
          <div className="hidden md:block card" style={{ overflow: 'visible' }}>
            <table className="w-full"><thead><tr className="border-b border-gray-100">
              {['Código', 'Descuento', 'Usos', 'Monto mín.', 'Vencimiento', 'Estado', ''].map(h => <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr></thead><tbody>
              {coupons.map(c => { const st = STATUS_LABELS[c.status] || STATUS_LABELS.active; return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setCouponModal(c)}>
                  <td className="px-4 py-3"><button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(c.code); showToast('Código copiado') }} className="font-mono font-bold text-gray-800 hover:text-teal-700 flex items-center gap-1 group" title="Copiar código">{c.code} <Copy size={11} className="text-gray-300 group-hover:text-teal-500" /></button></td>
                  <td className="px-4 py-3 text-sm font-bold" style={{ color: '#0F766E' }}>{c.discount_type === 'percentage' ? `-${c.discount_value}%` : `-${fmtCurrency(c.discount_value)}`}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.used_count}/{c.max_uses || '∞'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.min_amount > 0 ? fmtCurrency(c.min_amount) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.expires_at ? fmtDate(c.expires_at) : 'Sin vencimiento'}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5">
                    {c.status !== 'exhausted' && c.status !== 'expired' && (
                      <button type="button" onClick={e => { e.stopPropagation(); toggleCoupon(c) }} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: c.status === 'active' ? '#22C55E' : '#D1D5DB' }}>
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: c.status === 'active' ? 'translateX(16px)' : 'translateX(0)' }} /></button>
                    )}
                    <button onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                    <div className="relative"><button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === `c-${c.id}` ? null : `c-${c.id}`) }} className="p-1.5 rounded-lg hover:bg-gray-100"><MoreHorizontal size={14} className="text-gray-400" /></button>
                      {openMenu === `c-${c.id}` && (<div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { navigator.clipboard.writeText(c.code); showToast('Código copiado'); setOpenMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"><Copy size={12} /> Copiar código</button>
                        <button onClick={() => deleteCoupon(c.id)} className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Eliminar</button>
                      </div>)}</div>
                  </div></td>
                </tr>
              )})}
            </tbody></table>
          </div>
        </>)}
      </>)}

      {/* ── Promo Modal ── */}
      {promoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-gray-900">{promoModal.id ? 'Editar' : 'Nueva'} promoción</h3><button onClick={() => setPromoModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button></div>
            <div className="space-y-4">
              <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Nombre *</label><input className="input-base" value={promoModal.name || ''} onChange={e => setPromoModal({ ...promoModal, name: e.target.value })} placeholder="Ej: Promo Día de la Madre, Hot Sale..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tipo</label>
                  <div className="inline-flex rounded-lg border border-[#E5E5E3] overflow-hidden">{[['percentage', '%'], ['fixed', '$']].map(([v, l]) => (<button key={v} type="button" onClick={() => setPromoModal({ ...promoModal, discount_type: v as 'percentage' | 'fixed' })} className={`px-4 py-1.5 text-xs font-semibold ${promoModal.discount_type === v ? 'text-white' : 'text-gray-500'}`} style={promoModal.discount_type === v ? { background: '#0F766E' } : {}}>{l}</button>))}</div></div>
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Valor *</label><input type="number" className="input-base" min={1} max={promoModal.discount_type === 'percentage' ? 99 : undefined} value={promoModal.discount_value || ''} onChange={e => setPromoModal({ ...promoModal, discount_value: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Inicio *</label><input type="date" className="input-base text-sm" value={(promoModal.starts_at || '').slice(0, 10)} onChange={e => setPromoModal({ ...promoModal, starts_at: e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : '' })} /></div>
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Fin *</label><input type="date" className="input-base text-sm" value={(promoModal.ends_at || '').slice(0, 10)} onChange={e => setPromoModal({ ...promoModal, ends_at: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : '' })} /></div>
              </div>
              <div className="flex items-center justify-between"><label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Contador regresivo</label>
                <button type="button" onClick={() => setPromoModal({ ...promoModal, show_countdown: !promoModal.show_countdown })} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: promoModal.show_countdown ? '#0F766E' : '#D1D5DB' }}><span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: promoModal.show_countdown ? 'translateX(16px)' : 'translateX(0)' }} /></button></div>
              <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Productos * <span className="text-xs text-gray-400 ml-1">{(promoModal.product_ids || []).length} de {products.length} seleccionados</span></label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /><input className="input-base text-sm w-full !pl-9" placeholder="Buscar..." value={searchProd} onChange={e => setSearchProd(e.target.value)} /></div>
                  {categories.length > 0 && <select value={prodCatFilter} onChange={e => setProdCatFilter(e.target.value)} className="input-base text-xs !py-1.5 w-auto"><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
                </div>
                {(() => {
                  const visible = products.filter(p => (!searchProd || p.name.toLowerCase().includes(searchProd.toLowerCase())) && (!prodCatFilter || p.category_id === prodCatFilter))
                  const allSelected = visible.length > 0 && visible.every(p => (promoModal.product_ids || []).includes(p.id))
                  return (<>
                    <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border border-gray-200 border-b-0 cursor-pointer">
                      <input type="checkbox" checked={allSelected} onChange={() => {
                        const visibleIds = visible.map(p => p.id)
                        if (allSelected) setPromoModal({ ...promoModal, product_ids: (promoModal.product_ids || []).filter(id => !visibleIds.includes(id)) })
                        else setPromoModal({ ...promoModal, product_ids: [...new Set([...(promoModal.product_ids || []), ...visibleIds])] })
                      }} className="w-4 h-4 rounded accent-[#0F766E] cursor-pointer" />
                      <span className="text-xs font-semibold text-gray-500">Seleccionar todos ({visible.length})</span>
                    </label>
                    <div className="border border-gray-200 rounded-b-lg max-h-48 overflow-y-auto">{visible.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"><input type="checkbox" checked={(promoModal.product_ids || []).includes(p.id)} onChange={() => toggleProduct(p.id)} className="w-4 h-4 rounded accent-[#0F766E] cursor-pointer" /><span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span><span className="text-xs text-gray-400">{fmtCurrency(p.selling_price)}</span></label>
                    ))}</div>
                  </>)
                })()}</div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setPromoModal(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors">Cancelar</button><button onClick={savePromo} disabled={!promoModal.name?.trim() || !promoModal.discount_value || !(promoModal.product_ids?.length) || !promoModal.ends_at} className="flex-1 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors disabled:opacity-40">Guardar</button></div>
          </div>
        </div>
      )}

      {/* ── Coupon Modal ── */}
      {couponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold text-gray-900">{couponModal.id ? 'Editar' : 'Nuevo'} cupón</h3><button onClick={() => setCouponModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button></div>
            <div className="space-y-4">
              <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Código *</label>
                <div className="flex gap-2"><input className="input-base flex-1 uppercase font-mono" value={couponModal.code || ''} onChange={e => setCouponModal({ ...couponModal, code: e.target.value.toUpperCase().replace(/\s/g, '') })} placeholder="Ej: PRIMERA10" />
                  <button type="button" onClick={() => setCouponModal({ ...couponModal, code: genCode() })} className="px-4 py-2 rounded-lg border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors whitespace-nowrap">Generar</button></div>
                <p className="text-[10px] text-gray-400 mt-0.5">Este código lo ingresa el cliente en el checkout.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tipo</label>
                  <div className="inline-flex rounded-lg border border-[#E5E5E3] overflow-hidden">{[['percentage', '%'], ['fixed', '$']].map(([v, l]) => (<button key={v} type="button" onClick={() => setCouponModal({ ...couponModal, discount_type: v as 'percentage' | 'fixed' })} className={`px-4 py-1.5 text-xs font-semibold ${couponModal.discount_type === v ? 'text-white' : 'text-gray-500'}`} style={couponModal.discount_type === v ? { background: '#0F766E' } : {}}>{l}</button>))}</div></div>
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Valor *</label><input type="number" className="input-base" min={1} value={couponModal.discount_value || ''} onChange={e => setCouponModal({ ...couponModal, discount_value: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Usos máximos</label><input type="number" className="input-base" min={1} value={couponModal.max_uses || ''} onChange={e => setCouponModal({ ...couponModal, max_uses: Number(e.target.value) || null })} placeholder="Ilimitado" /></div>
                <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Monto mínimo ($)</label><input type="number" className="input-base" min={0} value={couponModal.min_amount || ''} onChange={e => setCouponModal({ ...couponModal, min_amount: Number(e.target.value) })} placeholder="Sin mínimo" /></div>
              </div>
              <div className="flex items-center justify-between"><label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Un uso por cliente</label>
                <button type="button" onClick={() => setCouponModal({ ...couponModal, one_per_client: !couponModal.one_per_client })} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: couponModal.one_per_client ? '#0F766E' : '#D1D5DB' }}><span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: couponModal.one_per_client ? 'translateX(16px)' : 'translateX(0)' }} /></button></div>
              <div><label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Vencimiento</label><input type="date" className="input-base" value={couponModal.expires_at?.slice(0, 10) || ''} onChange={e => setCouponModal({ ...couponModal, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                <p className="text-[10px] text-gray-400 mt-0.5">Dejalo vacío si no querés que venza.</p></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={() => setCouponModal(null)} className="flex-1 py-2.5 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors">Cancelar</button><button onClick={saveCoupon} disabled={!couponModal.code?.trim() || !couponModal.discount_value} className="flex-1 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors disabled:opacity-40">Guardar</button></div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium shadow-lg">{toast}</div>}
    </div>
  )
}
