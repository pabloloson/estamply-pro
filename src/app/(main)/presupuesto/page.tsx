'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart, Trash2, FileDown, MessageCircle, Mail, X,
  ArrowLeft, Loader2, Phone, MapPin, Globe, AtSign, Pencil, ChevronDown, ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePresupuesto } from '@/features/presupuesto/context/PresupuestoContext'
import type { Tecnica } from '@/features/presupuesto/types'
import { DEFAULT_SETTINGS, type WorkshopSettings } from '@/features/presupuesto/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'

const TECHNIQUE_LABELS: Record<Tecnica, string> = {
  subli: 'Sublimación', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía',
}
const TECHNIQUE_COLORS: Record<Tecnica, string> = {
  subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E',
}

interface DBClient { id: string; name: string; phone: string | null; email: string | null; whatsapp: string | null }
interface BusinessProfile {
  business_name: string | null; business_logo_url: string | null; business_cuit: string | null
  business_address: string | null; business_phone: string | null; business_email: string | null
  business_instagram: string | null; business_website: string | null; workshop_name: string | null
}

export default function PresupuestoPage() {
  const router = useRouter()
  const t = useTranslations('quotes')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency } = useLocale()
  const supabase = createClient()
  const { items, removeItem, clearItems, loadItems, totalVenta, totalCosto, totalGanancia, loadedPresupuestoId, setLoadedPresupuestoId } = usePresupuesto()

  const [clients, setClients] = useState<DBClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [bizProfile, setBizProfile] = useState<BusinessProfile | null>(null)
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [submitting, setSubmitting] = useState(false)

  const [clientId, setClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [advanceMode, setAdvanceMode] = useState<'percent' | 'fixed'>('percent')
  const [advancePercent, setAdvancePercent] = useState(50)
  const [advanceFixed, setAdvanceFixed] = useState(0)
  const [notes, setNotes] = useState('')
  const [validezDias, setValidezDias] = useState(15)
  const [editingValidez, setEditingValidez] = useState(false)
  const [editingCondiciones, setEditingCondiciones] = useState(false)
  const [showResumen, setShowResumen] = useState(false)
  const [publicLink, setPublicLink] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [savedPresupuestos, setSavedPresupuestos] = useState<Array<{ id: string; codigo: string; numero: string; client_name: string | null; client_id: string | null; total: number; origen: string; created_at: string }>>([])
  const [showSaved, setShowSaved] = useState(true)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  const defaultCondiciones = '· Se requiere seña para iniciar el trabajo.\n· El tiempo de entrega se confirma al aprobar el presupuesto.\n· Los precios pueden variar si cambian los costos de materiales.'
  const [condiciones, setCondiciones] = useState(defaultCondiciones)

  const today = new Date()
  const quoteDate = format(today, "d 'de' MMMM 'de' yyyy", { locale: es })
  const [quoteNumber] = useState(() => `${format(new Date(), 'yyyyMM')}-${String(Math.floor(Math.random() * 900) + 100)}`)

  // Generate short random code
  function genCodigo() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  // Save presupuesto to DB and get public link
  async function ensurePublicLink() {
    if (publicLink) return publicLink
    setSavingLink(true)
    const codigo = genCodigo()
    const { error } = await supabase.from('presupuestos').insert({
      codigo, numero: quoteNumber, validez_dias: validezDias,
      client_id: clientId || null, client_name: clientDisplayName || null,
      items: items.map(i => ({ tecnica: i.tecnica, nombre: i.nombre, cantidad: i.cantidad, precioUnit: i.precioUnit, precioSinDesc: i.precioSinDesc, subtotal: i.subtotal })),
      total: totalVenta, condiciones,
      business_profile: bizProfile || {},
    })
    setSavingLink(false)
    if (error) { console.error(error); return '' }
    const link = `${window.location.origin}/p/${codigo}`
    setPublicLink(link)
    return link
  }

  async function loadSavedPresupuesto(presId: string) {
    const { data } = await supabase.from('presupuestos').select('*').eq('id', presId).single()
    if (!data) return
    const dbItems = (data.items || []) as Array<Record<string, unknown>>
    const mapped: import('@/features/presupuesto/types').PresupuestoItem[] = dbItems.map((i, idx) => ({
      id: `loaded-${idx}`,
      tecnica: ((i.tecnica as string) || 'subli') as import('@/features/presupuesto/types').Tecnica,
      nombre: (i.nombre as string) || '',
      costoUnit: (i.costoUnit as number) || 0,
      precioUnit: (i.precioUnit as number) || 0,
      precioSinDesc: (i.precioSinDesc as number) || (i.precioUnit as number) || 0,
      cantidad: (i.cantidad as number) || 1,
      subtotal: (i.subtotal as number) || 0,
      ganancia: ((i.subtotal as number) || 0) - ((i.costoUnit as number) || 0) * ((i.cantidad as number) || 1),
      notas: (i.notas as string) || undefined,
    }))
    loadItems(mapped)
    setLoadedPresupuestoId(presId)
    // Load client
    if (data.client_id) setClientId(data.client_id)
    else if (data.client_name) setNewClientName(data.client_name)
    // Load public link
    if (data.codigo) setPublicLink(`/p/${data.codigo}`)
  }

  const selectedClient = clients.find(c => c.id === clientId)
  const clientDisplayName = selectedClient?.name || newClientName || ''

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: cls }, { data: prof }, { data: wsData }, { data: saved }] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email, whatsapp').order('name'),
        user ? supabase.from('profiles').select('business_name,business_logo_url,business_cuit,business_address,business_phone,business_email,business_instagram,business_website,workshop_name').eq('id', user.id).single() : Promise.resolve({ data: null }),
        supabase.from('workshop_settings').select('settings').single(),
        supabase.from('presupuestos').select('id,codigo,numero,client_name,client_id,total,origen,created_at').order('created_at', { ascending: false }).limit(20),
      ])
      if (cls) setClients(cls)
      if (saved) setSavedPresupuestos(saved as typeof savedPresupuestos)
      if (prof) setBizProfile(prof)
      if (wsData?.settings) {
        const s = { ...DEFAULT_SETTINGS, ...(wsData.settings as Partial<WorkshopSettings>) }
        setWs(s)
        const sx = s as Record<string, unknown>
        setValidezDias((sx.validez_dias as number) || 15)
        setAdvancePercent((sx.sena_predeterminada as number) || 50)
        if (sx.condiciones_presupuesto) setCondiciones(sx.condiciones_presupuesto as string)
      }
      setLoadingClients(false)
    }
    loadData()
  }, [])

  const advanceAmount = advanceMode === 'percent' ? Math.round(totalVenta * advancePercent / 100) : advanceFixed

  // CORRECCIÓN 1: Show business name, not user name
  const tallerName = bizProfile?.business_name || bizProfile?.workshop_name || ''

  function getWhatsAppText() {
    const biz = tallerName || 'Tu Taller'
    const lines = items.map(i => `• ${i.cantidad}x ${i.nombre} (${TECHNIQUE_LABELS[i.tecnica]}): ${fmtCurrency(i.subtotal)}`).join('\n')
    const cl = clientDisplayName ? `Cliente: ${clientDisplayName}\n` : ''
    return encodeURIComponent(`🧾 *PRESUPUESTO - ${biz.toUpperCase()}*\nN°: #${quoteNumber}\nFecha: ${quoteDate}\n\n${cl}${lines}\n\n━━━━━━━━━━━━━\n💰 *TOTAL: ${fmtCurrency(totalVenta)}*\n\n_Generado con Estamply_`)
  }

  async function handleConfirmarPedido() {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      let resolvedClientId: string | null = null
      if (clientId) resolvedClientId = clientId
      else if (newClientName.trim()) {
        const { data: nc, error: ce } = await supabase.from('clients').insert({ name: newClientName.trim(), user_id: user.id }).select('id').single()
        if (ce) throw ce
        resolvedClientId = nc.id
      }
      const orderItems = items.map(i => ({ tecnica: i.tecnica, nombre: i.nombre, cantidad: i.cantidad, precioUnit: i.precioUnit, subtotal: i.subtotal, notas: i.notas || null }))
      const { data: order, error } = await supabase.from('orders').insert({
        user_id: user.id, client_id: resolvedClientId, status: 'pending',
        total_price: totalVenta, total_cost: totalCosto,
        advance_payment: advanceAmount, due_date: dueDate || null, notes: notes || null,
        items: orderItems,
      }).select('id').single()
      if (error) throw error
      // Register initial advance as first payment if > 0
      if (advanceAmount > 0 && order) {
        await supabase.from('payments').insert({ order_id: order.id, monto: advanceAmount, metodo: 'seña', fecha: new Date().toISOString().split('T')[0] })
      }
      clearItems(); router.push('/orders')
    } catch (err) { console.error(err); alert('Error al confirmar. Intentá de nuevo.') }
    finally { setSubmitting(false) }
  }

  const margenPct = totalVenta > 0 ? Math.round((totalGanancia / totalVenta) * 100) : 0

  return (
    <>
      {/* CORRECCIÓN 3: Aggressive print CSS — hide sidebar, mobile header, system chrome */}
      <style>{`
        @media print {
          body { margin: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print, aside, nav, header, [class*="sidebar"], [class*="mobile"] { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; max-width: 100% !important; border: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .flex.min-h-screen { display: block !important; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ══ LIST VIEW: when no presupuesto is loaded ══ */}
        {items.length === 0 && !loadedPresupuestoId ? (<>
          <div className="flex items-center justify-between mb-6 no-print">
            <div>
              <h1 className="text-2xl font-black text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{savedPresupuestos.length} presupuesto{savedPresupuestos.length !== 1 ? 's' : ''}</p>
            </div>
            <Link href="/cotizador" className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-white" style={{ background: '#6C5CE7' }}>
              {t('newQuote')}
            </Link>
          </div>

          {savedPresupuestos.length > 0 ? (
            <div className="card overflow-hidden">
              <table className="w-full"><thead><tr className="border-b border-gray-100">
                {[t('code'), t('client'), t('date'), t('total'), ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
              </tr></thead><tbody>
                {savedPresupuestos.map(p => {
                  const cName = p.client_name || clients.find(c => c.id === p.client_id)?.name || tc('noClient')
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => loadSavedPresupuesto(p.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 text-sm">#{p.codigo}</span>
                          {p.origen === 'catalogo_web' && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-green-100 text-green-600">Web</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cName}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-3 font-bold text-gray-800 text-sm">{fmtCurrency(p.total)}</td>
                      <td className="px-4 py-3">
                        <a href={`/p/${p.codigo}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-xs text-purple-500 hover:text-purple-700">{t('viewPublic')}</a>
                      </td>
                    </tr>
                  )
                })}
              </tbody></table>
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100"><ShoppingCart size={28} className="text-gray-400" /></div>
              <p className="text-gray-500 text-sm text-center max-w-xs">No tenés presupuestos todavía. Creá uno desde el Cotizador.</p>
              <Link href="/cotizador" className="btn-primary text-sm px-5 py-2 rounded-xl font-semibold">{t('goToQuoter')}</Link>
            </div>
          )}
        </>) : (<>

        {/* ══ DETAIL VIEW: when items are loaded ══ */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-2">
            <button onClick={() => { clearItems(); setPublicLink('') }} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></button>
            <h1 className="text-2xl font-black text-gray-900">Presupuesto</h1>
            {loadedPresupuestoId && <span className="text-sm text-gray-400">#{savedPresupuestos.find(p => p.id === loadedPresupuestoId)?.codigo || ''}</span>}
            {!loadedPresupuestoId && <span className="text-sm text-gray-400">{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</span>}
            {loadedPresupuestoId && savedPresupuestos.find(p => p.id === loadedPresupuestoId)?.origen === 'catalogo_web' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-green-100 text-green-600">{t('webBadge')}</span>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100"><ShoppingCart size={28} className="text-gray-400" /></div>
            <p className="text-gray-500 text-sm text-center max-w-xs">{t('emptyQuote')}</p>
            <Link href="/cotizador" className="btn-primary text-sm px-5 py-2 rounded-xl font-semibold">{t('goToQuoter')}</Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ── LEFT: Quote Document ── */}
            <div className="flex-1">
              <div className="print-page bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" id="quote-document">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #6C5CE7, #a29bfe)' }} />

                {/* CORRECCIÓN 1: Header shows TALLER data, not user */}
                <div className="px-8 pt-7 pb-5 flex items-start justify-between gap-6 border-b border-gray-100">
                  <div className="flex items-start gap-4">
                    {bizProfile?.business_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bizProfile.business_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-xl flex-shrink-0" />
                    ) : tallerName ? (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}>
                        <span className="text-white font-black text-xl">{tallerName[0].toUpperCase()}</span>
                      </div>
                    ) : null}
                    <div>
                      <h2 className="font-black text-gray-900 text-lg leading-tight">{tallerName || 'Mi Taller'}</h2>
                      {bizProfile?.business_cuit && <p className="text-xs text-gray-500 mt-0.5">CUIT: {bizProfile.business_cuit}</p>}
                      <div className="mt-2 space-y-0.5">
                        {bizProfile?.business_address && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={10} />{bizProfile.business_address}</p>}
                        {bizProfile?.business_phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={10} />{bizProfile.business_phone}</p>}
                        {bizProfile?.business_email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={10} />{bizProfile.business_email}</p>}
                        {bizProfile?.business_instagram && <p className="text-xs text-gray-500 flex items-center gap-1.5"><AtSign size={10} />{bizProfile.business_instagram}</p>}
                        {bizProfile?.business_website && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Globe size={10} />{bizProfile.business_website}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Presupuesto</p>
                    <p className="text-2xl font-black" style={{ color: '#6C5CE7' }}>#{quoteNumber}</p>
                    <p className="text-xs text-gray-500 mt-2">{quoteDate}</p>
                    {/* CORRECCIÓN 5: Editable validez */}
                    <div className="mt-0.5">
                      {editingValidez ? (
                        <div className="flex items-center gap-1 justify-end no-print">
                          <span className="text-xs text-gray-400">Válido por</span>
                          <input type="number" className="w-12 text-xs text-center border rounded px-1 py-0.5" min={1} value={validezDias}
                            onChange={e => setValidezDias(Number(e.target.value))} onBlur={() => setEditingValidez(false)} autoFocus />
                          <span className="text-xs text-gray-400">días</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 cursor-pointer no-print hover:text-gray-600" onClick={() => setEditingValidez(true)}>
                          {t('validFor', { days: validezDias })} <Pencil size={8} className="inline ml-0.5" />
                        </p>
                      )}
                      <p className="text-xs text-gray-400 hidden print:block">{t('validFor', { days: validezDias })}</p>
                    </div>
                  </div>
                </div>

                {/* Client — in the document body */}
                <div className="px-8 py-4 border-b border-gray-100" style={{ background: '#FAFAFA' }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">{t('client')}</p>
                  {/* Edit mode (screen only) */}
                  <div className="no-print">
                    {loadingClients ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
                    ) : (
                      <div className="flex gap-2 items-start">
                        <select className="input-base text-sm flex-1" value={clientId} onChange={e => { setClientId(e.target.value); if (e.target.value) setNewClientName('') }}>
                          <option value="">Nuevo cliente…</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {!clientId && <input type="text" className="input-base text-sm flex-1" placeholder="Nombre del cliente" value={newClientName} onChange={e => setNewClientName(e.target.value)} />}
                      </div>
                    )}
                    {clientDisplayName && (
                      <div className="mt-2">
                        <p className="font-semibold text-gray-800 text-sm">{clientDisplayName}</p>
                        <p className="text-[11px] text-gray-500">
                          {[selectedClient?.email, selectedClient?.whatsapp || selectedClient?.phone].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Print view — CORRECCIÓN 3: hide if no client */}
                  <div className="hidden print:block">
                    {clientDisplayName ? (
                      <div>
                        <p className="font-bold text-gray-800">{clientDisplayName}</p>
                        {selectedClient?.email && <p className="text-xs text-gray-500">{selectedClient.email}</p>}
                        {selectedClient?.phone && <p className="text-xs text-gray-500">{selectedClient.phone}</p>}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Items table */}
                <div className="px-8 py-5">
                  <table className="w-full">
                    <thead><tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                      <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Técnica</th>
                      <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Descripción</th>
                      <th className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Cant.</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">P. Unit.</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Subtotal</th>
                      <th className="no-print w-10" />
                    </tr></thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td className="py-3 pr-3 align-top">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: `${TECHNIQUE_COLORS[item.tecnica]}18`, color: TECHNIQUE_COLORS[item.tecnica] }}>{TECHNIQUE_LABELS[item.tecnica]}</span>
                          </td>
                          <td className="py-3 pr-3 align-top">
                            <p className="font-semibold text-gray-800 text-sm">{item.nombre}</p>
                            {item.notas && <p className="text-[11px] text-gray-400 mt-0.5">{item.notas}</p>}
                          </td>
                          <td className="py-3 text-center text-sm text-gray-600 font-medium align-top">{item.cantidad}</td>
                          <td className="py-3 text-right text-sm text-gray-600 align-top">
                            {/* CORRECCIÓN 7: Strikethrough only when there's a discount */}
                            {item.precioSinDesc > item.precioUnit + 1 && <span className="text-xs text-gray-400 line-through mr-1">{fmtCurrency(item.precioSinDesc)}</span>}
                            {fmtCurrency(item.precioUnit)}
                          </td>
                          <td className="py-3 text-right font-bold text-gray-800 align-top">{fmtCurrency(item.subtotal)}</td>
                          <td className="py-3 no-print align-top">
                            <button onClick={() => removeItem(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-60 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span className="font-medium text-gray-700">{fmtCurrency(totalVenta)}</span></div>
                      <div className="flex justify-between pt-2" style={{ borderTop: '2px solid #6C5CE7' }}>
                        <span className="font-black text-gray-900">TOTAL</span>
                        <span className="font-black text-xl" style={{ color: '#6C5CE7' }}>{fmtCurrency(totalVenta)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CORRECCIÓN 6: Editable condiciones */}
                <div className="px-8 py-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('conditions')}</p>
                    <button onClick={() => setEditingCondiciones(!editingCondiciones)} className="no-print p-0.5 rounded hover:bg-gray-100">
                      <Pencil size={10} className="text-gray-400" />
                    </button>
                  </div>
                  {editingCondiciones ? (
                    <textarea className="input-base text-xs w-full resize-none no-print" rows={4} value={condiciones} onChange={e => setCondiciones(e.target.value)} />
                  ) : null}
                  <div className={`text-xs text-gray-500 whitespace-pre-line leading-relaxed ${editingCondiciones ? 'hidden' : ''}`}>{condiciones}</div>
                  {/* Always show condiciones in print */}
                  <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed hidden print:block">{condiciones}</div>
                </div>

                {/* Footer — CORRECCIÓN 6: branding */}
                <div className="px-8 py-3 flex items-center justify-center" style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                  <p className="flex items-center gap-1.5 text-[10px] text-gray-300">
                    <img src="/logo-icon.png" alt="" className="w-3 h-3 opacity-40" />
                    Generado con Estamply
                  </p>
                </div>
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #6C5CE7, #a29bfe)' }} />
              </div>
            </div>

            {/* ── RIGHT: Actions ── */}
            <div className="lg:w-72 space-y-4 no-print">
              {/* Share */}
              <div className="card p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('share')}</p>
                <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"><FileDown size={15} /> {t('downloadPdf')}</button>
                <button disabled={savingLink} onClick={async () => {
                  const link = await ensurePublicLink()
                  if (!link) return
                  const waNum = (selectedClient?.whatsapp || selectedClient?.phone || '').replace(/[\s\-\(\)]/g, '')
                  const name = clientDisplayName ? clientDisplayName.split(' ')[0] : ''
                  const msg = encodeURIComponent(`Hola${name ? ` ${name}` : ''}! 👋\n\nTe envío el presupuesto *#${quoteNumber}* por un total de *${fmtCurrency(totalVenta)}*.\n\n📋 Podés verlo y descargarlo acá:\n${link}\n\nCualquier consulta estoy a disposición!`)
                  window.open(`https://wa.me/${waNum}?text=${msg}`, '_blank')
                }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-50" style={{ borderColor: '#25d36620', color: '#25d366', background: '#25d36608' }}>
                  <MessageCircle size={15} /> {savingLink ? tc('loading') : t('whatsapp')}
                </button>
                <button disabled={savingLink} onClick={async () => {
                  const link = await ensurePublicLink()
                  if (!link) return
                  setEmailTo(selectedClient?.email || '')
                  setEmailSubject(`Presupuesto #${quoteNumber} - ${tallerName || 'Taller'}`)
                  setEmailBody(`Hola${clientDisplayName ? ` ${clientDisplayName.split(' ')[0]}` : ''}!\n\nTe envío el presupuesto #${quoteNumber} por un total de ${fmtCurrency(totalVenta)}.\n\nPodés verlo y descargarlo acá:\n${link}\n\nSaludos!`)
                  setShowEmailModal(true)
                }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-50" style={{ borderColor: '#4285f420', color: '#4285f4', background: '#4285f408' }}>
                  <Mail size={15} /> {t('email')}
                </button>
                {publicLink && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <input type="text" readOnly value={publicLink} className="flex-1 text-xs text-gray-500 bg-transparent outline-none truncate" />
                    <button onClick={() => { navigator.clipboard.writeText(publicLink); alert('Link copiado!') }} className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex-shrink-0">Copiar</button>
                  </div>
                )}
              </div>

              {/* Confirm — CORRECCIÓN 2: help text for seña */}
              <div className="card p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('confirmAsOrder')}</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('deliveryDate')}</label>
                  <input type="date" className="input-base" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('deposit')}</label>
                  <div className="flex gap-1 mb-2">
                    {(['percent', 'fixed'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setAdvanceMode(m)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${advanceMode === m ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m === 'percent' ? 'Porcentaje %' : 'Monto fijo $'}
                      </button>
                    ))}
                  </div>
                  {advanceMode === 'percent' ? (
                    <div className="flex items-center gap-2">
                      <input type="number" className="input-base w-20" min={0} max={100} value={advancePercent} onChange={e => setAdvancePercent(Number(e.target.value))} />
                      <span className="text-xs text-gray-400">%</span>
                      <span className="text-xs text-gray-500 font-medium">= {fmtCurrency(advanceAmount)}</span>
                    </div>
                  ) : (
                    <input type="number" className="input-base" min={0} value={advanceFixed} onChange={e => setAdvanceFixed(Number(e.target.value))} />
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">Seña a cobrar al confirmar este pedido.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas</label>
                  <textarea className="input-base resize-none" rows={2} placeholder="Observaciones…" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <button type="button" disabled={submitting || items.length === 0} onClick={handleConfirmarPedido}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
                  style={{ background: '#6C5CE7', boxShadow: submitting ? 'none' : '0 4px 14px rgba(108,92,231,0.35)' }}>
                  {submitting ? <><Loader2 size={15} className="animate-spin" /> {tc('loading')}</> : t('confirmOrder')}
                </button>
              </div>

              {/* CORRECCIÓN 4: Collapsible internal summary */}
              <div className="card overflow-hidden">
                <button type="button" onClick={() => setShowResumen(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('viewProfitability')}</span>
                  {showResumen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {showResumen && (
                  <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600"><span>Venta</span><span className="font-semibold text-gray-800">{fmtCurrency(totalVenta)}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Costo</span><span className="font-semibold">{fmtCurrency(totalCosto)}</span></div>
                    <div className="flex justify-between font-bold pt-1 border-t border-gray-100" style={{ color: '#6C5CE7' }}><span>Ganancia</span><span>{fmtCurrency(totalGanancia)}</span></div>
                    <div className="flex justify-between text-xs text-gray-400"><span>Margen</span><span className="font-semibold">{margenPct}%</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </>)}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Enviar presupuesto por email</h3>
              <button onClick={() => setShowEmailModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Para *</label>
                <input type="email" className="input-base" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="email@cliente.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                <input className="input-base" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea className="input-base resize-none" rows={6} value={emailBody} onChange={e => setEmailBody(e.target.value)} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEmailModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
              <button onClick={() => {
                navigator.clipboard.writeText(emailBody)
                const mailto = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
                window.open(mailto)
                setShowEmailModal(false)
                alert('Mensaje copiado al portapapeles y se abrió tu cliente de correo.')
              }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#4285f4' }}>
                Abrir email
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center">El mensaje también se copió al portapapeles por si tu cliente de correo no se abre.</p>
          </div>
        </div>
      )}
    </>
  )
}
