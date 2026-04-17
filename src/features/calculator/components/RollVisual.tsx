'use client'

const ROLL_MARGIN = 1 // cm — must match engine
const DESIGN_GAP = 1  // cm — must match engine

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

  const consumoCm = metrosLineales * 100
  // Display length: at least the consumed length, minimum half the roll width for visual balance
  const displayLengthCm = Math.max(consumoCm + 2, rollWidth * 0.4)

  // viewBox is exactly the roll dimensions in cm — no label area inside SVG
  const vbW = rollWidth
  const vbH = displayLengthCm

  // Clamp pixel height: min 100px, max 450px
  const aspect = vbH / vbW
  const containerMaxH = Math.max(Math.min(Math.round(aspect * 300), 450), 100)

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

  const sw = Math.max(rollWidth * 0.004, 0.15)

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div style={{ width: '100%', maxWidth: 280 }}>
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMin meet"
          style={{ width: '100%', maxHeight: containerMaxH, display: 'block' }}
        >
          {/* Roll background */}
          <rect x={0} y={0} width={vbW} height={vbH} rx={vbW * 0.015}
            fill="#FFFBF9" stroke="#DFC4B6" strokeWidth={sw} />

          {/* Design cells */}
          {rects.map((r, i) => (
            <rect key={i}
              x={r.x} y={r.y}
              width={cellW} height={cellH}
              fill={r.active ? `${color}2E` : `${color}0A`}
              stroke={r.active ? color : `${color}25`}
              strokeWidth={r.active ? sw : sw * 0.4}
              strokeDasharray={r.active ? 'none' : `${cellW * 0.12} ${cellW * 0.08}`}
              rx={Math.min(cellW, cellH) * 0.04}
            />
          ))}

          {/* Meter markers */}
          {meterMarkers.map((m, i) => (
            <g key={i}>
              <line x1={0} y1={m.y} x2={vbW} y2={m.y}
                stroke={color} strokeWidth={sw * 0.6} strokeDasharray={`${vbW * 0.025} ${vbW * 0.015}`} opacity={0.3} />
              <text x={vbW - 1} y={m.y - 0.5}
                textAnchor="end" fontSize={Math.max(vbW * 0.04, 1.5)} fontWeight={700} fill={color} opacity={0.5}>
                {m.label}
              </text>
            </g>
          ))}

          {/* Consumo line */}
          <line x1={0} y1={consumoCm} x2={vbW} y2={consumoCm}
            stroke={color} strokeWidth={sw} opacity={0.5} />
        </svg>
      </div>

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
