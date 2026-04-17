'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type { Category } from '../types'

interface Props {
  categories: Category[]
  onSave: (cat: Partial<Category>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export default function CategoryModal({ categories, onSave, onDelete, onClose }: Props) {
  const [editing, setEditing] = useState<Partial<Category> | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Categorías</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div>
                <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                <span className="text-xs text-gray-400 ml-2">{cat.pricing_mode === 'markup' ? 'Markup' : 'Margen'}: {cat.margen_sugerido}%</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(cat)} className="p-1.5 rounded hover:bg-gray-200"><Pencil size={13} className="text-gray-400" /></button>
                <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(cat.id) }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No hay categorías</p>}
        </div>

        {editing ? (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
              <input className="input-base" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Ej: Textil" /></div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">{editing.pricing_mode === 'markup' ? 'Markup' : 'Margen'} sugerido (%)</label>
                <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                  {[['margin', 'Margen'], ['markup', 'Markup']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setEditing({ ...editing, pricing_mode: v as 'margin' | 'markup' })}
                      className={`px-2 py-0.5 text-[10px] font-semibold ${(editing.pricing_mode || 'margin') === v ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>{l}</button>
                  ))}
                </div>
              </div>
              <input type="number" className="input-base" value={editing.margen_sugerido ?? 50} onChange={e => setEditing({ ...editing, margen_sugerido: Number(e.target.value) })} />
              <p className="text-[11px] text-gray-400 mt-0.5">Se sugiere automáticamente al cotizar productos de esta categoría.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg text-sm font-semibold text-gray-500 border border-gray-200">Cancelar</button>
              <button onClick={async () => { await onSave(editing); setEditing(null) }} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>Guardar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing({ name: '', margen_sugerido: 50 })} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold border-2 border-dashed border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-colors">
            <Plus size={14} /> Nueva categoría
          </button>
        )}
      </div>
    </div>
  )
}
