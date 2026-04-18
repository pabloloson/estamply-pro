// ── Entities ──

export interface Category {
  id: string
  user_id: string
  name: string
  margen_sugerido: number
  pricing_mode?: 'margin' | 'markup'
  created_at: string
}

export type TecnicaSlug = 'subli' | 'dtf' | 'dtf_uv' | 'vinyl' | 'vinyl_adhesivo' | 'serigrafia'

export const ALL_TECNICA_SLUGS: TecnicaSlug[] = ['subli', 'dtf', 'dtf_uv', 'vinyl', 'vinyl_adhesivo', 'serigrafia']
export const DEFAULT_ACTIVE_SLUGS: TecnicaSlug[] = ['subli', 'dtf', 'vinyl']

export const TECNICA_LABELS: Record<TecnicaSlug, string> = {
  subli: 'Sublimación', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo Textil', vinyl_adhesivo: 'Vinilo Autoadhesivo', serigrafia: 'Serigrafía',
}
export const TECNICA_COLORS: Record<TecnicaSlug, string> = {
  subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', vinyl_adhesivo: '#D63384', serigrafia: '#FDCB6E',
}

export interface Tecnica {
  id: string
  user_id: string
  slug: TecnicaSlug
  nombre: string
  color: string
  config: TecnicaConfig
  equipment_ids: string[]
  insumo_ids: string[]
  activa: boolean
  created_at: string
}

// ── Insumo registry ──

export type InsumoTipo = 'papel' | 'tinta' | 'film' | 'polvo' | 'vinilo' | 'tinta_serigrafica' | 'servicio_impresion' | 'emulsion' | 'otro'

export interface Insumo {
  id: string
  user_id: string
  nombre: string
  tipo: InsumoTipo
  tecnica_asociada: string // slug or 'compartido'
  config: InsumoConfig
  moneda?: 'local' | 'USD'  // currency of the cost prices
  supplier_id?: string | null
  categoria_funcional?: 'directo' | 'consumible'
  created_at: string
}

export type InsumoConfig =
  | { tipo: 'papel'; formato: 'hojas' | 'rollo'; precio_resma: number; hojas_resma: number; ancho: number; alto: number; precio_rollo: number; rollo_ancho: number; rollo_largo: number }
  | { tipo: 'tinta'; precio: number; rendimiento: number; unidad_rendimiento: 'hojas' | 'm2' }
  | { tipo: 'film'; precio_rollo: number; ancho: number; largo: number }
  | { tipo: 'polvo'; precio_kg: number; rendimiento_m2: number }
  | { tipo: 'vinilo'; aplicacion: 'textil' | 'rigido'; acabado: string; precio_metro: number; ancho: number; colores: string[] }
  | { tipo: 'tinta_serigrafica'; precio_kg: number; rendimiento_estampadas_kg: number; color: string }
  | { tipo: 'servicio_impresion'; precio_metro: number; ancho_material: number; proveedor: string }
  | { tipo: 'emulsion'; precio_kg: number; rendimiento_pantallas_kg: number }
  | { tipo: 'otro'; precio: number; unidad: string; rendimiento: number; unidad_rendimiento: string; vida_util_usos?: number }

// ── Technique configs (discriminated union) ──

export type TecnicaConfig = SubliConfig | DTFConfig | DTFUVConfig | VinylConfig | VinylAdhesivoConfig | SerigrafiaConfig

export interface SubliConfig {
  tipo: 'subli'
  modo?: 'propia' | 'tercerizado'
  desperdicio_pct: number
  margen_seguridad: number
  pedido_minimo: number
  tiempo_preparacion?: number // minutes
  descuento_override: boolean
  descuentos: import('@/features/presupuesto/types').DiscountTier[]
}

export interface DTFConfig {
  tipo: 'dtf'
  modo: 'tercerizado' | 'propia'
  margen_seguridad: number
  desperdicio_pct: number
  pedido_minimo: number
  tiempo_preparacion?: number
  descuento_override: boolean
  descuentos: import('@/features/presupuesto/types').DiscountTier[]
}

export interface DTFUVConfig {
  tipo: 'dtf_uv'
  modo: 'tercerizado' | 'propia'
  margen_seguridad: number
  desperdicio_pct: number
  pedido_minimo: number
  tiempo_preparacion?: number
  descuento_override: boolean
  descuentos: import('@/features/presupuesto/types').DiscountTier[]
}

export interface VinylConfig {
  tipo: 'vinyl'
  modo?: 'propia' | 'tercerizado'
  margen_seguridad?: number
  desperdicio_pelado_pct: number
  pedido_minimo: number
  tiempo_preparacion?: number
  descuento_override: boolean
  descuentos: import('@/features/presupuesto/types').DiscountTier[]
}

export interface VinylAdhesivoConfig {
  tipo: 'vinyl_adhesivo'
  modo?: 'propia' | 'tercerizado'
  margen_seguridad?: number
  desperdicio_pelado_pct: number
  pedido_minimo: number
  tiempo_preparacion?: number
  descuento_override: boolean
  descuentos: import('@/features/presupuesto/types').DiscountTier[]
}

export interface SerigrafiaConfig {
  tipo: 'serigrafia'
  modo?: 'propia' | 'tercerizado'
  costo_pantalla_por_color: number
  tiempo_preparacion_por_color: number // seconds
  desperdicio_pct: number
  pedido_minimo: number
  tiempo_preparacion?: number
  descuento_override: boolean
  descuentos: import('@/features/presupuesto/types').DiscountTier[]
}

// ── Cost result ──

export interface CostResult {
  costLines: { label: string; value: number }[]
  costoTotal: number
  precioSugerido: number
  precioConDesc: number
  descPorcentaje: number
  subtotal: number
  ganancia: number
  timeMinutes: number
  timeBreakdown?: { prepMin: number; printMin: number; pressMin: number }
  profitPerHour: number
  nesting?: {
    type: 'sheet' | 'roll'
    cols: number; rows: number; rotated: boolean
    perSheet?: number; sheetsNeeded?: number
    metrosLineales?: number; anchoRollo?: number
    quantity: number
  }
  vinylNesting?: Array<{
    cols: number; rows: number; rotated: boolean
    metrosLineales: number; anchoRollo: number; costoColor: number
  }>
  // Per-zone nesting details (for expandable Papel+Tinta)
  zoneNesting?: Array<{
    ubicacion: string; ancho: number; alto: number
    cols: number; rows: number; rotated: boolean
    perSheet: number; sheetsNeeded: number
    costoPapel: number; costoTinta: number
  }>
  // Serigrafía specific
  costoSetupTotal?: number
  pedidoMinimoWarning?: string
  missingInsumosWarning?: string
}

// ── Defaults ──

export const DEFAULT_SUBLI_CONFIG: SubliConfig = {
  tipo: 'subli', desperdicio_pct: 5, margen_seguridad: 0.5, pedido_minimo: 1,
  descuento_override: false, descuentos: [],
}

export const DEFAULT_DTF_CONFIG: DTFConfig = {
  tipo: 'dtf', modo: 'tercerizado', margen_seguridad: 1, desperdicio_pct: 10, pedido_minimo: 1,
  descuento_override: false, descuentos: [],
}

export const DEFAULT_DTF_UV_CONFIG: DTFUVConfig = {
  tipo: 'dtf_uv', modo: 'tercerizado', margen_seguridad: 1, desperdicio_pct: 10, pedido_minimo: 1,
  descuento_override: false, descuentos: [],
}

export const DEFAULT_VINYL_CONFIG: VinylConfig = {
  tipo: 'vinyl', desperdicio_pelado_pct: 15, pedido_minimo: 1,
  descuento_override: false, descuentos: [],
}

export const DEFAULT_SERIGRAFIA_CONFIG: SerigrafiaConfig = {
  tipo: 'serigrafia', costo_pantalla_por_color: 5000, tiempo_preparacion_por_color: 600,
  desperdicio_pct: 5, pedido_minimo: 25,
  descuento_override: false, descuentos: [],
}

export const TECHNIQUE_DEFAULTS: Record<TecnicaSlug, { nombre: string; color: string; config: TecnicaConfig; activa: boolean }> = {
  subli: { nombre: 'Sublimación', color: '#6C5CE7', config: DEFAULT_SUBLI_CONFIG, activa: true },
  dtf: { nombre: 'DTF Textil', color: '#E17055', config: DEFAULT_DTF_CONFIG, activa: true },
  dtf_uv: { nombre: 'DTF UV', color: '#00B894', config: DEFAULT_DTF_UV_CONFIG, activa: false },
  vinyl: { nombre: 'Vinilo Textil', color: '#E84393', config: DEFAULT_VINYL_CONFIG, activa: true },
  vinyl_adhesivo: { nombre: 'Vinilo Autoadhesivo', color: '#D63384', config: { tipo: 'vinyl_adhesivo' as const, desperdicio_pelado_pct: 10, pedido_minimo: 1, descuento_override: false, descuentos: [] }, activa: false },
  serigrafia: { nombre: 'Serigrafía', color: '#FDCB6E', config: DEFAULT_SERIGRAFIA_CONFIG, activa: false },
}
