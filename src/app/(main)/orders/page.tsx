'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronUp, MessageCircle, Trash2, Calendar, Plus, LayoutList, LayoutGrid, X, ExternalLink, Printer, Search, ClipboardList } from 'lucide-react'
import EmptyState from '@/shared/components/EmptyState'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'
import { usePermissions } from '@/shared/context/PermissionsContext'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

interface OrderItem { tecnica: string; nombre: string; cantidad: number; precioUnit?: number; subtotal: number; notas?: string; origen?: string; variantName?: string; variantBreakdown?: Record<string, number> }
interface Order {
  id: string; client_id: string | null; status: string; total_price: number; total_cost: number
  advance_payment: number; due_date: string | null; notes: string | null; created_at: string
  items: OrderItem[]; files_link?: string | null
  clients?: { name: string; whatsapp?: string; phone?: string } | null
}
interface Payment { id: string; order_id: string; monto: number; metodo: string; fecha: string }

const STATES = ['pending', 'production', 'ready', 'delivered'] as const

const SC: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FAEEDA', text: '#854F0B' }, production: { bg: '#E6F1FB', text: '#0C447C' },
  ready: { bg: '#EAF3DE', text: '#27500A' }, delivered: { bg: '#F1EFE8', text: '#444441' },
}
const TL: Record<string, string> = { subli: 'Subli', dtf: 'DTF', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía' }
const TC: Record<string, string> = { subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E' }
const NEXT: Record<string, string> = { pending: 'production', production: 'ready', ready: 'delivered' }


function isOD(d: string | null) { return d ? new Date(d) < new Date(new Date().toDateString()) : false }
function dTo(d: string | null) { return d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : Infinity }

function TechBadge({ t, origen }: { t: string; origen?: string }) {
  if (!t || origen === 'manual' || origen === 'catalogo' || origen === 'catalogo_web') return null
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${TC[t] || '#999'}18`, color: TC[t] || '#999' }}>{TL[t] || t}</span>
}

function ItemSummary({ items }: { items: OrderItem[] }) {
  if (!items?.length) return <span className="text-xs text-gray-400 italic">Sin detalle de ítems</span>
  const f = items[0]
  if (items.length === 1) return <span className="text-xs text-gray-600 flex items-center gap-1"><TechBadge t={f.tecnica} origen={f.origen} />{f.cantidad}× {f.nombre}</span>
  if (items.length === 2) return <span className="text-xs text-gray-600 flex items-center gap-1 flex-wrap"><TechBadge t={items[0].tecnica} origen={items[0].origen} />{items[0].cantidad}× {items[0].nombre} <span className="text-gray-400">+</span> <TechBadge t={items[1].tecnica} origen={items[1].origen} />{items[1].cantidad}× {items[1].nombre}</span>
  return <span className="text-xs text-gray-600 flex items-center gap-1"><TechBadge t={f.tecnica} origen={f.origen} />{f.cantidad}× {f.nombre} <span className="text-gray-400">+ {items.length - 1} más</span></span>
}

function DragCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const s = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : undefined } : {}
  return <div ref={setNodeRef} style={s as React.CSSProperties} {...listeners} {...attributes}>{children}</div>
}

function DropCol({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef} className={`rounded-xl p-2 min-h-[200px] transition-all min-w-[70vw] snap-center md:min-w-0 ${isOver ? 'ring-2 ring-purple-300' : ''}`} style={{ background: SC[id]?.bg || '#F1F1F1' }}>{children}</div>
}

export default function OrdersPage() {
  const supabase = createClient()
  const t = useTranslations('orders')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency } = useLocale()
  const { showPrices } = usePermissions()
  const SL: Record<string, string> = { pending: t('pending'), production: t('inProduction'), ready: t('ready'), delivered: t('delivered') }
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
  const [tallerName, setTallerName] = useState('')
  const [search, setSearch] = useState('')
  const [checklist, setChecklist] = useState<Record<string, Record<string, boolean>>>({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Close status dropdown on outside click
  useEffect(() => {
    if (!statusDropdown) return
    const handler = () => setStatusDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [statusDropdown])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: o }, { data: p }, { data: prof }] = await Promise.all([
      supabase.from('orders').select('*, clients(name, whatsapp, phone)').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('fecha'),
      user ? supabase.from('profiles').select('business_name, workshop_name').eq('id', user.id).single() : Promise.resolve({ data: null }),
    ])
    setOrders((o || []) as Order[]); setPayments((p || []) as Payment[]); setLoading(false)
    if (prof) setTallerName(prof.business_name || prof.workshop_name || '')
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('ov', view) }, [view])

  function printOrder(order: Order) {
    const items = (order.items || []) as OrderItem[]
    const client = order.clients
    const pd = paid(order.id)
    const saldo = Math.max(order.total_price - pd, 0)

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const itemRows = items.map(i => {
      const breakdownHtml = i.variantBreakdown && Object.values(i.variantBreakdown as Record<string, number>).some(v => v > 0)
        ? `<tr><td colspan="4" style="padding:0 8px 8px">
            <div style="margin:4px 0 8px;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px">
              <div style="font-size:10px;color:#999;text-transform:uppercase;font-weight:600;margin-bottom:4px">${i.variantName || 'Variantes'}</div>
              ${Object.entries(i.variantBreakdown as Record<string, number>).filter(([,v]) => v > 0).map(([k,v]) => `<div style="display:flex;justify-content:space-between;font-size:12px"><span>${k}</span><span style="font-weight:600">${v}</span></div>`).join('')}
            </div>
          </td></tr>` : ''
      return `
      <tr>
        <td style="padding:8px">${i.nombre}${i.notas ? `<div style="font-size:11px;color:#999">${i.notas}</div>` : ''}</td>
        <td style="padding:8px;text-align:center">${i.cantidad}</td>
        <td style="padding:8px;text-align:right">${fmtCurrency(i.precioUnit || 0)}</td>
        <td style="padding:8px;text-align:right;font-weight:600">${fmtCurrency(i.subtotal)}</td>
      </tr>${breakdownHtml}`
    }).join('')

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Orden de Trabajo</title>
    <style>
      body{font-family:Arial,sans-serif;color:#000;margin:0;padding:20mm}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:2px solid #e5e7eb}
      tbody tr{border-bottom:1px solid #f3f4f6}
      th{font-size:11px;text-transform:uppercase;color:#999;font-weight:600;padding:8px;text-align:left}
      .section{margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #ddd}
      @page{size:A4;margin:0}
    </style></head><body>
      <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div style="font-size:20px;font-weight:800">ORDEN DE TRABAJO</div>${tallerName ? `<div style="font-size:14px;color:#666;margin-top:2px">${tallerName}</div>` : ''}</div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:800">#${order.id.slice(0, 8)}</div>
          <div style="font-size:12px;color:#666">${new Date(order.created_at).toLocaleDateString('es-AR')}</div>
          <div style="font-size:12px;color:#666">Estado: ${SL[order.status] || order.status}</div>
        </div>
      </div>
      <div class="section" style="display:flex;justify-content:space-between">
        <div>
          <div style="font-size:11px;color:#999;text-transform:uppercase">Cliente</div>
          <div style="font-size:16px;font-weight:600">${client?.name || 'Sin cliente'}</div>
          ${client?.whatsapp || client?.phone ? `<div style="color:#666">${client.whatsapp || client.phone}</div>` : ''}
        </div>
        ${order.due_date ? `<div style="text-align:right">
          <div style="font-size:11px;color:#999;text-transform:uppercase">Fecha de entrega</div>
          <div style="font-size:16px;font-weight:600">${new Date(order.due_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>` : ''}
      </div>
      <table style="margin-bottom:20px">
        <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
        <div style="width:240px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:18px;font-weight:800;border-top:2px solid #000">
            <span>TOTAL</span><span>${fmtCurrency(order.total_price)}</span>
          </div>
        </div>
      </div>
      ${pd > 0 ? `<div class="section">
        <div style="font-size:11px;color:#999;text-transform:uppercase;margin-bottom:4px">Pagos</div>
        <div>Seña recibida: ${fmtCurrency(pd)}</div>
        <div style="font-weight:600">Saldo a cobrar: ${fmtCurrency(saldo)}</div>
      </div>` : ''}
      ${order.notes ? `<div class="section">
        <div style="font-size:11px;color:#999;text-transform:uppercase;margin-bottom:4px">Notas</div>
        <div>${order.notes}</div>
      </div>` : ''}
      <div style="text-align:center;font-size:11px;color:#ccc;margin-top:32px">Estamply · estamply.app</div>
    </body></html>`)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }

  function printWorkshopSheet(order: Order) {
    const items = (order.items || []) as OrderItem[]
    const client = order.clients

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const itemRows = items.map(i => {
      const breakdownHtml = i.variantBreakdown && Object.values(i.variantBreakdown).some(v => v > 0)
        ? `<div style="margin:6px 0;padding:8px;background:#f3f4f6;border-radius:4px;font-size:13px">
            <strong>${i.variantName || 'Variantes'}:</strong><br/>
            ${Object.entries(i.variantBreakdown).filter(([,v]) => v > 0).map(([k,v]) => `${k}: <strong>${v}</strong>`).join(' &nbsp;·&nbsp; ')}
          </div>` : ''
      return `<tr>
        <td style="padding:10px 8px;font-weight:500">${i.nombre}${i.notas ? `<div style="font-size:11px;color:#666;margin-top:2px">📝 ${i.notas}</div>` : ''}${breakdownHtml}</td>
        <td style="padding:10px 8px;text-align:center;font-weight:600;font-size:16px">${i.cantidad}</td>
        <td style="padding:10px 8px"><div style="width:40px;height:40px;border:1px solid #ccc;border-radius:4px"></div></td>
      </tr>`
    }).join('')

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Hoja de Taller</title>
    <style>
      body{font-family:Arial,sans-serif;color:#000;margin:0;padding:15mm}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:2px solid #333}
      tbody tr{border-bottom:1px solid #e5e7eb}
      th{font-size:11px;text-transform:uppercase;color:#666;font-weight:600;padding:8px;text-align:left}
      .section{margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ddd}
      .check{display:inline-block;width:18px;height:18px;border:2px solid #333;border-radius:3px;margin-right:8px;vertical-align:middle}
      @page{size:A4;margin:0}
    </style></head><body>
      <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #333">
        <div>
          <div style="font-size:22px;font-weight:800">HOJA DE TALLER</div>
          ${tallerName ? `<div style="font-size:14px;color:#666">${tallerName}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800">#${order.id.slice(0, 8)}</div>
          <div style="font-size:12px;color:#666">${new Date(order.created_at).toLocaleDateString('es-AR')}</div>
          <div style="font-size:13px;font-weight:600;color:#333">Estado: ${SL[order.status] || order.status}</div>
        </div>
      </div>

      <div class="section" style="display:flex;justify-content:space-between">
        <div>
          <div style="font-size:11px;color:#999;text-transform:uppercase">Cliente</div>
          <div style="font-size:16px;font-weight:600">${client?.name || 'Sin cliente'}</div>
          ${client?.whatsapp || client?.phone ? `<div style="color:#666">${client.whatsapp || client.phone}</div>` : ''}
        </div>
        ${order.due_date ? `<div style="text-align:right">
          <div style="font-size:11px;color:#999;text-transform:uppercase">Fecha de entrega</div>
          <div style="font-size:18px;font-weight:800">${new Date(order.due_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</div>
        </div>` : ''}
      </div>

      <table style="margin-bottom:16px">
        <thead><tr><th>Producto / Detalle</th><th style="text-align:center">Cantidad</th><th style="width:60px">✓</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>

      ${order.notes ? `<div class="section">
        <div style="font-size:11px;color:#999;text-transform:uppercase;margin-bottom:4px">Notas de producción</div>
        <div style="font-size:13px;padding:8px;background:#f9fafb;border-radius:4px">${order.notes}</div>
      </div>` : ''}

      ${order.files_link ? `<div class="section">
        <div style="font-size:11px;color:#999;text-transform:uppercase;margin-bottom:4px">Archivos</div>
        <div style="font-size:12px">${order.files_link}</div>
      </div>` : ''}

      <div style="margin-top:24px">
        <div style="font-size:11px;color:#999;text-transform:uppercase;margin-bottom:8px">Control de producción</div>
        <div style="display:flex;gap:24px;font-size:13px">
          <div><span class="check"></span> Diseño verificado</div>
          <div><span class="check"></span> Estampado</div>
          <div><span class="check"></span> Control de calidad</div>
        </div>
      </div>

      <div style="text-align:center;font-size:10px;color:#ccc;margin-top:32px">Estamply · estamply.app</div>
    </body></html>`)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">{t('orderDetail')}</p>
          {(order.items || []).length > 0 ? (
            <div className="space-y-3">
              {(order.items as OrderItem[]).map((item, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1"><TechBadge t={item.tecnica} origen={item.origen} /><span className="text-sm font-semibold text-gray-800">{item.nombre}</span></div>
                  <p className="text-xs text-gray-500">Cantidad: {item.cantidad}{showPrices && item.precioUnit ? ` · P.unit: ${fmtCurrency(item.precioUnit)}` : ''}{showPrices ? <> · Subtotal: <span className="font-medium text-gray-700">{fmtCurrency(item.subtotal)}</span></> : null}</p>
                  {item.variantBreakdown && Object.values(item.variantBreakdown).some(v => v > 0) && (
                    <div className="mt-1.5 p-2 rounded bg-gray-50 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{item.variantName || 'Variantes'}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {Object.entries(item.variantBreakdown).filter(([,v]) => v > 0).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-gray-600">{k}</span>
                            <span className="font-medium text-gray-800">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.notas && <p className="text-xs text-gray-500 mt-1 italic bg-gray-50 px-2 py-1 rounded">📝 {item.notas}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 italic">{t('noItems')}</p>}
        </div>

        {/* ARCHIVOS */}
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t('files')}</p>
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

        {/* Production checklist (digital) */}
        <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Control de producción</p>
          <div className="space-y-2">
            {[
              { key: 'diseno', label: 'Diseño verificado' },
              { key: 'estampado', label: 'Estampado completado' },
              { key: 'control', label: 'Control de calidad' },
            ].map(step => {
              const checked = checklist[order.id]?.[step.key] || false
              return (
                <label key={step.key} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={checked}
                    onChange={() => setChecklist(prev => ({
                      ...prev,
                      [order.id]: { ...(prev[order.id] || {}), [step.key]: !checked }
                    }))}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600" />
                  <span className={`text-sm ${checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{step.label}</span>
                </label>
              )
            })}
          </div>
          {checklist[order.id]?.diseno && checklist[order.id]?.estampado && checklist[order.id]?.control && order.status !== 'ready' && order.status !== 'delivered' && (
            <button onClick={() => setStatus(order.id, 'ready')} className="mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#00B894' }}>
              ✓ Finalizar producción
            </button>
          )}
        </div>

        {/* PAGOS — saldo prominente + detalle colapsado */}
        {showPrices && <div className="rounded-lg border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">{t('payments')}</p>
          {/* Prominent saldo */}
          <div className={`rounded-lg p-3 mb-3 text-center ${saldo <= 0 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{saldo <= 0 ? 'Estado' : 'Saldo a cobrar'}</p>
            <p className={`text-xl font-black ${saldo <= 0 ? 'text-green-600' : 'text-gray-800'}`}>{saldo <= 0 ? 'Pagado completo ✓' : fmtCurrency(saldo)}</p>
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
                  <div className="flex justify-between"><span className="text-gray-500">Total del pedido</span><span className="font-semibold">{fmtCurrency(order.total_price)}</span></div>
                  {op.length > 0 && (
                    <div className="border-t border-gray-100 pt-1.5 space-y-1">
                      {op.map(pay => (
                        <div key={pay.id} className="flex justify-between text-xs">
                          <span className="text-gray-500">{new Date(pay.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })} · Seña recibida{pay.metodo !== 'seña' ? ` (${pay.metodo})` : ''}</span>
                          <span className="text-green-600 font-medium">{fmtCurrency(Number(pay.monto))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-gray-100">
                    <span className="text-gray-500">Total pagado</span><span className="text-green-600 font-medium">{fmtCurrency(p)}</span>
                  </div>
                  {saldo > 0 && <div className="flex justify-between"><span className="text-gray-500">Saldo pendiente</span><span className="font-bold text-gray-800">{fmtCurrency(saldo)}</span></div>}
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
          ) : saldo > 0 ? <button onClick={() => { setPayingOrder(order.id); setPayAmount(Math.max(saldo, 0)) }} className="mt-3 flex items-center gap-1 text-xs font-semibold text-purple-600"><Plus size={12} /> {t('registerPayment')}</button> : null}
        </div>}

        {/* FECHA DE ENTREGA */}
        {(() => {
          const [editingDate, setEditingDate] = useState(false)
          return (
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{t('deliveryDate')}</p>
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">{t('status')}</p>
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
    const p = paid(order.id), saldo = order.total_price - p
    const od = isOD(order.due_date) && order.status !== 'delivered'
    const du = dTo(order.due_date)

    return (
      <div className={`card overflow-hidden ${od ? 'border-l-[3px] border-l-red-400' : ''}`}>
        <button type="button" onClick={() => setExpanded(isExp ? null : order.id)} className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${od ? 'bg-red-50' : ''}`}>
          {/* Line 1: client + total */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">{order.clients?.name || <span className="text-gray-400 italic">Cliente no asignado</span>}</span>
            {showPrices && <span className="font-bold text-gray-800">{fmtCurrency(order.total_price)}</span>}
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
              {order.due_date && <span className={`text-xs flex items-center gap-1 ${od ? 'text-red-500 font-bold' : du <= 2 ? 'text-orange-500' : 'text-gray-400'}`}><Calendar size={10} />{new Date(order.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}{od && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Vencido</span>}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); showPrices ? printOrder(order) : printWorkshopSheet(order) }} className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors" title={showPrices ? "Imprimir orden" : "Hoja de taller"}><Printer size={18} className="text-gray-400 hover:text-gray-700" /></button>
              {isExp ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
          </div>
        </button>
        {isExp && <div className="px-4 pb-4 pt-3 border-t border-gray-100"><Detail order={order} /></div>}
      </div>
    )
  }

  const filteredOrders = orders.filter(o => {
    if (!search) return true
    const s = search.toLowerCase()
    return o.clients?.name?.toLowerCase().includes(s) ||
      o.id.toLowerCase().includes(s) ||
      (o.items as OrderItem[])?.some((i: OrderItem) => i.nombre.toLowerCase().includes(s))
  })

  const activos = filteredOrders.filter(o => o.status !== 'delivered').sort((a, b) => {
    const oa = isOD(a.due_date) ? -1 : 0, ob = isOD(b.due_date) ? -1 : 0
    if (oa !== ob) return oa - ob
    if (!a.due_date) return 1; if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
  const finalizados = filteredOrders.filter(o => o.status === 'delivered')
  const detailOrder = orders.find(o => o.id === detailPanel)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{activos.length} {t('active')} · {finalizados.length} {t('finished')}</p></div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" className="input-base !pl-9 text-sm" placeholder="Buscar pedido..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#F1F1F1' }}>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${view === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><LayoutList size={14} /></button>
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${view === 'kanban' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}><LayoutGrid size={14} /></button>
          </div>
        </div>
      </div>

      {orders.length === 0 ? <EmptyState icon="📦" title="Todavía no tenés pedidos." description="Los pedidos se crean cuando un cliente aprueba un presupuesto." actionLabel="Ir a Presupuestos" actionHref="/presupuesto" />
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
          <div className="flex gap-3 min-h-[400px] overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-x-visible md:snap-none">
            {STATES.map(state => {
              const sc = SC[state]
              const isDel = state === 'delivered'
              const so = filteredOrders.filter(o => o.status === state).sort((a, b) => {
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
                  {so.length > 0 && !isDel && showPrices && <p className="text-[10px] text-gray-400 px-2 -mt-0.5 mb-2">{fmtCurrency(so.reduce((s, o) => s + o.total_price, 0))}</p>}
                  <div className={`space-y-2 ${isDel ? 'opacity-65' : ''}`}>
                    {shown.map(order => {
                      const pd = paid(order.id), od = isOD(order.due_date) && !isDel
                      const first = (order.items || [])[0]
                      return (
                        <DragCard key={order.id} id={order.id}>
                          <div onClick={() => setDetailPanel(order.id)}
                            className={`p-3 rounded-lg bg-white shadow-sm cursor-pointer hover:shadow-md transition-all ${od ? 'border-l-4 border-l-red-500' : 'border border-transparent'}`}>
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-gray-800 text-sm truncate">{order.clients?.name || <span className="text-gray-400 italic">Cliente no asignado</span>}</p>
                              <button onClick={e => { e.stopPropagation(); showPrices ? printOrder(order) : printWorkshopSheet(order) }} className="p-2.5 -m-1 rounded-lg hover:bg-gray-100 transition-colors" title={showPrices ? "Imprimir orden" : "Hoja de taller"}><Printer size={18} className="text-gray-400 hover:text-gray-700" /></button>
                            </div>
                            {first ? (
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                <TechBadge t={first.tecnica} origen={first.origen} />{first.cantidad}× {first.nombre}{(order.items || []).length > 1 && <span className="text-gray-400">+ {(order.items || []).length - 1}</span>}
                              </p>
                            ) : <p className="text-[10px] text-gray-400 italic mt-0.5">{t('noDetail')}</p>}
                            {showPrices && <p className="font-bold text-gray-700 text-sm mt-1">{fmtCurrency(order.total_price)}</p>}
                            {order.due_date && !isDel && <p className={`text-[10px] mt-0.5 flex items-center gap-1 ${od ? 'text-red-500 font-bold' : 'text-gray-400'}`}><Calendar size={9} />{new Date(order.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}{od && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Vencido</span>}</p>}
                            {!isDel && showPrices && <p className={`text-[10px] mt-0.5 ${pd >= order.total_price ? 'text-green-600' : pd > 0 ? 'text-gray-500' : 'text-amber-500'}`}>{pd >= order.total_price ? t('paid') + ' ✓' : pd > 0 ? `${t('deposit')}: ${fmtCurrency(pd)}` : t('noPayments')}</p>}
                            {state === 'ready' && (
                              <button onClick={e => { e.stopPropagation(); setStatus(order.id, 'delivered') }}
                                className="mt-2 w-full text-[10px] py-1 rounded-md font-semibold text-green-700 bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
                                ✓ {t('markDelivered')}
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
                <h3 className="font-bold text-gray-900">{detailOrder.clients?.name || <span className="text-gray-400 italic">Cliente no asignado</span>}</h3>
                {(() => { const first = (detailOrder.items || [])[0]; return first ? (
                  <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1"><TechBadge t={first.tecnica} origen={first.origen} />{first.cantidad}× {first.nombre}</p>
                ) : null })()}
                {showPrices && <p className="text-xs text-gray-400 mt-0.5">{fmtCurrency(detailOrder.total_price)}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => showPrices ? printOrder(detailOrder) : printWorkshopSheet(detailOrder)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400" title={showPrices ? "Imprimir orden" : "Hoja de taller"}><Printer size={16} /></button>
                <button onClick={() => printWorkshopSheet(detailOrder)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400" title="Hoja de taller"><ClipboardList size={16} /></button>
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
