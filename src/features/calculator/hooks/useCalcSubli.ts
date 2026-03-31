'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcSuggestedPrice, getDiscount, DEFAULT_SETTINGS, type WorkshopSettings } from '@/features/presupuesto/types'

export interface CalcSubliResult {
  costoPapel: number
  costoTinta: number
  costoProducto: number
  costoTotal: number
  precioSugerido: number
  precioConDesc: number
  descPorcentaje: number
  subtotal: number
  ganancia: number
  timeMinutes: number
  profitPerHour: number
  perSheet: number
  sheetRotated: boolean
  sheetCols: number
  sheetRows: number
  amortizacion: number
}

export function calcNesting(dw: number, dh: number, sw = 21, sh = 29.7) {
  const a = Math.floor(sw / dw) * Math.floor(sh / dh)
  const b = Math.floor(sw / dh) * Math.floor(sh / dw)
  const rotated = b > a
  if (rotated) {
    return { count: Math.max(b, 1), rotated: true, cols: Math.floor(sw / dh), rows: Math.floor(sh / dw) }
  }
  return { count: Math.max(a, 1), rotated: false, cols: Math.floor(sw / dw), rows: Math.floor(sh / dh) }
}

export function useCalcSubli(settings: WorkshopSettings, products: any[], equipment: any[]) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [designWidth, setDesignWidth] = useState(9)
  const [designHeight, setDesignHeight] = useState(20)
  const [margin, setMargin] = useState(50)
  const [merma, setMerma] = useState(3)
  const [mo, setMo] = useState(0)
  const [electricidad, setElectricidad] = useState(0)
  const [otrosInsumos, setOtrosInsumos] = useState(0)
  const [packaging, setPackaging] = useState(0)
  const [otrosGastos, setOtrosGastos] = useState(0)
  const [comision, setComision] = useState(0)
  const [pressId, setPressId] = useState('')
  const [result, setResult] = useState<CalcSubliResult | null>(null)

  useEffect(() => {
    if (products.length && !productId) setProductId(products[0].id)
  }, [products])

  useEffect(() => {
    if (equipment.length && !pressId) {
      const flat = equipment.find((e: any) => e.type === 'press_flat' || e.type === 'press_mug')
      if (flat) setPressId(flat.id)
    }
  }, [equipment])

  useEffect(() => {
    const product = products.find(p => p.id === productId)
    if (!product) { setResult(null); return }

    // Nesting
    const nesting = calcNesting(designWidth, designHeight)
    const perSheet = Math.max(nesting.count, 1)

    // Paper & ink cost per unit
    const precioHoja = settings.subli_papel_precio / settings.subli_papel_hojas
    const precioTinta = settings.subli_tinta_precio / settings.subli_tinta_rendimiento
    const costoPapel = precioHoja / perSheet
    const costoTinta = precioTinta / perSheet

    // Equipment amortization
    const printer = equipment.find((e: any) => e.type === 'printer_subli')
    const press = equipment.find((e: any) => e.id === pressId)
    const ai = printer ? printer.cost / printer.lifespan_uses : 0
    const ap = press ? press.cost / press.lifespan_uses : 0
    const amortizacion = ai + ap

    // Materials cost
    const ci = Number(product.base_cost) + costoPapel + costoTinta + otrosInsumos + packaging

    // Waste
    const cr = (ci + mo + electricidad) * (merma / 100)

    // Production cost
    const cprod = mo + electricidad + amortizacion + otrosGastos + cr

    // Total cost
    const costoTotal = ci + cprod
    const costoProducto = Number(product.base_cost)

    // Pricing
    const precioSugerido = calcSuggestedPrice(costoTotal, margin)
    const descPorcentaje = getDiscount(settings.descuentos_subli, quantity)
    const precioConDesc = precioSugerido * (1 - descPorcentaje)
    const subtotal = precioConDesc * quantity
    const ganancia = (subtotal - subtotal * (comision / 100)) - costoTotal * quantity

    // Time
    const timeMinutes = settings.setup_min + (product.time_subli || 0) * quantity
    const timeHours = timeMinutes / 60
    const profitPerHour = timeHours > 0 ? ganancia / timeHours : 0

    setResult({
      costoPapel: costoPapel + costoTinta,
      costoTinta,
      costoProducto,
      costoTotal,
      precioSugerido,
      precioConDesc,
      descPorcentaje,
      subtotal,
      ganancia,
      timeMinutes,
      profitPerHour,
      perSheet,
      sheetRotated: nesting.rotated,
      sheetCols: nesting.cols,
      sheetRows: nesting.rows,
      amortizacion: amortizacion * quantity,
    })
  }, [settings, products, equipment, productId, quantity, designWidth, designHeight, margin, merma, mo, electricidad, otrosInsumos, packaging, otrosGastos, comision, pressId])

  return {
    productId, setProductId,
    quantity, setQuantity,
    designWidth, setDesignWidth,
    designHeight, setDesignHeight,
    margin, setMargin,
    merma, setMerma,
    mo, setMo,
    electricidad, setElectricidad,
    otrosInsumos, setOtrosInsumos,
    packaging, setPackaging,
    otrosGastos, setOtrosGastos,
    comision, setComision,
    pressId, setPressId,
    result,
  }
}
