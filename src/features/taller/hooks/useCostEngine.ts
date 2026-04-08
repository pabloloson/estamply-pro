'use client'

import { useState, useEffect, useMemo } from 'react'
import { type WorkshopSettings, type DiscountTier, DEFAULT_MO_CONFIG } from '@/features/presupuesto/types'
import type { Tecnica, CostResult, Insumo } from '../types'
import { computeCost } from '../services/cost-engine'

export interface VinylSelection {
  materialIdx: number
  colorIdx: number
  ancho: number
  alto: number
}

function getAmortHelper(equipment: any[], ids: string[]) {
  return ids.reduce((sum: number, id: string) => { const eq = equipment.find((e: any) => e.id === id); return sum + (eq ? Math.round(eq.cost / eq.lifespan_uses) : 0) }, 0)
}

export function useCostEngine(
  tecnicas: Tecnica[],
  products: any[],
  equipment: any[],
  insumos: Insumo[],
  settings: WorkshopSettings,
) {
  const [selectedTechniqueId, setSelectedTechniqueId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [designWidth, setDesignWidth] = useState(15)
  const [designHeight, setDesignHeight] = useState(20)
  const [numColors, setNumColors] = useState(1)
  const [margin, setMargin] = useState(settings.margen_sugerido ?? 50)
  const [mo, setMo] = useState(0)
  const [otrosGastos, setOtrosGastos] = useState(0)
  // Production overrides (null = use technique defaults)
  const [overrideMerma, setOverrideMerma] = useState<number | null>(null)
  const [overrideAmortPrint, setOverrideAmortPrint] = useState<number | null>(null)
  const [overrideAmortPress, setOverrideAmortPress] = useState<number | null>(null)
  const [overrideCostoPantalla, setOverrideCostoPantalla] = useState<number | null>(null)
  const [overrideDiscountPct, setOverrideDiscountPct] = useState<number | null>(null)
  // Production config overrides
  const [overridePrinterId, setOverridePrinterId] = useState<string | null>(null)
  const [overridePressId, setOverridePressId] = useState<string | null>(null)
  // Zones for subli/dtf
  const [numZones, setNumZones] = useState(1)
  const [zones, setZones] = useState<Array<{ ancho: number; alto: number; ubicacion: string }>>([
    { ancho: 15, alto: 20, ubicacion: '' },
  ])
  const [vinylSelections, setVinylSelections] = useState<VinylSelection[]>([
    { materialIdx: 0, colorIdx: 0, ancho: 20, alto: 15 },
  ])

  useEffect(() => {
    if (tecnicas.length && !selectedTechniqueId) {
      const first = tecnicas.find(t => t.activa)
      if (first) setSelectedTechniqueId(first.id)
    }
  }, [tecnicas, selectedTechniqueId])

  // Product starts empty — user must select one

  const product = useMemo(() => products.find((p: any) => p.id === productId), [products, productId])
  const technique = useMemo(() => tecnicas.find(t => t.id === selectedTechniqueId), [tecnicas, selectedTechniqueId])

  // Sync zones array with numZones
  useEffect(() => {
    setZones(prev => {
      if (numZones > prev.length) return [...prev, ...Array.from({ length: numZones - prev.length }, () => ({ ancho: 15, alto: 20, ubicacion: '' }))]
      return prev.slice(0, numZones)
    })
  }, [numZones])

  const updateZone = (i: number, patch: Partial<{ ancho: number; alto: number; ubicacion: string }>) => {
    setZones(prev => prev.map((z, j) => j === i ? { ...z, ...patch } : z))
  }

  useEffect(() => {
    setVinylSelections(prev => {
      if (numColors > prev.length) return [...prev, ...Array.from({ length: numColors - prev.length }, () => ({ materialIdx: 0, colorIdx: 0, ancho: 10, alto: 10 }))]
      return prev.slice(0, numColors)
    })
  }, [numColors])

  const updateVinylSelection = (i: number, patch: Partial<VinylSelection>) => {
    setVinylSelections(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s))
  }

  // Get insumos linked to current technique
  const linkedInsumos = useMemo(() => {
    if (!technique) return []
    return insumos.filter(ins => technique.insumo_ids.includes(ins.id))
  }, [technique, insumos])

  // Resolve discount tiers
  const discountTiers = useMemo((): DiscountTier[] => {
    if (!technique) return []
    const cfg = technique.config as unknown as Record<string, unknown>
    if (cfg.descuento_override && (cfg.descuentos as DiscountTier[])?.length) {
      return cfg.descuentos as DiscountTier[]
    }
    if (settings.descuento_global_enabled) return settings.descuentos_global ?? []
    // Fallback to per-technique from settings
    if (technique.slug === 'subli') return settings.descuentos_subli ?? []
    if (technique.slug === 'dtf' || technique.slug === 'dtf_uv') return settings.descuentos_dtf ?? []
    return settings.descuentos_vinyl ?? []
  }, [technique, settings])

  const result = useMemo((): CostResult | null => {
    if (!technique || !product) return null
    // If user overrode discount %, use a synthetic tier
    const effectiveDiscountTiers = overrideDiscountPct !== null
      ? [{ desde: 1, hasta: 999999, porcentaje: overrideDiscountPct / 100 }]
      : discountTiers

    const isZonable = ['subli', 'dtf', 'dtf_uv'].includes(technique.slug)
    // Use overridden equipment if user changed in production config
    const effectiveEquipIds = overridePrinterId
      ? [...technique.equipment_ids.filter((id: string) => !equipment.some((e: { id: string; type: string }) => e.id === id && e.type.startsWith('printer'))), overridePrinterId]
      : technique.equipment_ids
    const effectiveProduct = overridePressId
      ? { ...product, press_equipment_id: overridePressId }
      : product
    return computeCost({
      config: technique.config,
      product: effectiveProduct,
      equipment,
      techniqueEquipmentIds: effectiveEquipIds,
      insumos: linkedInsumos,
      quantity, designWidth, designHeight, numColors,
      margin, mo, otrosGastos,
      setupMin: settings.setup_min ?? 15,
      discountTiers: effectiveDiscountTiers,
      zones: isZonable && numZones > 1 ? zones.slice(0, numZones) : undefined,
      vinylSelections: technique.slug === 'vinyl' ? vinylSelections.slice(0, numColors) : undefined,
      overrideMerma, overrideAmortPrint, overrideAmortPress, overrideCostoPantalla,
    })
  }, [technique, product, equipment, linkedInsumos, settings, quantity, designWidth, designHeight, numColors, numZones, zones, margin, mo, otrosGastos, vinylSelections, discountTiers, overrideMerma, overrideAmortPrint, overrideAmortPress, overrideCostoPantalla, overrideDiscountPct, overridePrinterId, overridePressId])

  // Compute default values for overrides display
  const defaultMerma = useMemo(() => {
    if (!technique) return 5
    const cfg = technique.config as unknown as Record<string, unknown>
    return (cfg.desperdicio_pct as number) ?? (cfg.desperdicio_pelado_pct as number) ?? 5
  }, [technique])
  const defaultAmortPrint = useMemo(() => {
    return technique ? getAmortHelper(equipment, technique.equipment_ids) : 0
  }, [technique, equipment])
  const defaultAmortPress = useMemo(() => {
    if (!product?.press_equipment_id) return 0
    const press = equipment.find((e: any) => e.id === product.press_equipment_id)
    if (!press) return 0
    const perUse = press.cost / press.lifespan_uses
    const unidades = (product.unidades_por_planchada as number) || 1
    return Math.round(perUse / unidades)
  }, [product, equipment])

  function resetOverrides() {
    setOverrideMerma(null); setOverrideAmortPrint(null); setOverrideAmortPress(null); setOverrideCostoPantalla(null); setOverrideDiscountPct(null)
  }
  const hasOverrides = overrideMerma !== null || overrideAmortPrint !== null || overrideAmortPress !== null || overrideCostoPantalla !== null || overrideDiscountPct !== null

  return {
    selectedTechniqueId, setSelectedTechniqueId, technique,
    productId, setProductId, product,
    quantity, setQuantity,
    designWidth, setDesignWidth, designHeight, setDesignHeight,
    numColors, setNumColors,
    margin, setMargin, mo, setMo,
    otrosGastos, setOtrosGastos,
    numZones, setNumZones, zones, updateZone,
    vinylSelections, updateVinylSelection,
    linkedInsumos, result,
    // Overrides
    overrideMerma, setOverrideMerma, defaultMerma,
    overrideAmortPrint, setOverrideAmortPrint, defaultAmortPrint,
    overrideAmortPress, setOverrideAmortPress, defaultAmortPress,
    overrideCostoPantalla, setOverrideCostoPantalla,
    overrideDiscountPct, setOverrideDiscountPct,
    overridePrinterId, setOverridePrinterId,
    overridePressId, setOverridePressId,
    resetOverrides, hasOverrides,
  }
}
