'use client'

import { useState, useRef } from 'react'
import { Clock, TrendingUp, Tag, Plus, X } from 'lucide-react'
import { usePermissions } from '@/shared/context/PermissionsContext'

interface CostLine { label: string; value: number }
interface ExtraCost { name: string; amount: number; modo: 'total' | 'unidad' }

interface AuditTicketProps {
  technique: string
  costLines: CostLine[]
  costoTotal: number
  margin: number
  precioSugerido: number
  descPorcentaje: number
  precioConDesc: number
  quantity: number
  subtotal: number
  ganancia: number
  timeMinutes: number
  profitPerHour: number
  addDisabled: boolean
  // Editable callbacks
  onMarginChange?: (v: number) => void
  overrideMerma?: number | null; defaultMerma?: number; onMermaChange?: (v: number) => void
  overrideAmortPrint?: number | null; defaultAmortPrint?: number; onAmortPrintChange?: (v: number) => void
  overrideAmortPress?: number | null; defaultAmortPress?: number; onAmortPressChange?: (v: number) => void
  mo?: number; onMoChange?: (v: number) => void
  extraCosts?: ExtraCost[]; onExtraCostsChange?: (costs: ExtraCost[]) => void
  hasOverrides?: boolean; onResetOverrides?: () => void
  onDiscountChange?: (pct: number) => void
  consumibles?: Array<{ name: string; costPerUse: number }>
}

const COLORS: Record<string, string> = { subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E' }

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }
function fmtTime(min: number) {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/* Hide number input spinners */
const noSpinnerCSS = `
  .no-spinner::-webkit-inner-spin-button,
  .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .no-spinner { -moz-appearance: textfield; }
`

function AddCostForm({ onConfirm, onCancel, suggestions = [] }: { onConfirm: (name: string, amount: number, modo: 'total' | 'unidad') => void; onCancel: () => void; suggestions?: Array<{ name: string; costPerUse: number }> }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [modo, setModo] = useState<'total' | 'unidad'>('unidad')
  const [showSugg, setShowSugg] = useState(false)
  const filtered = suggestions.filter(s => name.length > 0 && s.name.toLowerCase().includes(name.toLowerCase()))
  function tryConfirm() {
    const n = name.trim(), a = parseFloat(amount) || 0
    if (n && a > 0) onConfirm(n, a, modo)
  }
  function pickSuggestion(s: { name: string; costPerUse: number }) {
    setName(s.name); setAmount(String(s.costPerUse)); setShowSugg(false)
  }
  return (
    <div className="mt-2 space-y-1.5">
      <div className="relative">
        <div className="flex gap-1.5 items-center">
          <input type="text" className="input-base text-xs py-1 flex-[2]" placeholder="Ej: Teflón, Envío, Diseño..." autoFocus
            value={name} onChange={e => { setName(e.target.value); setShowSugg(true) }}
            onKeyUp={e => { if (e.key === 'Enter') tryConfirm() }}
            onFocus={() => setShowSugg(true)} />
          <input type="text" inputMode="decimal" className="input-base text-xs py-1 flex-1" placeholder="$"
            value={amount} onChange={e => setAmount(e.target.value)}
            onKeyUp={e => { if (e.key === 'Enter') tryConfirm() }} />
          <button type="button" onClick={() => setModo(m => m === 'total' ? 'unidad' : 'total')}
            className="text-[9px] font-bold px-1.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 whitespace-nowrap">
            {modo === 'total' ? 'total' : '/u'}
          </button>
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {showSugg && filtered.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-auto">
            {filtered.map(s => (
              <button key={s.name} type="button" onClick={() => pickSuggestion(s)}
                className="w-full flex justify-between items-center px-3 py-1.5 text-xs hover:bg-purple-50 text-left">
                <span className="text-gray-700">{s.name}</span>
                <span className="text-gray-400">{fmt(s.costPerUse)}/uso</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AuditTicket(props: AuditTicketProps) {
  const { showCosts, showPrices } = usePermissions()
  const {
    technique, costLines, costoTotal, margin, precioSugerido, descPorcentaje, precioConDesc,
    quantity, subtotal, ganancia, timeMinutes, profitPerHour, addDisabled,
    onMarginChange, overrideMerma, defaultMerma, onMermaChange,
    overrideAmortPrint, onAmortPrintChange,
    overrideAmortPress, onAmortPressChange,
    mo, onMoChange, extraCosts = [], onExtraCostsChange,
    hasOverrides, onResetOverrides, onDiscountChange,
    consumibles = [],
  } = props

  const color = COLORS[technique] || '#6C5CE7'
  const hasDiscount = descPorcentaje > 0
  const discountPct = Math.round(descPorcentaje * 100)
  const montoDescuento = precioSugerido - precioConDesc
  const gananciaPercent = subtotal > 0 ? Math.round((ganancia / subtotal) * 100) : 0

  // Editing state
  const [editingLine, setEditingLine] = useState<number | null>(null)
  const [editingMargin, setEditingMargin] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(false)
  const [editingExtra, setEditingExtra] = useState<number | null>(null)
  const [tempVal, setTempVal] = useState('')
  const [addingCost, setAddingCost] = useState(false)
  // Generic line value overrides for lines without specific callbacks (Producto base, Papel+Tinta, etc.)
  const [lineOverrides, setLineOverrides] = useState<Record<number, number>>({})

  if (addDisabled) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center min-h-[420px] gap-3 border-2 border-dashed border-gray-200">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}15` }}><Tag size={22} style={{ color }} /></div>
        <p className="text-sm text-gray-400 text-center px-8 max-w-[220px]">Seleccioná un producto para ver la cotización.</p>
      </div>
    )
  }

  // Determine how each line is edited
  function getLineType(line: CostLine) {
    if (line.label.includes('Desperdicio') || line.label.includes('Merma') || line.label.includes('pelado')) return 'merma'
    if (line.label.includes('Amort. impresora') || line.label.includes('Amort. plotter') || line.label.includes('Amort. pulpo')) return 'amortPrint'
    if (line.label.includes('Amort. plancha')) return 'amortPress'
    if (line.label.includes('Mano de obra')) return 'mo'
    return 'generic'
  }

  function isLineModified(line: CostLine, idx: number) {
    const t = getLineType(line)
    if (t === 'merma') return overrideMerma !== null && overrideMerma !== undefined
    if (t === 'amortPrint') return overrideAmortPrint !== null && overrideAmortPrint !== undefined
    if (t === 'amortPress') return overrideAmortPress !== null && overrideAmortPress !== undefined
    if (t === 'mo') return false // MO doesn't track "modified" state
    return idx in lineOverrides
  }

  function startEdit(line: CostLine, idx: number) {
    const t = getLineType(line)
    if (t === 'merma') {
      const match = line.label.match(/\d+/)
      setTempVal(match ? match[0] : String(overrideMerma ?? defaultMerma ?? 0))
    } else {
      setTempVal(String(Math.round(line.value)))
    }
    setEditingLine(idx)
  }

  function commitEdit(line: CostLine, idx: number) {
    const val = Number(tempVal)
    const t = getLineType(line)
    if (t === 'merma' && onMermaChange) onMermaChange(val)
    else if (t === 'amortPrint' && onAmortPrintChange) onAmortPrintChange(val)
    else if (t === 'amortPress' && onAmortPressChange) onAmortPressChange(val)
    else if (t === 'mo' && onMoChange) onMoChange(val)
    else setLineOverrides(prev => ({ ...prev, [idx]: val }))
    setEditingLine(null)
  }

  const anyLineOverrides = Object.keys(lineOverrides).length > 0
  const extraPerUnit = extraCosts.reduce((s, c) => s + (c.modo === 'total' ? c.amount / Math.max(quantity, 1) : c.amount), 0)

  const stepNum = { price: hasDiscount ? 4 : 3, metrics: hasDiscount ? 5 : 4 }

  return (
    <>
      <style>{noSpinnerCSS}</style>
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
        <div className="p-5">

          {/* 1. Desglose (hidden for non-cost users) */}
          {showCosts && <div className="pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">1 &middot; Desglose de costos</p>
            <div className="space-y-0">
              {costLines.map((line, i) => {
                const isEditing = editingLine === i
                const modified = isLineModified(line, i)
                const displayValue = i in lineOverrides ? lineOverrides[i] : line.value

                return (
                  <div key={i} className={`flex justify-between items-center py-1.5 px-2 -mx-2 rounded-md cursor-pointer transition-colors ${isEditing ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                    onClick={() => { if (!isEditing) startEdit(line, i) }}>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      {line.label}
                      {modified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                    </span>
                    {isEditing ? (
                      <input type="number" className="no-spinner w-20 text-right text-sm font-medium text-gray-800 bg-white border-b-2 border-purple-400 outline-none"
                        autoFocus value={tempVal} onChange={e => setTempVal(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onBlur={() => commitEdit(line, i)}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(line, i); if (e.key === 'Escape') setEditingLine(null) }} />
                    ) : (
                      <span className="text-sm font-medium text-gray-700">{fmt(displayValue)}</span>
                    )}
                  </div>
                )
              })}

              {/* Extra costs — editable with total/unidad mode */}
              {extraCosts.map((ec, i) => {
                const isEditingThis = editingExtra === i
                const perUnit = ec.modo === 'total' ? ec.amount / Math.max(quantity, 1) : ec.amount
                const displayLabel = ec.modo === 'total' ? `${ec.name} (total ${fmt(ec.amount)})` : ec.name
                return (
                  <div key={`x-${i}`} className={`flex justify-between items-center py-1.5 px-2 -mx-2 rounded-md cursor-pointer transition-colors ${isEditingThis ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                    onClick={() => { if (!isEditingThis && onExtraCostsChange) { setTempVal(String(ec.amount)); setEditingExtra(i) } }}>
                    {isEditingThis ? (
                      <>
                        <input type="text" className="text-sm text-gray-500 bg-transparent border-b border-purple-300 outline-none flex-1 mr-2" value={ec.name}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { const u = [...extraCosts]; u[i] = { ...u[i], name: e.target.value }; onExtraCostsChange?.(u) }} />
                        <input type="text" inputMode="decimal" className="no-spinner w-20 text-right text-sm font-medium text-gray-800 bg-white border-b-2 border-purple-400 outline-none"
                          autoFocus value={tempVal} onClick={e => e.stopPropagation()}
                          onChange={e => setTempVal(e.target.value)}
                          onBlur={() => { const u = [...extraCosts]; u[i] = { ...u[i], amount: parseFloat(tempVal) || 0 }; onExtraCostsChange?.(u); setEditingExtra(null) }}
                          onKeyUp={e => { if (e.key === 'Enter') { const u = [...extraCosts]; u[i] = { ...u[i], amount: parseFloat(tempVal) || 0 }; onExtraCostsChange?.(u); setEditingExtra(null) } }} />
                        <button type="button" onClick={e => { e.stopPropagation(); const u = [...extraCosts]; u[i] = { ...u[i], modo: ec.modo === 'total' ? 'unidad' : 'total' }; onExtraCostsChange?.(u) }}
                          className="text-[9px] font-bold px-1 py-0.5 rounded border border-gray-200 text-gray-500 ml-1">{ec.modo === 'total' ? 'total' : '/u'}</button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-500">{displayLabel}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-700">{perUnit === Math.round(perUnit) ? fmt(perUnit) : `$${perUnit.toFixed(2).replace('.', ',')}`}</span>
                          {onExtraCostsChange && (
                            <button onClick={e => { e.stopPropagation(); const u = [...extraCosts]; u[i] = { ...u[i], modo: ec.modo === 'total' ? 'unidad' : 'total' }; onExtraCostsChange(u) }}
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 cursor-pointer">{ec.modo === 'total' ? 'total' : '/u'}</button>
                          )}
                          {onExtraCostsChange && <button onClick={e => { e.stopPropagation(); onExtraCostsChange(extraCosts.filter((_, j) => j !== i)) }} className="p-0.5 rounded hover:bg-red-50"><X size={10} className="text-red-400" /></button>}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add cost with autocomplete */}
            {onExtraCostsChange && (
              addingCost ? (
                <AddCostForm
                  suggestions={consumibles.filter(c => !extraCosts.some(ec => ec.name === c.name))}
                  onConfirm={(name, amount, modo) => { onExtraCostsChange([...extraCosts, { name, amount, modo }]); setAddingCost(false) }}
                  onCancel={() => setAddingCost(false)} />
              ) : (
                <button onClick={() => setAddingCost(true)} className="mt-2 flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-purple-600 transition-colors">
                  <Plus size={10} /> Agregar costo
                </button>
              )
            )}

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-bold text-gray-800">Costo Total</span>
              <span className="text-sm font-bold text-gray-800">{fmt(costoTotal + extraPerUnit)}</span>
            </div>
            {(hasOverrides || extraCosts.length > 0 || anyLineOverrides) && onResetOverrides && (
              <button onClick={() => { onResetOverrides(); setLineOverrides({}) }} className="mt-1 text-[10px] text-purple-600 hover:text-purple-700 font-medium">↺ Restaurar predeterminados</button>
            )}
          </div>}

          {/* 2. Precio Sugerido */}
          {showCosts && <div className="pb-4 pt-3 border-t border-dashed border-gray-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">2 &middot; Precio sugerido</p>
            <div className={`flex justify-between items-center py-1.5 px-2 -mx-2 rounded-md cursor-pointer transition-colors ${editingMargin ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
              onClick={() => { if (!editingMargin) { setTempVal(String(margin)); setEditingMargin(true) } }}>
              <span className="text-sm text-gray-500">Margen de ganancia (+{editingMargin ? '' : margin}%{editingMargin ? '' : ')'}
                {editingMargin && (
                  <input type="number" className="no-spinner w-10 text-center text-sm font-medium bg-white border-b-2 border-purple-400 outline-none mx-0.5"
                    autoFocus value={tempVal} onChange={e => setTempVal(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => { onMarginChange?.(Number(tempVal)); setEditingMargin(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') { onMarginChange?.(Number(tempVal)); setEditingMargin(false) }; if (e.key === 'Escape') setEditingMargin(false) }} />
                )}
                {editingMargin && '%)'}
              </span>
              <span className="text-sm font-medium text-gray-500">+{fmt(precioSugerido - costoTotal)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Precio Base</span>
              <span className="text-sm font-bold text-gray-800">{fmt(precioSugerido)}</span>
            </div>
          </div>}

          {/* 3. Descuento — editable */}
          {showCosts && hasDiscount && (
            <div className="pb-4 pt-3 border-t border-dashed border-gray-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">3 &middot; Descuento por volumen</p>
              <div className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer transition-colors ${editingDiscount ? '' : 'hover:opacity-80'}`}
                style={{ background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.15)' }}
                onClick={() => { if (!editingDiscount) { setTempVal(String(discountPct)); setEditingDiscount(true) } }}>
                <span className="text-sm font-semibold" style={{ color: '#00B894' }}>
                  Desc. volumen (-{editingDiscount ? (
                    <input type="number" className="no-spinner w-10 text-center font-semibold bg-transparent border-b-2 border-green-400 outline-none"
                      style={{ color: '#00B894' }} autoFocus value={tempVal}
                      onClick={e => e.stopPropagation()} onChange={e => setTempVal(e.target.value)}
                      onBlur={() => { onDiscountChange?.(Number(tempVal)); setEditingDiscount(false) }}
                      onKeyDown={e => { if (e.key === 'Enter') { onDiscountChange?.(Number(tempVal)); setEditingDiscount(false) }; if (e.key === 'Escape') setEditingDiscount(false) }} />
                  ) : discountPct}%)
                </span>
                <span className="text-sm font-bold" style={{ color: '#00B894' }}>-{fmt(montoDescuento)}</span>
              </div>
            </div>
          )}

          {/* Precio Final */}
          <div className="rounded-xl p-5 text-center mt-2" style={{ background: `linear-gradient(135deg, ${color}10, ${color}05)`, border: `1px solid ${color}20` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: `${color}99` }}>{stepNum.price} &middot; Precio final</p>
            {hasDiscount && <p className="text-sm text-gray-400 line-through mb-0.5">{fmt(precioSugerido)}</p>}
            <p className="text-4xl font-black" style={{ color }}>{fmt(precioConDesc)}</p>
            <p className="text-xs text-gray-400 mt-0.5">por unidad</p>
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px dashed ${color}25` }}>
              <span className="text-xs text-gray-500">Total ({quantity} u.)</span>
              <span className="text-sm font-black" style={{ color }}>{fmt(subtotal)}</span>
            </div>
          </div>

          {/* Rentabilidad */}
          {showCosts && <div className="mt-6 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">{stepNum.metrics} &middot; Rentabilidad</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3.5" style={{ background: ganancia > 0 ? 'rgba(0,184,148,0.06)' : 'rgba(255,71,87,0.06)', border: `1px solid ${ganancia > 0 ? 'rgba(0,184,148,0.12)' : 'rgba(255,71,87,0.12)'}` }}>
                <div className="flex items-center gap-1.5 mb-1.5"><TrendingUp size={13} style={{ color: ganancia > 0 ? '#00B894' : '#FF4757' }} /><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ganancia neta</span></div>
                <p className="text-xl font-black" style={{ color: ganancia > 0 ? '#00B894' : '#FF4757' }}>{fmt(ganancia)}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: ganancia > 0 ? '#00B89499' : '#FF475799' }}>{gananciaPercent}% del total</p>
              </div>
              <div className="rounded-xl p-3.5 bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-1.5 mb-1.5"><Clock size={13} className="text-gray-400" /><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tiempo total</span></div>
                <p className="text-xl font-black text-gray-800">{fmtTime(timeMinutes)}</p>
                <p className="text-xs font-semibold text-gray-400 mt-0.5">{fmt(profitPerHour)}/h</p>
              </div>
            </div>
          </div>}
        </div>
      </div>
    </>
  )
}
