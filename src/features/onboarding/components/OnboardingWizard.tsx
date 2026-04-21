// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, ChevronRight, Check, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/db/client'
import { COUNTRIES } from '@/shared/lib/currency'
import { useTranslations } from '@/shared/hooks/useTranslations'

const PHONE_CODES: Record<string, string> = {
  AR: '+54', MX: '+52', CO: '+57', CL: '+56', PE: '+51', EC: '+593',
  UY: '+598', PY: '+595', BO: '+591', BR: '+55', VE: '+58',
  CR: '+506', PA: '+507', GT: '+502', DO: '+1',
}

const FLAGS: Record<string, string> = {
  AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', EC: '🇪🇨',
  UY: '🇺🇾', PY: '🇵🇾', BO: '🇧🇴', BR: '🇧🇷', VE: '🇻🇪',
  CR: '🇨🇷', PA: '🇵🇦', GT: '🇬🇹', DO: '🇩🇴',
}

// Main countries to show as cards (the most common)
const MAIN_COUNTRIES = ['AR', 'MX', 'CO', 'CL', 'BR', 'PE', 'EC', 'UY', 'PY', 'BO', 'VE']

// World countries (ISO 3166) — excludes MAIN_COUNTRIES which are shown as cards
const WORLD_COUNTRIES: Array<{ code: string; name: string; phoneCode: string }> = [
  { code: 'AF', name: 'Afganistán', phoneCode: '+93' },
  { code: 'AL', name: 'Albania', phoneCode: '+355' },
  { code: 'DE', name: 'Alemania', phoneCode: '+49' },
  { code: 'AD', name: 'Andorra', phoneCode: '+376' },
  { code: 'AO', name: 'Angola', phoneCode: '+244' },
  { code: 'SA', name: 'Arabia Saudita', phoneCode: '+966' },
  { code: 'DZ', name: 'Argelia', phoneCode: '+213' },
  { code: 'AU', name: 'Australia', phoneCode: '+61' },
  { code: 'AT', name: 'Austria', phoneCode: '+43' },
  { code: 'BE', name: 'Bélgica', phoneCode: '+32' },
  { code: 'BZ', name: 'Belice', phoneCode: '+501' },
  { code: 'BJ', name: 'Benín', phoneCode: '+229' },
  { code: 'BY', name: 'Bielorrusia', phoneCode: '+375' },
  { code: 'MM', name: 'Birmania', phoneCode: '+95' },
  { code: 'BW', name: 'Botsuana', phoneCode: '+267' },
  { code: 'BN', name: 'Brunéi', phoneCode: '+673' },
  { code: 'BG', name: 'Bulgaria', phoneCode: '+359' },
  { code: 'BF', name: 'Burkina Faso', phoneCode: '+226' },
  { code: 'BI', name: 'Burundi', phoneCode: '+257' },
  { code: 'BT', name: 'Bután', phoneCode: '+975' },
  { code: 'CV', name: 'Cabo Verde', phoneCode: '+238' },
  { code: 'KH', name: 'Camboya', phoneCode: '+855' },
  { code: 'CM', name: 'Camerún', phoneCode: '+237' },
  { code: 'CA', name: 'Canadá', phoneCode: '+1' },
  { code: 'TD', name: 'Chad', phoneCode: '+235' },
  { code: 'CN', name: 'China', phoneCode: '+86' },
  { code: 'CY', name: 'Chipre', phoneCode: '+357' },
  { code: 'KR', name: 'Corea del Sur', phoneCode: '+82' },
  { code: 'CR', name: 'Costa Rica', phoneCode: '+506' },
  { code: 'CI', name: 'Costa de Marfil', phoneCode: '+225' },
  { code: 'HR', name: 'Croacia', phoneCode: '+385' },
  { code: 'CU', name: 'Cuba', phoneCode: '+53' },
  { code: 'DK', name: 'Dinamarca', phoneCode: '+45' },
  { code: 'EG', name: 'Egipto', phoneCode: '+20' },
  { code: 'SV', name: 'El Salvador', phoneCode: '+503' },
  { code: 'AE', name: 'Emiratos Árabes', phoneCode: '+971' },
  { code: 'SK', name: 'Eslovaquia', phoneCode: '+421' },
  { code: 'SI', name: 'Eslovenia', phoneCode: '+386' },
  { code: 'ES', name: 'España', phoneCode: '+34' },
  { code: 'US', name: 'Estados Unidos', phoneCode: '+1' },
  { code: 'EE', name: 'Estonia', phoneCode: '+372' },
  { code: 'ET', name: 'Etiopía', phoneCode: '+251' },
  { code: 'PH', name: 'Filipinas', phoneCode: '+63' },
  { code: 'FI', name: 'Finlandia', phoneCode: '+358' },
  { code: 'FR', name: 'Francia', phoneCode: '+33' },
  { code: 'GH', name: 'Ghana', phoneCode: '+233' },
  { code: 'GR', name: 'Grecia', phoneCode: '+30' },
  { code: 'GT', name: 'Guatemala', phoneCode: '+502' },
  { code: 'GY', name: 'Guyana', phoneCode: '+592' },
  { code: 'HT', name: 'Haití', phoneCode: '+509' },
  { code: 'HN', name: 'Honduras', phoneCode: '+504' },
  { code: 'HU', name: 'Hungría', phoneCode: '+36' },
  { code: 'IN', name: 'India', phoneCode: '+91' },
  { code: 'ID', name: 'Indonesia', phoneCode: '+62' },
  { code: 'IQ', name: 'Irak', phoneCode: '+964' },
  { code: 'IR', name: 'Irán', phoneCode: '+98' },
  { code: 'IE', name: 'Irlanda', phoneCode: '+353' },
  { code: 'IL', name: 'Israel', phoneCode: '+972' },
  { code: 'IT', name: 'Italia', phoneCode: '+39' },
  { code: 'JM', name: 'Jamaica', phoneCode: '+1' },
  { code: 'JP', name: 'Japón', phoneCode: '+81' },
  { code: 'JO', name: 'Jordania', phoneCode: '+962' },
  { code: 'KE', name: 'Kenia', phoneCode: '+254' },
  { code: 'KW', name: 'Kuwait', phoneCode: '+965' },
  { code: 'LB', name: 'Líbano', phoneCode: '+961' },
  { code: 'LY', name: 'Libia', phoneCode: '+218' },
  { code: 'LT', name: 'Lituania', phoneCode: '+370' },
  { code: 'LU', name: 'Luxemburgo', phoneCode: '+352' },
  { code: 'MY', name: 'Malasia', phoneCode: '+60' },
  { code: 'MA', name: 'Marruecos', phoneCode: '+212' },
  { code: 'NI', name: 'Nicaragua', phoneCode: '+505' },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234' },
  { code: 'NO', name: 'Noruega', phoneCode: '+47' },
  { code: 'NZ', name: 'Nueva Zelanda', phoneCode: '+64' },
  { code: 'NL', name: 'Países Bajos', phoneCode: '+31' },
  { code: 'PK', name: 'Pakistán', phoneCode: '+92' },
  { code: 'PA', name: 'Panamá', phoneCode: '+507' },
  { code: 'PL', name: 'Polonia', phoneCode: '+48' },
  { code: 'PT', name: 'Portugal', phoneCode: '+351' },
  { code: 'PR', name: 'Puerto Rico', phoneCode: '+1' },
  { code: 'GB', name: 'Reino Unido', phoneCode: '+44' },
  { code: 'CZ', name: 'República Checa', phoneCode: '+420' },
  { code: 'DO', name: 'Rep. Dominicana', phoneCode: '+1' },
  { code: 'RO', name: 'Rumania', phoneCode: '+40' },
  { code: 'RU', name: 'Rusia', phoneCode: '+7' },
  { code: 'SN', name: 'Senegal', phoneCode: '+221' },
  { code: 'RS', name: 'Serbia', phoneCode: '+381' },
  { code: 'SG', name: 'Singapur', phoneCode: '+65' },
  { code: 'ZA', name: 'Sudáfrica', phoneCode: '+27' },
  { code: 'SE', name: 'Suecia', phoneCode: '+46' },
  { code: 'CH', name: 'Suiza', phoneCode: '+41' },
  { code: 'SR', name: 'Surinam', phoneCode: '+597' },
  { code: 'TH', name: 'Tailandia', phoneCode: '+66' },
  { code: 'TW', name: 'Taiwán', phoneCode: '+886' },
  { code: 'TZ', name: 'Tanzania', phoneCode: '+255' },
  { code: 'TT', name: 'Trinidad y Tobago', phoneCode: '+1' },
  { code: 'TN', name: 'Túnez', phoneCode: '+216' },
  { code: 'TR', name: 'Turquía', phoneCode: '+90' },
  { code: 'UA', name: 'Ucrania', phoneCode: '+380' },
  { code: 'UG', name: 'Uganda', phoneCode: '+256' },
  { code: 'VN', name: 'Vietnam', phoneCode: '+84' },
]

function getPhoneCode(countryCode: string): string {
  if (PHONE_CODES[countryCode]) return PHONE_CODES[countryCode]
  const wc = WORLD_COUNTRIES.find(c => c.code === countryCode)
  return wc?.phoneCode || '+1'
}

const TECHNIQUES = [
  { slug: 'subli', label: 'Sublimación', color: '#6C5CE7' },
  { slug: 'dtf', label: 'DTF Textil', color: '#E17055' },
  { slug: 'dtf_uv', label: 'DTF UV', color: '#00B894' },
  { slug: 'vinyl', label: 'Vinilo', color: '#E84393' },
  { slug: 'serigrafia', label: 'Serigrafía', color: '#FDCB6E' },
]

export default function OnboardingWizard() {
  const router = useRouter()
  const supabase = createClient()
  const t = useTranslations('onboarding')

  const [step, setStep] = useState(1)
  const totalSteps = 4

  // Step 1 state
  const [selectedCountry, setSelectedCountry] = useState('')
  const [showOtherCountries, setShowOtherCountries] = useState(false)

  // Step 2 state
  const [businessName, setBusinessName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>(['subli'])

  // Step 3 state
  const [slug, setSlug] = useState('')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('')

  // Load user name on mount
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('full_name, onboarding_completed').eq('id', user.id).single()
      if (profile?.onboarding_completed) { router.push('/dashboard'); return }
      if (profile?.full_name) setUserName(profile.full_name.split(' ')[0])
    }
    loadUser()
  }, [])

  // Auto-generate slug from business name
  useEffect(() => {
    if (businessName && !slug) {
      const auto = businessName
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30)
      setSlug(auto)
    }
  }, [businessName])

  // Check slug availability with debounce
  useEffect(() => {
    if (!slug || slug.length < 3) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(slug)}`)
        const json = await res.json()
        setSlugStatus(json.available ? 'available' : 'taken')
      } catch {
        // If check fails (empty DB, network error), assume available
        setSlugStatus('available')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [slug])

  const country = COUNTRIES.find(c => c.code === selectedCountry)
  const phoneCode = getPhoneCode(selectedCountry)

  function toggleTechnique(tecSlug: string) {
    setSelectedTechniques(prev =>
      prev.includes(tecSlug) ? prev.filter(s => s !== tecSlug) : [...prev, tecSlug]
    )
  }

  async function finishOnboarding() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Update profile
    await supabase.from('profiles').update({
      workshop_name: businessName,
      business_name: businessName,
      business_phone: phoneCode + whatsapp,
      onboarding_completed: true,
    }).eq('id', user.id)

    // 2. Create/update workshop_settings
    const countryConfig = COUNTRIES.find(c => c.code === selectedCountry)
    const settings = {
      pais: selectedCountry,
      idioma: countryConfig?.locale || 'es',
      moneda: countryConfig?.currency || 'USD',
      catalog_slug: slug,
      nombre_tienda: businessName,
    }
    const { data: existing } = await supabase.from('workshop_settings').select('id').single()
    if (existing) {
      await supabase.from('workshop_settings').update({ settings }).eq('id', existing.id)
    } else {
      await supabase.from('workshop_settings').insert({ settings })
    }

    // 3. Activate selected techniques (seed if needed, then toggle)
    const { data: existingTecs } = await supabase.from('tecnicas').select('id, slug')
    if (!existingTecs || existingTecs.length === 0) {
      // Seed default techniques
      const TECHNIQUE_DEFAULTS: Record<string, { nombre: string; color: string }> = {
        subli: { nombre: 'Sublimación', color: '#6C5CE7' },
        dtf: { nombre: 'DTF Textil', color: '#E17055' },
        dtf_uv: { nombre: 'DTF UV', color: '#00B894' },
        vinyl: { nombre: 'Vinilo', color: '#E84393' },
        serigrafia: { nombre: 'Serigrafía', color: '#FDCB6E' },
      }
      for (const [tSlug, def] of Object.entries(TECHNIQUE_DEFAULTS)) {
        await supabase.from('tecnicas').insert({
          slug: tSlug,
          nombre: def.nombre,
          color: def.color,
          config: { tipo: tSlug },
          equipment_ids: [],
          insumo_ids: [],
          activa: selectedTechniques.includes(tSlug),
        })
      }
    } else {
      // Update active state for existing techniques
      for (const tec of existingTecs) {
        await supabase.from('tecnicas').update({
          activa: selectedTechniques.includes(tec.slug),
        }).eq('id', tec.id)
      }
    }

    // 4. Create default categories (only if none exist)
    const { data: existingCats } = await supabase.from('categories').select('id').limit(1)
    if (!existingCats || existingCats.length === 0) {
      await supabase.from('categories').insert([
        { name: 'Textil', margen_sugerido: 40 },
        { name: 'Tazas', margen_sugerido: 40 },
        { name: 'Otros', margen_sugerido: 40 },
      ])
    }

    // 5. Create default payment methods (only if none exist)
    const { data: existingMedios } = await supabase.from('medios_pago').select('id').limit(1)
    if (!existingMedios || existingMedios.length === 0) {
      const defaultMedios = [
        { nombre: 'Efectivo', tipo_ajuste: 'ninguno', porcentaje: 0, activo: true, orden: 1 },
        { nombre: 'Transferencia', tipo_ajuste: 'ninguno', porcentaje: 0, activo: true, orden: 2 },
        { nombre: 'MercadoPago', tipo_ajuste: 'ninguno', porcentaje: 0, activo: true, orden: 3 },
      ]
      await supabase.from('medios_pago').insert(defaultMedios)
    }

    // 6. Seed demo data based on selected techniques
    try {
      await fetch('/api/demo-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techniques: selectedTechniques }),
      })
    } catch { /* demo data is non-critical */ }

    router.push('/dashboard')
  }

  const canProceedStep1 = !!selectedCountry
  const canProceedStep2 = businessName.trim().length >= 2 && whatsapp.trim().length >= 4 && selectedTechniques.length > 0
  const canProceedStep3 = slug.length >= 3 && slugStatus === 'available'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#F4F5F8' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Image src="/logo-full.png" alt="Estamply" width={160} height={40} style={{ height: 36, width: 'auto' }} priority />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-2">
        <p className="text-xs text-gray-400 font-semibold mb-2">{t('stepOf', { current: step, total: totalSteps })}</p>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%`, background: '#6C5CE7' }} />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-lg">

        {/* STEP 1: Country */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('step1Title')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {MAIN_COUNTRIES.map(code => {
                const c = COUNTRIES.find(x => x.code === code)
                if (!c) return null
                const selected = selectedCountry === code
                return (
                  <button key={code} type="button" onClick={() => { setSelectedCountry(code); setShowOtherCountries(false) }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${selected ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <span className="text-2xl">{FLAGS[code]}</span>
                    <span className={`text-sm font-medium ${selected ? 'text-purple-700' : 'text-gray-700'}`}>{c.name}</span>
                    {selected && <Check size={16} className="text-purple-600 ml-auto" />}
                  </button>
                )
              })}
            </div>

            {/* Other countries dropdown */}
            <button type="button" onClick={() => setShowOtherCountries(!showOtherCountries)}
              className="mt-3 text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <ChevronRight size={14} className={`transition-transform ${showOtherCountries ? 'rotate-90' : ''}`} />
              {t('otherCountry')}
            </button>
            {showOtherCountries && (
              <div className="mt-2">
                <select className="input-base w-full" value={selectedCountry}
                  onChange={e => { setSelectedCountry(e.target.value); setShowOtherCountries(false) }}>
                  <option value="">— Seleccionar país —</option>
                  {WORLD_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button type="button" disabled={!canProceedStep1} onClick={() => setStep(2)}
              className="w-full mt-6 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: '#6C5CE7' }}>
              {t('next')} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Business info + techniques */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('step2Title')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('businessName')} *</label>
                <input type="text" className="input-base" value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="Ej: Sublishop" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('whatsapp')} *</label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600 flex-shrink-0">
                    <span>{FLAGS[selectedCountry]}</span>
                    <span>{phoneCode}</span>
                  </div>
                  <input type="tel" className="input-base flex-1" value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                    placeholder="351 555 1234" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('techniques')} <span className="font-normal text-gray-400">({t('canSelectMultiple')})</span>
                </label>
                <div className="space-y-2">
                  {TECHNIQUES.map(tec => {
                    const active = selectedTechniques.includes(tec.slug)
                    return (
                      <button key={tec.slug} type="button" onClick={() => toggleTechnique(tec.slug)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${active ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="w-3 h-3 rounded-full" style={{ background: tec.color }} />
                        <span className={`text-sm font-medium ${active ? 'text-purple-700' : 'text-gray-700'}`}>{tec.label}</span>
                        {active && <Check size={16} className="text-purple-600 ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200 flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> {t('back')}
              </button>
              <button type="button" disabled={!canProceedStep2} onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#6C5CE7' }}>
                {t('next')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Catalog slug */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('step3Title')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('chooseSlug')}</p>
            <div className="flex items-center gap-0 mb-2">
              <span className="text-sm text-gray-400 bg-gray-50 border border-gray-200 border-r-0 rounded-l-xl px-3 py-2.5 flex-shrink-0">estamply.app/catalogo/</span>
              <input type="text" className="input-base rounded-l-none flex-1" value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
                placeholder="mi-taller" />
            </div>
            {slugStatus === 'checking' && <p className="text-xs text-gray-400 mt-1">Verificando...</p>}
            {slugStatus === 'available' && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check size={12} /> {t('available')}</p>}
            {slugStatus === 'taken' && <p className="text-xs text-red-500 mt-1">{t('unavailable')}</p>}
            <p className="text-xs text-gray-400 mt-3">{t('slugDescription')}</p>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200 flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> {t('back')}
              </button>
              <button type="button" disabled={!canProceedStep3} onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: '#6C5CE7' }}>
                {t('next')} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Ready! */}
        {step === 4 && (
          <div className="text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('step4Title')}</h2>
            <p className="text-sm text-gray-500 mb-8">{t('startUsing')}</p>

            <div className="text-left bg-gray-50 rounded-xl p-5 mb-6 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('thingsToDo')}</p>
              <a href="/cotizador" className="flex items-center gap-3 text-sm text-gray-700 hover:text-purple-600">
                <span className="text-lg">📋</span> {t('quoteFirst')}
              </a>
              <a href="/catalogo" className="flex items-center gap-3 text-sm text-gray-700 hover:text-purple-600">
                <span className="text-lg">🛒</span> {t('addProducts')}
              </a>
              <a href="/settings" className="flex items-center gap-3 text-sm text-gray-700 hover:text-purple-600">
                <span className="text-lg">⚙️</span> {t('completeConfig')}
              </a>
            </div>

            <button type="button" onClick={finishOnboarding} disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: '#6C5CE7', boxShadow: '0 4px 14px rgba(108,92,231,0.35)' }}>
              {saving ? 'Configurando tu taller...' : t('goToWorkshop')} {!saving && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
