'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function DemoBanner() {
  const [show, setShow] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    // Check if there's demo data
    fetch('/api/data?table=products&isDemo=true&limit=1')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setShow(true) })
      .catch(() => {})
  }, [])

  if (!show) return null

  async function handleClean() {
    if (!confirm('¿Eliminar todos los datos de demo? Esta acción no se puede deshacer.')) return
    setCleaning(true)
    try {
      await fetch('/api/demo-data', { method: 'DELETE' })
      setShow(false)
    } catch { setCleaning(false) }
  }

  return (
    <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between gap-3 no-print">
      <p className="text-xs text-emerald-700 flex items-center gap-2 flex-1 min-w-0">
        <span className="text-base flex-shrink-0">🎯</span>
        <span className="truncate sm:hidden">Datos de ejemplo cargados</span>
        <span className="hidden sm:inline">Cargamos datos de ejemplo para que explores la plataforma — editálos con tus costos reales.</span>
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button onClick={handleClean} disabled={cleaning}
          className="text-xs font-semibold text-emerald-700 underline whitespace-nowrap">
          {cleaning ? 'Limpiando...' : 'Limpiar datos'}
        </button>
        <button onClick={() => setShow(false)} className="text-emerald-400 hover:text-emerald-600">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
