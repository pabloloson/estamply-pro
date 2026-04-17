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

export function RollVisual({ rollWidth, designW, designH, cols, rows, quantity, rotated, metrosLineales, color = '#E17055', margin = 0.5 }: RollVisualProps) {
  const w = rotated ? designH : designW
  const h = rotated ? designW : designH
  const gap = margin

  const consumoCm = metrosLineales * 100
  const displayH = Math.max(consumoCm + 1, rollWidth * 0.4)

  // Build rects in real cm
  let placed = 0
  const rects: { x: number; y: number; w: number; h: number; active: boolean }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: gap + c * (w + gap),
        y: gap + r * (h + gap),
        w, h,
        active: placed < quantity,
      })
      placed++
    }
  }

  // Meter marks
  const meters: number[] = []
  for (let m = 100; m < displayH; m += 100) meters.push(m)

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div style={{ width: '100%', maxWidth: 360, maxHeight: 450, overflowY: 'auto' }}>
        <svg
          viewBox={`0 0 ${rollWidth} ${displayH}`}
          preserveAspectRatio="xMidYMin meet"
          style={{ width: '100%', display: 'block' }}
        >
          {/* Roll background */}
          <rect x={0} y={0} width={rollWidth} height={displayH}
            fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={0.3} rx={0.5} />

          {/* Designs */}
          {rects.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h}
              fill={r.active ? '#E8DEF8' : '#F3F0FF'}
              stroke={r.active ? color : '#C4B5FD'}
              strokeWidth={r.active ? 0.15 : 0.08}
              strokeDasharray={r.active ? 'none' : '0.5 0.3'}
              rx={0.2} />
          ))}

          {/* Meter marks */}
          {meters.map(m => (
            <g key={m}>
              <line x1={0} y1={m} x2={rollWidth} y2={m}
                stroke="#9CA3AF" strokeDasharray="1 1" strokeWidth={0.2} />
              <text x={rollWidth - 1} y={m - 0.5}
                textAnchor="end" fontSize={3} fill="#6B7280">{m / 100}m</text>
            </g>
          ))}

          {/* Consumption line */}
          <line x1={0} y1={consumoCm} x2={rollWidth} y2={consumoCm}
            stroke={color} strokeWidth={0.25} opacity={0.6} />
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
