'use client'

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import type { Insumo, TecnicaSlug } from '@/features/taller/types'

interface ProductionConfigProps {
  slug: TecnicaSlug
  papelInsumos: Insumo[]
  printers: Array<{ id: string; name: string }>
  presses: Array<{ id: string; name: string }>
  selectedPapelId: string
  selectedPrinterId: string
  selectedPressId: string
  onPapelChange: (id: string) => void
  onPrinterChange: (id: string) => void
  onPressChange: (id: string) => void
}

export default function ProductionConfig({
  slug, papelInsumos, printers, presses,
  selectedPapelId, selectedPrinterId, selectedPressId,
  onPapelChange, onPrinterChange, onPressChange,
}: ProductionConfigProps) {
  const [open, setOpen] = useState(false)

  const showPapel = ['subli', 'dtf', 'dtf_uv'].includes(slug)
  const showPrinter = ['subli', 'dtf', 'dtf_uv'].includes(slug)
  const showPress = !['serigrafia'].includes(slug) // most techniques use a press

  if (!showPapel && !showPrinter && !showPress) return null

  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors w-full py-1">
        <Settings2 size={12} />
        <span className="uppercase tracking-wide">Configuración de producción</span>
        <span className="ml-auto text-[10px]">{open ? '▾' : '▸'}</span>
      </button>

      <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: open ? 300 : 0, opacity: open ? 1 : 0 }}>
        <div className="pt-3 space-y-3">
          {showPapel && papelInsumos.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Papel / Film</label>
              <select className="input-base text-sm" value={selectedPapelId} onChange={e => onPapelChange(e.target.value)}>
                {papelInsumos.map(ins => {
                  const cfg = ins.config as Record<string, unknown>
                  const fmt = cfg.formato === 'rollo' ? 'Rollo' : 'Hojas'
                  return <option key={ins.id} value={ins.id}>{ins.nombre} — {fmt}</option>
                })}
              </select>
            </div>
          )}

          {showPrinter && printers.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Impresora</label>
              <select className="input-base text-sm" value={selectedPrinterId} onChange={e => onPrinterChange(e.target.value)}>
                <option value="">Sin impresora</option>
                {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {showPress && presses.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Plancha</label>
              <select className="input-base text-sm" value={selectedPressId} onChange={e => onPressChange(e.target.value)}>
                <option value="">Sin plancha</option>
                {presses.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
