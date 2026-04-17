'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import type { Insumo, TecnicaSlug } from '@/features/taller/types'

interface ProductionConfigProps {
  slug: TecnicaSlug
  papelInsumos: Insumo[]
  tintaInsumos: Insumo[]
  printers: Array<{ id: string; name: string }>
  presses: Array<{ id: string; name: string }>
  selectedPapelId: string
  selectedTintaId: string
  selectedPrinterId: string
  selectedPressId: string
  onPapelChange: (id: string) => void
  onTintaChange: (id: string) => void
  onPrinterChange: (id: string) => void
  onPressChange: (id: string) => void
  // DTF mode
  dtfMode?: 'propia' | 'tercerizado'
  onDtfModeChange?: (mode: 'propia' | 'tercerizado') => void
}

export default function ProductionConfig({
  slug, papelInsumos, tintaInsumos, printers, presses,
  selectedPapelId, selectedTintaId, selectedPrinterId, selectedPressId,
  onPapelChange, onTintaChange, onPrinterChange, onPressChange,
  dtfMode, onDtfModeChange,
}: ProductionConfigProps) {
  const isDTF = slug === 'dtf' || slug === 'dtf_uv'
  const isSubli = slug === 'subli'
  const isVinyl = slug === 'vinyl'
  const isTercerizado = dtfMode === 'tercerizado'

  // Show mode dropdown for techniques that support tercerizado
  const showMode = isDTF || isSubli || isVinyl || slug === 'serigrafia'
  const needsPapel = (isSubli || isDTF) && !isTercerizado
  const showPapel = needsPapel && papelInsumos.length > 0
  const showPapelEmpty = needsPapel && papelInsumos.length === 0

  // Auto-open when paper is missing so user sees the warning
  const [open, setOpen] = useState(showPapelEmpty)
  const needsTinta = (isSubli || isDTF) && !isTercerizado
  const showTinta = needsTinta && tintaInsumos.length > 0
  const showTintaEmpty = needsTinta && tintaInsumos.length === 0
  const showPrinter = (isSubli || isVinyl || isDTF) && !isTercerizado && printers.length > 0
  const showPress = presses.length > 0 && slug !== 'serigrafia'

  if (!showMode && !showPapel && !showPapelEmpty && !showPrinter && !showPress) return null

  const printerLabel = isVinyl ? 'Plotter de corte' : isDTF ? (slug === 'dtf_uv' ? 'Plotter UV' : 'Plotter de impresión') : 'Impresora'
  const papelLabel = isDTF ? 'Film DTF' : 'Papel / Film'

  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors w-full py-1">
        <Settings2 size={12} />
        <span className="uppercase tracking-wide">Configuración de producción</span>
        <span className="ml-auto text-[10px]">{open ? '▾' : '▸'}</span>
      </button>

      <div className="overflow-hidden transition-all duration-200" style={{ maxHeight: open ? 500 : 0, opacity: open ? 1 : 0 }}>
        <div className="pt-3 space-y-3">
          {showMode && onDtfModeChange && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Modo</label>
              <select className="input-base text-sm" value={dtfMode} onChange={e => onDtfModeChange(e.target.value as 'propia' | 'tercerizado')}>
                <option value="propia">Producción propia</option>
                <option value="tercerizado">Tercerizado</option>
              </select>
            </div>
          )}

          {showPrinter && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{printerLabel}</label>
              <select className="input-base text-sm" value={selectedPrinterId} onChange={e => onPrinterChange(e.target.value)}>
                <option value="">Sin {printerLabel.toLowerCase()}</option>
                {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {showPapel && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{papelLabel}</label>
              <select className="input-base text-sm" value={selectedPapelId} onChange={e => onPapelChange(e.target.value)}>
                {papelInsumos.map(ins => {
                  const cfg = ins.config as Record<string, unknown>
                  const fmtStr = cfg.formato === 'rollo' ? 'Rollo' : 'Hojas'
                  return <option key={ins.id} value={ins.id}>{ins.nombre} — {fmtStr}</option>
                })}
              </select>
            </div>
          )}

          {showPapelEmpty && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[10px] font-medium text-amber-700">
                No hay {papelLabel.toLowerCase()} vinculado a esta técnica.{' '}
                <Link href="/settings/insumos" className="underline font-bold hover:text-amber-900">Configurar en Insumos</Link>
              </p>
            </div>
          )}

          {showTinta && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tinta</label>
              <select className="input-base text-sm" value={selectedTintaId} onChange={e => onTintaChange(e.target.value)}>
                {tintaInsumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nombre}</option>)}
              </select>
            </div>
          )}
          {showTintaEmpty && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[10px] font-medium text-amber-700">
                No hay tinta vinculada a esta técnica.{' '}
                <Link href="/settings/insumos" className="underline font-bold hover:text-amber-900">Configurar en Insumos</Link>
              </p>
            </div>
          )}

          {showPress && (
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
