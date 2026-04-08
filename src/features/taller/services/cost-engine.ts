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
  product: { base_cost: number; press_equipment_id?: string | null; [k: string]: unknown }
  equipment: Array<{ id: string; type: string; clasificacion: string; cost: number; lifespan_uses: number; tecnicas_slugs?: string[] }>
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
  switch (config.tipo) {
    case 'subli': return computeSubli(input, config)
    case 'dtf': return computeDTF(input, config)
    case 'dtf_uv': return computeDTF(input, config) // same logic, different insumos
    case 'vinyl': return computeVinyl(input, config)
    case 'serigrafia': return computeSerigrafia(input, config)
  }
}

// ── Helpers to read insumo data ──

function findInsumo(insumos: Insumo[], ...tipos: string[]) { return insumos.find(i => tipos.includes(i.tipo)) }
function insCfg(ins: Insumo | undefined) { return (ins?.config || {}) as Record<string, unknown> }

function getAmort(equipment: Array<{ id: string; cost: number; lifespan_uses: number }>, ids: string[]) {
  return ids.reduce((sum, id) => { const eq = equipment.find(e => e.id === id); return sum + (eq ? eq.cost / eq.lifespan_uses : 0) }, 0)
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

  if (papel) {
    if (pc.formato === 'rollo') {
      const rW = (pc.rollo_ancho as number) || 61, rLcm = ((pc.rollo_largo as number) || 100) * 100
      const costPerCm = ((pc.precio_rollo as number) || 0) / Math.max(rLcm, 1)
      const cA = Math.floor(rW / dw), cB = Math.floor(rW / dh)
      const a = cA > 0 ? (costPerCm * dh) / cA : Infinity, b = cB > 0 ? (costPerCm * dw) / cB : Infinity
      if (a <= b && cA > 0) { costoPapel = a; sheetCols = cA; perSheet = cA }
      else if (cB > 0) { costoPapel = b; sheetCols = cB; sheetRotated = true; perSheet = cB }
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
    costoTinta = (dw * dh / (Math.max((tc.rendimiento as number) || 1, 1) * refArea)) * ((tc.precio as number) || 0)
  }
  return { papelTinta: costoPapel + costoTinta, costoPapel, costoTinta, perSheet, sheetsNeeded, sheetRotated, sheetCols, sheetRows }
}

// ── Sublimación ──

function computeSubli(input: ComputeInput, config: SubliConfig): CostResult {
  const { product, equipment, insumos, quantity, designWidth, designHeight, margin, mo, otrosGastos, setupMin, discountTiers, techniqueEquipmentIds, zones } = input
  const desperdicio = input.overrideMerma ?? config.desperdicio_pct ?? 5
  const amortEquip = input.overrideAmortPrint ?? getAmort(equipment, techniqueEquipmentIds)
  const amortPress = input.overrideAmortPress ?? getPressAmort(product, equipment, 'subli')
  const costoProducto = Number(product.base_cost)

  const effectiveZones = (zones && zones.length > 1) ? zones : [{ ancho: designWidth, alto: designHeight }]
  const numZones = effectiveZones.length
  const isMultiZone = numZones > 1

  // Calculate per-zone nesting (for individual zone visuals)
  let totalPapelTinta = 0
  const zoneResults: Array<ReturnType<typeof calcSubliZone>> = []
  effectiveZones.forEach(zone => {
    const z = calcSubliZone(zone.ancho, zone.alto, quantity, config, insumos)
    zoneResults.push(z)
    totalPapelTinta += z.papelTinta
  })

  // Calculate total sheets: sum of per-zone sheets (each zone uses its own sheets)
  const totalHojas = zoneResults.reduce((s, z) => s + z.sheetsNeeded, 0)

  // Resource-based desglose (NOT zone-based)
  const totalAmortPress = amortPress * numZones
  const costoInsumosBase = totalPapelTinta + amortEquip
  const costoDesp = costoInsumosBase * (desperdicio / 100)
  const moAdjusted = mo * numZones

  const lines: { label: string; value: number }[] = [{ label: 'Producto base', value: costoProducto }]
  const papelLabel = isMultiZone
    ? `Papel + tinta (${totalHojas} hojas, ${numZones} zonas)`
    : `Papel + tinta (${totalHojas} hojas)`
  lines.push({ label: papelLabel, value: totalPapelTinta })
  if (totalAmortPress > 0) lines.push({ label: `Amort. plancha${isMultiZone ? ` (×${numZones})` : ''}`, value: totalAmortPress })
  if (amortEquip > 0) lines.push({ label: 'Amort. impresora', value: amortEquip })
  if (costoDesp > 0) lines.push({ label: `Desperdicio (${desperdicio}%)`, value: costoDesp })
  if (moAdjusted > 0) lines.push({ label: 'Mano de obra', value: moAdjusted })
  if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })

  const costoTotal = costoProducto + totalPapelTinta + totalAmortPress + amortEquip + costoDesp + moAdjusted + otrosGastos / Math.max(quantity, 1)
  const timeMinutes = setupMin + (((product.time_subli as number) || 0) / 60) * numZones * quantity

  const fn = zoneResults.length > 0 ? zoneResults[0] : undefined
  let nesting: CostResult['nesting'] = undefined
  if (fn) {
    nesting = { type: 'sheet', cols: fn.sheetCols, rows: fn.sheetRows, rotated: fn.sheetRotated, perSheet: fn.perSheet, sheetsNeeded: totalHojas, quantity }
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
  const r = buildResult(lines, costoTotal, margin, quantity, discountTiers, timeMinutes, nesting)
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

  let costoImpresion = 0
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
    const filmCost = filmArea > 0 ? (consumedArea / filmArea) * ((fc.precio_rollo as number) || 0) : 0
    const tintaCost = ((tc2.rendimiento as number) || 1) > 0 ? (consumedArea / (tc2.rendimiento as number || 1)) * ((tc2.precio as number) || 0) : 0
    const polvoCost = ((poc.rendimiento_m2 as number) || 1) > 0 ? (consumedArea / (poc.rendimiento_m2 as number || 1)) * ((poc.precio_kg as number) || 0) : 0
    const amortPrint = overrideAmortPrint ?? getAmort(equipment, techniqueEquipmentIds)
    costoImpresion = (filmCost + tintaCost + polvoCost) / Math.max(qty, 1) + amortPrint
  }
  return { costoImpresion, nesting, metrosLineales, rollW }
}

function computeDTF(input: ComputeInput, config: DTFConfig | DTFUVConfig): CostResult {
  const { product, equipment, insumos, quantity, designWidth, designHeight, margin, mo, otrosGastos, setupMin, discountTiers, techniqueEquipmentIds, zones } = input
  const desperdicio = input.overrideMerma ?? config.desperdicio_pct ?? 10
  const slug = config.tipo
  const amortPress = input.overrideAmortPress ?? getPressAmort(product, equipment, slug)
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
  const costoInsBase = totalImpresion
  const costoDesp = costoInsBase * (desperdicio / 100)
  const moAdjusted = mo * numZones
  const metrosStr = `${totalMetros.toFixed(2)}m`
  const tecLabel = slug === 'dtf_uv' ? 'DTF UV' : 'DTF'
  const insumoLabel = config.modo === 'tercerizado'
    ? `Impresión tercerizada (${metrosStr}${isMultiZone ? `, ${numZones} zonas` : ''})`
    : `Insumos ${tecLabel} (${metrosStr}${isMultiZone ? `, ${numZones} zonas` : ''})`
  lines.push({ label: insumoLabel, value: totalImpresion })
  if (totalAmortPress > 0) lines.push({ label: `Amort. plancha${numZones > 1 ? ` (×${numZones})` : ''}`, value: totalAmortPress })
  if (costoDesp > 0) lines.push({ label: `Desperdicio (${desperdicio}%)`, value: costoDesp })
  if (moAdjusted > 0) lines.push({ label: 'Mano de obra', value: moAdjusted })
  if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })

  const costoTotal = costoProducto + totalImpresion + totalAmortPress + costoDesp + moAdjusted + otrosGastos / Math.max(quantity, 1)

  const timeKey = slug === 'dtf_uv' ? 'time_dtf_uv' : 'time_dtf'
  const timeMinutes = setupMin + ((product[timeKey] as number || 0) / 60) * numZones * quantity
  const noInsumos = insumos.length === 0

  const dfn = dtfZoneResults.length > 0 ? dtfZoneResults[0] : undefined
  let dtfNesting: CostResult['nesting'] = undefined
  if (dfn) {
    dtfNesting = { type: 'roll', cols: dfn.nesting.cols, rows: dfn.nesting.rows, rotated: dfn.nesting.rotated, metrosLineales: dfn.metrosLineales, anchoRollo: dfn.rollW, quantity }
  }
  const result = buildResult(lines, costoTotal, margin, quantity, discountTiers, timeMinutes, dtfNesting)
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
  const costoDesp = costoViniloRaw * (desperdicio / 100)
  const costoProducto = Number(product.base_cost)
  const amortPlotter = input.overrideAmortPrint ?? getAmort(equipment, techniqueEquipmentIds)
  const amortPress = input.overrideAmortPress ?? getPressAmort(product, equipment, 'vinyl')
  const costoTotal = costoProducto + costoViniloRaw + costoDesp + amortPlotter + amortPress + mo + otrosGastos / Math.max(quantity, 1)

  const totalMetrosVinyl = vinylNesting.reduce((s, n) => s + n.metrosLineales, 0)
  const lines = [{ label: 'Producto base', value: costoProducto }, { label: `Vinilo (${totalMetrosVinyl.toFixed(2)}m)`, value: costoViniloRaw }]
  if (costoDesp > 0) lines.push({ label: `Desperdicio pelado (${desperdicio}%)`, value: costoDesp })
  if (amortPlotter > 0) lines.push({ label: 'Amort. plotter', value: amortPlotter })
  if (amortPress > 0) lines.push({ label: 'Amort. plancha', value: amortPress })
  if (mo > 0) lines.push({ label: 'Mano de obra', value: mo })
  if (otrosGastos > 0) lines.push({ label: 'Otros gastos', value: otrosGastos / Math.max(quantity, 1) })

  const r = { ...buildResult(lines, costoTotal, margin, quantity, discountTiers, setupMin + (((product.time_vinyl as number) || 0) / 60) * quantity), vinylNesting }
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
  const costoDesp = costoBase * (desperdicio / 100)
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

  return { ...buildResult(lines, costoTotal, margin, quantity, discountTiers, timeMinutes), costoSetupTotal }
}

// ── Builder ──

function buildResult(lines: { label: string; value: number }[], costoTotal: number, margin: number, qty: number, tiers: DiscountTier[], timeMin: number, nesting?: CostResult['nesting']): CostResult {
  const precio = calcSuggestedPrice(costoTotal, margin)
  const desc = getDiscount(tiers, qty)
  const conDesc = precio * (1 - desc)
  const sub = conDesc * qty
  const gan = sub - costoTotal * qty
  const pph = timeMin > 0 ? gan / (timeMin / 60) : 0
  return { costLines: lines, costoTotal, precioSugerido: precio, precioConDesc: conDesc, descPorcentaje: desc, subtotal: sub, ganancia: gan, timeMinutes: timeMin, profitPerHour: pph, nesting }
}
