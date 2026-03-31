export type Tecnica = 'subli' | 'dtf' | 'vinyl'

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
}

export interface DiscountTier {
  desde: number
  hasta: number
  porcentaje: number
}

export type WorkshopSettings = {
  // Subli
  subli_papel_precio: number
  subli_papel_hojas: number
  subli_tinta_precio: number
  subli_tinta_rendimiento: number
  // DTF
  dtf_precio_metro: number
  dtf_ancho_rollo: number
  dtf_film_costo: number
  dtf_tinta_costo: number
  dtf_polvo_costo: number
  dtf_amort_impresora: number
  dtf_amort_horno: number
  // Vinyl
  vinyl_precio_metro: number
  vinyl_ancho_rollo: number
  // General
  setup_min: number
  fixed_costs_monthly: number
  // Discounts
  descuentos_subli: DiscountTier[]
  descuentos_dtf: DiscountTier[]
  descuentos_vinyl: DiscountTier[]
}

export const DEFAULT_SETTINGS: WorkshopSettings = {
  subli_papel_precio: 10700,
  subli_papel_hojas: 100,
  subli_tinta_precio: 220000,
  subli_tinta_rendimiento: 4000,
  dtf_precio_metro: 15000,
  dtf_ancho_rollo: 60,
  dtf_film_costo: 2500,
  dtf_tinta_costo: 1800,
  dtf_polvo_costo: 800,
  dtf_amort_impresora: 24,
  dtf_amort_horno: 10,
  vinyl_precio_metro: 8000,
  vinyl_ancho_rollo: 50,
  setup_min: 15,
  fixed_costs_monthly: 50000,
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
