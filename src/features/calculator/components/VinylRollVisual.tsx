'use client'

const PLOTTER_MARGIN = 1.5 // cm — must match hook
const VINYL_GAP = 0.5      // cm — must match hook

interface VinylRollVisualProps {
  rollWidth: number
  designW: number
  designH: number
  cols: number
  rows: number
  quantity: number
  rotated: boolean
  metrosLineales: number
}

export function VinylRollVisual({ rollWidth, designW, designH, cols, rows, quantity, rotated, metrosLineales }: VinylRollVisualProps) {
  if (cols <= 0 || rows <= 0) return null

  const cellDW = rotated ? designH : designW
  const cellDH = rotated ? designW : designH
  const totalLengthCm = PLOTTER_MARGIN * 2 + rows * cellDH + Math.max(rows - 1, 0) * VINYL_GAP

  const SVG_W = 170
  const scaleX = SVG_W / rollWidth
  const rawH = totalLengthCm * scaleX
  const SVG_H = Math.max(Math.min(Math.round(rawH), 300), 50)
  const scaleY = SVG_H / totalLengthCm

  const mx = PLOTTER_MARGIN * scaleX
  const my = PLOTTER_MARGIN * scaleY
  const gapX = VINYL_GAP * scaleX
  const gapY = VINYL_GAP * scaleY
  const cellW = cellDW * scaleX
  const cellH = cellDH * scaleY

  // Meter markers
  const meterMarkers: { y: number; label: string }[] = []
  for (let m = 1; m <= Math.floor(totalLengthCm / 100); m++) {
    meterMarkers.push({ y: m * 100 * scaleY, label: `${m}m` })
  }

  let placed = 0
  const rects: { x: number; y: number; active: boolean }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: mx + c * (cellW + gapX),
        y: my + r * (cellH + gapY),
        active: placed < quantity,
      })
      placed++
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <svg
        width={SVG_W + 30}
        height={SVG_H + 2}
        viewBox={`0 0 ${SVG_W + 30} ${SVG_H + 2}`}
        style={{ display: 'block' }}
      >
        {/* Roll body */}
        <rect x={1} y={1} width={SVG_W} height={SVG_H} rx={2}
          fill="#FFF5F8" stroke="#E8B8C8" strokeWidth={0.8} />

        {/* Margin zones */}
        <rect x={1} y={1} width={mx} height={SVG_H} fill="rgba(232,67,147,0.04)" />
        <rect x={1 + SVG_W - mx} y={1} width={mx} height={SVG_H} fill="rgba(232,67,147,0.04)" />
        <rect x={1} y={1} width={SVG_W} height={my} fill="rgba(232,67,147,0.04)" />
        <rect x={1} y={1 + SVG_H - my} width={SVG_W} height={my} fill="rgba(232,67,147,0.04)" />

        {/* Design cells */}
        {rects.map((r, i) => (
          <rect key={i}
            x={1 + r.x} y={1 + r.y}
            width={Math.max(cellW, 2)} height={Math.max(cellH, 2)}
            fill={r.active ? 'rgba(232,67,147,0.18)' : 'rgba(232,67,147,0.04)'}
            stroke={r.active ? '#E84393' : '#E8439320'}
            strokeWidth={r.active ? 0.8 : 0.4}
            rx={1.5}
          />
        ))}

        {/* Meter markers */}
        {meterMarkers.map((m, i) => (
          <g key={i}>
            <line x1={1} y1={1 + m.y} x2={1 + SVG_W} y2={1 + m.y}
              stroke="#E84393" strokeWidth={0.5} strokeDasharray="3 2" opacity={0.3} />
            <text x={SVG_W + 10} y={1 + m.y + 3}
              fontSize={7} fontWeight={700} fill="#E84393" opacity={0.5}>
              {m.label}
            </text>
          </g>
        ))}
      </svg>

      <p className="text-[11px] font-semibold text-gray-600 text-center">
        Consumo estimado: <span style={{ color: '#E84393' }}>{metrosLineales.toFixed(2)} m</span>
        <span className="text-gray-400 font-normal"> &middot; rollo {rollWidth} cm</span>
      </p>
    </div>
  )
}
