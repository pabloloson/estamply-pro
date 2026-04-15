'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, Printer, EyeOff } from 'lucide-react'
import { useLocale } from '@/shared/context/LocaleContext'

interface OrderItem { tecnica: string; nombre: string; cantidad: number; origen?: string; variantName?: string; variantBreakdown?: Record<string, number>; notas?: string; precioUnit?: number; subtotal?: number }
interface Order { id: string; status: string; due_date: string | null; created_at: string; items: OrderItem[]; clients?: { name: string } | null }

const SERVICE_KEYWORDS = ['envío', 'envio', 'diseño', 'diseno', 'urgencia', 'recargo', 'descuento', 'ajuste', 'flete', 'delivery', 'servicio', 'comisión', 'comision']

type ItemCategory = 'product' | 'extra' | 'service'

function categorizeItem(item: OrderItem): ItemCategory {
  if (item.origen === 'manual') {
    const lower = item.nombre.toLowerCase()
    if (SERVICE_KEYWORDS.some(kw => lower.includes(kw))) return 'service'
    return 'extra'
  }
  return 'product' // cotizador, catalogo items are products
}

function orderLabel(id: string, date: string) {
  const d = new Date(date)
  return `#${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${id.slice(0, 4)}`
}

interface ConsolidatedItem { nombre: string; total: number; variants: Record<string, number>; pedidos: Array<{ id: string; label: string }>; tecnica?: string }

export default function AbastecimientoPage() {
  const supabase = createClient()
  const { fmt } = useLocale()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('orders')
        .select('id, status, due_date, created_at, items, clients(name)')
        .in('status', ['pending', 'production'])
        .order('due_date', { ascending: true })
      setOrders((data || []) as unknown as Order[])
      setLoading(false)
    }
    load()
  }, [])

  // Consolidate into 3 categories
  const productMap = new Map<string, ConsolidatedItem>()
  const extraMap = new Map<string, ConsolidatedItem>()

  for (const order of orders) {
    for (const item of (order.items || []) as OrderItem[]) {
      const cat = categorizeItem(item)
      if (cat === 'service') continue // services excluded

      const map = cat === 'product' ? productMap : extraMap
      const key = item.nombre
      const existing = map.get(key) || { nombre: item.nombre, total: 0, variants: {}, pedidos: [], tecnica: item.tecnica }
      existing.total += item.cantidad
      existing.pedidos.push({ id: order.id, label: orderLabel(order.id, order.created_at) })
      if (item.variantBreakdown) {
        for (const [k, v] of Object.entries(item.variantBreakdown)) {
          if (v > 0) existing.variants[k] = (existing.variants[k] || 0) + v
        }
      }
      map.set(key, existing)
    }
  }

  const products = Array.from(productMap.values()).sort((a, b) => b.total - a.total).filter(p => !hidden[p.nombre])
  const extras = Array.from(extraMap.values()).sort((a, b) => b.total - a.total).filter(p => !hidden[p.nombre])
  const allItems = [...products, ...extras]
  const allChecked = allItems.length > 0 && allItems.every(p => checked[p.nombre])

  function copyToClipboard() {
    const sections: string[] = []
    if (products.length) {
      sections.push('🏷 PRODUCTOS Y BLANKS:')
      products.forEach(p => {
        const v = Object.keys(p.variants).length > 0 ? `\n  ${Object.entries(p.variants).map(([k, v]) => `${k}: ${v}`).join(', ')}` : ''
        sections.push(`• ${p.nombre} × ${p.total}${v}`)
      })
    }
    if (extras.length) {
      sections.push('\n📦 EXTRAS:')
      extras.forEach(p => sections.push(`• ${p.nombre} × ${p.total}`))
    }
    const text = `📋 Abastecimiento — ${new Date().toLocaleDateString('es-AR')}\n\n${sections.join('\n')}\n\nTotal: ${allItems.reduce((s, p) => s + p.total, 0)} unidades`
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

    const renderSection = (title: string, items: ConsolidatedItem[]) => {
      if (!items.length) return ''
      const rows = items.map(p => {
        const variants = Object.keys(p.variants).length > 0
          ? `<div style="font-size:11px;color:#666;margin-top:2px">${Object.entries(p.variants).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>`
          : ''
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee"><span style="display:inline-block;width:16px;height:16px;border:2px solid #333;border-radius:3px;margin-right:8px;vertical-align:middle"></span>${p.nombre}${variants}</td>
          <td style="padding:8px;text-align:center;font-weight:700;font-size:16px;border-bottom:1px solid #eee">${p.total}</td>
          <td style="padding:8px;font-size:11px;color:#999;border-bottom:1px solid #eee">${[...new Set(p.pedidos.map(pd => pd.label))].join(', ')}</td>
        </tr>`
      }).join('')
      return `<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#666;margin:16px 0 8px;letter-spacing:1px">${title}</div>
        <table><thead><tr><th style="font-size:11px;text-transform:uppercase;color:#999;font-weight:600;padding:8px;text-align:left;border-bottom:2px solid #333">Producto</th><th style="font-size:11px;text-transform:uppercase;color:#999;font-weight:600;padding:8px;text-align:center;border-bottom:2px solid #333">Cant.</th><th style="font-size:11px;text-transform:uppercase;color:#999;font-weight:600;padding:8px;text-align:left;border-bottom:2px solid #333">Pedidos</th></tr></thead><tbody>${rows}</tbody></table>`
    }

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Abastecimiento</title>
    <style>body{font-family:Arial,sans-serif;color:#000;margin:0;padding:20mm}table{width:100%;border-collapse:collapse}@page{size:A4;margin:0}</style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #333">
        <div><div style="font-size:22px;font-weight:800">ABASTECIMIENTO</div><div style="font-size:12px;color:#666">${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
        <div style="text-align:right"><div style="font-size:14px;font-weight:600">${orders.length} pedidos activos</div><div style="font-size:12px;color:#666">${allItems.reduce((s, p) => s + p.total, 0)} unidades totales</div></div>
      </div>
      ${renderSection('Productos y blanks', products)}
      ${renderSection('Extras de pedido', extras)}
      <div style="text-align:center;font-size:10px;color:#ccc;margin-top:32px">Estamply · estamply.app</div>
    </body></html>`)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }

  function renderItemCard(item: ConsolidatedItem) {
    const uniquePedidos = [...new Map(item.pedidos.map(pd => [pd.id, pd])).values()]
    return (
      <div key={item.nombre} className={`card p-4 flex items-start gap-3 transition-all ${checked[item.nombre] ? 'bg-green-50/50 opacity-60' : ''}`}>
        <input type="checkbox" checked={checked[item.nombre] || false}
          onChange={() => setChecked(prev => ({ ...prev, [item.nombre]: !prev[item.nombre] }))}
          className="w-5 h-5 rounded border-gray-300 text-purple-600 mt-0.5 flex-shrink-0 cursor-pointer" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`font-semibold text-gray-800 ${checked[item.nombre] ? 'line-through text-gray-400' : ''}`}>{item.nombre}</p>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className="text-lg font-bold text-gray-900">×{item.total}</span>
              <button onClick={() => setHidden(prev => ({ ...prev, [item.nombre]: true }))} className="p-1 rounded hover:bg-gray-100" title="Ocultar"><EyeOff size={13} className="text-gray-300 hover:text-gray-500" /></button>
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
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abastecimiento</h1>
          <p className="text-gray-500 text-sm mt-1">Consolidado de materiales para {orders.length} pedidos activos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            {copied ? <><Check size={14} className="text-green-500" /> Copiado</> : <><Copy size={14} /> Copiar lista</>}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <Printer size={14} /> Imprimir
          </button>
          {Object.values(hidden).some(Boolean) && (
            <button onClick={() => setHidden({})} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
              Mostrar ocultos ({Object.values(hidden).filter(Boolean).length})
            </button>
          )}
        </div>
      </div>

      {allItems.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4 opacity-60">📋</span>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay materiales para comprar.</h3>
          <p className="text-sm text-gray-500">Cuando tengas pedidos pendientes o en producción, acá vas a ver la lista consolidada.</p>
        </div>
      ) : (
        <div>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Productos</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{allItems.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Unidades totales</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{allItems.reduce((s, p) => s + p.total, 0)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pedidos</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{orders.length}</p>
            </div>
          </div>

          {/* Block 1: Productos y Blanks */}
          {products.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Productos y blanks</p>
              <div className="space-y-2">
                {products.map(renderItemCard)}
              </div>
            </div>
          )}

          {/* Block 2: Extras de pedido */}
          {extras.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Extras de pedido</p>
              <div className="space-y-2">
                {extras.map(renderItemCard)}
              </div>
            </div>
          )}

          {allChecked && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center">
              <p className="text-sm font-semibold text-green-700">✅ Todos los materiales marcados como comprados.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
