'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signup } from '@/app/actions/auth'
import { Zap, TrendingUp, Shield } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'

export default function SignupPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const t = useTranslations('auth')
  const to = useTranslations('onboarding')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - purple gradient with features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo-icon.png" alt="Estamply" width={40} height={40} className="rounded-xl bg-white/20 p-1" />
          <span className="text-white font-bold text-xl">Estamply</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            El cerebro de tu taller de personalización
          </h1>
          <p className="text-white/80 text-lg mb-10">
            Cotiza en segundos, gestiona pedidos y conoce la rentabilidad real de tu negocio.
          </p>
          <div className="space-y-4">
            {[
              { icon: Zap, text: 'Calculadora inteligente con costos exactos' },
              { icon: TrendingUp, text: 'Rendimiento en $/hora por técnica' },
              { icon: Shield, text: 'Tus datos seguros en la nube' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-white/90 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/50 text-sm">© 2025 Estamply.</p>
      </div>

      {/* Right panel - simplified form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Image src="/logo-full.png" alt="Estamply" width={140} height={35} style={{ height: 30, width: 'auto' }} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">{to('createAccount')}</h2>
          <p className="text-gray-500 text-sm mb-8">{t('startFree')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('name')}</label>
              <input name="full_name" type="text" required placeholder="Juan García" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('email')}</label>
              <input name="email" type="email" required placeholder="juan@taller.com" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('password')}</label>
              <input name="password" type="password" required minLength={8} placeholder="••••••••" className="input-base" />
              <p className="text-xs text-gray-400 mt-1">{to('minChars')}</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? t('creating') : to('createFreeAccount')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t('hasAccount')}{' '}
            <Link href="/login" style={{ color: '#6C5CE7' }} className="font-medium hover:underline">{t('login')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
