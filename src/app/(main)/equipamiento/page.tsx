// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { Plus, Pencil, Trash2, X, Search, AlertTriangle } from 'lucide-react'
import NumericInput from '@/shared/components/NumericInput'
import EmptyState from '@/shared/components/EmptyState'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'

interface Equipment {
  id: string; name: string; marca: string | null; type: string; clasificacion: string
  cost: number; lifespan_uses: number; tecnicas_slugs: string[]
  assigned_paper_id: string | null; assigned_ink_id: string | null
  purchase_date: string | null; supplier_id: string | null; notes: string | null
  print_time_sec: number
}
interface InsumoRef { id: string; nombre: string; tipo: string; config: Record<string, unknown> }

const CLASIF_LABELS: Record<string, string> = { impresora: 'Impresora', plotter: 'Plotter', plancha: 'Plancha', horno: 'Horno', pulpo: 'Pulpo' }
const CLASIF_COLORS: Record<string, string> = { impresora: '#E17055', plotter: '#00B894', plancha: '#0F766E', horno: '#F97316', pulpo: '#FDCB6E' }
const CLASIF_TABS = [
  { id: '', label: 'Todos' },
  { id: 'impresora', label: 'Impresoras', color: '#E17055' },
  { id: 'plotter', label: 'Plotters', color: '#00B894' },
  { id: 'plancha', label: 'Planchas', color: '#0F766E' },
  { id: 'horno', label: 'Hornos', color: '#F97316' },
  { id: 'pulpo', label: 'Pulpos', color: '#FDCB6E' },
]

const TYPES_BY_CLASIF: Record<string, Array<[string, string]>> = {
  impresora: [['printer_subli', 'Impresora Sublimación'], ['printer_dtf', 'Impresora DTF'], ['printer_uv', 'Impresora UV'], ['printer_other', 'Otra impresora']],
  plotter: [['plotter_corte', 'Plotter de corte'], ['plotter_impresion', 'Plotter de impresión'], ['plotter_combo', 'Plotter corte + impresión'], ['plotter_other', 'Otro plotter']],
  plancha: [['press_flat', 'Plancha Plana'], ['press_mug', 'Plancha Tazas'], ['press_cap', 'Plancha Gorras'], ['press_5in1', 'Plancha 5 en 1'], ['press_pneumatic', 'Plancha Neumática'], ['press_other', 'Otra plancha']],
  horno: [['horno_secado', 'Horno de secado'], ['horno_other', 'Otro horno']],
  pulpo: [['pulpo_manual', 'Pulpo manual'], ['pulpo_auto', 'Pulpo automático'], ['estacion', 'Estación de estampado'], ['pulpo_other', 'Otro']],
}

const TEC_LABELS: Record<string, string> = { subli: 'Subli', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo Textil', vinyl_adhesivo: 'Vinilo Autoadhesivo', serigrafia: 'Serigrafía' }
const TEC_COLORS: Record<string, string> = { subli: '#0F766E', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', vinyl_adhesivo: '#D63384', serigrafia: '#FDCB6E' }
const ALL_TECS = ['subli', 'dtf', 'dtf_uv', 'vinyl', 'vinyl_adhesivo', 'serigrafia']

// Insumos associated per equipment type
type InsumoSlot = { key: string; label: string; hint?: string }
const INSUMOS_POR_TIPO: Record<string, InsumoSlot[]> = {
  printer_subli: [{ key: 'assigned_paper_id', label: 'Papel asignado' }, { key: 'assigned_ink_id', label: 'Tinta asignada' }],
  printer_dtf: [{ key: 'assigned_paper_id', label: 'Film asignado' }, { key: 'assigned_ink_id', label: 'Tinta asignada' }],
  printer_uv: [{ key: 'assigned_paper_id', label: 'Film/Rollo asignado' }, { key: 'assigned_ink_id', label: 'Tinta asignada' }],
  plotter_impresion: [{ key: 'assigned_paper_id', label: 'Insumo principal', hint: 'El papel, film o material que usa este plotter para imprimir.' }, { key: 'assigned_ink_id', label: 'Tinta asignada' }],
  plotter_combo: [{ key: 'assigned_paper_id', label: 'Insumo principal', hint: 'El papel, film o material que usa este plotter.' }, { key: 'assigned_ink_id', label: 'Tinta asignada' }],
}
const TIPO_LABEL_MAP: Record<string, string> = { papel: 'Papel', tinta: 'Tinta', film: 'Film', polvo: 'Polvo', vinilo: 'Vinilo', tinta_serigrafica: 'Tinta serig.', servicio_impresion: 'Serv. terc.', emulsion: 'Emulsión', otro: 'Otro' }

const newEquip = (): Partial<Equipment> => ({ clasificacion: 'plancha', type: 'press_flat', cost: 0, lifespan_uses: 10000, tecnicas_slugs: [] })

export default function EquipamientoPage() {
  const supabase = createClient()
  const t = useTranslations('equipment')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency } = useLocale()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [insumosAll, setInsumosAll] = useState<InsumoRef[]>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<Partial<Equipment> | null>(null)
  const [filter, setFilter] = useState('')
  const [searchEquip, setSearchEquip] = useState('')
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null)
  const [inlineSupplier, setInlineSupplier] = useState<{ name: string } | null>(null)

  async function load() {
    const [{ data: eq }, { data: ins }, { data: ownerId }, { data: sups }] = await Promise.all([
      supabase.from('equipment').select('*').order('name'),
      supabase.from('insumos').select('*').order('nombre'),
      supabase.rpc('get_team_owner_id'),
      supabase.from('suppliers').select('id, name').order('name'),
    ])
    setEquipment((eq || []) as Equipment[])
    setInsumosAll((ins || []) as InsumoRef[])
    if (ownerId) setEffectiveUserId(ownerId as string)
    if (sups) setSuppliers(sups)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveEquip() {
    if (!modal?.name) return; setSaving(true)
    const payload = {
      name: modal.name, marca: modal.marca || null, type: modal.type || 'press_flat',
      clasificacion: modal.clasificacion || 'plancha', cost: modal.cost || 0,
      lifespan_uses: modal.lifespan_uses || 1000, tecnicas_slugs: modal.tecnicas_slugs || [],
      assigned_paper_id: modal.assigned_paper_id || null, assigned_ink_id: modal.assigned_ink_id || null,
      purchase_date: modal.purchase_date || null, supplier_id: modal.supplier_id || null,
      notes: modal.notes || null, print_time_sec: modal.print_time_sec || 0,
    }
    let userId = effectiveUserId
    if (!userId) { const { data: { user } } = await supabase.auth.getUser(); userId = user?.id || null }
    const { error } = modal.id
      ? await supabase.from('equipment').update(payload).eq('id', modal.id)
      : await supabase.from('equipment').insert({ ...payload, user_id: userId })
    if (error) { alert(`Error: ${error.message}`); setSaving(false); return }
    setModal(null); setInlineSupplier(null); setSaving(false); load()
  }

  async function delEquip(id: string) { if (confirm('¿Eliminar?')) { await supabase.from('equipment').delete().eq('id', id); load() } }

  const filtered = equipment.filter(e => {
    if (filter && e.clasificacion !== filter) return false
    if (searchEquip && !e.name.toLowerCase().includes(searchEquip.toLowerCase()) && !(e.marca || '').toLowerCase().includes(searchEquip.toLowerCase())) return false
    return true
  })
  const amort = (e: Equipment) => e.lifespan_uses > 0 ? Math.round(e.cost / e.lifespan_uses) : 0
  const modalAmort = modal && (modal.lifespan_uses || 0) > 0 ? Math.round((modal.cost || 0) / (modal.lifespan_uses || 1)) : 0
  const modalTypes = TYPES_BY_CLASIF[modal?.clasificacion || 'plancha'] || TYPES_BY_CLASIF.plancha

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>

  return (
    <div>
      {/* Desktop header */}
      <div className="hidden md:flex items-start justify-between gap-3 mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p></div>
        <button onClick={() => setModal(newEquip())}
          className="flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#0F766E' }}>
          <Plus size={14} /> Agregar
        </button>
      </div>
      {/* Desktop tabs + search */}
      <div className="hidden md:flex items-center justify-between mb-2">
        <div className="flex gap-1.5 flex-wrap">
          {CLASIF_TABS.map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filter === tab.id ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
              style={filter === tab.id ? { background: tab.color || '#374151' } : {}}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="hidden md:block relative mt-3 mb-4 max-w-[400px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input className="input-base text-sm w-full" style={{ paddingLeft: 40 }} placeholder="Buscar equipo..." value={searchEquip} onChange={e => setSearchEquip(e.target.value)} />
      </div>

      {/* Mobile: compact single row */}
      <div className="flex md:hidden items-center gap-2 mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="input-base text-sm min-w-[110px] max-w-[140px] flex-shrink-0">
          {CLASIF_TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input className="input-base text-sm w-full" style={{ paddingLeft: 40 }} placeholder="Buscar..." value={searchEquip} onChange={e => setSearchEquip(e.target.value)} />
        </div>
        <button onClick={() => setModal(newEquip())} className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: '#0F766E' }}><Plus size={18} /></button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.map(e => (
          <div key={e.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{e.name}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: CLASIF_COLORS[e.clasificacion] || '#636e72' }}>{CLASIF_LABELS[e.clasificacion]}</span>
                </div>
                {e.marca && <p className="text-xs text-gray-400">{e.marca}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setModal(e)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                <button onClick={() => delEquip(e.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(e.tecnicas_slugs || []).map(s => (
                <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${TEC_COLORS[s] || '#999'}15`, color: TEC_COLORS[s] || '#999' }}>{TEC_LABELS[s] || s}</span>
              ))}
            </div>
            <div className="mt-1.5 text-xs text-gray-400">
              {fmtCurrency(e.cost)} · <span className="font-semibold text-green-600">{fmtCurrency(amort(e))}/uso</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && equipment.length === 0 && <EmptyState icon="🖨" title="Cargá tus máquinas." description="Impresora, plancha, plotter — para calcular amortización." actionLabel="+ Agregar" onAction={() => setModal(newEquip())} />}
        {filtered.length === 0 && equipment.length > 0 && <div className="text-center py-8 text-gray-400 text-sm">No hay equipos que coincidan.</div>}
      </div>

      {/* Desktop table — 5 columns: Nombre (with badge), Técnicas, Valor, $/uso, actions */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead><tr className="border-b border-gray-100">
              {['Nombre', 'Técnicas', 'Valor', '$/uso', ''].map(h =>
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{e.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: CLASIF_COLORS[e.clasificacion] || '#636e72' }}>
                        {CLASIF_LABELS[e.clasificacion] || e.clasificacion}
                      </span>
                    </div>
                    {e.marca && <p className="text-xs text-gray-400 mt-0.5">{e.marca}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {(e.tecnicas_slugs || []).map(s => (
                        <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${TEC_COLORS[s] || '#999'}18`, color: TEC_COLORS[s] || '#999' }}>
                          {TEC_LABELS[s] || s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmtCurrency(e.cost)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-semibold">{fmtCurrency(amort(e))}/uso</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal(e)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={() => delEquip(e.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (equipment.length === 0
            ? <EmptyState icon="🖨" title="Cargá tus máquinas: impresora, plancha, plotter." description="Con el valor de compra y la vida útil, Estamply calcula automáticamente el costo de amortización por cada trabajo." actionLabel="+ Agregar" onAction={() => setModal(newEquip())} />
            : <div className="text-center py-12 text-gray-400">No hay equipos que coincidan.</div>)}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar equipo' : 'Nuevo equipo'}</h3>
              <button onClick={() => { setModal(null); setInlineSupplier(null) }} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">

              {/* ── DATOS BÁSICOS ── */}
              <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Datos básicos</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input className="input-base" value={modal.name || ''} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="Ej: Impresora Epson" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Marca / Modelo</label>
                  <input className="input-base" value={modal.marca || ''} onChange={e => setModal({ ...modal, marca: e.target.value })} placeholder="Ej: Epson L8050" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Clasificación *</label>
                  <select className="input-base" value={modal.clasificacion || 'plancha'} onChange={e => {
                    const cl = e.target.value
                    const firstType = (TYPES_BY_CLASIF[cl] || [])[0]?.[0] || ''
                    setModal({ ...modal, clasificacion: cl, type: firstType })
                  }}>
                    {Object.entries(CLASIF_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select className="input-base" value={modal.type || ''} onChange={e => setModal({ ...modal, type: e.target.value })}>
                    {modalTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>
              </div>

              {/* ── TÉCNICAS ── */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-3">Técnicas que lo usan</p>
                <div className="flex gap-2 flex-wrap">
                  {ALL_TECS.map(slug => {
                    const checked = (modal.tecnicas_slugs || []).includes(slug)
                    return (
                      <button key={slug} type="button" onClick={() => setModal({ ...modal, tecnicas_slugs: checked ? (modal.tecnicas_slugs || []).filter(s => s !== slug) : [...(modal.tecnicas_slugs || []), slug] })}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${checked ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
                        style={checked ? { background: TEC_COLORS[slug] } : {}}>
                        {checked ? '✓ ' : ''}{TEC_LABELS[slug]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── COSTO Y AMORTIZACIÓN ── */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-3">Costo y amortización</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Valor de compra ({(modal.moneda || 'local') === 'USD' ? 'USD' : '$'}) *</label>
                      <div className="inline-flex rounded-full p-0.5" style={{ background: '#F1F1F1' }}>
                        {[['local', 'Local'], ['USD', 'USD']].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setModal({ ...modal, moneda: v })}
                            className={`px-3 py-0.5 rounded-full text-[10px] font-semibold transition-all ${(modal.moneda || 'local') === v ? 'text-white shadow-sm' : 'text-gray-500'}`}
                            style={(modal.moneda || 'local') === v ? { background: '#0F766E' } : {}}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <NumericInput className="input-base" value={modal.cost || 0} onChange={v => setModal({ ...modal, cost: v })} />
                  </div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Vida útil (usos) *</label>
                    <NumericInput className="input-base" min={1} value={modal.lifespan_uses || 10000} onChange={v => setModal({ ...modal, lifespan_uses: v })} />
                    <p className="text-[10px] text-gray-400 mt-0.5">Ej: 10 usos/día × 300 días/año × 3 años = 9.000 usos</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra</label>
                    <input type="date" className="input-base" max={new Date().toISOString().split('T')[0]} value={modal.purchase_date || ''} onChange={e => setModal({ ...modal, purchase_date: e.target.value || null })} />
                  </div>
                  {(modal.clasificacion === 'impresora' || modal.clasificacion === 'plotter') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{modal.clasificacion === 'plotter' ? 'Tiempo por metro (seg)' : 'Tiempo por hoja (seg)'}</label>
                      <NumericInput className="input-base" value={modal.print_time_sec || 0} onChange={v => setModal({ ...modal, print_time_sec: v })} />
                      <p className="text-[10px] text-gray-400 mt-0.5">{modal.type === 'plotter_corte' ? 'Seg. por metro lineal de corte.' : modal.clasificacion === 'plotter' ? 'Seg. por metro lineal impreso.' : 'Seg. por hoja impresa.'}</p>
                    </div>
                  )}
                </div>
                {modalAmort > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-100 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <p className="text-sm font-bold text-green-700">{fmtCurrency(modalAmort)} por uso</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Se suma automáticamente al costo en el cotizador.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── INSUMOS ASOCIADOS (dynamic per type) ── */}
              {(() => {
                const slots = INSUMOS_POR_TIPO[modal.type || ''] || []
                if (slots.length === 0) return null
                const hasAnyUnassigned = slots.some(s => !(modal as Record<string, unknown>)[s.key])
                return (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-1">Insumos asociados</p>
                    <p className="text-[11px] text-gray-400 mb-3">Asigná los insumos que usa este equipo. El costo se calcula automáticamente.</p>
                    {hasAnyUnassigned && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 flex items-center gap-2 mb-3 text-xs text-amber-700">
                        <AlertTriangle size={14} className="flex-shrink-0" /> Faltan insumos asignados — el cotizador no podrá calcular el costo de producción.
                      </div>
                    )}
                    {(() => {
                      const assignable = insumosAll.filter(i => i.tipo !== 'otro')
                      return (<>
                        <div className="grid grid-cols-2 gap-3">
                          {slots.map(slot => (
                            <div key={slot.key}>
                              <label className="block text-sm font-medium text-gray-700 mb-1">{slot.label}</label>
                              <select className="input-base" value={(modal as Record<string, unknown>)[slot.key] as string || ''} onChange={e => setModal({ ...modal, [slot.key]: e.target.value || null })}>
                                <option value="">Sin asignar</option>
                                {assignable.map(i => (
                                  <option key={i.id} value={i.id}>{i.nombre} ({TIPO_LABEL_MAP[i.tipo] || i.tipo})</option>
                                ))}
                              </select>
                              {slot.hint && <p className="text-[10px] text-gray-400 mt-0.5">{slot.hint}</p>}
                            </div>
                          ))}
                        </div>
                        {assignable.length === 0 && (
                          <p className="text-xs text-gray-400 mt-2">💡 ¿No tenés insumos cargados? Crealos en <a href="/settings/insumos" target="_blank" rel="noopener" className="font-semibold text-teal-700 hover:underline">Insumos →</a></p>
                        )}
                      </>)
                    })()}
                  </div>
                )
              })()}

              {/* ── OTROS ── */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-3">Otros</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <select className="input-base" value={inlineSupplier ? '__new__' : (modal.supplier_id || '')} onChange={e => {
                    if (e.target.value === '__new__') { setInlineSupplier({ name: '' }); return }
                    setInlineSupplier(null)
                    setModal({ ...modal, supplier_id: e.target.value || null })
                  }}>
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    <option value="__new__">+ Nuevo proveedor</option>
                  </select>
                </div>
                {inlineSupplier && (
                  <div className="mt-2 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input className="input-base" placeholder="Ej: TextilNorte" value={inlineSupplier.name} onChange={e => setInlineSupplier({ ...inlineSupplier, name: e.target.value })} autoFocus /></div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={async () => {
                        if (!inlineSupplier.name.trim()) return
                        let userId = effectiveUserId
                        if (!userId) { const { data: { user } } = await supabase.auth.getUser(); userId = user?.id || null }
                        if (!userId) return
                        const { data } = await supabase.from('suppliers').insert({ name: inlineSupplier.name.trim(), user_id: userId }).select('id').single()
                        if (data) { setModal({ ...modal, supplier_id: data.id }); await load() }
                        setInlineSupplier(null)
                      }} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#0F766E' }}>Crear proveedor</button>
                      <button type="button" onClick={() => setInlineSupplier(null)} className="text-xs font-medium text-gray-400 hover:text-gray-600">Cancelar</button>
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea className="input-base text-sm" rows={3} value={modal.notes || ''} onChange={e => setModal({ ...modal, notes: e.target.value })} placeholder="Garantía, detalles de uso, mantenimiento, etc." />
                </div>
              </div>

            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModal(null); setInlineSupplier(null) }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
              <button onClick={saveEquip} disabled={saving || !modal.name?.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>{saving ? tc('saving') : tc('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
