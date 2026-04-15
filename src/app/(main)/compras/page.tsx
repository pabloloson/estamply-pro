'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, Printer, EyeOff, MessageCircle, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocale } from '@/shared/context/LocaleContext'

interface OrderItem { tecnica: string; nombre: string; cantidad: number; origen?: string; variantName?: string; variantBreakdown?: Record<string, number> }
interface Order { id: string; status: string; due_date: string | null; created_at: string; items: OrderItem[]; clients?: { name: string } | null }
interface Product { id: string; name: string; supplier_id: string | null }
interface Supplier { id: string; name: string; whatsapp: string | null; website: string | null }

const SERVICE_KEYWORDS = ['envío', 'envio', 'diseño', 'diseno', 'urgencia', 'recargo', 'descuento', 'ajuste', 'flete', 'delivery', 'servicio', 'comisión', 'comision']

function isService(item: OrderItem): boolean {
  if (item.origen !== 'manual') return false
  return SERVICE_KEYWORDS.some(kw => item.nombre.toLowerCase().includes(kw))
}

function orderLabel(id: string, date: string) {
  const d = new Date(date)
  return `#${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${id.slice(0, 4)}`
}

interface ConsolidatedItem {
  nombre: string; required: number; variants: Record<string, number>
  pedidos: Array<{ id: string; label: string }>; supplierId: string | null
}

const LS_KEY = 'estamply-abastecimiento'

export default function AbastecimientoPage() {
  const supabase = createClient()
  const { fmt } = useLocale()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  // Persistent state (localStorage)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({})
  const [copied, setCopied] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  // Load persistent state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const { checked: c, hidden: h, qtyOverrides: q } = JSON.parse(saved)
        if (c) setChecked(c)
        if (h) setHidden(h)
        if (q) setQtyOverrides(q)
      }
    } catch {}
  }, [])

  // Save persistent state
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ checked, hidden, qtyOverrides }))
  }, [checked, hidden, qtyOverrides])

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: p }, { data: s }] = await Promise.all([
        supabase.from('orders').select('id, status, due_date, created_at, items, clients(name)').in('status', ['pending', 'production']).order('due_date', { ascending: true }),
        supabase.from('products').select('id, name, supplier_id'),
        supabase.from('suppliers').select('id, name, whatsapp, website').order('name'),
      ])
      setOrders((o || []) as unknown as Order[])
      setProducts((p || []) as Product[])
      setSuppliers((s || []) as Supplier[])
      setLoading(false)
    }
    load()
  }, [])

  // Consolidate
  const itemMap = new Map<string, ConsolidatedItem>()
  for (const order of orders) {
    for (const item of (order.items || []) as OrderItem[]) {
      if (isService(item)) continue
      const key = item.nombre
      const existing = itemMap.get(key) || { nombre: item.nombre, required: 0, variants: {}, pedidos: [], supplierId: null }
      existing.required += item.cantidad
      existing.pedidos.push({ id: order.id, label: orderLabel(order.id, order.created_at) })
      if (item.variantBreakdown) {
        for (const [k, v] of Object.entries(item.variantBreakdown)) {
          if (v > 0) existing.variants[k] = (existing.variants[k] || 0) + v
        }
      }
      // Find supplier from products table
      const prod = products.find(p => p.name === item.nombre)
      if (prod?.supplier_id) existing.supplierId = prod.supplier_id
      itemMap.set(key, existing)
    }
  }

  const allItems = Array.from(itemMap.values()).filter(p => !hidden[p.nombre]).sort((a, b) => b.required - a.required)

  // Group by supplier
  const groups = new Map<string, { supplier: Supplier | null; items: ConsolidatedItem[] }>()
  for (const item of allItems) {
    const sid = item.supplierId || 'none'
    const existing = groups.get(sid) || { supplier: suppliers.find(s => s.id === sid) || null, items: [] }
    existing.items.push(item)
    groups.set(sid, existing)
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a === 'none' ? 1 : b === 'none' ? -1 : 0)

  const getQty = (name: string, required: number) => qtyOverrides[name] ?? required
  const allChecked = allItems.length > 0 && allItems.every(p => checked[p.nombre])

  function copyToClipboard() {
    const sections: string[] = []
    for (const [, group] of sortedGroups) {
      const header = group.supplier ? `📦 ${group.supplier.name}:` : '📦 Sin proveedor:'
      sections.push(header)
      group.items.forEach(p => {
        const qty = getQty(p.nombre, p.required)
        const v = Object.keys(p.variants).length > 0 ? `\n  ${Object.entries(p.variants).map(([k, v]) => `${k}: ${v}`).join(', ')}` : ''
        sections.push(`• ${p.nombre} × ${qty}${v}`)
      })
      sections.push('')
    }
    const text = `📋 Abastecimiento — ${new Date().toLocaleDateString('es-AR')}\n\n${sections.join('\n')}Total: ${allItems.reduce((s, p) => s + getQty(p.nombre, p.required), 0)} unidades`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handlePrint() {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    let body = ''
    for (const [, group] of sortedGroups) {
      const title = group.supplier?.name || 'Sin proveedor asignado'
      const rows = group.items.map(p => {
        const qty = getQty(p.nombre, p.required)
        const variants = Object.keys(p.variants).length > 0
          ? `<div style="font-size:11px;color:#666;margin-top:2px">${Object.entries(p.variants).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>` : ''
        return `<tr><td style="padding:8px;border-bottom:1px solid #eee"><span style="display:inline-block;width:16px;height:16px;border:2px solid #333;border-radius:3px;margin-right:8px;vertical-align:middle"></span>${p.nombre}${variants}</td><td style="padding:8px;text-align:center;font-weight:700;font-size:16px;border-bottom:1px solid #eee">${qty}</td></tr>`
      }).join('')
      body += `<div style="font-size:13px;font-weight:700;text-transform:uppercase;color:#666;margin:20px 0 8px;letter-spacing:1px;border-bottom:1px solid #ccc;padding-bottom:4px">${title}</div><table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>`
    }

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Abastecimiento</title><style>body{font-family:Arial,sans-serif;color:#000;margin:0;padding:20mm}@page{size:A4;margin:0}</style></head><body>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #333"><div><div style="font-size:22px;font-weight:800">ABASTECIMIENTO</div><div style="font-size:12px;color:#666">${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:600">${orders.length} pedidos</div><div style="font-size:12px;color:#666">${allItems.reduce((s, p) => s + getQty(p.nombre, p.required), 0)} unidades</div></div></div>
      ${body}
      <div style="text-align:center;font-size:10px;color:#ccc;margin-top:32px">Estamply</div></body></html>`)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }

  function handleFinalize() {
    if (!confirm('¿Finalizar abastecimiento? Se limpiará la lista de compras marcadas.')) return
    setChecked({})
    setQtyOverrides({})
    setHidden({})
    localStorage.removeItem(LS_KEY)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abastecimiento</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} pedidos activos · {allItems.reduce((s, p) => s + getQty(p.nombre, p.required), 0)} unidades</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            {copied ? <><Check size={14} className="text-green-500" /> Copiado</> : <><Copy size={14} /> Copiar</>}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50"><Printer size={14} /> Imprimir</button>
          {Object.values(hidden).some(Boolean) && (
            <button onClick={() => setHidden({})} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Mostrar ocultos ({Object.values(hidden).filter(Boolean).length})</button>
          )}
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4 opacity-60">📋</span>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay materiales para comprar.</h3>
          <p className="text-sm text-gray-500">Cuando tengas pedidos activos, acá vas a ver el consolidado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([groupId, group]) => {
            const isOpen = openGroups[groupId] !== false // default open
            return (
              <div key={groupId}>
                {/* Supplier header */}
                <button onClick={() => setOpenGroups(prev => ({ ...prev, [groupId]: !isOpen }))} className="w-full flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{group.supplier?.name || 'Sin proveedor'}</span>
                    <span className="text-[10px] text-gray-300">{group.items.length} productos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.supplier?.whatsapp && (
                      <a href={`https://wa.me/${group.supplier.whatsapp.replace(/[\s\-\(\)]/g, '')}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-green-50"><MessageCircle size={14} className="text-green-500" /></a>
                    )}
                    {group.supplier?.website && (
                      <a href={group.supplier.website} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-blue-50"><Globe size={14} className="text-blue-500" /></a>
                    )}
                    {isOpen ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-2">
                    {group.items.map(item => {
                      const qty = getQty(item.nombre, item.required)
                      const uniquePedidos = [...new Map(item.pedidos.map(pd => [pd.id, pd])).values()]
                      return (
                        <div key={item.nombre} className={`card p-4 flex items-start gap-3 transition-all ${checked[item.nombre] ? 'bg-green-50/50 opacity-60' : ''}`}>
                          <input type="checkbox" checked={checked[item.nombre] || false}
                            onChange={() => setChecked(prev => ({ ...prev, [item.nombre]: !prev[item.nombre] }))}
                            className="w-5 h-5 rounded border-gray-300 text-purple-600 mt-0.5 flex-shrink-0 cursor-pointer" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`font-semibold text-gray-800 ${checked[item.nombre] ? 'line-through text-gray-400' : ''}`}>{item.nombre}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <input type="number" min={0} className="w-16 text-center text-sm font-bold border border-gray-200 rounded-md py-1 bg-white"
                                  value={qty} onChange={e => setQtyOverrides(prev => ({ ...prev, [item.nombre]: Number(e.target.value) || 0 }))} />
                                {qty !== item.required && <span className="text-[9px] text-gray-400">(req: {item.required})</span>}
                                <button onClick={() => setHidden(prev => ({ ...prev, [item.nombre]: true }))} className="p-1 rounded hover:bg-gray-100" title="Ocultar"><EyeOff size={12} className="text-gray-300" /></button>
                              </div>
                            </div>
                            {Object.keys(item.variants).length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {Object.entries(item.variants).map(([k, v]) => (
                                  <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">{k}: {v}</span>
                                ))}
                              </div>
                            )}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {uniquePedidos.map(pd => (
                                <Link key={pd.id} href="/orders" className="text-[10px] text-purple-400 hover:text-purple-600 hover:underline">{pd.label}</Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {allChecked && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center space-y-2">
              <p className="text-sm font-semibold text-green-700">✅ Todos los materiales marcados.</p>
              <button onClick={handleFinalize} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>Finalizar abastecimiento</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
