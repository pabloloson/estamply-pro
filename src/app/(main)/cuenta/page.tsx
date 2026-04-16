'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, Check, Upload, X, UserCircle, Lock, CreditCard } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'

export default function CuentaPage() {
  const supabase = createClient()
  const t = useTranslations('account')
  const avatarRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password change
  const [showPwChange, setShowPwChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwState, setPwState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [pwError, setPwError] = useState('')

  // Plan
  const [plan, setPlan] = useState('crecimiento')
  const [planStatus, setPlanStatus] = useState('trial')
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('full_name, plan, plan_status, trial_ends_at')
        .eq('id', user.id)
        .single()
      if (data) {
        setFullName(data.full_name || '')
        setPlan(data.plan || 'crecimiento')
        setPlanStatus(data.plan_status || 'trial')
        setTrialEndsAt(data.trial_ends_at || null)
      }
      // Check for avatar
      const { data: files } = await supabase.storage.from('logos').list(user.id, { search: 'avatar' })
      if (files && files.length > 0) {
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(`${user.id}/${files[0].name}`)
        setAvatarUrl(publicUrl)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function uploadAvatar(file: File) {
    if (!userId) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
    }
    setUploadingAvatar(false)
  }

  async function save() {
    if (!userId) return
    setSaveState('saving')
    const { error } = await supabase.from('profiles').upsert({ id: userId, full_name: fullName })
    if (error) { setSaveState('error'); return }
    setSaveState('saved')
    setTimeout(() => setSaveState(s => s === 'saved' ? 'idle' : s), 2000)
  }

  async function changePassword() {
    setPwError('')
    if (newPassword.length < 6) { setPwError(t('pwMinLength')); return }
    if (newPassword !== confirmPassword) { setPwError(t('pwMismatch')); return }
    setPwState('saving')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwError(error.message); setPwState('error'); return }
    setPwState('saved')
    setNewPassword('')
    setConfirmPassword('')
    setShowPwChange(false)
    setTimeout(() => setPwState(s => s === 'saved' ? 'idle' : s), 2000)
  }

  const planLabel = plan === 'crecimiento' ? 'Crecimiento' : plan === 'profesional' ? 'Profesional' : plan === 'empresa' ? 'Empresa' : plan
  const statusLabel = planStatus === 'trial' ? t('trial') : planStatus === 'active' ? t('active') : planStatus === 'cancelled' ? t('cancelled') : planStatus

  function trialDaysLeft() {
    if (!trialEndsAt) return 0
    const diff = new Date(trialEndsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('title')}</h1>
      <p className="text-sm text-gray-400 mb-6">{t('subtitle')}</p>

      {/* ── Datos personales ── */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserCircle size={18} className="text-gray-400" />
          {t('personalData')}
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          {avatarUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
              <button onClick={() => setAvatarUrl('')}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200">
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <UserCircle size={24} className="text-gray-300" />
            </div>
          )}
          <div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            <button onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50">
              {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadingAvatar ? t('uploading') : t('uploadAvatar')}
            </button>
          </div>
        </div>

        {/* Name + Email */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
            <input className="input-base" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('fullNamePlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input className="input-base bg-gray-50 text-gray-500 cursor-not-allowed" value={email} disabled />
            <p className="text-[10px] text-gray-400 mt-1">{t('emailHint')}</p>
          </div>
        </div>

        <button onClick={save} disabled={saveState === 'saving'}
          className={`mt-5 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${saveState === 'saved' ? 'bg-green-500' : saveState === 'error' ? 'bg-red-500' : ''}`}
          style={saveState !== 'saved' && saveState !== 'error' ? { background: '#6C5CE7' } : {}}>
          {saveState === 'saving' ? <><Loader2 size={14} className="animate-spin" /> {t('saving')}</> : saveState === 'saved' ? <><Check size={14} /> {t('saved')}</> : saveState === 'error' ? t('saveError') : <><Save size={14} /> {t('save')}</>}
        </button>
      </div>

      {/* ── Cambiar contraseña ── */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Lock size={18} className="text-gray-400" />
            {t('password')}
          </h2>
          {!showPwChange && (
            <button onClick={() => setShowPwChange(true)}
              className="text-sm font-semibold text-purple-600 hover:text-purple-700">
              {t('changePassword')}
            </button>
          )}
        </div>
        {showPwChange && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('newPassword')}</label>
              <input type="password" className="input-base" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword')}</label>
              <input type="password" className="input-base" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwState === 'saved' && <p className="text-xs text-green-600">{t('pwChanged')}</p>}
            <div className="flex gap-2">
              <button onClick={changePassword} disabled={pwState === 'saving'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#6C5CE7' }}>
                {pwState === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                {t('updatePassword')}
              </button>
              <button onClick={() => { setShowPwChange(false); setNewPassword(''); setConfirmPassword(''); setPwError('') }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100">
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Plan y facturación ── */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-gray-400" />
          {t('planBilling')}
        </h2>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-gray-700">{t('currentPlan')}:</span>
          <span className="px-3 py-1 rounded-full text-sm font-bold text-white" style={{ background: '#6C5CE7' }}>
            {planLabel}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planStatus === 'trial' ? 'bg-amber-100 text-amber-700' : planStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {statusLabel}
          </span>
        </div>
        {planStatus === 'trial' && trialEndsAt && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 mb-4">
            <p className="text-sm text-amber-700">
              {t('trialRemaining', { days: trialDaysLeft() })}
            </p>
          </div>
        )}
        <p className="text-xs text-gray-400">{t('planHint')}</p>
      </div>
    </div>
  )
}
