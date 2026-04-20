// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, LayoutGrid, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/db/client'
import { usePresupuesto } from '@/features/presupuesto/context/PresupuestoContext'
import { DEFAULT_SETTINGS, DEFAULT_MO_CONFIG, type WorkshopSettings } from '@/features/presupuesto/types'
import type { Tecnica, Category, Insumo, TecnicaSlug } from '@/features/taller/types'
import { TECHNIQUE_DEFAULTS, ALL_TECNICA_SLUGS } from '@/features/taller/types'
import { useCostEngine } from '@/features/taller/hooks/useCostEngine'
import { RollVisual } from '@/features/calculator/components/RollVisual'
import { SheetVisual } from '@/features/calculator/components/SheetVisual'
import { calcSheetNesting, calcRollNesting } from '@/features/taller/services/cost-engine'
import ProductPicker from '@/features/calculator/components/ProductPicker'
import VinylPicker from '@/features/calculator/components/VinylPicker'
import AuditTicket from '@/features/calculator/components/AuditTicket'
import NumericInput from '@/shared/components/NumericInput'
import ProductionConfig from '@/features/calculator/components/ProductionConfig'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'
import { usePermissions } from '@/shared/context/PermissionsContext'

// Cotizador tabs: Sublimación, DTF (unified), Vinilo, Serigrafía
type CotizadorTab = 'subli' | 'dtf_unified' | 'vinyl_unified' | 'serigrafia'

export default function CotizadorPage() {
  const supabase = createClient()
  const t = useTranslations('quoter')
  const tc = useTranslations('common')
  const { fmt } = useLocale()
  const { showCosts } = usePermissions()
  const { addItem, items } = usePresupuesto()

  const [products, setProducts] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [tecnicas, setTecnicas] = useState<Tecnica[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [extraCosts, setExtraCosts] = useState<Array<{ name: string; amount: number; modo: 'total' | 'unidad' }>>([])

  const [showVinylNesting, setShowVinylNesting] = useState<Record<number, boolean>>({})
  const [showSheetNesting, setShowSheetNesting] = useState<Record<number, boolean>>({})
  const [cotizadorTab, setCotizadorTab] = useState<CotizadorTab>('subli')
  const [dtfVariant, setDtfVariant] = useState<'dtf' | 'dtf_uv'>('dtf') // internal DTF toggle
  const [vinylVariant, setVinylVariant] = useState<'vinyl' | 'vinyl_adhesivo'>('vinyl') // internal Vinyl toggle
  const [selectedPapelId, setSelectedPapelId] = useState('')
  const [selectedTintaId, setSelectedTintaId] = useState('')
  const [selectedPrinterId, setSelectedPrinterId] = useState('')
  const [selectedPressId, setSelectedPressId] = useState('')
  const [cotizadorDtfMode, setCotizadorDtfMode] = useState<'propia' | 'tercerizado'>('propia')
  const [pricingMode, setPricingMode] = useState<'margin' | 'markup'>('margin')
  const [selectedHornoId, setSelectedHornoId] = useState('')
  const [selectedPulpoId, setSelectedPulpoId] = useState('')
  const [selectedTintaSeriId, setSelectedTintaSeriId] = useState('')
  const [userOverrodePapel, setUserOverrodePapel] = useState(false)

  const loadedRef = useRef(false)
  const loadData = async () => {
    const [{ data: p }, { data: e }, { data: t }, { data: ins }, { data: c }, { data: ws }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('equipment').select('*'),
      supabase.from('tecnicas').select('*'),
      supabase.from('insumos').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('workshop_settings').select('settings').single(),
    ])
    if (p) setProducts(p)
    if (e) setEquipment(e)
    if (ins) setInsumos(ins as Insumo[])
    if (c) setCategories(c || [])
    let tecs = (t || []) as Tecnica[]
    if (tecs.length === 0) {
      for (const slug of ALL_TECNICA_SLUGS) {
        const def = TECHNIQUE_DEFAULTS[slug]
        await supabase.from('tecnicas').insert({ slug, nombre: def.nombre, color: def.color, config: def.config, equipment_ids: [], insumo_ids: [], activa: def.activa })
      }
      const { data: seeded } = await supabase.from('tecnicas').select('*')
      tecs = (seeded || []) as Tecnica[]
    }
    if (tecs.length === 0) {
      tecs = ALL_TECNICA_SLUGS.map(slug => ({ id: `local-${slug}`, user_id: '', slug, created_at: '', ...TECHNIQUE_DEFAULTS[slug], equipment_ids: [], insumo_ids: [] }))
    }
    setTecnicas(tecs)
    if (ws?.settings) {
      const saved = ws.settings as Record<string, unknown>
      setSettings({ ...DEFAULT_SETTINGS, ...saved, mano_de_obra: { ...DEFAULT_MO_CONFIG, ...((saved.mano_de_obra as Record<string, unknown>) ?? {}) } } as WorkshopSettings)
      if (saved.pricing_mode) setPricingMode(saved.pricing_mode as 'margin' | 'markup')
    }
    setLoading(false)
  }

  useEffect(() => { loadData(); loadedRef.current = true }, [])
  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible' && loadedRef.current) loadData() }
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [])

  // Build cotizador tabs from active techniques
  const dtfTextil = tecnicas.find(t => t.slug === 'dtf' && t.activa)
  const dtfUv = tecnicas.find(t => t.slug === 'dtf_uv' && t.activa)
  const hasDtf = !!(dtfTextil || dtfUv)

  const cotizadorTabs: { id: CotizadorTab; label: string; color: string }[] = []
  if (tecnicas.find(t => t.slug === 'subli' && t.activa)) cotizadorTabs.push({ id: 'subli', label: 'Sublimación', color: '#6C5CE7' })
  if (hasDtf) cotizadorTabs.push({ id: 'dtf_unified', label: 'DTF', color: '#E17055' })
  const hasVinyl = tecnicas.some(t => (t.slug === 'vinyl' || t.slug === 'vinyl_adhesivo') && t.activa)
  if (hasVinyl) cotizadorTabs.push({ id: 'vinyl_unified', label: 'Vinilo', color: '#E84393' })
  if (tecnicas.find(t => t.slug === 'serigrafia' && t.activa)) cotizadorTabs.push({ id: 'serigrafia', label: 'Serigrafía', color: '#FDCB6E' })

  // Resolve which actual technique to use
  const resolvedSlug: TecnicaSlug = cotizadorTab === 'dtf_unified' ? dtfVariant : cotizadorTab === 'vinyl_unified' ? vinylVariant : cotizadorTab as TecnicaSlug
  const activeTecnicasForEngine = tecnicas.filter(t => t.activa)

  // Pass ALL active to engine but set the selected one
  const resolvedTec = tecnicas.find(t => t.slug === resolvedSlug && t.activa)

  const engine = useCostEngine(activeTecnicasForEngine, products, equipment, insumos, settings)
  const { technique, product, result } = engine

  // Sync engine selection with cotizador tab — reset insumo selections when technique changes
  useEffect(() => {
    if (resolvedTec && engine.selectedTechniqueId !== resolvedTec.id) {
      engine.setSelectedTechniqueId(resolvedTec.id)
      setSelectedPapelId('')
      setSelectedTintaId('')
      setSelectedPrinterId('')
      setSelectedHornoId('')
    }
  }, [resolvedSlug, resolvedTec?.id])

  // Category margin + pricing mode
  useEffect(() => {
    if (product?.category_id && categories.length) {
      const cat = categories.find(c => c.id === product.category_id)
      if (cat) {
        engine.setMargin(cat.margen_sugerido)
        const catMode = cat.pricing_mode
        if (catMode) { setPricingMode(catMode); engine.setOverridePricingMode(catMode) }
      }
    }
  }, [product?.id, product?.category_id, categories])

  // MO is now edited inline in the AuditTicket

  // Production config: filtered equipment lists
  // Production config: insumo and equipment lists for dropdowns
  // Filter by tecnica_asociada matching the current technique slug, or 'compartido'
  const matchesTecnica = (ins: Insumo) => {
    const ta = ins.tecnica_asociada
    return ta === resolvedSlug || ta === 'compartido'
  }
  const papelInsumos = technique
    ? insumos.filter(ins => (ins.tipo === 'papel' || ins.tipo === 'film') && matchesTecnica(ins))
    : []
  const tintaInsumos = technique
    ? insumos.filter(ins => ins.tipo === 'tinta' && matchesTecnica(ins))
    : []
  // Filter equipment by technique compatibility
  const printers = equipment.filter((e: Record<string, unknown>) => {
    const t = e.type as string || ''
    const cl = e.clasificacion as string || ''
    if (!t.startsWith('printer') && !t.startsWith('plotter') && cl !== 'impresora' && cl !== 'plotter') return false
    const slugs = (e.tecnicas_slugs as string[]) || []
    return slugs.length === 0 || slugs.includes(resolvedSlug)
  })
  const presses = equipment.filter((e: Record<string, unknown>) => {
    const t = e.type as string || ''
    if (!t.startsWith('press')) return false
    const slugs = (e.tecnicas_slugs as string[]) || []
    return slugs.length === 0 || slugs.includes(resolvedSlug)
  })
  const hornos = equipment.filter((e: Record<string, unknown>) => {
    const cl = e.clasificacion as string || ''
    if (cl !== 'horno') return false
    const slugs = (e.tecnicas_slugs as string[]) || []
    return slugs.length === 0 || slugs.includes(resolvedSlug)
  })
  const pulpos = equipment.filter((e: Record<string, unknown>) => {
    const cl = e.clasificacion as string || ''
    if (cl !== 'pulpo') return false
    const slugs = (e.tecnicas_slugs as string[]) || []
    return slugs.length === 0 || slugs.includes(resolvedSlug)
  })
  const tintaSeriInsumos = technique
    ? insumos.filter(ins => ins.tipo === 'tinta_serigrafica' && matchesTecnica(ins))
    : []

  // Auto-select: Product → Printer + Press (filtered by technique)
  useEffect(() => {
    if (!product) return
    // Press: use product's if compatible, else first compatible
    const productPress = product.press_equipment_id
    const pressCompatible = productPress && presses.some((e: Record<string, unknown>) => e.id === productPress)
    setSelectedPressId(pressCompatible ? productPress : (presses[0]?.id as string || ''))
    // Printer: use product's if compatible, else first compatible
    const productPrinter = product.printer_equipment_id as string | null
    const printerCompatible = productPrinter && printers.some((e: Record<string, unknown>) => e.id === productPrinter)
    setSelectedPrinterId(printerCompatible ? productPrinter : (printers[0]?.id as string || ''))
    setUserOverrodePapel(false)
  }, [product?.id, resolvedSlug])

  // Auto-cascade: Printer → Paper + Ink
  useEffect(() => {
    if (!selectedPrinterId) return
    const printer = equipment.find((e: Record<string, unknown>) => e.id === selectedPrinterId) as Record<string, unknown> | undefined
    if (!printer) return
    // Auto-set papel from printer (unless user manually overrode it)
    if (!userOverrodePapel && printer.assigned_paper_id) {
      setSelectedPapelId(printer.assigned_paper_id as string)
    }
    // Auto-set tinta from printer
    if (printer.assigned_ink_id) {
      setSelectedTintaId(printer.assigned_ink_id as string)
    }
  }, [selectedPrinterId])

  // Auto-select first insumo with actual pricing data, fallback to first available
  useEffect(() => {
    if (!selectedPapelId && papelInsumos.length) {
      const withPrice = papelInsumos.find(ins => {
        const c = ins.config as Record<string, unknown>
        return ((c.precio_rollo as number) || 0) > 0 || ((c.precio_resma as number) || 0) > 0
      })
      setSelectedPapelId((withPrice || papelInsumos[0]).id)
    }
  }, [papelInsumos.length, selectedPapelId])
  useEffect(() => {
    if (!selectedTintaId && tintaInsumos.length) setSelectedTintaId(tintaInsumos[0].id)
  }, [tintaInsumos.length, selectedTintaId])
  useEffect(() => {
    if (!selectedHornoId && hornos.length) setSelectedHornoId((hornos[0] as Record<string, unknown>).id as string)
  }, [hornos.length, selectedHornoId])
  useEffect(() => {
    if (!selectedPulpoId && pulpos.length) setSelectedPulpoId((pulpos[0] as Record<string, unknown>).id as string)
  }, [pulpos.length, selectedPulpoId])
  useEffect(() => {
    if (!selectedTintaSeriId && tintaSeriInsumos.length) setSelectedTintaSeriId(tintaSeriInsumos[0].id)
  }, [tintaSeriInsumos.length, selectedTintaSeriId])

  // Sync production config selections to cost engine
  useEffect(() => { engine.setOverridePapelId(selectedPapelId || null) }, [selectedPapelId])
  useEffect(() => { engine.setOverrideTintaId(selectedTintaId || null) }, [selectedTintaId])
  useEffect(() => { engine.setOverridePrinterId(selectedPrinterId || null) }, [selectedPrinterId])
  useEffect(() => { engine.setOverridePressId(selectedPressId || null) }, [selectedPressId])
  const dtfSlug = resolvedSlug === 'dtf' || resolvedSlug === 'dtf_uv'
  useEffect(() => { engine.setOverrideDtfMode(cotizadorDtfMode) }, [cotizadorDtfMode])
  // Set default mode from technique config (applies to all techniques with modo)
  useEffect(() => {
    if (technique) {
      const cfg = technique.config as unknown as Record<string, unknown>
      if (cfg.modo) setCotizadorDtfMode(cfg.modo as 'propia' | 'tercerizado')
      else setCotizadorDtfMode('propia')
    }
  }, [technique?.id])

  // Get the actual selected papel insumo (for nesting visual)
  const paperInsumo = papelInsumos.find(i => i.id === selectedPapelId) || engine.linkedInsumos.find(i => i.tipo === 'papel')
  const paperCfg = paperInsumo ? (paperInsumo.config as Record<string, unknown>) : null
  const subliIsRollo = paperCfg?.formato === 'rollo'
  const sheetW = (paperCfg?.ancho as number) || 21
  const sheetH = (paperCfg?.alto as number) || 29.7
  const subliRollW = (paperCfg?.rollo_ancho as number) || 61
  const techniqueConfig = technique?.config as Record<string, unknown> | undefined
  const printerMargin = (techniqueConfig?.margen_seguridad as number) ?? 0.5

  // Roll dimensions for DTF nesting visual
  const isDTF = resolvedSlug === 'dtf' || resolvedSlug === 'dtf_uv'
  const isSubli = resolvedSlug === 'subli'
  const dtfRollW = (() => {
    if (!isDTF) return 60
    const filmIns = engine.linkedInsumos.find(i => i.tipo === 'film')
    const servicioIns = engine.linkedInsumos.find(i => i.tipo === 'servicio_impresion' || i.tipo === 'otro')
    if (filmIns) return ((filmIns.config as Record<string, unknown>).ancho as number) || 60
    if (servicioIns) return ((servicioIns.config as Record<string, unknown>).ancho_material as number) || 60
    return 60
  })()
  const dtfGap = isDTF ? ((techniqueConfig?.margen_seguridad as number) ?? 1) : 1
  // Whether to show distribution in the left column
  const showDistribution = isSubli || isDTF

  // Vinyl variants from linked insumos
  const vinylInsumos = engine.linkedInsumos.filter(i => i.tipo === 'vinilo')
  const vinylVariants = vinylInsumos.flatMap((ins, mi) => {
    const c = ins.config as Record<string, unknown>
    const colores = (c.colores as string[]) || []
    return colores.map((color, ci) => ({
      id: `${mi}-${ci}`, label: `${(c.acabado as string) || ins.nombre} - ${color}`,
      precioMetro: (c.precio_metro as number) || 0, anchoRollo: (c.ancho as number) || 50,
    }))
  })

  const [itemNotes, setItemNotes] = useState('')

  function handleAddToCart() {
    if (!result || !technique || !product || result.pedidoMinimoWarning) return
    addItem({
      tecnica: technique.slug, nombre: product.name,
      costoUnit: result.costoTotal, precioUnit: result.precioConDesc,
      precioSinDesc: result.precioSugerido, cantidad: engine.quantity,
      subtotal: result.subtotal, ganancia: result.ganancia,
      notas: itemNotes || undefined,
    })
    setItemNotes('')
  }

  const [saveProductModal, setSaveProductModal] = useState<{ name: string; price: number; visible: boolean } | null>(null)
  function handleSaveAsProduct() {
    if (!result || !product) return
    setSaveProductModal({ name: `${product.name} — ${technique?.nombre || ''}`, price: Math.round(result.precioConDesc), visible: true })
  }
  async function doSaveProduct() {
    if (!saveProductModal || !result || !product) return
    await supabase.from('catalog_products').insert({
      name: saveProductModal.name,
      cost_mode: 'calculated',
      base_product_id: product.id,
      technique: technique?.slug || null,
      unit_cost: Math.round(result.costoTotal),
      cost_breakdown: result.costLines,
      selling_price: saveProductModal.price,
      visible_in_catalog: saveProductModal.visible,
    })
    setSaveProductModal(null)
    alert('Producto guardado en "Mis productos" ✓')
  }

  const activeTabMeta = cotizadorTabs.find(t => t.id === cotizadorTab) ?? cotizadorTabs[0]
  const activeColor = activeTabMeta?.color ?? '#6C5CE7'
  const isVinyl = resolvedSlug === 'vinyl' || resolvedSlug === 'vinyl_adhesivo'
  const isSerigrafia = resolvedSlug === 'serigrafia'
  const needsDesignSize = !isVinyl && !isSerigrafia
  const needsColors = isVinyl || isSerigrafia

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6">
        <div><h1 className="text-2xl font-black text-gray-900">{t('title')}</h1><p className="text-sm text-gray-500 mt-0.5">{t('newQuotation')}</p></div>
        <Link href="/presupuesto" className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white" style={{ backgroundColor: '#6C5CE7', boxShadow: '0 4px 14px rgba(108,92,231,0.35)' }}>
          <ShoppingCart size={16} /> Presupuesto
          {items.length > 0 && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: '#E84393' }}>{items.length}</span>}
        </Link>
      </div>

      {/* Main technique tabs: Sublimación | DTF | Vinilo | Serigrafía */}
      <div className="flex rounded-full p-1 gap-1 mb-4 w-fit flex-wrap" style={{ backgroundColor: '#F1F1F1' }}>
        {cotizadorTabs.map(tab => (
          <button key={tab.id} type="button" onClick={() => setCotizadorTab(tab.id)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200"
            style={cotizadorTab === tab.id
              ? { backgroundColor: '#fff', color: tab.color, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
              : { backgroundColor: 'transparent', color: '#888' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* DTF internal toggle: Textil / UV */}
      {cotizadorTab === 'dtf_unified' && dtfTextil && dtfUv && (
        <div className="flex gap-1 mb-4">
          {([['dtf', 'DTF Textil', '#E17055'], ['dtf_uv', 'DTF UV', '#00B894']] as const).map(([slug, label, color]) => (
            <button key={slug} onClick={() => setDtfVariant(slug)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={dtfVariant === slug ? { background: color, color: '#fff' } : { background: '#F1F1F1', color: '#888' }}>
              {label}
            </button>
          ))}
        </div>
      )}
      {/* Vinyl internal toggle: Textil / Autoadhesivo */}
      {cotizadorTab === 'vinyl_unified' && tecnicas.some(t => t.slug === 'vinyl' && t.activa) && tecnicas.some(t => t.slug === 'vinyl_adhesivo' && t.activa) && (
        <div className="flex gap-1 mb-4">
          {([['vinyl', 'Vinilo Textil', '#E84393'], ['vinyl_adhesivo', 'Vinilo Autoadhesivo', '#D63384']] as const).map(([slug, label, color]) => (
            <button key={slug} onClick={() => setVinylVariant(slug)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={vinylVariant === slug ? { background: color, color: '#fff' } : { background: '#F1F1F1', color: '#888' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${activeColor}40`, borderTopColor: activeColor }} /></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT */}
          <div className="lg:w-[400px] flex-shrink-0 space-y-4">
            <div className="card p-5 space-y-5">
              <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('product')}</label>
                <ProductPicker products={products} value={engine.productId} onChange={engine.setProductId} /></div>

              {!product && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <p className="text-sm text-gray-400">{t('selectProduct')}</p>
                </div>
              )}

              {product && (<><div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('quantity')}</label>
                <NumericInput className="input-base" min={1} value={engine.quantity} onChange={engine.setQuantity} errorMessage="La cantidad mínima es 1" /></div>

              {result?.pedidoMinimoWarning && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-700">{result.pedidoMinimoWarning}</p>
                </div>
              )}

              {needsDesignSize && (<>
                {/* Zones selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('stampingZones')}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button key={n} type="button" onClick={() => engine.setNumZones(n)}
                        className="w-9 h-9 rounded-lg text-sm font-bold transition-all"
                        style={engine.numZones === n ? { backgroundColor: activeColor, color: '#fff' } : { backgroundColor: '#F1F1F1', color: '#666' }}>{n}</button>
                    ))}
                  </div>
                </div>

                {/* Single zone — no label, just size fields */}
                {engine.numZones === 1 && (<>
                  <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('designSize')}</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><p className="text-[10px] text-gray-400 mb-0.5">{t('width')}</p><NumericInput className="input-base" value={engine.designWidth} onChange={engine.setDesignWidth} /></div>
                      <span className="text-gray-400 font-bold flex-shrink-0 mt-4">&times;</span>
                      <div className="flex-1"><p className="text-[10px] text-gray-400 mb-0.5">{t('height')}</p><NumericInput className="input-base" value={engine.designHeight} onChange={engine.setDesignHeight} /></div>
                    </div></div>
                  {showDistribution && engine.designWidth > 0 && engine.designHeight > 0 && (() => {
                    if (isSubli && !subliIsRollo) {
                      const n = calcSheetNesting(engine.designWidth, engine.designHeight, sheetW, sheetH, printerMargin)
                      const sheets = Math.ceil(engine.quantity / Math.max(n.count, 1))
                      return (
                        <div>
                          <button type="button" onClick={() => setShowSheetNesting(prev => ({ ...prev, 0: !prev[0] }))}
                            className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                            <LayoutGrid size={10} /> {showSheetNesting[0] ? t('hideDistribution') : '+ ' + t('viewDistribution')}
                          </button>
                          {showSheetNesting[0] && (
                            <div className="mt-2 p-3 rounded-lg" style={{ background: `${activeColor}08`, border: `1px solid ${activeColor}12` }}>
                              <SheetVisual sheetW={sheetW} sheetH={sheetH} designW={engine.designWidth} designH={engine.designHeight}
                                cols={n.cols} rows={n.rows} rotated={n.rotated} perSheet={n.count}
                                sheetsNeeded={sheets} quantity={engine.quantity} margin={printerMargin} />
                            </div>
                          )}
                        </div>
                      )
                    }
                    // Subli rollo or DTF — roll nesting
                    const rw = isSubli ? subliRollW : dtfRollW
                    const gap = isSubli ? printerMargin : dtfGap
                    const rn = calcRollNesting(engine.designWidth, engine.designHeight, rw, engine.quantity, gap, gap)
                    const ml = rn.lengthCm / 100
                    return (
                      <div>
                        <button type="button" onClick={() => setShowSheetNesting(prev => ({ ...prev, 0: !prev[0] }))}
                          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                          <LayoutGrid size={10} /> {showSheetNesting[0] ? t('hideDistribution') : '+ ' + t('viewDistribution')}
                        </button>
                        {showSheetNesting[0] && (
                          <div className="mt-2 p-3 rounded-lg" style={{ background: `${activeColor}08`, border: `1px solid ${activeColor}12` }}>
                            <RollVisual rollWidth={rw} designW={engine.designWidth} designH={engine.designHeight}
                              cols={rn.cols} rows={rn.rows} quantity={engine.quantity}
                              rotated={rn.rotated} metrosLineales={ml} color={activeColor} />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </>)}

                {/* Multiple zones */}
                {engine.numZones > 1 && (() => {
                  const activeZones = engine.zones.slice(0, engine.numZones)
                  return activeZones.map((zone, zi) => {
                    return (
                      <div key={zi} className="rounded-xl p-3 border border-gray-100 bg-white shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zona {zi + 1}</span>
                          {resolvedSlug !== 'dtf_uv' && (
                            <select className="text-xs text-gray-500 bg-transparent border-none outline-none cursor-pointer" value={zone.ubicacion} onChange={e => engine.updateZone(zi, { ubicacion: e.target.value })}>
                              <option value="">Ubicación...</option>
                              <option value="Pecho">Pecho</option>
                              <option value="Espalda">Espalda</option>
                              <option value="Manga izq.">Manga izq.</option>
                              <option value="Manga der.">Manga der.</option>
                              <option value="Cuello / Nuca">Cuello / Nuca</option>
                              <option value="Otro">Otro</option>
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('designSize')}</label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><p className="text-[9px] text-gray-400 mb-0.5">{t('width')}</p><NumericInput className="input-base text-sm" value={zone.ancho} onChange={v => engine.updateZone(zi, { ancho: v })} /></div>
                            <span className="text-gray-400 font-bold text-xs mt-3">&times;</span>
                            <div className="flex-1"><p className="text-[9px] text-gray-400 mb-0.5">{t('height')}</p><NumericInput className="input-base text-sm" value={zone.alto} onChange={v => engine.updateZone(zi, { alto: v })} /></div>
                          </div>
                        </div>
                        {showDistribution && zone.ancho > 0 && zone.alto > 0 && (() => {
                          if (isSubli && !subliIsRollo) {
                            const zn = calcSheetNesting(zone.ancho, zone.alto, sheetW, sheetH, printerMargin)
                            return (
                              <div>
                                <button type="button" onClick={() => setShowSheetNesting(prev => ({ ...prev, [zi]: !prev[zi] }))}
                                  className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                                  <LayoutGrid size={10} /> {showSheetNesting[zi] ? t('hideDistribution') : '+ ' + t('viewDistribution')}
                                </button>
                                {showSheetNesting[zi] && (
                                  <div className="mt-2 p-3 rounded-lg" style={{ background: `${activeColor}08`, border: `1px solid ${activeColor}12` }}>
                                    <SheetVisual sheetW={sheetW} sheetH={sheetH} designW={zone.ancho} designH={zone.alto}
                                      cols={zn.cols} rows={zn.rows} rotated={zn.rotated} perSheet={zn.count}
                                      sheetsNeeded={Math.ceil(engine.quantity / Math.max(zn.count, 1))} quantity={engine.quantity} margin={printerMargin} />
                                  </div>
                                )}
                              </div>
                            )
                          }
                          // Subli rollo or DTF — roll nesting
                          const rw = isSubli ? subliRollW : dtfRollW
                          const gap = isSubli ? printerMargin : dtfGap
                          const rn = calcRollNesting(zone.ancho, zone.alto, rw, engine.quantity, gap, gap)
                          const ml = rn.lengthCm / 100
                          return (
                            <div>
                              <button type="button" onClick={() => setShowSheetNesting(prev => ({ ...prev, [zi]: !prev[zi] }))}
                                className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                                <LayoutGrid size={10} /> {showSheetNesting[zi] ? t('hideDistribution') : '+ ' + t('viewDistribution')}
                              </button>
                              {showSheetNesting[zi] && (
                                <div className="mt-2 p-3 rounded-lg" style={{ background: `${activeColor}08`, border: `1px solid ${activeColor}12` }}>
                                  <RollVisual rollWidth={rw} designW={zone.ancho} designH={zone.alto}
                                    cols={rn.cols} rows={rn.rows} quantity={engine.quantity}
                                    rotated={rn.rotated} metrosLineales={ml} color={activeColor} />
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })
                })()}
              </>)}

              {needsColors && (
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{isSerigrafia ? 'Colores en el diseño' : 'Colores'}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button key={n} type="button" onClick={() => engine.setNumColors(n)}
                        className="w-9 h-9 rounded-lg text-sm font-bold transition-all"
                        style={engine.numColors === n ? { backgroundColor: activeColor, color: '#fff' } : { backgroundColor: '#F1F1F1', color: '#666' }}>{n}</button>
                    ))}
                  </div></div>
              )}

              {/* Vinyl per-color: propia shows material picker, tercerizado shows only size */}
              {isVinyl && Array.from({ length: engine.numColors }).map((_, i) => {
                const sel = engine.vinylSelections[i] ?? { materialIdx: 0, colorIdx: 0, ancho: 10, alto: 10 }
                const variantId = `${sel.materialIdx}-${sel.colorIdx}`
                const vn = result?.vinylNesting?.[i]
                const isTerc = cotizadorDtfMode === 'tercerizado'
                const selectedV = !isTerc ? vinylVariants.find(v => v.id === variantId) : null
                const tooWide = selectedV && sel.ancho > selectedV.anchoRollo
                return (
                  <div key={i} className="rounded-xl p-3 border border-gray-100 bg-white shadow-sm space-y-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Color {i + 1}</span>
                    {!isTerc && (vinylVariants.length > 0 ? (
                      <VinylPicker variants={vinylVariants} value={variantId} onChange={id => {
                        const [mi, ci] = id.split('-').map(Number)
                        engine.updateVinylSelection(i, { materialIdx: mi, colorIdx: ci })
                      }} />
                    ) : (
                      <p className="text-xs text-gray-400">Vinculá materiales de vinilo en Técnicas → Vinilo</p>
                    ))}
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Tamaño recorte (cm)</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><p className="text-[9px] text-gray-400 mb-0.5">{t('width')}</p><NumericInput className="input-base text-sm" value={sel.ancho} onChange={v => engine.updateVinylSelection(i, { ancho: v })} /></div>
                        <span className="text-gray-400 font-bold text-xs mt-3">&times;</span>
                        <div className="flex-1"><p className="text-[9px] text-gray-400 mb-0.5">{t('height')}</p><NumericInput className="input-base text-sm" value={sel.alto} onChange={v => engine.updateVinylSelection(i, { alto: v })} /></div>
                      </div>
                    </div>
                    {tooWide && <p className="text-[10px] text-red-500 font-medium">⚠ El recorte ({sel.ancho}cm) es más ancho que el rollo ({selectedV!.anchoRollo}cm)</p>}
                    {vn && vn.cols > 0 && (
                      <div>
                        <button type="button" onClick={() => setShowVinylNesting(prev => ({ ...prev, [i]: !prev[i] }))}
                          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                          <LayoutGrid size={10} /> {showVinylNesting[i] ? t('hideDistribution') : '+ ' + t('viewDistribution')}
                        </button>
                        {showVinylNesting[i] && (
                          <div className="mt-2 p-2 rounded-lg" style={{ background: '#E8439308', border: '1px solid #E8439312' }}>
                            <RollVisual rollWidth={vn.anchoRollo} designW={sel.ancho} designH={sel.alto}
                              cols={vn.cols} rows={vn.rows} quantity={engine.quantity}
                              rotated={vn.rotated} metrosLineales={vn.metrosLineales} color={activeColor} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Nesting now integrated in the AuditTicket desglose */}
            </>)}
            </div>

            {product && (<>
              {/* Production config */}
              <div className="card p-5">
                <ProductionConfig
                  slug={resolvedSlug}
                  papelInsumos={papelInsumos}
                  tintaInsumos={tintaInsumos}
                  printers={printers.map((p: Record<string, unknown>) => ({ id: p.id as string, name: p.name as string }))}
                  presses={presses.map((p: Record<string, unknown>) => ({ id: p.id as string, name: p.name as string }))}
                  selectedPapelId={selectedPapelId}
                  selectedTintaId={selectedTintaId}
                  selectedPrinterId={selectedPrinterId}
                  selectedPressId={selectedPressId}
                  onPapelChange={id => { setSelectedPapelId(id); setUserOverrodePapel(true) }}
                  onTintaChange={setSelectedTintaId}
                  onPrinterChange={id => { setSelectedPrinterId(id); setUserOverrodePapel(false) }}
                  onPressChange={setSelectedPressId}
                  dtfMode={cotizadorDtfMode}
                  onDtfModeChange={setCotizadorDtfMode}
                  hornos={hornos.map((h: Record<string, unknown>) => ({ id: h.id as string, name: h.name as string }))}
                  selectedHornoId={selectedHornoId}
                  onHornoChange={setSelectedHornoId}
                  pulpos={pulpos.map((p: Record<string, unknown>) => ({ id: p.id as string, name: p.name as string }))}
                  selectedPulpoId={selectedPulpoId}
                  onPulpoChange={id => { setSelectedPulpoId(id); engine.setOverridePulpoId(id || null) }}
                  tintaSeriInsumos={tintaSeriInsumos}
                  selectedTintaSeriId={selectedTintaSeriId}
                  onTintaSeriChange={id => { setSelectedTintaSeriId(id); engine.setOverrideTintaSeriId(id || null) }}
                />
              </div>

              {/* Notas */}
              <div className="card p-5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{t('itemNotes')}</label>
                <input type="text" className="input-base text-sm" value={itemNotes} onChange={e => setItemNotes(e.target.value)}
                  placeholder={t('itemNotesPlaceholder')} />
              </div>

              {/* Serigrafía upsell */}
              {showCosts && isSerigrafia && result && !result.pedidoMinimoWarning && result.costoSetupTotal && (
                <div className="card p-4 bg-amber-50 border-amber-100">
                  <p className="text-xs text-amber-700">
                    El costo de pantallas ({fmt(result.costoSetupTotal)}) se divide entre las unidades.
                    Con {engine.quantity * 2} u. bajaría a {fmt(Math.round(result.costoSetupTotal / (engine.quantity * 2)))}/u.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <button type="button" onClick={handleAddToCart} disabled={!result || !!result?.pedidoMinimoWarning}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40"
                style={{ backgroundColor: activeColor, boxShadow: `0 4px 20px ${activeColor}40` }}>
                <ShoppingCart size={16} /> {t('addToQuote')}
              </button>
              <button type="button" onClick={handleSaveAsProduct} disabled={!result || !!result?.pedidoMinimoWarning}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-600 transition-all disabled:opacity-30">
                {t('saveAsProduct')}
              </button>
            </>)}
          </div>

          {/* RIGHT */}
          <div className="flex-1 lg:sticky lg:top-8 lg:self-start space-y-3">
            {result?.missingInsumosWarning && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">{result.missingInsumosWarning}</p>
              </div>
            )}
            {!result?.pedidoMinimoWarning ? (
              <AuditTicket
                technique={resolvedSlug}
                costLines={result?.costLines ?? []}
                costoTotal={result?.costoTotal ?? 0}
                margin={engine.margin}
                precioSugerido={result?.precioSugerido ?? 0}
                descPorcentaje={result?.descPorcentaje ?? 0}
                precioConDesc={result?.precioConDesc ?? 0}
                quantity={engine.quantity}
                subtotal={result?.subtotal ?? 0}
                ganancia={result?.ganancia ?? 0}
                timeMinutes={result?.timeMinutes ?? 0}
                profitPerHour={result?.profitPerHour ?? 0}
                addDisabled={!result}
                onMarginChange={engine.setMargin}
                overrideMerma={engine.overrideMerma}
                defaultMerma={engine.defaultMerma}
                onMermaChange={engine.setOverrideMerma}
                overrideAmortPrint={engine.overrideAmortPrint}
                defaultAmortPrint={engine.defaultAmortPrint}
                onAmortPrintChange={engine.setOverrideAmortPrint}
                overrideAmortPress={engine.overrideAmortPress}
                defaultAmortPress={engine.defaultAmortPress}
                onAmortPressChange={engine.setOverrideAmortPress}
                mo={engine.mo}
                onMoChange={engine.setMo}
                extraCosts={extraCosts}
                onExtraCostsChange={setExtraCosts}
                hasOverrides={engine.hasOverrides}
                onResetOverrides={() => { engine.resetOverrides(); setExtraCosts([]) }}
                onDiscountChange={engine.setOverrideDiscountPct}
                tipoCambio={(settings as Record<string, unknown>).tipo_cambio as number || undefined}
                monedaReferencia={(settings as Record<string, unknown>).moneda_referencia as string || undefined}
                consumibles={engine.linkedInsumos
                  .filter(ins => !['papel', 'tinta', 'film', 'vinilo', 'tinta_serigrafica', 'servicio_impresion', 'emulsion'].includes(ins.tipo))
                  .map(ins => {
                    const c = ins.config as Record<string, unknown>
                    const price = (c.precio as number) || (c.precio_kg as number) || 0
                    const rend = (c.rendimiento as number) || 1
                    return { name: ins.nombre, costPerUse: Math.round(price / rend) }
                  })}
                pricingMode={pricingMode}
                onPricingModeChange={(mode) => {
                  setPricingMode(mode)
                  engine.setOverridePricingMode(mode)
                }}
                timeBreakdown={result?.timeBreakdown}
              />
            ) : (
              <div className="rounded-2xl flex flex-col items-center justify-center min-h-[300px] gap-3 border-2 border-dashed border-amber-200 bg-amber-50">
                <AlertTriangle size={28} className="text-amber-400" />
                <p className="text-sm text-amber-600 font-medium text-center px-8">{result.pedidoMinimoWarning}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save as product modal */}
      {saveProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSaveProductModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">Guardar como producto</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={saveProductModal.name} onChange={e => setSaveProductModal({ ...saveProductModal, name: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta ($)</label>
                <NumericInput className="input-base" min={1} value={saveProductModal.price} onChange={v => setSaveProductModal({ ...saveProductModal, price: v })} errorMessage="El precio mínimo es 1" /></div>
              {showCosts && <p className="text-xs text-gray-400">Costo: {result ? fmt(Math.round(result.costoTotal)) : '—'} /unidad</p>}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-purple-600" checked={saveProductModal.visible}
                  onChange={() => setSaveProductModal({ ...saveProductModal, visible: !saveProductModal.visible })} />
                <span className="text-sm text-gray-700">Visible en catálogo web</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSaveProductModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">{tc('cancel')}</button>
              <button onClick={doSaveProduct} disabled={!saveProductModal.name.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>{tc('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
