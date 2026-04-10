'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, MessageCircle, Trash2, Calendar, Plus, LayoutList, LayoutGrid, X, ExternalLink } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

interface OrderItem { tecnica: string; nombre: string; cantidad: number; precioUnit?: number; subtotal: number; notas?: string }
interface Order {
  id: string; client_id: string | null; status: string; total_price: number; total_cost: number
  advance_payment: number; due_date: string | null; notes: string | null; created_at: string
  items: OrderItem[]; files_link?: string | null
  clients?: { name: string; whatsapp?: string; phone?: string } | null
}
interface Payment { id: string; order_id: string; monto: number; metodo: string; fecha: string }

const STATES = ['pending', 'production', 'ready', 'delivered'] as const
const SL: Record<string, string> = { pending: 'Pendiente', production: 'En producción', ready: 'Listo', delivered: 'Entregado' }
const SC: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FAEEDA', text: '#854F0B' }, production: { bg: '#E6F1FB', text: '#0C447C' },
  ready: { bg: '#EAF3DE', text: '#27500A' }, delivered: { bg: '#F1EFE8', text: '#444441' },
}
const TL: Record<string, string> = { subli: 'Subli', dtf: 'DTF', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía' }
const TC: Record<string, string> = { subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E' }
const NEXT: Record<string, string> = { pending: 'production', production: 'ready', ready: 'delivered' }

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }
function isOD(d: string | null) { return d ? new Date(d) < new Date(new Date().toDateString()) : false }
function dTo(d: string | null) { return d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : Infinity }

function TechBadge({ t }: { t: string }) {
  if (!t) return null
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${TC[t] || '#999'}18`, color: TC[t] || '#999' }}>{TL[t] || t}</span>
}

function ItemSummary({ items }: { items: OrderItem[] }) {
  if (!items?.length) return <span className="text-xs text-gray-400 italic">Sin detalle de ítems</span>
  const f = items[0]
  if (items.length === 1) return <span className="text-xs text-gray-600 flex items-center gap-1"><TechBadge t={f.tecnica} />{f.cantidad}× {f.nombre}</span>
  if (items.length === 2) return <span className="text-xs text-gray-600 flex items-center gap-1 flex-wrap"><TechBadge t={items[0].tecnica} />{items[0].cantidad}× {items[0].nombre} <span className="text-gray-400">+</span> <TechBadge t={items[1].tecnica} />{items[1].cantidad}× {items[1].nombre}</span>
  return <span className="text-xs text-gray-600 flex items-center gap-1"><TechBadge t={f.tecnica} />{f.cantidad}× {f.nombre} <span className="text-gray-400">+ {items.length - 1} más</span></span>
}

function DragCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const s = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined } : {}
  return <div ref={setNodeRef} style={s as React.CSSProperties} {...listeners} {...attributes}>{children}</div>
}

function DropCol({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef} className={`rounded-xl p-2 min-h-[200px] transition-all ${isOver ? 'ring-2 ring-purple-300' : ''}`} style={{ background: SC[id]?.bg || '#F1F1F1' }}>{children}</div>
}

export default function OrdersPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'kanban'>(() => (typeof window !== 'undefined' && localStorage.getItem('ov') as 'list' | 'kanban') || 'list')
  const [payingOrder, setPayingOrder] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [payMethod, setPayMethod] = useState('efectivo')
  const [detailPanel, setDetailPanel] = useState<string | null>(null)
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdown) return
    const handler = () => setStatusDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [statusDropdown])

  async function load() {
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from('orders').select('*, clients(name, whatsapp, phone)').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('fecha'),
    ])
    setOrders((o || []) as Order[]); setPayments((p || []) as Payment[]); setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('ov', view) }, [view])

  function printOrder(order: Order) {
    const items = (order.items || []) as OrderItem[]
    const client = order.clients as Record<string, string> | null
    const pd = payments.filter(p => p.order_id === order.id).reduce((s, p) => s + p.monto, 0)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Pedido</title><style>
      body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;color:#333;font-size:14px}
      h1{font-size:20px;margin:0} .meta{color:#888;font-size:12px}
      table{width:100%;border-collapse:collapse;margin:16px 0} th,td{border:1px solid #ddd;padding:8px;text-align:left}
      th{background:#f5f5f5;font-size:12px;text-transform:uppercase} .total{font-size:18px;font-weight:bold}
      .section{margin:20px 0;padding:12px 0;border-top:1px solid #eee}
      @media print{body{margin:10mm}}
    </style></head><body>
      <h1>Pedido #${order.id.slice(0, 8)}</h1>
      <p class="meta">Fecha: ${new Date(order.created_at).toLocaleDateString('es-AR')} · Estado: ${SL[order.status] || order.status}${order.due_date ? ` · Entrega: ${new Date(order.due_date).toLocaleDateString('es-AR')}` : ''}</p>
      <div class="section"><strong>Cliente:</strong> ${client?.name || 'Sin cliente'}${client?.whatsapp ? ` · ${client.whatsapp}` : ''}</div>
      <table><thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Subtotal</th></tr></thead><tbody>
      ${items.map(i => `<tr><td>${i.nombre}${i.tecnica ? `<br><small style="color:#888">${TL[i.tecnica] || i.tecnica}</small>` : ''}</td><td>${i.cantidad}</td><td>${fmt(i.precioUnit || 0)}</td><td>${fmt(i.subtotal)}</td></tr>`).join('')}
      </tbody></table>
      <p style="text-align:right" class="total">Total: ${fmt(order.total_price)}</p>
      ${pd > 0 ? `<div class="section"><strong>Pagos:</strong> ${fmt(pd)} recibido · Saldo: ${fmt(Math.max(order.total_price - pd, 0))}</div>` : ''}
      ${order.notes ? `<div class="section"><strong>Notas:</strong> ${order.notes}</div>` : ''}
      <p style="text-align:center;color:#ccc;margin-top:40px;font-size:11px">Estamply</p>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  async function setStatus(id: string, s: string) { await supabase.from('orders').update({ status: s }).eq('id', id); load() }
  async function setDueDate(id: string, d: string) { await supabase.from('orders').update({ due_date: d || null }).eq('id', id); load() }
  async function setFilesLink(id: string, link: string) { await supabase.from('orders').update({ files_link: link || null }).eq('id', id); load() }
  async function regPay(oid: string) { if (payAmount <= 0) return; await supabase.from('payments').insert({ order_id: oid, monto: payAmount, metodo: payMethod }); setPayingOrder(null); setPayAmount(0); load() }
  async function delOrder(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('orders').delete().eq('id', id); load() } }

  function getPays(oid: string) { return payments.filter(p => p.order_id === oid) }
  function paid(oid: string) { return getPays(oid).reduce((s, p) => s + Number(p.monto), 0) }

  function openWa(o: Order) {
    const num = (o.clients?.whatsapp || o.clients?.phone || '').replace(/[\s\-\(\)]/g, '')
    const name = o.clients?.name?.split(' ')[0] || ''
    const n = `#${o.id.slice(0, 6)}`
    let msg = ''
    if (o.status === 'pending') msg = `Hola${name ? ` ${name}` : ''}! Tu pedido ${n} está confirmado. Te aviso cuando arranquemos.`
    else if (o.status === 'production') msg = `Hola${name ? ` ${name}` : ''}! Ya arrancamos con tu pedido ${n}. Te aviso cuando esté listo.`
    else if (o.status === 'ready') msg = `Hola${name ? ` ${name}` : ''}! Tu pedido ${n} ya está listo! Coordinamos la entrega?`
    if (msg) window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || !e.active) return
    const oid = e.active.id as string, ns = e.over.id as string
    const o = orders.find(x => x.id === oid)
    if (o && o.status !== ns) setStatus(oid, ns)
  }

  // ── Detail view (shared between list expanded + kanban panel) ──
  function Detail({ order }: { order: Order }) {
    const p = paid(order.id), saldo = order.total_price - p, op = getPays(order.id)
    const od = isOD(order.due_date) && order.status !== 'delivered'
    const [editingLink, setEditingLink] = useState(false)
    const [linkVal, setLinkVal] = useState(order.files_link || '')

    return (
      <div className="space-y-4">
        {/* DETALLE DEL PEDIDO */}
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Detalle del pedido</p>
          {(order.items || []).length > 0 ? (
            <div className="space-y-3">
              {(order.items as OrderItem[]).map((item, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1"><TechBadge t={item.tecnica} /><span className="text-sm font-semibold text-gray-800">{item.nombre}</span></div>
                  <p className="text-xs text-gray-500">Cantidad: {item.cantidad}{item.precioUnit ? ` · P.unit: ${fmt(item.precioUnit)}` : ''} · Subtotal: <span className="font-medium text-gray-700">{fmt(item.subtotal)}</span></p>
                  {item.notas && <p className="text-xs text-gray-500 mt-1 italic bg-gray-50 px-2 py-1 rounded">📝 {item.notas}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 italic">Sin detalle de ítems</p>}
        </div>

        {/* ARCHIVOS */}
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Archivos</p>
          {editingLink ? (
            <div className="flex gap-2">
              <input className="input-base text-sm flex-1" value={linkVal} onChange={e => setLinkVal(e.target.value)} placeholder="URL de archivos (Google Drive, Dropbox...)" />
              <button onClick={() => { setFilesLink(order.id, linkVal); setEditingLink(false) }} className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>OK</button>
              <button onClick={() => setEditingLink(false)} className="text-xs text-gray-400">✕</button>
            </div>
          ) : order.files_link ? (
            <div className="flex items-center justify-between">
              <a href={order.files_link} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"><ExternalLink size={13} /> Abrir archivos</a>
              <button onClick={() => { setLinkVal(order.files_link || ''); setEditingLink(true) }} className="text-xs text-gray-400 hover:text-gray-600">Editar</button>
            </div>
          ) : (
            <button onClick={() => setEditingLink(true)} className="text-xs text-gray-400 hover:text-gray-600">+ Agregar link de archivos</button>
          )}
        </div>

        {/* PAGOS — saldo prominente + detalle colapsado */}
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Pagos</p>
          {/* Prominent saldo */}
          <div className={`rounded-lg p-3 mb-3 text-center ${saldo <= 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{saldo <= 0 ? 'Estado' : 'Saldo a cobrar'}</p>
            <p className={`text-xl font-black ${saldo <= 0 ? 'text-green-600' : 'text-gray-800'}`}>{saldo <= 0 ? 'Pagado completo ✓' : fmt(saldo)}</p>
          </div>
          {/* Collapsible detail */}
          {(() => {
            const [showPayDetail, setShowPayDetail] = useState(false)
            return (<>
              <button onClick={() => setShowPayDetail(v => !v)} className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
                {showPayDetail ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Ver detalle
              </button>
              {showPayDetail && (
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Total del pedido</span><span className="font-semibold">{fmt(order.total_price)}</span></div>
                  {op.length > 0 && (
                    <div className="border-t border-gray-100 pt-1.5 space-y-1">
                      {op.map(pay => (
                        <div key={pay.id} className="flex justify-between text-xs">
                          <span className="text-gray-500">{new Date(pay.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })} · Seña recibida{pay.metodo !== 'seña' ? ` (${pay.metodo})` : ''}</span>
                          <span className="text-green-600 font-medium">{fmt(Number(pay.monto))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-gray-100">
                    <span className="text-gray-500">Total pagado</span><span className="text-green-600 font-medium">{fmt(p)}</span>
                  </div>
                  {saldo > 0 && <div className="flex justify-between"><span className="text-gray-500">Saldo pendiente</span><span className="font-bold text-gray-800">{fmt(saldo)}</span></div>}
                </div>
              )}
            </>)
          })()}
          {payingOrder === order.id ? (
            <div className="mt-3 flex gap-2 items-end">
              <input type="number" className="input-base text-sm py-1 flex-1" min={0} value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} placeholder={String(Math.max(saldo, 0))} />
              <select className="input-base text-sm py-1 w-28" value={payMethod} onChange={e => setPayMethod(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transfer.</option><option value="mercadopago">MP</option><option value="otro">Otro</option></select>
              <button onClick={() => regPay(order.id)} className="px-3 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>OK</button>
              <button onClick={() => setPayingOrder(null)} className="text-xs text-gray-400">✕</button>
            </div>
          ) : saldo > 0 ? <button onClick={() => { setPayingOrder(order.id); setPayAmount(Math.max(saldo, 0)) }} className="mt-3 flex items-center gap-1 text-xs font-semibold text-purple-600"><Plus size={12} /> Registrar pago</button> : null}
        </div>

        {/* FECHA DE ENTREGA */}
        {(() => {
          const [editingDate, setEditingDate] = useState(false)
          return (
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Fecha de entrega</p>
              {editingDate ? (
                <div className="flex items-center gap-2">
                  <input type="date" className="input-base text-sm py-1 w-44" value={order.due_date || ''} onChange={e => { setDueDate(order.id, e.target.value); setEditingDate(false) }} autoFocus />
                  <button onClick={() => setEditingDate(false)} className="text-xs text-gray-400">✕</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className={`text-sm flex items-center gap-1.5 ${od ? 'text-red-500 font-bold' : 'text-gray-700'}`}>
                    <Calendar size={13} className={od ? 'text-red-400' : 'text-gray-400'} />
                    {order.due_date ? new Date(order.due_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                    {od && <span className="text-xs">(vencido)</span>}
                  </span>
                  <button onClick={() => setEditingDate(true)} className="text-xs text-gray-400 hover:text-gray-600">Editar</button>
                </div>
              )}
              {order.notes && <p className="text-xs text-gray-500 mt-2">{order.notes}</p>}
            </div>
          )
        })()}

        {/* ESTADO */}
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Estado</p>
          <div className="flex items-center gap-1 mb-3">
            {STATES.map((s, i) => {
              const si = STATES.indexOf(order.status as typeof STATES[number])
              const done = i <= si
              return (
                <div key={s} className="flex items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 ${done ? '' : 'bg-white'}`} style={done ? { background: SC[s].text, borderColor: SC[s].text } : { borderColor: '#D1D5DB' }} />
                  {i < STATES.length - 1 && <div className="w-8 h-0.5" style={{ background: i < si ? SC[STATES[i + 1]].text : '#E5E7EB' }} />}
                </div>
              )
            })}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATES.map(s => (
              <button key={s} onClick={() => setStatus(order.id, s)} disabled={order.status === s}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${order.status === s ? 'ring-2 ring-offset-1' : 'opacity-50 hover:opacity-100'}`}
                style={{ background: SC[s].bg, color: SC[s].text }}>
                {order.status === s && '✓ '}{SL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2 pt-2">
          {(order.clients?.whatsapp || order.clients?.phone) && order.status !== 'delivered' && (
            <button onClick={() => openWa(order)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#25d366', background: '#25d36608', border: '1px solid #25d36620' }}><MessageCircle size={13} /> WhatsApp</button>
          )}
          <div className="flex-1" />
          <button onClick={() => delOrder(order.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"><Trash2 size={12} /> Eliminar</button>
        </div>
      </div>
    )
  }

  // ── List card ──
  function Card({ order }: { order: Order }) {
    const isExp = expanded === order.id
    const sc = SC[order.status] || SC.pending
    const cn = order.clients?.name || 'Sin cliente'
    const p = paid(order.id), saldo = order.total_price - p
    const od = isOD(order.due_date) && order.status !== 'delivered'
    const du = dTo(order.due_date)

    return (
      <div className={`card overflow-hidden ${od ? 'border-l-[3px] border-l-red-400' : ''}`}>
        <button type="button" onClick={() => setExpanded(isExp ? null : order.id)} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
          {/* Line 1: client + total */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">{cn}</span>
            <span className="font-bold text-gray-800">{fmt(order.total_price)}</span>
          </div>
          {/* Line 2: what to produce */}
          <div className="mt-1"><ItemSummary items={order.items || []} /></div>
          {/* Line 3: status + date + payment + action */}
          <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Status dropdown badge */}
              <div className="relative">
                <span onClick={e => { e.stopPropagation(); setStatusDropdown(statusDropdown === order.id ? null : order.id) }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer select-none inline-flex items-center gap-0.5"
                  style={{ background: sc.bg, color: sc.text }}>
                  {SL[order.status]} <ChevronDown size={9} />
                </span>
                {statusDropdown === order.id && (
                  <div className="absolute z-30 top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]"
                    onClick={e => e.stopPropagation()}>
                    {STATES.map(s => {
                      const ssc = SC[s]
                      return (
                        <button key={s} onClick={() => { setStatus(order.id, s); setStatusDropdown(null) }}
                          className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 flex items-center gap-2"
                          style={{ color: ssc.text }}>
                          <div className="w-2 h-2 rounded-full" style={{ background: ssc.text }} />
                          {SL[s]}
                          {order.status === s && <span className="ml-auto text-gray-400">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {order.due_date && <span className={`text-xs flex items-center gap-1 ${od ? 'text-red-500 font-bold' : du <= 2 ? 'text-orange-500' : 'text-gray-400'}`}><Calendar size={10} />{new Date(order.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}{od && ' vencido'}</span>}
            </div>
            <div className="flex items-center">
              {isExp ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
          </div>
        </button>
        {isExp && <div className="px-4 pb-4 pt-3 border-t border-gray-100"><Detail order={order} /></div>}
      </div>
    )
  }

  const activos = orders.filter(o => o.status !== 'delivered').sort((a, b) => {
    const oa = isOD(a.due_date) ? -1 : 0, ob = isOD(b.due_date) ? -1 : 0
    if (oa !== ob) return oa - ob
    if (!a.due_date) return 1; if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
  const finalizados = orders.filter(o => o.status === 'delivered')
  const detailOrder = orders.find(o => o.id === detailPanel)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">{activos.length} activos · {finalizados.length} finalizados</p></div>
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#F1F1F1' }}>
          <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${view === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><LayoutList size={14} /></button>
          <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${view === 'kanban' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><LayoutGrid size={14} /></button>
        </div>
      </div>

      {orders.length === 0 ? <div className="card flex flex-col items-center justify-center py-16"><p className="text-gray-400 text-sm">No hay pedidos todavía.</p></div>
      : view === 'list' ? (
        <div className="space-y-6">
          {activos.length > 0 && <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">Activos <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-bold">{activos.length}</span></p>
            <div className="space-y-2">{activos.map(o => <Card key={o.id} order={o} />)}</div>
          </div>}
          {finalizados.length > 0 && <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">Finalizados <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">{finalizados.length}</span></p>
            <div className="space-y-2 opacity-70">{finalizados.slice(0, 10).map(o => <Card key={o.id} order={o} />)}{finalizados.length > 10 && <p className="text-xs text-gray-400 text-center py-2">+{finalizados.length - 10} anteriores</p>}</div>
          </div>}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-h-[400px]">
            {STATES.map(state => {
              const sc = SC[state]
              const isDel = state === 'delivered'
              const so = orders.filter(o => o.status === state).sort((a, b) => {
                if (!isDel) { const oa = isOD(a.due_date) ? -1 : 0, ob = isOD(b.due_date) ? -1 : 0; if (oa !== ob) return oa - ob }
                if (!a.due_date) return 1; if (!b.due_date) return -1
                return isDel ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
              })
              const shown = isDel ? so.slice(0, 3) : so
              return (
                <DropCol key={state} id={state}>
                  <div className="flex items-center justify-between px-2 py-2 mb-1">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: sc.text }} /><span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: sc.text }}>{SL[state]}</span></div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/60" style={{ color: sc.text }}>{so.length}</span>
                  </div>
                  {so.length > 0 && !isDel && <p className="text-[10px] text-gray-400 px-2 -mt-0.5 mb-2">{fmt(so.reduce((s, o) => s + o.total_price, 0))}</p>}
                  <div className={`space-y-2 ${isDel ? 'opacity-65' : ''}`}>
                    {shown.map(order => {
                      const cn = order.clients?.name || 'Sin cliente', pd = paid(order.id), od = isOD(order.due_date) && !isDel
                      const first = (order.items || [])[0]
                      return (
                        <DragCard key={order.id} id={order.id}>
                          <div onClick={() => setDetailPanel(order.id)}
                            className={`p-3 rounded-lg bg-white shadow-sm cursor-pointer hover:shadow-md transition-all ${od ? 'border-l-[3px] border-l-red-400' : 'border border-transparent'}`}>
                            <p className="font-semibold text-gray-800 text-sm truncate">{cn}</p>
                            {first ? (
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                <TechBadge t={first.tecnica} />{first.cantidad}× {first.nombre}{(order.items || []).length > 1 && <span className="text-gray-400">+ {(order.items || []).length - 1}</span>}
                              </p>
                            ) : <p className="text-[10px] text-gray-400 italic mt-0.5">Sin detalle</p>}
                            <p className="font-bold text-gray-700 text-sm mt-1">{fmt(order.total_price)}</p>
                            {order.due_date && !isDel && <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${od ? 'text-red-500 font-bold' : 'text-gray-400'}`}><Calendar size={9} />{new Date(order.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}{od && ' vencido'}</p>}
                            {!isDel && <p className={`text-[10px] mt-0.5 ${pd >= order.total_price ? 'text-green-600' : pd > 0 ? 'text-gray-500' : 'text-amber-500'}`}>{pd >= order.total_price ? 'Pagado ✓' : pd > 0 ? `Seña: ${fmt(pd)}` : 'Sin pagos'}</p>}
                            {state === 'ready' && (
                              <button onClick={e => { e.stopPropagation(); setStatus(order.id, 'delivered') }}
                                className="mt-2 w-full text-[10px] py-1 rounded-md font-semibold text-green-700 bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
                                ✓ Marcar entregado
                              </button>
                            )}
                          </div>
                        </DragCard>
                      )
                    })}
                  </div>
                  {isDel && so.length > 3 && (
                    <button onClick={() => setView('list')} className="w-full text-[10px] text-center py-2 mt-1 font-medium text-gray-400 hover:text-gray-600">
                      Ver todos ({so.length}) →
                    </button>
                  )}
                </DropCol>
              )
            })}
          </div>
        </DndContext>
      )}

      {/* Kanban detail panel */}
      {detailPanel && detailOrder && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setDetailPanel(null)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-bold text-gray-900">{detailOrder.clients?.name || 'Sin cliente'}</h3>
                {(() => { const first = (detailOrder.items || [])[0]; return first ? (
                  <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1"><TechBadge t={first.tecnica} />{first.cantidad}× {first.nombre}</p>
                ) : null })()}
                <p className="text-xs text-gray-400 mt-0.5">{fmt(detailOrder.total_price)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => printOrder(detailOrder)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400" title="Imprimir">🖨️</button>
                <button onClick={() => setDetailPanel(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
              </div>
            </div>
            <div className="px-5 py-4"><Detail order={detailOrder} /></div>
          </div>
        </div>
      )}
    </div>
  )
}
