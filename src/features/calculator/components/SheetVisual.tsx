'use client'

const PRINTER_MARGIN = 0.5 // cm per side — must match hook

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
}

export function SheetVisual({ sheetW, sheetH, designW, designH, cols, rows, rotated, perSheet, sheetsNeeded, quantity }: SheetVisualProps) {
  const SVG_W = 140
  const SVG_H = Math.round(SVG_W * (sheetH / sheetW))

  const scaleX = SVG_W / sheetW
  const scaleY = SVG_H / sheetH

  const mx = PRINTER_MARGIN * scaleX
  const my = PRINTER_MARGIN * scaleY

  const dW = (rotated ? designH : designW) * scaleX
  const dH = (rotated ? designW : designH) * scaleY

  const rects: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: mx + c * dW, y: my + r * dH })
    }
  }

  // How many positions are actually used on the first sheet
  const usedOnFirstSheet = Math.min(quantity, perSheet)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ borderRadius: 5, display: 'block', overflow: 'hidden' }}
      >
        {/* Sheet background */}
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#F8F8FC" stroke="#E0DCF8" strokeWidth={1.5} rx={4} />

        {/* Margin zones */}
        <rect x={0} y={0} width={SVG_W} height={my} fill="rgba(200,190,230,0.15)" />
        <rect x={0} y={SVG_H - my} width={SVG_W} height={my} fill="rgba(200,190,230,0.15)" />
        <rect x={0} y={my} width={mx} height={SVG_H - my * 2} fill="rgba(200,190,230,0.15)" />
        <rect x={SVG_W - mx} y={my} width={mx} height={SVG_H - my * 2} fill="rgba(200,190,230,0.15)" />

        {/* Printable area border */}
        <rect x={mx} y={my} width={SVG_W - mx * 2} height={SVG_H - my * 2}
          fill="none" stroke="#C4B9F5" strokeWidth={0.5} strokeDasharray="3 2" />

        {/* Design cells — used positions colored, empty positions dashed */}
        {rects.map((r, i) => {
          const isUsed = i < usedOnFirstSheet
          return (
            <rect key={i} x={r.x + 1} y={r.y + 1}
              width={Math.max(dW - 2, 2)} height={Math.max(dH - 2, 2)}
              fill={isUsed ? 'rgba(108,92,231,0.22)' : 'transparent'}
              stroke={isUsed ? '#6C5CE7' : '#D0CAE8'}
              strokeWidth={isUsed ? 1 : 0.5}
              strokeDasharray={isUsed ? 'none' : '3 3'}
              rx={2} />
          )
        })}

        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="none" stroke="#D0CAE8" strokeWidth={1.2} rx={4} />
      </svg>

      <div className="text-center leading-tight">
        <p className="text-sm font-bold text-gray-700">
          Consumo estimado: <span style={{ color: '#6C5CE7' }}>{sheetsNeeded} {sheetsNeeded === 1 ? 'hoja' : 'hojas'} {sheetW}×{sheetH} cm</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {usedOnFirstSheet} de {perSheet} posiciones usadas
          {rotated && ' (rotado 90°)'}
          &middot; margen {PRINTER_MARGIN} cm
        </p>
      </div>
    </div>
  )
}
