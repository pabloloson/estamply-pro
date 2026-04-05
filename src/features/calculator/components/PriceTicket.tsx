'use client'

import { Clock, Zap } from 'lucide-react'
import { SheetVisual } from './SheetVisual'
import type { CalcResult, Technique } from '../types'

interface PriceTicketProps {
  result: CalcResult | null
  technique: Technique
  quantity: number
  designWidth: number
  designHeight: number
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export function PriceTicket({ result, technique, quantity, designWidth, designHeight }: PriceTicketProps) {
  if (!result) {
    return (
      <div className="flex-1 rounded-2xl p-6 flex items-center justify-center" style={{ background: '#FAFAFA', border: '1.5px dashed #E5E7EB' }}>
        <p className="text-gray-400 text-sm">Seleccioná un producto para ver el cálculo</p>
      </div>
    )
  }

  const hours = result.timeMinutes / 60
  const hoursDisplay = hours < 1 ? `${Math.round(result.timeMinutes)}min` : `${hours.toFixed(1)}h`

  return (
    <div className="flex-1 rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#FAFAFA' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">Resumen del pedido</h3>
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{
          background: technique === 'subli' ? 'rgba(108,92,231,0.1)' : technique === 'dtf' ? 'rgba(225,112,85,0.1)' : 'rgba(232,67,147,0.1)',
          color: technique === 'subli' ? '#6C5CE7' : technique === 'dtf' ? '#E17055' : '#E84393',
        }}>
          {technique === 'subli' ? 'Sublimación' : technique === 'dtf' ? 'DTF' : 'Vinilo'} × {quantity}
        </span>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Producto base</span>
          <span className="font-medium text-gray-800">{fmt(result.productCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Insumos</span>
          <span className="font-medium text-gray-800">{fmt(result.suppliesCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Amortización equipo</span>
          <span className="font-medium text-gray-800">{fmt(result.amortizationCost)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-gray-700 border-t border-gray-200 pt-2">
          <span>Costo total</span>
          <span>{fmt(result.totalCost)}</span>
        </div>
      </div>

      <hr className="dashed-divider" />

      {/* Suggested Price - BIG */}
      <div className="text-center">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Precio sugerido lote</p>
        <p className="text-4xl font-bold" style={{ color: technique === 'subli' ? '#6C5CE7' : technique === 'dtf' ? '#E17055' : '#E84393' }}>
          {fmt(result.suggestedPrice)}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {fmt(result.suggestedPrice / quantity)} / unidad
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">Tiempo est.</span>
          </div>
          <p className="font-bold text-gray-800">{hoursDisplay}</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">Rendimiento</span>
          </div>
          <p className="font-bold" style={{ color: result.profitPerHour > 0 ? '#00B894' : '#E17055' }}>
            {fmt(result.profitPerHour)}/h
          </p>
        </div>
      </div>

      {/* Sheet Visual (Sublimación only) */}
      {technique === 'subli' && result.designsPerSheet !== undefined && (
        <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <p className="text-xs font-medium text-gray-500 mb-3">Distribución en hoja A4</p>
          <div className="flex justify-center">
            <SheetVisual
              sheetW={21}
              sheetH={29.7}
              designW={designWidth}
              designH={designHeight}
              cols={result.sheetCols || 1}
              rows={result.sheetRows || 1}
              rotated={result.sheetRotated || false}
              perSheet={result.designsPerSheet || 1}
              sheetsNeeded={1}
              quantity={1}
            />
          </div>
        </div>
      )}
    </div>
  )
}
