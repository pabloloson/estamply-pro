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

function fmtConsumo(cm: number) {
  if (cm >= 100) return `${(cm / 100).toFixed(2)}m`
  return `${Math.round(cm)} cm`
}

export function RollVisual({ rollWidth, designW, designH, cols, rows, quantity, rotated, metrosLineales }: RollVisualProps) {
  const cellDW = rotated ? designH : designW
  const cellDH = rotated ? designW : designH

  // Length consumed by designs (with margins and gaps)
  const usedLengthCm = ROLL_MARGIN * 2 + rows * cellDH + Math.max(rows - 1, 0) * DESIGN_GAP

  // Show at least 1 full meter, rounded up
  const displayLengthCm = Math.max(Math.ceil(usedLengthCm / 100) * 100, 100)

  // SVG dimensions: fixed width, height proportional to displayLength
  const SVG_W = 180
  const scaleX = SVG_W / rollWidth
  const rawH = displayLengthCm * scaleX
  const SVG_H = Math.max(Math.min(Math.round(rawH), 500), 80)
  const scaleY = SVG_H / displayLengthCm

  const marginX = ROLL_MARGIN * scaleX
  const marginY = ROLL_MARGIN * scaleY
  const gapY = DESIGN_GAP * scaleY
  const cellW = cellDW * scaleX
  const cellH = cellDH * scaleY

  // Meter markers
  const meterMarkers: { y: number; label: string }[] = []
  for (let m = 1; m <= Math.floor(displayLengthCm / 100); m++) {
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
  const consumoCm = metrosLineales * 100

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <svg
        width={SVG_W + LABEL_COL + 6}
        height={SVG_H + 2}
        viewBox={`0 0 ${SVG_W + LABEL_COL + 6} ${SVG_H + 2}`}
        style={{ display: 'block' }}
      >
        {/* Full roll body */}
        <rect x={1} y={1} width={SVG_W} height={SVG_H} rx={3}
          fill="#FFFBF9" stroke="#DFC4B6" strokeWidth={1} />

        {/* Design cells */}
        {rects.map((r, i) => (
          <rect key={i}
            x={1 + r.x} y={1 + r.y}
            width={Math.max(cellW, 3)} height={Math.max(cellH, 3)}
            fill={r.active ? 'rgba(225,112,85,0.18)' : 'rgba(225,112,85,0.04)'}
            stroke={r.active ? '#E17055' : '#E1705525'}
            strokeWidth={r.active ? 1 : 0.5}
            strokeDasharray={r.active ? 'none' : '3 3'}
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
          Consumo: <span style={{ color: '#E17055' }}>{fmtConsumo(consumoCm)} de rollo (ancho {rollWidth} cm)</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {quantity} diseños de {designW}&times;{designH} cm
          {rotated && ' (rotado 90°)'}
        </p>
      </div>
    </div>
  )
}
