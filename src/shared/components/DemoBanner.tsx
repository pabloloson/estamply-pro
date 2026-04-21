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
    <div className="bg-purple-50 border-b border-purple-100 px-4 py-2.5 flex items-center justify-center gap-3 text-sm no-print">
      <span className="text-purple-700">
        🎯 Cargamos datos de ejemplo para que explores la plataforma — los valores son de referencia, editálos con tus costos reales.
      </span>
      <button onClick={handleClean} disabled={cleaning}
        className="text-xs font-semibold text-purple-600 hover:text-purple-800 underline whitespace-nowrap">
        {cleaning ? 'Limpiando...' : 'Limpiar datos de demo'}
      </button>
      <button onClick={() => setShow(false)} className="p-0.5 rounded hover:bg-purple-100 flex-shrink-0">
        <X size={14} className="text-purple-400" />
      </button>
    </div>
  )
}
