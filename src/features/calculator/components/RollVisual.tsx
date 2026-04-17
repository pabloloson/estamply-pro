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
  color?: string
}

function fmtConsumo(cm: number) {
  if (cm >= 100) return `${(cm / 100).toFixed(2)}m`
  return `${Math.round(cm)} cm`
}

export function RollVisual({ rollWidth, designW, designH, cols, rows, quantity, rotated, metrosLineales, color = '#E17055' }: RollVisualProps) {
  const cellW = rotated ? designH : designW
  const cellH = rotated ? designW : designH

  // Actual length consumed in cm (matches engine calculation)
  const usedLengthCm = ROLL_MARGIN * 2 + rows * cellH + Math.max(rows - 1, 0) * DESIGN_GAP
  const displayLengthCm = Math.max(Math.ceil(usedLengthCm / 10) * 10, rollWidth * 0.5)

  // Use viewBox in real cm so everything scales proportionally
  const LABEL_AREA = rollWidth * 0.2
  const vbW = rollWidth + LABEL_AREA
  const vbH = displayLengthCm

  // SVG pixel dimensions — fixed width, height proportional
  const SVG_W = 200
  const SVG_H = Math.max(Math.min(Math.round(SVG_W * vbH / vbW), 500), 60)

  // Meter markers
  const meterMarkers: { y: number; label: string }[] = []
  for (let m = 1; m <= Math.floor(displayLengthCm / 100); m++) {
    meterMarkers.push({ y: m * 100, label: `${m}m` })
  }

  // Design cells positioned in real cm coordinates
  let placed = 0
  const rects: { x: number; y: number; active: boolean }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ROLL_MARGIN + c * (cellW + DESIGN_GAP)
      const y = ROLL_MARGIN + r * (cellH + DESIGN_GAP)
      rects.push({ x, y, active: placed < quantity })
      placed++
    }
  }

  const consumoCm = metrosLineales * 100
  const strokeW = Math.max(rollWidth * 0.005, 0.2)

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ display: 'block' }}
      >
        {/* Full roll body */}
        <rect x={0} y={0} width={rollWidth} height={displayLengthCm} rx={rollWidth * 0.02}
          fill="#FFFBF9" stroke="#DFC4B6" strokeWidth={strokeW} />

        {/* Design cells */}
        {rects.map((r, i) => (
          <rect key={i}
            x={r.x} y={r.y}
            width={Math.max(cellW, 0.5)} height={Math.max(cellH, 0.5)}
            fill={r.active ? `${color}2E` : `${color}0A`}
            stroke={r.active ? color : `${color}25`}
            strokeWidth={r.active ? strokeW : strokeW * 0.5}
            strokeDasharray={r.active ? 'none' : `${cellW * 0.15} ${cellW * 0.1}`}
            rx={Math.min(cellW, cellH) * 0.05}
          />
        ))}

        {/* Meter markers */}
        {meterMarkers.map((m, i) => (
          <g key={i}>
            <line x1={0} y1={m.y} x2={rollWidth} y2={m.y}
              stroke={color} strokeWidth={strokeW * 0.7} strokeDasharray={`${rollWidth * 0.03} ${rollWidth * 0.02}`} opacity={0.3} />
            <text x={rollWidth + LABEL_AREA * 0.5} y={m.y + vbH * 0.01}
              textAnchor="middle" fontSize={vbH * 0.04} fontWeight={700} fill={color} opacity={0.6}>
              {m.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="text-center leading-tight">
        <p className="text-sm font-bold text-gray-700">
          Consumo: <span style={{ color }}>{fmtConsumo(consumoCm)} de rollo (ancho {rollWidth} cm)</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {quantity} diseños de {designW}&times;{designH} cm
          {rotated && ' (rotado 90°)'}
        </p>
      </div>
    </div>
  )
}
