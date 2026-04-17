'use client'

interface SheetVisualProps {
  sheetW: number
  sheetH: number
  designW: number
  designH: number
  cols: number
  rows: number
  rotated: boolean
  perSheet: number
  sheetsNeeded: number
  quantity: number
  margin?: number
}

export function SheetVisual({ sheetW, sheetH, designW, designH, cols, rows, rotated, perSheet, sheetsNeeded, quantity, margin = 0.5 }: SheetVisualProps) {
  // Use viewBox in real cm — browser handles scaling
  const dW = rotated ? designH : designW
  const dH = rotated ? designW : designH

  const containerMaxH = Math.max(Math.min(Math.round(200 * (sheetH / sheetW)), 400), 80)

  const rects: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: margin + c * dW, y: margin + r * dH })
    }
  }

  const usedOnFirstSheet = Math.min(quantity, perSheet)
  const sw = Math.max(sheetW * 0.005, 0.15)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        viewBox={`0 0 ${sheetW} ${sheetH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', maxWidth: 220, maxHeight: containerMaxH, borderRadius: 5, display: 'block', overflow: 'hidden' }}
      >
        {/* Sheet background */}
        <rect x={0} y={0} width={sheetW} height={sheetH} fill="#F8F8FC" stroke="#E0DCF8" strokeWidth={sw * 1.5} rx={sheetW * 0.02} />

        {/* Margin zones */}
        <rect x={0} y={0} width={sheetW} height={margin} fill="rgba(200,190,230,0.15)" />
        <rect x={0} y={sheetH - margin} width={sheetW} height={margin} fill="rgba(200,190,230,0.15)" />
        <rect x={0} y={margin} width={margin} height={sheetH - margin * 2} fill="rgba(200,190,230,0.15)" />
        <rect x={sheetW - margin} y={margin} width={margin} height={sheetH - margin * 2} fill="rgba(200,190,230,0.15)" />

        {/* Printable area border */}
        <rect x={margin} y={margin} width={sheetW - margin * 2} height={sheetH - margin * 2}
          fill="none" stroke="#C4B9F5" strokeWidth={sw * 0.5} strokeDasharray={`${sheetW * 0.02} ${sheetW * 0.015}`} />

        {/* Design cells */}
        {rects.map((r, i) => {
          const isUsed = i < usedOnFirstSheet
          const pad = sw
          return (
            <rect key={i} x={r.x + pad} y={r.y + pad}
              width={Math.max(dW - pad * 2, 0.5)} height={Math.max(dH - pad * 2, 0.5)}
              fill={isUsed ? 'rgba(108,92,231,0.22)' : 'transparent'}
              stroke={isUsed ? '#6C5CE7' : '#D0CAE8'}
              strokeWidth={isUsed ? sw : sw * 0.5}
              strokeDasharray={isUsed ? 'none' : `${dW * 0.1} ${dW * 0.08}`}
              rx={Math.min(dW, dH) * 0.04} />
          )
        })}

        <rect x={0} y={0} width={sheetW} height={sheetH} fill="none" stroke="#D0CAE8" strokeWidth={sw * 1.2} rx={sheetW * 0.02} />
      </svg>

      <div className="text-center leading-tight">
        <p className="text-sm font-bold text-gray-700">
          Consumo estimado: <span style={{ color: '#6C5CE7' }}>{sheetsNeeded} {sheetsNeeded === 1 ? 'hoja' : 'hojas'} {sheetW}×{sheetH} cm</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {usedOnFirstSheet} de {perSheet} posiciones usadas
          {rotated && ' (rotado 90°)'}
          &middot; margen {margin} cm
        </p>
      </div>
    </div>
  )
}
