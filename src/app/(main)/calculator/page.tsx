'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePresupuesto } from '@/features/presupuesto/context/PresupuestoContext'
import { DEFAULT_SETTINGS, type WorkshopSettings } from '@/features/presupuesto/types'
import { useCalcSubli } from '@/features/calculator/hooks/useCalcSubli'
import { useCalcDTF } from '@/features/calculator/hooks/useCalcDTF'
import { useCalcVinyl } from '@/features/calculator/hooks/useCalcVinyl'
import DTFForm from '@/features/calculator/components/DTFForm'
import ViniloForm from '@/features/calculator/components/ViniloForm'
import PriceTicketV2 from '@/features/calculator/components/PriceTicketV2'

type Tab = 'subli' | 'dtf' | 'vinyl'

const TABS: { id: Tab; label: string; color: string }[] = [
  { id: 'subli', label: 'Sublimación', color: '#6C5CE7' },
  { id: 'dtf', label: 'DTF', color: '#E17055' },
  { id: 'vinyl', label: 'Vinilo', color: '#E84393' },
]

export default function CalculatorPage() {
  const supabase = createClient()
  const { addItem, items } = usePresupuesto()

  const [activeTab, setActiveTab] = useState<Tab>('subli')
  const [products, setProducts] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [settings, setSettings] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [showOptional, setShowOptional] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: equip }, { data: ws }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('equipment').select('*'),
        supabase.from('workshop_settings').select('settings').single(),
      ])
      if (prods) setProducts(prods)
      if (equip) setEquipment(equip)
      if (ws?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...(ws.settings as Partial<WorkshopSettings>) })
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subli = useCalcSubli(settings, products, equipment)
  const dtf = useCalcDTF(settings, products)
  const vinyl = useCalcVinyl(settings, products)

  const subliProductName = products.find(p => p.id === subli.productId)?.name ?? 'Producto'
  const dtfProductName = products.find(p => p.id === dtf.productId)?.name ?? 'Producto'
  const vinylProductName = products.find(p => p.id === vinyl.productId)?.name ?? 'Producto'

  const pressEquipment = equipment.filter(
    e => e.type === 'press_flat' || e.type === 'press_mug'
  )

  function handleSubliAddToCart() {
    if (!subli.result) return
    addItem({
      tecnica: 'subli',
      nombre: subliProductName,
      costoUnit: subli.result.costoTotal,
      precioUnit: subli.result.precioConDesc,
      precioSinDesc: subli.result.precioSugerido,
      cantidad: subli.quantity,
      subtotal: subli.result.subtotal,
      ganancia: subli.result.ganancia,
    })
  }

  function handleDTFAddToCart() {
    if (!dtf.result) return
    addItem({
      tecnica: 'dtf',
      nombre: dtfProductName,
      costoUnit: dtf.result.costoTotal,
      precioUnit: dtf.result.precioConDesc,
      precioSinDesc: dtf.result.precioSugerido,
      cantidad: dtf.quantity,
      subtotal: dtf.result.subtotal,
      ganancia: dtf.result.ganancia,
    })
  }

  function handleVinylAddToCart() {
    if (!vinyl.result) return
    addItem({
      tecnica: 'vinyl',
      nombre: `${vinylProductName} Vinilo (${vinyl.numColors} col.)`,
      costoUnit: vinyl.result.costoTotal,
      precioUnit: vinyl.result.precioConDesc,
      precioSinDesc: vinyl.result.precioSugerido,
      cantidad: vinyl.quantity,
      subtotal: vinyl.result.subtotal,
      ganancia: vinyl.result.ganancia,
    })
  }

  const activeColor = TABS.find(t => t.id === activeTab)?.color ?? '#6C5CE7'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Calculadora</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Calculá el precio exacto de tu trabajo
          </p>
        </div>
        <Link
          href="/presupuesto"
          className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all"
          style={{ backgroundColor: '#6C5CE7', boxShadow: '0 4px 14px rgba(108,92,231,0.35)' }}
        >
          <ShoppingCart size={16} />
          Presupuesto
          {items.length > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
              style={{ backgroundColor: '#E84393' }}
            >
              {items.length}
            </span>
          )}
        </Link>
      </div>

      {/* Technique Tabs */}
      <div
        className="flex rounded-full p-1 gap-1 mb-6 w-fit"
        style={{ backgroundColor: '#F1F1F1' }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={
                active
                  ? {
                      backgroundColor: '#fff',
                      color: tab.color,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    }
                  : { backgroundColor: 'transparent', color: '#888' }
              }
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${activeColor}40`, borderTopColor: activeColor }}
          />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Form */}
          <div className="card lg:w-[420px] flex-shrink-0 p-8 lg:p-10">
            {activeTab === 'subli' && (
              <div className="space-y-6">
                {/* Cantidad */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    className="input-base"
                    min={1}
                    value={subli.quantity}
                    onChange={e => subli.setQuantity(Number(e.target.value))}
                  />
                </div>

                {/* Producto */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Producto
                  </label>
                  <select
                    className="input-base"
                    value={subli.productId}
                    onChange={e => subli.setProductId(e.target.value)}
                  >
                    <option value="">Seleccionar producto…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plancha */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Plancha
                  </label>
                  <select
                    className="input-base"
                    value={subli.pressId}
                    onChange={e => subli.setPressId(e.target.value)}
                  >
                    <option value="">Seleccionar plancha…</option>
                    {pressEquipment.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tamaño diseño */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Tamaño diseño (cm)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input-base"
                      min={0}
                      placeholder="Ancho"
                      value={subli.designWidth}
                      onChange={e => subli.setDesignWidth(Number(e.target.value))}
                    />
                    <span className="text-gray-400 font-bold flex-shrink-0">×</span>
                    <input
                      type="number"
                      className="input-base"
                      min={0}
                      placeholder="Alto"
                      value={subli.designHeight}
                      onChange={e => subli.setDesignHeight(Number(e.target.value))}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">para nesting en hoja A4</p>
                </div>

                {/* Margen y Merma */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Margen (%)
                    </label>
                    <input
                      type="number"
                      className="input-base"
                      min={0}
                      value={subli.margin}
                      onChange={e => subli.setMargin(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Merma (%)
                    </label>
                    <input
                      type="number"
                      className="input-base"
                      min={0}
                      max={100}
                      value={subli.merma}
                      onChange={e => subli.setMerma(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Optional section toggle */}
                <button
                  type="button"
                  onClick={() => setShowOptional(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors"
                >
                  {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Costos opcionales
                </button>

                {showOptional && (
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Mano de obra ($)
                        </label>
                        <input
                          type="number"
                          className="input-base"
                          min={0}
                          value={subli.mo}
                          onChange={e => subli.setMo(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Electricidad ($)
                        </label>
                        <input
                          type="number"
                          className="input-base"
                          min={0}
                          value={subli.electricidad}
                          onChange={e => subli.setElectricidad(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Comisión plataforma (%)
                      </label>
                      <input
                        type="number"
                        className="input-base"
                        min={0}
                        max={100}
                        value={subli.comision}
                        onChange={e => subli.setComision(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'dtf' && (
              <DTFForm
                products={products}
                modo={dtf.modo}
                setModo={dtf.setModo}
                productId={dtf.productId}
                setProductId={dtf.setProductId}
                quantity={dtf.quantity}
                setQuantity={dtf.setQuantity}
                designWidth={dtf.designWidth}
                setDesignWidth={dtf.setDesignWidth}
                designHeight={dtf.designHeight}
                setDesignHeight={dtf.setDesignHeight}
                precioMetro={dtf.precioMetro}
                setPrecioMetro={dtf.setPrecioMetro}
                anchoRollo={dtf.anchoRollo}
                setAnchoRollo={dtf.setAnchoRollo}
                filmCosto={dtf.filmCosto}
                setFilmCosto={dtf.setFilmCosto}
                tintaCosto={dtf.tintaCosto}
                setTintaCosto={dtf.setTintaCosto}
                polvoCosto={dtf.polvoCosto}
                setPolvoCosto={dtf.setPolvoCosto}
                amortImpresora={dtf.amortImpresora}
                setAmortImpresora={dtf.setAmortImpresora}
                amortHorno={dtf.amortHorno}
                setAmortHorno={dtf.setAmortHorno}
                margin={dtf.margin}
                setMargin={dtf.setMargin}
                merma={dtf.merma}
                setMerma={dtf.setMerma}
                mo={dtf.mo}
                setMo={dtf.setMo}
                electricidad={dtf.electricidad}
                setElectricidad={dtf.setElectricidad}
              />
            )}

            {activeTab === 'vinyl' && (
              <ViniloForm
                products={products}
                productId={vinyl.productId}
                setProductId={vinyl.setProductId}
                quantity={vinyl.quantity}
                setQuantity={vinyl.setQuantity}
                numColors={vinyl.numColors}
                setNumColors={vinyl.setNumColors}
                colors={vinyl.colors}
                updateColor={vinyl.updateColor}
                mo={vinyl.mo}
                setMo={vinyl.setMo}
                merma={vinyl.merma}
                setMerma={vinyl.setMerma}
                margin={vinyl.margin}
                setMargin={vinyl.setMargin}
                peelTime={vinyl.peelTime}
                setPeelTime={vinyl.setPeelTime}
              />
            )}
          </div>

          {/* Right: Price Ticket */}
          <div className="flex-1">
            {activeTab === 'subli' && (
              <PriceTicketV2
                technique="subli"
                result={subli.result}
                quantity={subli.quantity}
                designWidth={subli.designWidth}
                designHeight={subli.designHeight}
                onAddToCart={handleSubliAddToCart}
                addDisabled={!subli.result}
              />
            )}
            {activeTab === 'dtf' && (
              <PriceTicketV2
                technique="dtf"
                result={dtf.result}
                quantity={dtf.quantity}
                onAddToCart={handleDTFAddToCart}
                addDisabled={!dtf.result}
              />
            )}
            {activeTab === 'vinyl' && (
              <PriceTicketV2
                technique="vinyl"
                result={vinyl.result}
                quantity={vinyl.quantity}
                onAddToCart={handleVinylAddToCart}
                addDisabled={!vinyl.result}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
