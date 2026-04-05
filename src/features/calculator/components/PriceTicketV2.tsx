'use client'

import { Clock, Zap, ShoppingCart, Tag, TrendingUp } from 'lucide-react'
import { SheetVisual } from './SheetVisual'

interface PriceTicketV2Props {
  technique: 'subli' | 'dtf' | 'vinyl'
  result: {
    costoTotal: number
    precioSugerido: number
    precioConDesc: number
    descPorcentaje: number
    subtotal: number
    ganancia: number
    timeMinutes: number
    profitPerHour: number
    // subli specific
    costoPapel?: number
    costoProducto?: number
    amortizacion?: number
    perSheet?: number
    sheetRotated?: boolean
    sheetCols?: number
    sheetRows?: number
    // dtf specific
    costoDiseño?: number
    // vinyl specific
    costoViniloTotal?: number
    costoViniloPorColor?: number[]
  } | null
  quantity: number
  designWidth?: number
  designHeight?: number
  onAddToCart: () => void
  addDisabled: boolean
}

const TECHNIQUE_COLORS: Record<string, string> = {
  subli: '#6C5CE7',
  dtf: '#E17055',
  vinyl: '#E84393',
}

const TECHNIQUE_LABELS: Record<string, string> = {
  subli: 'Sublimación',
  dtf: 'DTF',
  vinyl: 'Vinilo',
}

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-AR')}`
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${accent ? 'font-bold' : ''}`}
      style={accent ? { color: 'inherit' } : {}}
    >
      <span className={accent ? 'text-sm' : 'text-sm text-gray-500'}>{label}</span>
      <span className={`text-sm ${accent ? 'font-bold' : 'font-medium text-gray-700'}`}>{value}</span>
    </div>
  )
}

export default function PriceTicketV2({
  technique,
  result,
  quantity,
  designWidth,
  designHeight,
  onAddToCart,
  addDisabled,
}: PriceTicketV2Props) {
  const color = TECHNIQUE_COLORS[technique]

  if (!result) {
    return (
      <div className="rounded-2xl flex flex-col items-center justify-center min-h-[420px] gap-3 border-2 border-dashed border-gray-200">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <Tag size={22} style={{ color }} />
        </div>
        <p className="text-sm text-gray-400 text-center px-8 max-w-[220px]">
          Completá los datos del formulario para ver el precio sugerido.
        </p>
      </div>
    )
  }

  const hasDiscount = result.descPorcentaje > 0
  const discountPct = Math.round(result.descPorcentaje * 100)
  const gananciaMargin = result.subtotal > 0 ? Math.round((result.ganancia / result.subtotal) * 100) : 0

  return (
    <div className="flex flex-col gap-0 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
      {/* Color accent top bar */}
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {TECHNIQUE_LABELS[technique]}
          </span>
          <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-full">
            {quantity} {quantity === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>

        {/* Sheet visual for subli (uses actual design dimensions) */}
        {technique === 'subli' && result.sheetCols !== undefined && result.sheetRows !== undefined && (
          <div
            className="rounded-xl p-3 flex justify-center"
            style={{ background: `${color}08`, border: `1px solid ${color}20` }}
          >
            <SheetVisual
              sheetW={21}
              sheetH={29.7}
              designW={designWidth ?? 10}
              designH={designHeight ?? 10}
              cols={result.sheetCols ?? 1}
              rows={result.sheetRows ?? 1}
              rotated={result.sheetRotated ?? false}
              perSheet={result.perSheet ?? 1}
              sheetsNeeded={1}
              quantity={quantity}
            />
          </div>
        )}

        {/* Cost breakdown */}
        <div className="rounded-xl p-3.5 space-y-0.5" style={{ background: '#F9FAFB' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Desglose de costos</p>

          {technique === 'subli' && (
            <>
              {result.costoProducto !== undefined && <Row label="Producto" value={fmt(result.costoProducto)} />}
              {result.costoPapel !== undefined && <Row label="Papel + tinta" value={fmt(result.costoPapel)} />}
              {result.amortizacion !== undefined && result.amortizacion > 0 && <Row label="Amortización" value={fmt(result.amortizacion)} />}
            </>
          )}
          {technique === 'dtf' && result.costoDiseño !== undefined && (
            <Row label="Insumos DTF" value={fmt(result.costoDiseño)} />
          )}
          {technique === 'vinyl' && result.costoViniloTotal !== undefined && (
            <Row label="Vinilo" value={fmt(result.costoViniloTotal)} />
          )}

          <div className="border-t border-gray-200 mt-2 pt-2">
            <Row label="Costo total" value={fmt(result.costoTotal)} />
          </div>
          <div className="border-t border-gray-200 mt-1 pt-1">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-bold" style={{ color }}>Ganancia</span>
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: `${color}15`, color }}>
                  {gananciaMargin}%
                </span>
                <span className="text-sm font-bold" style={{ color }}>{fmt(result.ganancia)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price */}
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: `linear-gradient(135deg, ${color}12, ${color}06)`, border: `1px solid ${color}20` }}
        >
          {hasDiscount ? (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Precio con descuento</p>
              <p className="text-base text-gray-400 line-through">{fmt(result.precioSugerido)}</p>
              <p className="text-4xl font-black mt-0.5" style={{ color }}>{fmt(result.precioConDesc)}</p>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                  {discountPct}% desc.
                </span>
                <span className="text-xs text-gray-400">por unidad</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Precio sugerido</p>
              <p className="text-4xl font-black" style={{ color }}>{fmt(result.precioSugerido)}</p>
              <p className="text-xs text-gray-400 mt-0.5">por unidad</p>
            </>
          )}

          {quantity > 1 && (
            <div
              className="mt-3 pt-3 flex items-center justify-between"
              style={{ borderTop: `1px dashed ${color}30` }}
            >
              <span className="text-xs text-gray-500">Total {quantity} unidades</span>
              <span className="text-sm font-black" style={{ color }}>
                {fmt(result.subtotal)}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tiempo</span>
            </div>
            <p className="text-lg font-black text-gray-800">
              {result.timeMinutes < 60
                ? `${Math.round(result.timeMinutes)} min`
                : `${(result.timeMinutes / 60).toFixed(1)} h`}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} style={{ color }} />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ganancia/h</span>
            </div>
            <p className="text-lg font-black text-gray-800">
              {fmt(result.profitPerHour)}/h
            </p>
          </div>
        </div>

        {/* Add to cart */}
        <button
          type="button"
          disabled={addDisabled}
          onClick={onAddToCart}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: color,
            boxShadow: addDisabled ? 'none' : `0 4px 20px ${color}45`,
          }}
        >
          <ShoppingCart size={16} />
          Agregar al Presupuesto
        </button>
      </div>
    </div>
  )
}
