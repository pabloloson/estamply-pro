'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings2, ChevronDown } from 'lucide-react'
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
  // Horno (DTF Textil only)
  hornos?: Array<{ id: string; name: string }>
  selectedHornoId?: string
  onHornoChange?: (id: string) => void
  // Pulpo (Serigrafía only)
  pulpos?: Array<{ id: string; name: string }>
  selectedPulpoId?: string
  onPulpoChange?: (id: string) => void
  // Tinta serigráfica
  tintaSeriInsumos?: Insumo[]
  selectedTintaSeriId?: string
  onTintaSeriChange?: (id: string) => void
}

export default function ProductionConfig({
  slug, papelInsumos, tintaInsumos, printers, presses,
  selectedPapelId, selectedTintaId, selectedPrinterId, selectedPressId,
  onPapelChange, onTintaChange, onPrinterChange, onPressChange,
  dtfMode, onDtfModeChange,
  hornos = [], selectedHornoId, onHornoChange,
  pulpos = [], selectedPulpoId, onPulpoChange,
  tintaSeriInsumos = [], selectedTintaSeriId, onTintaSeriChange,
}: ProductionConfigProps) {
  const isDTF = slug === 'dtf' || slug === 'dtf_uv'
  const isSubli = slug === 'subli'
  const isVinyl = slug === 'vinyl' || slug === 'vinyl_adhesivo'
  const isTercerizado = dtfMode === 'tercerizado'
  const isSerigrafia = slug === 'serigrafia'

  // Show mode dropdown for techniques that support tercerizado
  const showMode = isDTF || isSubli || isVinyl || isSerigrafia
  const needsPapel = (isSubli || isDTF) && !isTercerizado
  const showPapel = needsPapel && papelInsumos.length > 0
  const showPapelEmpty = needsPapel && papelInsumos.length === 0

  // Auto-open when paper is missing so user sees the warning
  const [open, setOpen] = useState(showPapelEmpty)
  const needsTinta = (isSubli || isDTF) && !isTercerizado
  const showTinta = needsTinta && tintaInsumos.length > 0
  const showTintaEmpty = needsTinta && tintaInsumos.length === 0
  const showPrinter = (isSubli || isVinyl || isDTF) && !isTercerizado && printers.length > 0
  const showPress = presses.length > 0 && !isSerigrafia && slug !== 'dtf_uv' && slug !== 'vinyl_adhesivo'
  const showPulpo = isSerigrafia && !isTercerizado && pulpos.length > 0
  const showTintaSeri = isSerigrafia && !isTercerizado && tintaSeriInsumos.length > 0

  if (!showMode && !showPapel && !showPapelEmpty && !showPrinter && !showPress && !showPulpo && !showTintaSeri) return null

  const printerLabel = isVinyl ? 'Plotter de corte' : isDTF ? (slug === 'dtf_uv' ? 'Plotter UV' : 'Plotter de impresión') : 'Impresora'
  const papelLabel = isDTF ? 'Film DTF' : 'Papel / Film'

  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 hover:text-gray-700 transition-colors w-full py-2">
        <Settings2 size={14} className="text-gray-400" />
        <span className="uppercase tracking-wide">Configuración de producción</span>
        <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
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
                  const isRoll = cfg.formato === 'rollo' || (ins.tipo === 'film' && (cfg.largo as number) > 0)
                  const fmtStr = isRoll ? 'Rollo' : 'Hojas'
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

          {slug === 'dtf' && !isTercerizado && hornos.length > 0 && onHornoChange && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Horno</label>
              <select className="input-base text-sm" value={selectedHornoId || ''} onChange={e => onHornoChange(e.target.value)}>
                <option value="">Sin horno</option>
                {hornos.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}

          {showPulpo && onPulpoChange && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Pulpo</label>
              <select className="input-base text-sm" value={selectedPulpoId || ''} onChange={e => onPulpoChange(e.target.value)}>
                <option value="">Sin pulpo</option>
                {pulpos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {showTintaSeri && onTintaSeriChange && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tinta serigráfica</label>
              <select className="input-base text-sm" value={selectedTintaSeriId || ''} onChange={e => onTintaSeriChange(e.target.value)}>
                {tintaSeriInsumos.map(ins => <option key={ins.id} value={ins.id}>{ins.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
