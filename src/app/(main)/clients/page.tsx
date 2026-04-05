'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Users, Search, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'

interface Client {
  id: string; name: string; email: string | null; phone: string | null; whatsapp: string | null
  tipo_cliente: string | null; identificacion_fiscal: string | null; razon_social: string | null
  direccion: string | null; ciudad: string | null; provincia: string | null; notas: string | null
  created_at: string
}

function waLink(num: string) { return `https://wa.me/${num.replace(/[\s\-\(\)]/g, '')}` }

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Partial<Client> | null>(null)
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!modal?.name?.trim()) return; setSaving(true)
    const payload = {
      name: modal.name.trim(), email: modal.email?.trim() || null, phone: modal.phone?.trim() || null,
      whatsapp: modal.whatsapp?.trim() || null, tipo_cliente: modal.tipo_cliente || 'persona',
      identificacion_fiscal: modal.identificacion_fiscal?.trim() || null,
      razon_social: modal.razon_social?.trim() || null, direccion: modal.direccion?.trim() || null,
      ciudad: modal.ciudad?.trim() || null, provincia: modal.provincia?.trim() || null,
      notas: modal.notas?.trim() || null,
    }
    if (modal.id) await supabase.from('clients').update(payload).eq('id', modal.id)
    else await supabase.from('clients').insert(payload)
    setModal(null); setSaving(false); setShowMore(false); load()
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} clientes en total</p></div>
        <button onClick={() => { setModal({}); setShowMore(false) }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7', boxShadow: '0 4px 14px rgba(108,92,231,0.3)' }}>
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-base pl-9" placeholder="Buscar por nombre, WhatsApp, email o teléfono…" />
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center"><Users size={22} className="text-gray-400" /></div>
            <p className="text-gray-400 text-sm">{search ? 'Sin resultados.' : 'Aún no tenés clientes.'}</p>
            {!search && <button onClick={() => setModal({})} className="text-sm px-4 py-2 rounded-xl font-semibold text-white" style={{ background: '#6C5CE7' }}>Agregar cliente</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                {['Nombre', 'WhatsApp', 'Email', 'Teléfono', 'Creado', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-gray-800">{c.name}</span>
                          {c.tipo_cliente === 'empresa' && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 font-semibold">Empresa</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {c.whatsapp ? (
                        <a href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium">
                          <MessageCircle size={13} /> {c.whatsapp}
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => { setModal(c); setShowMore(false) }} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                        <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => { setModal(null); setShowMore(false) }} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {/* Main fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input autoFocus value={modal.name || ''} onChange={e => setModal({ ...modal, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && save()} className="input-base" placeholder="Nombre del cliente o empresa" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                  <MessageCircle size={14} className="text-green-500" /> WhatsApp
                </label>
                <input value={modal.whatsapp || ''} onChange={e => setModal({ ...modal, whatsapp: e.target.value })}
                  className="input-base" placeholder="Ej: +54 351 555 1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={modal.email || ''} onChange={e => setModal({ ...modal, email: e.target.value })}
                  className="input-base" placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={modal.phone || ''} onChange={e => setModal({ ...modal, phone: e.target.value })}
                  className="input-base" placeholder="+54 11 1234-5678" />
                <p className="text-[10px] text-gray-400 mt-0.5">Solo si es distinto al WhatsApp</p>
              </div>

              {/* Expandable section */}
              <button type="button" onClick={() => setShowMore(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors w-full pt-1">
                {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                Más datos
              </button>

              {showMore && (
                <div className="space-y-4 pt-1 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cliente</label>
                    <select className="input-base" value={modal.tipo_cliente || 'persona'} onChange={e => setModal({ ...modal, tipo_cliente: e.target.value })}>
                      <option value="persona">Persona</option>
                      <option value="empresa">Empresa</option>
                    </select>
                  </div>

                  {modal.tipo_cliente === 'empresa' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Razón social</label>
                      <input value={modal.razon_social || ''} onChange={e => setModal({ ...modal, razon_social: e.target.value })}
                        className="input-base" placeholder="Nombre legal de la empresa" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Identificación fiscal</label>
                    <input value={modal.identificacion_fiscal || ''} onChange={e => setModal({ ...modal, identificacion_fiscal: e.target.value })}
                      className="input-base" placeholder="Ej: 20-12345678-9" />
                    <p className="text-[10px] text-gray-400 mt-0.5">DNI, CUIT, RUT, RFC, NIT, CPF según tu país</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input value={modal.direccion || ''} onChange={e => setModal({ ...modal, direccion: e.target.value })}
                      className="input-base" placeholder="Calle y número" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                      <input value={modal.ciudad || ''} onChange={e => setModal({ ...modal, ciudad: e.target.value })}
                        className="input-base" placeholder="Ej: Córdoba Capital" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                      <input value={modal.provincia || ''} onChange={e => setModal({ ...modal, provincia: e.target.value })}
                        className="input-base" placeholder="Ej: Córdoba" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                    <textarea value={modal.notas || ''} onChange={e => setModal({ ...modal, notas: e.target.value })}
                      className="input-base resize-none" rows={3} placeholder="Notas internas sobre este cliente..." />
                    <p className="text-[10px] text-gray-400 mt-0.5">Solo visible para vos, no aparece en presupuestos.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModal(null); setShowMore(false) }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={save} disabled={saving || !modal.name?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
