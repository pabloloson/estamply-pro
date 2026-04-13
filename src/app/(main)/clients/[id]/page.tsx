'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Pencil, Printer, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/shared/context/LocaleContext'
import { usePermissions } from '@/shared/context/PermissionsContext'

interface Client {
  id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null
  tipo_cliente: string | null; identificacion_fiscal: string | null; razon_social: string | null
  direccion: string | null; ciudad: string | null; provincia: string | null; notas: string | null
  created_at: string
}

interface OrderRow { id: string; status: string; total_price: number; due_date: string | null; created_at: string; items: unknown[] }
interface PresupuestoRow { id: string; codigo: string; total: number; created_at: string; items: unknown[] }
interface PaymentRow { order_id: string; monto: number }

const SL: Record<string, string> = { pending: 'Pendiente', production: 'En produccion', ready: 'Listo', delivered: 'Entregado' }
const SC: Record<string, string> = { pending: '#D97706', production: '#2563EB', ready: '#059669', delivered: '#6B7280' }

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const { fmt } = useLocale()
  const { isOwner } = usePermissions()
  const [client, setClient] = useState<Client | null>(null)
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [presupuestos, setPresupuestos] = useState<PresupuestoRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Client>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: o }, { data: p }, { data: pay }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('orders').select('id, status, total_price, due_date, created_at, items').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('presupuestos').select('id, codigo, total, created_at, items').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('payments').select('order_id, monto'),
      ])
      if (c) setClient(c)
      setOrders((o || []) as OrderRow[])
      setPresupuestos((p || []) as PresupuestoRow[])
      setPayments((pay || []) as PaymentRow[])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
  if (!client) return <div className="text-center py-16 text-gray-400">Cliente no encontrado</div>

  const totalGastado = orders.reduce((s, o) => s + o.total_price, 0)
  const ticketPromedio = orders.length > 0 ? Math.round(totalGastado / orders.length) : 0
  const paidTotal = payments.filter(p => orders.some(o => o.id === p.order_id)).reduce((s, p) => s + p.monto, 0)
  const pendiente = Math.max(totalGastado - paidTotal, 0)
  const waNum = (client.whatsapp || client.phone || '').replace(/[\s\-\(\)]/g, '')

  return (
    <div>
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft size={16} /> Clientes
      </button>

      {/* Header */}
      <div className="card p-5 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg flex-shrink-0">
              {client.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {[client.email, client.whatsapp || client.phone].filter(Boolean).join(' · ')}
              </p>
              {(client.ciudad || client.provincia) && <p className="text-sm text-gray-400">{[client.ciudad, client.provincia].filter(Boolean).join(', ')}</p>}
              {client.identificacion_fiscal && <p className="text-xs text-gray-400 mt-0.5">{client.identificacion_fiscal}</p>}
              <p className="text-xs text-gray-300 mt-1">Cliente desde {new Date(client.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {client.notas && <p className="text-xs text-gray-500 mt-2 p-2 rounded bg-gray-50 italic">{client.notas}</p>}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {waNum && <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100"><MessageCircle size={14} /> WhatsApp</a>}
            <button onClick={() => { setEditForm(client); setEditing(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"><Pencil size={13} /> Editar</button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className={`grid gap-3 mb-6 ${isOwner ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 max-w-[200px]'}`}>
        <div className="p-4 rounded-xl bg-gray-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pedidos</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{orders.length}</p>
        </div>
        {isOwner && <>
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total gastado</p>
            <p className="text-lg font-bold text-gray-800 mt-1">{fmt(totalGastado)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ticket promedio</p>
            <p className="text-lg font-bold text-gray-800 mt-1">{fmt(ticketPromedio)}</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pendiente</p>
            <p className="text-lg font-bold text-gray-800 mt-1">{fmt(pendiente)}</p>
          </div>
        </>}
      </div>

      {/* Presupuestos */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Presupuestos ({presupuestos.length})</h3>
        {presupuestos.length > 0 ? (
          <div className="space-y-2">
            {presupuestos.map(p => (
              <Link key={p.id} href={`/presupuesto`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <span className="font-medium text-sm text-gray-800">#{p.codigo}</span>
                  <span className="text-xs text-gray-400 ml-2">{new Date(p.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span className="text-xs text-gray-400 ml-2">{(() => { const n = Array.isArray(p.items) ? p.items.length : 0; return `${n} ${n === 1 ? 'item' : 'items'}` })()}</span>
                </div>
                <span className="font-bold text-sm text-gray-800">{fmt(p.total)}</span>
              </Link>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400 italic">No hay presupuestos para este cliente.</p>}
      </div>

      {/* Pedidos */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Pedidos ({orders.length})</h3>
        {orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => router.push('/orders')}>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-gray-800">#{o.id.slice(0, 8)}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${SC[o.status]}18`, color: SC[o.status] }}>{SL[o.status]}</span>
                  {o.due_date && <span className="text-xs text-gray-400">{new Date(o.due_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>}
                </div>
                <span className="font-bold text-sm text-gray-800">{fmt(o.total_price)}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400 italic">No hay pedidos para este cliente.</p>}
      </div>

      {/* Action */}
      <Link href="/presupuesto" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border-2 border-[#6C5CE7] text-[#6C5CE7] hover:bg-[#6C5CE7] hover:text-white transition-colors">
        + Nuevo presupuesto para este cliente
      </Link>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Editar cliente</h3>
              <button onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
                <input className="input-base" value={editForm.whatsapp || ''} onChange={e => setEditForm({ ...editForm, whatsapp: e.target.value })} placeholder="+54 351 5643137" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-base" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Identificación fiscal</label>
                <input className="input-base" value={editForm.identificacion_fiscal || ''} onChange={e => setEditForm({ ...editForm, identificacion_fiscal: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input className="input-base" value={editForm.ciudad || ''} onChange={e => setEditForm({ ...editForm, ciudad: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                  <input className="input-base" value={editForm.provincia || ''} onChange={e => setEditForm({ ...editForm, provincia: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                <textarea className="input-base resize-none" rows={3} value={editForm.notas || ''} onChange={e => setEditForm({ ...editForm, notas: e.target.value })} /></div>
            </div>
            <button disabled={!editForm.name?.trim() || saving} onClick={async () => {
              setSaving(true)
              await supabase.from('clients').update({
                name: editForm.name?.trim(), email: editForm.email?.trim() || null,
                whatsapp: editForm.whatsapp?.trim() || null, phone: editForm.whatsapp?.trim() || null,
                identificacion_fiscal: editForm.identificacion_fiscal?.trim() || null,
                ciudad: editForm.ciudad?.trim() || null, provincia: editForm.provincia?.trim() || null,
                notas: editForm.notas?.trim() || null,
              }).eq('id', client.id)
              setSaving(false); setEditing(false)
              // Reload client data
              const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
              if (c) setClient(c)
            }} className="w-full mt-6 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
