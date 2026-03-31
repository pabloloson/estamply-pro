'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart, Trash2, FileDown, MessageCircle, Mail,
  ArrowLeft, Loader2, Phone, MapPin, Globe, AtSign,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePresupuesto } from '@/features/presupuesto/context/PresupuestoContext'
import type { Tecnica } from '@/features/presupuesto/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TECHNIQUE_LABELS: Record<Tecnica, string> = {
  subli: 'Sublimación',
  dtf: 'DTF',
  vinyl: 'Vinilo',
}

const TECHNIQUE_COLORS: Record<Tecnica, string> = {
  subli: '#6C5CE7',
  dtf: '#E17055',
  vinyl: '#E84393',
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

interface DBClient { id: string; name: string; phone: string | null; email: string | null }

interface BusinessProfile {
  business_name: string | null
  business_logo_url: string | null
  business_cuit: string | null
  business_address: string | null
  business_phone: string | null
  business_email: string | null
  business_instagram: string | null
  business_website: string | null
  workshop_name: string | null
}

export default function PresupuestoPage() {
  const router = useRouter()
  const supabase = createClient()
  const { items, removeItem, clearItems, totalVenta, totalCosto, totalGanancia } = usePresupuesto()

  const [clients, setClients] = useState<DBClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [bizProfile, setBizProfile] = useState<BusinessProfile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [clientId, setClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [advance, setAdvance] = useState<number>(0)
  const [notes, setNotes] = useState('')

  const today = new Date()
  const quoteDate = format(today, "dd 'de' MMMM 'de' yyyy", { locale: es })
  const quoteNumber = `${format(today, 'yyyyMM')}-${String(Math.floor(Math.random() * 900) + 100)}`

  const selectedClient = clients.find(c => c.id === clientId)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: cls }, { data: prof }] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email').order('name'),
        user
          ? supabase.from('profiles').select('business_name,business_logo_url,business_cuit,business_address,business_phone,business_email,business_instagram,business_website,workshop_name').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
      ])
      if (cls) setClients(cls)
      if (prof) setBizProfile(prof)
      setLoadingClients(false)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function getWhatsAppText() {
    const biz = bizProfile?.business_name || bizProfile?.workshop_name || 'Tu Taller'
    const lines = items.map(i =>
      `• ${i.cantidad}x ${i.nombre} (${TECHNIQUE_LABELS[i.tecnica]}): ${fmt(i.subtotal)}`
    ).join('\n')
    const clientLine = selectedClient ? `Cliente: ${selectedClient.name}\n` : newClientName ? `Cliente: ${newClientName}\n` : ''
    return encodeURIComponent(
      `🧾 *PRESUPUESTO - ${biz.toUpperCase()}*\n` +
      `Fecha: ${quoteDate}\n\n` +
      `${clientLine}` +
      `${lines}\n\n` +
      `━━━━━━━━━━━━━\n💰 *TOTAL: ${fmt(totalVenta)}*\n\n_Generado con Estamply_`
    )
  }

  async function handleConfirmarPedido() {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      let resolvedClientId: string | null = null

      if (clientId) {
        resolvedClientId = clientId
      } else if (newClientName.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({ name: newClientName.trim(), user_id: user.id })
          .select('id')
          .single()
        if (clientError) throw clientError
        resolvedClientId = newClient.id
      }

      const { error: orderError } = await supabase.from('orders').insert({
        user_id: user.id,
        client_id: resolvedClientId,
        status: 'pending',
        total_price: totalVenta,
        total_cost: totalCosto,
        advance_payment: advance || 0,
        due_date: dueDate || null,
        notes: notes || null,
      })

      if (orderError) throw orderError

      clearItems()
      router.push('/orders')
    } catch (err) {
      console.error('Error al confirmar pedido:', err)
      alert('Hubo un error al confirmar el pedido. Por favor intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const displayName = bizProfile?.business_name || bizProfile?.workshop_name || ''

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; background: white !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; max-width: 100% !important; }
          .print-layout { display: block !important; }
          @page { margin: 0; size: A4; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-2">
            <Link href="/calculator" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-black text-gray-900">Presupuesto</h1>
            <span className="text-sm text-gray-400">
              {items.length === 0 ? 'Sin ítems' : `${items.length} ${items.length === 1 ? 'ítem' : 'ítems'}`}
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-100">
              <ShoppingCart size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm text-center max-w-xs">
              Tu presupuesto está vacío. Agregá ítems desde la Calculadora.
            </p>
            <Link href="/calculator" className="btn-primary text-sm px-5 py-2 rounded-xl font-semibold">
              Ir a la Calculadora
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 print-layout">

            {/* ── LEFT: Professional Quote Document ── */}
            <div className="flex-1">
              <div
                className="print-page bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                id="quote-document"
              >
                {/* Header: brand accent bar */}
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #6C5CE7, #a29bfe)' }} />

                {/* Header: logo + business + title */}
                <div className="px-8 pt-7 pb-5 flex items-start justify-between gap-6 border-b border-gray-100">
                  {/* Left: logo + contact */}
                  <div className="flex items-start gap-4">
                    {bizProfile?.business_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bizProfile.business_logo_url}
                        alt="Logo"
                        className="w-16 h-16 object-contain rounded-xl flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}
                      >
                        <span className="text-white font-black text-xl">
                          {displayName ? displayName[0].toUpperCase() : 'E'}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="font-black text-gray-900 text-lg leading-tight">
                        {displayName || 'Mi Taller'}
                      </h2>
                      {bizProfile?.business_cuit && (
                        <p className="text-xs text-gray-500 mt-0.5">CUIT: {bizProfile.business_cuit}</p>
                      )}
                      <div className="mt-2 space-y-0.5">
                        {bizProfile?.business_address && (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <MapPin size={10} className="flex-shrink-0" />
                            {bizProfile.business_address}
                          </p>
                        )}
                        {bizProfile?.business_phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Phone size={10} className="flex-shrink-0" />
                            {bizProfile.business_phone}
                          </p>
                        )}
                        {bizProfile?.business_email && (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Mail size={10} className="flex-shrink-0" />
                            {bizProfile.business_email}
                          </p>
                        )}
                        {bizProfile?.business_instagram && (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <AtSign size={10} className="flex-shrink-0" />
                            {bizProfile.business_instagram}
                          </p>
                        )}
                        {bizProfile?.business_website && (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Globe size={10} className="flex-shrink-0" />
                            {bizProfile.business_website}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: quote title + meta */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Presupuesto</p>
                    <p className="text-2xl font-black" style={{ color: '#6C5CE7' }}>#{quoteNumber}</p>
                    <p className="text-xs text-gray-500 mt-2">Fecha: {quoteDate}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Válido por 15 días</p>
                  </div>
                </div>

                {/* Client section (if selected) */}
                {(selectedClient || newClientName) && (
                  <div className="px-8 py-4 border-b border-gray-100" style={{ background: '#FAFAFA' }}>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Preparado para</p>
                    <p className="font-bold text-gray-800">
                      {selectedClient ? selectedClient.name : newClientName}
                    </p>
                    {selectedClient?.phone && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Phone size={10} /> {selectedClient.phone}
                      </p>
                    )}
                    {selectedClient?.email && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Mail size={10} /> {selectedClient.email}
                      </p>
                    )}
                  </div>
                )}

                {/* Items table */}
                <div className="px-8 py-5">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                        <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Técnica</th>
                        <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Descripción</th>
                        <th className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Cant.</th>
                        <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">P. Unitario</th>
                        <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Subtotal</th>
                        <th className="no-print w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td className="py-3 pr-3">
                            <span
                              className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                              style={{
                                background: `${TECHNIQUE_COLORS[item.tecnica]}18`,
                                color: TECHNIQUE_COLORS[item.tecnica],
                              }}
                            >
                              {TECHNIQUE_LABELS[item.tecnica]}
                            </span>
                          </td>
                          <td className="py-3 pr-3">
                            <p className="font-semibold text-gray-800 text-sm">{item.nombre}</p>
                          </td>
                          <td className="py-3 text-center text-sm text-gray-600 font-medium">{item.cantidad}</td>
                          <td className="py-3 text-right text-sm text-gray-600">{fmt(item.precioUnit)}</td>
                          <td className="py-3 text-right font-bold text-gray-800">{fmt(item.subtotal)}</td>
                          <td className="py-3 no-print">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="mt-4 flex justify-end">
                    <div className="w-56 space-y-2">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span>
                        <span className="font-medium text-gray-700">{fmt(totalVenta)}</span>
                      </div>
                      <div
                        className="flex justify-between pt-2"
                        style={{ borderTop: '2px solid #6C5CE7' }}
                      >
                        <span className="font-black text-gray-900">TOTAL</span>
                        <span className="font-black text-xl" style={{ color: '#6C5CE7' }}>{fmt(totalVenta)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {notes && (
                    <div className="mt-5 p-4 rounded-xl text-sm text-gray-600" style={{ background: '#F9FAFB' }}>
                      <p className="font-semibold text-gray-700 mb-1 text-xs uppercase tracking-wide">Observaciones</p>
                      <p>{notes}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-8 py-4 flex items-center justify-between"
                  style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}
                >
                  <p className="text-xs text-gray-400">
                    Este presupuesto tiene validez de 15 días a partir de la fecha de emisión.
                  </p>
                  <p className="text-xs text-gray-300 font-medium">Estamply</p>
                </div>

                {/* Bottom accent bar */}
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #6C5CE7, #a29bfe)' }} />
              </div>
            </div>

            {/* ── RIGHT: Actions + Confirm ── */}
            <div className="lg:w-72 space-y-4 no-print">
              {/* Actions */}
              <div className="card p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Compartir</p>
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileDown size={15} />
                  Descargar PDF
                </button>
                <button
                  onClick={() => window.open(`https://wa.me/?text=${getWhatsAppText()}`, '_blank')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
                  style={{ borderColor: '#25d36620', color: '#25d366', background: '#25d36608' }}
                >
                  <MessageCircle size={15} />
                  Enviar por WhatsApp
                </button>
                <button
                  onClick={() => {
                    const biz = bizProfile?.business_name || bizProfile?.workshop_name || 'Taller'
                    const subject = encodeURIComponent(`Presupuesto ${biz} - ${quoteDate}`)
                    const lines = items.map(i => `• ${i.cantidad}x ${i.nombre}: ${fmt(i.subtotal)}`).join('\n')
                    const body = encodeURIComponent(`PRESUPUESTO #${quoteNumber}\nFecha: ${quoteDate}\n\n${lines}\n\nTOTAL: ${fmt(totalVenta)}`)
                    window.open(`mailto:?subject=${subject}&body=${body}`)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
                  style={{ borderColor: '#4285f420', color: '#4285f4', background: '#4285f408' }}
                >
                  <Mail size={15} />
                  Enviar por Email
                </button>
              </div>

              {/* Confirm as order */}
              <div className="card p-5 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Confirmar como Pedido</p>

                {/* Client */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cliente</label>
                  {loadingClients ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                      <Loader2 size={14} className="animate-spin" /> Cargando…
                    </div>
                  ) : (
                    <>
                      <select
                        className="input-base"
                        value={clientId}
                        onChange={e => { setClientId(e.target.value); if (e.target.value) setNewClientName('') }}
                      >
                        <option value="">Nuevo cliente…</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {!clientId && (
                        <input
                          type="text"
                          className="input-base mt-2"
                          placeholder="Nombre del cliente"
                          value={newClientName}
                          onChange={e => setNewClientName(e.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha de entrega</label>
                  <input type="date" className="input-base" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>

                {/* Advance */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Seña inicial ($)</label>
                  <input type="number" className="input-base" min={0} value={advance} onChange={e => setAdvance(Number(e.target.value))} />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas</label>
                  <textarea
                    className="input-base resize-none"
                    rows={3}
                    placeholder="Observaciones, instrucciones especiales…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting || items.length === 0}
                  onClick={handleConfirmarPedido}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#6C5CE7', boxShadow: submitting ? 'none' : '0 4px 14px rgba(108,92,231,0.35)' }}
                >
                  {submitting ? (
                    <><Loader2 size={15} className="animate-spin" /> Confirmando…</>
                  ) : 'Confirmar Pedido'}
                </button>
              </div>

              {/* Internal summary (not printed) */}
              <div className="card p-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Resumen interno</p>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Venta</span>
                  <span className="font-semibold text-gray-800">{fmt(totalVenta)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Costo</span>
                  <span className="font-semibold">{fmt(totalCosto)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-gray-100" style={{ color: '#6C5CE7' }}>
                  <span>Ganancia</span>
                  <span>{fmt(totalGanancia)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
