'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Technique, Product, Equipment, WorkshopSettings, CalcResult, NestingResult } from '../types'

// A4 sheet dimensions in cm
const A4_WIDTH = 21
const A4_HEIGHT = 29.7

export function calcDesignsPerSheet(dw: number, dh: number, sw = A4_WIDTH, sh = A4_HEIGHT): NestingResult {
  // Normal orientation
  const normalCols = Math.floor(sw / dw)
  const normalRows = Math.floor(sh / dh)
  const normalCount = normalCols * normalRows

  // Rotated 90° orientation
  const rotCols = Math.floor(sw / dh)
  const rotRows = Math.floor(sh / dw)
  const rotCount = rotCols * rotRows

  if (rotCount > normalCount) {
    return { count: rotCount, rotated: true, cols: rotCols, rows: rotRows }
  }
  return { count: normalCount, rotated: false, cols: normalCols, rows: normalRows }
}

export function useCalculator() {
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [settings, setSettings] = useState<WorkshopSettings>({})
  const [loading, setLoading] = useState(true)

  // Form state
  const [technique, setTechnique] = useState<Technique>('subli')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [designWidth, setDesignWidth] = useState(20)  // cm
  const [designHeight, setDesignHeight] = useState(28) // cm
  const [margin, setMargin] = useState(40) // %
  const [merma, setMerma] = useState(5)   // %
  const [peelTime, setPeelTime] = useState(0) // min extra for vinyl

  const [result, setResult] = useState<CalcResult | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: equips }, { data: ws }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('equipment').select('*'),
        supabase.from('workshop_settings').select('settings').single(),
      ])
      setProducts(prods || [])
      setEquipment(equips || [])
      setSettings((ws?.settings as WorkshopSettings) || {})
      if (prods && prods.length > 0) setProductId(prods[0].id)
      setLoading(false)
    }
    load()
  }, [])

  const calculate = useCallback(() => {
    const product = products.find(p => p.id === productId)
    if (!product) { setResult(null); return }

    const {
      paper_cost = 100,
      ink_cost = 55,
      dtf_meter_cost = 15000,
      vinyl_meter_cost = 8000,
      setup_min = 15,
    } = settings

    const mermaFactor = 1 + merma / 100
    const marginFactor = 1 + margin / 100

    let suppliesCost = 0
    let amortizationCost = 0
    let timeMinutes = 0
    let designsPerSheet: number | undefined
    let sheetRotated: boolean | undefined
    let sheetCols: number | undefined
    let sheetRows: number | undefined

    // Find press equipment for product
    const pressEquip = equipment.find(e => e.id === product.press_equipment_id)
    const pressAmortPerUse = pressEquip ? pressEquip.cost / pressEquip.lifespan_uses : 0

    if (technique === 'subli') {
      // Calculate nesting
      const nesting = calcDesignsPerSheet(designWidth, designHeight)
      designsPerSheet = nesting.count
      sheetRotated = nesting.rotated
      sheetCols = nesting.cols
      sheetRows = nesting.rows

      const sheetsNeeded = Math.ceil(quantity / Math.max(nesting.count, 1))

      // Find sublimation printer
      const printer = equipment.find(e => e.type === 'printer_subli')
      const printerAmortPerUse = printer ? printer.cost / printer.lifespan_uses : 0

      suppliesCost = (sheetsNeeded * (paper_cost + ink_cost)) * mermaFactor
      amortizationCost = quantity * (printerAmortPerUse + pressAmortPerUse)
      timeMinutes = setup_min + product.time_subli * quantity

    } else if (technique === 'dtf') {
      // DTF: price by linear meter. Design area in m²
      const designAreaM2 = (designWidth / 100) * (designHeight / 100)
      const dtfCostPerUnit = dtf_meter_cost * designAreaM2

      // Find DTF printer
      const printer = equipment.find(e => e.type === 'printer_dtf')
      const printerAmortPerUse = printer ? printer.cost / printer.lifespan_uses : 0

      suppliesCost = dtfCostPerUnit * quantity * mermaFactor
      amortizationCost = quantity * (printerAmortPerUse + pressAmortPerUse)
      timeMinutes = setup_min + product.time_dtf * quantity

    } else if (technique === 'vinyl') {
      const designAreaM2 = (designWidth / 100) * (designHeight / 100)
      const vinylCostPerUnit = vinyl_meter_cost * designAreaM2

      // Find plotter
      const plotter = equipment.find(e => e.type === 'plotter')
      const plotterAmortPerUse = plotter ? plotter.cost / plotter.lifespan_uses : 0

      suppliesCost = vinylCostPerUnit * quantity * mermaFactor
      amortizationCost = quantity * (plotterAmortPerUse + pressAmortPerUse)
      timeMinutes = setup_min + (product.time_vinyl + peelTime) * quantity
    }

    const productCost = product.base_cost * quantity
    const totalCost = productCost + suppliesCost + amortizationCost
    const suggestedPrice = totalCost * marginFactor
    const timeHours = timeMinutes / 60
    const profit = suggestedPrice - totalCost
    const profitPerHour = timeHours > 0 ? profit / timeHours : 0

    setResult({
      productCost,
      suppliesCost,
      amortizationCost,
      totalCost,
      suggestedPrice,
      timeMinutes,
      profitPerHour,
      designsPerSheet,
      sheetRotated,
      sheetCols,
      sheetRows,
    })
  }, [products, equipment, settings, productId, quantity, technique, designWidth, designHeight, margin, merma, peelTime])

  useEffect(() => {
    calculate()
  }, [calculate])

  return {
    // Data
    products, equipment, settings, loading,
    // Form state
    technique, setTechnique,
    productId, setProductId,
    quantity, setQuantity,
    designWidth, setDesignWidth,
    designHeight, setDesignHeight,
    margin, setMargin,
    merma, setMerma,
    peelTime, setPeelTime,
    // Result
    result,
    // Nesting util
    calcDesignsPerSheet,
    A4_WIDTH,
    A4_HEIGHT,
  }
}
