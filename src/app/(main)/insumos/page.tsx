// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type { Insumo, InsumoTipo, InsumoConfig } from '@/features/taller/types'

const TIPO_LABELS: Record<InsumoTipo, string> = {
  papel: 'Papel', tinta: 'Tinta', film: 'Film', polvo: 'Polvo', vinilo: 'Vinilo',
  tinta_serigrafica: 'Tinta serigráfica', servicio_impresion: 'Servicio tercerizado', emulsion: 'Emulsión', otro: 'Otro',
}
const TIPO_COLORS: Record<InsumoTipo, string> = {
  papel: '#6C5CE7', tinta: '#00B894', film: '#E17055', polvo: '#FDCB6E', vinilo: '#E84393',
  tinta_serigrafica: '#e67e22', servicio_impresion: '#3498db', emulsion: '#9b59b6', otro: '#636e72',
}
const TECNICA_FILTER_TABS = [
  { id: '', label: 'Todos' },
  { id: 'subli', label: 'Sublimación', color: '#6C5CE7' },
  { id: 'dtf', label: 'DTF', color: '#E17055' },
  { id: 'vinyl', label: 'Vinilo', color: '#E84393' },
  { id: 'serigrafia', label: 'Serigrafía', color: '#FDCB6E' },
]
const TECNICA_OPTS = [['compartido', 'Compartido'], ['subli', 'Sublimación'], ['dtf', 'DTF Textil'], ['dtf_uv', 'DTF UV'], ['vinyl', 'Vinilo Textil'], ['vinyl_adhesivo', 'Vinilo Autoadhesivo'], ['serigrafia', 'Serigrafía']]

// Pre-suggested técnica for each tipo
const TIPO_TECNICA_DEFAULT: Partial<Record<InsumoTipo, string>> = {
  papel: 'subli', tinta: 'subli', film: 'dtf', polvo: 'dtf', vinilo: 'vinyl',
  tinta_serigrafica: 'serigrafia', emulsion: 'serigrafia', servicio_impresion: 'compartido',
}

function emptyConfig(tipo: InsumoTipo): InsumoConfig {
  switch (tipo) {
    case 'papel': return { tipo: 'papel', formato: 'hojas', precio_resma: 0, hojas_resma: 100, ancho: 21, alto: 29.7, precio_rollo: 0, rollo_ancho: 61, rollo_largo: 100 }
    case 'tinta': return { tipo: 'tinta', precio: 0, rendimiento: 4000, unidad_rendimiento: 'hojas' }
    case 'film': return { tipo: 'film', precio_rollo: 0, ancho: 60, largo: 100 }
    case 'polvo': return { tipo: 'polvo', precio_kg: 0, rendimiento_m2: 50 }
    case 'vinilo': return { tipo: 'vinilo', aplicacion: 'textil', acabado: 'Liso', precio_metro: 0, ancho: 50, colores: ['Blanco', 'Negro'] }
    case 'tinta_serigrafica': return { tipo: 'tinta_serigrafica', precio_kg: 0, rendimiento_estampadas_kg: 100, color: '' }
    case 'servicio_impresion': return { tipo: 'servicio_impresion', precio_metro: 0, ancho_material: 60, proveedor: '' }
    case 'emulsion': return { tipo: 'emulsion', precio_kg: 0, rendimiento_pantallas_kg: 20 }
    case 'otro': return { tipo: 'otro', precio: 0, unidad: 'metro', rendimiento: 1, unidad_rendimiento: 'm²' }
  }
}

export default function InsumosPage() {
  const supabase = createClient()
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Insumo> | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterTecnica, setFilterTecnica] = useState<string>('')

  async function load() {
    const { data } = await supabase.from('insumos').select('*').order('nombre')
    setInsumos((data || []) as Insumo[]); setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveInsumo() {
    if (!modal?.nombre) return; setSaving(true)
    const payload = { nombre: modal.nombre, tipo: modal.tipo || 'otro', tecnica_asociada: modal.tecnica_asociada || 'compartido', config: modal.config || emptyConfig('otro') }
    const tecAsociada = payload.tecnica_asociada

    if (modal.id) {
      // Editing — find old técnica to desvincular if changed
      const oldInsumo = insumos.find(i => i.id === modal.id)
      const oldTec = oldInsumo?.tecnica_asociada
      await supabase.from('insumos').update(payload).eq('id', modal.id)

      // If técnica changed, desvincular from old and vincular to new
      if (oldTec && oldTec !== tecAsociada && oldTec !== 'compartido') {
        const { data: oldTecRow } = await supabase.from('tecnicas').select('id, insumo_ids').eq('slug', oldTec).single()
        if (oldTecRow) {
          await supabase.from('tecnicas').update({ insumo_ids: (oldTecRow.insumo_ids || []).filter((id: string) => id !== modal.id) }).eq('id', oldTecRow.id)
        }
      }
      if (tecAsociada !== 'compartido') {
        const { data: newTecRow } = await supabase.from('tecnicas').select('id, insumo_ids').eq('slug', tecAsociada).single()
        if (newTecRow && !(newTecRow.insumo_ids || []).includes(modal.id)) {
          await supabase.from('tecnicas').update({ insumo_ids: [...(newTecRow.insumo_ids || []), modal.id] }).eq('id', newTecRow.id)
        }
      }
    } else {
      // Creating — insert then auto-vincular
      const { data: inserted } = await supabase.from('insumos').insert(payload).select('id').single()
      if (inserted && tecAsociada !== 'compartido') {
        const { data: tecRow } = await supabase.from('tecnicas').select('id, insumo_ids').eq('slug', tecAsociada).single()
        if (tecRow) {
          await supabase.from('tecnicas').update({ insumo_ids: [...(tecRow.insumo_ids || []), inserted.id] }).eq('id', tecRow.id)
        }
      }
    }
    setModal(null); setSaving(false); load()
  }

  async function deleteInsumo(id: string) {
    if (!confirm('¿Eliminar?')) return
    // Desvincular from all techniques
    const { data: allTecs } = await supabase.from('tecnicas').select('id, insumo_ids')
    if (allTecs) {
      for (const tec of allTecs) {
        if ((tec.insumo_ids || []).includes(id)) {
          await supabase.from('tecnicas').update({ insumo_ids: (tec.insumo_ids || []).filter((iid: string) => iid !== id) }).eq('id', tec.id)
        }
      }
    }
    await supabase.from('insumos').delete().eq('id', id)
    load()
  }

  function openNew(tipo: InsumoTipo = 'otro') {
    setModal({ nombre: '', tipo, tecnica_asociada: TIPO_TECNICA_DEFAULT[tipo] || 'compartido', config: emptyConfig(tipo) })
  }

  function changeTipo(tipo: InsumoTipo) {
    setModal(prev => prev ? { ...prev, tipo, tecnica_asociada: TIPO_TECNICA_DEFAULT[tipo] || prev.tecnica_asociada || 'compartido', config: emptyConfig(tipo) } : null)
  }

  function up(patch: Record<string, unknown>) {
    if (!modal) return
    setModal({ ...modal, config: { ...(modal.config as Record<string, unknown>), ...patch } as InsumoConfig })
  }

  // Filter by technique
  const filtered = filterTecnica
    ? insumos.filter(i => i.tecnica_asociada === filterTecnica || (filterTecnica === 'dtf' && (i.tecnica_asociada === 'dtf' || i.tecnica_asociada === 'dtf_uv')) || i.tecnica_asociada === 'compartido')
    : insumos

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Insumos</h1>
          <p className="text-gray-500 text-sm mt-1">Materiales consumibles del taller</p></div>
        <button onClick={() => openNew()} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}>
          <Plus size={14} /> Agregar insumo
        </button>
      </div>

      {/* Filter by technique */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TECNICA_FILTER_TABS.map(tab => (
          <button key={tab.id} onClick={() => setFilterTecnica(tab.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${filterTecnica === tab.id ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
            style={filterTecnica === tab.id ? { background: tab.color || '#374151' } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-gray-100">
          {['Nombre', 'Tipo', 'Técnica', 'Datos clave', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
        </tr></thead><tbody>
          {filtered.map(ins => {
            const c = ins.config as Record<string, unknown>
            const tipo = ins.tipo as InsumoTipo
            let keyData = ''
            if (tipo === 'papel') keyData = c.formato === 'hojas' ? `$${(c.precio_resma as number || 0).toLocaleString('es-AR')} / ${c.hojas_resma} hojas` : `$${(c.precio_rollo as number || 0).toLocaleString('es-AR')} / ${c.rollo_ancho}cm × ${c.rollo_largo}m`
            else if (tipo === 'tinta') keyData = `$${(c.precio as number || 0).toLocaleString('es-AR')} — ${c.rendimiento} ${c.unidad_rendimiento}`
            else if (tipo === 'film') keyData = `$${(c.precio_rollo as number || 0).toLocaleString('es-AR')} / ${c.ancho}cm × ${c.largo}m`
            else if (tipo === 'polvo') keyData = `$${(c.precio_kg as number || 0).toLocaleString('es-AR')}/kg — ${c.rendimiento_m2} m²/kg`
            else if (tipo === 'vinilo') keyData = `$${(c.precio_metro as number || 0).toLocaleString('es-AR')}/m — ${c.ancho}cm`
            else if (tipo === 'tinta_serigrafica') keyData = `$${(c.precio_kg as number || 0).toLocaleString('es-AR')}/kg — ${c.rendimiento_estampadas_kg} est/kg${c.color ? ` — ${c.color}` : ''}`
            else if (tipo === 'servicio_impresion') keyData = (c.precio_por_color as number) ? `$${(c.precio_por_color as number).toLocaleString('es-AR')}/color/u.${c.proveedor ? ` — ${c.proveedor}` : ''}` : `$${(c.precio_metro as number || 0).toLocaleString('es-AR')}/m — ${c.ancho_material}cm${c.proveedor ? ` — ${c.proveedor}` : ''}`
            else if (tipo === 'emulsion') keyData = `$${(c.precio_kg as number || 0).toLocaleString('es-AR')}/kg — ${c.rendimiento_pantallas_kg} pantallas/kg`
            else keyData = `$${(c.precio as number || 0).toLocaleString('es-AR')} / ${c.unidad}`
            return (
              <tr key={ins.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{ins.nombre}</td>
                <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{ background: TIPO_COLORS[tipo] || '#636e72' }}>{TIPO_LABELS[tipo] || tipo}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500">{TECNICA_OPTS.find(o => o[0] === ins.tecnica_asociada)?.[1] || ins.tecnica_asociada}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{keyData}</td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => setModal(ins)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                  <button onClick={() => deleteInsumo(ins.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                </div></td>
              </tr>
            )
          })}
        </tbody></table>
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No hay insumos{filterTecnica ? ' para esta técnica' : ''}. Agregá el primero.</div>}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">{modal.id ? 'Editar' : 'Nuevo'} Insumo</h3>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input className="input-base" value={modal.nombre || ''} onChange={e => setModal({ ...modal, nombre: e.target.value })} placeholder="Ej: Papel sublimación A4" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select className="input-base" value={modal.tipo || 'otro'} onChange={e => changeTipo(e.target.value as InsumoTipo)}>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Técnica asociada</label>
                  <select className="input-base" value={modal.tecnica_asociada || 'compartido'} onChange={e => setModal({ ...modal, tecnica_asociada: e.target.value })}>
                    {TECNICA_OPTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
              </div>

              {/* ── Type-specific fields ── */}
              <div className="pt-2 border-t border-gray-100 space-y-3">

              {modal.tipo === 'papel' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                return (<>
                  <div className="flex gap-2">
                    {(['hojas', 'rollo'] as const).map(f => (
                      <button key={f} type="button" onClick={() => up({ formato: f })}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${c.formato === f ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>{f === 'hojas' ? 'Hojas' : 'Rollo'}</button>))}
                  </div>
                  {c.formato === 'hojas' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">Precio resma ($)</label><input type="number" className="input-base" value={c.precio_resma as number || 0} onChange={e => up({ precio_resma: Number(e.target.value) })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Hojas/resma</label><input type="number" className="input-base" value={c.hojas_resma as number || 100} onChange={e => up({ hojas_resma: Number(e.target.value) })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><input type="number" className="input-base" value={c.ancho as number || 21} onChange={e => up({ ancho: Number(e.target.value) })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Alto (cm)</label><input type="number" className="input-base" value={c.alto as number || 29.7} onChange={e => up({ alto: Number(e.target.value) })} /></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">Precio rollo ($)</label><input type="number" className="input-base" value={c.precio_rollo as number || 0} onChange={e => up({ precio_rollo: Number(e.target.value) })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><input type="number" className="input-base" value={c.rollo_ancho as number || 61} onChange={e => up({ rollo_ancho: Number(e.target.value) })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Largo (m)</label><input type="number" className="input-base" value={c.rollo_largo as number || 100} onChange={e => up({ rollo_largo: Number(e.target.value) })} /></div>
                    </div>
                  )}
                </>)
              })()}

              {modal.tipo === 'tinta' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                return (<div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Precio ($)</label><input type="number" className="input-base" value={c.precio as number || 0} onChange={e => up({ precio: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Rendimiento</label><input type="number" className="input-base" value={c.rendimiento as number || 0} onChange={e => up({ rendimiento: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Unidad</label><select className="input-base" value={c.unidad_rendimiento as string || 'hojas'} onChange={e => up({ unidad_rendimiento: e.target.value })}><option value="hojas">Hojas</option><option value="m2">m²</option></select></div>
                </div>)
              })()}

              {modal.tipo === 'film' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                return (<div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Precio rollo ($)</label><input type="number" className="input-base" value={c.precio_rollo as number || 0} onChange={e => up({ precio_rollo: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><input type="number" className="input-base" value={c.ancho as number || 60} onChange={e => up({ ancho: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Largo (m)</label><input type="number" className="input-base" value={c.largo as number || 100} onChange={e => up({ largo: Number(e.target.value) })} /></div>
                </div>)
              })()}

              {modal.tipo === 'polvo' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                return (<div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Precio/kg ($)</label><input type="number" className="input-base" value={c.precio_kg as number || 0} onChange={e => up({ precio_kg: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Rendimiento (m²/kg)</label><input type="number" className="input-base" value={c.rendimiento_m2 as number || 50} onChange={e => up({ rendimiento_m2: Number(e.target.value) })} /></div>
                </div>)
              })()}

              {modal.tipo === 'vinilo' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                const colores = (c.colores as string[]) || []
                return (<>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">Aplicación</label><select className="input-base" value={c.aplicacion as string || 'textil'} onChange={e => up({ aplicacion: e.target.value })}><option value="textil">Textil</option><option value="rigido">Rígido</option></select></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Acabado</label><select className="input-base" value={c.acabado as string || 'Liso'} onChange={e => up({ acabado: e.target.value })}>{['Liso', 'Flock', 'Glitter', 'Holográfico', 'Reflectivo', 'Otro'].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">$/metro</label><input type="number" className="input-base" value={c.precio_metro as number || 0} onChange={e => up({ precio_metro: Number(e.target.value) })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Ancho (cm)</label><input type="number" className="input-base" value={c.ancho as number || 50} onChange={e => up({ ancho: Number(e.target.value) })} /></div>
                  </div>
                  <div><label className="block text-xs text-gray-500 mb-1">Colores</label>
                    <div className="flex flex-wrap gap-1.5">
                      {colores.map((col: string, ci: number) => (
                        <div key={ci} className="flex items-center gap-0.5 bg-gray-50 rounded px-2 py-0.5 border border-gray-100">
                          <input type="text" className="bg-transparent outline-none text-xs w-16" value={col} onChange={e => { const a = [...colores]; a[ci] = e.target.value; up({ colores: a }) }} />
                          <button onClick={() => up({ colores: colores.filter((_: string, j: number) => j !== ci) })} className="text-gray-300 hover:text-red-400"><X size={10} /></button>
                        </div>
                      ))}
                      <button onClick={() => up({ colores: [...colores, ''] })} className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold"><Plus size={10} /></button>
                    </div>
                  </div>
                </>)
              })()}

              {modal.tipo === 'tinta_serigrafica' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                return (<div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Precio/kg ($)</label><input type="number" className="input-base" value={c.precio_kg as number || 0} onChange={e => up({ precio_kg: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Rendimiento (est/kg)</label><input type="number" className="input-base" value={c.rendimiento_estampadas_kg as number || 100} onChange={e => up({ rendimiento_estampadas_kg: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Color (opcional)</label><input className="input-base" value={c.color as string || ''} onChange={e => up({ color: e.target.value })} placeholder="Ej: Blanco, Negro..." /></div>
                </div>)
              })()}

              {modal.tipo === 'servicio_impresion' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                const isSeri = modal.tecnica_asociada === 'serigrafia'
                return (<div className="space-y-3">
                  {isSeri ? (
                    <div><label className="block text-xs text-gray-500 mb-1">Precio por color/unidad ($)</label><input type="number" className="input-base" value={(c.precio_por_color as number) || (c.precio_metro as number) || 0} onChange={e => up({ precio_por_color: Number(e.target.value) })} />
                      <p className="text-[10px] text-gray-400 mt-0.5">Cuánto cobra el tercero por cada color en cada prenda.</p></div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-gray-500 mb-1">Precio/metro lineal ($)</label><input type="number" className="input-base" value={c.precio_metro as number || 0} onChange={e => up({ precio_metro: Number(e.target.value) })} /></div>
                      <div><label className="block text-xs text-gray-500 mb-1">Ancho material (cm)</label><input type="number" className="input-base" value={c.ancho_material as number || 60} onChange={e => up({ ancho_material: Number(e.target.value) })} /></div>
                    </div>
                  )}
                  <div><label className="block text-xs text-gray-500 mb-1">Proveedor (opcional)</label><input className="input-base" value={c.proveedor as string || ''} onChange={e => up({ proveedor: e.target.value })} placeholder="Nombre del proveedor" /></div>
                </div>)
              })()}

              {modal.tipo === 'emulsion' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                return (<div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Precio/kg ($)</label><input type="number" className="input-base" value={c.precio_kg as number || 0} onChange={e => up({ precio_kg: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Rendimiento (pantallas/kg)</label><input type="number" className="input-base" value={c.rendimiento_pantallas_kg as number || 20} onChange={e => up({ rendimiento_pantallas_kg: Number(e.target.value) })} /></div>
                </div>)
              })()}

              {modal.tipo === 'otro' && (() => {
                const c = (modal.config || {}) as Record<string, unknown>
                return (<div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Precio ($)</label><input type="number" className="input-base" value={c.precio as number || 0} onChange={e => up({ precio: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Unidad</label><input className="input-base" value={c.unidad as string || ''} onChange={e => up({ unidad: e.target.value })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Rendimiento</label><input type="number" className="input-base" value={c.rendimiento as number || 0} onChange={e => up({ rendimiento: Number(e.target.value) })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Unidad rend.</label><input className="input-base" value={c.unidad_rendimiento as string || ''} onChange={e => up({ unidad_rendimiento: e.target.value })} /></div>
                </div>)
              })()}

              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button onClick={saveInsumo} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
