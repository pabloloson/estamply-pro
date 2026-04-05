'use client'

import { RotateCcw } from 'lucide-react'

interface MoInputProps {
  mo: number
  onMoChange: (val: number) => void
  ruleLabel: string
  isOverride: boolean
  hasConfig: boolean
  onResetOverride: () => void
}

export default function MoInput({ mo, onMoChange, ruleLabel, isOverride, hasConfig, onResetOverride }: MoInputProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        Mano de obra ($/u)
      </label>
      <div className="relative">
        <input
          type="number"
          className="input-base pr-8"
          min={0}
          value={mo}
          onChange={e => onMoChange(Number(e.target.value))}
        />
        {isOverride && hasConfig && (
          <button
            type="button"
            onClick={onResetOverride}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
            title="Volver a regla automática"
          >
            <RotateCcw size={12} className="text-gray-400" />
          </button>
        )}
      </div>
      {hasConfig && (
        <p className="text-[10px] mt-1 font-medium" style={{ color: isOverride ? '#E17055' : '#00B894' }}>
          Regla: {ruleLabel}
        </p>
      )}
    </div>
  )
}
