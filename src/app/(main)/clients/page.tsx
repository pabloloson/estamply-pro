'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Users, Search, ChevronDown, ChevronUp, MessageCircle, Upload } from 'lucide-react'
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
  const supabase = createClient()
  const t = useTranslations('clients')
  const tc = useTranslations('common')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Partial<Client> | null>(null)
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [importStep, setImportStep] = useState(1)
  const [importData, setImportData] = useState<string[][]>([])
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importMap, setImportMap] = useState<Record<string, number>>({ nombre: -1, whatsapp: -1, email: -1 })
  const [importCountry, setImportCountry] = useState('54')
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null)
  const [importing, setImporting] = useState(false)

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('totalClients', { count: clients.length })}</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setImportModal(true); setImportStep(1); setImportData([]); setImportResult(null) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <Upload size={14} /> {t('importClients')}
          </button>
          <button onClick={() => { setModal({}); setShowMore(false) }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl whitespace-nowrap text-xs sm:text-sm font-semibold text-white" style={{ background: '#6C5CE7', boxShadow: '0 4px 14px rgba(108,92,231,0.3)' }}>
            <Plus size={15} /> {t('newClient')}
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-base !pl-10" placeholder={t('searchPlaceholder')} />
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center"><Users size={22} className="text-gray-400" /></div>
            <p className="text-gray-400 text-sm">{search ? tc('noData') : tc('noData')}</p>
            {!search && <button onClick={() => setModal({})} className="text-sm px-4 py-2 rounded-xl font-semibold text-white" style={{ background: '#6C5CE7' }}>{t('newClient')}</button>}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2 p-3">
              {filtered.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}>
                        {c.name[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">
                          {c.name}
                          {c.tipo_cliente === 'empresa' && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 font-semibold">Empresa</span>}
                        </p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setModal(c); setShowMore(false) }} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {c.whatsapp && (
                      <a href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-green-600 font-medium">
                        <MessageCircle size={12} /> {c.whatsapp}
                      </a>
                    )}
                    {c.phone && <span>Tel: {c.phone}</span>}
                    <span>{new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead><tr className="border-b border-gray-100">
                  {[t('name'), 'WhatsApp', t('emailField'), t('phone'), '', ''].map(h => (
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
                        ) : <span className="text-gray-300">---</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{c.email || <span className="text-gray-300">---</span>}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{c.phone || <span className="text-gray-300">---</span>}</td>
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
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? tc('edit') : t('newClient')}</h3>
              <button onClick={() => { setModal(null); setShowMore(false) }} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {/* Main fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')} *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailField')}</label>
                <input type="email" value={modal.email || ''} onChange={e => setModal({ ...modal, email: e.target.value })}
                  className="input-base" placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                    <textarea value={modal.notas || ''} onChange={e => setModal({ ...modal, notas: e.target.value })}
                      className="input-base resize-none" rows={3} placeholder="Notas internas sobre este cliente..." />
                    <p className="text-[10px] text-gray-400 mt-0.5">Solo visible para vos, no aparece en presupuestos.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModal(null); setShowMore(false) }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
              <button onClick={save} disabled={saving || !modal.name?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>
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
                <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors">
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
                      const map: Record<string, number> = { nombre: -1, whatsapp: -1, email: -1 }
                      rows[0].forEach((h, i) => {
                        const hl = String(h).toLowerCase()
                        if (['nombre', 'name', 'cliente'].includes(hl)) map.nombre = i
                        if (['whatsapp', 'telefono', 'celular', 'phone', 'tel'].includes(hl)) map.whatsapp = i
                        if (['email', 'correo', 'mail'].includes(hl)) map.email = i
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de país</label>
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
                  <p className="text-xs font-semibold text-gray-500 mb-2">Preview (primeras 3 filas)</p>
                  {importData.slice(0, 3).map((row, i) => (
                    <p key={i} className="text-xs text-gray-600 truncate">{importMap.nombre >= 0 ? row[importMap.nombre] : '?'} · {importMap.whatsapp >= 0 ? row[importMap.whatsapp] : '?'}</p>
                  ))}
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
                    const batch: Array<{ name: string; whatsapp: string; email?: string }> = []
                    for (const row of importData) {
                      const name = String(row[importMap.nombre] || '').trim()
                      const wa = normalize(row[importMap.whatsapp])
                      if (!name || !wa || wa.length < 5) { errors++; continue }
                      if (existing.has(wa)) { skipped++; continue }
                      existing.add(wa)
                      batch.push({ name, whatsapp: wa, email: importMap.email >= 0 ? String(row[importMap.email] || '').trim() || undefined : undefined })
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
                  }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>{importing ? 'Importando...' : `Importar ${importData.length} clientes`}</button>
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
                <button onClick={() => setImportModal(false)} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>Ver clientes</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
