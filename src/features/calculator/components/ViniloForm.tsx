'use client'

import { useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import ProductPicker from './ProductPicker'
import VinylPicker from './VinylPicker'
import { VinylRollVisual } from './VinylRollVisual'
import type { VinylVariant, VinylColorSelection, VinylColorNesting } from '../hooks/useCalcVinyl'

interface ViniloFormProps {
  products: Array<{ id: string; name: string }>
  productId: string
  setProductId: (id: string) => void
  quantity: number
  setQuantity: (n: number) => void
  numColors: number
  setNumColors: (n: number) => void
  selections: VinylColorSelection[]
  updateSelection: (i: number, patch: Partial<VinylColorSelection>) => void
  variants: VinylVariant[]
  nestingPorColor: VinylColorNesting[] | null
}

const VINYL_COLOR = '#E84393'

export default function ViniloForm({
  products, productId, setProductId, quantity, setQuantity,
  numColors, setNumColors, selections, updateSelection, variants,
  nestingPorColor,
}: ViniloFormProps) {
  const [showNesting, setShowNesting] = useState<Record<number, boolean>>({})

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Producto</label>
        <ProductPicker products={products} value={productId} onChange={setProductId} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cantidad</label>
        <input type="number" className="input-base" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Colores en el diseño</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <button key={n} type="button" onClick={() => setNumColors(n)}
              className="w-9 h-9 rounded-lg text-sm font-bold transition-all duration-150"
              style={numColors === n
                ? { backgroundColor: VINYL_COLOR, color: '#fff', boxShadow: '0 2px 6px rgba(232,67,147,0.35)' }
                : { backgroundColor: '#F1F1F1', color: '#666' }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: numColors }).map((_, i) => {
          const sel = selections[i] ?? { variantId: '', ancho: 10, alto: 10 }
          const selectedVariant = variants.find(v => v.id === sel.variantId)
          const nesting = nestingPorColor?.[i]
          const hasNesting = nesting && nesting.cols > 0 && nesting.rows > 0

          return (
            <div key={i} className="rounded-xl p-3 border border-gray-100 bg-white shadow-sm space-y-2.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Color {i + 1}</span>

              <VinylPicker variants={variants} value={sel.variantId}
                onChange={id => updateSelection(i, { variantId: id })} />

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tamaño diseño (cm)</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="input-base text-sm" min={0} placeholder="Ancho"
                    value={sel.ancho} onChange={e => updateSelection(i, { ancho: Number(e.target.value) })} />
                  <span className="text-gray-400 font-bold text-xs flex-shrink-0">&times;</span>
                  <input type="number" className="input-base text-sm" min={0} placeholder="Alto"
                    value={sel.alto} onChange={e => updateSelection(i, { alto: Number(e.target.value) })} />
                </div>
              </div>

              {/* Nesting toggle */}
              {hasNesting && (
                <div>
                  <button type="button" onClick={() => setShowNesting(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    <LayoutGrid size={10} />
                    {showNesting[i] ? 'Ocultar distribución' : '+ Ver distribución en rollo'}
                  </button>
                  {showNesting[i] && (
                    <div className="mt-2 p-2 rounded-lg" style={{ background: '#E8439306', border: '1px solid #E8439310' }}>
                      <VinylRollVisual
                        rollWidth={nesting.anchoRollo}
                        designW={sel.ancho}
                        designH={sel.alto}
                        cols={nesting.cols}
                        rows={nesting.rows}
                        quantity={quantity}
                        rotated={nesting.rotated}
                        metrosLineales={nesting.metrosLineales}
                      />
                    </div>
                  )}
                </div>
              )}

              {selectedVariant && !showNesting[i] && (
                <p className="text-[10px] text-gray-400">
                  ${selectedVariant.precioMetro.toLocaleString('es-AR')}/m &middot; rollo {selectedVariant.anchoRollo} cm
                  {hasNesting && ` &middot; ${nesting.metrosLineales.toFixed(2)} m`}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
