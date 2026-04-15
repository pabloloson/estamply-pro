export type Tecnica = 'subli' | 'dtf' | 'dtf_uv' | 'vinyl' | 'serigrafia'

export interface PresupuestoItem {
  id: string
  tecnica: Tecnica
  nombre: string
  costoUnit: number
  precioUnit: number  // con descuento
  precioSinDesc: number
  cantidad: number
  subtotal: number
  ganancia: number
  notas?: string
  origen?: 'cotizador' | 'catalogo' | 'catalogo_web' | 'manual'
  variantName?: string
  variantBreakdown?: Record<string, number>
}

export interface DiscountTier {
  desde: number
  hasta: number
  porcentaje: number
}

export type ManoDeObraModo = 'sueldo_fijo' | 'por_unidad' | 'porcentaje'
export type ComisionBase = 'venta' | 'ganancia'

export interface ManoDeObraConfig {
  modo: ManoDeObraModo
  sueldo_mensual: number
  horas_mensuales: number
  monto_por_unidad: number
  porcentaje_comision: number
  comision_base: ComisionBase
}

export const DEFAULT_MO_CONFIG: ManoDeObraConfig = {
  modo: 'por_unidad',
  sueldo_mensual: 0,
  horas_mensuales: 160,
  monto_por_unidad: 0,
  porcentaje_comision: 10,
  comision_base: 'venta',
}

// Legacy flat format (backward compat)
export interface VinylTipoLegacy {
  nombre: string
  precio_metro: number
  ancho_rollo: number
}

// New parent/children format
export interface VinylMaterial {
  aplicacion: 'textil' | 'autoadhesivo'
  acabado: string
  precio_metro: number
  ancho_rollo: number
  proveedor: string
  colores: string[]
}

// Union: settings can hold either format during migration
export type VinylTipo = VinylTipoLegacy

export type WorkshopSettings = {
  // Subli - Paper
  subli_papel_formato: 'hojas' | 'rollo'
  subli_papel_precio: number
  subli_papel_hojas: number
  subli_papel_ancho: number   // cm
  subli_papel_alto: number    // cm
  subli_rollo_precio: number
  subli_rollo_ancho: number   // cm
  subli_rollo_largo: number   // meters
  // Subli - Tinta
  subli_tinta_precio: number
  subli_tinta_rendimiento: number // hojas equivalentes
  // DTF Tercerizado
  dtf_precio_metro: number
  dtf_ancho_rollo: number
  // DTF Propia - bulk
  dtf_film_rollo_precio: number
  dtf_film_ancho: number        // cm
  dtf_film_largo: number        // meters
  dtf_tinta_precio_litro: number
  dtf_tinta_rendimiento_m2: number
  dtf_polvo_precio_kilo: number
  dtf_polvo_rendimiento_m2: number
  // DTF legacy (backward compat)
  dtf_film_costo: number
  dtf_tinta_costo: number
  dtf_polvo_costo: number
  dtf_amort_impresora: number
  dtf_amort_horno: number
  // Vinyl
  vinyl_tipos: VinylTipo[]       // legacy flat list
  vinyl_materiales: VinylMaterial[]
  vinyl_precio_metro: number   // legacy
  vinyl_ancho_rollo: number    // legacy
  // General
  setup_min: number
  fixed_costs_monthly: number
  // Mano de obra
  mano_de_obra: ManoDeObraConfig
  // Multi-currency
  moneda_referencia: string       // 'USD' default
  tipo_cambio: number             // exchange rate: 1 USD = X local
  tipo_cambio_modo: 'manual' | 'auto'
  redondeo_precios: 'none' | 'integer' | 'tens' | 'hundreds'
  // Strategy
  margen_sugerido: number
  descuento_global_enabled: boolean
  descuentos_global: DiscountTier[]
  // Discounts (per-technique)
  descuentos_subli: DiscountTier[]
  descuentos_dtf: DiscountTier[]
  descuentos_vinyl: DiscountTier[]
}

export const DEFAULT_SETTINGS: WorkshopSettings = {
  // Subli
  subli_papel_formato: 'hojas',
  subli_papel_precio: 10700,
  subli_papel_hojas: 100,
  subli_papel_ancho: 21,
  subli_papel_alto: 29.7,
  subli_rollo_precio: 15000,
  subli_rollo_ancho: 61,
  subli_rollo_largo: 100,
  subli_tinta_precio: 220000,
  subli_tinta_rendimiento: 4000,
  // DTF Tercerizado
  dtf_precio_metro: 15000,
  dtf_ancho_rollo: 60,
  // DTF Propia bulk
  dtf_film_rollo_precio: 25000,
  dtf_film_ancho: 60,
  dtf_film_largo: 100,
  dtf_tinta_precio_litro: 15000,
  dtf_tinta_rendimiento_m2: 40,
  dtf_polvo_precio_kilo: 8000,
  dtf_polvo_rendimiento_m2: 50,
  // DTF legacy
  dtf_film_costo: 2500,
  dtf_tinta_costo: 1800,
  dtf_polvo_costo: 800,
  dtf_amort_impresora: 24,
  dtf_amort_horno: 10,
  // Vinyl
  vinyl_tipos: [
    { nombre: 'PU Liso', precio_metro: 8000, ancho_rollo: 50 },
  ],
  vinyl_materiales: [
    { aplicacion: 'textil', acabado: 'Liso', precio_metro: 8000, ancho_rollo: 50, proveedor: '', colores: ['Blanco', 'Negro', 'Rojo'] },
  ],
  vinyl_precio_metro: 8000,
  vinyl_ancho_rollo: 50,
  // General
  setup_min: 15,
  fixed_costs_monthly: 50000,
  mano_de_obra: DEFAULT_MO_CONFIG,
  // Multi-currency
  moneda_referencia: 'USD',
  tipo_cambio: 1,
  tipo_cambio_modo: 'manual' as const,
  redondeo_precios: 'none' as const,
  // Strategy
  margen_sugerido: 50,
  descuento_global_enabled: false,
  descuentos_global: [
    { desde: 1, hasta: 9, porcentaje: 0 },
    { desde: 10, hasta: 49, porcentaje: 0.05 },
    { desde: 50, hasta: 99, porcentaje: 0.10 },
    { desde: 100, hasta: 9999, porcentaje: 0.15 },
  ],
  // Discounts
  descuentos_subli: [
    { desde: 1, hasta: 9, porcentaje: 0 },
    { desde: 10, hasta: 49, porcentaje: 0.05 },
    { desde: 50, hasta: 99, porcentaje: 0.10 },
    { desde: 100, hasta: 9999, porcentaje: 0.15 },
  ],
  descuentos_dtf: [
    { desde: 1, hasta: 9, porcentaje: 0 },
    { desde: 10, hasta: 49, porcentaje: 0.05 },
    { desde: 50, hasta: 99, porcentaje: 0.10 },
    { desde: 100, hasta: 9999, porcentaje: 0.15 },
  ],
  descuentos_vinyl: [
    { desde: 1, hasta: 9, porcentaje: 0 },
    { desde: 10, hasta: 49, porcentaje: 0.05 },
    { desde: 50, hasta: 99, porcentaje: 0.10 },
    { desde: 100, hasta: 9999, porcentaje: 0.15 },
  ],
}

export function getDiscount(tiers: DiscountTier[], qty: number): number {
  const tier = tiers.find(d => qty >= d.desde && qty <= d.hasta)
  return tier ? tier.porcentaje : (tiers[tiers.length - 1]?.porcentaje ?? 0)
}

export function calcSuggestedPrice(cost: number, marginPct: number): number {
  const m = marginPct / 100
  return m < 1 ? cost / (1 - m) : cost * 2
}

export function computeAutoMo(
  config: ManoDeObraConfig,
  timePerUnit: number,
  costoTotal: number,
  currentMo: number,
  merma: number,
  margin: number,
): number {
  switch (config.modo) {
    case 'sueldo_fijo': {
      const minutosMes = config.horas_mensuales * 60
      if (minutosMes <= 0) return 0
      return (config.sueldo_mensual / minutosMes) * timePerUnit
    }
    case 'por_unidad':
      return config.monto_por_unidad
    case 'porcentaje': {
      const mermaFactor = 1 + merma / 100
      const c0 = costoTotal - currentMo * mermaFactor
      if (c0 <= 0) return 0
      const m = margin / 100
      const p = config.porcentaje_comision / 100
      if (config.comision_base === 'venta') {
        const denom = 1 - m - p
        return denom > 0 ? (c0 * p) / denom : 0
      } else {
        const denom = 1 - m * (1 + p)
        return denom > 0 ? (c0 * m * p) / denom : 0
      }
    }
  }
}

export function getMoRuleLabel(config: ManoDeObraConfig): string {
  switch (config.modo) {
    case 'sueldo_fijo': return 'Sueldo fijo'
    case 'por_unidad': return 'Por unidad'
    case 'porcentaje':
      return config.comision_base === 'venta' ? '% s/venta' : '% s/ganancia'
  }
}
