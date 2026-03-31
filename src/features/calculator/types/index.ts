export type Technique = 'subli' | 'dtf' | 'vinyl'

export interface Product {
  id: string
  name: string
  base_cost: number
  category: string
  time_subli: number
  time_dtf: number
  time_vinyl: number
  press_equipment_id: string | null
}

export interface Equipment {
  id: string
  name: string
  type: string
  cost: number
  lifespan_uses: number
}

export interface WorkshopSettings {
  paper_cost?: number
  ink_cost?: number
  dtf_meter_cost?: number
  vinyl_meter_cost?: number
  setup_min?: number
  fixed_costs_monthly?: number
}

export interface CalcResult {
  productCost: number
  suppliesCost: number
  amortizationCost: number
  totalCost: number
  suggestedPrice: number
  timeMinutes: number
  profitPerHour: number
  designsPerSheet?: number
  sheetRotated?: boolean
  sheetCols?: number
  sheetRows?: number
}

export interface NestingResult {
  count: number
  rotated: boolean
  cols: number
  rows: number
}
