'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Check, UserCircle, Lock, CreditCard, Shield, FileText, ArrowUpRight, ChevronRight, XCircle, ArrowRight } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-[#0F766E] text-white' },
  trial: { label: 'Prueba gratuita', color: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactivo', color: 'bg-gray-200 text-gray-600' },
  past_due: { label: 'Pago pendiente', color: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-200 text-gray-600' },
  incomplete: { label: 'Incompleto', color: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Expirado', color: 'bg-gray-200 text-gray-600' },
}

const PLAN_NAMES: Record<string, string> = {
  emprendedor: 'Emprendedor',
  pro: 'Pro',
  negocio: 'Negocio',
}

const PLAN_PRICES: Record<string, number> = {
  emprendedor: 9,
  pro: 17,
  negocio: 29,
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CuentaPage() {
  const t = useTranslations('account')
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  // Password change
  const [showPwChange, setShowPwChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [pwError, setPwError] = useState('')

  // Plan
  const [plan, setPlan] = useState('')
  const [planStatus, setPlanStatus] = useState('trial')
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null)
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/me')
        const me = await meRes.json()
        if (!me.userId) return
        setUserId(me.ownerId)
        setEmail(me.email || '')

        const profRes = await fetch(`/api/data?table=profiles&single=true`)
        const prof = profRes.ok ? await profRes.json() : null
        if (prof) {
          setFullName(prof.full_name || '')
          setPlan(prof.plan || '')
          setPlanStatus(prof.plan_status || 'trial')
          setTrialEndsAt(prof.trial_ends_at || null)
          setCurrentPeriodEnd(prof.stripe_current_period_end || null)
          setHasStripeCustomer(!!prof.stripe_customer_id)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    if (!userId) return
    setSaveState('saving')
    try {
      const res = await fetch('/api/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'profiles', id: userId, data: { full_name: fullName } }),
      })
      if (res.ok) { setSaveState('saved'); setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2000) }
      else setSaveState('error')
    } catch { setSaveState('error') }
  }

  async function changePassword() {
    setPwError('')
    if (newPassword.length < 6) { setPwError(t('pwMinLength')); return }
    if (newPassword !== confirmPassword) { setPwError(t('pwMismatch')); return }
    setPwState('saving')
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error || 'Error'); setPwState('error'); return }
      setPwState('saved')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setShowPwChange(false)
      setTimeout(() => setPwState(s => s === 'saved' ? 'idle' : s), 3000)
    } catch { setPwError('Error de conexión'); setPwState('error') }
  }

  function handlePortal() {
    setRedirecting(true)
    window.location.href = '/api/stripe-portal'
  }

  const planName = PLAN_NAMES[plan] || (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Sin plan')
  const planPrice = PLAN_PRICES[plan] || null

  function trialDaysLeft() {
    if (!trialEndsAt) return 0
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mi cuenta</h1>
        <p className="text-sm text-gray-400 mt-0.5">Tu información personal y plan.</p>
      </div>

      {/* ── SECCIÓN 1: Datos personales ── */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <UserCircle size={20} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Datos personales</h2>
        </div>

        {/* Avatar — initial letter */}
        <div className="w-16 h-16 rounded-2xl bg-[#F0FDFA] flex items-center justify-center text-[#0F766E] font-bold text-xl mb-5">
          {(fullName || email || '?').charAt(0).toUpperCase()}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Nombre completo</label>
            <input className="input-base text-sm" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Email</label>
            <input className="input-base text-sm bg-gray-50 cursor-not-allowed" value={email} disabled />
            <p className="text-[11px] text-gray-400 mt-1">Para cambiar tu email, contactá soporte.</p>
          </div>
        </div>

        <button onClick={save} disabled={saveState === 'saving'}
          className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : 'bg-[#0F766E] hover:bg-[#0D9488]'}`}>
          {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : saveState === 'saved' ? <><Check size={14} /> Guardado</> : saveState === 'error' ? 'Error al guardar' : <><Save size={14} /> Guardar cambios</>}
        </button>
      </div>

      {/* ── SECCIÓN 2: Plan y facturación ── */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard size={20} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Plan y facturación</h2>
        </div>

        {/* Plan card */}
        <div className="rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] p-5 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{planName}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${STATUS_LABELS[planStatus]?.color || 'bg-gray-200 text-gray-600'}`}>
                  {STATUS_LABELS[planStatus]?.label || planStatus}
                </span>
              </div>
              {planPrice && <p className="text-sm text-gray-500 mt-1">${planPrice} USD/mes</p>}
            </div>
          </div>

          {/* Renewal / trial info */}
          <div className="mt-4 pt-4 border-t border-[#CCFBF1] space-y-2">
            {planStatus === 'trial' && trialEndsAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tu prueba termina el</span>
                <span className="font-medium text-gray-900">{formatDate(trialEndsAt)}</span>
              </div>
            )}
            {planStatus === 'trial' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Días restantes</span>
                <span className="font-medium text-amber-600">{trialDaysLeft()} días</span>
              </div>
            )}
            {planStatus === 'active' && currentPeriodEnd && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Próxima renovación</span>
                <span className="font-medium text-gray-900">{formatDate(currentPeriodEnd)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Trial CTA */}
        {planStatus === 'trial' && (
          <a href="/planes"
            className="flex items-center justify-center gap-2 w-full mb-4 px-4 py-3 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors">
            <ArrowRight size={16} />
            Elegir plan
          </a>
        )}

        {/* Expired/cancelled CTA */}
        {(planStatus === 'expired' || planStatus === 'cancelled') && (
          <a href="/planes"
            className="flex items-center justify-center gap-2 w-full mb-4 px-4 py-3 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0D9488] transition-colors">
            <ArrowRight size={16} />
            Reactivar plan
          </a>
        )}

        {/* Billing actions — all redirect to Stripe Portal */}
        {hasStripeCustomer && (
          <div className="space-y-2">
            <button onClick={() => router.push('/planes')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-700 hover:bg-[#F8F7F4] transition-colors">
              <span className="flex items-center gap-2">
                <ArrowUpRight size={16} className="text-gray-400" />
                Cambiar de plan
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>

            <button onClick={handlePortal} disabled={redirecting}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-700 hover:bg-[#F8F7F4] transition-colors disabled:opacity-50">
              <span className="flex items-center gap-2">
                <CreditCard size={16} className="text-gray-400" />
                Actualizar método de pago
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>

            <button onClick={handlePortal} disabled={redirecting}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-700 hover:bg-[#F8F7F4] transition-colors disabled:opacity-50">
              <span className="flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                Ver historial de facturas
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </button>

            <button onClick={handlePortal} disabled={redirecting}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
              <span className="flex items-center gap-2">
                <XCircle size={16} />
                Cancelar suscripción
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-4">
          Los cambios de plan, pagos y cancelaciones se gestionan a través de Stripe, nuestro procesador de pagos seguro.
        </p>
      </div>

      {/* ── SECCIÓN 3: Seguridad ── */}
      <div className="rounded-2xl border border-[#E5E5E3] bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={20} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Seguridad</h2>
        </div>

        {pwState === 'saved' && !showPwChange && (
          <p className="text-xs text-green-600 mb-3">Contraseña actualizada correctamente.</p>
        )}

        {!showPwChange ? (
          <button onClick={() => setShowPwChange(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-700 hover:bg-[#F8F7F4] transition-colors">
            <span className="flex items-center gap-2">
              <Lock size={16} className="text-gray-400" />
              Cambiar contraseña
            </span>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Contraseña actual</label>
              <input type="password" className="input-base text-sm" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Nueva contraseña</label>
              <input type="password" className="input-base text-sm" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Confirmar contraseña</label>
              <input type="password" className="input-base text-sm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={changePassword} disabled={pwState === 'saving'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0F766E] hover:bg-[#0D9488] transition-colors disabled:opacity-50">
                {pwState === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                Guardar contraseña
              </button>
              <button onClick={() => { setShowPwChange(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPwError('') }}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
