'use client'

import { useState, useEffect, useCallback, createContext } from 'react'
import { useParams } from 'next/navigation'

interface CartItem { productId: string; name: string; price: number; quantity: number; photo: string; variant: string }

export const CartCtx = createContext<{
  items: CartItem[]; add: (p: { id: string; name: string; selling_price: number; photos?: string[] }, qty: number, variant: string) => void
  update: (key: string, qty: number) => void; remove: (key: string) => void; total: number
}>({ items: [], add: () => {}, update: () => {}, remove: () => {}, total: 0 })

function CartProvider({ children, slug }: { children: React.ReactNode; slug: string }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(`cart-${slug}`) || '[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem(`cart-${slug}`, JSON.stringify(items)) }, [items, slug])
  const add = useCallback((p: { id: string; name: string; selling_price: number; photos?: string[] }, qty: number, variant: string) => {
    const key = variant ? `${p.id}::${variant}` : p.id
    setItems(prev => {
      const existing = prev.find(i => (i.variant ? `${i.productId}::${i.variant}` : i.productId) === key)
      if (existing) return prev.map(i => (i.variant ? `${i.productId}::${i.variant}` : i.productId) === key ? { ...i, quantity: i.quantity + qty } : i)
      return [...prev, { productId: p.id, name: p.name, price: p.selling_price, quantity: qty, photo: (p.photos || [])[0] || '', variant }]
    })
  }, [])
  const itemKey = (i: CartItem) => i.variant ? `${i.productId}::${i.variant}` : i.productId
  const update = useCallback((key: string, qty: number) => {
    if (qty <= 0) setItems(prev => prev.filter(i => itemKey(i) !== key))
    else setItems(prev => prev.map(i => itemKey(i) === key ? { ...i, quantity: qty } : i))
  }, [])
  const remove = useCallback((key: string) => setItems(prev => prev.filter(i => itemKey(i) !== key)), [])
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  return <CartCtx.Provider value={{ items, add, update, remove, total }}>{children}</CartCtx.Provider>
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>()
  return <CartProvider slug={slug}>{children}</CartProvider>
}
