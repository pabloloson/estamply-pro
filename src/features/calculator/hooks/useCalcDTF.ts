'use client'

import { useState, useEffect } from 'react'
import { calcSuggestedPrice, getDiscount, type WorkshopSettings } from '@/features/presupuesto/types'

export type DTFMode = 'tercerizado' | 'propia'

export interface CalcDTFResult {
  costoDiseño: number
  costoProducto: number
  costoTotal: number
  precioSugerido: number
  precioConDesc: number
  descPorcentaje: number
  subtotal: number
  ganancia: number
  timeMinutes: number
  profitPerHour: number
}

export function useCalcDTF(settings: WorkshopSettings, products: any[]) {
  const [productId, setProductId] = useState('')
  const [modo, setModo] = useState<DTFMode>('tercerizado')
  const [quantity, setQuantity] = useState(10)
  const [designWidth, setDesignWidth] = useState(25)
  const [designHeight, setDesignHeight] = useState(30)
  // Tercerizado
  const [precioMetro, setPrecioMetro] = useState(settings.dtf_precio_metro)
  const [anchoRollo, setAnchoRollo] = useState(settings.dtf_ancho_rollo)
  // Propia
  const [filmCosto, setFilmCosto] = useState(settings.dtf_film_costo)
  const [tintaCosto, setTintaCosto] = useState(settings.dtf_tinta_costo)
  const [polvoCosto, setPolvoCosto] = useState(settings.dtf_polvo_costo)
  const [amortImpresora, setAmortImpresora] = useState(settings.dtf_amort_impresora)
  const [amortHorno, setAmortHorno] = useState(settings.dtf_amort_horno)
  // Shared
  const [margin, setMargin] = useState(50)
  const [merma, setMerma] = useState(3)
  const [mo, setMo] = useState(0)
  const [electricidad, setElectricidad] = useState(0)
  const [result, setResult] = useState<CalcDTFResult | null>(null)

  useEffect(() => {
    if (products.length && !productId) setProductId(products[0].id)
  }, [products])

  useEffect(() => {
    setPrecioMetro(settings.dtf_precio_metro)
    setAnchoRollo(settings.dtf_ancho_rollo)
    setFilmCosto(settings.dtf_film_costo)
    setTintaCosto(settings.dtf_tinta_costo)
    setPolvoCosto(settings.dtf_polvo_costo)
    setAmortImpresora(settings.dtf_amort_impresora)
    setAmortHorno(settings.dtf_amort_horno)
  }, [settings])

  useEffect(() => {
    const product = products.find(p => p.id === productId)
    if (!product) { setResult(null); return }

    // Design cost
    const prop = (designWidth * designHeight) / (anchoRollo * 100)
    const costoDiseño = modo === 'tercerizado'
      ? prop * precioMetro
      : filmCosto + tintaCosto + polvoCosto + amortImpresora + amortHorno

    const costoProducto = Number(product.base_cost)
    const costoTotal = (costoDiseño + costoProducto + mo + electricidad) * (1 + merma / 100)

    const precioSugerido = calcSuggestedPrice(costoTotal, margin)
    const descPorcentaje = getDiscount(settings.descuentos_dtf, quantity)
    const precioConDesc = precioSugerido * (1 - descPorcentaje)
    const subtotal = precioConDesc * quantity
    const ganancia = subtotal - costoTotal * quantity

    const timeMinutes = settings.setup_min + (product.time_dtf || 0) * quantity
    const timeHours = timeMinutes / 60
    const profitPerHour = timeHours > 0 ? ganancia / timeHours : 0

    setResult({ costoDiseño, costoProducto, costoTotal, precioSugerido, precioConDesc, descPorcentaje, subtotal, ganancia, timeMinutes, profitPerHour })
  }, [settings, products, productId, modo, quantity, designWidth, designHeight, precioMetro, anchoRollo, filmCosto, tintaCosto, polvoCosto, amortImpresora, amortHorno, margin, merma, mo, electricidad])

  return {
    productId, setProductId,
    modo, setModo,
    quantity, setQuantity,
    designWidth, setDesignWidth,
    designHeight, setDesignHeight,
    precioMetro, setPrecioMetro,
    anchoRollo, setAnchoRollo,
    filmCosto, setFilmCosto,
    tintaCosto, setTintaCosto,
    polvoCosto, setPolvoCosto,
    amortImpresora, setAmortImpresora,
    amortHorno, setAmortHorno,
    margin, setMargin,
    merma, setMerma,
    mo, setMo,
    electricidad, setElectricidad,
    result,
  }
}
