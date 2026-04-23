'use client'

interface RollVisualProps {
  rollWidth: number
  designW: number
  designH: number
  cols: number
  rows: number
  quantity: number
  rotated: boolean
  metrosLineales: number
  color?: string
  margin?: number
}

function fmtConsumo(cm: number) {
  if (cm >= 100) return `${(cm / 100).toFixed(2)}m`
  return `${Math.round(cm)} cm`
}

export function RollVisual({ rollWidth, designW, designH, cols, rows, quantity, rotated, metrosLineales, margin = 0.5 }: RollVisualProps) {
  const w = rotated ? designH : designW
  const h = rotated ? designW : designH
  const gap = Math.max(margin, 0.2)

  const consumoCm = metrosLineales * 100
  const displayH = Math.max(consumoCm + gap, rollWidth * 0.35)

  // Stroke scales with roll size — thin but visible at any density
  const sw = Math.max(0.1, rollWidth * 0.003)

  // Build design rects in real cm
  let placed = 0
  const rects: { x: number; y: number; active: boolean }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: gap + c * (w + gap),
        y: gap + r * (h + gap),
        active: placed < quantity,
      })
      placed++
    }
  }

  // Meter marks (only if consumption > 50cm)
  const meters: number[] = []
  if (displayH > 50) {
    for (let m = 100; m < displayH; m += 100) meters.push(m)
  }

  // Font size for meter labels — proportional to roll width
  const mFontSize = Math.max(2, rollWidth * 0.05)

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div style={{ width: '100%', maxWidth: 380, maxHeight: 400, overflowY: 'auto', minHeight: 100 }}>
        <svg
          viewBox={`0 0 ${rollWidth} ${displayH}`}
          preserveAspectRatio="xMidYMin meet"
          style={{ width: '100%', display: 'block' }}
        >
          {/* Roll background */}
          <rect x={0} y={0} width={rollWidth} height={displayH}
            fill="#F8F7FF" stroke="#E2DFF0" strokeWidth={0.3} rx={0.5} />

          {/* Designs */}
          {rects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={w} height={h}
              fill={r.active ? '#E8DEF8' : '#F3F0FF'}
              stroke={r.active ? '#7C3AED' : '#D8D0F0'}
              strokeWidth={r.active ? sw : sw * 0.5}
              strokeDasharray={r.active ? 'none' : `${w * 0.1} ${w * 0.08}`}
              rx={0.3} />
          ))}

          {/* Meter marks */}
          {meters.map(m => (
            <g key={m}>
              <line x1={0} y1={m} x2={rollWidth} y2={m}
                stroke="#9CA3AF" strokeDasharray="2 2" strokeWidth={0.2} />
              {/* Label background for legibility */}
              <rect x={rollWidth - mFontSize * 2.5 - 0.5} y={m - mFontSize - 0.3}
                width={mFontSize * 2.5} height={mFontSize + 0.6}
                fill="white" opacity={0.7} rx={0.3} />
              <text x={rollWidth - 0.8} y={m - 0.3}
                textAnchor="end" fontSize={mFontSize} fontWeight={600} fill="#6B7280">
                {m / 100}m
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="text-center leading-tight">
        <p className="text-sm font-bold text-gray-700">
          Consumo: <span className="text-teal-700">{fmtConsumo(consumoCm)} de rollo (ancho {rollWidth} cm)</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {quantity} diseños de {designW}&times;{designH} cm
          {rotated && ' (rotado 90°)'}
        </p>
      </div>
    </div>
  )
}
