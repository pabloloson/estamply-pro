'use client'

const ZONE_COLORS = ['#1D9E75', '#534AB7', '#D85A30', '#378ADD']

interface ZoneNesting {
  ubicacion: string
  ancho: number
  alto: number
  cols: number
  rows: number
  rotated: boolean
  perSheet: number
  sheetsNeeded: number
  costoPapel: number
  costoTinta: number
}

interface NestingPanelProps {
  zones: ZoneNesting[]
  sheetW: number
  sheetH: number
  quantity: number
  totalCost: number
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

function SheetSVG({ zone, sheetW, sheetH, color }: { zone: ZoneNesting; sheetW: number; sheetH: number; color: string }) {
  const svgW = 120
  const svgH = Math.round(svgW * (sheetH / sheetW))
  const margin = 4
  const usableW = svgW - margin * 2
  const usableH = svgH - margin * 2

  const dw = zone.rotated ? zone.alto : zone.ancho
  const dh = zone.rotated ? zone.ancho : zone.alto

  const cellW = (dw / sheetW) * usableW
  const cellH = (dh / sheetH) * usableH

  const rects: { x: number; y: number; w: number; h: number }[] = []
  for (let r = 0; r < zone.rows; r++) {
    for (let c = 0; c < zone.cols; c++) {
      if (rects.length >= zone.perSheet) break
      rects.push({
        x: margin + c * cellW,
        y: margin + r * cellH,
        w: Math.max(cellW - 1, 1),
        h: Math.max(cellH - 1, 1),
      })
    }
  }

  return (
    <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="flex-shrink-0">
      <rect x={0} y={0} width={svgW} height={svgH} rx={3} fill="#F9FAFB" stroke="#E5E7EB" strokeWidth={1} />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5}
          fill={`${color}20`} stroke={color} strokeWidth={0.8} />
      ))}
    </svg>
  )
}

export default function NestingPanel({ zones, sheetW, sheetH, quantity, totalCost }: NestingPanelProps) {
  return (
    <div className="mt-2 mb-1 ml-3 space-y-3">
      {zones.map((zone, i) => {
        const color = ZONE_COLORS[i % ZONE_COLORS.length]
        const label = zone.ubicacion || `Zona ${i + 1}`
        const dims = `${zone.ancho}×${zone.alto} cm`
        const costZone = (zone.costoPapel + zone.costoTinta) * quantity

        return (
          <div key={i} className="flex items-start gap-3">
            <SheetSVG zone={zone} sheetW={sheetW} sheetH={sheetH} color={color} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color }}>
                {zones.length > 1 ? label : 'Distribución'} <span className="font-normal text-gray-400">{dims}</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {zone.perSheet} diseño{zone.perSheet > 1 ? 's' : ''}/hoja → {zone.sheetsNeeded} hoja{zone.sheetsNeeded > 1 ? 's' : ''}
              </p>
              <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                <span>Papel {fmt(zone.costoPapel * quantity)}</span>
                <span>Tinta {fmt(zone.costoTinta * quantity)}</span>
              </div>
            </div>
          </div>
        )
      })}
      {zones.length > 1 && (
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <span className="text-[10px] font-semibold text-gray-500">Total papel + tinta</span>
          <span className="text-[10px] font-bold text-gray-700">{fmt(totalCost)}</span>
        </div>
      )}
    </div>
  )
}
