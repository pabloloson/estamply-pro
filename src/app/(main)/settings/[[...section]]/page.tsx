// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db/client'
import { Save, User, Upload, Loader2, X, Plus, Trash2, QrCode, Check, Pencil, Search, MoreHorizontal, Copy } from 'lucide-react'
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
  city: string
  province: string
  postal_code: string
  business_phone: string
  business_email: string
  business_instagram: string
  business_website: string
  facebook: string
  tiktok: string
  youtube: string
}

const EMPTY: BusinessProfile = {
  business_name: '',
  business_logo_url: '',
  business_cuit: '',
  business_address: '',
  city: '',
  province: '',
  postal_code: '',
  business_phone: '',
  business_email: '',
  business_instagram: '',
  business_website: '',
  facebook: '',
  tiktok: '',
  youtube: '',
}


export default function SettingsPage() {
  const params = useParams<{ section?: string[] }>()
  const supabase = createClient()
  const t = useTranslations('settings')
  const tp = useTranslations('permissions')
  const tc = useTranslations('common')
  const { fmt: fmtCurrency, country } = useLocale()
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [ownerName, setOwnerName] = useState('')
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
  const [condicionesDefault, setCondicionesDefault] = useState<Array<{ text: string; activa: boolean }>>([
    { text: 'Se requiere seña para iniciar el trabajo.', activa: true },
    { text: 'El tiempo de entrega se confirma al aprobar el presupuesto.', activa: true },
    { text: 'Los precios pueden variar si cambian los costos de materiales.', activa: true },
  ])
  const logoInputRef = useRef<HTMLInputElement>(null)
  // Section from URL: /settings/perfil → 'perfil', /settings → null (menu)
  const sectionFromUrl = params.section?.[0] || null
  const activeSection = sectionFromUrl || (typeof window !== 'undefined' && window.innerWidth >= 768 ? 'perfil' : null)
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; whatsapp: string | null; website: string | null; notes: string | null; email: string | null; location: string | null }>>([])
  const [editingSupplier, setEditingSupplier] = useState<{ id?: string; name: string; whatsapp: string; email: string; website: string; location: string; notes: string } | null>(null)
  const [searchSupplier, setSearchSupplier] = useState('')
  const [mpToast, setMpToast] = useState('')
  const [guiaMenu, setGuiaMenu] = useState<string | null>(null)
  const [userMenu, setUserMenu] = useState<string | null>(null)
  const [openDiscTecs, setOpenDiscTecs] = useState<string[]>(['descuentos_subli'])


  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setOwnerName(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('business_name,business_logo_url,business_cuit,business_address,city,province,postal_code,business_phone,business_email,business_instagram,business_website,facebook,tiktok,youtube')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile({
          business_name: data.business_name || '',
          business_logo_url: data.business_logo_url || '',
          business_cuit: data.business_cuit || '',
          business_address: data.business_address || '',
          city: data.city || '',
          province: data.province || '',
          postal_code: data.postal_code || '',
          business_phone: data.business_phone || '',
          business_email: data.business_email || '',
          business_instagram: data.business_instagram || '',
          business_website: data.business_website || '',
          facebook: data.facebook || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || '',
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
          const raw = sx.condiciones_default as Array<string | { text: string; activa: boolean }>
          setCondicionesDefault(raw.map(c => typeof c === 'string' ? { text: c, activa: true } : c))
        } else if (sx.condiciones_presupuesto && typeof sx.condiciones_presupuesto === 'string') {
          // Migrate from old string format
          setCondicionesDefault((sx.condiciones_presupuesto as string).split('\n').map((l: string) => l.replace(/^[·\-•]\s*/, '').trim()).filter(Boolean).map(t => ({ text: t, activa: true })))
        }
      }
      if (mp) setMediosPago(mp)
      if (gt) setGuiasTalles(gt as typeof guiasTalles)
      if (tm) setTeamMembers(tm as typeof teamMembers)
      const { data: sup } = await supabase.from('suppliers').select('*').order('name')
      if (sup) setSuppliers(sup)
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
    if (error) { console.error('saveWs error:', error); setSaveState('error'); return }
    setSaveState('saved')
    setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2000)
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
    setSaveState('saving')
    const { error } = await supabase.from('profiles').upsert({ id: userId, ...profile })
    if (error) { console.error('save profile error:', error); setSaveState('error'); return }
    await saveWs()
    setSaveState('saved')
    setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
    </div>
  )

  return (
    <div>

      {activeSection === 'perfil' && (<>
      <div className="card p-6 max-w-2xl">
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

        {/* ── DATOS DEL NEGOCIO ── */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-4">{t('businessData')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('businessName')}</label>
              <input value={profile.business_name} onChange={e => setProfile(p => ({ ...p, business_name: e.target.value }))} className="input-base" placeholder="Ej: Estamply Taller" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('taxId')}</label>
              <input value={profile.business_cuit} onChange={e => setProfile(p => ({ ...p, business_cuit: e.target.value }))} className="input-base" placeholder="20-12345678-9" />
              <p className="text-[11px] text-gray-400 mt-1">{t('taxIdHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('addressField')}</label>
              <input value={profile.business_address} onChange={e => setProfile(p => ({ ...p, business_address: e.target.value }))} className="input-base" placeholder="Calle 123" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('city')}</label>
              <input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} className="input-base" placeholder="Córdoba" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('province')}</label>
              <input value={profile.province} onChange={e => setProfile(p => ({ ...p, province: e.target.value }))} className="input-base" placeholder="Córdoba" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('postalCode')}</label>
              <input value={profile.postal_code} onChange={e => setProfile(p => ({ ...p, postal_code: e.target.value }))} className="input-base" placeholder="5000" />
            </div>
          </div>
        </div>

        {/* ── CONTACTO ── */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-4">{t('contact')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('contactEmail')}</label>
              <input value={profile.business_email} onChange={e => setProfile(p => ({ ...p, business_email: e.target.value }))} className="input-base" placeholder="taller@ejemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('phoneWhatsapp')}</label>
              <input value={profile.business_phone} onChange={e => setProfile(p => ({ ...p, business_phone: e.target.value }))} className="input-base" placeholder="+54 11 1234-5678" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('website')}</label>
              <input value={profile.business_website} onChange={e => setProfile(p => ({ ...p, business_website: e.target.value }))} className="input-base" placeholder="www.taller.com.ar" />
            </div>
          </div>
        </div>

        {/* ── REDES SOCIALES ── */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider mb-1">{t('socialNetworks')}</p>
          <p className="text-[11px] text-gray-400 mb-4">{t('socialNetworksHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('instagram')}</label>
              <input value={profile.business_instagram} onChange={e => setProfile(p => ({ ...p, business_instagram: e.target.value }))} className="input-base" placeholder="@tu_instagram" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('facebook')}</label>
              <input value={profile.facebook} onChange={e => setProfile(p => ({ ...p, facebook: e.target.value }))} className="input-base" placeholder="facebook.com/tu_pagina" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('tiktok')}</label>
              <input value={profile.tiktok} onChange={e => setProfile(p => ({ ...p, tiktok: e.target.value }))} className="input-base" placeholder="@tu_tiktok" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('youtube')}</label>
              <input value={profile.youtube} onChange={e => setProfile(p => ({ ...p, youtube: e.target.value }))} className="input-base" placeholder="youtube.com/@tu_canal" />
            </div>
          </div>
        </div>

        <button onClick={save} disabled={saveState === 'saving'}
          className={`mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : ''}`}
          style={saveState !== 'saved' && saveState !== 'error' ? { background: '#0F766E' } : {}}>
          {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : saveState === 'saved' ? <><Check size={14} /> Guardado</> : saveState === 'error' ? 'Error al guardar' : <><Save size={14} /> Guardar</>}
        </button>
      </div>
      </>)}

      {activeSection === 'catalogo' && (<>
      <div className="flex gap-6">
      {/* Form column */}
      <div className="flex-1 max-w-2xl">
      <div className="card p-6">
        <h3 className="font-semibold text-gray-800 mb-1">{t('webCatalog')}</h3>
        <p className="text-xs text-gray-400 mb-4">{t('webCatalogSubtitle')}</p>
        <div className="space-y-4">
          {!!(ws as Record<string, unknown>).catalog_slug && (
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-100">
              <p className="text-xs text-gray-500 mb-1">Tu catálogo:</p>
              <p className="text-sm font-semibold text-teal-800 truncate mb-2">estamply.app/catalogo/{(ws as Record<string, unknown>).catalog_slug as string}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { navigator.clipboard.writeText(`https://estamply.app/catalogo/${(ws as Record<string, unknown>).catalog_slug}`); alert('Link copiado') }}
                  className="text-xs px-2.5 py-1 rounded-lg font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100">Copiar</button>
                <a href={`/catalogo/${(ws as Record<string, unknown>).catalog_slug}`} target="_blank" className="text-xs px-2.5 py-1 rounded-lg font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100">Ver</a>
                <button onClick={() => setShowQR(true)} className="text-xs px-2.5 py-1 rounded-lg font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 flex items-center gap-1"><QrCode size={12} />QR</button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('catalogSlug')}</label>
            <p className="text-xs text-gray-400 mb-1 sm:hidden">estamply.app/catalogo/</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 hidden sm:inline">estamply.app/catalogo/</span>
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
            <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-teal-300 transition-colors">
              {(ws as Record<string, unknown>).banner_url ? (
                <div className="relative w-full px-4">
                  <img src={(ws as Record<string, unknown>).banner_url as string} alt="Portada" className="w-full h-32 object-cover rounded-lg" />
                  <button type="button" onClick={(e) => { e.preventDefault(); setWs({ ...ws, banner_url: '' } as WorkshopSettings) }}
                    className="absolute top-2 right-6 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs hover:bg-black/70">&#10005;</button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="text-gray-300 mb-2" />
                  <span className="text-sm text-gray-500">Subir imagen de portada</span>
                  <span className="text-xs text-gray-400 mt-1">Recomendado: 1200x400px</span>
                </>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return
                const { data: { user } } = await createClient().auth.getUser()
                const path = `${user?.id}/banner-${Date.now()}.${file.name.split('.').pop()}`
                await createClient().storage.from('product-photos').upload(path, file)
                const { data: { publicUrl } } = createClient().storage.from('product-photos').getPublicUrl(path)
                setWs({ ...ws, banner_url: publicUrl } as WorkshopSettings)
              }} />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('brandColor')}</label>
            <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" value={(ws as Record<string, unknown>).brand_color as string || '#0F766E'}
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
                className="relative w-9 h-5 rounded-full transition-colors" style={{ background: (ws as Record<string, unknown>).anuncio_activo ? '#0F766E' : '#D1D5DB' }}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: (ws as Record<string, unknown>).anuncio_activo ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            {!!(ws as Record<string, unknown>).anuncio_activo && (<>
              <input className="input-base text-sm" placeholder="Ej: Envío gratis en pedidos +$50.000" value={(ws as Record<string, unknown>).anuncio_texto as string || ''}
                onChange={e => setWs({ ...ws, anuncio_texto: e.target.value } as WorkshopSettings)} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-gray-500 mb-1">Color fondo</label>
                  <input type="color" className="w-8 h-8 rounded border border-gray-200 cursor-pointer" value={(ws as Record<string, unknown>).anuncio_color_fondo as string || '#0F766E'}
                    onChange={e => setWs({ ...ws, anuncio_color_fondo: e.target.value } as WorkshopSettings)} /></div>
                <div><label className="block text-[10px] text-gray-500 mb-1">Color texto</label>
                  <input type="color" className="w-8 h-8 rounded border border-gray-200 cursor-pointer" value={(ws as Record<string, unknown>).anuncio_color_texto as string || '#FFFFFF'}
                    onChange={e => setWs({ ...ws, anuncio_color_texto: e.target.value } as WorkshopSettings)} /></div>
              </div>
            </>)}
          </div>

          {/* WhatsApp */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">WhatsApp en catálogo</label>
              <button type="button" onClick={() => setWs({ ...ws, wa_boton_visible: !(ws as Record<string, unknown>).wa_boton_visible === false ? false : true } as WorkshopSettings)}
                className="relative w-9 h-5 rounded-full transition-colors" style={{ background: (ws as Record<string, unknown>).wa_boton_visible !== false ? '#22C55E' : '#D1D5DB' }}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: (ws as Record<string, unknown>).wa_boton_visible !== false ? 'translateX(16px)' : 'translateX(0)' }} />
              </button>
            </div>
            {!profile.business_phone && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
                Configurá tu número de WhatsApp en Perfil para activar el botón en tu catálogo.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje predeterminado</label>
              <textarea className="input-base text-sm" rows={3} maxLength={500}
                value={(ws as Record<string, unknown>).wa_mensaje as string || ''}
                onChange={e => setWs({ ...ws, wa_mensaje: e.target.value } as WorkshopSettings)}
                placeholder="Ej: Hola, vi tu catálogo y quiero consultar sobre..." />
              <p className="text-[10px] text-gray-400 mt-0.5">Este mensaje aparece pre-cargado cuando un cliente toca el botón de WhatsApp. Si está vacío, se usa un mensaje genérico.</p>
            </div>
          </div>

        </div>
      </div>

      <button onClick={saveWs} disabled={saveState === 'saving'}
        className={`mt-6 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : ''}`}
        style={saveState !== 'saved' && saveState !== 'error' ? { background: '#0F766E' } : {}}>
        {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : saveState === 'saved' ? <><Check size={14} /> Guardado</> : saveState === 'error' ? 'Error al guardar' : <><Save size={14} /> Guardar</>}
      </button>
      {/* Mobile: preview link */}
      {!!(ws as Record<string, unknown>).catalog_slug && (
        <a href={`/catalogo/${(ws as Record<string, unknown>).catalog_slug}`} target="_blank" rel="noopener"
          className="mt-3 md:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50">
          Vista previa →
        </a>
      )}
      </div>{/* close form column */}
      {/* Desktop preview */}
      {(() => {
        const previewColor = (ws as Record<string, unknown>).brand_color as string || '#0F766E'
        const previewBanner = (ws as Record<string, unknown>).banner_url as string || ''
        const previewName = (ws as Record<string, unknown>).nombre_tienda as string || profile.business_name || 'Mi Taller'
        const previewDesc = (ws as Record<string, unknown>).descripcion_tienda as string || ''
        const previewAnuncio = !!(ws as Record<string, unknown>).anuncio_activo
        const previewAnuncioText = (ws as Record<string, unknown>).anuncio_texto as string || ''
        const previewAnuncioBg = (ws as Record<string, unknown>).anuncio_color_fondo as string || previewColor
        const previewAnuncioTxt = (ws as Record<string, unknown>).anuncio_color_texto as string || '#fff'
        return (
          <div className="hidden lg:block w-[320px] flex-shrink-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Vista previa</p>
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm" style={{ height: 480 }}>
              {/* Announcement */}
              {previewAnuncio && previewAnuncioText && (
                <div className="px-3 py-1.5 text-center text-[10px] font-semibold" style={{ background: previewAnuncioBg, color: previewAnuncioTxt }}>{previewAnuncioText}</div>
              )}
              {/* Header */}
              <div className="relative text-white overflow-hidden" style={previewBanner ? {} : { background: `linear-gradient(135deg, ${previewColor}, ${previewColor}dd)` }}>
                {previewBanner && (<>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewBanner} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.2))' }} />
                </>)}
                <div className="relative px-4 py-5">
                  <div className="flex items-center gap-2">
                    {profile.business_logo_url && <img src={profile.business_logo_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-white/20" />}
                    <div>
                      <p className="text-sm font-bold drop-shadow-sm">{previewName}</p>
                      {previewDesc && <p className="text-[10px] opacity-80">{previewDesc}</p>}
                    </div>
                  </div>
                </div>
              </div>
              {/* Fake search */}
              <div className="px-3 pt-2">
                <div className="h-8 rounded-lg border border-gray-200 bg-gray-50 flex items-center px-2 gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <span className="text-[10px] text-gray-300">Buscar productos...</span>
                </div>
              </div>
              {/* Fake product grid */}
              <div className="grid grid-cols-2 gap-2 p-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gray-100 h-20" />
                    <div className="p-2 space-y-1">
                      <div className="h-2 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 rounded w-1/2" style={{ background: `${previewColor}40` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
      </div>
      </>)}

      {activeSection === 'moneda-idioma' && (() => {
  const CURRENCY_NAMES: Record<string, string> = { ARS: 'Peso argentino', MXN: 'Peso mexicano', COP: 'Peso colombiano', CLP: 'Peso chileno', PEN: 'Sol peruano', USD: 'Dólar estadounidense', UYU: 'Peso uruguayo', PYG: 'Guaraní', BOB: 'Boliviano', BRL: 'Real brasileño', VES: 'Bolívar', CRC: 'Colón', GTQ: 'Quetzal', DOP: 'Peso dominicano', EUR: 'Euro' }
  const selectedCountry = require('@/shared/lib/currency').getCountry((ws as Record<string, unknown>).pais as string || 'AR') as { currency: string; symbol: string; thousandsSep: string; decimalSep: string; decimals: number }
  const currencyName = CURRENCY_NAMES[selectedCountry.currency] || selectedCountry.currency
  const exampleNum = selectedCountry.decimals > 0 ? `${selectedCountry.symbol}1${selectedCountry.thousandsSep}234${selectedCountry.thousandsSep}567${selectedCountry.decimalSep}${'0'.repeat(selectedCountry.decimals)}` : `${selectedCountry.symbol}1${selectedCountry.thousandsSep}234${selectedCountry.thousandsSep}567`
  return (
  <div className="max-w-2xl">
    <h2 className="text-xl font-bold text-gray-900 mb-1">{t('currencyLanguageTitle')}</h2>
    <p className="text-sm text-gray-400 mb-4">{t('currencyLanguageSubtitle')}</p>

    {/* Configuración regional */}
    <div className="card p-6 space-y-4 mb-4">
      <h3 className="text-sm font-semibold text-gray-700">{t('regionalConfig')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>
      <p className="text-[13px] text-gray-400">
        {t('localCurrencyConfirm', { currencyName, symbol: selectedCountry.symbol, example: exampleNum })}
      </p>
    </div>

    {/* Tipo de cambio */}
    <div className="card p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">{t('exchangeRate')}</h3>
        <p className="text-[13px] text-gray-400 mt-0.5">{t('exchangeRateDesc')}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('referenceCurrencyShort')}</label>
        <select className="input-base text-sm" value={(ws as Record<string, unknown>).moneda_referencia as string || 'USD'}
          onChange={e => setWs({ ...ws, moneda_referencia: e.target.value } as WorkshopSettings)}>
          <option value="USD">USD — Dólar estadounidense</option>
          <option value="EUR">EUR — Euro</option>
          <option value="BRL">BRL — Real brasileño</option>
        </select>
        <p className="text-[13px] text-gray-400 mt-1">{t('referenceCurrencyHint')}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('exchangeRateLabel')}</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">1 {(ws as Record<string, unknown>).moneda_referencia as string || 'USD'} =</span>
          <input type="number" className="input-base text-sm flex-1 max-w-[200px]" min={0.01} step={0.01}
            value={(ws as Record<string, unknown>).tipo_cambio as number || 1}
            onChange={e => setWs({ ...ws, tipo_cambio: Math.max(Number(e.target.value), 0) } as WorkshopSettings)} />
          <span className="text-sm text-gray-500">{fmtCurrency(1).replace(/[\d.,]/g, '').trim() || '$'}</span>
        </div>
        <p className="text-[13px] text-gray-400 mt-1">{t('exchangeRateHint')}</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('priceRounding')}</label>
        <select className="input-base text-sm" value={(ws as Record<string, unknown>).redondeo_precios as string || 'none'}
          onChange={e => setWs({ ...ws, redondeo_precios: e.target.value } as WorkshopSettings)}>
          <option value="none">{t('roundNone')}</option>
          <option value="integer">{t('roundInteger')}</option>
          <option value="tens">{t('roundTens')}</option>
          <option value="hundreds">{t('roundHundreds')}</option>
        </select>
        <p className="text-[13px] text-gray-400 mt-1">{t('priceRoundingHint')}</p>
      </div>
      {Number((ws as Record<string, unknown>).tipo_cambio) > 0 && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center gap-2">
          <span className="text-base">💡</span>
          <p className="text-sm text-blue-700 font-medium">
            1 {(ws as Record<string, unknown>).moneda_referencia as string || 'USD'} = {fmtCurrency(Number((ws as Record<string, unknown>).tipo_cambio))}
          </p>
        </div>
      )}
      <div className="border-t border-gray-100 pt-4">
        <button onClick={saveWs} disabled={saveState === 'saving'}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : ''}`}
          style={saveState !== 'saved' && saveState !== 'error' ? { background: '#0F766E' } : {}}>
          {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> {t('saving')}</> : saveState === 'saved' ? <><Check size={14} /> {t('saved')}</> : saveState === 'error' ? t('saveError') : <><Save size={14} /> {t('saveBtn')}</>}
        </button>
      </div>
    </div>
  </div>
)})()}

      {activeSection === 'condiciones' && (() => {
  const SUGERENCIAS = [
    'Se requiere seña del 50% para iniciar el trabajo.',
    'El tiempo de entrega se confirma al aprobar el presupuesto.',
    'Los precios pueden variar si cambian los costos de materiales.',
  ]
  const usedTexts = condicionesDefault.map(c => c.text.toLowerCase().trim())
  const availableSugg = SUGERENCIAS.filter(s => !usedTexts.includes(s.toLowerCase().trim()))
  return (
  <div className="max-w-2xl">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Condiciones</h2>
    <p className="text-sm text-gray-400 mb-4">Se incluyen automáticamente en cada presupuesto nuevo. Podés modificarlas en cada presupuesto individual.</p>

    {condicionesDefault.length === 0 ? (
      <div className="card p-6 text-center mb-4">
        <p className="text-sm text-gray-500 mb-3">Todavía no agregaste condiciones. Acá tenés algunos ejemplos comunes:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGERENCIAS.map(s => (
            <button key={s} onClick={() => setCondicionesDefault([...condicionesDefault, { text: s, activa: true }])}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 transition-colors text-left">{s}</button>
          ))}
        </div>
      </div>
    ) : (
      <div className="space-y-2 mb-4">
        {condicionesDefault.map((cond, i) => (
          <div key={i} className={`card p-3 flex items-start gap-3 transition-opacity ${!cond.activa ? 'opacity-50' : ''}`}>
            <span className="text-gray-300 mt-1 cursor-grab flex-shrink-0">⠿</span>
            <button type="button" onClick={() => { const arr = [...condicionesDefault]; arr[i] = { ...arr[i], activa: !arr[i].activa }; setCondicionesDefault(arr) }}
              className="relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 mt-0.5" style={{ background: cond.activa ? '#22C55E' : '#D1D5DB' }}>
              <span className="absolute top-[1px] left-[1px] w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: cond.activa ? 'translateX(14px)' : 'translateX(0)' }} />
            </button>
            <textarea className="flex-1 text-sm text-gray-700 bg-transparent resize-none outline-none focus:bg-gray-50 rounded p-1 -m-1 transition-colors" rows={1}
              style={{ minHeight: 24, maxHeight: 72 }} value={cond.text}
              onChange={e => { const arr = [...condicionesDefault]; arr[i] = { ...arr[i], text: e.target.value }; setCondicionesDefault(arr) }}
              onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 72) + 'px' }} />
            <button onClick={() => { if (!cond.text.trim() || confirm('¿Eliminar esta condición?')) setCondicionesDefault(condicionesDefault.filter((_, j) => j !== i)) }}
              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
          </div>
        ))}
        {availableSugg.length > 0 && condicionesDefault.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[11px] text-gray-400">Sugerencias:</span>
            {availableSugg.map(s => (
              <button key={s} onClick={() => setCondicionesDefault([...condicionesDefault, { text: s, activa: true }])}
                className="text-[11px] text-gray-400 hover:text-teal-700 hover:underline">{s.slice(0, 40)}...</button>
            ))}
          </div>
        )}
      </div>
    )}

    <button onClick={() => setCondicionesDefault([...condicionesDefault, { text: '', activa: true }])}
      className="flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 mb-6"><Plus size={14} /> Agregar condición</button>
    <button onClick={saveWs} disabled={saveState === 'saving'}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : ''}`}
      style={saveState !== 'saved' && saveState !== 'error' ? { background: '#0F766E' } : {}}>
      {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : saveState === 'saved' ? <><Check size={14} /> Guardado</> : saveState === 'error' ? 'Error' : <><Save size={14} /> Guardar</>}
    </button>
  </div>
)})()}

      {activeSection === 'medios-pago' && (() => {
  const ajusteLabel = (m: { tipo_ajuste: string; porcentaje: number }) =>
    m.tipo_ajuste === 'sin_ajuste' || m.tipo_ajuste === 'ninguno' || m.porcentaje === 0 ? 'Sin ajuste' : m.porcentaje > 0 ? `Recargo +${m.porcentaje}%` : `Descuento ${Math.abs(m.porcentaje)}%`
  const toggleActivo = async (m: { id: string; activo: boolean; nombre: string }) => {
    await supabase.from('medios_pago').update({ activo: !m.activo }).eq('id', m.id)
    setMediosPago(prev => prev.map(x => x.id === m.id ? { ...x, activo: !x.activo } : x))
    setMpToast(!m.activo ? `${m.nombre} activado` : `${m.nombre} desactivado`)
    setTimeout(() => setMpToast(''), 2000)
  }
  return (
  <div>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div><h2 className="text-xl font-bold text-gray-900 mb-1">Medios de pago</h2>
        <p className="text-sm text-gray-400">Configurá cómo pagan tus clientes.</p></div>
      <button onClick={() => setEditingMedio({ nombre: '', tipo_ajuste: 'sin_ajuste', porcentaje: 0 })}
        className="flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#0F766E' }}><Plus size={14} /> Agregar</button>
    </div>
    {/* Mobile cards */}
    <div className="md:hidden space-y-2">
      {mediosPago.map(m => (
        <div key={m.id} className="card p-4 flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800">{m.nombre}</p>
            <p className={`text-xs ${m.tipo_ajuste === 'sin_ajuste' || m.porcentaje === 0 ? 'text-gray-400' : m.porcentaje > 0 ? 'text-amber-600' : 'text-green-600'}`}>{ajusteLabel(m)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => toggleActivo(m)} className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0" style={{ background: m.activo ? '#22C55E' : '#D1D5DB' }}>
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: m.activo ? 'translateX(16px)' : 'translateX(0)' }} />
            </button>
            <button onClick={() => setEditingMedio({ nombre: m.nombre, tipo_ajuste: m.tipo_ajuste, porcentaje: m.porcentaje, id: m.id })} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
            <button onClick={async () => { if (confirm('¿Eliminar medio de pago?')) { await supabase.from('medios_pago').delete().eq('id', m.id); setMediosPago(prev => prev.filter(x => x.id !== m.id)) } }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-gray-300 hover:text-red-500" /></button>
          </div>
        </div>
      ))}
      {mediosPago.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Todavía no configuraste medios de pago.</div>}
    </div>
    {/* Desktop table */}
    <div className="hidden md:block card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full"><thead><tr className="border-b border-gray-100">
          {['Nombre', 'Ajuste', '%', 'Estado', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
        </tr></thead><tbody>
          {mediosPago.map(m => (
            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{m.nombre}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{m.tipo_ajuste === 'sin_ajuste' || m.tipo_ajuste === 'ninguno' ? 'Sin ajuste' : m.tipo_ajuste === 'recargo' ? 'Recargo' : 'Descuento'}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{m.porcentaje !== 0 ? `${m.porcentaje}%` : '—'}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => toggleActivo(m)} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: m.activo ? '#22C55E' : '#D1D5DB' }}>
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: m.activo ? 'translateX(16px)' : 'translateX(0)' }} />
                </button>
              </td>
              <td className="px-4 py-3"><div className="flex gap-1">
                <button onClick={() => setEditingMedio({ nombre: m.nombre, tipo_ajuste: m.tipo_ajuste, porcentaje: m.porcentaje, id: m.id })} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                <button onClick={async () => { if (confirm('¿Eliminar medio de pago?')) { await supabase.from('medios_pago').delete().eq('id', m.id); setMediosPago(prev => prev.filter(x => x.id !== m.id)) } }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
        {mediosPago.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">Todavía no configuraste medios de pago.</div>}
      </div>
    </div>
    {mpToast && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium shadow-lg">
        {mpToast}
      </div>
    )}
  </div>
)})()}

      {activeSection === 'descuentos' && (() => {
        const DISC_TECNICAS = [
          { key: 'descuentos_subli', label: 'Sublimación', color: '#0F766E' },
          { key: 'descuentos_dtf', label: 'DTF Textil', color: '#E17055' },
          { key: 'descuentos_dtf_uv', label: 'DTF UV', color: '#00B894' },
          { key: 'descuentos_vinyl', label: 'Vinilo (Textil + Autoadhesivo)', color: '#E84393' },
          { key: 'descuentos_serigrafia', label: 'Serigrafía', color: '#FDCB6E' },
        ]
        type DiscKey = string
        const getTiers = (k: DiscKey) => (ws as unknown as Record<string, unknown>)[k] as import('@/features/presupuesto/types').DiscountTier[] || []
        const setTiers = (k: DiscKey, tiers: import('@/features/presupuesto/types').DiscountTier[]) => setWs({ ...ws, [k]: tiers } as WorkshopSettings)
        const addTier = (k: DiscKey) => setTiers(k, [...getTiers(k), { desde: (getTiers(k).at(-1)?.hasta || 0) + 1, hasta: 9999, porcentaje: 0 }])
        const updateHasta = (k: DiscKey, i: number, v: number) => {
          const t = getTiers(k)
          setTiers(k, t.map((tier, j) => {
            if (j === i) return { ...tier, hasta: Math.max(v, tier.desde) }
            if (j === i + 1) return { ...tier, desde: v + 1 }
            return tier
          }))
        }
        const updateDesde = (k: DiscKey, i: number, v: number) => setTiers(k, getTiers(k).map((t, j) => j === i ? { ...t, desde: v } : t))
        const updatePct = (k: DiscKey, i: number, v: number) => setTiers(k, getTiers(k).map((t, j) => j === i ? { ...t, porcentaje: Math.min(1, Math.max(0, v)) } : t))
        const removeTier = (k: DiscKey, i: number) => {
          const remaining = getTiers(k).filter((_, j) => j !== i)
          setTiers(k, remaining.map((t, j) => j > 0 ? { ...t, desde: remaining[j - 1].hasta + 1 } : t))
        }

        const TierTable = ({ discKey }: { discKey: DiscKey }) => {
          const tiers = getTiers(discKey)
          if (tiers.length === 0) return (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-2">Sin descuentos configurados.</p>
              <button onClick={() => addTier(discKey)} className="text-sm font-semibold text-teal-700"><Plus size={12} className="inline mr-1" />Agregar primer tramo</button>
            </div>
          )
          return (<div>
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-[10px] text-gray-400 font-semibold uppercase">Desde</th>
              <th className="text-left py-2 px-2 text-[10px] text-gray-400 font-semibold uppercase">Hasta</th>
              <th className="text-left py-2 px-2 text-[10px] text-gray-400 font-semibold uppercase">%</th>
              <th className="w-8" />
            </tr></thead><tbody>
              {tiers.map((t, i) => (<tr key={i} className="border-b border-gray-50">
                <td className="py-1.5 px-2"><input type="number" className={`input-base text-sm w-16 min-w-[45px] ${i > 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`} min={1} value={t.desde} readOnly={i > 0} onChange={e => updateDesde(discKey, i, Number(e.target.value))} /></td>
                <td className="py-1.5 px-2"><input type="number" className="input-base text-sm w-16 min-w-[45px]" min={t.desde} value={t.hasta} onChange={e => updateHasta(discKey, i, Number(e.target.value))} /></td>
                <td className="py-1.5 px-2"><input type="number" className="input-base text-sm w-14 min-w-[50px]" min={0} max={100} value={Math.round(t.porcentaje * 100)} onChange={e => updatePct(discKey, i, Number(e.target.value) / 100)} /></td>
                <td className="py-1.5"><button onClick={() => removeTier(discKey, i)} className="p-1 rounded hover:bg-red-50"><Trash2 size={12} className="text-gray-300 hover:text-red-500" /></button></td>
              </tr>))}
            </tbody></table>
            <button onClick={() => addTier(discKey)} className="flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 mt-2"><Plus size={12} /> Agregar tramo</button>
          </div>)
        }

        return (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Descuentos</h2>
            <p className="text-sm text-gray-400 mb-4">Configurá descuentos por volumen para tus clientes.</p>

            {/* Switch */}
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Aplicar descuento global</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ws.descuento_global_enabled ? 'El mismo descuento se aplica a todas las técnicas.' : 'Cada técnica tiene sus propios descuentos.'}</p>
                </div>
                <button type="button" onClick={() => setWs({ ...ws, descuento_global_enabled: !ws.descuento_global_enabled } as WorkshopSettings)}
                  className="relative w-11 h-6 rounded-full transition-colors" style={{ background: ws.descuento_global_enabled ? '#0F766E' : '#D1D5DB' }}>
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: ws.descuento_global_enabled ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
              </div>
            </div>

            {/* Global table */}
            {ws.descuento_global_enabled && (
              <div className="card p-5 mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Descuentos globales</p>
                <TierTable discKey="descuentos_global" />
              </div>
            )}

            {/* Per-technique accordions */}
            {!ws.descuento_global_enabled && (
              <div className="space-y-2 mb-6">
                {DISC_TECNICAS.map((dt) => {
                  const isOpen = openDiscTecs.includes(dt.key)
                  return (
                    <div key={dt.key} className="card overflow-hidden">
                      <button type="button" onClick={() => setOpenDiscTecs(isOpen ? openDiscTecs.filter(k => k !== dt.key) : [...openDiscTecs, dt.key])}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: dt.color }}>{dt.label[0]}</div>
                          <span className="text-sm font-medium text-gray-800">{dt.label}</span>
                          <span className="text-xs text-gray-400">{getTiers(dt.key).length} tramos</span>
                        </div>
                        <span className="text-gray-400 text-xs">{isOpen ? '▼' : '▶'}</span>
                      </button>
                      {isOpen && <div className="px-4 pb-4 border-t border-gray-100 pt-3"><TierTable discKey={dt.key} /></div>}
                    </div>
                  )
                })}
              </div>
            )}

            <button onClick={saveWs} disabled={saveState === 'saving'}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : ''}`}
              style={saveState !== 'saved' && saveState !== 'error' ? { background: '#0F766E' } : {}}>
              {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : saveState === 'saved' ? '✓ Guardado' : saveState === 'error' ? 'Error' : <><Save size={14} /> Guardar</>}
            </button>
          </div>
        )
      })()}

      {activeSection === 'usuarios' && (() => {
        const ALL_SECTIONS = ['inicio', 'cotizador', 'presupuestos', 'pedidos', 'clientes', 'catalogo', 'promociones', 'estadisticas', 'configuracion']
        const SECTION_LABELS: Record<string, string> = { inicio: 'Inicio', cotizador: 'Cotizador', presupuestos: 'Presupuestos', pedidos: 'Pedidos', clientes: 'Clientes', catalogo: 'Catálogo', promociones: 'Promociones', estadisticas: 'Estadísticas', configuracion: 'Configuración' }
        const VIS_LABELS: Record<string, string> = { completa: 'Completa', solo_precios: 'Solo precios', solo_produccion: 'Solo producción' }
        const editMember = async (m: typeof teamMembers[0]) => {
          const { data } = await supabase.from('team_members').select('permisos').eq('id', m.id).single()
          const p = (data?.permisos || {}) as Record<string, unknown>
          setInviteModal({ id: m.id, nombre: m.nombre, email: m.email, password: '', nivel: (p.nivel_visibilidad as string) || 'solo_precios', secciones: (p.secciones as Record<string, boolean>) || {} })
        }
        const deleteMember = async (m: typeof teamMembers[0]) => {
          if (!confirm(`¿Eliminar a ${m.nombre}? Perderá acceso al taller.`)) return
          await supabase.from('team_members').delete().eq('id', m.id)
          setTeamMembers(prev => prev.filter(x => x.id !== m.id))
        }
        const getMemberVis = (m: typeof teamMembers[0]) => {
          // We'd need permisos loaded — for now show from cache if available
          return 'Solo precios'
        }
        const getMemberSections = (permisos?: Record<string, boolean>) => {
          if (!permisos) return '—'
          const active = ALL_SECTIONS.filter(s => permisos[s])
          if (active.length === 0) return '—'
          if (active.length === ALL_SECTIONS.length) return 'Todas'
          const shown = active.slice(0, 3).map(s => SECTION_LABELS[s] || s)
          return active.length > 3 ? `${shown.join(', ')} +${active.length - 3}` : shown.join(', ')
        }
        return (<>
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div><h2 className="text-xl font-bold text-gray-900 mb-1">{t('usersPermissions')}</h2>
            <p className="text-sm text-gray-400">{t('usersSubtitle')}</p></div>
          <button onClick={() => setInviteModal({ nombre: '', email: '', password: '', nivel: 'solo_precios', secciones: {} })}
            className="flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#0F766E' }}><Plus size={14} /> Invitar</button>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div><p className="font-semibold text-gray-800">{ownerName || 'Dueño'}</p></div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">👑 Dueño</span>
            </div>
            <div className="mt-1.5 text-xs text-gray-400 space-y-0.5">
              <p>Visibilidad: <span className="text-gray-600">Completa</span></p>
              <p>Secciones: <span className="text-gray-600">Todas</span></p>
            </div>
          </div>
          {teamMembers.map(m => (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div><p className="font-semibold text-gray-800">{m.nombre}</p><p className="text-xs text-gray-400">{m.email}</p></div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.estado === 'activo' ? 'Activo' : 'Pendiente'}</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <button onClick={() => editMember(m)} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
                <button onClick={() => deleteMember(m)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block card overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-gray-100">
            {['Usuario', 'Rol', 'Visibilidad', 'Secciones', 'Estado', ''].map(h => <th key={h} className={`text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 ${h === 'Secciones' ? 'hidden lg:table-cell' : ''}`}>{h}</th>)}
          </tr></thead><tbody>
            <tr className="border-b border-gray-50 bg-teal-50/30">
              <td className="px-4 py-3"><span className="font-medium text-gray-800">{ownerName || 'Dueño'}</span></td>
              <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800">👑 Dueño</span></td>
              <td className="px-4 py-3 text-sm text-gray-500">Completa</td>
              <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">Todas</td>
              <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Activo</span></td>
              <td className="px-4 py-3"></td>
            </tr>
            {teamMembers.map(m => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3"><p className="font-medium text-gray-800">{m.nombre}</p><p className="text-xs text-gray-400">{m.email}</p></td>
                <td className="px-4 py-3 text-sm text-gray-500">Colaborador</td>
                <td className="px-4 py-3 text-sm text-gray-500">{VIS_LABELS[(m as unknown as Record<string, unknown>).nivel as string] || 'Solo precios'}</td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">—</td>
                <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.estado === 'activo' ? 'Activo' : 'Pendiente'}</span></td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => editMember(m)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                  <button onClick={() => deleteMember(m)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                </div></td>
              </tr>
            ))}
          </tbody></table>
          {teamMembers.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No hay colaboradores. Invitá al primero.</div>}
        </div>
      </div>
      </>)
      })()}

      {activeSection === 'productos' && (
        <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>}>
          <MaterialesPage forceTab="base" hideChrome />
        </Suspense>
      )}

      {(activeSection === 'insumos' || activeSection === 'materiales') && (
        <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>}>
          <MaterialesPage forceTab="insumos" hideChrome />
        </Suspense>
      )}

      {activeSection === 'equipamiento' && (
        <div>
          <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>}>
            <EquipamientoPage />
          </Suspense>
        </div>
      )}

      {activeSection === 'mano-obra' && (() => {
  const mo = ws.mano_de_obra
  const costPerHour = mo.horas_mensuales > 0 ? Math.round(mo.sueldo_mensual / mo.horas_mensuales) : 0
  const setMo = (patch: Record<string, unknown>) => setWs({ ...ws, mano_de_obra: { ...mo, ...patch } } as WorkshopSettings)
  return (
  <div className="max-w-2xl">
    <h2 className="text-xl font-bold text-gray-900 mb-1">Mano de obra</h2>
    <p className="text-sm text-gray-400 mb-1">Configurá los costos de tus operarios.</p>
    <p className="text-xs text-gray-400 mb-4">Este costo se suma automáticamente a cada cotización.</p>
    <div className="card p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Modo de cálculo</label>
        <select className="input-base" value={mo.modo || 'por_unidad'}
          onChange={e => setMo({ modo: e.target.value })}>
          <option value="ninguno">No incluir</option>
          <option value="por_unidad">Fijo por trabajo</option>
          <option value="sueldo_fijo">Sueldo fijo</option>
          <option value="porcentaje">Porcentaje</option>
        </select>
      </div>

      {mo.modo === 'ninguno' && (
        <p className="text-sm text-gray-400">El costo de mano de obra no se incluirá en las cotizaciones. Podés activarlo en cualquier momento.</p>
      )}

      {mo.modo === 'por_unidad' && (<>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Costo por unidad producida ($)</label>
          <input type="number" className="input-base" min={0} value={mo.monto_por_unidad || ''} onChange={e => setMo({ monto_por_unidad: Number(e.target.value) })} />
          <p className="text-[11px] text-gray-400 mt-1">Se suma por cada unidad en la cotización.</p>
        </div>
        {mo.monto_por_unidad > 0 && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex items-start gap-2">
            <span className="text-base">💡</span>
            <div>
              <p className="text-sm font-bold text-green-700">{fmtCurrency(mo.monto_por_unidad)} por unidad producida</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Ejemplo: un pedido de 10 unidades sumará {fmtCurrency(mo.monto_por_unidad * 10)} de mano de obra.</p>
            </div>
          </div>
        )}
      </>)}

      {mo.modo === 'sueldo_fijo' && (<>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Costo total mano de obra mensual ($)</label>
          <input type="number" className="input-base" min={0} value={mo.sueldo_mensual || ''} onChange={e => setMo({ sueldo_mensual: Number(e.target.value) })} />
          <p className="text-[11px] text-gray-400 mt-1">Si tenés varios empleados, sumá todos los sueldos.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horas productivas mensuales</label>
          <input type="number" className="input-base" min={1} value={mo.horas_mensuales || ''} onChange={e => setMo({ horas_mensuales: Number(e.target.value) })} />
          <p className="text-[11px] text-gray-400 mt-1">Horas que realmente se producen por mes. 160 = 8 horas/día × 20 días.</p>
        </div>
        {costPerHour > 0 && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex items-start gap-2">
            <span className="text-base">💡</span>
            <div>
              <p className="text-sm font-bold text-green-700">{fmtCurrency(costPerHour)} por hora de trabajo</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Se calcula como sueldo mensual ÷ horas productivas. En cada cotización se suma según el tiempo de producción.</p>
            </div>
          </div>
        )}
      </>)}

      {mo.modo === 'porcentaje' && (() => {
        // Normalize legacy values to current options
        const effectiveBase = (mo.comision_base === 'venta' || mo.comision_base === 'ganancia') ? 'costo' : (mo.comision_base || 'costo')
        return (<>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje (%)</label>
            <input type="number" className="input-base" min={0} max={100} value={mo.porcentaje_comision || ''} onChange={e => setMo({ porcentaje_comision: Number(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calcular sobre</label>
            <select className="input-base" value={effectiveBase} onChange={e => setMo({ comision_base: e.target.value })}>
              <option value="costo">Costo de producción</option>
              <option value="ganancia_bruta">Ganancia bruta</option>
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              {effectiveBase === 'ganancia_bruta'
                ? 'El operario gana un porcentaje de lo que queda después de cubrir los costos.'
                : 'El operario gana en proporción al esfuerzo del trabajo.'}
            </p>
          </div>
          {mo.porcentaje_comision > 0 && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 flex items-start gap-2">
              <span className="text-base">💡</span>
              <div>
                <p className="text-sm font-bold text-green-700">{mo.porcentaje_comision}% sobre {effectiveBase === 'ganancia_bruta' ? 'la ganancia bruta' : 'el costo de producción'}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {effectiveBase === 'ganancia_bruta'
                    ? `Ejemplo: si vendés a ${fmtCurrency(10000)} y el costo es ${fmtCurrency(6000)}, la ganancia bruta es ${fmtCurrency(4000)}. Se suman ${fmtCurrency(4000 * mo.porcentaje_comision / 100)} de mano de obra.`
                    : `Ejemplo: si el costo de producción es ${fmtCurrency(6000)}, se suman ${fmtCurrency(6000 * mo.porcentaje_comision / 100)} de mano de obra.`}
                </p>
              </div>
            </div>
          )}
        </>)
      })()}

      <div className="border-t border-gray-100 pt-4">
        <button onClick={saveWs} disabled={saveState === 'saving'}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : ''}`}
          style={saveState !== 'saved' && saveState !== 'error' ? { background: '#0F766E' } : {}}>
          {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : saveState === 'saved' ? <><Check size={14} /> Guardado</> : saveState === 'error' ? 'Error' : <><Save size={14} /> Guardar</>}
        </button>
      </div>
    </div>
  </div>
)})()}

      {activeSection === 'tecnicas' && (
        <div>
          <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" /></div>}>
            <TecnicasPage />
          </Suspense>
        </div>
      )}

      {activeSection === 'proveedores' && (() => {
        const filteredSuppliers = searchSupplier ? suppliers.filter(s => s.name.toLowerCase().includes(searchSupplier.toLowerCase())) : suppliers
        const newSup = () => setEditingSupplier({ name: '', whatsapp: '', email: '', website: '', location: '', notes: '' })
        return (
        <div>
          {/* Desktop header */}
          <div className="hidden md:flex items-start justify-between gap-3 mb-4">
            <div><h2 className="text-xl font-bold text-gray-900 mb-1">Proveedores</h2>
              <p className="text-sm text-gray-400">Gestioná tus proveedores de materiales.</p></div>
            <button onClick={newSup}
              className="flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#0F766E' }}><Plus size={14} /> Agregar</button>
          </div>
          {/* Desktop search */}
          <div className="hidden md:block relative mb-4 max-w-[400px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input className="input-base text-sm w-full" style={{ paddingLeft: 40 }} placeholder="Buscar proveedor..." value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} />
          </div>
          {/* Mobile header + compact row */}
          <div className="md:hidden mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Proveedores</h2>
            <p className="text-sm text-gray-400 mb-3">Gestioná tus proveedores de materiales.</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input className="input-base text-sm w-full" style={{ paddingLeft: 40 }} placeholder="Buscar..." value={searchSupplier} onChange={e => setSearchSupplier(e.target.value)} />
              </div>
              <button onClick={newSup} className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: '#0F766E' }}><Plus size={18} /></button>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredSuppliers.map(s => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{s.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                      {s.whatsapp && <span>📱 {s.whatsapp}</span>}
                      {s.email && <span>✉ {s.email}</span>}
                      {s.website && <span>🌐 {s.website}</span>}
                      {s.location && <span>📍 {s.location}</span>}
                    </div>
                    {s.notes && <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingSupplier({ id: s.id, name: s.name, whatsapp: s.whatsapp || '', email: s.email || '', website: s.website || '', location: s.location || '', notes: s.notes || '' })} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
                    <button onClick={async () => { if (confirm('¿Eliminar proveedor?')) { await supabase.from('suppliers').delete().eq('id', s.id); setSuppliers(prev => prev.filter(x => x.id !== s.id)) } }} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-gray-300 hover:text-red-500" /></button>
                  </div>
                </div>
              </div>
            ))}
            {filteredSuppliers.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">{suppliers.length === 0 ? 'No hay proveedores cargados.' : 'No hay proveedores que coincidan.'}</div>}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]"><thead><tr className="border-b border-gray-100">
                {['Nombre', 'WhatsApp', 'Email', 'Web', 'Ubicación', ''].map(h => <th key={h} className={`text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 ${h === 'Email' || h === 'Ubicación' ? 'hidden lg:table-cell' : ''}`}>{h}</th>)}
              </tr></thead><tbody>
                {filteredSuppliers.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{s.name}</span>
                      {s.notes && <p className="text-[10px] text-gray-400 italic mt-0.5 truncate max-w-[200px]">{s.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.whatsapp || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{s.email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.website ? <span className="truncate max-w-[120px] block">{s.website}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{s.location || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><div className="flex gap-1">
                      <button onClick={() => setEditingSupplier({ id: s.id, name: s.name, whatsapp: s.whatsapp || '', email: s.email || '', website: s.website || '', location: s.location || '', notes: s.notes || '' })} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={async () => { if (confirm('¿Eliminar proveedor?')) { await supabase.from('suppliers').delete().eq('id', s.id); setSuppliers(prev => prev.filter(x => x.id !== s.id)) } }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-400" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody></table>
              {filteredSuppliers.length === 0 && <div className="text-center py-12 text-gray-400 text-sm">{suppliers.length === 0 ? 'No hay proveedores cargados.' : 'No hay proveedores que coincidan.'}</div>}
            </div>
          </div>
        </div>
      )})()}

      {activeSection === 'guia-talles' && (() => {
        const openGuia = (g: typeof guiasTalles[0]) => setEditingGuia({ id: g.id, nombre: g.nombre, columnas: g.columnas, filas: g.filas, imagen_referencia: (g as Record<string, unknown>).imagen_referencia as string || null })
        const duplicateGuia = (g: typeof guiasTalles[0]) => setEditingGuia({ nombre: `${g.nombre} (copia)`, columnas: [...g.columnas], filas: g.filas.map(f => ({ ...f })), imagen_referencia: (g as Record<string, unknown>).imagen_referencia as string || null })
        const deleteGuia = async (g: typeof guiasTalles[0]) => {
          if (!confirm('¿Eliminar esta guía de talles?')) return
          await supabase.from('guias_talles').delete().eq('id', g.id); setGuiasTalles(prev => prev.filter(x => x.id !== g.id))
        }
        const newGuia = () => setEditingGuia({ nombre: '', columnas: ['Ancho', 'Largo'], filas: [{ talle: 'S', Ancho: '', Largo: '' }, { talle: 'M', Ancho: '', Largo: '' }, { talle: 'L', Ancho: '', Largo: '' }] })
        return (
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div><h2 className="text-xl font-bold text-gray-900 mb-1">Guía de talles</h2>
              <p className="text-sm text-gray-400">Tablas de medidas para tus clientes.</p></div>
            <button onClick={newGuia} className="flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg font-semibold text-white" style={{ background: '#0F766E' }}><Plus size={14} /> Nueva tabla</button>
          </div>

          {guiasTalles.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-4xl mb-3 opacity-50">📏</p><p className="text-gray-500 text-sm">Todavía no creaste guías de talles.</p><p className="text-gray-400 text-xs mt-1">Creá la primera para que tus clientes elijan el talle correcto.</p></div>
          ) : (<>
            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {guiasTalles.map(g => (
                <div key={g.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div><p className="font-semibold text-gray-800">{g.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{g.filas.map(f => f.talle).filter(Boolean).join(', ')}</p>
                      <p className="text-xs text-gray-400">{g.columnas.join(', ')}</p></div>
                    <div className="flex gap-1">
                      <button onClick={() => openGuia(g)} className="p-1.5 rounded hover:bg-gray-100"><Pencil size={13} className="text-gray-400" /></button>
                      <button onClick={() => deleteGuia(g)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block card" style={{ overflow: 'visible' }}>
              <table className="w-full"><thead><tr className="border-b border-gray-100">
                {['Nombre', 'Talles', 'Medidas', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>)}
              </tr></thead><tbody>
                {guiasTalles.map(g => (
                  <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{g.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{g.filas.map(f => f.talle).filter(Boolean).join(', ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{g.columnas.join(', ')}</td>
                    <td className="px-4 py-3"><div className="flex gap-1 relative">
                      <button onClick={() => openGuia(g)} className="p-1.5 rounded-lg hover:bg-gray-100"><Pencil size={14} className="text-gray-400" /></button>
                      <button onClick={e => { e.stopPropagation(); setGuiaMenu(guiaMenu === g.id ? null : g.id) }} className="p-1.5 rounded-lg hover:bg-gray-100"><MoreHorizontal size={14} className="text-gray-400" /></button>
                      {guiaMenu === g.id && (<>
                        <div className="fixed inset-0 z-40" onClick={() => setGuiaMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 z-50 py-1">
                          <button onClick={() => { duplicateGuia(g); setGuiaMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">Duplicar</button>
                          <button onClick={() => { deleteGuia(g); setGuiaMenu(null) }} className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">Eliminar</button>
                        </div>
                      </>)}
                    </div></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </>)}
        </div>
      )})()}

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
                  <div className="flex gap-2">
                    <input className="input-base flex-1" type="text" value={inviteModal.password} onChange={e => setInviteModal({ ...inviteModal, password: e.target.value })} />
                    <button type="button" onClick={() => { const words = ['taller', 'estampa', 'color', 'diseño', 'prensa', 'plotter']; setInviteModal({ ...inviteModal, password: `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 9000)}` }) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap">Generar</button>
                    {inviteModal.password && <button type="button" onClick={() => { navigator.clipboard.writeText(inviteModal.password) }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"><Copy size={12} /></button>}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Compartí esta contraseña con tu colaborador. Podrá cambiarla después desde Mi cuenta.</p></div>
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
                    <label key={v} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${inviteModal.nivel === v ? 'bg-teal-50 border border-teal-200' : 'border border-gray-100 hover:bg-gray-50'}`}>
                      <input type="radio" name="nivel" checked={inviteModal.nivel === v} onChange={() => setInviteModal({ ...inviteModal, nivel: v })} className="mt-0.5 text-teal-700" />
                      <div><p className="text-sm font-medium text-gray-800">{l}</p><p className="text-xs text-gray-400">{d}</p></div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sections */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{tp('sections')}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[['inicio', 'Inicio'], ['cotizador', 'Cotizador'], ['presupuestos', 'Presupuestos'], ['pedidos', 'Pedidos'], ['clientes', 'Clientes'], ['catalogo', 'Catálogo'], ['promociones', 'Promociones'], ['estadisticas', 'Estadísticas'], ['configuracion', 'Configuración']].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer py-1">
                      <input type="checkbox" checked={!!inviteModal.secciones[k]} onChange={() => toggleSection(k)} className="rounded border-gray-300 text-teal-700" />
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
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>{inviting ? (isEdit ? 'Guardando...' : 'Invitando...') : (isEdit ? tp('save') : tp('invite'))}</button>
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

              {/* Image upload - styled dropzone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de referencia <span className="font-normal text-gray-400">(opcional)</span></label>
                {editingGuia.imagen_referencia ? (
                  <div className="relative rounded-xl overflow-hidden mb-2 border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editingGuia.imagen_referencia} alt="" className="w-full max-h-48 object-contain bg-gray-50" />
                    <button onClick={() => setEditingGuia({ ...editingGuia, imagen_referencia: null })} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"><X size={12} /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-teal-300 transition-colors">
                    <Upload size={24} className="text-gray-300 mb-2" />
                    <span className="text-sm text-gray-500">Arrastrá o hacé clic para subir</span>
                    <span className="text-xs text-gray-400 mt-1">Diagrama de la prenda con medidas señaladas</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async e => {
                      const file = e.target.files?.[0]; if (!file) return
                      const { data: { user } } = await supabase.auth.getUser()
                      const path = `${user?.id}/guia-${Date.now()}.${file.name.split('.').pop()}`
                      await supabase.storage.from('product-photos').upload(path, file)
                      const { data: { publicUrl } } = supabase.storage.from('product-photos').getPublicUrl(path)
                      setEditingGuia(prev => prev ? { ...prev, imagen_referencia: publicUrl } : prev)
                    }} />
                  </label>
                )}
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
                  <button onClick={() => setEditingGuia({ ...editingGuia, columnas: [...editingGuia.columnas, 'Medida'] })} className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-700 font-semibold">+</button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Talles y valores</label>
                  <span className="text-[10px] text-gray-400">Valores en cm</span>
                </div>
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
                  className="text-xs font-semibold text-teal-700 mt-2">+ Agregar fila</button>
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
              }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>Guardar</button>
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
                <input className="input-base" value={editingMedio.nombre} onChange={e => setEditingMedio({ ...editingMedio, nombre: e.target.value })} placeholder="Ej: Transferencia, MercadoPago, PIX, Efectivo" />
                {editingMedio.nombre.trim() && mediosPago.some(m => m.nombre.toLowerCase().trim() === editingMedio.nombre.toLowerCase().trim() && m.id !== editingMedio.id) && (
                  <p className="text-xs text-red-500 mt-1">Ya existe un medio de pago con ese nombre.</p>
                )}</div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ajuste de precio</label>
                <div className="flex gap-2">
                  {[['sin_ajuste', 'Sin ajuste'], ['descuento', 'Descuento'], ['recargo', 'Recargo']].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setEditingMedio({ ...editingMedio, tipo_ajuste: v })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${editingMedio.tipo_ajuste === v ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-500'}`}>{l}</button>
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
              <button disabled={!editingMedio.nombre.trim() || mediosPago.some(m => m.nombre.toLowerCase().trim() === editingMedio.nombre.toLowerCase().trim() && m.id !== editingMedio.id)} onClick={async () => {
                const payload = { nombre: editingMedio.nombre, tipo_ajuste: editingMedio.tipo_ajuste, porcentaje: editingMedio.tipo_ajuste === 'sin_ajuste' ? 0 : editingMedio.porcentaje, activo: true, orden: mediosPago.length }
                if (editingMedio.id) {
                  await supabase.from('medios_pago').update(payload).eq('id', editingMedio.id)
                  setMediosPago(prev => prev.map(m => m.id === editingMedio.id ? { ...m, ...payload } : m))
                } else {
                  const { data } = await supabase.from('medios_pago').insert(payload).select('*').single()
                  if (data) setMediosPago(prev => [...prev, data])
                }
                setEditingMedio(null)
              }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setEditingSupplier(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">{editingSupplier.id ? 'Editar' : 'Nuevo'} proveedor</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input-base" value={editingSupplier.name} onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })} placeholder="Ej: TextilNorte" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input className="input-base" value={editingSupplier.whatsapp} onChange={e => setEditingSupplier({ ...editingSupplier, whatsapp: e.target.value })} placeholder="+54 11 1234-5678" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-base" value={editingSupplier.email} onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })} placeholder="proveedor@ejemplo.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Sitio web</label>
                <input className="input-base" value={editingSupplier.website} onChange={e => setEditingSupplier({ ...editingSupplier, website: e.target.value })} placeholder="Ej: www.proveedor.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                <input className="input-base" value={editingSupplier.location} onChange={e => setEditingSupplier({ ...editingSupplier, location: e.target.value })} placeholder="Ej: Córdoba Capital, Argentina" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea className="input-base resize-none" rows={2} value={editingSupplier.notes} onChange={e => setEditingSupplier({ ...editingSupplier, notes: e.target.value })} placeholder="Ej: Proveedor de tintas para sublimación" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingSupplier(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200">Cancelar</button>
              <button disabled={!editingSupplier.name.trim()} onClick={async () => {
                const payload = { name: editingSupplier.name.trim(), whatsapp: editingSupplier.whatsapp || null, email: editingSupplier.email || null, website: editingSupplier.website || null, location: editingSupplier.location || null, notes: editingSupplier.notes || null }
                if (editingSupplier.id) {
                  await supabase.from('suppliers').update(payload).eq('id', editingSupplier.id)
                } else {
                  await supabase.from('suppliers').insert(payload)
                }
                setEditingSupplier(null)
                const { data: sup } = await supabase.from('suppliers').select('*').order('name')
                if (sup) setSuppliers(sup)
              }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: '#0F766E' }}>
                {editingSupplier.id ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && !!(ws as Record<string, unknown>).catalog_slug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[90dvh] overflow-y-auto text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">QR de tu catálogo</h3>
            <QRCodeCanvas id="catalog-qr" value={`https://estamply.app/catalogo/${(ws as Record<string, unknown>).catalog_slug}`} size={300} level="M" />
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
              }} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#0F766E' }}>Descargar PNG</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
