'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signup, googleLogin } from '@/app/actions/auth'
import { trackEvent } from '@/lib/analytics'
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
    } else {
      trackEvent('sign_up')
      trackEvent('begin_trial')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - teal gradient with features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: 'linear-gradient(160deg, #0F766E 0%, #0D5E58 100%)' }}>
        <img src="/logo-estamply-login.png" alt="Estamply" style={{ height: 28, width: 'auto' }} />
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
        <p className="text-white/50 text-sm">© {new Date().getFullYear()} Estamply.</p>
      </div>

      {/* Right panel - simplified form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Image src="/logo-full.png" alt="Estamply" width={850} height={213} style={{ height: 30, width: 'auto' }} priority unoptimized />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">{to('createAccount')}</h2>
          <p className="text-gray-500 text-sm mb-8">{t('startFree')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          <form action={googleLogin}>
            <button type="submit" className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t('continueWithGoogle')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{t('orDivider')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

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
            <Link href="/login" style={{ color: '#0F766E' }} className="font-medium hover:underline">{t('login')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
