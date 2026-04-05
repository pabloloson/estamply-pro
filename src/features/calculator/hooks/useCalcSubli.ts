'use client'

import { useState, useEffect } from 'react'
import { calcSuggestedPrice, getDiscount, type WorkshopSettings } from '@/features/presupuesto/types'

export interface CalcSubliResult {
  costoPapel: number
  costoTinta: number
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
  perSheet: number
  sheetsNeeded: number
  sheetRotated: boolean
  sheetCols: number
  sheetRows: number
  amortizacion: number
}

// Printer margin: 5mm per side = 1cm total per axis
const PRINTER_MARGIN = 0.5 // cm per side

export function calcNesting(dw: number, dh: number, sw = 21, sh = 29.7) {
  // Printable area = sheet minus margins on each side
  const pw = sw - PRINTER_MARGIN * 2
  const ph = sh - PRINTER_MARGIN * 2
  const a = Math.floor(pw / dw) * Math.floor(ph / dh)
  const b = Math.floor(pw / dh) * Math.floor(ph / dw)
  const rotated = b > a
  if (rotated) {
    return { count: Math.max(b, 1), rotated: true, cols: Math.floor(pw / dh), rows: Math.floor(ph / dw) }
  }
  return { count: Math.max(a, 1), rotated: false, cols: Math.floor(pw / dw), rows: Math.floor(ph / dh) }
}

export function useCalcSubli(settings: WorkshopSettings, products: any[], equipment: any[]) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [designWidth, setDesignWidth] = useState(9)
  const [designHeight, setDesignHeight] = useState(20)
  const [margin, setMargin] = useState(settings.margen_sugerido ?? 50)
  const [merma, setMerma] = useState(3)
  const [mo, setMo] = useState(0)
  const [otrosGastos, setOtrosGastos] = useState(0)
  const [result, setResult] = useState<CalcSubliResult | null>(null)

  useEffect(() => {
    if (products.length && !productId) setProductId(products[0].id)
  }, [products])

  useEffect(() => {
    const product = products.find(p => p.id === productId)
    if (!product) { setResult(null); return }

    let costoPapel: number
    let perSheet = 1
    let sheetsNeeded = 1
    let sheetRotated = false
    let sheetCols = 1
    let sheetRows = 1

    const formato = settings.subli_papel_formato ?? 'hojas'

    if (formato === 'rollo') {
      const rolloAnchoCm = settings.subli_rollo_ancho || 61
      const rolloLargoCm = (settings.subli_rollo_largo || 100) * 100
      const costPerCm = (settings.subli_rollo_precio || 0) / Math.max(rolloLargoCm, 1)
      const colsA = Math.floor(rolloAnchoCm / designWidth)
      const colsB = Math.floor(rolloAnchoCm / designHeight)
      const costA = colsA > 0 ? (costPerCm * designHeight) / colsA : Infinity
      const costB = colsB > 0 ? (costPerCm * designWidth) / colsB : Infinity
      if (costA <= costB && colsA > 0) {
        costoPapel = costA; sheetCols = colsA; sheetRows = 1; sheetRotated = false; perSheet = colsA
      } else if (colsB > 0) {
        costoPapel = costB; sheetCols = colsB; sheetRows = 1; sheetRotated = true; perSheet = colsB
      } else {
        costoPapel = costPerCm * Math.max(designWidth, designHeight); perSheet = 1
      }
    } else {
      const sheetW = settings.subli_papel_ancho || 21
      const sheetH = settings.subli_papel_alto || 29.7
      const nesting = calcNesting(designWidth, designHeight, sheetW, sheetH)
      perSheet = Math.max(nesting.count, 1)
      sheetRotated = nesting.rotated; sheetCols = nesting.cols; sheetRows = nesting.rows
      const precioHoja = settings.subli_papel_precio / Math.max(settings.subli_papel_hojas, 1)
      // Whole sheets: if 10 designs need 2 sheets (6/sheet), charge for 2 full sheets
      sheetsNeeded = Math.ceil(quantity / perSheet)
      costoPapel = (sheetsNeeded * precioHoja) / quantity
    }

    // Tinta: area-based
    const refSheetArea = (settings.subli_papel_ancho || 21) * (settings.subli_papel_alto || 29.7)
    const tintaTotalArea = Math.max(settings.subli_tinta_rendimiento, 1) * refSheetArea
    const costoTinta = (designWidth * designHeight / tintaTotalArea) * settings.subli_tinta_precio

    // Equipment amortization — auto-resolved
    const printer = equipment.find((e: any) => e.type === 'printer_subli')
    const press = product.press_equipment_id ? equipment.find((e: any) => e.id === product.press_equipment_id) : null
    const amortizacion = (printer ? printer.cost / printer.lifespan_uses : 0) + (press ? press.cost / press.lifespan_uses : 0)

    // Materials cost
    const ci = Number(product.base_cost) + costoPapel + costoTinta
    const cr = (ci + mo) * (merma / 100)
    const cprod = mo + amortizacion + cr
    const otrosPerUnit = otrosGastos / Math.max(quantity, 1)
    const costoTotal = ci + cprod + otrosPerUnit
    const costoProducto = Number(product.base_cost)

    // Pricing
    const precioSugerido = calcSuggestedPrice(costoTotal, margin)
    const discountTiers = settings.descuento_global_enabled ? (settings.descuentos_global ?? settings.descuentos_subli) : settings.descuentos_subli
    const descPorcentaje = getDiscount(discountTiers, quantity)
    const precioConDesc = precioSugerido * (1 - descPorcentaje)
    const subtotal = precioConDesc * quantity
    const ganancia = subtotal - costoTotal * quantity

    // Time (time_subli stored in seconds, convert to minutes)
    const timeMinutes = settings.setup_min + ((product.time_subli || 0) / 60) * quantity
    const timeHours = timeMinutes / 60
    const profitPerHour = timeHours > 0 ? ganancia / timeHours : 0

    setResult({
      costoPapel: costoPapel + costoTinta, costoTinta, costoProducto, costoMo: mo, costoMerma: cr,
      costoTotal, precioSugerido, precioConDesc, descPorcentaje, subtotal, ganancia,
      timeMinutes, profitPerHour, perSheet, sheetsNeeded, sheetRotated, sheetCols, sheetRows,
      amortizacion: amortizacion * quantity,
    })
  }, [settings, products, equipment, productId, quantity, designWidth, designHeight, margin, merma, mo, otrosGastos])

  return {
    productId, setProductId, quantity, setQuantity,
    designWidth, setDesignWidth, designHeight, setDesignHeight,
    margin, setMargin, merma, setMerma, mo, setMo,
    otrosGastos, setOtrosGastos, result,
  }
}
