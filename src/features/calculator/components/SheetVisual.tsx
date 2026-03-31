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
  const svgW = 160
  const svgH = 220
  const scaleX = svgW / sheetW
  const scaleY = svgH / sheetH

  const dW = rotated ? designH * scaleX : designW * scaleX
  const dH = rotated ? designW * scaleY : designH * scaleY

  const rects: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: c * dW, y: r * dH })
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgW} height={svgH} style={{ border: '1.5px solid #E5E7EB', borderRadius: 6, background: '#fff' }}>
        {rects.map((r, i) => (
          <rect
            key={i}
            x={r.x + 1}
            y={r.y + 1}
            width={Math.max(dW - 2, 1)}
            height={Math.max(dH - 2, 1)}
            fill="rgba(108,92,231,0.25)"
            stroke="#6C5CE7"
            strokeWidth={1}
            rx={2}
          />
        ))}
      </svg>
      <span className="text-xs text-gray-400">
        {cols}×{rows} = {cols * rows} diseños/hoja {rotated && '(rotado 90°)'}
      </span>
    </div>
  )
}
