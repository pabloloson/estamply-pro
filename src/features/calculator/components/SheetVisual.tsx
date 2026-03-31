'use client'

interface SheetVisualProps {
  sheetW: number
  sheetH: number
  designW: number
  designH: number
  cols: number
  rows: number
  rotated: boolean
}

export function SheetVisual({ sheetW, sheetH, designW, designH, cols, rows, rotated }: SheetVisualProps) {
  const SVG_W = 130
  const SVG_H = Math.round(SVG_W * (sheetH / sheetW)) // maintain A4 ratio

  const scaleX = SVG_W / sheetW
  const scaleY = SVG_H / sheetH

  // When rotated, the design is placed sideways
  const dW = rotated ? designH * scaleX : designW * scaleX
  const dH = rotated ? designW * scaleY : designH * scaleY

  const rects: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: c * dW, y: r * dH })
    }
  }

  const totalDesigns = cols * rows

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

        {/* Design cells */}
        {rects.map((r, i) => (
          <rect
            key={i}
            x={r.x + 1.5}
            y={r.y + 1.5}
            width={Math.max(dW - 3, 2)}
            height={Math.max(dH - 3, 2)}
            fill="rgba(108,92,231,0.22)"
            stroke="#6C5CE7"
            strokeWidth={1.2}
            rx={2}
          />
        ))}

        {/* Waste area: remaining sheet */}
        <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="none" stroke="#C4B9F5" strokeWidth={1} rx={4} strokeDasharray="3 2" />
      </svg>

      <div className="text-center leading-tight">
        <p className="text-xs font-bold text-gray-700">
          {cols}×{rows}{' '}
          <span style={{ color: '#6C5CE7' }}>= {totalDesigns} diseños/hoja</span>
        </p>
        {rotated && <p className="text-xs text-gray-400">(rotado 90°)</p>}
      </div>
    </div>
  )
}
