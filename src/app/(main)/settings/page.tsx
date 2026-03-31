'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, User, Upload, Loader2, X } from 'lucide-react'

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
  const [uploadingLogo, setUploadingLogo] = useState(false)
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
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    </div>
  )
}
