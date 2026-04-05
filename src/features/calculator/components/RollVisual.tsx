'use client'

const ROLL_MARGIN = 1 // cm — must match hook
const DESIGN_GAP = 1  // cm — must match hook

interface RollVisualProps {
  rollWidth: number   // cm
  designW: number     // cm
  designH: number     // cm
  cols: number
  rows: number
  quantity: number
  rotated: boolean
  metrosLineales: number
}

export function RollVisual({ rollWidth, designW, designH, cols, rows, quantity, rotated, metrosLineales }: RollVisualProps) {
  const cellDW = rotated ? designH : designW
  const cellDH = rotated ? designW : designH

  // Total physical length (with margins and gaps)
  const totalLengthCm = ROLL_MARGIN * 2 + rows * cellDH + Math.max(rows - 1, 0) * DESIGN_GAP

  // SVG dimensions: fixed width, height grows proportionally
  const SVG_W = 180
  const scaleX = SVG_W / rollWidth
  const rawH = totalLengthCm * scaleX
  const SVG_H = Math.max(Math.min(Math.round(rawH), 400), 60)
  const scaleY = SVG_H / totalLengthCm

  const marginX = ROLL_MARGIN * scaleX
  const marginY = ROLL_MARGIN * scaleY
  const gapY = DESIGN_GAP * scaleY
  const cellW = cellDW * scaleX
  const cellH = cellDH * scaleY

  // Meter markers
  const meterMarkers: { y: number; label: string }[] = []
  for (let m = 1; m <= Math.floor(totalLengthCm / 100); m++) {
    meterMarkers.push({ y: m * 100 * scaleY, label: `${m}m` })
  }

  // Design cells
  let placed = 0
  const rects: { x: number; y: number; active: boolean }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = marginX + c * (cellW + DESIGN_GAP * scaleX)
      const y = marginY + r * (cellH + gapY)
      rects.push({ x, y, active: placed < quantity })
      placed++
    }
  }

  const LABEL_COL = 32

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <svg
        width={SVG_W + LABEL_COL + 6}
        height={SVG_H + 2}
        viewBox={`0 0 ${SVG_W + LABEL_COL + 6} ${SVG_H + 2}`}
        style={{ display: 'block' }}
      >
        {/* Flat roll body */}
        <rect x={1} y={1} width={SVG_W} height={SVG_H} rx={3}
          fill="#FFFBF9" stroke="#DFC4B6" strokeWidth={1} />

        {/* Margin zone indicators */}
        {/* Top margin */}
        <rect x={1} y={1} width={SVG_W} height={marginY} fill="rgba(225,112,85,0.04)" rx={3} />
        {/* Bottom margin */}
        <rect x={1} y={1 + SVG_H - marginY} width={SVG_W} height={marginY} fill="rgba(225,112,85,0.04)" />
        {/* Left margin */}
        <rect x={1} y={1 + marginY} width={marginX} height={SVG_H - marginY * 2} fill="rgba(225,112,85,0.04)" />
        {/* Right margin */}
        <rect x={1 + SVG_W - marginX} y={1 + marginY} width={marginX} height={SVG_H - marginY * 2} fill="rgba(225,112,85,0.04)" />

        {/* Design cells */}
        {rects.map((r, i) => (
          <rect key={i}
            x={1 + r.x} y={1 + r.y}
            width={Math.max(cellW, 3)} height={Math.max(cellH, 3)}
            fill={r.active ? 'rgba(225,112,85,0.18)' : 'rgba(225,112,85,0.04)'}
            stroke={r.active ? '#E17055' : '#E1705525'}
            strokeWidth={r.active ? 1 : 0.5}
            rx={2}
          />
        ))}

        {/* Meter markers */}
        {meterMarkers.map((m, i) => (
          <g key={i}>
            <line x1={1} y1={1 + m.y} x2={1 + SVG_W} y2={1 + m.y}
              stroke="#E17055" strokeWidth={0.7} strokeDasharray="4 3" opacity={0.3} />
            <rect x={SVG_W + 5} y={1 + m.y - 7} width={LABEL_COL} height={14} rx={3}
              fill="#E17055" opacity={0.08} />
            <text x={SVG_W + 5 + LABEL_COL / 2} y={1 + m.y + 3.5}
              textAnchor="middle" fontSize={8} fontWeight={700} fill="#E17055" opacity={0.6}>
              {m.label}
            </text>
          </g>
        ))}

        {/* Right ruler line */}
        <line x1={SVG_W + 3} y1={1} x2={SVG_W + 3} y2={SVG_H + 1} stroke="#ddd" strokeWidth={0.4} />
      </svg>

      <div className="text-center leading-tight">
        <p className="text-sm font-bold text-gray-700">
          Consumo estimado: <span style={{ color: '#E17055' }}>{metrosLineales.toFixed(2)} metros lineales</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Rollo de {rollWidth} cm &middot; {cols} col &times; {rows} filas = {quantity} diseños
          {rotated && ' (rotado 90°)'}
          &middot; margen {ROLL_MARGIN} cm &middot; sep. {DESIGN_GAP} cm
        </p>
      </div>
    </div>
  )
}
