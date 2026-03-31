'use client'

interface DTFFormProps {
  products: Array<{ id: string; name: string; base_cost: number }>
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
  // Tercerizado
  precioMetro: number
  setPrecioMetro: (n: number) => void
  anchoRollo: number
  setAnchoRollo: (n: number) => void
  // Propia
  filmCosto: number
  setFilmCosto: (n: number) => void
  tintaCosto: number
  setTintaCosto: (n: number) => void
  polvoCosto: number
  setPolvoCosto: (n: number) => void
  amortImpresora: number
  setAmortImpresora: (n: number) => void
  amortHorno: number
  setAmortHorno: (n: number) => void
  // Shared
  margin: number
  setMargin: (n: number) => void
  merma: number
  setMerma: (n: number) => void
  mo: number
  setMo: (n: number) => void
  electricidad: number
  setElectricidad: (n: number) => void
}

const DTF_COLOR = '#E17055'

export default function DTFForm({
  products,
  modo,
  setModo,
  productId,
  setProductId,
  quantity,
  setQuantity,
  designWidth,
  setDesignWidth,
  designHeight,
  setDesignHeight,
  precioMetro,
  setPrecioMetro,
  anchoRollo,
  setAnchoRollo,
  filmCosto,
  setFilmCosto,
  tintaCosto,
  setTintaCosto,
  polvoCosto,
  setPolvoCosto,
  amortImpresora,
  setAmortImpresora,
  amortHorno,
  setAmortHorno,
  margin,
  setMargin,
  merma,
  setMerma,
  mo,
  setMo,
  electricidad,
  setElectricidad,
}: DTFFormProps) {
  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Modo de impresión
        </label>
        <div
          className="flex rounded-full p-1 gap-1"
          style={{ backgroundColor: '#F1F1F1' }}
        >
          {(['tercerizado', 'propia'] as const).map((m) => {
            const active = modo === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className="flex-1 py-1.5 px-3 rounded-full text-sm font-semibold transition-all duration-200"
                style={
                  active
                    ? { backgroundColor: '#fff', color: DTF_COLOR, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                    : { backgroundColor: 'transparent', color: '#888' }
                }
              >
                {m === 'tercerizado' ? 'Mando a imprimir' : 'Impresora propia'}
              </button>
            )
          })}
        </div>
      </div>

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

      {/* Design dimensions */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Ancho diseño (cm)
          </label>
          <input
            type="number"
            className="input-base"
            min={0}
            value={designWidth}
            onChange={(e) => setDesignWidth(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Alto diseño (cm)
          </label>
          <input
            type="number"
            className="input-base"
            min={0}
            value={designHeight}
            onChange={(e) => setDesignHeight(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Conditional fields */}
      {modo === 'tercerizado' ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DTF_COLOR }}>
            Costos de impresión (tercerizado)
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Precio por metro ($)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={precioMetro}
              onChange={(e) => setPrecioMetro(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Ancho de rollo (cm)
            </label>
            <input
              type="number"
              className="input-base"
              min={1}
              value={anchoRollo}
              onChange={(e) => setAnchoRollo(Number(e.target.value))}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DTF_COLOR }}>
            Costos de impresión (impresora propia)
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Film ($/m²)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={filmCosto}
              onChange={(e) => setFilmCosto(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Tinta CMYK+B ($/m²)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={tintaCosto}
              onChange={(e) => setTintaCosto(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Polvo adhesivo ($/m²)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={polvoCosto}
              onChange={(e) => setPolvoCosto(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Amort. impresora ($/m²)
              </label>
              <input
                type="number"
                className="input-base"
                min={0}
                value={amortImpresora}
                onChange={(e) => setAmortImpresora(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Amort. horno ($/m²)
              </label>
              <input
                type="number"
                className="input-base"
                min={0}
                value={amortHorno}
                onChange={(e) => setAmortHorno(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

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
              Electricidad ($/u)
            </label>
            <input
              type="number"
              className="input-base"
              min={0}
              value={electricidad}
              onChange={(e) => setElectricidad(Number(e.target.value))}
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
