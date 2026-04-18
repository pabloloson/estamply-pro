import { calcSuggestedPrice, getDiscount, type DiscountTier } from '@/features/presupuesto/types'
import type { TecnicaConfig, SubliConfig, DTFConfig, DTFUVConfig, VinylConfig, SerigrafiaConfig, CostResult, Insumo } from '../types'

// ── Physical constants ──
const PRINTER_MARGIN = 0.5
const PLOTTER_MARGIN = 1.5

// ── Nesting ──

export function calcSheetNesting(dw: number, dh: number, sw: number, sh: number, margin = PRINTER_MARGIN) {
  const pw = sw - margin * 2, ph = sh - margin * 2
  const a = Math.floor(pw / dw) * Math.floor(ph / dh)
  const b = Math.floor(pw / dh) * Math.floor(ph / dw)
  if (b > a) return { count: Math.max(b, 1), rotated: true, cols: Math.floor(pw / dh), rows: Math.floor(ph / dw) }
  return { count: Math.max(a, 1), rotated: false, cols: Math.floor(pw / dw), rows: Math.floor(ph / dh) }
}


export function calcRollNesting(dw: number, dh: number, rollW: number, qty: number, edgeM: number, gap: number) {
  const u = rollW - edgeM * 2
  const cA = Math.max(Math.floor((u + gap) / (dw + gap)), 0), rA = cA > 0 ? Math.ceil(qty / cA) : Infinity, lA = cA > 0 ? edgeM * 2 + rA * dh + Math.max(rA - 1, 0) * gap : Infinity
  const cB = Math.max(Math.floor((u + gap) / (dh + gap)), 0), rB = cB > 0 ? Math.ceil(qty / cB) : Infinity, lB = cB > 0 ? edgeM * 2 + rB * dw + Math.max(rB - 1, 0) * gap : Infinity
  if (lA <= lB && cA > 0) return { cols: cA, rows: rA, rotated: false, lengthCm: lA }
  if (cB > 0) return { cols: cB, rows: rB, rotated: true, lengthCm: lB }
  return { cols: 1, rows: qty, rotated: false, lengthCm: edgeM * 2 + qty * dh + Math.max(qty - 1, 0) * gap }
}

// ── Input ──

export interface ComputeInput {
  config: TecnicaConfig
  product: { base_cost: number; press_equipment_id?: string | null; moneda?: string; [k: string]: unknown }
  equipment: Array<{ id: string; type: string; clasificacion: string; cost: number; lifespan_uses: number; tecnicas_slugs?: string[]; moneda?: string; print_time_sec?: number }>
  techniqueEquipmentIds: string[]
  insumos: Insumo[]
  quantity: number
  designWidth: number
  designHeight: number
  numColors: number
  margin: number
  mo: number
  otrosGastos: number
  setupMin: number
  discountTiers: DiscountTier[]
  tipoCambio?: number  // exchange rate: 1 USD = X local. Default 1 (no conversion)
  redondeo_precios?: 'none' | 'integer' | 'tens' | 'hundreds'
  pricingMode?: 'margin' | 'markup'
  vinylSelections?: Array<{ materialIdx: number; colorIdx: number; ancho: number; alto: number }>
  // Zones for subli/dtf (multiple stamping areas per unit)
  zones?: Array<{ ancho: number; alto: number; ubicacion?: string }>
  // Overrides (if provided, replace computed values)
  overrideMerma?: number | null       // null = use technique default
  overrideAmortPrint?: number | null   // $/uso override for printer
  overrideAmortPress?: number | null   // $/uso override for press
  overrideCostoPantalla?: number | null // serigrafía only
}

export function computeCost(input: ComputeInput): CostResult {
  const { config } = input
  const tc = Math.max(input.tipoCambio || 1, 0.0001)

  // Pre-convert insumo prices from USD to local if needed
  const convertedInsumos: Insumo[] = tc > 1 ? input.insumos.map(ins => {
    if (ins.moneda !== 'USD') return ins
    const cfg = { ...ins.config } as Record<string, unknown>
    // Multiply all price fields by exchange rate
    for (const key of Object.keys(cfg)) {
      if ((key.startsWith('precio') || key === 'precio_metro' || key === 'precio_kg') && typeof cfg[key] === 'number') {
        cfg[key] = (cfg[key] as number) * tc
      }
    }
    return { ...ins, config: cfg as typeof ins.config, moneda: 'local' as const }
  }) : input.insumos

  // Pre-convert product base cost
  const convertedProduct = tc > 1 && input.product.moneda === 'USD'
    ? { ...input.product, base_cost: input.product.base_cost * tc }
    : input.product

  // Pre-convert equipment costs
  const convertedEquipment = tc > 1 ? input.equipment.map(eq =>
    eq.moneda === 'USD' ? { ...eq, cost: eq.cost * tc } : eq
  ) : input.equipment

  const converted = { ...input, insumos: convertedInsumos, product: convertedProduct, equipment: convertedEquipment }
  const redondeo = input.redondeo_precios || 'none'

  let result: CostResult
  switch (config.tipo) {
    case 'subli': result = computeSubli(converted, config); break
    case 'dtf': case 'dtf_uv': result = computeDTF(converted, config); break
    case 'vinyl': result = computeVinyl(converted, config); break
    case 'serigrafia': result = computeSerigrafia(converted, config); break
  }

  // Apply rounding to suggested price
  if (redondeo !== 'none' && result.precioSugerido) {
    result = { ...result, precioSugerido: applyRounding(result.precioSugerido, redondeo) }
  }
  return result
}

// ── Helpers to read insumo data ──

function findInsumo(insumos: Insumo[], ...tipos: string[]) { return insumos.find(i => tipos.includes(i.tipo)) }
function insCfg(ins: Insumo | undefined) { return (ins?.config || {}) as Record<string, unknown> }

// Currency conversion: multiply by exchange rate if insumo/product is in USD
function fx(amount: number, moneda: string | undefined, tc: number) {
  return moneda === 'USD' && tc > 1 ? amount * tc : amount
}
function fxIns(ins: Insumo | undefined, tc: number) {
  return ins?.moneda === 'USD' && tc > 1 ? tc : 1
}

// Price rounding
function applyRounding(value: number, mode: string): number {
  switch (mode) {
    case 'integer': return Math.round(value)
    case 'tens': return Math.round(value / 10) * 10
    case 'hundreds': return Math.round(value / 100) * 100
    default: return value
  }
}

function getAmort(equipment: Array<{ id: string; type?: string; clasificacion?: string; cost: number; lifespan_uses: number }>, ids: string[]) {
  // Only sum printers/plotters — presses are handled separately by getPressAmort
  return ids.reduce((sum, id) => {
    const eq = equipment.find(e => e.id === id)
    if (!eq) return sum
    const isPrinterOrPlotter = (eq.type || '').startsWith('printer') || (eq.type || '').startsWith('plotter') || eq.clasificacion === 'impresora' || eq.clasificacion === 'plotter'
    return isPrinterOrPlotter ? sum + (eq.cost / eq.lifespan_uses) : sum
  }, 0)
}

function getPressAmort(product: ComputeInput['product'], equipment: ComputeInput['equipment'], slug: string) {
  if (!product.press_equipment_id) return 0
  const press = equipment.find(e => e.id === product.press_equipment_id)
  if (!press) return 0
  if (press.tecnicas_slugs && !press.tecnicas_slugs.includes(slug)) return 0
  const perUse = press.cost / press.lifespan_uses
  const unidadesPorPlanchada = (product.unidades_por_planchada as number) || 1
  return perUse / unidadesPorPlanchada
}

// ── Sublimación helpers ──

function calcSubliZone(dw: number, dh: number, qty: number, config: SubliConfig, insumos: Insumo[]) {
  const papel = findInsumo(insumos, 'papel'), tinta = findInsumo(insumos, 'tinta')
  const pc = insCfg(papel), tc = insCfg(tinta)
  let costoPapel = 0, perSheet = 1, sheetsNeeded = 1, sheetRotated = false, sheetCols = 1, sheetRows = 1
  let isRollo = false, rollW = 0, rollCols = 0, rollRows = 0, rollRotated = false, metrosLineales = 0

  if (papel) {
    if (pc.formato === 'rollo') {
      isRollo = true
      rollW = (pc.rollo_ancho as number) || 61
      const gap = config.margen_seguridad ?? PRINTER_MARGIN
      const rn = calcRollNesting(dw, dh, rollW, qty, gap, gap)
      metrosLineales = rn.lengthCm / 100
      rollCols = rn.cols; rollRows = rn.rows; rollRotated = rn.rotated
      const rLcm = ((pc.rollo_largo as number) || 100) * 100
      const costPerCm = ((pc.precio_rollo as number) || 0) / Math.max(rLcm, 1)
      costoPapel = (rn.lengthCm * costPerCm) / qty
    } else {
      const sW = (pc.ancho as number) || 21, sH = (pc.alto as number) || 29.7
      const n = calcSheetNesting(dw, dh, sW, sH, config.margen_seguridad ?? PRINTER_MARGIN)
      perSheet = Math.max(n.count, 1); sheetRotated = n.rotated; sheetCols = n.cols; sheetRows = n.rows
      sheetsNeeded = Math.ceil(qty / perSheet)
      costoPapel = (sheetsNeeded * ((pc.precio_resma as number) || 0) / Math.max((pc.hojas_resma as number) || 1, 1)) / qty
    }
  }
  let costoTinta = 0
  if (tinta) {
    const refArea = ((pc.ancho as number) || 21) * ((pc.alto as number) || 29.7)
    const gap = config.margen_seguridad ?? PRINTER_MARGIN
    const printedArea = (dw + gap * 2) * (dh + gap * 2)
    costoTinta = (printedArea / (Math.max((tc.rendimiento as number) || 1, 1) * refArea)) * ((tc.precio as number) || 0)
  }
  return { papelTinta: costoPapel + costoTinta, costoPapel, costoTinta, perSheet, sheetsNeeded, sheetRotated, sheetCols, sheetRows, isRollo, rollW, rollCols, rollRows, rollRotated, metrosLineales }
}

// ── Sublimación ──

function computeSubli(input: ComputeInput, config: SubliConfig): CostResult {
  const { product, equipment, insumos, quantity, designWidth, designHeight, margin, mo, otrosGastos, setupMin, discountTiers, techniqueEquipmentIds, zones } = input
  const desperdicio = input.overrideMerma ?? config.desperdicio_pct ?? 5
  const amortPress = input.overrideAmortPress ?? getPressAmort(product, equipment, 'subli')
  const costoProducto = Number(product.base_cost)

  // Tercerizado mode — simplified
  if (config.modo === 'tercerizado') {
    const servicioIns = findInsumo(insumos, 'servicio_impresion', 'otro')
    const sc = servicioIns ? insCfg(servicioIns) : null
    const costoTerc = sc ? ((sc.precio_metro as number) || (sc.precio as number) || 0) : 0
    const costoDesp = (costoProducto + costoTerc + amortPress) * (desperdicio / 100)
    const lines: { label: string; value: number }[] = [
      { label: 'Producto base', value: costoProducto },
      { label: 'Impresión tercerizada', value: costoTerc },
    ]
    if (amortPress > 0) lines.push({ label: 'Amort. plancha', value: amortPress })
    if (costoDesp > 0) lines.push({ label: `Desperdicio (${desperdicio}%)`, value: costoDesp })
    if (mo > 0) lines.push({ label: 'Mano de obra', value: mo })
    if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })
    const costoTotal = costoProducto + costoTerc + amortPress + costoDesp + mo + otrosGastos / Math.max(quantity, 1)
    const pressTimeMin = (((product.time_subli as number) || 0) / 60) * quantity
    const timeMinutes = setupMin + pressTimeMin
    const r = buildResult(lines, costoTotal, margin, quantity, discountTiers, timeMinutes, undefined, input.pricingMode)
    r.timeBreakdown = { prepMin: setupMin, printMin: 0, pressMin: pressTimeMin }
    return r
  }

  const amortEquip = input.overrideAmortPrint ?? getAmort(equipment, techniqueEquipmentIds)

  const effectiveZones = (zones && zones.length > 1) ? zones : [{ ancho: designWidth, alto: designHeight }]
  const numZones = effectiveZones.length
  const isMultiZone = numZones > 1

  // Calculate per-zone nesting (for individual zone visuals)
  const zoneResults: Array<ReturnType<typeof calcSubliZone>> = []
  effectiveZones.forEach(zone => {
    const z = calcSubliZone(zone.ancho, zone.alto, quantity, config, insumos)
    zoneResults.push(z)
  })

  // Separate papel and tinta totals
  const totalPapel = zoneResults.reduce((s, z) => s + z.costoPapel, 0)
  const totalTinta = zoneResults.reduce((s, z) => s + z.costoTinta, 0)
  const totalPapelTinta = totalPapel + totalTinta

  // Detect if papel is roll or sheets
  const subliIsRollo = zoneResults.length > 0 && zoneResults[0].isRollo
  const totalHojas = zoneResults.reduce((s, z) => s + z.sheetsNeeded, 0)
  const totalMetrosSubli = zoneResults.reduce((s, z) => s + z.metrosLineales, 0)

  // Resource-based desglose (NOT zone-based)
  const totalAmortPress = amortPress * numZones
  const subtotalPreDesp = costoProducto + totalPapelTinta + totalAmortPress + amortEquip
  const costoDesp = subtotalPreDesp * (desperdicio / 100)
  const moAdjusted = mo * numZones

  const lines: { label: string; value: number }[] = [{ label: 'Producto base', value: costoProducto }]
  // Papel line with consumption info
  let papelLabel: string
  if (subliIsRollo) {
    papelLabel = isMultiZone ? `Papel (${totalMetrosSubli.toFixed(2)}m, ${numZones} zonas)` : `Papel (${totalMetrosSubli.toFixed(2)}m)`
  } else {
    papelLabel = isMultiZone ? `Papel (${totalHojas} hojas, ${numZones} zonas)` : `Papel (${totalHojas} hojas)`
  }
  lines.push({ label: papelLabel, value: totalPapel })
  if (totalTinta > 0) lines.push({ label: 'Tinta', value: totalTinta })
  if (totalAmortPress > 0) lines.push({ label: `Amort. plancha${isMultiZone ? ` (×${numZones})` : ''}`, value: totalAmortPress })
  if (amortEquip > 0) lines.push({ label: 'Amort. impresora', value: amortEquip })
  if (costoDesp > 0) lines.push({ label: `Desperdicio (${desperdicio}%)`, value: costoDesp })
  if (moAdjusted > 0) lines.push({ label: 'Mano de obra', value: moAdjusted })
  if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })

  const costoTotal = costoProducto + totalPapelTinta + totalAmortPress + amortEquip + costoDesp + moAdjusted + otrosGastos / Math.max(quantity, 1)
  // Time: prep + print + press
  const printer = equipment.find(e => techniqueEquipmentIds.includes(e.id) && (e.type?.startsWith('printer') || e.clasificacion === 'impresora'))
  const printTimeSec = printer?.print_time_sec || 0
  const printTimeMin = printTimeSec > 0 ? (printTimeSec * totalHojas) / 60 : 0
  const pressTimeMin = (((product.time_subli as number) || 0) / 60) * numZones * quantity
  const timeMinutes = setupMin + printTimeMin + pressTimeMin

  const fn = zoneResults.length > 0 ? zoneResults[0] : undefined
  let nesting: CostResult['nesting'] = undefined
  if (fn) {
    nesting = subliIsRollo
      ? { type: 'roll', cols: fn.rollCols, rows: fn.rollRows, rotated: fn.rollRotated, metrosLineales: fn.metrosLineales, anchoRollo: fn.rollW, quantity }
      : { type: 'sheet', cols: fn.sheetCols, rows: fn.sheetRows, rotated: fn.sheetRotated, perSheet: fn.perSheet, sheetsNeeded: totalHojas, quantity }
  }
  // Build per-zone nesting details for expandable view
  const zoneNesting = effectiveZones.map((zone, i) => {
    const zr = zoneResults[i]
    return {
      ubicacion: (zone as { ubicacion?: string }).ubicacion || '',
      ancho: zone.ancho, alto: zone.alto,
      cols: zr ? zr.sheetCols : 1, rows: zr ? zr.sheetRows : 1,
      rotated: zr ? zr.sheetRotated : false,
      perSheet: zr ? zr.perSheet : 1, sheetsNeeded: zr ? zr.sheetsNeeded : 0,
      costoPapel: zr ? zr.costoPapel : 0, costoTinta: zr ? zr.costoTinta : 0,
    }
  })
  const r = buildResult(lines, costoTotal, margin, quantity, discountTiers, timeMinutes, nesting, input.pricingMode)
  r.timeBreakdown = { prepMin: setupMin, printMin: printTimeMin, pressMin: pressTimeMin }
  r.zoneNesting = zoneNesting
  return r
}

// ── DTF / DTF UV ──

function computeDTFZone(dw: number, dh: number, qty: number, config: DTFConfig | DTFUVConfig, insumos: Insumo[], equipment: ComputeInput['equipment'], techniqueEquipmentIds: string[], overrideAmortPrint: number | null | undefined) {
  const gap = config.margen_seguridad ?? 1
  let rollW = 60
  const filmIns = findInsumo(insumos, 'film'), servicioIns = findInsumo(insumos, 'servicio_impresion', 'otro')
  if (filmIns) rollW = (insCfg(filmIns).ancho as number) || 60
  else if (servicioIns) rollW = (insCfg(servicioIns).ancho_material as number) || 60
  const cfgAny = config as unknown as Record<string, number>
  if (cfgAny.ancho_rollo) rollW = cfgAny.ancho_rollo

  const nesting = calcRollNesting(dw, dh, rollW, qty, gap, gap)
  const metrosLineales = nesting.lengthCm / 100

  let costoImpresion = 0, costoFilm = 0, costoTintaDTF = 0, costoPolvo = 0, costoAmortPrint = 0
  if (config.modo === 'tercerizado') {
    const terc = servicioIns
    const tc2 = terc ? insCfg(terc) : null
    const precio = tc2 ? ((tc2.precio_metro as number) || (tc2.precio as number) || 0) : (cfgAny.precio_metro as number) || 0
    costoImpresion = (metrosLineales * precio) / Math.max(qty, 1)
  } else {
    const consumedArea = (rollW / 100) * metrosLineales
    const film = findInsumo(insumos, 'film'), tinta = findInsumo(insumos, 'tinta'), polvo = findInsumo(insumos, 'polvo')
    const fc = insCfg(film), tc2 = insCfg(tinta), poc = insCfg(polvo)
    const filmArea = ((fc.ancho as number || 60) / 100) * ((fc.largo as number) || 100)
    costoFilm = filmArea > 0 ? ((consumedArea / filmArea) * ((fc.precio_rollo as number) || 0)) / Math.max(qty, 1) : 0
    // Tinta: if rendimiento is in hojas, use 1 hoja per design (qty); if in m², use consumedArea
    const tintaRend = (tc2.rendimiento as number) || 1
    const tintaUnit = (tc2.unidad_rendimiento as string) || 'hojas'
    if (tintaUnit === 'm2' || tintaUnit === 'm²') {
      costoTintaDTF = tintaRend > 0 ? ((consumedArea / tintaRend) * ((tc2.precio as number) || 0)) / Math.max(qty, 1) : 0
    } else {
      // hojas-based: each print run = 1 sheet equivalent per unit produced
      costoTintaDTF = tintaRend > 0 ? ((tc2.precio as number) || 0) / tintaRend : 0
    }
    costoPolvo = ((poc.rendimiento_m2 as number) || 1) > 0 ? ((consumedArea / (poc.rendimiento_m2 as number || 1)) * ((poc.precio_kg as number) || 0)) / Math.max(qty, 1) : 0
    costoAmortPrint = overrideAmortPrint ?? getAmort(equipment, techniqueEquipmentIds)
    costoImpresion = costoFilm + costoTintaDTF + costoPolvo + costoAmortPrint
  }
  return { costoImpresion, costoFilm, costoTintaDTF, costoPolvo, costoAmortPrint, nesting, metrosLineales, rollW }
}

function computeDTF(input: ComputeInput, config: DTFConfig | DTFUVConfig): CostResult {
  const { product, equipment, insumos, quantity, designWidth, designHeight, margin, mo, otrosGastos, setupMin, discountTiers, techniqueEquipmentIds, zones } = input
  const desperdicio = input.overrideMerma ?? config.desperdicio_pct ?? 10
  const slug = config.tipo
  // DTF UV prints directly on object — no press/plancha needed
  const amortPress = slug === 'dtf_uv' ? 0 : (input.overrideAmortPress ?? getPressAmort(product, equipment, slug))
  const costoProducto = Number(product.base_cost)

  const effectiveZones = (zones && zones.length > 1) ? zones : [{ ancho: designWidth, alto: designHeight }]
  const numZones = effectiveZones.length
  const isMultiZone = numZones > 1

  const lines: { label: string; value: number }[] = [{ label: 'Producto base', value: costoProducto }]
  let totalImpresion = 0, totalDesp = 0, totalAmortPress = 0
  const dtfZoneResults: Array<ReturnType<typeof computeDTFZone>> = []

  effectiveZones.forEach((zone, zi) => {
    const z = computeDTFZone(zone.ancho, zone.alto, quantity, config, insumos, equipment, techniqueEquipmentIds, input.overrideAmortPrint)
    dtfZoneResults.push(z)
    totalImpresion += z.costoImpresion
    totalAmortPress += amortPress
  })

  const totalMetros = dtfZoneResults.reduce((s, z) => s + z.metrosLineales, 0)
  const subtotalPreDespDTF = costoProducto + totalImpresion + totalAmortPress
  const costoDesp = subtotalPreDespDTF * (desperdicio / 100)
  const moAdjusted = mo * numZones
  const metrosStr = `${totalMetros.toFixed(2)}m`

  if (config.modo === 'tercerizado') {
    lines.push({ label: `Impresión tercerizada (${metrosStr}${isMultiZone ? `, ${numZones} zonas` : ''})`, value: totalImpresion })
  } else {
    // Separate component lines for propia
    const tFilm = dtfZoneResults.reduce((s, z) => s + z.costoFilm, 0)
    const tTinta = dtfZoneResults.reduce((s, z) => s + z.costoTintaDTF, 0)
    const tPolvo = dtfZoneResults.reduce((s, z) => s + z.costoPolvo, 0)
    const tAmortPrint = dtfZoneResults.reduce((s, z) => s + z.costoAmortPrint, 0)
    if (tFilm > 0) lines.push({ label: `Film ${slug === 'dtf_uv' ? 'UV' : 'DTF'} (${metrosStr})`, value: tFilm })
    if (tTinta > 0) lines.push({ label: 'Tinta', value: tTinta })
    if (tPolvo > 0) lines.push({ label: 'Polvo adhesivo', value: tPolvo })
    if (tAmortPrint > 0) lines.push({ label: `Amort. ${slug === 'dtf_uv' ? 'plotter UV' : 'plotter'}`, value: tAmortPrint })
  }
  if (totalAmortPress > 0) lines.push({ label: `Amort. plancha${numZones > 1 ? ` (×${numZones})` : ''}`, value: totalAmortPress })
  if (costoDesp > 0) lines.push({ label: `Desperdicio (${desperdicio}%)`, value: costoDesp })
  if (moAdjusted > 0) lines.push({ label: 'Mano de obra', value: moAdjusted })
  if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })

  const costoTotal = costoProducto + totalImpresion + totalAmortPress + costoDesp + moAdjusted + otrosGastos / Math.max(quantity, 1)

  const timeKey = 'time_dtf' // DTF UV uses same product handling time as DTF Textil
  const dtfPrinter = equipment.find(e => techniqueEquipmentIds.includes(e.id) && (e.type?.startsWith('printer') || e.clasificacion === 'impresora'))
  const dtfPrintTimeSec = dtfPrinter?.print_time_sec || 0
  const totalMetrosDTF = dtfZoneResults.reduce((s, z) => s + z.metrosLineales, 0)
  const dtfPrintTimeMin = dtfPrintTimeSec > 0 ? (dtfPrintTimeSec * totalMetrosDTF) / 60 : 0
  const dtfPressTimeMin = ((product[timeKey] as number || 0) / 60) * numZones * quantity
  const timeMinutes = setupMin + dtfPrintTimeMin + dtfPressTimeMin
  const noInsumos = insumos.length === 0

  const dfn = dtfZoneResults.length > 0 ? dtfZoneResults[0] : undefined
  let dtfNesting: CostResult['nesting'] = undefined
  if (dfn) {
    dtfNesting = { type: 'roll', cols: dfn.nesting.cols, rows: dfn.nesting.rows, rotated: dfn.nesting.rotated, metrosLineales: dfn.metrosLineales, anchoRollo: dfn.rollW, quantity }
  }
  const result = buildResult(lines, costoTotal, margin, quantity, discountTiers, timeMinutes, dtfNesting, input.pricingMode)
  result.timeBreakdown = { prepMin: setupMin, printMin: dtfPrintTimeMin, pressMin: dtfPressTimeMin }
  if (noInsumos) result.missingInsumosWarning = `Vinculá insumos en Técnicas → ${slug === 'dtf_uv' ? 'DTF UV' : 'DTF Textil'} para calcular correctamente`
  return result
}

// ── Vinilo ──

function computeVinyl(input: ComputeInput, config: VinylConfig): CostResult {
  const { product, equipment, insumos, quantity, margin, mo, otrosGastos, setupMin, discountTiers, vinylSelections, techniqueEquipmentIds } = input
  const desperdicio = input.overrideMerma ?? config.desperdicio_pelado_pct ?? 15
  const vinylInsumos = insumos.filter(i => i.tipo === 'vinilo')
  const sels = vinylSelections ?? []

  const vinylNesting = sels.map(sel => {
    const ins = vinylInsumos[sel.materialIdx]
    if (!ins || sel.ancho <= 0 || sel.alto <= 0) return { cols: 0, rows: 0, rotated: false, metrosLineales: 0, anchoRollo: 50, costoColor: 0 }
    const c = insCfg(ins)
    const anchoRollo = (c.ancho as number) || 50
    const precioMetro = (c.precio_metro as number) || 0
    const n = calcRollNesting(sel.ancho, sel.alto, anchoRollo, quantity, PLOTTER_MARGIN, 0.5)
    const ml = n.lengthCm / 100
    return { cols: n.cols, rows: n.rows, rotated: n.rotated, metrosLineales: ml, anchoRollo, costoColor: ml * precioMetro }
  })

  const costoViniloRaw = vinylNesting.reduce((s, n) => s + n.costoColor, 0) / Math.max(quantity, 1)
  const costoProducto = Number(product.base_cost)
  const amortPlotter = input.overrideAmortPrint ?? getAmort(equipment, techniqueEquipmentIds)
  const amortPress = input.overrideAmortPress ?? getPressAmort(product, equipment, 'vinyl')
  const costoDesp = (costoProducto + costoViniloRaw + amortPlotter + amortPress) * (desperdicio / 100)
  const costoTotal = costoProducto + costoViniloRaw + costoDesp + amortPlotter + amortPress + mo + otrosGastos / Math.max(quantity, 1)

  const totalMetrosVinyl = vinylNesting.reduce((s, n) => s + n.metrosLineales, 0)
  const lines = [{ label: 'Producto base', value: costoProducto }, { label: `Vinilo (${totalMetrosVinyl.toFixed(2)}m)`, value: costoViniloRaw }]
  if (costoDesp > 0) lines.push({ label: `Desperdicio (${desperdicio}%)`, value: costoDesp })
  if (amortPlotter > 0) lines.push({ label: 'Amort. plotter', value: amortPlotter })
  if (amortPress > 0) lines.push({ label: 'Amort. plancha', value: amortPress })
  if (mo > 0) lines.push({ label: 'Mano de obra', value: mo })
  if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })

  const r = { ...buildResult(lines, costoTotal, margin, quantity, discountTiers, setupMin + (((product.time_vinyl as number) || 0) / 60) * quantity, undefined, input.pricingMode), vinylNesting }
  if (vinylInsumos.length === 0) r.missingInsumosWarning = 'Vinculá materiales de vinilo en Técnicas → Vinilo para calcular correctamente'
  return r
}

// ── Serigrafía ──

function computeSerigrafia(input: ComputeInput, config: SerigrafiaConfig): CostResult {
  const { product, equipment, quantity, numColors, margin, mo, otrosGastos, setupMin, discountTiers, techniqueEquipmentIds, insumos } = input
  const desperdicio = input.overrideMerma ?? config.desperdicio_pct ?? 5
  const costoPantalla = input.overrideCostoPantalla ?? config.costo_pantalla_por_color ?? 5000
  const tiempoPrep = config.tiempo_preparacion_por_color ?? 600

  // Pedido mínimo validation
  const pedidoMin = config.pedido_minimo ?? 25
  if (quantity < pedidoMin) {
    return {
      costLines: [], costoTotal: 0, precioSugerido: 0, precioConDesc: 0, descPorcentaje: 0,
      subtotal: 0, ganancia: 0, timeMinutes: 0, profitPerHour: 0,
      pedidoMinimoWarning: `Serigrafía requiere un mínimo de ${pedidoMin} unidades`,
    }
  }

  // Setup cost divided by quantity
  const costoSetupPerUnit = (costoPantalla * numColors) / quantity
  const costoSetupTotal = costoPantalla * numColors

  // Tinta cost per unit — use tinta_serigrafica if available, fallback to generic tinta
  const tintaSeriIns = findInsumo(insumos, 'tinta_serigrafica', 'tinta')
  const tsc = tintaSeriIns ? insCfg(tintaSeriIns) : null
  let costoTintaPerColor = 80 // default fallback
  if (tsc) {
    if (tsc.precio_kg && tsc.rendimiento_estampadas_kg) {
      // tinta serigráfica: costo = precio_kg / rendimiento_est_kg
      costoTintaPerColor = (tsc.precio_kg as number) / Math.max(tsc.rendimiento_estampadas_kg as number, 1)
    } else if (tsc.precio) {
      costoTintaPerColor = (tsc.precio as number)
    }
  }
  const costoTintaPerUnit = costoTintaPerColor * numColors

  const costoProducto = Number(product.base_cost)
  const amortEquip = input.overrideAmortPrint ?? getAmort(equipment, techniqueEquipmentIds)
  const amortPress = input.overrideAmortPress ?? getPressAmort(product, equipment, 'serigrafia')

  const costoBase = costoSetupPerUnit + costoTintaPerUnit + amortEquip + amortPress
  const costoDesp = (costoProducto + costoBase) * (desperdicio / 100)
  const costoTotal = costoProducto + costoBase + costoDesp + mo + otrosGastos / Math.max(quantity, 1)

  const lines = [
    { label: 'Producto base', value: costoProducto },
    { label: `Pantallas (${numColors} col. × $${costoPantalla.toLocaleString('es-AR')} / ${quantity} u.)`, value: costoSetupPerUnit },
    { label: `Tinta (${numColors} colores × $${costoTintaPerColor})`, value: costoTintaPerUnit },
  ]
  if (amortEquip > 0) lines.push({ label: 'Amort. pulpo', value: amortEquip })
  if (amortPress > 0) lines.push({ label: 'Amort. plancha', value: amortPress })
  if (costoDesp > 0) lines.push({ label: `Desperdicio (${desperdicio}%)`, value: costoDesp })
  if (mo > 0) lines.push({ label: 'Mano de obra', value: mo })
  if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })

  // Time: setup (fixed) + production (per unit * colors)
  const timeSetupMin = (tiempoPrep * numColors) / 60
  const timeProdPerUnit = ((product.time_serigrafia as number) || 15) / 60 * numColors
  const timeMinutes = setupMin + timeSetupMin + timeProdPerUnit * quantity

  return { ...buildResult(lines, costoTotal, margin, quantity, discountTiers, timeMinutes, undefined, input.pricingMode), costoSetupTotal }
}

// ── Builder ──

function buildResult(lines: { label: string; value: number }[], costoTotal: number, margin: number, qty: number, tiers: DiscountTier[], timeMin: number, nesting?: CostResult['nesting'], pricingMode: 'margin' | 'markup' = 'margin'): CostResult {
  const precio = calcSuggestedPrice(costoTotal, margin, pricingMode)
  const desc = getDiscount(tiers, qty)
  const conDesc = precio * (1 - desc)
  const sub = conDesc * qty
  const gan = sub - costoTotal * qty
  const pph = timeMin > 0 ? gan / (timeMin / 60) : 0
  return { costLines: lines, costoTotal, precioSugerido: precio, precioConDesc: conDesc, descPorcentaje: desc, subtotal: sub, ganancia: gan, timeMinutes: timeMin, profitPerHour: pph, nesting }
}
