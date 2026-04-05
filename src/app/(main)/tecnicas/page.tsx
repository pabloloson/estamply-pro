'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Zap, Plus, Trash2, Info, ChevronDown, ChevronUp, Link2 } from 'lucide-react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier } from '@/features/presupuesto/types'
import { TECHNIQUE_DEFAULTS, TECNICA_LABELS, ALL_TECNICA_SLUGS, type Tecnica, type TecnicaConfig, type TecnicaSlug, type Insumo, type DTFConfig, type DTFUVConfig, type SerigrafiaConfig } from '@/features/taller/types'
import { computeCost } from '@/features/taller/services/cost-engine'

import type { InsumoTipo } from '@/features/taller/types'

interface Equipment { id: string; name: string; type: string; clasificacion: string; cost: number; lifespan_uses: number; tecnicas_slugs: string[] }
function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

const TIPO_BADGE: Record<string, { label: string; color: string }> = {
  papel: { label: 'Papel', color: '#6C5CE7' }, tinta: { label: 'Tinta', color: '#00B894' },
  film: { label: 'Film', color: '#E17055' }, polvo: { label: 'Polvo', color: '#FDCB6E' },
  vinilo: { label: 'Vinilo', color: '#E84393' }, tinta_serigrafica: { label: 'Tinta serigráfica', color: '#e67e22' },
  servicio_impresion: { label: 'Serv. impresión', color: '#3498db' }, emulsion: { label: 'Emulsión', color: '#9b59b6' },
  otro: { label: 'Otro', color: '#636e72' },
}

function insumoDetail(ins: Insumo): string {
  const c = ins.config as Record<string, unknown>
  switch (ins.tipo) {
    case 'papel': return c.formato === 'hojas' ? `$${(c.precio_resma as number || 0).toLocaleString('es-AR')} · ${c.hojas_resma} hojas · ${c.ancho}×${c.alto} cm` : `$${(c.precio_rollo as number || 0).toLocaleString('es-AR')} · ${c.rollo_ancho}cm × ${c.rollo_largo}m`
    case 'tinta': return `$${(c.precio as number || 0).toLocaleString('es-AR')} · ${c.rendimiento} ${c.unidad_rendimiento}`
    case 'film': return `$${(c.precio_rollo as number || 0).toLocaleString('es-AR')} · ${c.ancho}cm × ${c.largo}m`
    case 'polvo': return `$${(c.precio_kg as number || 0).toLocaleString('es-AR')}/kg · ${c.rendimiento_m2} m²/kg`
    case 'vinilo': return `$${(c.precio_metro as number || 0).toLocaleString('es-AR')}/m · ${c.ancho}cm`
    case 'tinta_serigrafica': return `$${(c.precio_kg as number || 0).toLocaleString('es-AR')}/kg · ${c.rendimiento_estampadas_kg} est/kg · ${c.color || '?'}`
    case 'servicio_impresion': return `$${(c.precio_metro as number || 0).toLocaleString('es-AR')}/m · ${c.ancho_material}cm${c.proveedor ? ` · ${c.proveedor}` : ''}`
    case 'emulsion': return `$${(c.precio_kg as number || 0).toLocaleString('es-AR')}/kg · ${c.rendimiento_pantallas_kg} pantallas/kg`
    default: return `$${(c.precio as number || 0).toLocaleString('es-AR')}`
  }
}

// Discount table inline
function DiscountTable({ tiers, onChange }: { tiers: DiscountTier[]; onChange: (t: DiscountTier[]) => void }) {
  const up = (i: number, f: keyof DiscountTier, v: number) => onChange(tiers.map((t, j) => j === i ? { ...t, [f]: v } : t))
  return (<div>
    <table className="w-full"><thead><tr className="border-b border-gray-100">
      {['Desde', 'Hasta', 'Desc(%)', ''].map(h => <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase px-2 py-1">{h}</th>)}
    </tr></thead><tbody>
      {tiers.map((t, i) => (<tr key={i} className="border-b border-gray-50">
        <td className="px-2 py-1"><input type="number" value={t.desde} onChange={e => up(i, 'desde', parseInt(e.target.value) || 0)} className="w-14 input-base text-xs py-0.5" /></td>
        <td className="px-2 py-1"><input type="number" value={t.hasta} onChange={e => up(i, 'hasta', parseInt(e.target.value) || 0)} className="w-14 input-base text-xs py-0.5" /></td>
        <td className="px-2 py-1"><input type="number" min={0} max={100} value={Math.round(t.porcentaje * 100)} onChange={e => up(i, 'porcentaje', (parseFloat(e.target.value) || 0) / 100)} className="w-14 input-base text-xs py-0.5" /></td>
        <td className="px-2 py-1"><button onClick={() => onChange(tiers.filter((_, j) => j !== i))} className="p-0.5 rounded hover:bg-red-50"><Trash2 size={10} className="text-red-400" /></button></td>
      </tr>))}
    </tbody></table>
    <button onClick={() => onChange([...tiers, { desde: 0, hasta: 9999, porcentaje: 0 }])} className="text-[10px] px-2 py-0.5 mt-1 rounded font-semibold text-purple-600 hover:bg-purple-50"><Plus size={9} /> Fila</button>
  </div>)
}

export default function TecnicasPage() {
  const supabase = createClient()
  const [tecnicas, setTecnicas] = useState<Tecnica[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('')
  const [simW, setSimW] = useState(10)
  const [simH, setSimH] = useState(10)
  const [showSim, setShowSim] = useState(false)

  async function load() {
    const [{ data: t }, { data: e }, { data: ins }, { data: wsData }, { data: p }] = await Promise.all([
      supabase.from('tecnicas').select('*'),
      supabase.from('equipment').select('*').order('name'),
      supabase.from('insumos').select('*').order('nombre'),
      supabase.from('workshop_settings').select('settings').single(),
      supabase.from('products').select('*').order('name'),
    ])
    let tecs = (t || []) as Tecnica[]
    if (tecs.length === 0) {
      for (const slug of ALL_TECNICA_SLUGS) {
        const def = TECHNIQUE_DEFAULTS[slug]
        await supabase.from('tecnicas').insert({ slug, nombre: def.nombre, color: def.color, config: def.config, equipment_ids: [], insumo_ids: [], activa: def.activa })
      }
      const { data: seeded } = await supabase.from('tecnicas').select('*')
      tecs = (seeded || []) as Tecnica[]
    }
    if (tecs.length === 0) {
      tecs = ALL_TECNICA_SLUGS.map(slug => ({ id: `local-${slug}`, user_id: '', slug, created_at: '', ...TECHNIQUE_DEFAULTS[slug], equipment_ids: [], insumo_ids: [] }))
    }
    setTecnicas(tecs); setEquipment((e || []) as Equipment[]); setInsumos((ins || []) as Insumo[])
    if (wsData?.settings) setWs({ ...DEFAULT_SETTINGS, ...(wsData.settings as Partial<WorkshopSettings>) })
    setProducts(p || [])
    if (!activeTab && tecs.length) setActiveTab(tecs.find(t2 => t2.activa)?.id || tecs[0].id)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveTecnica(tec: Tecnica) {
    if (tec.id.startsWith('local-')) return; setSaving(tec.id)
    await supabase.from('tecnicas').update({ config: tec.config, equipment_ids: tec.equipment_ids, insumo_ids: tec.insumo_ids, activa: tec.activa }).eq('id', tec.id)
    setSaving(null); alert('Técnica guardada ✓')
  }

  function updateConfig(tecId: string, patch: Partial<TecnicaConfig>) {
    setTecnicas(prev => prev.map(t => t.id === tecId ? { ...t, config: { ...t.config, ...patch } as TecnicaConfig } : t))
  }
  function setEquipIds(tecId: string, ids: string[]) { setTecnicas(prev => prev.map(t => t.id === tecId ? { ...t, equipment_ids: ids } : t)) }
  function toggleInsumo(tecId: string, insumoId: string) {
    setTecnicas(prev => prev.map(t => {
      if (t.id !== tecId) return t
      const ids = t.insumo_ids.includes(insumoId) ? t.insumo_ids.filter(id => id !== insumoId) : [...t.insumo_ids, insumoId]
      return { ...t, insumo_ids: ids }
    }))
  }
  function toggleActiva(tecId: string) {
    setTecnicas(prev => prev.map(t => t.id === tecId ? { ...t, activa: !t.activa } : t))
  }

  const globalDiscountEnabled = ws.descuento_global_enabled ?? false

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  const activeTec = tecnicas.find(t => t.id === activeTab)

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">Técnicas de Estampado</h1>
        <p className="text-gray-500 text-sm mt-1">Configurá insumos, equipos, reglas y descuentos por técnica</p></div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {[...tecnicas].sort((a, b) => ALL_TECNICA_SLUGS.indexOf(a.slug) - ALL_TECNICA_SLUGS.indexOf(b.slug)).map(tec => (
          <button key={tec.id} onClick={() => setActiveTab(tec.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tec.id === activeTab ? 'text-white shadow-md' : tec.activa ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-300 italic'}`}
            style={tec.id === activeTab ? { background: tec.color } : {}}>
            {tec.nombre}
            {!tec.activa && <span className="ml-1 text-[9px]">(off)</span>}
          </button>
        ))}
      </div>

      {/* Active technique content */}
      {activeTec && (() => {
        const tec = activeTec
        const cfg = tec.config
        const color = tec.color
        const linkedInsumos = insumos.filter(ins => tec.insumo_ids.includes(ins.id))
        const availableInsumos = insumos.filter(ins => !tec.insumo_ids.includes(ins.id))
        const impresoras = equipment.filter(e => e.clasificacion === 'impresora')
        const plotters = equipment.filter(e => e.clasificacion === 'plotter')

        // Simulator
        const simProduct = products[0] || { base_cost: 0, time_subli: 0, time_dtf: 0, time_vinyl: 0, time_dtf_uv: 0, time_serigrafia: 0 }
        const simResult = computeCost({
          config: cfg, product: simProduct, equipment, techniqueEquipmentIds: tec.equipment_ids, insumos: linkedInsumos,
          quantity: 1, designWidth: simW, designHeight: simH, numColors: 1, margin: 50, mo: 0, otrosGastos: 0,
          setupMin: 0, discountTiers: [],
        })

        return (
          <div className="card overflow-hidden">
            <div className="h-1.5" style={{ background: color }} />
            <div className="p-5 space-y-6">
              {/* Header + active toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: color }}>{tec.nombre[0]}</div>
                  <h2 className="font-bold text-gray-900 text-lg">{tec.nombre}</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-400">{tec.activa ? 'Activa' : 'Inactiva'}</span>
                  <button type="button" onClick={() => toggleActiva(tec.id)}
                    className="relative w-10 h-5 rounded-full transition-colors" style={{ background: tec.activa ? color : '#D1D5DB' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: tec.activa ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </label>
              </div>

              {/* Section 1: Insumos vinculados */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">1 &middot; Insumos vinculados</p>
                {linkedInsumos.length > 0 ? (
                  <div className="rounded-lg border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {linkedInsumos.map(ins => {
                      const badge = TIPO_BADGE[ins.tipo] || TIPO_BADGE.otro
                      return (
                        <div key={ins.id} className="flex items-start justify-between p-3 bg-gray-50 hover:bg-gray-100/50 transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white flex-shrink-0" style={{ background: badge.color }}>{badge.label}</span>
                              <span className="text-sm font-medium text-gray-800 truncate">{ins.nombre}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 pl-0.5">{insumoDetail(ins)}</p>
                          </div>
                          <button onClick={() => toggleInsumo(tec.id, ins.id)} className="p-1 rounded hover:bg-red-50 flex-shrink-0 ml-2" title="Desvincular">
                            <Trash2 size={12} className="text-red-400" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="text-sm text-gray-400">No hay insumos vinculados. Agregá desde el botón o creá insumos con esta técnica asociada.</p>}
                {availableInsumos.length > 0 && (
                  <select className="input-base text-sm" value="" onChange={e => { if (e.target.value) toggleInsumo(tec.id, e.target.value); e.target.value = '' }}>
                    <option value="">+ Vincular insumo...</option>
                    {availableInsumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nombre} ({TIPO_BADGE[ins.tipo]?.label || ins.tipo})</option>)}
                  </select>
                )}

                {/* DTF mode selector */}
                {(cfg.tipo === 'dtf' || cfg.tipo === 'dtf_uv') && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">Modo de producción</label>
                    <div className="flex gap-2">
                      {(['tercerizado', 'propia'] as const).map(m => (
                        <button key={m} type="button" onClick={() => updateConfig(tec.id, { modo: m })}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${(cfg as DTFConfig).modo === m ? 'text-white' : 'bg-gray-100 text-gray-500'}`}
                          style={(cfg as DTFConfig).modo === m ? { background: color } : {}}>
                          {m === 'tercerizado' ? 'Tercerizado' : 'Producción propia'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Equipamiento */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">2 &middot; Equipamiento vinculado</p>
                {cfg.tipo === 'vinyl' ? (
                  <div><label className="block text-xs text-gray-500 mb-1">Plotter de corte</label>
                    <select className="input-base text-sm" value={tec.equipment_ids[0] || ''} onChange={e => setEquipIds(tec.id, e.target.value ? [e.target.value] : [])}>
                      <option value="">Sin plotter</option>
                      {plotters.map(eq => <option key={eq.id} value={eq.id}>{eq.name} (${Math.round(eq.cost / eq.lifespan_uses)}/uso)</option>)}
                    </select></div>
                ) : cfg.tipo === 'serigrafia' ? (
                  <div><label className="block text-xs text-gray-500 mb-1">Pulpo / Estación</label>
                    <select className="input-base text-sm" value={tec.equipment_ids[0] || ''} onChange={e => setEquipIds(tec.id, e.target.value ? [e.target.value] : [])}>
                      <option value="">Sin equipo</option>
                      {equipment.filter(eq => (eq.tecnicas_slugs || []).includes('serigrafia')).map(eq => <option key={eq.id} value={eq.id}>{eq.name} (${Math.round(eq.cost / eq.lifespan_uses)}/uso)</option>)}
                    </select></div>
                ) : (
                  <div><label className="block text-xs text-gray-500 mb-1">Impresora</label>
                    <select className="input-base text-sm" value={tec.equipment_ids[0] || ''} onChange={e => setEquipIds(tec.id, e.target.value ? [e.target.value] : [])}>
                      <option value="">Sin impresora</option>
                      {impresoras.filter(eq => (eq.tecnicas_slugs || []).includes(tec.slug)).map(eq => <option key={eq.id} value={eq.id}>{eq.name} (${Math.round(eq.cost / eq.lifespan_uses)}/uso)</option>)}
                    </select></div>
                )}
                <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                  <Info size={11} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-blue-600">Las planchas se asignan automáticamente según el producto seleccionado en el cotizador.</p>
                </div>
              </div>

              {/* Section 3: Reglas de producción */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">3 &middot; Reglas de producción</p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 max-w-lg">
                  {(cfg.tipo === 'subli' || cfg.tipo === 'dtf' || cfg.tipo === 'dtf_uv') && (
                    <div><label className="block text-xs text-gray-500 mb-1">Margen seguridad (cm)</label>
                      <input type="number" className="input-base text-sm" min={0} step={0.5} value={(cfg as { margen_seguridad?: number }).margen_seguridad ?? 1}
                        onChange={e => updateConfig(tec.id, { margen_seguridad: parseFloat(e.target.value) || 0 })} /></div>
                  )}
                  <div><label className="block text-xs text-gray-500 mb-1">{cfg.tipo === 'vinyl' ? 'Desperdicio pelado (%)' : 'Desperdicio / Merma (%)'}</label>
                    <input type="number" className="input-base text-sm" min={0} max={100}
                      value={cfg.tipo === 'vinyl' ? (cfg.desperdicio_pelado_pct ?? 15) : (cfg.tipo === 'serigrafia' ? (cfg.desperdicio_pct ?? 5) : ((cfg as { desperdicio_pct?: number }).desperdicio_pct ?? 5))}
                      onChange={e => updateConfig(tec.id, cfg.tipo === 'vinyl' ? { desperdicio_pelado_pct: parseFloat(e.target.value) || 0 } : { desperdicio_pct: parseFloat(e.target.value) || 0 })} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Pedido mínimo</label>
                    <input type="number" className="input-base text-sm" min={1} value={(cfg as { pedido_minimo?: number }).pedido_minimo ?? 1}
                      onChange={e => updateConfig(tec.id, { pedido_minimo: parseInt(e.target.value) || 1 })} /></div>
                  {cfg.tipo === 'serigrafia' && (<>
                    <div><label className="block text-xs text-gray-500 mb-1">Costo pantalla/color ($)</label>
                      <input type="number" className="input-base text-sm" min={0} value={(cfg as SerigrafiaConfig).costo_pantalla_por_color ?? 5000}
                        onChange={e => updateConfig(tec.id, { costo_pantalla_por_color: parseFloat(e.target.value) || 0 })} /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">Prep. pantalla (min/color)</label>
                      <input type="number" className="input-base text-sm" min={0} value={Math.round(((cfg as SerigrafiaConfig).tiempo_preparacion_por_color ?? 600) / 60)}
                        onChange={e => updateConfig(tec.id, { tiempo_preparacion_por_color: (parseInt(e.target.value) || 0) * 60 })} /></div>
                  </>)}
                </div>
              </div>

              {/* Section 4: Descuentos */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">4 &middot; Descuentos por volumen</p>
                {globalDiscountEnabled && !(cfg as { descuento_override?: boolean }).descuento_override ? (
                  <div className="flex items-start gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                    <Info size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] text-amber-700">Descuento global activo — se gestiona desde <a href="/settings" className="underline font-semibold">Configuración</a>.</p>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-purple-600"
                    checked={(cfg as { descuento_override?: boolean }).descuento_override ?? false}
                    onChange={() => updateConfig(tec.id, { descuento_override: !(cfg as { descuento_override?: boolean }).descuento_override })} />
                  <span className="text-xs text-gray-600">Usar descuentos personalizados para esta técnica</span>
                </label>
                {(cfg as { descuento_override?: boolean }).descuento_override && (
                  <DiscountTable tiers={(cfg as { descuentos?: DiscountTier[] }).descuentos ?? []}
                    onChange={tiers => updateConfig(tec.id, { descuentos: tiers })} />
                )}
              </div>

              {/* Section 5: Simulador */}
              <div>
                <button type="button" onClick={() => setShowSim(v => !v)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color }}>
                  <Zap size={13} /> 5 &middot; Simulador de costo
                  {showSim ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {showSim && (
                  <div className="mt-3 rounded-xl p-4" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
                    <div className="flex items-center gap-3 mb-3">
                      <input type="number" className="input-base text-sm w-20" min={1} value={simW} onChange={e => setSimW(Number(e.target.value))} />
                      <span className="text-gray-400 font-bold text-xs">×</span>
                      <input type="number" className="input-base text-sm w-20" min={1} value={simH} onChange={e => setSimH(Number(e.target.value))} />
                      <span className="text-xs text-gray-400">cm</span>
                    </div>
                    <div className="space-y-1">
                      {simResult.costLines.filter(l => l.label !== 'Producto base' && l.value > 0).map((l, i) => (
                        <div key={i} className="flex justify-between text-xs"><span className="text-gray-500">{l.label}</span><span className="font-medium text-gray-700">{fmt(l.value)}</span></div>
                      ))}
                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-200">
                        <span className="text-xs font-bold text-gray-600">Costo impresión</span>
                        <span className="text-lg font-black" style={{ color }}>{fmt(simResult.costoTotal - Number(simProduct.base_cost))}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save */}
              <button onClick={() => saveTecnica(tec)} disabled={saving === tec.id || tec.id.startsWith('local-')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: color }}>
                <Save size={14} />{saving === tec.id ? 'Guardando...' : 'Guardar técnica'}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
