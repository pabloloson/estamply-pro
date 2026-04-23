// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/db/client'
import { Check, Copy, Printer, EyeOff, MessageCircle, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocale } from '@/shared/context/LocaleContext'

interface Material { id: string; nombre: string; cantidad: number; unidad: string; disponible: boolean; proveedor_id: string | null; proveedor_nombre: string | null; pedido_id: string }
interface Order { id: string; status: string; created_at: string }
interface Supplier { id: string; name: string; whatsapp: string | null; website: string | null }

interface ConsolidatedItem {
  nombre: string; required: number; unidad: string
  pedidos: Array<{ id: string; label: string }>; supplierName: string | null; supplierId: string | null
}

function orderLabel(id: string, date: string) {
  const d = new Date(date)
  return `#${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${id.slice(0, 4)}`
}

const LS_KEY = 'estamply-abastecimiento'

export default function AbastecimientoPage() {
  const supabase = createClient()
  const { fmt } = useLocale()
  const [materials, setMaterials] = useState<Material[]>([])
  const [orders, setOrders] = useState<Order[]>([])
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
      const [{ data: mats }, { data: ords }, { data: sups }] = await Promise.all([
        supabase.from('pedido_materiales').select('id, nombre, cantidad, unidad, disponible, proveedor_id, proveedor_nombre, pedido_id').eq('disponible', false),
        supabase.from('orders').select('id, status, created_at').in('status', ['pending', 'production']),
        supabase.from('suppliers').select('id, name, whatsapp, website').order('name'),
      ])
      setMaterials((mats || []) as Material[])
      setOrders((ords || []) as Order[])
      setSuppliers((sups || []) as Supplier[])
      setLoading(false)
    }
    load()
  }, [])

  // Build order date map for labels
  const orderDateMap = new Map<string, string>()
  for (const o of orders) orderDateMap.set(o.id, o.created_at)

  // Only include materials from active orders
  const activeOrderIds = new Set(orders.map(o => o.id))
  const activeMaterials = materials.filter(m => activeOrderIds.has(m.pedido_id))

  // Consolidate materials by name
  const itemMap = new Map<string, ConsolidatedItem>()
  for (const mat of activeMaterials) {
    const key = mat.nombre
    const existing = itemMap.get(key) || { nombre: mat.nombre, required: 0, unidad: mat.unidad, pedidos: [], supplierName: null, supplierId: null }
    existing.required += mat.cantidad
    if (mat.unidad) existing.unidad = mat.unidad
    const dateStr = orderDateMap.get(mat.pedido_id)
    if (dateStr) existing.pedidos.push({ id: mat.pedido_id, label: orderLabel(mat.pedido_id, dateStr) })
    if (mat.proveedor_id) { existing.supplierId = mat.proveedor_id; existing.supplierName = mat.proveedor_nombre }
    itemMap.set(key, existing)
  }

  const allItems = Array.from(itemMap.values()).filter(p => !hidden[p.nombre]).sort((a, b) => b.required - a.required)

  // Group by supplier
  const groups = new Map<string, { supplier: Supplier | null; items: ConsolidatedItem[] }>()
  for (const item of allItems) {
    const sid = item.supplierId || 'none'
    const existing = groups.get(sid) || { supplier: suppliers.find(s => s.id === sid) || (item.supplierName ? { id: sid, name: item.supplierName, whatsapp: null, website: null } : null), items: [] }
    existing.items.push(item)
    groups.set(sid, existing)
  }
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a === 'none' ? 1 : b === 'none' ? -1 : 0)

  const getQty = (name: string, required: number) => qtyOverrides[name] ?? required
  const allChecked = allItems.length > 0 && allItems.every(p => checked[p.nombre])

  function copyToClipboard() {
    const sections: string[] = []
    for (const [, group] of sortedGroups) {
      const header = group.supplier ? `${group.supplier.name}:` : 'Sin proveedor:'
      sections.push(header)
      group.items.forEach(p => {
        const qty = getQty(p.nombre, p.required)
        sections.push(`  ${p.nombre} x ${qty} ${p.unidad}`)
      })
      sections.push('')
    }
    const text = `Materiales - ${new Date().toLocaleDateString('es-AR')}\n\n${sections.join('\n')}`
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
        return `<tr><td style="padding:8px;border-bottom:1px solid #eee"><span style="display:inline-block;width:16px;height:16px;border:2px solid #333;border-radius:3px;margin-right:8px;vertical-align:middle"></span>${p.nombre}</td><td style="padding:8px;text-align:center;font-weight:700;font-size:16px;border-bottom:1px solid #eee">${qty} ${p.unidad}</td></tr>`
      }).join('')
      body += `<div style="font-size:13px;font-weight:700;text-transform:uppercase;color:#666;margin:20px 0 8px;letter-spacing:1px;border-bottom:1px solid #ccc;padding-bottom:4px">${title}</div><table style="width:100%;border-collapse:collapse"><tbody>${rows}</tbody></table>`
    }

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Materiales</title><style>body{font-family:Arial,sans-serif;color:#000;margin:0;padding:20mm}@page{size:A4;margin:0}</style></head><body>
      <div style="display:flex;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #333"><div><div style="font-size:22px;font-weight:800">MATERIALES</div><div style="font-size:12px;color:#666">${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div><div style="text-align:right"><div style="font-size:14px;font-weight:600">${orders.length} pedidos</div><div style="font-size:12px;color:#666">${allItems.length} materiales</div></div></div>
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materiales</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} pedidos activos · {allItems.length} materiales pendientes</p>
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
                    <span className="text-[10px] text-gray-300">{group.items.length} materiales</span>
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
                            className="w-5 h-5 rounded border-gray-300 text-teal-700 mt-0.5 flex-shrink-0 cursor-pointer" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`font-semibold text-gray-800 ${checked[item.nombre] ? 'line-through text-gray-400' : ''}`}>{item.nombre}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <input type="number" min={0} className="w-16 text-center text-sm font-bold border border-gray-200 rounded-md py-1 bg-white"
                                  value={qty} onChange={e => setQtyOverrides(prev => ({ ...prev, [item.nombre]: Number(e.target.value) || 0 }))} />
                                <span className="text-[10px] text-gray-400">{item.unidad}</span>
                                {qty !== item.required && <span className="text-[9px] text-gray-400">(req: {item.required})</span>}
                                <button onClick={() => setHidden(prev => ({ ...prev, [item.nombre]: true }))} className="p-1 rounded hover:bg-gray-100" title="Ocultar"><EyeOff size={12} className="text-gray-300" /></button>
                              </div>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {uniquePedidos.map(pd => (
                                <Link key={pd.id} href="/orders" className="text-[10px] text-teal-500 hover:text-teal-700 hover:underline">{pd.label}</Link>
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

          {/* No suppliers hint */}
          {allItems.length > 0 && !allItems.some(i => i.supplierId) && (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3 mt-4">
              <span className="text-lg">💡</span>
              <p className="text-xs text-gray-500">Asigná proveedores a tus productos en <Link href="/settings/proveedores" className="text-teal-600 hover:underline font-medium">Configuración → Proveedores</Link> para agrupar tu lista de compras y enviarla por WhatsApp.</p>
            </div>
          )}

          {allChecked && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center space-y-2">
              <p className="text-sm font-semibold text-green-700">Todos los materiales marcados.</p>
              <button onClick={handleFinalize} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#0F766E' }}>Finalizar abastecimiento</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
