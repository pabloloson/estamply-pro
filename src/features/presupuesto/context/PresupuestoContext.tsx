'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { PresupuestoItem } from '../types'

interface PresupuestoContextType {
  items: PresupuestoItem[]
  addItem: (item: Omit<PresupuestoItem, 'id'>) => void
  updateItem: (id: string, changes: Partial<PresupuestoItem>) => void
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
const LS_PID_KEY = 'estamply-presupuesto-id'

export function PresupuestoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PresupuestoItem[]>([])
  const [loadedPresupuestoId, setLoadedPresupuestoIdState] = useState<string | null>(null)

  const setLoadedPresupuestoId = useCallback((id: string | null) => {
    setLoadedPresupuestoIdState(id)
    if (id) localStorage.setItem(LS_PID_KEY, id)
    else localStorage.removeItem(LS_PID_KEY)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) setItems(JSON.parse(saved))
      const savedPid = localStorage.getItem(LS_PID_KEY)
      if (savedPid) setLoadedPresupuestoIdState(savedPid)
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<PresupuestoItem, 'id'>) => {
    setItems(p => [...p, { ...item, id: crypto.randomUUID() }])
  }, [])

  const updateItem = useCallback((id: string, changes: Partial<PresupuestoItem>) => {
    setItems(p => p.map(i => i.id === id ? { ...i, ...changes } : i))
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
    <PresupuestoContext.Provider value={{ items, addItem, updateItem, removeItem, clearItems, loadItems, totalVenta, totalCosto, totalGanancia, loadedPresupuestoId, setLoadedPresupuestoId }}>
      {children}
    </PresupuestoContext.Provider>
  )
}

export function usePresupuesto() {
  const ctx = useContext(PresupuestoContext)
  if (!ctx) throw new Error('usePresupuesto must be used inside PresupuestoProvider')
  return ctx
}
