'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { Layers, Zap, TrendingUp, Shield } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const t = useTranslations('auth')
  const to = useTranslations('onboarding')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Layers size={20} className="text-white" />
          </div>
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

        <p className="text-white/50 text-sm">© 2025 Estamply. Todos los derechos reservados.</p>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Layers size={20} style={{ color: '#6C5CE7' }} />
            <span className="font-bold text-lg" style={{ color: '#6C5CE7' }}>Estamply</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('welcomeBack')}</h2>
          <p className="text-gray-500 text-sm mb-8">{t('enterWorkshop')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('email')}</label>
              <input
                name="email"
                type="email"
                required
                placeholder="taller@ejemplo.com"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('password')}</label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="input-base"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary mt-2">
              {loading ? t('loggingIn') : t('login')}
            </button>
          </form>

          <p className="mt-4 text-center">
            <Link href="/forgot-password" style={{ color: '#6C5CE7' }} className="text-sm font-medium hover:underline">
              {to('forgotPassword')}
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-gray-500">
            {to('noAccount')}{' '}
            <Link href="/signup" style={{ color: '#6C5CE7' }} className="font-medium hover:underline">
              {to('createFreeAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
