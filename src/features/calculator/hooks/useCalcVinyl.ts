'use client'

import { useState, useEffect } from 'react'
import { calcSuggestedPrice, getDiscount, type WorkshopSettings, type VinylMaterial } from '@/features/presupuesto/types'

export interface VinylVariant {
  id: string
  label: string
  precioMetro: number
  anchoRollo: number
}

export function buildVinylVariants(settings: WorkshopSettings): VinylVariant[] {
  const materiales = settings.vinyl_materiales ?? []
  const variants: VinylVariant[] = []
  materiales.forEach((mat: VinylMaterial, mi: number) => {
    const prefix = `${mat.aplicacion === 'autoadhesivo' ? 'Autoadhesivo' : 'Textil'} ${mat.acabado}`
    ;(mat.colores ?? []).forEach((color: string, ci: number) => {
      variants.push({ id: `${mi}-${ci}`, label: `${prefix} - ${color}`, precioMetro: mat.precio_metro, anchoRollo: mat.ancho_rollo })
    })
  })
  return variants
}

export interface VinylColorSelection {
  variantId: string
  ancho: number
  alto: number
}

// Plotter margins for vinyl cutting
const PLOTTER_MARGIN = 1.5 // cm each side (roller blind zone)
const VINYL_GAP = 0.5      // cm between designs

export interface VinylColorNesting {
  cols: number
  rows: number
  rotated: boolean
  metrosLineales: number
  anchoRollo: number
  costoColor: number
}

function calcVinylNesting(dw: number, dh: number, rollWidth: number, qty: number, precioMetro: number): VinylColorNesting {
  const usable = rollWidth - PLOTTER_MARGIN * 2

  const colsA = Math.max(Math.floor((usable + VINYL_GAP) / (dw + VINYL_GAP)), 0)
  const rowsA = colsA > 0 ? Math.ceil(qty / colsA) : Infinity
  const lenA = colsA > 0 ? PLOTTER_MARGIN * 2 + rowsA * dh + Math.max(rowsA - 1, 0) * VINYL_GAP : Infinity

  const colsB = Math.max(Math.floor((usable + VINYL_GAP) / (dh + VINYL_GAP)), 0)
  const rowsB = colsB > 0 ? Math.ceil(qty / colsB) : Infinity
  const lenB = colsB > 0 ? PLOTTER_MARGIN * 2 + rowsB * dw + Math.max(rowsB - 1, 0) * VINYL_GAP : Infinity

  let cols: number, rows: number, rotated: boolean, lengthCm: number
  if (lenA <= lenB && colsA > 0) {
    cols = colsA; rows = rowsA; rotated = false; lengthCm = lenA
  } else if (colsB > 0) {
    cols = colsB; rows = rowsB; rotated = true; lengthCm = lenB
  } else {
    cols = 1; rows = qty; rotated = false; lengthCm = PLOTTER_MARGIN * 2 + qty * dh + Math.max(qty - 1, 0) * VINYL_GAP
  }

  const metrosLineales = lengthCm / 100
  const costoColor = metrosLineales * precioMetro

  return { cols, rows, rotated, metrosLineales, anchoRollo: rollWidth, costoColor }
}

export interface CalcVinylResult {
  nestingPorColor: VinylColorNesting[]
  costoViniloPorColor: number[]
  costoViniloTotal: number
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
}

export function useCalcVinyl(settings: WorkshopSettings, products: any[]) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [numColors, setNumColors] = useState(2)
  const [selections, setSelections] = useState<VinylColorSelection[]>([
    { variantId: '', ancho: 20, alto: 15 },
    { variantId: '', ancho: 12, alto: 10 },
  ])
  const [mo, setMo] = useState(500)
  const [merma, setMerma] = useState(5)
  const [margin, setMargin] = useState(settings.margen_sugerido ?? 50)
  const [peelTime, setPeelTime] = useState(0)
  const [otrosGastos, setOtrosGastos] = useState(0)
  const [result, setResult] = useState<CalcVinylResult | null>(null)

  const variants = buildVinylVariants(settings)

  useEffect(() => {
    if (products.length && !productId) setProductId(products[0].id)
  }, [products])

  useEffect(() => {
    setSelections(prev => {
      if (numColors > prev.length) {
        return [...prev, ...Array.from({ length: numColors - prev.length }, () => ({ variantId: '', ancho: 10, alto: 10 }))]
      }
      return prev.slice(0, numColors)
    })
  }, [numColors])

  const updateSelection = (i: number, patch: Partial<VinylColorSelection>) => {
    setSelections(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s))
  }

  useEffect(() => {
    const product = products.find(p => p.id === productId)
    if (!product) { setResult(null); return }

    const activeSelections = selections.slice(0, numColors)

    // Per-color nesting and cost
    const nestingPorColor: VinylColorNesting[] = activeSelections.map(sel => {
      const v = variants.find(vr => vr.id === sel.variantId)
      if (!v || sel.ancho <= 0 || sel.alto <= 0) {
        return { cols: 0, rows: 0, rotated: false, metrosLineales: 0, anchoRollo: v?.anchoRollo ?? 50, costoColor: 0 }
      }
      return calcVinylNesting(sel.ancho, sel.alto, v.anchoRollo, quantity, v.precioMetro)
    })

    // Total roll cost = sum of all colors' linear meter costs, divided by quantity for per-unit
    const costoViniloPorColor = nestingPorColor.map(n => n.costoColor / Math.max(quantity, 1))
    const costoViniloTotal = costoViniloPorColor.reduce((s, c) => s + c, 0)

    const costoProducto = Number(product.base_cost)
    const otrosPerUnit = otrosGastos / Math.max(quantity, 1)
    const costoBase = costoViniloTotal + costoProducto + mo
    const costoMerma = costoBase * (merma / 100)
    const costoTotal = costoBase + costoMerma + otrosPerUnit

    const precioSugerido = calcSuggestedPrice(costoTotal, margin)
    const discountTiers = settings.descuento_global_enabled ? (settings.descuentos_global ?? settings.descuentos_vinyl) : settings.descuentos_vinyl
    const descPorcentaje = getDiscount(discountTiers, quantity)
    const precioConDesc = precioSugerido * (1 - descPorcentaje)
    const subtotal = precioConDesc * quantity
    const ganancia = subtotal - costoTotal * quantity

    const timeMinutes = settings.setup_min + (((product.time_vinyl || 0) / 60) + peelTime) * quantity
    const timeHours = timeMinutes / 60
    const profitPerHour = timeHours > 0 ? ganancia / timeHours : 0

    setResult({ nestingPorColor, costoViniloPorColor, costoViniloTotal, costoProducto, costoMo: mo, costoMerma, costoTotal, precioSugerido, precioConDesc, descPorcentaje, subtotal, ganancia, timeMinutes, profitPerHour })
  }, [settings, products, productId, quantity, numColors, selections, mo, merma, margin, peelTime, otrosGastos, variants.length])

  return {
    productId, setProductId, quantity, setQuantity,
    numColors, setNumColors, selections, updateSelection, variants,
    mo, setMo, otrosGastos, setOtrosGastos, merma, setMerma,
    margin, setMargin, peelTime, setPeelTime, result,
  }
}
