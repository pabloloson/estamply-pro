'use client'

import { Info } from 'lucide-react'
import ProductPicker from './ProductPicker'

interface DTFFormProps {
  products: Array<{ id: string; name: string }>
  modo: 'tercerizado' | 'propia'
  setModo: (m: 'tercerizado' | 'propia') => void
  productId: string
  setProductId: (id: string) => void
  quantity: number
  setQuantity: (n: number) => void
  designWidth: number
  setDesignWidth: (n: number) => void
  designHeight: number
  setDesignHeight: (n: number) => void
}

const DTF_COLOR = '#E17055'

export default function DTFForm({
  products, modo, setModo, productId, setProductId,
  quantity, setQuantity, designWidth, setDesignWidth,
  designHeight, setDesignHeight,
}: DTFFormProps) {
  return (
    <div className="space-y-5">
      {/* Mode Toggle */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Modo</label>
        <div className="flex rounded-full p-1 gap-1" style={{ backgroundColor: '#F1F1F1' }}>
          {(['tercerizado', 'propia'] as const).map(m => (
            <button key={m} type="button" onClick={() => setModo(m)}
              className="flex-1 py-1.5 px-3 rounded-full text-sm font-semibold transition-all duration-200"
              style={modo === m ? { backgroundColor: '#fff', color: DTF_COLOR, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' } : { color: '#888' }}>
              {m === 'tercerizado' ? 'Mando a imprimir' : 'Impresora propia'}
            </button>
          ))}
        </div>
      </div>

      {/* Product */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Producto</label>
        <ProductPicker products={products} value={productId} onChange={setProductId} />
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cantidad</label>
        <input type="number" className="input-base" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
      </div>

      {/* Design dimensions */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tamaño diseño (cm)</label>
        <div className="flex items-center gap-2">
          <input type="number" className="input-base" min={0} placeholder="Ancho" value={designWidth} onChange={e => setDesignWidth(Number(e.target.value))} />
          <span className="text-gray-400 font-bold flex-shrink-0">&times;</span>
          <input type="number" className="input-base" min={0} placeholder="Alto" value={designHeight} onChange={e => setDesignHeight(Number(e.target.value))} />
        </div>
      </div>

      {/* Propia info */}
      {modo === 'propia' && (
        <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(225,112,85,0.08)' }}>
          <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: DTF_COLOR }} />
          <p className="text-xs text-gray-600">
            Costos calculados desde <span className="font-semibold">Base de Costos</span> y <span className="font-semibold">Equipos</span>.
          </p>
        </div>
      )}
    </div>
  )
}
