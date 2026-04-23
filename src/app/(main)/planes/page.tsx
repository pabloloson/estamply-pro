// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'
import '@stripe/stripe-js' // Pre-load Stripe SDK when user visits /planes
import { StripeProvider } from '@/shared/components/StripeProvider'
import StripeCheckoutForm from '@/shared/components/StripeCheckoutForm'

type Billing = 'mensual' | 'anual'

const PLANS = [
  {
    key: 'emprendedor',
    monthly: 9,
    yearly: 81,
    popular: false,
    features: [
      'Cotizador (2 técnicas)',
      'Presupuestos',
      'Pedidos',
      'Clientes',
      '1 usuario',
    ],
  },
  {
    key: 'pro',
    monthly: 17,
    yearly: 153,
    popular: true,
    features: [
      'Todo de Emprendedor',
      'Todas las técnicas',
      'Catálogo web',
      'Estadísticas',
      'Promociones',
      '3 usuarios',
    ],
  },
  {
    key: 'negocio',
    monthly: 29,
    yearly: 261,
    popular: false,
    features: [
      'Todo de Pro',
      'Usuarios ilimitados',
      'Soporte prioritario',
      'Multi-sucursal (próximamente)',
    ],
  },
]

const PLAN_LABELS: Record<string, string> = {
  emprendedor: 'Emprendedor',
  pro: 'Pro',
  negocio: 'Negocio',
}

export default function PlanesPage() {
  const t = useTranslations('plans')
  const [billing, setBilling] = useState<Billing>('mensual')
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [planStatus, setPlanStatus] = useState<string>('trial')
  const [redirecting, setRedirecting] = useState<string | null>(null)

  // Checkout modal state
  const [checkoutPlan, setCheckoutPlan] = useState<typeof PLANS[0] | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.plan) setCurrentPlan(data.plan)
        if (data.planStatus) setPlanStatus(data.planStatus)
      })
      .catch(() => {})
  }, [])

  // Detect ?status=success from 3D Secure redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'success') {
      setSuccessBanner(true)
      // Clean URL
      window.history.replaceState({}, '', '/planes')
      // Reload user data
      fetch('/api/me')
        .then(r => r.json())
        .then(data => {
          if (data.plan) setCurrentPlan(data.plan)
          if (data.planStatus) setPlanStatus(data.planStatus)
        })
        .catch(() => {})
    }
  }, [])

  // Pre-fetch clientSecret on hover to reduce perceived wait time
  const prefetchRef = useRef<{ key: string; promise: Promise<{ clientSecret?: string; error?: string }> } | null>(null)

  function prefetchPlan(plan: typeof PLANS[0]) {
    const lookupKey = `${plan.key}_${billing}`
    // Don't re-fetch if already prefetching same plan
    if (prefetchRef.current?.key === lookupKey) return
    prefetchRef.current = {
      key: lookupKey,
      promise: fetch('/api/stripe-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planLookupKey: lookupKey }),
      }).then(r => r.json()).catch(() => ({ error: 'Error de conexión' })),
    }
  }

  async function openCheckout(plan: typeof PLANS[0]) {
    setCheckoutPlan(plan)
    setModalVisible(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)))
    setCheckoutLoading(true)
    setCheckoutError(null)
    setClientSecret(null)

    const lookupKey = `${plan.key}_${billing}`
    try {
      // Reuse prefetched promise if available, otherwise fetch now
      let data: { clientSecret?: string; error?: string }
      if (prefetchRef.current?.key === lookupKey) {
        data = await prefetchRef.current.promise
      } else {
        const res = await fetch('/api/stripe-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planLookupKey: lookupKey }),
        })
        data = await res.json()
      }
      prefetchRef.current = null

      if (data.error || !data.clientSecret) {
        setCheckoutError(data.error || 'Error al crear la suscripción')
        setCheckoutLoading(false)
        return
      }

      setClientSecret(data.clientSecret)
    } catch {
      setCheckoutError('Error de conexión. Intentá de nuevo.')
    }
    setCheckoutLoading(false)
  }

  function closeCheckout() {
    setModalVisible(false)
    setTimeout(() => {
      setCheckoutPlan(null)
      setClientSecret(null)
      setCheckoutError(null)
    }, 300)
  }

  // Track modal open for animation
  const [modalVisible, setModalVisible] = useState(false)

  const handleSuccess = useCallback(() => {
    // Don't close modal — StripeCheckoutForm shows success state internally
    // After 5s auto-close or user clicks "Ir al inicio"
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.plan) setCurrentPlan(data.plan)
        if (data.planStatus) setPlanStatus(data.planStatus)
      })
      .catch(() => {})
  }, [])

  function handlePortal() {
    setRedirecting('portal')
    window.location.href = '/api/stripe-portal'
  }

  const isActive = planStatus === 'active'

  return (
    <div className="max-w-5xl mx-auto">
      {/* Success banner */}
      {successBanner && (
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-teal-50 border border-teal-200">
          <p className="text-sm font-medium text-teal-800">
            {t('successMessage')}
          </p>
          <button onClick={() => setSuccessBanner(false)} className="p-1 rounded hover:bg-teal-100">
            <X size={14} className="text-teal-600" />
          </button>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">{t('subtitle')}</p>
      </div>

      {/* Toggle mensual / anual */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-medium ${billing === 'mensual' ? 'text-gray-900' : 'text-gray-400'}`}>
          {t('monthly')}
        </span>
        <button
          onClick={() => setBilling(b => b === 'mensual' ? 'anual' : 'mensual')}
          className="relative w-12 h-6 rounded-full transition-colors"
          style={{ background: billing === 'anual' ? '#0F766E' : '#D1D5DB' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            style={{ transform: billing === 'anual' ? 'translateX(24px)' : 'translateX(0)' }}
          />
        </button>
        <span className={`text-sm font-medium ${billing === 'anual' ? 'text-gray-900' : 'text-gray-400'}`}>
          {t('yearly')}
        </span>
        {billing === 'anual' && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
            {t('save3months')}
          </span>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const price = billing === 'mensual' ? plan.monthly : plan.yearly
          const isCurrent = isActive && currentPlan === plan.key
          const priceLabel = `$${price} USD/${billing === 'mensual' ? t('mo') : t('yr')}`

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl bg-white p-6 flex flex-col ${
                plan.popular
                  ? 'border-2 shadow-lg'
                  : 'border border-gray-200 shadow-sm'
              }`}
              style={plan.popular ? { borderColor: '#0F766E' } : {}}
            >
              {plan.popular && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: '#0F766E' }}
                >
                  <Sparkles size={12} />
                  {t('mostPopular')}
                </div>
              )}

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {PLAN_LABELS[plan.key]}
              </h3>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-extrabold text-gray-900">${price}</span>
                <span className="text-sm text-gray-400">
                  USD/{billing === 'mensual' ? t('mo') : t('yr')}
                </span>
              </div>

              {billing === 'anual' && (
                <p className="text-xs text-teal-600 font-medium -mt-3 mb-4">
                  ${Math.round(plan.yearly / 12)}/mes · {t('save3months')}
                </p>
              )}

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map(feat => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={16} className="shrink-0 mt-0.5" style={{ color: '#0F766E' }} />
                    {feat}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="text-center">
                  <span
                    className="inline-block w-full py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: '#0F766E' }}
                  >
                    {t('currentPlan')}
                  </span>
                  <button
                    onClick={handlePortal}
                    disabled={redirecting === 'portal'}
                    className="mt-2 text-xs font-semibold hover:underline disabled:opacity-50"
                    style={{ color: '#0F766E' }}
                  >
                    {redirecting === 'portal' ? 'Redirigiendo...' : t('manageSubscription')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openCheckout(plan)}
                  onMouseEnter={() => prefetchPlan(plan)}
                  onTouchStart={() => prefetchPlan(plan)}
                  disabled={!!checkoutPlan}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-50 ${
                    plan.popular ? '' : 'opacity-90 hover:opacity-100'
                  }`}
                  style={{ background: '#0F766E' }}
                >
                  {isActive ? t('changePlan') : t('choosePlan')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-6">
        {t('footer')}
      </p>

      {/* ── Checkout Modal / Drawer ── */}
      {checkoutPlan && (() => {
        const modalPrice = `$${billing === 'mensual' ? checkoutPlan.monthly : checkoutPlan.yearly} USD/${billing === 'mensual' ? t('mo') : t('yr')}`
        const billingLabel = billing === 'mensual' ? 'Suscripción mensual' : 'Suscripción anual'

        return (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 transition-opacity duration-200"
              style={{ opacity: modalVisible ? 1 : 0 }}
              onClick={closeCheckout}
            />

            {/* Desktop: centered modal / Mobile: bottom drawer */}
            <div
              className={
                // Mobile: drawer from bottom
                'absolute inset-x-0 bottom-0 lg:relative lg:inset-auto ' +
                'lg:flex lg:items-center lg:justify-center lg:min-h-full lg:p-4'
              }
            >
              <div
                className={
                  'relative bg-white w-full ' +
                  // Mobile: drawer style
                  'rounded-t-2xl max-h-[95vh] overflow-y-auto ' +
                  // Desktop: modal style
                  'lg:rounded-2xl lg:max-w-[480px] lg:max-h-[90vh] lg:shadow-2xl ' +
                  // Mobile animation: slide up
                  'transition-transform duration-300 ease-out ' +
                  (modalVisible ? 'translate-y-0' : 'translate-y-full') + ' ' +
                  // Desktop animation: fade in (override transform)
                  'lg:translate-y-0 lg:transition-opacity lg:duration-200 ' +
                  (modalVisible ? 'lg:opacity-100' : 'lg:opacity-0')
                }
              >
                {/* Drag indicator (mobile only) */}
                <div className="flex justify-center pt-3 pb-1 lg:hidden">
                  <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>

                {/* Close button */}
                <button
                  onClick={closeCheckout}
                  className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} className="text-gray-400" />
                </button>

                {/* Content */}
                <div className="p-5 lg:p-6">
                  {/* Loading skeleton */}
                  {checkoutLoading && !clientSecret && !checkoutError && (
                    <div className="space-y-4">
                      {/* Plan summary skeleton */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md" style={{ background: '#0F766E' }} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{PLAN_LABELS[checkoutPlan.key]}</p>
                            <p className="text-xs text-gray-400">{billingLabel}</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{modalPrice}</p>
                      </div>
                      {/* Payment form skeleton */}
                      <div className="space-y-3 animate-pulse">
                        <div className="h-11 bg-gray-100 rounded-lg" />
                        <div className="h-11 bg-gray-100 rounded-lg" />
                        <div className="flex gap-3">
                          <div className="h-11 bg-gray-100 rounded-lg flex-1" />
                          <div className="h-11 bg-gray-100 rounded-lg flex-1" />
                        </div>
                        <div className="h-11 bg-gray-100 rounded-lg" />
                      </div>
                      {/* Button skeleton */}
                      <div className="h-12 rounded-xl opacity-40" style={{ background: '#0F766E' }} />
                    </div>
                  )}

                  {/* Error state */}
                  {checkoutError && (
                    <div className="py-6">
                      <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                        <p className="text-sm text-red-700 mb-2">{checkoutError}</p>
                        <button
                          onClick={() => openCheckout(checkoutPlan)}
                          className="text-sm font-semibold text-red-600 hover:underline"
                        >
                          Reintentar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Payment form */}
                  {clientSecret && (
                    <StripeProvider clientSecret={clientSecret}>
                      <StripeCheckoutForm
                        planName={PLAN_LABELS[checkoutPlan.key]}
                        price={modalPrice}
                        billingLabel={billingLabel}
                        onSuccess={handleSuccess}
                      />
                    </StripeProvider>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
