'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Copy, Printer } from 'lucide-react'
import { useLocale } from '@/shared/context/LocaleContext'

interface OrderItem { tecnica: string; nombre: string; cantidad: number; variantName?: string; variantBreakdown?: Record<string, number> }
interface Order { id: string; status: string; due_date: string | null; created_at: string; items: OrderItem[]; clients?: { name: string } | null }

interface ConsolidatedProduct { nombre: string; total: number; variants: Record<string, number>; pedidos: string[] }

export default function ComprasPage() {
  const supabase = createClient()
  const { fmt } = useLocale()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
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

  // Consolidate products across all active orders
  const consolidated = new Map<string, ConsolidatedProduct>()
  for (const order of orders) {
    for (const item of (order.items || []) as OrderItem[]) {
      const key = item.nombre
      const existing = consolidated.get(key) || { nombre: item.nombre, total: 0, variants: {}, pedidos: [] }
      existing.total += item.cantidad
      existing.pedidos.push(`#${order.id.slice(0, 6)}`)
      if (item.variantBreakdown) {
        for (const [k, v] of Object.entries(item.variantBreakdown)) {
          existing.variants[k] = (existing.variants[k] || 0) + v
        }
      }
      consolidated.set(key, existing)
    }
  }
  const products = Array.from(consolidated.values()).sort((a, b) => b.total - a.total)

  const allChecked = products.length > 0 && products.every(p => checked[p.nombre])

  function copyToClipboard() {
    const lines = products.map(p => {
      const variants = Object.keys(p.variants).length > 0
        ? ` (${Object.entries(p.variants).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')})`
        : ''
      return `• ${p.nombre} × ${p.total}${variants}`
    })
    const text = `Lista de compras — ${new Date().toLocaleDateString('es-AR')}\n\n${lines.join('\n')}\n\nTotal: ${products.length} productos, ${products.reduce((s, p) => s + p.total, 0)} unidades`
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

    const rows = products.map(p => {
      const variants = Object.keys(p.variants).length > 0
        ? `<div style="font-size:11px;color:#666;margin-top:2px">${Object.entries(p.variants).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>`
        : ''
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee"><span style="display:inline-block;width:16px;height:16px;border:2px solid #333;border-radius:3px;margin-right:8px;vertical-align:middle"></span>${p.nombre}${variants}</td>
        <td style="padding:8px;text-align:center;font-weight:700;font-size:16px;border-bottom:1px solid #eee">${p.total}</td>
        <td style="padding:8px;font-size:11px;color:#999;border-bottom:1px solid #eee">${[...new Set(p.pedidos)].join(', ')}</td>
      </tr>`
    }).join('')

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Lista de Compras</title>
    <style>body{font-family:Arial,sans-serif;color:#000;margin:0;padding:20mm}table{width:100%;border-collapse:collapse}th{font-size:11px;text-transform:uppercase;color:#999;font-weight:600;padding:8px;text-align:left;border-bottom:2px solid #333}@page{size:A4;margin:0}</style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #333">
        <div><div style="font-size:22px;font-weight:800">LISTA DE COMPRAS</div><div style="font-size:12px;color:#666">${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
        <div style="text-align:right"><div style="font-size:14px;font-weight:600">${orders.length} pedidos activos</div><div style="font-size:12px;color:#666">${products.reduce((s, p) => s + p.total, 0)} unidades totales</div></div>
      </div>
      <table><thead><tr><th>Producto</th><th style="text-align:center">Cantidad</th><th>Pedidos</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="text-align:center;font-size:10px;color:#ccc;margin-top:32px">Estamply · estamply.app</div>
    </body></html>`)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-gray-500 text-sm mt-1">Consolidado de materiales para {orders.length} pedidos activos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            {copied ? <><Check size={14} className="text-green-500" /> Copiado</> : <><Copy size={14} /> Copiar lista</>}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4 opacity-60">📋</span>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay pedidos activos.</h3>
          <p className="text-sm text-gray-500">Cuando tengas pedidos pendientes o en producción, acá vas a ver la lista consolidada de materiales.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Productos</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{products.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Unidades totales</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{products.reduce((s, p) => s + p.total, 0)}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pedidos</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{orders.length}</p>
            </div>
          </div>

          {/* Product list */}
          {products.map(p => (
            <div key={p.nombre} className={`card p-4 flex items-start gap-3 transition-colors ${checked[p.nombre] ? 'bg-green-50/50 opacity-60' : ''}`}>
              <input type="checkbox" checked={checked[p.nombre] || false}
                onChange={() => setChecked(prev => ({ ...prev, [p.nombre]: !prev[p.nombre] }))}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 mt-0.5 flex-shrink-0 cursor-pointer" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`font-semibold text-gray-800 ${checked[p.nombre] ? 'line-through text-gray-400' : ''}`}>{p.nombre}</p>
                  <span className="text-lg font-bold text-gray-900 flex-shrink-0 ml-2">×{p.total}</span>
                </div>
                {Object.keys(p.variants).length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Object.entries(p.variants).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                  </p>
                )}
                <p className="text-[10px] text-gray-300 mt-0.5">
                  {[...new Set(p.pedidos)].join(', ')}
                </p>
              </div>
            </div>
          ))}

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
