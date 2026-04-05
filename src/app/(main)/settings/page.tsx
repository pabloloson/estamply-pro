'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, User, Upload, Loader2, X, Plus, Trash2 } from 'lucide-react'
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

      {/* Discount toggle */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-4">Descuentos por volumen</h3>
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={() => { const next = { ...ws, descuento_global_enabled: !(ws.descuento_global_enabled ?? false) }; setWs(next); setTimeout(() => { const supabase2 = createClient(); supabase2.from('workshop_settings').select('id').single().then(({ data }) => { if (data) supabase2.from('workshop_settings').update({ settings: next }).eq('id', data.id) }) }, 0) }}
            className="relative w-11 h-6 rounded-full transition-colors" style={{ background: (ws.descuento_global_enabled ?? false) ? '#6C5CE7' : '#D1D5DB' }}>
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ transform: (ws.descuento_global_enabled ?? false) ? 'translateX(20px)' : 'translateX(0)' }} />
          </button>
          <span className="text-sm text-gray-700">Usar tabla de descuentos única para todas las técnicas</span>
        </div>
        {(ws.descuento_global_enabled ?? false) && (
          <div>
            <table className="w-full"><thead><tr className="border-b border-gray-100">
              {['Desde', 'Hasta', 'Desc (%)', ''].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase px-3 py-2">{h}</th>)}
            </tr></thead><tbody>
              {(ws.descuentos_global ?? []).map((t: DiscountTier, i: number) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-3 py-1.5"><input type="number" value={t.desde} onChange={e => { const arr = [...(ws.descuentos_global ?? [])]; arr[i] = { ...arr[i], desde: parseInt(e.target.value) || 0 }; setWs({ ...ws, descuentos_global: arr }) }} className="w-20 input-base text-sm py-1" /></td>
                  <td className="px-3 py-1.5"><input type="number" value={t.hasta} onChange={e => { const arr = [...(ws.descuentos_global ?? [])]; arr[i] = { ...arr[i], hasta: parseInt(e.target.value) || 0 }; setWs({ ...ws, descuentos_global: arr }) }} className="w-20 input-base text-sm py-1" /></td>
                  <td className="px-3 py-1.5"><input type="number" min={0} max={100} value={Math.round(t.porcentaje * 100)} onChange={e => { const arr = [...(ws.descuentos_global ?? [])]; arr[i] = { ...arr[i], porcentaje: (parseFloat(e.target.value) || 0) / 100 }; setWs({ ...ws, descuentos_global: arr }) }} className="w-20 input-base text-sm py-1" /></td>
                  <td className="px-3 py-1.5"><button onClick={() => setWs({ ...ws, descuentos_global: (ws.descuentos_global ?? []).filter((_: DiscountTier, j: number) => j !== i) })} className="p-1 rounded hover:bg-red-50"><Trash2 size={12} className="text-red-400" /></button></td>
                </tr>
              ))}
            </tbody></table>
            <button onClick={() => setWs({ ...ws, descuentos_global: [...(ws.descuentos_global ?? []), { desde: 0, hasta: 9999, porcentaje: 0 }] })} className="flex items-center gap-1 text-xs px-2.5 py-1.5 mt-2 rounded-lg font-semibold text-white" style={{ background: '#6C5CE7' }}><Plus size={12} /> Fila</button>
            <button onClick={saveWs} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}><Save size={14} /> Guardar descuentos</button>
          </div>
        )}
        {!(ws.descuento_global_enabled ?? false) && <p className="text-sm text-gray-400">Cada técnica gestiona sus descuentos de forma independiente.</p>}
      </div>
      {/* Mano de Obra */}
      <div className="card p-6 max-w-2xl mt-6">
        <h3 className="font-semibold text-gray-800 mb-1">Mano de Obra</h3>
        <p className="text-xs text-gray-400 mb-4">Configurá el costo de mano de obra para incluirlo en tus cotizaciones.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modo de cálculo</label>
            <select className="input-base" value={ws.mano_de_obra?.modo ?? 'por_unidad'} onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), modo: e.target.value as ManoDeObraModo } })}>
              <option value="sueldo_fijo">Sueldo fijo</option>
              <option value="por_unidad">Fijo por estampado</option>
              <option value="porcentaje">Porcentaje sobre costo</option>
            </select>
          </div>

          {(ws.mano_de_obra?.modo ?? 'por_unidad') === 'sueldo_fijo' && (
            <div className="space-y-3 p-4 rounded-xl bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo total MO mensual ($)</label>
                  <input type="number" className="input-base" value={ws.mano_de_obra?.sueldo_mensual ?? 0} onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), sueldo_mensual: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horas productivas mensuales</label>
                  <input type="number" className="input-base" value={ws.mano_de_obra?.horas_mensuales ?? 160} onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), horas_mensuales: Number(e.target.value) } })} />
                </div>
              </div>
              <p className="text-xs text-gray-400">Si tenés varios empleados en producción, sumá todos los sueldos y todas las horas.</p>
              {(ws.mano_de_obra?.horas_mensuales ?? 160) > 0 && (ws.mano_de_obra?.sueldo_mensual ?? 0) > 0 && (
                <p className="text-sm font-medium text-green-600">Costo por hora: {fmt(Math.round((ws.mano_de_obra?.sueldo_mensual ?? 0) / (ws.mano_de_obra?.horas_mensuales ?? 160)))}/h</p>
              )}
            </div>
          )}

          {(ws.mano_de_obra?.modo ?? 'por_unidad') === 'por_unidad' && (
            <div className="p-4 rounded-xl bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-1">Costo por estampada ($)</label>
              <input type="number" className="input-base" value={ws.mano_de_obra?.monto_por_unidad ?? 0} onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), monto_por_unidad: Number(e.target.value) } })} />
            </div>
          )}

          {(ws.mano_de_obra?.modo ?? 'por_unidad') === 'porcentaje' && (
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje (%)</label>
                <input type="number" className="input-base" value={ws.mano_de_obra?.porcentaje_comision ?? 10} onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), porcentaje_comision: Number(e.target.value) } })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base de cálculo</label>
                <select className="input-base" value={ws.mano_de_obra?.comision_base ?? 'venta'} onChange={e => setWs({ ...ws, mano_de_obra: { ...(ws.mano_de_obra ?? DEFAULT_MO_CONFIG), comision_base: e.target.value as ComisionBase } })}>
                  <option value="venta">Sobre precio de venta</option>
                  <option value="ganancia">Sobre ganancia</option>
                </select>
              </div>
            </div>
          )}

          <button onClick={saveWs} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>
            <Save size={14} /> Guardar mano de obra
          </button>
        </div>
      </div>
    </div>
  )
}
