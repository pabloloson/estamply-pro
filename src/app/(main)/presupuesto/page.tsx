// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart, ShoppingBag, Trash2, FileDown, MessageCircle, Mail, X,
  ArrowLeft, Loader2, Phone, MapPin, Globe, AtSign, Pencil,
  Link as LinkIcon, Check, Search, Plus, User, Calculator, Save, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/db/client'
import { usePresupuesto } from '@/features/presupuesto/context/PresupuestoContext'
import type { Tecnica } from '@/features/presupuesto/types'
import { DEFAULT_SETTINGS, type WorkshopSettings } from '@/features/presupuesto/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'
import { usePermissions } from '@/shared/context/PermissionsContext'

const TECHNIQUE_LABELS: Record<Tecnica, string> = {
  subli: 'Sublimación', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo Textil', vinyl_adhesivo: 'Vinilo Autoadhesivo', serigrafia: 'Serigrafía',
}

interface DBClient { id: string; name: string; phone: string | null; email: string | null; whatsapp: string | null }
interface BusinessProfile {
  business_name: string | null; business_logo_url: string | null; business_cuit: string | null
  business_address: string | null; city: string | null; province: string | null; postal_code: string | null
  business_phone: string | null; business_email: string | null
  business_instagram: string | null; business_website: string | null; workshop_name: string | null
  facebook: string | null; tiktok: string | null; youtube: string | null
}

export default function PresupuestoPage() {
  const router = useRouter()
  const t = useTranslations('quotes')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency } = useLocale()
  const supabase = createClient()
  const { items, addItem, updateItem, removeItem, clearItems, loadItems, totalVenta, totalCosto, loadedPresupuestoId, setLoadedPresupuestoId } = usePresupuesto()
  usePermissions()

  const [clients, setClients] = useState<DBClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [bizProfile, setBizProfile] = useState<BusinessProfile | null>(null)
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [submitting, setSubmitting] = useState(false)

  const [clientId, setClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [savingNewClient, setSavingNewClient] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [advanceMode, setAdvanceMode] = useState<'percent' | 'fixed'>('percent')
  const [advancePercent, setAdvancePercent] = useState(50)
  const [advanceFixed, setAdvanceFixed] = useState(0)
  const [notes, setNotes] = useState('')
  const [validezDias, setValidezDias] = useState(15)
  const [editingValidez, setEditingValidez] = useState(false)
  const [editingCondiciones, setEditingCondiciones] = useState(false)
  const [publicLink, setPublicLink] = useState('')
  const [savingLink, setSavingLink] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [savedPresupuestos, setSavedPresupuestos] = useState<Array<{ id: string; codigo: string; numero: string; client_name: string | null; client_id: string | null; total: number; origen: string; created_at: string }>>([])
  const [showSaved, setShowSaved] = useState(true)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  const [breakdownOpen, setBreakdownOpen] = useState<string | null>(null)
  const [baseProducts, setBaseProducts] = useState<Array<{ name: string; variant_name: string | null; variant_options: string[] }>>([])

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ nombre: string; cantidad: number; precioUnit: number }>({ nombre: '', cantidad: 1, precioUnit: 0 })
  const [showAddPanel, setShowAddPanel] = useState<'catalog' | 'free' | null>(null)
  const [freeItem, setFreeItem] = useState({ nombre: '', cantidad: 1, precioUnit: 0 })
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: string; name: string; selling_price: number; photos: string[]; category_name?: string; variant_name?: string; variant_options?: string[] }>>([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogQty, setCatalogQty] = useState(1)
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<{ id: string; name: string; selling_price: number } | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [dbPresupuestoId, setDbPresupuestoId] = useState<string | null>(null)
  const dbIdRef = useRef<string | null>(null) // ref to avoid stale closure in autosave

  const defaultCondiciones = ['Se requiere seña para iniciar el trabajo.', 'El tiempo de entrega se confirma al aprobar el presupuesto.', 'Los precios pueden variar si cambian los costos de materiales.']
  const [condiciones, setCondiciones] = useState<string[]>(defaultCondiciones)

  const today = new Date()
  const quoteDate = format(today, "d 'de' MMMM 'de' yyyy", { locale: es })
  const [quoteNumber] = useState(() => `${format(new Date(), 'yyyyMM')}-${String(Math.floor(Math.random() * 900) + 100)}`)

  // Generate short random code
  function genCodigo() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  // Save presupuesto to DB and get public link
  async function ensurePublicLink() {
    if (publicLink) return publicLink
    // Save first if not saved yet
    if (!dbIdRef.current) await handleGuardar()
    const pid = dbIdRef.current
    if (!pid) return ''
    // Get the codigo from the saved presupuesto
    const { data } = await supabase.from('presupuestos').select('codigo').eq('id', pid).single()
    if (!data?.codigo) return ''
    const link = `${window.location.origin}/p/${data.codigo}`
    setPublicLink(link)
    return link
  }

  async function loadSavedPresupuesto(presId: string) {
    const { data } = await supabase.from('presupuestos').select('*').eq('id', presId).single()
    if (!data) return
    const dbItems = (data.items || []) as Array<Record<string, unknown>>
    const mapped: import('@/features/presupuesto/types').PresupuestoItem[] = dbItems.map((i, idx) => ({
      id: `loaded-${idx}`,
      tecnica: ((i.tecnica as string) || 'subli') as import('@/features/presupuesto/types').Tecnica,
      nombre: (i.nombre as string) || '',
      costoUnit: (i.costoUnit as number) || 0,
      precioUnit: (i.precioUnit as number) || 0,
      precioSinDesc: (i.precioSinDesc as number) || (i.precioUnit as number) || 0,
      cantidad: (i.cantidad as number) || 1,
      subtotal: (i.subtotal as number) || 0,
      ganancia: ((i.subtotal as number) || 0) - ((i.costoUnit as number) || 0) * ((i.cantidad as number) || 1),
      notas: (i.notas as string) || undefined,
      origen: (i.origen as 'cotizador' | 'catalogo' | 'catalogo_web' | 'manual') || undefined,
      variantName: (i.variantName as string) || undefined,
      variantBreakdown: (i.variantBreakdown as Record<string, number>) || undefined,
    }))
    loadItems(mapped)
    setLoadedPresupuestoId(presId)
    setDbId(presId)
    // Load client
    if (data.client_id) setClientId(data.client_id)
    else if (data.client_name) setNewClientName(data.client_name)
    // Load conditions and validez
    if (data.condiciones) {
      if (Array.isArray(data.condiciones)) setCondiciones(data.condiciones as string[])
      else if (typeof data.condiciones === 'string') {
        const raw = data.condiciones as string
        if (raw.startsWith('[')) { try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) { setCondiciones(parsed); } } catch { setCondiciones(raw.split('\n').map((l: string) => l.replace(/^[·\-•"\[\]]\s*/g, '').trim()).filter(Boolean)) } }
        else setCondiciones(raw.split('\n').map((l: string) => l.replace(/^[·\-•]\s*/, '').trim()).filter(Boolean))
      }
    }
    if (data.validez_dias) setValidezDias(data.validez_dias as number)
    // Load public link
    if (data.codigo) setPublicLink(`/p/${data.codigo}`)
  }

  const selectedClient = clients.find(c => c.id === clientId)
  const clientDisplayName = selectedClient?.name || newClientName || ''

  const filteredClients = clientSearch.trim()
    ? clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.whatsapp || '').includes(clientSearch) ||
        (c.phone || '').includes(clientSearch)
      ).slice(0, 5)
    : clients.slice(0, 5)

  // ── Autosave: persist presupuesto to DB ──
  function setDbId(id: string | null) {
    dbIdRef.current = id
    setDbPresupuestoId(id)
  }

  // ── Autosave: debounced save on any change ──
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dirty, setDirty] = useState(false)
  function triggerAutosave() {
    setDirty(true)
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => { handleGuardar() }, 1500)
  }

  // ── Explicit save: one button, one UPDATE ──
  const savingRef = useRef(false)
  async function handleGuardar() {
    if (savingRef.current) return // prevent concurrent saves
    savingRef.current = true
    try {
    const pid = dbIdRef.current
    if (!pid) {
      // Create new presupuesto first
      const codigo = genCodigo()
      const { data, error } = await supabase.from('presupuestos').insert({
        codigo, numero: quoteNumber, validez_dias: validezDias,
        client_id: clientId || null, client_name: clientDisplayName || null,
        items: items.map(i => ({ tecnica: i.tecnica, nombre: i.nombre, cantidad: i.cantidad, precioUnit: i.precioUnit, precioSinDesc: i.precioSinDesc, subtotal: i.subtotal, notas: i.notas, origen: i.origen, variantName: i.variantName, variantBreakdown: i.variantBreakdown })),
        total: totalVenta, condiciones, business_profile: bizProfile || {},
        tipo_cambio_congelado: (ws as Record<string, unknown>).tipo_cambio || null,
      }).select('id, codigo').single()
      if (error || !data) { setSaveStatus('error'); alert('Error al crear: ' + (error?.message || '')); return }
      setDbId(data.id as string)
      setLoadedPresupuestoId(data.id as string)
      setPublicLink(`${window.location.origin}/p/${data.codigo}`)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000)
      reloadList()
      return
    }
    setSaveStatus('saving')
    const itemsData = items.map(i => ({ tecnica: i.tecnica, nombre: i.nombre, cantidad: i.cantidad, precioUnit: i.precioUnit, precioSinDesc: i.precioSinDesc, subtotal: i.subtotal, notas: i.notas, origen: i.origen, variantName: i.variantName, variantBreakdown: i.variantBreakdown }))
    const { error } = await supabase.from('presupuestos').update({
      items: itemsData, total: totalVenta,
      client_id: clientId || null, client_name: clientDisplayName || null,
      condiciones, validez_dias: validezDias,
    }).eq('id', pid)
    if (error) { setSaveStatus('error') }
    else { setDirty(false); setSaveStatus('saved'); setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 3000) }
    } finally { savingRef.current = false }
  }

  // Autosave on data changes (only when a presupuesto exists or items are loaded)
  const prevDataRef = useRef('')
  useEffect(() => {
    if (items.length === 0) return
    const dataKey = JSON.stringify({ items: items.map(i => ({ n: i.nombre, q: i.cantidad, p: i.precioUnit })), clientId, condiciones, validezDias })
    if (prevDataRef.current && prevDataRef.current !== dataKey) triggerAutosave()
    prevDataRef.current = dataKey
  }, [items, clientId, condiciones, validezDias])

  async function handleEliminar() {
    const pid = dbIdRef.current || loadedPresupuestoId
    if (!pid) { clearItems(); setCreatingNew(false); return }
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return
    await supabase.from('presupuestos').delete().eq('id', pid)
    clearItems(); setDbId(null); setCreatingNew(false); setPublicLink('')
    reloadList()
  }

  function startEdit(item: import('@/features/presupuesto/types').PresupuestoItem) {
    setEditingItemId(item.id)
    setEditForm({ nombre: item.nombre, cantidad: item.cantidad, precioUnit: item.precioUnit })
  }
  function saveEdit(itemId: string) {
    const qty = Math.max(1, editForm.cantidad)
    const price = Math.max(0, editForm.precioUnit)
    updateItem(itemId, { nombre: editForm.nombre, cantidad: qty, precioUnit: price, precioSinDesc: price, subtotal: qty * price, ganancia: 0 })
    setEditingItemId(null)
  }
  function addFreeItem() {
    if (!freeItem.nombre.trim() || freeItem.precioUnit <= 0) return
    const qty = Math.max(1, freeItem.cantidad)
    addItem({ tecnica: 'subli', nombre: freeItem.nombre, costoUnit: 0, precioUnit: freeItem.precioUnit, precioSinDesc: freeItem.precioUnit, cantidad: qty, subtotal: qty * freeItem.precioUnit, ganancia: qty * freeItem.precioUnit, origen: 'manual' })
    setFreeItem({ nombre: '', cantidad: 1, precioUnit: 0 }); setShowAddPanel(null)
  }
  function addCatalogItem() {
    if (!selectedCatalogProduct) return
    const qty = Math.max(1, catalogQty)
    const fullProduct = catalogProducts.find(p => p.id === selectedCatalogProduct.id)
    addItem({ tecnica: 'subli', nombre: selectedCatalogProduct.name, costoUnit: 0, precioUnit: selectedCatalogProduct.selling_price, precioSinDesc: selectedCatalogProduct.selling_price, cantidad: qty, subtotal: qty * selectedCatalogProduct.selling_price, ganancia: qty * selectedCatalogProduct.selling_price, origen: 'catalogo', variantName: fullProduct?.variant_name || undefined })
    setSelectedCatalogProduct(null); setCatalogQty(1); setCatalogSearch(''); setShowAddPanel(null)
  }
  // Get variant info for an item — checks item itself, catalog products, and base products
  function getItemVariant(item: import('@/features/presupuesto/types').PresupuestoItem) {
    if (item.variantName) return { name: item.variantName, options: Object.keys(item.variantBreakdown || {}) }
    const catProd = catalogProducts.find(p => p.name === item.nombre)
    if (catProd?.variant_name) return { name: catProd.variant_name, options: catProd.variant_options || [] }
    const baseProd = baseProducts.find(p => p.name === item.nombre)
    if (baseProd?.variant_name) return { name: baseProd.variant_name, options: baseProd.variant_options || [] }
    return null
  }

  function openBreakdown(item: import('@/features/presupuesto/types').PresupuestoItem) {
    const variant = getItemVariant(item)
    if (!variant) return
    if (!item.variantBreakdown || Object.keys(item.variantBreakdown).length === 0) {
      const breakdown: Record<string, number> = {}
      variant.options.forEach(opt => { breakdown[opt] = 0 })
      updateItem(item.id, { variantName: variant.name, variantBreakdown: breakdown })
    }
    setBreakdownOpen(item.id)
  }
  async function reloadList() {
    const { data: saved } = await supabase.from('presupuestos').select('id,codigo,numero,client_name,client_id,total,origen,created_at').order('created_at', { ascending: false }).limit(20)
    if (saved) setSavedPresupuestos(saved as typeof savedPresupuestos)
  }

  function handlePrint() {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const itemRows = items.map(item => {
      const breakdownText = item.variantBreakdown ? Object.entries(item.variantBreakdown as Record<string, number>).filter(([,v]) => v > 0).map(([k, v]) => `${k} ×${v}`).join(' · ') : ''
      return `
      <tr>
        <td style="padding:10px 8px"><div style="font-weight:500">${item.nombre}</div>${item.notas ? `<div style="font-size:11px;color:#999">${item.notas}</div>` : ''}${breakdownText ? `<div style="font-size:10px;color:#999;margin-top:2px">${breakdownText}</div>` : ''}</td>
        <td style="padding:10px 8px;text-align:center">${item.cantidad}</td>
        <td style="padding:10px 8px;text-align:right">${fmtCurrency(item.precioUnit)}</td>
        <td style="padding:10px 8px;text-align:right;font-weight:600">${fmtCurrency(item.subtotal)}</td>
      </tr>`
    }).join('')

    // Resolve client name from loaded presupuesto or current selection
    const printClientName = clientDisplayName || (loadedPresupuestoId ? savedPresupuestos.find(p => p.id === loadedPresupuestoId)?.client_name : '') || ''
    const printClientContact = [selectedClient?.email, selectedClient?.whatsapp || selectedClient?.phone].filter(Boolean).join(' · ')

    const clientHtml = printClientName ? `
      <div style="margin-bottom:24px;padding:12px 16px;background:#f9fafb;border-radius:6px">
        <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;font-weight:700">Cliente</div>
        <div style="font-size:15px;font-weight:600">${printClientName}</div>
        ${printClientContact ? `<div style="font-size:13px;color:#666">${printClientContact}</div>` : ''}
      </div>` : ''

    const condHtml = condiciones.map(c => `<div>· ${c}</div>`).join('')

    const bizCuit = bizProfile?.business_cuit ? `<div style="font-size:12px;color:#666">${bizProfile.business_cuit}</div>` : ''
    const addrParts = [bizProfile?.business_address, bizProfile?.city, bizProfile?.province, bizProfile?.postal_code].filter(Boolean)
    const bizAddr = addrParts.length > 0 ? `<div style="font-size:12px;color:#666">${addrParts.join(', ')}</div>` : ''
    const bizPhone = bizProfile?.business_phone ? `<div style="font-size:12px;color:#666">${bizProfile.business_phone}</div>` : ''
    const bizEmail = bizProfile?.business_email ? `<div style="font-size:12px;color:#666">${bizProfile.business_email}</div>` : ''

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Presupuesto #${quoteNumber}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:20mm}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:2px solid #e5e7eb}
      tbody tr{border-bottom:1px solid #f3f4f6}
      th{font-size:11px;text-transform:uppercase;color:#555;font-weight:700;padding:10px 8px;text-align:left}
      @page{size:A4;margin:0}
    </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #333">
        <div style="display:flex;align-items:flex-start;gap:12px">
          ${bizProfile?.business_logo_url ? `<img src="${bizProfile.business_logo_url}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:8px" />` : ''}
          <div>
            <div style="font-size:22px;font-weight:800">${tallerName || 'Mi Taller'}</div>
            ${bizCuit}${bizAddr}${bizPhone}${bizEmail}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px">Presupuesto</div>
          <div style="font-size:24px;font-weight:800;color:#000">#${quoteNumber}</div>
          <div style="font-size:13px;color:#666;margin-top:4px">${quoteDate}</div>
          <div style="font-size:12px;color:#999">Válido por ${validezDias} días</div>
        </div>
      </div>
      ${clientHtml}
      <table style="margin-bottom:24px">
        <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
        <div style="width:240px">
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#666"><span>Subtotal</span><span>${fmtCurrency(totalVenta)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:20px;font-weight:800;border-top:2px solid #000"><span>TOTAL</span><span>${fmtCurrency(totalVenta)}</span></div>
        </div>
      </div>
      <div style="padding:16px;background:#f9fafb;border-radius:6px;font-size:12px;color:#666;margin-bottom:32px">
        <div style="font-weight:700;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#666">Condiciones</div>
        ${condHtml}
      </div>
      <div style="display:flex;justify-content:space-between;margin:48px 32px 32px;gap:48px">
        <div style="flex:1;text-align:center">
          <div style="border-bottom:1px solid #333;margin-bottom:8px;height:40px"></div>
          <div style="font-size:12px;color:#666">Firma del taller</div>
        </div>
        <div style="flex:1;text-align:center">
          <div style="border-bottom:1px solid #333;margin-bottom:8px;height:40px"></div>
          <div style="font-size:12px;color:#666">Firma del cliente</div>
        </div>
      </div>
      ${(() => {
        const socials: string[] = []
        if (bizProfile?.business_website) socials.push(`<span>🌐 ${bizProfile.business_website}</span>`)
        if (bizProfile?.business_instagram) socials.push(`<span>📷 ${bizProfile.business_instagram}</span>`)
        if (bizProfile?.facebook) socials.push(`<span>📘 ${bizProfile.facebook}</span>`)
        if (bizProfile?.tiktok) socials.push(`<span>♪ ${bizProfile.tiktok}</span>`)
        if (bizProfile?.youtube) socials.push(`<span>▶ ${bizProfile.youtube}</span>`)
        if (socials.length === 0) return ''
        return `<div style="text-align:center;font-size:11px;color:#888;padding:16px 0;border-top:1px solid #e5e7eb;margin-top:24px">
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px">${socials.join('')}</div>
        </div>`
      })()}
      <div style="text-align:center;font-size:11px;color:#ccc;padding-top:16px;border-top:1px solid #eee">Generado con Estamply · estamply.app</div>
    </body></html>`)
    doc.close()
    // On mobile/iOS, iframe.print() often fails — open in new window instead
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      document.body.removeChild(iframe)
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.open()
        printWindow.document.write(doc.documentElement.outerHTML)
        printWindow.document.close()
        // Let content render before triggering print
        setTimeout(() => { printWindow.print() }, 500)
      }
    } else {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }
  }

  async function loadCatalog() {
    if (catalogProducts.length > 0) return
    const { data } = await supabase.from('catalog_products').select('id, name, selling_price, photos, variant_name, variant_options').eq('visible_in_catalog', true).order('name')
    if (data) setCatalogProducts(data as typeof catalogProducts)
  }

  async function createAndAssignClient() {
    if (!newClientName.trim()) return
    setSavingNewClient(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('clients').insert({
      name: newClientName.trim(),
      phone: newClientPhone || null,
      whatsapp: newClientPhone || null,
      email: newClientEmail || null,
      user_id: user?.id,
    }).select().single()
    setSavingNewClient(false)
    if (error || !data) { alert('Error al crear cliente'); return }
    setClients(prev => [...prev, data as DBClient])
    setClientId(data.id)
    setNewClientName('')
    setNewClientPhone('')
    setNewClientEmail('')
    setShowNewClientForm(false)
    setClientSearch('')
    setClientDropdownOpen(false)
  }

  useEffect(() => {
    // Safety timeout: if loading takes >8s, show empty state
    const safetyTimeout = setTimeout(() => setLoadingClients(false), 8000)
    async function loadData() {
      try {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: cls }, { data: prof }, { data: wsData }, { data: saved }] = await Promise.all([
        supabase.from('clients').select('id, name, phone, email, whatsapp').order('name'),
        user ? supabase.from('profiles').select('business_name,business_logo_url,business_cuit,business_address,city,province,postal_code,business_phone,business_email,business_instagram,business_website,workshop_name,facebook,tiktok,youtube').eq('id', user.id).single() : Promise.resolve({ data: null }),
        supabase.from('workshop_settings').select('settings').single(),
        supabase.from('presupuestos').select('id,codigo,numero,client_name,client_id,total,origen,created_at').order('created_at', { ascending: false }).limit(20),
      ])
      if (cls) setClients(cls)
      if (saved) setSavedPresupuestos(saved as typeof savedPresupuestos)
      if (prof) setBizProfile(prof as unknown as BusinessProfile)
      const { data: catProds } = await supabase.from('catalog_products').select('id, name, selling_price, photos, category_name, variant_name, variant_options').eq('visible_in_catalog', true).order('name')
      if (catProds) setCatalogProducts(catProds as typeof catalogProducts)
      if (wsData?.settings) {
        const s = { ...DEFAULT_SETTINGS, ...(wsData.settings as Partial<WorkshopSettings>) }
        setWs(s)
        const sx = s as Record<string, unknown>
        setValidezDias((sx.validez_dias as number) || 15)
        setAdvancePercent((sx.sena_predeterminada as number) || 50)
        if (sx.condiciones_default && Array.isArray(sx.condiciones_default)) {
          const raw = sx.condiciones_default as Array<string | { text: string; activa: boolean }>
          setCondiciones(raw.map(c => typeof c === 'string' ? c : c.text).filter((_, i) => { const item = (sx.condiciones_default as unknown[])[i]; return typeof item === 'string' || (item as { activa: boolean }).activa !== false }))
        } else if (sx.condiciones_presupuesto && typeof sx.condiciones_presupuesto === 'string') {
          setCondiciones((sx.condiciones_presupuesto as string).split('\n').map((l: string) => l.replace(/^[·\-•]\s*/, '').trim()).filter(Boolean))
        }
      }
      // Load base products with variants
      const { data: bp } = await supabase.from('products').select('name, variant_name, variant_options').not('variant_name', 'is', null)
      if (bp) setBaseProducts(bp as typeof baseProducts)

      // Restore client if presupuesto was loaded (e.g. after page refresh)
      if (loadedPresupuestoId) {
        setDbId(loadedPresupuestoId)
        const { data: pres } = await supabase.from('presupuestos').select('client_id, client_name, condiciones, validez_dias, codigo').eq('id', loadedPresupuestoId).single()
        if (pres) {
          if (pres.client_id) setClientId(pres.client_id)
          else if (pres.client_name) setNewClientName(pres.client_name)
          if (pres.condiciones) {
            if (Array.isArray(pres.condiciones)) setCondiciones(pres.condiciones as string[])
            else if (typeof pres.condiciones === 'string') {
              const raw = pres.condiciones as string
              if (raw.startsWith('[')) { try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) { setCondiciones(parsed); } } catch { setCondiciones(raw.split('\n').map((l: string) => l.replace(/^[·\-•"\[\]]\s*/g, '').trim()).filter(Boolean)) } }
              else setCondiciones(raw.split('\n').map((l: string) => l.replace(/^[·\-•]\s*/, '').trim()).filter(Boolean))
            }
          }
          if (pres.validez_dias) setValidezDias(pres.validez_dias as number)
          if (pres.codigo) setPublicLink(`/p/${pres.codigo}`)
        }
      }
      } catch (err) {
        console.error('Error loading presupuesto data:', err)
      } finally {
        setLoadingClients(false)
      }
    }
    loadData()
    return () => clearTimeout(safetyTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const advanceAmount = advanceMode === 'percent' ? Math.round(totalVenta * advancePercent / 100) : advanceFixed

  // CORRECCIÓN 1: Show business name, not user name
  const tallerName = bizProfile?.business_name || bizProfile?.workshop_name || ''

  function getWhatsAppText() {
    const biz = tallerName || 'Tu Taller'
    const lines = items.map(i => `• ${i.cantidad}x ${i.nombre} (${TECHNIQUE_LABELS[i.tecnica]}): ${fmtCurrency(i.subtotal)}`).join('\n')
    const cl = clientDisplayName ? `Cliente: ${clientDisplayName}\n` : ''
    return encodeURIComponent(`🧾 *PRESUPUESTO - ${biz.toUpperCase()}*\nN°: #${quoteNumber}\nFecha: ${quoteDate}\n\n${cl}${lines}\n\n━━━━━━━━━━━━━\n💰 *TOTAL: ${fmtCurrency(totalVenta)}*\n\n_Generado con Estamply_`)
  }

  async function handleConfirmarPedido() {
    if (items.length === 0) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      let resolvedClientId: string | null = null
      if (clientId) resolvedClientId = clientId
      else if (newClientName.trim()) {
        const { data: nc, error: ce } = await supabase.from('clients').insert({ name: newClientName.trim(), user_id: user.id }).select('id').single()
        if (ce) throw ce
        resolvedClientId = nc.id
      }
      const orderItems = items.map(i => ({ tecnica: i.tecnica, nombre: i.nombre, cantidad: i.cantidad, precioUnit: i.precioUnit, subtotal: i.subtotal, notas: i.notas || null }))
      const { data: order, error } = await supabase.from('orders').insert({
        user_id: user.id, client_id: resolvedClientId, status: 'pending',
        total_price: totalVenta, total_cost: totalCosto,
        advance_payment: advanceAmount, due_date: dueDate || null, notes: notes || null,
        items: orderItems,
      }).select('id').single()
      if (error) throw error
      // Register initial advance as first payment if > 0
      if (advanceAmount > 0 && order) {
        await supabase.from('payments').insert({ order_id: order.id, monto: advanceAmount, metodo: 'seña', fecha: new Date().toISOString().split('T')[0] })
      }
      // Generate materials list (only product base, no insumos)
      if (order) {
        // Check if materials already exist (idempotent)
        const { data: existing } = await supabase.from('pedido_materiales').select('id').eq('pedido_id', order.id).limit(1)
        if (!existing || existing.length === 0) {
          // Fetch product suppliers
          const { data: prods } = await supabase.from('products').select('name, supplier_id, suppliers(name)')
          const prodSuppliers = new Map<string, { id: string; name: string }>()
          if (prods) prods.forEach((p: Record<string, unknown>) => {
            if (p.supplier_id) prodSuppliers.set(p.name as string, { id: p.supplier_id as string, name: ((p.suppliers as Record<string, unknown>)?.name as string) || '' })
          })

          const materials: Array<{ pedido_id: string; user_id: string; tipo: string; nombre: string; cantidad: number; unidad: string; proveedor_id?: string; proveedor_nombre?: string }> = []
          for (const i of items) {
            if (i.origen === 'manual') {
              const lower = i.nombre.toLowerCase()
              if (['envío', 'envio', 'diseño', 'diseno', 'urgencia', 'flete', 'servicio', 'recargo', 'comisión', 'comision', 'mano de obra'].some(kw => lower.includes(kw))) continue
            }
            const sup = prodSuppliers.get(i.nombre)
            const supFields = sup ? { proveedor_id: sup.id, proveedor_nombre: sup.name } : {}

            // If item has variant breakdown, create one material per variant
            if (i.variantBreakdown && Object.values(i.variantBreakdown).some(v => v > 0)) {
              for (const [variant, qty] of Object.entries(i.variantBreakdown)) {
                if (qty <= 0) continue
                materials.push({
                  pedido_id: order.id, user_id: user.id, tipo: 'producto_base',
                  nombre: `${i.nombre} (${variant})`, cantidad: qty, unidad: 'unidades',
                  ...supFields,
                })
              }
            } else {
              // No variants — single material
              materials.push({
                pedido_id: order.id, user_id: user.id, tipo: 'producto_base',
                nombre: i.nombre, cantidad: i.cantidad, unidad: 'unidades',
                ...supFields,
              })
            }
          }

          if (materials.length > 0) {
            await supabase.from('pedido_materiales').insert(materials)
          }
        }
      }
      // Mark presupuesto as accepted if it was loaded from a saved one
      if (loadedPresupuestoId) {
        await supabase.from('presupuestos').update({ estado: 'aceptado' }).eq('id', loadedPresupuestoId)
      }
      clearItems(); router.push('/orders')
    } catch (err) { console.error(err); alert('Error al confirmar. Intentá de nuevo.') }
    finally { setSubmitting(false) }
  }


  return (
    <>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ══ LIST VIEW: when no presupuesto is loaded ══ */}
        {items.length === 0 && !loadedPresupuestoId && !creatingNew ? (<>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 no-print">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{savedPresupuestos.length} presupuesto{savedPresupuestos.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { clearItems(); setLoadedPresupuestoId(null); setPublicLink(''); setClientId(''); setNewClientName(''); setCreatingNew(true) }}
              className="flex items-center gap-1.5 whitespace-nowrap text-xs sm:text-sm px-4 py-2 rounded-xl font-semibold text-white" style={{ background: '#0F766E' }}>
              {t('newQuote')}
            </button>
          </div>

          {loadingClients ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />
              ))}
            </div>
          ) : savedPresupuestos.length > 0 ? (<>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {savedPresupuestos.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer"
                  onClick={() => loadSavedPresupuesto(p.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">#{p.codigo}</p>
                      <p className="text-xs text-gray-400">{p.client_name || clients.find(c => c.id === p.client_id)?.name || tc('noClient')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm" style={{ color: '#0F766E' }}>{fmtCurrency(p.total)}</p>
                      <button onClick={async (e) => { e.stopPropagation(); if (confirm(`¿Eliminar presupuesto #${p.codigo}?`)) { await supabase.from('presupuestos').delete().eq('id', p.id); reloadList() } }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-gray-300 hover:text-red-500" /></button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                    <span>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
                    {p.origen && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{p.origen === 'catalogo_web' ? 'Web' : p.origen}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block card overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]"><thead><tr className="border-b border-gray-100">
                {[t('code'), t('client'), t('date'), t('total'), ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
              </tr></thead><tbody>
                {savedPresupuestos.map(p => {
                  const cName = p.client_name || clients.find(c => c.id === p.client_id)?.name || tc('noClient')
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => loadSavedPresupuesto(p.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 text-sm">#{p.codigo}</span>
                          {p.origen === 'catalogo_web' && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-green-100 text-green-600">Web</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{cName}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                      <td className="px-4 py-3 font-bold text-gray-800 text-sm">{fmtCurrency(p.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a href={`/p/${p.codigo}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-xs text-teal-600 hover:text-teal-800">{t('viewPublic')}</a>
                          <button onClick={async (e) => { e.stopPropagation(); if (confirm(`¿Eliminar #${p.codigo}?`)) { await supabase.from('presupuestos').delete().eq('id', p.id); reloadList() } }} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-gray-300 hover:text-red-500" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody></table>
              </div>
            </div>
          </>) : (
            <div className="rounded-2xl border border-[#E5E5E3] bg-white flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#F0FDFA]"><FileText size={24} className="text-[#0F766E]" /></div>
              <div className="text-center">
                <p className="text-gray-700 font-semibold">No tenés presupuestos todavía</p>
                <p className="text-gray-400 text-sm mt-1">Creá tu primer presupuesto para empezar a cotizar para tus clientes</p>
              </div>
              <button onClick={() => { clearItems(); setLoadedPresupuestoId(null); setPublicLink(''); setClientId(''); setNewClientName(''); setCreatingNew(true) }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#0F766E' }}>+ Nuevo presupuesto</button>
            </div>
          )}
        </>) : (<>

        {/* ══ DETAIL VIEW: when items are loaded ══ */}
        <div className="mb-6 no-print">
          <div className="flex items-center gap-2">
            <button onClick={() => { clearItems(); setPublicLink(''); setCreatingNew(false); setDbId(null); reloadList() }} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></button>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Presupuesto</h1>
            {loadedPresupuestoId && savedPresupuestos.find(p => p.id === loadedPresupuestoId)?.origen === 'catalogo_web' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-green-100 text-green-600">Catálogo</span>
            )}
            {!loadedPresupuestoId && !creatingNew && <span className="text-sm text-gray-400">{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</span>}
            <div className="ml-auto flex items-center gap-2">
              {saveStatus === 'saving' && <span className="text-xs text-gray-400 animate-pulse flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Guardando...</span>}
              {saveStatus === 'saved' && <span className="text-xs text-gray-400">✓ Guardado</span>}
              {saveStatus === 'error' && <button type="button" onClick={handleGuardar} className="text-xs text-amber-600 hover:text-amber-800">⚠ Error al guardar · Reintentar</button>}
            </div>
          </div>
          {loadedPresupuestoId && (
            <p className="text-xs text-gray-400 mt-1 ml-7">#{savedPresupuestos.find(p => p.id === loadedPresupuestoId)?.codigo || ''}</p>
          )}
        </div>

        {(
          <div className="flex flex-col lg:flex-row gap-6">
            {/* ── LEFT: Quote Document ── */}
            <div className="flex-1">
              <div className="print-page bg-white rounded-2xl border border-[#E5E5E3] overflow-hidden" id="quote-document">

                {/* Header — mobile: compact, desktop: side-by-side */}
                {/* Mobile header */}
                <div className="sm:hidden px-4 pt-5 pb-4 border-b border-[#F3F3F1]">
                  <div className="flex items-center gap-3 mb-3">
                    {bizProfile?.business_logo_url ? (
                      <img src={bizProfile.business_logo_url} alt="Logo" className="w-9 h-9 object-contain rounded-xl flex-shrink-0" />
                    ) : tallerName ? (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F0FDFA]">
                        <span className="text-[#0F766E] font-semibold text-xs">{tallerName[0].toUpperCase()}</span>
                      </div>
                    ) : null}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{tallerName || 'Mi Taller'}</p>
                      {bizProfile?.business_phone && <p className="text-[11px] text-gray-400">{bizProfile.business_phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#F3F3F1]">
                    <span className="font-semibold text-gray-700">#{quoteNumber}</span>
                    <span>{quoteDate} · {validezDias} días</span>
                  </div>
                </div>
                {/* Desktop header */}
                <div className="hidden sm:block px-8 pt-6 pb-5 border-b border-[#E5E5E3]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {bizProfile?.business_logo_url ? (
                        <img src={bizProfile.business_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-xl flex-shrink-0" />
                      ) : tallerName ? (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#F0FDFA]">
                          <span className="text-[#0F766E] font-semibold text-base">{tallerName[0].toUpperCase()}</span>
                        </div>
                      ) : null}
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg leading-tight">{tallerName || 'Mi Taller'}</h2>
                        {bizProfile?.business_cuit && <p className="text-[11px] text-gray-500 mt-0.5">CUIT: {bizProfile.business_cuit}</p>}
                        <div className="mt-1.5 space-y-0.5">
                          {bizProfile?.business_address && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={10} />{bizProfile.business_address}</p>}
                          {bizProfile?.business_phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={10} />{bizProfile.business_phone}</p>}
                          {bizProfile?.business_email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={10} />{bizProfile.business_email}</p>}
                          {bizProfile?.business_instagram && <p className="text-xs text-gray-500 flex items-center gap-1.5"><AtSign size={10} />{bizProfile.business_instagram}</p>}
                          {bizProfile?.business_website && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Globe size={10} />{bizProfile.business_website}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Presupuesto</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">#{quoteNumber}</p>
                      <p className="text-xs text-gray-500 mt-1">{quoteDate}</p>
                      <div className="mt-0.5">
                        {editingValidez ? (
                          <div className="flex items-center gap-1 justify-end no-print">
                            <span className="text-xs text-gray-400">Válido por</span>
                            <input type="number" className="w-12 text-xs text-center border rounded px-1 py-0.5" min={1} value={validezDias}
                              onChange={e => setValidezDias(Number(e.target.value))} onBlur={() => setEditingValidez(false)} autoFocus />
                            <span className="text-xs text-gray-400">días</span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 cursor-pointer no-print hover:text-gray-600" onClick={() => setEditingValidez(true)}>
                            {t('validFor', { days: validezDias })} <Pencil size={8} className="inline ml-0.5" />
                          </p>
                        )}
                        <p className="text-xs text-gray-400 hidden print:block">{t('validFor', { days: validezDias })}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update prices banner — show when quote is older than 7 days */}
                {loadedPresupuestoId && Number((ws as Record<string, unknown>).tipo_cambio) > 1 && (() => {
                  const pres = savedPresupuestos.find(p => p.id === loadedPresupuestoId)
                  if (!pres) return null
                  const ageMs = Date.now() - new Date(pres.created_at).getTime()
                  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
                  if (ageDays < 7) return null
                  const dateStr = new Date(pres.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
                  return (
                    <div className="mx-8 mt-4 p-3 rounded-lg no-print" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <p className="text-xs text-amber-700">
                        Los precios de este presupuesto son del {dateStr}.{' '}
                        <button type="button" onClick={async () => {
                          if (!confirm('¿Actualizar precios al tipo de cambio vigente?')) return
                          const pid = dbIdRef.current
                          if (!pid) return
                          await supabase.from('presupuestos').update({ tipo_cambio_congelado: (ws as Record<string, unknown>).tipo_cambio }).eq('id', pid)
                          setSaveStatus('saved')
                          setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000)
                        }} className="font-bold underline hover:text-amber-900">Actualizar a precios de hoy →</button>
                      </p>
                    </div>
                  )
                })()}

                {/* Client — in the document body */}
                <div className="px-8 py-4 border-b border-gray-100" style={{ background: '#FAFAFA' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{t('client')}</p>
                  {/* Edit mode — Combobox (screen only) */}
                  <div className="no-print">
                    {loadingClients ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={14} className="animate-spin" /> Cargando…</div>
                    ) : clientId ? (
                      /* ── Selected client card ── */
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#0F766E15' }}>
                            <User size={14} style={{ color: '#0F766E' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{selectedClient?.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">
                              {[selectedClient?.email, selectedClient?.whatsapp || selectedClient?.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => { setClientId(''); setClientSearch(''); setNewClientName('') }} className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0">
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      /* ── Search + create combobox ── */
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input type="text" className="input-base !pl-9 text-sm" placeholder="Buscar cliente..."
                              value={clientSearch} onChange={e => { setClientSearch(e.target.value); setClientDropdownOpen(true) }}
                              onFocus={() => setClientDropdownOpen(true)} />
                          </div>
                          <button type="button" onClick={() => { setShowNewClientForm(true); setClientDropdownOpen(false); setNewClientName(clientSearch) }}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap text-[#0F766E] border border-[#E5E5E3] hover:bg-[#F0FDFA] transition-colors">
                            <Plus size={13} /> Nuevo
                          </button>
                        </div>

                        {/* Dropdown results */}
                        {clientDropdownOpen && !showNewClientForm && (
                          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                            {filteredClients.length > 0 ? filteredClients.map(c => (
                              <button key={c.id} type="button" className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors border-b border-gray-50 last:border-0"
                                onClick={() => { setClientId(c.id); setClientDropdownOpen(false); setClientSearch(''); setNewClientName('');  }}>
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                                  {c.name[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{c.email || c.whatsapp || c.phone || ''}</p>
                                </div>
                              </button>
                            )) : clientSearch.trim() ? (
                              <button type="button" className="w-full flex items-center gap-2 px-3 py-3 hover:bg-teal-50 text-left transition-colors"
                                onClick={() => { setShowNewClientForm(true); setClientDropdownOpen(false); setNewClientName(clientSearch) }}>
                                <Plus size={14} style={{ color: '#0F766E' }} />
                                <span className="text-sm" style={{ color: '#0F766E' }}>Crear &ldquo;{clientSearch}&rdquo; como nuevo cliente</span>
                              </button>
                            ) : null}
                          </div>
                        )}

                        {/* Click outside to close */}
                        {clientDropdownOpen && <div className="fixed inset-0 z-10" onClick={() => setClientDropdownOpen(false)} />}

                        {/* Inline new client form */}
                        {showNewClientForm && (
                          <div className="mt-2 p-3 rounded-xl border border-gray-200 bg-white space-y-2.5">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                              <input type="text" className="input-base text-sm" placeholder="Nombre del cliente" value={newClientName} onChange={e => setNewClientName(e.target.value)} autoFocus />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp / Teléfono</label>
                              <input type="tel" className="input-base text-sm" placeholder="+54 11 1234-5678" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                              <input type="email" className="input-base text-sm" placeholder="email@ejemplo.com" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button type="button" onClick={() => { setShowNewClientForm(false); setNewClientName(''); setNewClientPhone(''); setNewClientEmail('') }}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 border border-gray-200">Cancelar</button>
                              <button type="button" onClick={createAndAssignClient} disabled={!newClientName.trim() || savingNewClient}
                                className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>
                                {savingNewClient ? 'Creando...' : 'Crear y asignar'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Print view — CORRECCIÓN 3: hide if no client */}
                  <div className="hidden print:block">
                    {clientDisplayName ? (
                      <div>
                        <p className="font-bold text-gray-800">{clientDisplayName}</p>
                        {selectedClient?.email && <p className="text-xs text-gray-500">{selectedClient.email}</p>}
                        {selectedClient?.phone && <p className="text-xs text-gray-500">{selectedClient.phone}</p>}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Items — mobile cards */}
                <div className="px-4 py-4 md:hidden space-y-0">
                  {items.map(item => editingItemId === item.id ? (
                    <div key={item.id} className="py-3 border-b border-gray-100 last:border-0 space-y-2">
                      <input type="text" className="input-base text-sm" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} />
                      <div className="flex gap-2">
                        <div className="flex-1"><label className="block text-[10px] text-gray-400 mb-0.5">Cant.</label>
                          <input type="number" className="input-base text-sm" min={1} value={editForm.cantidad} onChange={e => setEditForm({ ...editForm, cantidad: Number(e.target.value) })} /></div>
                        <div className="flex-1"><label className="block text-[10px] text-gray-400 mb-0.5">Precio unit.</label>
                          <input type="number" className="input-base text-sm" min={0} value={editForm.precioUnit} onChange={e => setEditForm({ ...editForm, precioUnit: Number(e.target.value) })} /></div>
                        <div className="flex-1 pt-4 text-right"><span className="text-sm font-bold text-gray-800">{fmtCurrency(editForm.cantidad * editForm.precioUnit)}</span></div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingItemId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200">Cancelar</button>
                        <button onClick={() => saveEdit(item.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#0F766E' }}>Guardar</button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="py-3 border-b border-[#F3F3F1] last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">{item.nombre}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {[TECHNIQUE_LABELS[item.tecnica], item.notas].filter(Boolean).join(' · ')} — Cant: {item.cantidad} × {fmtCurrency(item.precioUnit)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className="text-sm font-semibold text-gray-900">{fmtCurrency(item.subtotal)}</span>
                          <div className="flex items-center gap-0.5 no-print">
                            <button onClick={() => startEdit(item)} className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-[#0F766E]"><Pencil size={11} /></button>
                            <button onClick={() => { if (confirm('¿Eliminar este item?')) removeItem(item.id) }} className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-red-500"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </div>
                      {getItemVariant(item) && breakdownOpen !== item.id && (() => {
                        const hasValues = item.variantBreakdown && Object.values(item.variantBreakdown).some(v => v > 0)
                        return hasValues ? (
                          <div className="mt-2 flex items-center gap-2">
                            <p className="text-xs text-gray-400">{Object.entries(item.variantBreakdown || {}).filter(([,v]) => v > 0).map(([k,v]) => `${k} ×${v}`).join(' · ')}</p>
                            <button onClick={() => openBreakdown(item)} className="text-xs text-teal-600">✏️</button>
                          </div>
                        ) : (
                          <button onClick={() => openBreakdown(item)} className="text-xs text-teal-600 font-medium mt-2">
                            📐 Desglosar por {(getItemVariant(item)?.name || '').toLowerCase()}
                          </button>
                        )
                      })()}
                      {getItemVariant(item) && breakdownOpen === item.id && (
                        <div className="mt-2 rounded-lg bg-gray-50 p-4 max-w-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">Desglose por {(getItemVariant(item)?.name || '').toLowerCase()}:</span>
                            <button onClick={() => setBreakdownOpen(null)} className="text-sm text-gray-400 hover:text-gray-600">Cerrar</button>
                          </div>
                          <div className="space-y-2">
                            {(Object.keys(item.variantBreakdown || {}).length > 0
                              ? Object.keys(item.variantBreakdown!)
                              : getItemVariant(item)?.options || []
                            ).map(opt => (
                              <div key={opt} className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-600 w-12">{opt}</label>
                                <input type="number" min={0}
                                  className="w-20 text-center text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:border-teal-400 focus:outline-none"
                                  value={(item.variantBreakdown || {})[opt] || 0}
                                  onChange={e => updateItem(item.id, { variantBreakdown: { ...(item.variantBreakdown || {}), [opt]: Number(e.target.value) || 0 } })} />
                              </div>
                            ))}
                          </div>
                          {(() => {
                            const total = Object.values(item.variantBreakdown || {}).reduce((s, v) => s + v, 0)
                            const diff = total - item.cantidad
                            return (
                              <p className={`mt-3 pt-3 border-t border-gray-200 text-sm font-medium ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                Total: {total} / {item.cantidad}{diff === 0 ? ' ✅' : diff < 0 ? ` — Faltan ${-diff} ⚠️` : ` — Sobran ${diff} ❌`}
                              </p>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Items — desktop table */}
                <div className="px-8 py-5 hidden md:block">
                  <table className="w-full">
                    <thead><tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                      <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Descripción</th>
                      <th className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Cant.</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">P. Unit.</th>
                      <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Subtotal</th>
                      <th className="no-print w-10" />
                    </tr></thead>
                    <tbody>
                      {items.map(item => editingItemId === item.id ? (
                        <tr key={item.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td className="py-3 pr-3 align-top"><input type="text" className="input-base text-sm" value={editForm.nombre} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} /></td>
                          <td className="py-3 align-top"><input type="number" className="input-base text-sm w-16 text-center" min={1} value={editForm.cantidad} onChange={e => setEditForm({ ...editForm, cantidad: Number(e.target.value) })} /></td>
                          <td className="py-3 align-top"><input type="number" className="input-base text-sm w-24 text-right" min={0} value={editForm.precioUnit} onChange={e => setEditForm({ ...editForm, precioUnit: Number(e.target.value) })} /></td>
                          <td className="py-3 text-right font-bold text-gray-800 align-top">{fmtCurrency(editForm.cantidad * editForm.precioUnit)}</td>
                          <td className="py-3 no-print align-top">
                            <div className="flex gap-0.5">
                              <button onClick={() => saveEdit(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-green-500 hover:bg-green-50"><Check size={13} /></button>
                              <button onClick={() => setEditingItemId(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"><X size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <React.Fragment key={item.id}>
                        <tr style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td className="py-3 pr-3 align-top">
                            <p className="font-semibold text-gray-800 text-sm">{item.nombre}</p>
                            {(TECHNIQUE_LABELS[item.tecnica] || item.notas || item.variantName) && (
                              <p className="text-[11px] text-gray-400 mt-0.5 no-print">
                                {[TECHNIQUE_LABELS[item.tecnica], item.variantName, item.notas].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {item.notas && <p className="text-[11px] text-gray-400 mt-0.5 hidden print:block">{item.notas}</p>}
                            {getItemVariant(item) && breakdownOpen !== item.id && (() => {
                              const hasValues = item.variantBreakdown && Object.values(item.variantBreakdown).some(v => v > 0)
                              return hasValues ? (
                                <div className="mt-0.5 flex items-center gap-2">
                                  <p className="text-[10px] text-gray-400">{Object.entries(item.variantBreakdown || {}).filter(([,v]) => v > 0).map(([k,v]) => `${k} ×${v}`).join(' · ')}</p>
                                  <button onClick={() => openBreakdown(item)} className="text-[10px] text-teal-600 no-print">✏️</button>
                                </div>
                              ) : (
                                <button onClick={() => openBreakdown(item)} className="text-[10px] text-teal-600 font-medium mt-0.5 no-print">
                                  📐 Desglosar por {(getItemVariant(item)?.name || '').toLowerCase()}
                                </button>
                              )
                            })()}
                          </td>
                          <td className="py-3 text-center text-sm text-gray-600 font-medium align-top">{item.cantidad}</td>
                          <td className="py-3 text-right text-sm text-gray-600 align-top">{fmtCurrency(item.precioUnit)}</td>
                          <td className="py-3 text-right font-bold text-gray-800 align-top">{fmtCurrency(item.subtotal)}</td>
                          <td className="py-3 no-print align-top">
                            <div className="flex gap-0.5">
                              <button onClick={() => startEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-teal-600 hover:bg-teal-50"><Pencil size={12} /></button>
                              <button onClick={() => { if (confirm('¿Eliminar este item?')) removeItem(item.id) }} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                        {breakdownOpen === item.id && item.variantName && (
                          <tr key={`${item.id}-breakdown`} style={{ borderBottom: '1px solid #F9FAFB' }}>
                            <td colSpan={5} className="py-2 px-3">
                              <div className="space-y-1.5 p-3 rounded-lg bg-gray-50">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-gray-500">Desglose por {(getItemVariant(item)?.name || '').toLowerCase()}:</span>
                                  <button onClick={() => setBreakdownOpen(null)} className="text-xs text-gray-400">Cerrar</button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {(Object.keys(item.variantBreakdown || {}).length > 0
                                    ? Object.keys(item.variantBreakdown!)
                                    : catalogProducts.find(p => p.name === item.nombre)?.variant_options || []
                                  ).map(opt => (
                                    <div key={opt} className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600">{opt}</span>
                                      <input type="number" min={0} className="input-base text-xs w-16 text-center"
                                        value={(item.variantBreakdown || {})[opt] || 0}
                                        onChange={e => updateItem(item.id, { variantBreakdown: { ...(item.variantBreakdown || {}), [opt]: Number(e.target.value) || 0 } })} />
                                    </div>
                                  ))}
                                </div>
                                {(() => {
                                  const total = Object.values(item.variantBreakdown || {}).reduce((s, v) => s + v, 0)
                                  const diff = total - item.cantidad
                                  return (
                                    <p className={`text-xs font-medium mt-1 ${diff === 0 ? 'text-green-600' : diff < 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                      Total: {total} / {item.cantidad} {diff === 0 ? '✅' : diff < 0 ? `— Faltan ${-diff}` : `— Sobran ${diff}`}
                                    </p>
                                  )
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>))}
                    </tbody>
                  </table>
                </div>

                {/* Add items buttons — visible on ALL screens */}
                <div className="px-4 sm:px-8 py-3">
                  <div className="no-print grid grid-cols-3 gap-1.5 sm:gap-2">
                    <Link href="/cotizador" className="flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 rounded-xl border border-[#E5E5E3] text-gray-400 hover:text-[#0F766E] hover:border-[#0F766E] hover:bg-[#F0FDFA] transition-all text-center">
                      <Calculator size={18} />
                      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Desde cotizador</span>
                    </Link>
                    <button type="button" onClick={() => { setShowAddPanel('catalog'); loadCatalog() }} className="flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 rounded-xl border border-[#E5E5E3] text-gray-400 hover:text-[#0F766E] hover:border-[#0F766E] hover:bg-[#F0FDFA] transition-all">
                      <ShoppingBag size={18} />
                      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Desde catálogo</span>
                    </button>
                    <button type="button" onClick={() => setShowAddPanel('free')} className="flex flex-col items-center justify-center gap-1.5 py-3 sm:py-4 rounded-xl border border-[#E5E5E3] text-gray-400 hover:text-[#0F766E] hover:border-[#0F766E] hover:bg-[#F0FDFA] transition-all">
                      <Plus size={18} />
                      <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Ítem libre</span>
                    </button>
                  </div>
                  {showAddPanel === 'free' && (
                    <div className="mt-3 p-4 rounded-xl border border-gray-200 bg-white space-y-3 no-print">
                      <div><label className="block text-xs font-medium text-gray-500 mb-1">Descripción *</label>
                        <input type="text" className="input-base text-sm" placeholder="Ej: Diseño personalizado" value={freeItem.nombre} onChange={e => setFreeItem({ ...freeItem, nombre: e.target.value })} autoFocus /></div>
                      <div className="flex gap-2">
                        <div className="w-24"><label className="block text-xs font-medium text-gray-500 mb-1">Cant.</label>
                          <input type="number" className="input-base text-sm" min={1} value={freeItem.cantidad} onChange={e => setFreeItem({ ...freeItem, cantidad: Number(e.target.value) || 1 })} /></div>
                        <div className="flex-1"><label className="block text-xs font-medium text-gray-500 mb-1">Precio unitario *</label>
                          <input type="number" className="input-base text-sm" min={0} value={freeItem.precioUnit || ''} onChange={e => setFreeItem({ ...freeItem, precioUnit: Number(e.target.value) })} /></div>
                        {freeItem.precioUnit > 0 && freeItem.cantidad > 0 && <div className="pt-5 text-right whitespace-nowrap"><span className="text-sm font-bold" style={{ color: '#0F766E' }}>{fmtCurrency(freeItem.cantidad * freeItem.precioUnit)}</span></div>}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setShowAddPanel(null); setFreeItem({ nombre: '', cantidad: 1, precioUnit: 0 }) }} className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200">Cancelar</button>
                        <button onClick={addFreeItem} disabled={!freeItem.nombre.trim() || freeItem.precioUnit <= 0} className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>Agregar</button>
                      </div>
                    </div>
                  )}
                  {showAddPanel === 'catalog' && (
                    <div className="mt-3 p-4 rounded-xl border border-gray-200 bg-white space-y-3 no-print">
                      {!selectedCatalogProduct ? (<>
                        <input type="text" className="input-base text-sm" placeholder="Buscar producto del catálogo..." value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} autoFocus />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {catalogProducts.filter(p => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase())).slice(0, 8).map(p => (
                            <button key={p.id} type="button" onClick={() => setSelectedCatalogProduct(p)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors">
                              <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                              <span className="text-sm font-semibold text-gray-600 flex-shrink-0 ml-2">{fmtCurrency(p.selling_price)}</span>
                            </button>
                          ))}
                          {catalogProducts.filter(p => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && <p className="text-xs text-gray-400 text-center py-3">No hay productos</p>}
                        </div>
                        <button onClick={() => { setShowAddPanel(null); setCatalogSearch('') }} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                      </>) : (<>
                        <div className="flex items-center justify-between">
                          <div><p className="font-medium text-sm text-gray-900">{selectedCatalogProduct.name}</p><p className="text-xs text-gray-400">{fmtCurrency(selectedCatalogProduct.selling_price)} c/u</p></div>
                          <button onClick={() => setSelectedCatalogProduct(null)} className="text-xs text-teal-600">Cambiar</button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-20"><label className="block text-xs text-gray-500 mb-1">Cantidad</label><input type="number" className="input-base text-sm" min={1} value={catalogQty} onChange={e => setCatalogQty(Number(e.target.value) || 1)} /></div>
                          <div className="pt-4"><span className="text-sm font-bold" style={{ color: '#0F766E' }}>= {fmtCurrency(catalogQty * selectedCatalogProduct.selling_price)}</span></div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setShowAddPanel(null); setSelectedCatalogProduct(null); setCatalogQty(1) }} className="px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 border border-gray-200">Cancelar</button>
                          <button onClick={addCatalogItem} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#0F766E' }}>Agregar</button>
                        </div>
                      </>)}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="px-4 sm:px-8 py-3">
                  <div className="flex justify-end">
                    <div className="w-60 space-y-1.5">
                      <div className="flex justify-between items-center py-2 text-sm"><span className="text-gray-500">Subtotal</span><span className="text-gray-700 tabular-nums">{fmtCurrency(totalVenta)}</span></div>
                      <div className="flex justify-between items-center pt-3 border-t border-[#E5E5E3]">
                        <span className="text-base font-bold text-gray-900">TOTAL</span>
                        <span className="text-xl font-black text-[#0F766E] tabular-nums">{fmtCurrency(totalVenta)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditions */}
                <div className="px-4 sm:px-8 py-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t('conditions')}</p>
                    <button onClick={() => setEditingCondiciones(!editingCondiciones)} className="no-print p-0.5 rounded hover:bg-gray-100">
                      <Pencil size={10} className="text-gray-400" />
                    </button>
                  </div>
                  {editingCondiciones ? (
                    <div className="space-y-2 no-print">
                      {condiciones.map((c, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-gray-400 text-xs mt-2">·</span>
                          <textarea className="input-base text-xs flex-1 resize-none" rows={2} value={c}
                            onChange={e => { const arr = [...condiciones]; arr[i] = e.target.value; setCondiciones(arr) }} />
                          <button onClick={() => setCondiciones(condiciones.filter((_, j) => j !== i))} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 mt-1"><X size={12} /></button>
                        </div>
                      ))}
                      <button onClick={() => setCondiciones([...condiciones, ''])} className="flex items-center gap-1 text-xs text-teal-600 font-semibold"><Plus size={12} /> Agregar condición</button>
                    </div>
                  ) : null}
                  <div className={`text-xs text-gray-500 leading-relaxed print:hidden ${editingCondiciones ? 'hidden' : ''}`}>
                    {condiciones.map((c, i) => <div key={i}>· {c}</div>)}
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed hidden print:block">
                    {condiciones.map((c, i) => <div key={i}>· {c}</div>)}
                  </div>
                </div>

                {/* Footer — CORRECCIÓN 6: branding */}
                <div className="mt-6 pt-4 border-t border-[#F3F3F1] flex items-center justify-center gap-1.5 pb-4 px-8">
                  <img src="/logo-icon.png" alt="" className="w-3.5 h-3.5 opacity-30" />
                  <span className="text-[10px] text-gray-300">Generado con Estamply</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Actions ── */}
            <div className="lg:w-80 lg:max-w-[320px] flex-shrink-0 space-y-4 no-print">
              {/* Share */}
              <div className="rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t('share')}</p>
                {/* WhatsApp — primary */}
                <button disabled={savingLink} onClick={async () => {
                  const link = await ensurePublicLink()
                  if (!link) return
                  const waNum = (selectedClient?.whatsapp || selectedClient?.phone || '').replace(/[\s\-\(\)]/g, '')
                  const name = clientDisplayName ? clientDisplayName.split(' ')[0] : ''
                  const msg = encodeURIComponent(`Hola${name ? ` ${name}` : ''}! 👋\n\nTe envío el presupuesto *#${quoteNumber}* por un total de *${fmtCurrency(totalVenta)}*.\n\n📋 Podés verlo y descargarlo acá:\n${link}\n\nCualquier consulta estoy a disposición!`)
                  window.open(`https://wa.me/${waNum}?text=${msg}`, '_blank')
                }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-colors" style={{ background: '#25d366' }}>
                  <MessageCircle size={16} /> {savingLink ? tc('loading') : 'Enviar por WhatsApp'}
                </button>
                {/* PDF + Email — secondary row */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handlePrint} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"><FileDown size={14} /> PDF</button>
                  <button disabled={savingLink} onClick={async () => {
                    const link = await ensurePublicLink()
                    if (!link) return
                    setEmailTo(selectedClient?.email || '')
                    setEmailSubject(`Presupuesto #${quoteNumber} - ${tallerName || 'Taller'}`)
                    setEmailBody(`Hola${clientDisplayName ? ` ${clientDisplayName.split(' ')[0]}` : ''}!\n\nTe envío el presupuesto #${quoteNumber} por un total de ${fmtCurrency(totalVenta)}.\n\nPodés verlo y descargarlo acá:\n${link}\n\nSaludos!`)
                    setShowEmailModal(true)
                  }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    <Mail size={14} /> Email
                  </button>
                </div>
                {/* Copy link */}
                {publicLink && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <LinkIcon size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-xs text-gray-500 truncate">{publicLink.replace(/^https?:\/\//, '')}</span>
                    <button onClick={() => {
                      const fullUrl = publicLink.startsWith('http') ? publicLink : `${window.location.origin}${publicLink}`
                      navigator.clipboard.writeText(fullUrl)
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    }} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold flex-shrink-0 transition-colors ${linkCopied ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                      {linkCopied ? <><Check size={12} /> Copiado!</> : 'Copiar link'}
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm — CORRECCIÓN 2: help text for seña */}
              <div className="rounded-2xl border border-[#E5E5E3] bg-white p-4 sm:p-5 space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t('confirmAsOrder')}</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('deliveryDate')}</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="input-base text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('deposit')}</label>
                  <div className="inline-flex rounded-lg border border-[#E5E5E3] overflow-hidden mb-2">
                    {(['percent', 'fixed'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setAdvanceMode(m)}
                        className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${advanceMode === m ? 'bg-[#0F766E] text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                        {m === 'percent' ? 'Porcentaje %' : 'Monto fijo $'}
                      </button>
                    ))}
                  </div>
                  {advanceMode === 'percent' ? (
                    <div className="flex items-center gap-2">
                      <div className="relative w-24">
                        <input type="number" className="input-base !pr-7" min={0} max={100} value={advancePercent} onChange={e => setAdvancePercent(Number(e.target.value))} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                      </div>
                      <span className="text-sm text-gray-400">=</span>
                      <span className="text-base font-semibold text-green-600">{fmtCurrency(advanceAmount)}</span>
                    </div>
                  ) : (
                    <input type="number" className="input-base" min={0} value={advanceFixed} onChange={e => setAdvanceFixed(Number(e.target.value))} />
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">Seña a cobrar al confirmar este pedido.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas</label>
                  <textarea className="input-base resize-none" rows={2} placeholder="Observaciones…" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <button type="button" disabled={submitting || items.length === 0} onClick={handleConfirmarPedido}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D9488] text-white font-semibold text-sm transition-colors disabled:opacity-40">
                  {submitting ? <><Loader2 size={15} className="animate-spin" /> {tc('loading')}</> : t('confirmOrder')}
                </button>
              </div>

              {/* Update prices moved to in-document banner */}

              {/* Delete */}
              <button type="button" onClick={handleEliminar} className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-xs font-medium text-gray-400 hover:text-red-500 rounded-xl transition-colors">
                <Trash2 size={14} /> Eliminar presupuesto
              </button>

            </div>
          </div>
        )}
        </>)}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900">Enviar presupuesto por email</h3>
              <button onClick={() => setShowEmailModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Para *</label>
                <input type="email" className="input-base" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="email@cliente.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                <input className="input-base" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea className="input-base resize-none" rows={6} value={emailBody} onChange={e => setEmailBody(e.target.value)} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEmailModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
              <button onClick={() => {
                navigator.clipboard.writeText(emailBody)
                const mailto = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`
                window.open(mailto)
                setShowEmailModal(false)
                alert('Mensaje copiado al portapapeles y se abrió tu cliente de correo.')
              }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#4285f4' }}>
                Abrir email
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-3 text-center">El mensaje también se copió al portapapeles por si tu cliente de correo no se abre.</p>
          </div>
        </div>
      )}
    </>
  )
}
