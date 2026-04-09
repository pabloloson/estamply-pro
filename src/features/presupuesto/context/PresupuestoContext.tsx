'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { PresupuestoItem } from '../types'

interface PresupuestoContextType {
  items: PresupuestoItem[]
  addItem: (item: Omit<PresupuestoItem, 'id'>) => void
  removeItem: (id: string) => void
  clearItems: () => void
  loadItems: (items: PresupuestoItem[]) => void
  totalVenta: number
  totalCosto: number
  totalGanancia: number
  loadedPresupuestoId: string | null
  setLoadedPresupuestoId: (id: string | null) => void
}

const PresupuestoContext = createContext<PresupuestoContextType | null>(null)

const LS_KEY = 'estamply-presupuesto'

export function PresupuestoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PresupuestoItem[]>([])
  const [loadedPresupuestoId, setLoadedPresupuestoId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<PresupuestoItem, 'id'>) => {
    setItems(p => [...p, { ...item, id: crypto.randomUUID() }])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(p => p.filter(i => i.id !== id))
  }, [])

  const clearItems = useCallback(() => { setItems([]); setLoadedPresupuestoId(null) }, [])

  const loadItems = useCallback((newItems: PresupuestoItem[]) => {
    setItems(newItems)
  }, [])

  const totalVenta = items.reduce((s, i) => s + i.subtotal, 0)
  const totalCosto = items.reduce((s, i) => s + i.costoUnit * i.cantidad, 0)
  const totalGanancia = items.reduce((s, i) => s + i.ganancia, 0)

  return (
    <PresupuestoContext.Provider value={{ items, addItem, removeItem, clearItems, loadItems, totalVenta, totalCosto, totalGanancia, loadedPresupuestoId, setLoadedPresupuestoId }}>
      {children}
    </PresupuestoContext.Provider>
  )
}

export function usePresupuesto() {
  const ctx = useContext(PresupuestoContext)
  if (!ctx) throw new Error('usePresupuesto must be used inside PresupuestoProvider')
  return ctx
}
