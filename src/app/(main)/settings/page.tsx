'use client'

import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, User, Upload, Loader2, X, Plus, Trash2, QrCode } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier, type ManoDeObraModo, type ComisionBase, DEFAULT_MO_CONFIG } from '@/features/presupuesto/types'
import { useTranslations } from '@/shared/hooks/useTranslations'
import { useLocale } from '@/shared/context/LocaleContext'

const MaterialesPage = lazy(() => import('@/app/(main)/materiales/page'))
const EquipamientoPage = lazy(() => import('@/app/(main)/equipamiento/page'))
const TecnicasPage = lazy(() => import('@/app/(main)/tecnicas/page'))

interface BusinessProfile {
  business_name: string
  business_logo_url: string
  business_cuit: string
  business_address: string
  business_phone: string
  business_email: string
  business_instagram: string
  business_website: string
}

const EMPTY: BusinessProfile = {
  business_name: '',
  business_logo_url: '',
  business_cuit: '',
  business_address: '',
  business_phone: '',
  business_email: '',
  business_instagram: '',
  business_website: '',
}

const TAX_ID_LABELS: Record<string, string> = {
  AR: 'CUIT / DNI',
  MX: 'RFC',
  BR: 'CNPJ / CPF',
  CL: 'RUT',
  CO: 'NIT / CC',
  PE: 'RUC / DNI',
  EC: 'RUC / CI',
  UY: 'RUT / CI',
  PY: 'RUC / CI',
  BO: 'NIT / CI',
  VE: 'RIF / CI',
}

export default function SettingsPage() {
  const supabase = createClient()
  const t = useTranslations('settings')
  const tp = useTranslations('permissions')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency, country } = useLocale()
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [mediosPago, setMediosPago] = useState<Array<{ id: string; nombre: string; tipo_ajuste: string; porcentaje: number; activo: boolean; orden: number }>>([])
  const [editingMedio, setEditingMedio] = useState<{ nombre: string; tipo_ajuste: string; porcentaje: number; id?: string } | null>(null)
  const [guiasTalles, setGuiasTalles] = useState<Array<{ id: string; nombre: string; columnas: string[]; filas: Array<Record<string, string>> }>>([])
  const [editingGuia, setEditingGuia] = useState<{ id?: string; nombre: string; columnas: string[]; filas: Array<Record<string, string>>; imagen_referencia?: string | null } | null>(null)
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; nombre: string; email: string; rol: string; estado: string }>>([])
  const [inviteModal, setInviteModal] = useState<{ id?: string; nombre: string; email: string; password: string; nivel: string; secciones: Record<string, boolean> } | null>(null)
  const [inviting, setInviting] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const [condicionesDefault, setCondicionesDefault] = useState<string[]>([
    'Se requiere seña para iniciar el trabajo.',
    'El tiempo de entrega se confirma al aprobar el presupuesto.',
    'Los precios pueden variar si cambian los costos de materiales.',
  ])
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('perfil')

  const TABS = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'materiales', label: 'Materiales' },
    { id: 'equipamiento', label: 'Equipamiento' },
    { id: 'produccion', label: 'Producción' },
    { id: 'catalogo', label: 'Catálogo web' },
    { id: 'pagos', label: 'Pagos' },
    { id: 'condiciones', label: 'Condiciones' },
    { id: 'equipo', label: 'Equipo' },
  ]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('business_name,business_logo_url,business_cuit,business_address,business_phone,business_email,business_instagram,business_website')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile({
          business_name: data.business_name || '',
          business_logo_url: data.business_logo_url || '',
          business_cuit: data.business_cuit || '',
          business_address: data.business_address || '',
          business_phone: data.business_phone || '',
          business_email: data.business_email || '',
          business_instagram: data.business_instagram || '',
          business_website: data.business_website || '',
        })
      }
      // Load workshop settings
      const [{ data: wsData }, { data: mp }, { data: gt }, { data: tm }] = await Promise.all([
        supabase.from('workshop_settings').select('settings').single(),
        supabase.from('medios_pago').select('*').order('orden'),
        supabase.from('guias_talles').select('*').order('orden'),
        supabase.from('team_members').select('id,nombre,email,rol,estado'),
      ])
      if (wsData?.settings) {
        const sx = wsData.settings as Record<string, unknown>
        setWs({ ...DEFAULT_SETTINGS, ...(sx as Partial<WorkshopSettings>) })
        if (sx.condiciones_default && Array.isArray(sx.condiciones_default)) {
          setCondicionesDefault(sx.condiciones_default as string[])
        } else if (sx.condiciones_presupuesto && typeof sx.condiciones_presupuesto === 'string') {
          // Migrate from old string format
          setCondicionesDefault((sx.condiciones_presupuesto as string).split('\n').map((l: string) => l.replace(/^[·\-•]\s*/, '').trim()).filter(Boolean))
        }
      }
      if (mp) setMediosPago(mp)
      if (gt) setGuiasTalles(gt as typeof guiasTalles)
      if (tm) setTeamMembers(tm as typeof teamMembers)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveWs() {
    if (!userId) return
    const { data: existing } = await supabase.from('workshop_settings').select('id').single()
    const settingsToSave = { ...ws, condiciones_default: condicionesDefault }
    const { error } = existing
      ? await supabase.from('workshop_settings').update({ settings: settingsToSave }).eq('id', existing.id)
      : await supabase.from('workshop_settings').insert({ settings: settingsToSave, user_id: userId })
    if (error) { console.error('saveWs error:', error); alert(`Error: ${error.message}`); return }
    alert('Guardado ✓')
  }

  async function uploadLogo(file: File) {
    if (!userId) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/logo.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      setProfile(p => ({ ...p, business_logo_url: publicUrl }))
    }
    setUploadingLogo(false)
  }

  async function save() {
    if (!userId) return
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile })
    setSaving(false)
    if (error) { console.error('save profile error:', error); alert(`Error: ${error.message}`); return }
    alert('Perfil guardado ✓')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-[#6C5CE7] text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (<>
      <div className="card p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <User size={17} className="text-gray-400" />
          <span className="font-semibold text-gray-800">{t('businessProfile')}</span>
        </div>

        {/* Logo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('businessLogo')}</label>
          <div className="flex items-center gap-4">
            {profile.business_logo_url ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.business_logo_url}
                  alt="Logo"
                  className="w-20 h-20 object-contain rounded-xl border border-gray-200 bg-gray-50"
                />
                <button
                  onClick={() => setProfile(p => ({ ...p, business_logo_url: '' }))}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200"
                >
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <User size={24} className="text-gray-300" />
              </div>
            )}
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploadingLogo ? 'Subiendo...' : t('uploadLogo')}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ['business_name', t('businessName'), 'Ej: Estamply Taller'],
            ['business_cuit', TAX_ID_LABELS[country.code] || 'Tax ID', '20-12345678-9'],
            ['business_address', t('addressField'), 'Calle 123, Ciudad'],
            ['business_phone', t('phoneWhatsapp'), '+54 11 1234-5678'],
            ['business_email', t('contactEmail'), 'taller@ejemplo.com'],
            ['business_instagram', t('instagram'), '@taller'],
            ['business_website', t('website'), 'www.taller.com.ar'],
          ] as [keyof BusinessProfile, string, string][]).map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                value={profile[key]}
                onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                className="input-base"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#6C5CE7' }}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : t('saveProfile')}
        </button>
      </div>
      </>)}

      {activeTab === 'catalogo' && (<>
      {/* Catálogo web */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">{t('webCatalog')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('webCatalogSubtitle')}</p>
        <div className="space-y-4">
          {!!(ws as Record<string, unknown>).catalog_slug && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
              <p className="text-xs text-gray-500 mb-1">Tu catálogo:</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-purple-700 flex-1 truncate">estamply.app/catalogo/{(ws as Record<string, unknown>).catalog_slug as string}</p>
                <button onClick={() => { navigator.clipboard.writeText(`https://www.estamply.app/catalogo/${(ws as Record<string, unknown>).catalog_slug}`); alert('Link copiado') }}
                  className="text-xs px-2 py-1 rounded-lg font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200">Copiar</button>
                <a href={`/catalogo/${(ws as Record<string, unknown>).catalog_slug}`} target="_blank" className="text-xs px-2 py-1 rounded-lg font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200">Ver</a>
                <button onClick={() => setShowQR(true)} className="text-xs px-2 py-1 rounded-lg font-semibold text-purple-600 bg-purple-100 hover:bg-purple-200 flex items-center gap-1"><QrCode size={12} />QR</button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('catalogSlug')}</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">estamply.app/catalogo/</span>
              <input className="input-base flex-1" value={(ws as Record<string, unknown>).catalog_slug as string || ''} placeholder="mi-taller"
                onChange={e => setWs({ ...ws, catalog_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } as WorkshopSettings)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('storeName')}</label>
            <input className="input-base" value={(ws as Record<string, unknown>).nombre_tienda as string || ''} placeholder="Ej: Sublishop, Mi Taller..."
              onChange={e => setWs({ ...ws, nombre_tienda: e.target.value } as WorkshopSettings)} />
            <p className="text-[10px] text-gray-400 mt-0.5">Aparece en el catálogo web y presupuestos. Si está vacío, usa el nombre del perfil.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('storeSubtitle')}</label>
            <input className="input-base" value={(ws as Record<string, unknown>).descripcion_tienda as string || ''} placeholder="Ej: Productos personalizados al mejor precio"
              onChange={e => setWs({ ...ws, descripcion_tienda: e.target.value } as WorkshopSettings)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('coverImage')}</label>
            {(ws as Record<string, unknown>).banner_url ? (
              <div className="relative rounded-lg overflow-hidden h-24 mb-2">
                <img src={(ws as Record<string, unknown>).banner_url as string} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setWs({ ...ws, banner_url: '' } as WorkshopSettings)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"><X size={12} /></button>
              </div>
            ) : null}
            <input type="file" accept="image/*" className="text-sm" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return
              const { data: { user } } = await createClient().auth.getUser()
              const path = `${user?.id}/banner-${Date.now()}.${file.name.split('.').pop()}`
              await createClient().storage.from('product-photos').upload(path, file)
              const { data: { publicUrl } } = createClient().storage.from('product-photos').getPublicUrl(path)
              setWs({ ...ws, banner_url: publicUrl } as WorkshopSettings)
            }} />
            <p className="text-[10px] text-gray-400 mt-1">Recomendado: 1200×400px</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('brandColor')}</label>
            <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" value={(ws as Record<string, unknown>).brand_color as string || '#6C5CE7'}
              onChange={e => setWs({ ...ws, brand_color: e.target.value } as WorkshopSettings)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('shortDescription')}</label>
            <textarea className="input-base text-sm" rows={2} maxLength={280} placeholder="Ej: Taller de sublimación y serigrafía en Córdoba..."
              value={(ws as Record<string, unknown>).brand_description as string || ''}
              onChange={e => setWs({ ...ws, brand_description: e.target.value } as WorkshopSettings)} />
            <p className="text-[10px] text-gray-400 mt-0.5">{((ws as Record<string, unknown>).brand_description as string || '').length}/280</p>
          </div>

          {/* Announcement bar */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{t('announcementBar')}</label>
              <button type="button" onClick={() => setWs({ ...ws, anuncio_activo: !(ws as Record<string, unknown>).anuncio_activo } as WorkshopSettings)}
                className="relative w-9 h-5 rounded-full transition-colors" style={{ background: (ws as Record<string, unknown>).anuncio_activo ? '#6C5CE7' : '#D1D5DB' }}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: (ws as Record<string, unknown>).anuncio_activo ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            {!!(ws as Record<string, unknown>).anuncio_activo && (<>
              <input className="input-base text-sm" placeholder="Ej: Envío gratis en pedidos +$50.000" value={(ws as Record<string, unknown>).anuncio_texto as string || ''}
                onChange={e => setWs({ ...ws, anuncio_texto: e.target.value } as WorkshopSettings)} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-gray-500 mb-1">Color fondo</label>
                  <input type="color" className="w-8 h-8 rounded border border-gray-200 cursor-pointer" value={(ws as Record<string, unknown>).anuncio_color_fondo as string || '#6C5CE7'}
                    onChange={e => setWs({ ...ws, anuncio_color_fondo: e.target.value } as WorkshopSettings)} /></div>
                <div><label className="block text-[10px] text-gray-500 mb-1">Color texto</label>
                  <input type="color" className="w-8 h-8 rounded border border-gray-200 cursor-pointer" value={(ws as Record<string, unknown>).anuncio_color_texto as string || '#FFFFFF'}
                    onChange={e => setWs({ ...ws, anuncio_color_texto: e.target.value } as WorkshopSettings)} /></div>
              </div>
            </>)}
          </div>

          <button onClick={saveWs} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Save size={14} /> {t('saveCatalog')}
          </button>
        </div>
      </div>
      </>)}

      {activeTab === 'pagos' && (<>
      {/* Medios de pago */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">{t('paymentMethods')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('paymentMethodsSubtitle')}</p>
        <div className="space-y-2 mb-4">
          {mediosPago.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <button type="button" onClick={async () => { await supabase.from('medios_pago').update({ activo: !m.activo }).eq('id', m.id); setMediosPago(prev => prev.map(x => x.id === m.id ? { ...x, activo: !x.activo } : x)) }}
                className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0" style={{ background: m.activo ? '#6C5CE7' : '#D1D5DB' }}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: m.activo ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
              <span className={`font-medium text-sm flex-1 ${m.activo ? 'text-gray-800' : 'text-gray-400'}`}>{m.nombre}</span>
              <span className="text-xs text-gray-400">
                {m.tipo_ajuste === 'descuento' ? `-${m.porcentaje}%` : m.tipo_ajuste === 'recargo' ? `+${m.porcentaje}%` : 'Sin ajuste'}
              </span>
              <button onClick={() => setEditingMedio({ nombre: m.nombre, tipo_ajuste: m.tipo_ajuste, porcentaje: m.porcentaje, id: m.id })} className="text-xs text-gray-400 hover:text-gray-600">✎</button>
              <button onClick={async () => { if (confirm('¿Eliminar?')) { await supabase.from('medios_pago').delete().eq('id', m.id); setMediosPago(prev => prev.filter(x => x.id !== m.id)) } }} className="text-xs text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
        {mediosPago.length < 6 && (
          <button onClick={() => setEditingMedio({ nombre: '', tipo_ajuste: 'sin_ajuste', porcentaje: 0 })}
            className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700"><Plus size={14} /> {t('addPaymentMethod')}</button>
        )}
      </div>
      </>)}

      {activeTab === 'condiciones' && (<>
      {/* Condiciones de presupuesto */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">Condiciones de presupuesto</h3>
        <p className="text-xs text-gray-400 mb-4">Se incluyen automáticamente en cada presupuesto nuevo.</p>
        <div className="space-y-2 mb-4">
          {condicionesDefault.map((cond, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-gray-100">
              <span className="text-gray-400 text-sm mt-0.5">·</span>
              <textarea className="input-base text-sm flex-1 resize-none" rows={2} value={cond}
                onChange={e => { const arr = [...condicionesDefault]; arr[i] = e.target.value; setCondicionesDefault(arr) }} />
              <button onClick={() => setCondicionesDefault(condicionesDefault.filter((_, j) => j !== i))}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 flex-shrink-0 mt-0.5">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setCondicionesDefault([...condicionesDefault, ''])}
          className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700 mb-4">
          <Plus size={14} /> Agregar condición
        </button>
        <button onClick={saveWs} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
          <Save size={14} /> Guardar condiciones
        </button>
      </div>
      </>)}

      {activeTab === 'pagos' && (
      <>
      {/* Guía de talles */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">{t('sizeGuides')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('sizeGuidesSubtitle')}</p>
        <div className="space-y-3 mb-4">
          {guiasTalles.map(g => (
            <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div>
                <span className="font-medium text-sm text-gray-800">{g.nombre}</span>
                <p className="text-xs text-gray-400">{g.columnas.length} medidas · {g.filas.length} talles</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditingGuia({ id: g.id, nombre: g.nombre, columnas: g.columnas, filas: g.filas, imagen_referencia: (g as Record<string, unknown>).imagen_referencia as string || null })} className="text-xs text-gray-400 hover:text-gray-600 p-1">✎</button>
                <button onClick={async () => { if (confirm('¿Eliminar?')) { await supabase.from('guias_talles').delete().eq('id', g.id); setGuiasTalles(prev => prev.filter(x => x.id !== g.id)) } }} className="text-xs text-red-400 hover:text-red-600 p-1">✕</button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setEditingGuia({ nombre: '', columnas: ['Ancho', 'Largo'], filas: [{ talle: 'S', Ancho: '', Largo: '' }, { talle: 'M', Ancho: '', Largo: '' }, { talle: 'L', Ancho: '', Largo: '' }] })}
          className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700"><Plus size={14} /> {t('newSizeTable')}</button>
      </div>
      </>
      )}

      {activeTab === 'perfil' && (<>
      {/* País y moneda */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">{t('countryAndCurrency')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('countrySubtitle')}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('country')}</label>
            <select className="input-base" value={(ws as Record<string, unknown>).pais as string || 'AR'}
              onChange={e => {
                const c = require('@/shared/lib/currency').getCountry(e.target.value)
                setWs({ ...ws, pais: e.target.value, moneda: c.currency, simbolo_moneda: c.symbol, idioma: c.locale } as WorkshopSettings)
              }}>
              {require('@/shared/lib/currency').COUNTRIES.map((c: { code: string; name: string; currency: string; symbol: string }) => (
                <option key={c.code} value={c.code}>{c.name} — {c.symbol} ({c.currency})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('language')}</label>
            <select className="input-base" value={(ws as Record<string, unknown>).idioma as string || 'es'}
              onChange={e => setWs({ ...ws, idioma: e.target.value } as WorkshopSettings)}>
              <option value="es">{t('spanish')}</option>
              <option value="pt">{t('portuguese')}</option>
            </select>
          </div>
          <button onClick={saveWs} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>
      </>)}

      {activeTab === 'equipo' && (<>
      {/* Usuarios */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">{t('usersPermissions')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('usersSubtitle')}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50">
            <span className="font-medium text-sm text-gray-800 flex-1">{profile.business_name || t('owner')}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-200 text-purple-700 font-bold">👑 {t('owner')}</span>
            <span className="text-xs text-green-600">● Activo</span>
          </div>
          {teamMembers.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{m.nombre}</p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <span className={`text-xs ${m.estado === 'activo' ? 'text-green-600' : 'text-gray-400'}`}>● {m.estado === 'activo' ? 'Activo' : 'Invitado'}</span>
              <button onClick={async () => {
                const { data } = await supabase.from('team_members').select('permisos').eq('id', m.id).single()
                const p = (data?.permisos || {}) as Record<string, unknown>
                setInviteModal({ id: m.id, nombre: m.nombre, email: m.email, password: '', nivel: (p.nivel_visibilidad as string) || 'solo_precios', secciones: (p.secciones as Record<string, boolean>) || {} })
              }} className="text-xs text-gray-400 hover:text-gray-600">✏️</button>
              <button onClick={async () => { if (confirm('¿Eliminar usuario?')) { await supabase.from('team_members').delete().eq('id', m.id); setTeamMembers(prev => prev.filter(x => x.id !== m.id)) } }} className="text-xs text-red-400 hover:text-red-600">🗑️</button>
            </div>
          ))}
        </div>
        <button onClick={() => setInviteModal({ nombre: '', email: '', password: '', nivel: 'solo_precios', secciones: {} })}
          className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700"><Plus size={14} /> {t('inviteUser')}</button>
      </div>
      </>)}

      {activeTab === 'materiales' && (
        <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>}>
          <MaterialesPage />
        </Suspense>
      )}

      {activeTab === 'equipamiento' && (
        <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>}>
          <EquipamientoPage />
        </Suspense>
      )}

      {activeTab === 'produccion' && (
        <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>}>
          <TecnicasPage />
        </Suspense>
      )}

      {/* Invite/Edit user modal */}
      {inviteModal && (() => {
        const isEdit = !!inviteModal.id
        const toggleSection = (key: string) => setInviteModal({ ...inviteModal, secciones: { ...inviteModal.secciones, [key]: !inviteModal.secciones[key] } })
        const buildPermisos = () => ({ nivel_visibilidad: inviteModal.nivel, secciones: inviteModal.secciones })
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setInviteModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">{isEdit ? tp('editUser') : tp('inviteUser')}</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={inviteModal.nombre} onChange={e => setInviteModal({ ...inviteModal, nombre: e.target.value })} /></div>
              {!isEdit && (<>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input className="input-base" type="email" value={inviteModal.email} onChange={e => setInviteModal({ ...inviteModal, email: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{tp('temporaryPassword')}</label>
                  <input className="input-base" type="text" value={inviteModal.password} onChange={e => setInviteModal({ ...inviteModal, password: e.target.value })} /></div>
              </>)}

              {/* Visibility level */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{tp('visibilityLevel')}</p>
                <p className="text-xs text-gray-400 mb-3">{tp('visibilityHint')}</p>
                <div className="space-y-2">
                  {[
                    ['completa', tp('fullAccess').split(' — ')[0], tp('fullAccess').split(' — ')[1] || tp('fullAccess')],
                    ['solo_precios', tp('pricesOnly').split(' — ')[0], tp('pricesOnly').split(' — ')[1] || tp('pricesOnly')],
                    ['solo_produccion', tp('productionOnly').split(' — ')[0], tp('productionOnly').split(' — ')[1] || tp('productionOnly')],
                  ].map(([v, l, d]) => (
                    <label key={v} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${inviteModal.nivel === v ? 'bg-purple-50 border border-purple-200' : 'border border-gray-100 hover:bg-gray-50'}`}>
                      <input type="radio" name="nivel" checked={inviteModal.nivel === v} onChange={() => setInviteModal({ ...inviteModal, nivel: v })} className="mt-0.5 text-purple-600" />
                      <div><p className="text-sm font-medium text-gray-800">{l}</p><p className="text-xs text-gray-400">{d}</p></div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sections */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{tp('sections')}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[['inicio', 'Inicio'], ['cotizador', 'Cotizador'], ['presupuestos', 'Presupuestos'], ['pedidos', 'Pedidos'], ['clientes', 'Clientes'], ['catalogo', 'Catálogo'], ['estadisticas', 'Estadísticas'], ['materiales', 'Materiales'], ['equipamiento', 'Equipamiento'], ['produccion', 'Producción'], ['configuracion', 'Configuración']].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer py-1">
                      <input type="checkbox" checked={!!inviteModal.secciones[k]} onChange={() => toggleSection(k)} className="rounded border-gray-300 text-purple-600" />
                      <span className="text-sm text-gray-700">{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setInviteModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button disabled={!inviteModal.nombre || (!isEdit && (!inviteModal.email || !inviteModal.password)) || inviting}
                onClick={async () => {
                  setInviting(true)
                  const permisos = buildPermisos()
                  if (isEdit) {
                    await supabase.from('team_members').update({ nombre: inviteModal.nombre, permisos }).eq('id', inviteModal.id!)
                    setTeamMembers(prev => prev.map(m => m.id === inviteModal.id ? { ...m, nombre: inviteModal.nombre } : m))
                    setInviteModal(null)
                  } else {
                    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: inviteModal.nombre, email: inviteModal.email, password: inviteModal.password, permisos }) })
                    const data = await res.json()
                    if (data.error) alert(`Error: ${data.error}`)
                    else { setTeamMembers(prev => [...prev, { id: data.userId || '', nombre: inviteModal.nombre, email: inviteModal.email, rol: 'personalizado', estado: 'activo' }]); setInviteModal(null) }
                  }
                  setInviting(false)
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>{inviting ? (isEdit ? 'Guardando...' : 'Invitando...') : (isEdit ? tp('save') : tp('invite'))}</button>
            </div>
          </div>
        </div>
      )})()}

      {/* Guía de talles modal */}
      {editingGuia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setEditingGuia(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">{editingGuia.id ? 'Editar' : 'Nueva'} guía de talles</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={editingGuia.nombre} placeholder="Ej: Remeras Hombre/Unisex" onChange={e => setEditingGuia({ ...editingGuia, nombre: e.target.value })} /></div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de referencia <span className="font-normal text-gray-400">(opcional)</span></label>
                {editingGuia.imagen_referencia ? (
                  <div className="relative rounded-lg overflow-hidden mb-2 border border-gray-200">
                    <img src={editingGuia.imagen_referencia} alt="" className="w-full max-h-48 object-contain bg-gray-50" />
                    <button onClick={() => setEditingGuia({ ...editingGuia, imagen_referencia: null })} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"><X size={12} /></button>
                  </div>
                ) : null}
                <input type="file" accept="image/*" className="text-xs" onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return
                  const { data: { user } } = await supabase.auth.getUser()
                  const path = `${user?.id}/guia-${Date.now()}.${file.name.split('.').pop()}`
                  await supabase.storage.from('product-photos').upload(path, file)
                  const { data: { publicUrl } } = supabase.storage.from('product-photos').getPublicUrl(path)
                  setEditingGuia(prev => prev ? { ...prev, imagen_referencia: publicUrl } : prev)
                }} />
                <p className="text-[10px] text-gray-400 mt-1">Diagrama de la prenda con medidas señaladas.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tabla de medidas <span className="font-normal text-gray-400">(opcional)</span></label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {editingGuia.columnas.map((col, ci) => (
                    <div key={ci} className="flex items-center gap-0.5 bg-gray-100 rounded px-2 py-1">
                      <input className="bg-transparent outline-none text-xs w-16 font-medium" value={col} onChange={e => { const c = [...editingGuia.columnas]; c[ci] = e.target.value; setEditingGuia({ ...editingGuia, columnas: c }) }} />
                      {editingGuia.columnas.length > 1 && <button onClick={() => setEditingGuia({ ...editingGuia, columnas: editingGuia.columnas.filter((_, i) => i !== ci) })} className="text-gray-300 hover:text-red-400"><X size={10} /></button>}
                    </div>
                  ))}
                  <button onClick={() => setEditingGuia({ ...editingGuia, columnas: [...editingGuia.columnas, 'Medida'] })} className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600 font-semibold">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Talles y valores</label>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs"><thead><tr>
                    <th className="text-left px-1.5 py-1 text-gray-500 font-semibold">Talle</th>
                    {editingGuia.columnas.map((c, i) => <th key={i} className="text-left px-1.5 py-1 text-gray-500 font-semibold">{c}</th>)}
                    <th></th>
                  </tr></thead><tbody>
                    {editingGuia.filas.map((fila, fi) => (
                      <tr key={fi} className="border-t border-gray-50">
                        <td className="px-1.5 py-1"><input className="input-base text-xs py-0.5 w-14" value={fila.talle || ''} onChange={e => { const f = [...editingGuia.filas]; f[fi] = { ...f[fi], talle: e.target.value }; setEditingGuia({ ...editingGuia, filas: f }) }} /></td>
                        {editingGuia.columnas.map((c, ci) => (
                          <td key={ci} className="px-1.5 py-1"><input className="input-base text-xs py-0.5 w-14" value={fila[c] || ''} placeholder="cm" onChange={e => { const f = [...editingGuia.filas]; f[fi] = { ...f[fi], [c]: e.target.value }; setEditingGuia({ ...editingGuia, filas: f }) }} /></td>
                        ))}
                        <td className="px-1"><button onClick={() => setEditingGuia({ ...editingGuia, filas: editingGuia.filas.filter((_, i) => i !== fi) })} className="text-red-300 hover:text-red-500"><X size={10} /></button></td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
                <button onClick={() => { const empty: Record<string, string> = { talle: '' }; editingGuia.columnas.forEach(c => empty[c] = ''); setEditingGuia({ ...editingGuia, filas: [...editingGuia.filas, empty] }) }}
                  className="text-xs font-semibold text-purple-600 mt-2">+ Agregar fila</button>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingGuia(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button disabled={!editingGuia.nombre.trim()} onClick={async () => {
                const payload = { nombre: editingGuia.nombre, columnas: editingGuia.columnas, filas: editingGuia.filas, imagen_referencia: editingGuia.imagen_referencia || null, orden: guiasTalles.length }
                if (editingGuia.id) {
                  await supabase.from('guias_talles').update(payload).eq('id', editingGuia.id)
                  setGuiasTalles(prev => prev.map(g => g.id === editingGuia.id ? { ...g, ...payload } : g))
                } else {
                  const { data } = await supabase.from('guias_talles').insert(payload).select('*').single()
                  if (data) setGuiasTalles(prev => [...prev, data as typeof guiasTalles[0]])
                }
                setEditingGuia(null)
              }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Medio de pago modal */}
      {editingMedio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setEditingMedio(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">{editingMedio.id ? 'Editar' : 'Nuevo'} medio de pago</h3>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={editingMedio.nombre} onChange={e => setEditingMedio({ ...editingMedio, nombre: e.target.value })} placeholder="Ej: Transferencia bancaria" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ajuste de precio</label>
                <div className="flex gap-2">
                  {[['sin_ajuste', 'Sin ajuste'], ['descuento', 'Descuento'], ['recargo', 'Recargo']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setEditingMedio({ ...editingMedio, tipo_ajuste: v })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${editingMedio.tipo_ajuste === v ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{l}</button>
                  ))}
                </div></div>
              {editingMedio.tipo_ajuste !== 'sin_ajuste' && (
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje (%)</label>
                  <input type="number" className="input-base" min={0} max={100} value={editingMedio.porcentaje}
                    onFocus={e => e.target.select()} onChange={e => setEditingMedio({ ...editingMedio, porcentaje: parseFloat(e.target.value) || 0 })} /></div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingMedio(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button disabled={!editingMedio.nombre.trim()} onClick={async () => {
                const payload = { nombre: editingMedio.nombre, tipo_ajuste: editingMedio.tipo_ajuste, porcentaje: editingMedio.tipo_ajuste === 'sin_ajuste' ? 0 : editingMedio.porcentaje, activo: true, orden: mediosPago.length }
                if (editingMedio.id) {
                  await supabase.from('medios_pago').update(payload).eq('id', editingMedio.id)
                  setMediosPago(prev => prev.map(m => m.id === editingMedio.id ? { ...m, ...payload } : m))
                } else {
                  const { data } = await supabase.from('medios_pago').insert(payload).select('*').single()
                  if (data) setMediosPago(prev => [...prev, data])
                }
                setEditingMedio(null)
              }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#6C5CE7' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && !!(ws as Record<string, unknown>).catalog_slug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90dvh] overflow-y-auto text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">QR de tu catálogo</h3>
            <QRCodeCanvas id="catalog-qr" value={`https://www.estamply.app/catalogo/${(ws as Record<string, unknown>).catalog_slug}`} size={300} level="M" />
            <p className="text-xs text-gray-400 mt-3">estamply.app/catalogo/{(ws as Record<string, unknown>).catalog_slug as string}</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowQR(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cerrar</button>
              <button onClick={() => {
                const canvas = document.getElementById('catalog-qr') as HTMLCanvasElement
                if (!canvas) return
                const link = document.createElement('a')
                link.download = `qr-catalogo-${(ws as Record<string, unknown>).catalog_slug}.png`
                link.href = canvas.toDataURL('image/png')
                link.click()
              }} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>Descargar PNG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
