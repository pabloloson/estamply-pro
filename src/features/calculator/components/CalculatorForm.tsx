'use client'

import type { Technique, Product } from '../types'

const techniques: { id: Technique; label: string; color: string }[] = [
  { id: 'subli', label: 'Sublimación', color: '#0F766E' },
  { id: 'dtf', label: 'DTF Textil', color: '#E17055' },
  { id: 'dtf_uv', label: 'DTF UV', color: '#00B894' },
  { id: 'vinyl', label: 'Vinilo Textil', color: '#E84393' },
  { id: 'vinyl_adhesivo', label: 'V. Autoadhesivo', color: '#D63384' },
  { id: 'serigrafia', label: 'Serigrafía', color: '#FDCB6E' },
]

interface CalculatorFormProps {
  products: Product[]
  technique: Technique
  setTechnique: (t: Technique) => void
  productId: string
  setProductId: (id: string) => void
  quantity: number
  setQuantity: (q: number) => void
  designWidth: number
  setDesignWidth: (w: number) => void
  designHeight: number
  setDesignHeight: (h: number) => void
  margin: number
  setMargin: (m: number) => void
  merma: number
  setMerma: (m: number) => void
  peelTime: number
  setPeelTime: (t: number) => void
}

export function CalculatorForm({
  products, technique, setTechnique, productId, setProductId,
  quantity, setQuantity, designWidth, setDesignWidth, designHeight, setDesignHeight,
  margin, setMargin, merma, setMerma, peelTime, setPeelTime,
}: CalculatorFormProps) {
  const activeColor = techniques.find(t => t.id === technique)?.color || '#0F766E'

  return (
    <div className="flex-1 space-y-5">
      {/* Technique Tabs */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Técnica</label>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
          {techniques.map(t => (
            <button
              key={t.id}
              onClick={() => setTechnique(t.id)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${technique === t.id ? 'tab-active' : 'text-gray-500'}`}
              style={technique === t.id ? { color: t.color } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity - FIRST */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad de unidades</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="input-base"
          style={{ '--tw-ring-color': activeColor } as React.CSSProperties}
        />
      </div>

      {/* Product */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Producto</label>
        <select
          value={productId}
          onChange={e => setProductId(e.target.value)}
          className="input-base"
        >
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} — ${p.base_cost.toLocaleString('es-AR')}/u</option>
          ))}
        </select>
        {products.length === 0 && (
          <p className="text-xs text-orange-500 mt-1">No hay productos. Agregá uno en Configuración.</p>
        )}
      </div>

      {/* Design Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Tamaño del diseño (cm)
          {technique === 'subli' && <span className="text-xs text-gray-400 ml-1">— para nesting en hoja A4</span>}
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={designWidth}
              onChange={e => setDesignWidth(parseFloat(e.target.value) || 1)}
              className="input-base"
              placeholder="Ancho"
            />
            <span className="text-xs text-gray-400 mt-0.5 block text-center">Ancho</span>
          </div>
          <div className="flex items-center text-gray-400 pt-1">×</div>
          <div className="flex-1">
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={designHeight}
              onChange={e => setDesignHeight(parseFloat(e.target.value) || 1)}
              className="input-base"
              placeholder="Alto"
            />
            <span className="text-xs text-gray-400 mt-0.5 block text-center">Alto</span>
          </div>
        </div>
      </div>

      {/* Commercial adjustments */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Margen (%)</label>
          <input
            type="number"
            min={0}
            max={500}
            value={margin}
            onChange={e => setMargin(parseInt(e.target.value) || 0)}
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Merma (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={merma}
            onChange={e => setMerma(parseInt(e.target.value) || 0)}
            className="input-base"
          />
        </div>
      </div>

      {/* Vinyl only: peel time */}
      {technique === 'vinyl' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiempo de pelado extra (min/unidad)</label>
          <input
            type="number"
            min={0}
            value={peelTime}
            onChange={e => setPeelTime(parseInt(e.target.value) || 0)}
            className="input-base"
          />
        </div>
      )}
    </div>
  )
}
