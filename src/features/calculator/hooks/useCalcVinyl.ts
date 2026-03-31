'use client'

import { useState, useEffect } from 'react'
import { calcSuggestedPrice, getDiscount, type WorkshopSettings } from '@/features/presupuesto/types'

export interface VinylColor {
  nombre: string
  tipo: string
  precioMetro: number
  anchoRollo: number
  ancho: number
  alto: number
}

export const VINYL_TIPOS = ['Liso', 'Glitter', 'Flock', 'Metalizado', 'Refractivo', 'Holográfico']

const defaultColor = (pm: number, ar: number): VinylColor => ({
  nombre: 'Color', tipo: 'Liso', precioMetro: pm, anchoRollo: ar, ancho: 10, alto: 10,
})

export interface CalcVinylResult {
  costoViniloPorColor: number[]
  costoViniloTotal: number
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

export function useCalcVinyl(settings: WorkshopSettings, products: any[]) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(10)
  const [numColors, setNumColors] = useState(2)
  const [colors, setColors] = useState<VinylColor[]>([
    { nombre: 'Negro', tipo: 'Liso', precioMetro: settings.vinyl_precio_metro, anchoRollo: settings.vinyl_ancho_rollo, ancho: 20, alto: 15 },
    { nombre: 'Rojo', tipo: 'Liso', precioMetro: settings.vinyl_precio_metro, anchoRollo: settings.vinyl_ancho_rollo, ancho: 12, alto: 10 },
  ])
  const [mo, setMo] = useState(500)
  const [merma, setMerma] = useState(5)
  const [margin, setMargin] = useState(60)
  const [peelTime, setPeelTime] = useState(0)
  const [result, setResult] = useState<CalcVinylResult | null>(null)

  useEffect(() => {
    if (products.length && !productId) setProductId(products[0].id)
  }, [products])

  // Sync colors array length with numColors
  useEffect(() => {
    setColors(prev => {
      if (numColors > prev.length) {
        return [...prev, ...Array.from({ length: numColors - prev.length }, () =>
          defaultColor(settings.vinyl_precio_metro, settings.vinyl_ancho_rollo)
        )]
      }
      return prev.slice(0, numColors)
    })
  }, [numColors])

  const updateColor = (i: number, field: keyof VinylColor, value: string | number) => {
    setColors(prev => prev.map((c, j) => j === i ? { ...c, [field]: value } : c))
  }

  useEffect(() => {
    const product = products.find(p => p.id === productId)
    if (!product) { setResult(null); return }

    const costoViniloPorColor = colors.slice(0, numColors).map(c =>
      (c.ancho * c.alto) / (c.anchoRollo * 100) * c.precioMetro
    )
    const costoViniloTotal = costoViniloPorColor.reduce((s, c) => s + c, 0)
    const costoProducto = Number(product.base_cost)
    const costoTotal = (costoViniloTotal + costoProducto + mo) * (1 + merma / 100)

    const precioSugerido = calcSuggestedPrice(costoTotal, margin)
    const descPorcentaje = getDiscount(settings.descuentos_vinyl, quantity)
    const precioConDesc = precioSugerido * (1 - descPorcentaje)
    const subtotal = precioConDesc * quantity
    const ganancia = subtotal - costoTotal * quantity

    const timeMinutes = settings.setup_min + ((product.time_vinyl || 0) + peelTime) * quantity
    const timeHours = timeMinutes / 60
    const profitPerHour = timeHours > 0 ? ganancia / timeHours : 0

    setResult({ costoViniloPorColor, costoViniloTotal, costoProducto, costoTotal, precioSugerido, precioConDesc, descPorcentaje, subtotal, ganancia, timeMinutes, profitPerHour })
  }, [settings, products, productId, quantity, numColors, colors, mo, merma, margin, peelTime])

  return {
    productId, setProductId,
    quantity, setQuantity,
    numColors, setNumColors,
    colors, updateColor,
    mo, setMo,
    merma, setMerma,
    margin, setMargin,
    peelTime, setPeelTime,
    result,
  }
}
