'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, User, Upload, Loader2, X, Plus, Trash2, QrCode } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { DEFAULT_SETTINGS, type WorkshopSettings, type DiscountTier, type ManoDeObraModo, type ComisionBase, DEFAULT_MO_CONFIG } from '@/features/presupuesto/types'

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

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

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<BusinessProfile>(EMPTY)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [ws, setWs] = useState<WorkshopSettings>(DEFAULT_SETTINGS)
  const logoInputRef = useRef<HTMLInputElement>(null)

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
      // Load workshop settings for discount toggle
      const { data: wsData } = await supabase.from('workshop_settings').select('settings').single()
      if (wsData?.settings) setWs({ ...DEFAULT_SETTINGS, ...(wsData.settings as Partial<WorkshopSettings>) })
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveWs() {
    const { data: existing } = await supabase.from('workshop_settings').select('id').single()
    if (existing) await supabase.from('workshop_settings').update({ settings: ws }).eq('id', existing.id)
    else await supabase.from('workshop_settings').insert({ settings: ws })
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
    await supabase.from('profiles').update(profile).eq('id', userId)
    setSaving(false)
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
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Datos de tu negocio. Aparecen en todos tus presupuestos.</p>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <User size={17} className="text-gray-400" />
          <span className="font-semibold text-gray-800">Perfil del Negocio</span>
        </div>

        {/* Logo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo del negocio</label>
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
                {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ['business_name', 'Nombre del negocio', 'Ej: Estamply Taller'],
            ['business_cuit', 'CUIT / DNI', '20-12345678-9'],
            ['business_address', 'Dirección', 'Calle 123, Ciudad'],
            ['business_phone', 'Teléfono / WhatsApp', '+54 11 1234-5678'],
            ['business_email', 'Email de contacto', 'taller@ejemplo.com'],
            ['business_instagram', 'Instagram', '@taller'],
            ['business_website', 'Sitio web', 'www.taller.com.ar'],
          ] as const).map(([key, label, placeholder]) => (
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
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </button>
      </div>

      {/* Catálogo web */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">Catálogo web</h3>
        <p className="text-xs text-gray-400 mb-4">Tu catálogo público para compartir con clientes.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug del catálogo *</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">estamply.app/catalogo/</span>
              <input className="input-base flex-1" value={(ws as Record<string, unknown>).catalog_slug as string || ''} placeholder="mi-taller"
                onChange={e => setWs({ ...ws, catalog_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } as WorkshopSettings)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color de marca</label>
              <input type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" value={(ws as Record<string, unknown>).brand_color as string || '#6C5CE7'}
                onChange={e => setWs({ ...ws, brand_color: e.target.value } as WorkshopSettings)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción corta</label>
            <textarea className="input-base text-sm" rows={2} maxLength={280} placeholder="Ej: Taller de sublimación y serigrafía en Córdoba..."
              value={(ws as Record<string, unknown>).brand_description as string || ''}
              onChange={e => setWs({ ...ws, brand_description: e.target.value } as WorkshopSettings)} />
            <p className="text-[10px] text-gray-400 mt-0.5">{((ws as Record<string, unknown>).brand_description as string || '').length}/280</p>
          </div>
          <button onClick={saveWs} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Save size={14} /> Guardar catálogo web
          </button>
        </div>
      </div>
      {/* QR Modal */}
      {showQR && !!(ws as Record<string, unknown>).catalog_slug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
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
