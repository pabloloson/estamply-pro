'use client'

import { useState, useEffect } from 'react'
import { calcSuggestedPrice, getDiscount, type WorkshopSettings } from '@/features/presupuesto/types'

export type DTFMode = 'tercerizado' | 'propia'

export interface CalcDTFResult {
  costoDiseño: number
  costoProducto: number
  costoMo: number
  costoMerma: number
  costoTotal: number
  precioSugerido: number
  precioConDesc: number
  descPorcentaje: number
  subtotal: number
  ganancia: number
  timeMinutes: number
  profitPerHour: number
  // Nesting info
  nestingCols: number
  nestingRows: number
  nestingRotated: boolean
  metrosLineales: number
  anchoRolloUsed: number
}

// Safety margins and gap between designs
const ROLL_MARGIN = 1 // cm border margin on each side
const DESIGN_GAP = 1  // cm gap between designs

/**
 * Nesting on continuous roll with margins and gaps.
 * Usable width = rollWidth - 2*margin.
 * Designs spaced by gap. Cols = floor((usable + gap) / (dw + gap)).
 * Length = margin + rows*(dh + gap) - gap + margin = top/bottom margins + rows with gaps.
 */
function calcRollNesting(dw: number, dh: number, rollWidth: number, qty: number) {
  const usable = rollWidth - ROLL_MARGIN * 2

  // Option A: normal orientation
  const colsA = Math.max(Math.floor((usable + DESIGN_GAP) / (dw + DESIGN_GAP)), 0)
  const rowsA = colsA > 0 ? Math.ceil(qty / colsA) : Infinity
  const lengthA = colsA > 0 ? ROLL_MARGIN * 2 + rowsA * dh + (rowsA - 1) * DESIGN_GAP : Infinity

  // Option B: rotated 90°
  const colsB = Math.max(Math.floor((usable + DESIGN_GAP) / (dh + DESIGN_GAP)), 0)
  const rowsB = colsB > 0 ? Math.ceil(qty / colsB) : Infinity
  const lengthB = colsB > 0 ? ROLL_MARGIN * 2 + rowsB * dw + (rowsB - 1) * DESIGN_GAP : Infinity

  if (lengthA <= lengthB && colsA > 0) {
    return { cols: colsA, rows: rowsA, rotated: false, lengthCm: lengthA }
  }
  if (colsB > 0) {
    return { cols: colsB, rows: rowsB, rotated: true, lengthCm: lengthB }
  }
  return { cols: 1, rows: qty, rotated: false, lengthCm: ROLL_MARGIN * 2 + qty * dh + (qty - 1) * DESIGN_GAP }
}

export function useCalcDTF(settings: WorkshopSettings, products: any[], equipment: any[]) {
  const [productId, setProductId] = useState('')
  const [modo, setModo] = useState<DTFMode>('tercerizado')
  const [quantity, setQuantity] = useState(10)
  const [designWidth, setDesignWidth] = useState(25)
  const [designHeight, setDesignHeight] = useState(30)
  // Overrides (initialized from settings, user can change in accordion)
  const [precioMetro, setPrecioMetro] = useState(settings.dtf_precio_metro)
  const [anchoRollo, setAnchoRollo] = useState(settings.dtf_ancho_rollo)
  const [margin, setMargin] = useState(settings.margen_sugerido ?? 50)
  const [merma, setMerma] = useState(3)
  const [mo, setMo] = useState(0)
  const [otrosGastos, setOtrosGastos] = useState(0)
  const [result, setResult] = useState<CalcDTFResult | null>(null)

  useEffect(() => {
    if (products.length && !productId) setProductId(products[0].id)
  }, [products])

  useEffect(() => {
    setPrecioMetro(settings.dtf_precio_metro)
    setAnchoRollo(settings.dtf_ancho_rollo)
  }, [settings])

  useEffect(() => {
    const product = products.find(p => p.id === productId)
    if (!product) { setResult(null); return }

    // Nesting on roll
    const rollW = anchoRollo || 60
    const nesting = calcRollNesting(designWidth, designHeight, rollW, quantity)
    const metrosLineales = nesting.lengthCm / 100

    let costoDiseño: number

    if (modo === 'tercerizado') {
      // Cost = linear meters consumed * price per meter, divided by quantity for per-unit
      const totalRollCost = metrosLineales * precioMetro
      costoDiseño = totalRollCost / Math.max(quantity, 1)
    } else {
      // Propia: costs based on linear meters consumed
      const filmRollArea = ((settings.dtf_film_ancho || 60) / 100) * (settings.dtf_film_largo || 100) // m²
      const consumedArea = (rollW / 100) * metrosLineales // m² of roll consumed
      const filmCosto = filmRollArea > 0 ? (consumedArea / filmRollArea) * (settings.dtf_film_rollo_precio || 0) : 0
      const tintaCosto = (settings.dtf_tinta_rendimiento_m2 || 1) > 0 ? (consumedArea / settings.dtf_tinta_rendimiento_m2) * (settings.dtf_tinta_precio_litro || 0) : 0
      const polvoCosto = (settings.dtf_polvo_rendimiento_m2 || 1) > 0 ? (consumedArea / settings.dtf_polvo_rendimiento_m2) * (settings.dtf_polvo_precio_kilo || 0) : 0
      const printerDTF = equipment.find((e: any) => e.type === 'printer_dtf')
      const hornoDTF = equipment.find((e: any) => e.type === 'horno_dtf')
      const amortPerUnit = (printerDTF ? printerDTF.cost / printerDTF.lifespan_uses : 0) + (hornoDTF ? hornoDTF.cost / hornoDTF.lifespan_uses : 0)
      // Total insumo cost / quantity = per-unit
      costoDiseño = (filmCosto + tintaCosto + polvoCosto) / Math.max(quantity, 1) + amortPerUnit
    }

    const costoProducto = Number(product.base_cost)
    const costoBase = costoDiseño + costoProducto + mo
    const costoMerma = costoBase * (merma / 100)
    const otrosPerUnit = otrosGastos / Math.max(quantity, 1)
    const costoTotal = costoBase + costoMerma + otrosPerUnit
    const precioSugerido = calcSuggestedPrice(costoTotal, margin)
    const discountTiers = settings.descuento_global_enabled ? (settings.descuentos_global ?? settings.descuentos_dtf) : settings.descuentos_dtf
    const descPorcentaje = getDiscount(discountTiers, quantity)
    const precioConDesc = precioSugerido * (1 - descPorcentaje)
    const subtotal = precioConDesc * quantity
    const ganancia = subtotal - costoTotal * quantity
    const timeMinutes = settings.setup_min + ((product.time_dtf || 0) / 60) * quantity
    const profitPerHour = timeMinutes > 0 ? ganancia / (timeMinutes / 60) : 0

    setResult({
      costoDiseño, costoProducto, costoMo: mo, costoMerma, costoTotal,
      precioSugerido, precioConDesc, descPorcentaje, subtotal, ganancia,
      timeMinutes, profitPerHour,
      nestingCols: nesting.cols, nestingRows: nesting.rows,
      nestingRotated: nesting.rotated, metrosLineales,
      anchoRolloUsed: rollW,
    })
  }, [settings, products, equipment, productId, modo, quantity, designWidth, designHeight, precioMetro, anchoRollo, margin, merma, mo, otrosGastos])

  return {
    productId, setProductId, modo, setModo, quantity, setQuantity,
    designWidth, setDesignWidth, designHeight, setDesignHeight,
    precioMetro, setPrecioMetro, anchoRollo, setAnchoRollo,
    margin, setMargin, merma, setMerma, mo, setMo,
    otrosGastos, setOtrosGastos, result,
  }
}
