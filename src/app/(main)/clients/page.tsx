'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Users, Search } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
}

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Partial<Client> | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!modal?.name?.trim()) return
    setSaving(true)
    const payload = {
      name: modal.name.trim(),
      email: modal.email?.trim() || null,
      phone: modal.phone?.trim() || null,
    }
    if (modal.id) {
      await supabase.from('clients').update(payload).eq('id', modal.id)
    } else {
      await supabase.from('clients').insert(payload)
    }
    setModal(null)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} clientes en total</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#6C5CE7', boxShadow: '0 4px 14px rgba(108,92,231,0.3)' }}
        >
          <Plus size={15} />
          Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base pl-9"
          placeholder="Buscar por nombre, email o teléfono…"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Users size={22} className="text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm">
              {search ? 'Sin resultados para esa búsqueda.' : 'Aún no tenés clientes. Creá el primero.'}
            </p>
            {!search && (
              <button
                onClick={() => setModal({})}
                className="text-sm px-4 py-2 rounded-xl font-semibold text-white"
                style={{ background: '#6C5CE7' }}
              >
                Agregar cliente
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nombre', 'Email', 'Teléfono', 'Creado', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}
                      >
                        {c.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{c.email || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">{c.phone || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setModal(c)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Pencil size={14} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
                <input
                  autoFocus
                  value={modal.name || ''}
                  onChange={e => setModal({ ...modal, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  className="input-base"
                  placeholder="Ej: Juan García"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={modal.email || ''}
                  onChange={e => setModal({ ...modal, email: e.target.value })}
                  className="input-base"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                <input
                  value={modal.phone || ''}
                  onChange={e => setModal({ ...modal, phone: e.target.value })}
                  className="input-base"
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !modal.name?.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#6C5CE7' }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
