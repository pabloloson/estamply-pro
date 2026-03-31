'use client'

interface ViniloFormProps {
  products: Array<{ id: string; name: string; base_cost: number }>
  productId: string
  setProductId: (id: string) => void
  quantity: number
  setQuantity: (n: number) => void
  numColors: number
  setNumColors: (n: number) => void
  colors: Array<{
    nombre: string
    tipo: string
    precioMetro: number
    anchoRollo: number
    ancho: number
    alto: number
  }>
  updateColor: (i: number, field: 'nombre' | 'tipo' | 'precioMetro' | 'anchoRollo' | 'ancho' | 'alto', value: string | number) => void
  mo: number
  setMo: (n: number) => void
  merma: number
  setMerma: (n: number) => void
  margin: number
  setMargin: (n: number) => void
  peelTime: number
  setPeelTime: (n: number) => void
}

const VINYL_COLOR = '#E84393'
const VINYL_TYPES = ['Liso', 'Glitter', 'Flock', 'Metalizado', 'Refractivo', 'Holográfico']
const COLOR_DOTS = ['#E84393', '#6C5CE7', '#E17055', '#00B894', '#FDCB6E', '#74B9FF']

export default function ViniloForm({
  products,
  productId,
  setProductId,
  quantity,
  setQuantity,
  numColors,
  setNumColors,
  colors,
  updateColor,
  mo,
  setMo,
  merma,
  setMerma,
  margin,
  setMargin,
  peelTime,
  setPeelTime,
}: ViniloFormProps) {
  return (
    <div className="space-y-6">
      {/* Product */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Producto
        </label>
        <select
          className="input-base"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
        >
          <option value="">Seleccionar producto…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Cantidad
        </label>
        <input
          type="number"
          className="input-base"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </div>

      {/* Number of colors */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Número de colores
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const active = numColors === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setNumColors(n)}
                className="w-9 h-9 rounded-lg text-sm font-bold transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: VINYL_COLOR, color: '#fff', boxShadow: '0 2px 6px rgba(232,67,147,0.35)' }
                    : { backgroundColor: '#F1F1F1', color: '#666' }
                }
              >
                {n}
              </button>
            )
          })}
        </div>
      </div>

      {/* Color cards */}
      <div className="space-y-3">
        {Array.from({ length: numColors }).map((_, i) => {
          const color = colors[i] ?? {
            nombre: '',
            tipo: 'Liso',
            precioMetro: 0,
            anchoRollo: 50,
            ancho: 0,
            alto: 0,
          }
          return (
            <div
              key={i}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
            >
              {/* Card header */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLOR_DOTS[i] }}
                />
                <span className="text-sm font-semibold text-gray-700">
                  Color {i + 1}
                </span>
              </div>

              {/* Nombre + Tipo */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-3">
                    Nombre
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    placeholder="ej. Negro"
                    value={color.nombre}
                    onChange={(e) => updateColor(i, 'nombre', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-3">
                    Tipo
                  </label>
                  <select
                    className="input-base"
                    value={color.tipo}
                    onChange={(e) => updateColor(i, 'tipo', e.target.value)}
                  >
                    {VINYL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Numeric inputs 2-col grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-3">
                    $/metro
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    min={0}
                    value={color.precioMetro}
                    onChange={(e) => updateColor(i, 'precioMetro', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-3">
                    Ancho rollo (cm)
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    min={1}
                    value={color.anchoRollo}
                    onChange={(e) => updateColor(i, 'anchoRollo', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-3">
                    Ancho diseño (cm)
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    min={0}
                    value={color.ancho}
                    onChange={(e) => updateColor(i, 'ancho', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-3">
                    Alto diseño (cm)
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    min={0}
                    value={color.alto}
                    onChange={(e) => updateColor(i, 'alto', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Shared fields */}
      <div className="space-y-3 pt-1 border-t border-gray-100">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 pt-2">
          Otros costos
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Mano de obra ($/u)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={mo}
              onChange={(e) => setMo(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Tiempo despegue (min)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={peelTime}
              onChange={(e) => setPeelTime(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Merma (%)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              max={100}
              value={merma}
              onChange={(e) => setMerma(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Margen de ganancia (%)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
