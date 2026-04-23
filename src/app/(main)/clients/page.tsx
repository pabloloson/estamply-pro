// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import { Plus, Pencil, Trash2, X, Users, Search, MessageCircle, Upload, Download, MoreVertical, FileText } from 'lucide-react'
import EmptyState from '@/shared/components/EmptyState'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'
import * as XLSX from 'xlsx'

interface Client {
  id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null
  tipo_cliente: string | null; identificacion_fiscal: string | null; razon_social: string | null
  direccion: string | null; ciudad: string | null; provincia: string | null; notas: string | null
  created_at: string
}

function waLink(num: string) { return `https://wa.me/${num.replace(/[\s\-\(\)]/g, '')}` }

export default function ClientsPage() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('clients')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency } = useLocale()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Partial<Client> | null>(null)
  const [saving, setSaving] = useState(false)
  const [ordersByClient, setOrdersByClient] = useState<Map<string, Array<{ total_price: number; created_at: string }>>>(new Map())
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const [importModal, setImportModal] = useState(false)
  const [importStep, setImportStep] = useState(1)
  const [importData, setImportData] = useState<string[][]>([])
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importMap, setImportMap] = useState<Record<string, number>>({ nombre: -1, whatsapp: -1, email: -1, tipo: -1, identificacion_fiscal: -1, direccion: -1, ciudad: -1, provincia: -1, notas: -1 })
  const [importCountry, setImportCountry] = useState('54')
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null)
  const [importing, setImporting] = useState(false)

  async function load() {
    const [{ data: cls }, { data: ords }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('orders').select('id, client_id, total_price, status, created_at'),
    ])
    setClients(cls || [])
    setOrdersByClient(new Map())
    if (ords) {
      const map = new Map<string, Array<{ total_price: number; created_at: string }>>()
      for (const o of ords) {
        if (!o.client_id) continue
        if (!map.has(o.client_id)) map.set(o.client_id, [])
        map.get(o.client_id)!.push({ total_price: o.total_price, created_at: o.created_at })
      }
      setOrdersByClient(map)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function getClientOrders(clientId: string) { return ordersByClient.get(clientId) || [] }
  function getClientTotal(clientId: string) { return getClientOrders(clientId).reduce((s, o) => s + o.total_price, 0) }
  function getClientLastOrder(clientId: string) { const ords = getClientOrders(clientId); return ords.length > 0 ? ords.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at : null }

  function closeMenu() { setMenuOpen(null); setMenuPos(null) }

  const [dupWarning, setDupWarning] = useState<{ client: Client; field: string } | null>(null)

  function capitalize(s: string) {
    return s.replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
  }

  function findDuplicate(): { client: Client; field: string } | null {
    if (modal?.id) return null // editing existing, skip
    const phone = (modal?.whatsapp || modal?.phone || '').replace(/[\s\-\(\)+]/g, '')
    const email = (modal?.email || '').trim().toLowerCase()
    for (const c of clients) {
      if (phone && phone.length >= 8) {
        const cp = (c.whatsapp || c.phone || '').replace(/[\s\-\(\)+]/g, '')
        if (cp && cp.includes(phone.slice(-8))) return { client: c, field: 'teléfono' }
      }
      if (email && c.email?.toLowerCase() === email) return { client: c, field: 'email' }
    }
    return null
  }

  async function save(force = false) {
    if (!modal?.name?.trim()) return
    // Duplicate check
    if (!force && !modal.id) {
      const dup = findDuplicate()
      if (dup) { setDupWarning(dup); return }
    }
    setSaving(true)
    const payload = {
      name: capitalize(modal.name.trim()), email: modal.email?.trim() || null, phone: modal.phone?.trim() || null,
      whatsapp: modal.whatsapp?.trim() || null, tipo_cliente: modal.tipo_cliente || 'persona',
      identificacion_fiscal: modal.identificacion_fiscal?.trim() || null,
      razon_social: modal.razon_social?.trim() || null, direccion: modal.direccion?.trim() || null,
      ciudad: modal.ciudad?.trim() || null, provincia: modal.provincia?.trim() || null,
      notas: modal.notas?.trim() || null,
    }
    if (modal.id) await supabase.from('clients').update(payload).eq('id', modal.id)
    else await supabase.from('clients').insert(payload)
    setModal(null); setSaving(false); setDupWarning(null); load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clients').delete().eq('id', id); load()
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.whatsapp || '').includes(search)
  )

  function handleExportar() {
    const data = filtered.map(c => ({
      nombre: c.name,
      telefono: c.whatsapp || c.phone || '',
      email: c.email || '',
      tipo: c.tipo_cliente || '',
      identificacion_fiscal: c.identificacion_fiscal || '',
      direccion: c.direccion || '',
      ciudad: c.ciudad || '',
      provincia: c.provincia || '',
      notas: c.notas || '',
      pedidos: getClientOrders(c.id).length,
      ultimo_pedido: (() => { const d = getClientLastOrder(c.id); return d ? new Date(d).toLocaleDateString('es-AR') : '' })(),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('totalClients', { count: clients.length })}</p></div>
        <div className="flex gap-2">
          <button onClick={handleExportar} className="flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <Download size={14} /> Exportar
          </button>
          <button onClick={() => { setImportModal(true); setImportStep(1); setImportData([]); setImportResult(null) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <Upload size={14} /> {t('importClients')}
          </button>
          <button onClick={() => { setModal({}) }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl whitespace-nowrap text-xs sm:text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#0D9488] transition-colors shadow-sm">
            <Plus size={15} /> {t('newClient')}
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-base !pl-10" placeholder={t('searchPlaceholder')} />
      </div>

      <div className="card overflow-hidden">
        {clients.length === 0 && !search ? (
          <EmptyState icon="👥" title="Todavía no tenés clientes registrados." description="Los clientes se crean automáticamente cuando generás un presupuesto, o podés agregarlos manualmente." actionLabel="+ Agregar cliente" onAction={() => setModal({})} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center"><Users size={22} className="text-gray-400" /></div>
            <p className="text-gray-400 text-sm">{tc('noData')}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden px-3 py-1">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-3 border-b border-[#F3F3F1] cursor-pointer" onClick={() => router.push(`/clients/${c.id}`)}>
                  <div className="w-10 h-10 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0F766E] font-semibold text-sm flex-shrink-0">
                    {c.name[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {c.name}
                      {c.tipo_cliente === 'empresa' && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 font-semibold">Empresa</span>}
                    </p>
                    {(c.whatsapp || c.phone) && <p className="text-xs text-gray-400 mt-0.5">{c.whatsapp || c.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(c.whatsapp || c.phone) && (
                      <a href={waLink(c.whatsapp || c.phone || '')} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="p-2 rounded-lg hover:bg-[#F0FDFA] transition-colors">
                        <MessageCircle size={16} className="text-[#0F766E]" />
                      </a>
                    )}
                    <button onClick={e => { e.stopPropagation(); setModal(c) }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                      <Pencil size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{t('name')}</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Teléfono</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{t('emailField')}</th>
                  <th className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Facturado</th>
                  <th className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Pedidos</th>
                  <th className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Último</th>
                  <th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/clients/${c.id}`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] flex items-center justify-center text-[#0F766E] font-semibold text-xs flex-shrink-0">
                            {c.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                            {c.razon_social && <p className="text-[10px] text-gray-400">{c.razon_social}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(c.whatsapp || c.phone) ? (
                          <span className="flex items-center gap-1.5">
                            {c.whatsapp || c.phone}
                            <a href={waLink(c.whatsapp || c.phone || '')} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-green-600 hover:text-green-700" title="Abrir WhatsApp"><MessageCircle size={14} /></a>
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.email || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right font-medium">{getClientTotal(c.id) > 0 ? fmtCurrency(getClientTotal(c.id)) : <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 text-center">{getClientOrders(c.id).length || <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{(() => { const d = getClientLastOrder(c.id); return d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '-' })()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <button onClick={e => { e.stopPropagation(); setModal(c) }} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
                          <button onClick={e => {
                            e.stopPropagation()
                            if (menuOpen === c.id) { closeMenu(); return }
                            const rect = e.currentTarget.getBoundingClientRect()
                            setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 })
                            setMenuOpen(c.id)
                          }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><MoreVertical size={14} className="text-gray-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Context menu portal */}
      {menuOpen && menuPos && (() => {
        const c = clients.find(x => x.id === menuOpen)
        if (!c) return null
        return createPortal(
          <>
            <div className="fixed inset-0 z-[99]" onClick={closeMenu} />
            <div className="fixed z-[100] bg-white rounded-xl border border-[#E5E5E3] shadow-lg py-1.5 min-w-[180px]"
              style={{ top: menuPos.top, left: menuPos.left }}>
              <button onClick={() => { setModal(c); closeMenu() }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F8F7F4] transition-colors flex items-center gap-2.5"><Pencil size={14} className="text-gray-400" /> Editar</button>
              <button onClick={() => { router.push('/presupuesto'); closeMenu() }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F8F7F4] transition-colors flex items-center gap-2.5"><FileText size={14} className="text-gray-400" /> Nuevo presupuesto</button>
              {(c.whatsapp || c.phone) && <button onClick={() => { window.open(waLink(c.whatsapp || c.phone || ''), '_blank'); closeMenu() }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F8F7F4] transition-colors flex items-center gap-2.5"><MessageCircle size={14} className="text-gray-400" /> WhatsApp</button>}
              <div className="border-t border-[#F3F3F1] my-1" />
              <button onClick={() => { if (confirm(`¿Eliminar a ${c.name}? Los presupuestos y pedidos asociados NO se eliminan.`)) { supabase.from('clients').delete().eq('id', c.id).then(() => load()) }; closeMenu() }} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2.5"><Trash2 size={14} /> Eliminar</button>
            </div>
          </>,
          document.body
        )
      })()}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? tc('edit') : t('newClient')}</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('name')} *</label>
                <input autoFocus value={modal.name || ''} onChange={e => setModal({ ...modal, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && save()} className="input-base" placeholder="Nombre del cliente o empresa" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  <MessageCircle size={14} className="text-green-500" /> Teléfono / WhatsApp
                </label>
                <input value={modal.whatsapp || ''} onChange={e => setModal({ ...modal, whatsapp: e.target.value })}
                  className="input-base" placeholder="Ej: +54 351 555 1234" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('emailField')}</label>
                <input type="email" value={modal.email || ''} onChange={e => setModal({ ...modal, email: e.target.value })}
                  className="input-base" placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tipo de cliente</label>
                <select className="input-base" value={modal.tipo_cliente || 'persona'} onChange={e => setModal({ ...modal, tipo_cliente: e.target.value })}>
                  <option value="persona">Persona</option>
                  <option value="empresa">Empresa</option>
                </select>
              </div>
              {modal.tipo_cliente === 'empresa' && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Empresa / Razón Social</label>
                  <input value={modal.razon_social || ''} onChange={e => setModal({ ...modal, razon_social: e.target.value })}
                    className="input-base" placeholder="Nombre legal de la empresa" />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Identificación fiscal</label>
                <input value={modal.identificacion_fiscal || ''} onChange={e => setModal({ ...modal, identificacion_fiscal: e.target.value })}
                  className="input-base" placeholder="Ej: 20-12345678-9" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Dirección</label>
                <input value={modal.direccion || ''} onChange={e => setModal({ ...modal, direccion: e.target.value })}
                  className="input-base" placeholder="Calle y número" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Ciudad</label>
                  <input value={modal.ciudad || ''} onChange={e => setModal({ ...modal, ciudad: e.target.value })}
                    className="input-base" placeholder="Ej: Córdoba Capital" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Provincia</label>
                  <input value={modal.provincia || ''} onChange={e => setModal({ ...modal, provincia: e.target.value })}
                    className="input-base" placeholder="Ej: Córdoba" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t('notes')}</label>
                <textarea value={modal.notas || ''} onChange={e => setModal({ ...modal, notas: e.target.value })}
                  className="input-base resize-none" rows={3} placeholder="Notas internas sobre este cliente..." />
                <p className="text-[10px] text-gray-400 mt-0.5">Solo visible para vos, no aparece en presupuestos.</p>
              </div>
            </div>
            {dupWarning && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p className="text-xs text-amber-700 font-medium">Ya existe un cliente con este {dupWarning.field}: <strong>{dupWarning.client.name}</strong> ({dupWarning.client.whatsapp || dupWarning.client.phone || dupWarning.client.email})</p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setModal(dupWarning.client); setDupWarning(null) }} className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline">Ver cliente existente</button>
                  <button onClick={() => { setDupWarning(null); save(true) }} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Crear de todos modos</button>
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModal(null); setDupWarning(null) }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
              <button onClick={() => save()} disabled={saving || !modal.name?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>
                {saving ? tc('saving') : tc('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Importar clientes</h3>
              <button onClick={() => setImportModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>

            {/* Step 1: Upload */}
            {importStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Subí un archivo .csv o .xlsx con tus clientes.</p>
                <button type="button" onClick={() => {
                  const headers = ['nombre', 'telefono', 'email', 'tipo', 'identificacion_fiscal', 'direccion', 'ciudad', 'provincia', 'notas']
                  const ejemplo = [
                    ['Juan Pérez', '3515551234', 'juan@email.com', 'Persona', '20-12345678-9', 'Calle 123', 'Córdoba', 'Córdoba', 'Cliente frecuente'],
                    ['Empresa ABC', '1155559999', 'compras@abc.com', 'Empresa', '30-98765432-1', 'Av. Siempre Viva 742', 'Buenos Aires', 'CABA', ''],
                  ]
                  const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplo])
                  const wb = XLSX.utils.book_new()
                  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
                  XLSX.writeFile(wb, 'plantilla_clientes.xlsx')
                }} className="flex items-center gap-2 text-sm text-teal-700 hover:text-teal-800 font-medium">
                  <Download size={14} /> Descargar plantilla de ejemplo (.xlsx)
                </button>
                <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-teal-300 transition-colors">
                  <Upload size={24} className="text-gray-300 mb-2" />
                  <span className="text-sm text-gray-500">Seleccionar archivo</span>
                  <span className="text-xs text-gray-400 mt-1">.csv, .xlsx, .xls</span>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => {
                      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
                      const ws = wb.Sheets[wb.SheetNames[0]]
                      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][]
                      if (rows.length < 2) { alert('El archivo está vacío'); return }
                      setImportHeaders(rows[0].map(String))
                      setImportData(rows.slice(1).filter(r => r.some(c => c)))
                      // Auto-map
                      const map: Record<string, number> = { nombre: -1, whatsapp: -1, email: -1, tipo: -1, identificacion_fiscal: -1, direccion: -1, ciudad: -1, provincia: -1, notas: -1 }
                      rows[0].forEach((h, i) => {
                        const hl = String(h).toLowerCase()
                        if (['nombre', 'name', 'cliente'].includes(hl)) map.nombre = i
                        if (['whatsapp', 'telefono', 'celular', 'phone', 'tel'].includes(hl)) map.whatsapp = i
                        if (['email', 'correo', 'mail'].includes(hl)) map.email = i
                        if (['tipo', 'type', 'tipo_cliente'].includes(hl)) map.tipo = i
                        if (['identificacion', 'cuit', 'rut', 'rfc', 'fiscal', 'identificacion_fiscal', 'dni'].includes(hl)) map.identificacion_fiscal = i
                        if (['direccion', 'domicilio', 'address'].includes(hl)) map.direccion = i
                        if (['ciudad', 'city', 'localidad'].includes(hl)) map.ciudad = i
                        if (['provincia', 'state', 'estado', 'departamento'].includes(hl)) map.provincia = i
                        if (['notas', 'notes', 'observaciones', 'comentarios'].includes(hl)) map.notas = i
                      })
                      setImportMap(map)
                      setImportStep(2)
                    }
                    reader.readAsBinaryString(file)
                  }} />
                </label>
                {importData.length > 0 && <p className="text-xs text-gray-400">{importData.length} filas detectadas</p>}
              </div>
            )}

            {/* Step 2: Map columns + country code */}
            {importStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Código de país</label>
                  <select className="input-base text-sm" value={importCountry} onChange={e => setImportCountry(e.target.value)}>
                    {[['54','Argentina'],['52','México'],['57','Colombia'],['56','Chile'],['51','Perú'],['593','Ecuador'],['598','Uruguay'],['595','Paraguay'],['591','Bolivia'],['55','Brasil'],['58','Venezuela']].map(([c,n]) => (
                      <option key={c} value={c}>+{c} {n}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mapear columnas</p>
                {['nombre', 'whatsapp', 'email'].map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-24 capitalize">{field === 'whatsapp' ? 'WhatsApp' : field}</span>
                    <select className="input-base text-sm flex-1" value={importMap[field]} onChange={e => setImportMap({ ...importMap, [field]: parseInt(e.target.value) })}>
                      <option value={-1}>— No mapear —</option>
                      {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                    {field !== 'email' && <span className="text-red-500 text-xs">*</span>}
                  </div>
                ))}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Vista previa — {importData.length} {importData.length === 1 ? 'cliente' : 'clientes'} encontrados</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {importData.slice(0, 8).map((row, i) => {
                      const name = importMap.nombre >= 0 ? String(row[importMap.nombre] || '').trim() : ''
                      const wa = importMap.whatsapp >= 0 ? String(row[importMap.whatsapp] || '').trim() : ''
                      const email = importMap.email >= 0 ? String(row[importMap.email] || '').trim() : ''
                      const valid = name.length > 0
                      return (
                        <p key={i} className="text-xs text-gray-600 truncate flex items-center gap-1">
                          <span className={valid ? 'text-green-500' : 'text-amber-500'}>{valid ? '\u2705' : '\u26a0\ufe0f'}</span>
                          {valid ? <><span className="font-medium">{name}</span>{wa && <span className="text-gray-400"> — {wa}</span>}{email && <span className="text-gray-400"> — {email}</span>}</> : <span className="text-amber-600 italic">Fila {i + 2}: sin nombre — se saltea</span>}
                        </p>
                      )
                    })}
                    {importData.length > 8 && <p className="text-[10px] text-gray-400">...y {importData.length - 8} más</p>}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setImportStep(1)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('back')}</button>
                  <button disabled={importMap.nombre < 0 || importMap.whatsapp < 0} onClick={async () => {
                    if (importData.length > 500) { alert('Máximo 500 clientes por importación'); return }
                    setImporting(true)
                    const normalize = (num: string) => {
                      const clean = String(num || '').replace(/[\s\-\(\)\.]/g, '')
                      if (clean.startsWith('+')) return clean.slice(1)
                      if (clean.startsWith('00')) return clean.slice(2)
                      return importCountry + clean
                    }
                    const existing = new Set(clients.map(c => c.whatsapp?.replace(/\D/g, '') || ''))
                    let imported = 0, skipped = 0, errors = 0
                    const batch: Array<Record<string, string | undefined>> = []
                    for (const row of importData) {
                      const name = String(row[importMap.nombre] || '').trim()
                      const wa = normalize(row[importMap.whatsapp])
                      if (!name || !wa || wa.length < 5) { errors++; continue }
                      if (existing.has(wa)) { skipped++; continue }
                      existing.add(wa)
                      batch.push({
                        name, whatsapp: wa,
                        email: importMap.email >= 0 ? String(row[importMap.email] || '').trim() || undefined : undefined,
                        tipo_cliente: importMap.tipo >= 0 ? String(row[importMap.tipo] || '').trim() || undefined : undefined,
                        identificacion_fiscal: importMap.identificacion_fiscal >= 0 ? String(row[importMap.identificacion_fiscal] || '').trim() || undefined : undefined,
                        direccion: importMap.direccion >= 0 ? String(row[importMap.direccion] || '').trim() || undefined : undefined,
                        ciudad: importMap.ciudad >= 0 ? String(row[importMap.ciudad] || '').trim() || undefined : undefined,
                        provincia: importMap.provincia >= 0 ? String(row[importMap.provincia] || '').trim() || undefined : undefined,
                        notas: importMap.notas >= 0 ? String(row[importMap.notas] || '').trim() || undefined : undefined,
                      })
                    }
                    if (batch.length) {
                      const { error } = await supabase.from('clients').insert(batch)
                      if (error) errors += batch.length
                      else imported = batch.length
                    }
                    setImportResult({ imported, skipped, errors })
                    setImporting(false)
                    setImportStep(3)
                    load()
                  }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>{importing ? 'Importando...' : `Importar ${importData.length} clientes`}</button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {importStep === 3 && importResult && (
              <div className="space-y-4 text-center py-4">
                <p className="text-3xl">✅</p>
                <h3 className="font-bold text-gray-900">Importación completa</h3>
                <div className="space-y-1 text-sm">
                  {importResult.imported > 0 && <p className="text-green-600">✅ {importResult.imported} clientes importados</p>}
                  {importResult.skipped > 0 && <p className="text-gray-500">⏭️ {importResult.skipped} duplicados omitidos</p>}
                  {importResult.errors > 0 && <p className="text-red-500">❌ {importResult.errors} filas con errores</p>}
                </div>
                <button onClick={() => setImportModal(false)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0F766E' }}>Ver clientes</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
