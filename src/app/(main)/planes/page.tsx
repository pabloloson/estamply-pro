// @ts-nocheck
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Check, Loader2, Sparkles, X, AlertTriangle } from 'lucide-react'
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

const PLAN_HIERARCHY: Record<string, number> = {
  emprendedor: 1,
  pro: 2,
  negocio: 3,
}

// Features exclusive to each tier (lost on downgrade)
const PLAN_EXCLUSIVE_FEATURES: Record<string, string[]> = {
  pro: ['Todas las técnicas', 'Catálogo web', 'Estadísticas', 'Promociones', '3 usuarios'],
  negocio: ['Usuarios ilimitados', 'Soporte prioritario', 'Multi-sucursal'],
}

function getPlanAction(targetPlan: string, currentPlan: string | null, status: string): 'current' | 'upgrade' | 'downgrade' | 'subscribe' {
  if (!currentPlan || status !== 'active') return 'subscribe'
  if (targetPlan === currentPlan) return 'current'
  return PLAN_HIERARCHY[targetPlan] > PLAN_HIERARCHY[currentPlan] ? 'upgrade' : 'downgrade'
}

function getLostFeatures(fromPlan: string, toPlan: string): string[] {
  const fromLevel = PLAN_HIERARCHY[fromPlan]
  const toLevel = PLAN_HIERARCHY[toPlan]
  const lost: string[] = []
  Object.entries(PLAN_HIERARCHY).forEach(([plan, level]) => {
    if (level > toLevel && level <= fromLevel && PLAN_EXCLUSIVE_FEATURES[plan]) {
      lost.push(...PLAN_EXCLUSIVE_FEATURES[plan])
    }
  })
  return lost
}

export default function PlanesPage() {
  const t = useTranslations('plans')
  const [billing, setBilling] = useState<Billing>('mensual')
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [planStatus, setPlanStatus] = useState<string>('trial')
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)

  // Checkout modal state (for new subscriptions)
  const [checkoutPlan, setCheckoutPlan] = useState<typeof PLANS[0] | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  // Change plan modal state (for upgrades/downgrades)
  const [changePlanTarget, setChangePlanTarget] = useState<typeof PLANS[0] | null>(null)
  const [changePlanAction, setChangePlanAction] = useState<'upgrade' | 'downgrade' | null>(null)
  const [changingPlan, setChangingPlan] = useState(false)
  const [changeError, setChangeError] = useState<string | null>(null)

  const isExpired = planStatus === 'expired' || planStatus === 'cancelled' ||
    (planStatus === 'trial' && trialEndsAt !== null && new Date(trialEndsAt).getTime() < Date.now())

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.plan) setCurrentPlan(data.plan)
        if (data.planStatus) setPlanStatus(data.planStatus)
        if (data.trialEndsAt) setTrialEndsAt(data.trialEndsAt)
      })
      .catch(() => {})
  }, [])

  // Detect ?status=success from 3D Secure redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'success') {
      setSuccessBanner(true)
      window.history.replaceState({}, '', '/planes')
      fetch('/api/me')
        .then(r => r.json())
        .then(data => {
          if (data.plan) setCurrentPlan(data.plan)
          if (data.planStatus) setPlanStatus(data.planStatus)
        })
        .catch(() => {})
    }
  }, [])

  // Pre-fetch clientSecret on hover
  const prefetchRef = useRef<{ key: string; promise: Promise<{ clientSecret?: string; error?: string }> } | null>(null)

  function prefetchPlan(plan: typeof PLANS[0]) {
    const lookupKey = `${plan.key}_${billing}`
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

  const handleSuccess = useCallback(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.plan) setCurrentPlan(data.plan)
        if (data.planStatus) setPlanStatus(data.planStatus)
      })
      .catch(() => {})
  }, [])

  // Open confirmation modal for plan change
  function handlePlanChangeClick(plan: typeof PLANS[0], action: 'upgrade' | 'downgrade') {
    setChangePlanTarget(plan)
    setChangePlanAction(action)
    setChangeError(null)
  }

  // Execute the plan change
  async function confirmPlanChange() {
    if (!changePlanTarget) return
    setChangingPlan(true)
    setChangeError(null)

    const lookupKey = `${changePlanTarget.key}_${billing}`
    try {
      const res = await fetch('/api/stripe-change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planLookupKey: lookupKey }),
      })
      const data = await res.json()

      if (!res.ok) {
        setChangeError(data.error || 'Error al cambiar de plan')
        setChangingPlan(false)
        return
      }

      // Update local state
      setCurrentPlan(data.plan)
      setPlanStatus(data.status === 'active' ? 'active' : planStatus)
      setChangePlanTarget(null)
      setChangePlanAction(null)
      setSuccessBanner(true)
    } catch {
      setChangeError('Error de conexión. Intentá de nuevo.')
    }
    setChangingPlan(false)
  }

  function closePlanChange() {
    setChangePlanTarget(null)
    setChangePlanAction(null)
    setChangeError(null)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Expired banner */}
      {isExpired && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">
            Tu plan venció. Elegí un plan para seguir usando Estamply.
          </p>
        </div>
      )}

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
          const action = getPlanAction(plan.key, currentPlan, planStatus)
          const isCurrent = action === 'current'

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl p-6 flex flex-col ${
                isCurrent
                  ? 'border-2 border-[#0F766E] bg-[#FAFFFE]'
                  : plan.popular
                    ? 'border-2 border-[#0F766E] bg-white shadow-lg'
                    : 'border border-gray-200 bg-white shadow-sm'
              }`}
            >
              {plan.popular && !isCurrent && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: '#0F766E' }}
                >
                  <Sparkles size={12} />
                  {t('mostPopular')}
                </div>
              )}

              {isCurrent && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] mb-3">
                  <Check size={14} /> Plan actual
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

              {/* Action button */}
              {action === 'current' && (
                <button disabled className="w-full py-2.5 rounded-xl bg-[#F3F3F1] text-gray-400 text-sm font-semibold cursor-not-allowed">
                  Tu plan actual
                </button>
              )}

              {action === 'upgrade' && (
                <button
                  onClick={() => handlePlanChangeClick(plan, 'upgrade')}
                  className="w-full py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-bold hover:bg-[#0D9488] transition-colors"
                >
                  Subir de plan
                </button>
              )}

              {action === 'downgrade' && (
                <button
                  onClick={() => handlePlanChangeClick(plan, 'downgrade')}
                  className="w-full py-2.5 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors"
                >
                  Cambiar a este plan
                </button>
              )}

              {action === 'subscribe' && (
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
                  {t('choosePlan')}
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

      {/* ── Confirmation Modal for plan change ── */}
      {changePlanTarget && changePlanAction && (() => {
        const targetPrice = billing === 'mensual' ? changePlanTarget.monthly : changePlanTarget.yearly
        const currentPlanData = PLANS.find(p => p.key === currentPlan)
        const currentPrice = currentPlanData ? (billing === 'mensual' ? currentPlanData.monthly : currentPlanData.yearly) : 0
        const lostFeatures = changePlanAction === 'downgrade' && currentPlan ? getLostFeatures(currentPlan, changePlanTarget.key) : []
        const isUpgrade = changePlanAction === 'upgrade'
        const billingUnit = billing === 'mensual' ? 'mes' : 'año'

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={closePlanChange} />
            <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900">
                {isUpgrade ? `Subir a ${PLAN_LABELS[changePlanTarget.key]}` : `Cambiar a ${PLAN_LABELS[changePlanTarget.key]}`}
              </h3>

              <p className="text-sm text-gray-500 mt-3">
                Tu plan cambiará de <strong>{PLAN_LABELS[currentPlan || '']}</strong> (${currentPrice}/{billingUnit}) a <strong>{PLAN_LABELS[changePlanTarget.key]}</strong> (${targetPrice}/{billingUnit}).
              </p>

              {isUpgrade ? (
                <p className="text-sm text-gray-500 mt-2">
                  Se te cobrará la diferencia proporcional por los días restantes del ciclo actual.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mt-2">
                    El cambio se aplicará al final de tu ciclo de facturación actual.
                  </p>
                  {lostFeatures.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-700">Perderás acceso a:</p>
                          <ul className="mt-1 space-y-0.5">
                            {lostFeatures.map(f => (
                              <li key={f} className="text-xs text-amber-600">• {f}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {changeError && (
                <p className="text-sm text-red-500 mt-3">{changeError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={closePlanChange} disabled={changingPlan}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E5E3] text-sm font-medium text-gray-600 hover:bg-[#F8F7F4] transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={confirmPlanChange} disabled={changingPlan}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                    isUpgrade ? 'bg-[#0F766E] hover:bg-[#0D9488]' : 'bg-amber-500 hover:bg-amber-600'
                  }`}>
                  {changingPlan ? <Loader2 size={16} className="animate-spin" /> : null}
                  {changingPlan ? 'Procesando...' : 'Confirmar cambio'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Checkout Modal / Drawer (new subscriptions) ── */}
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
                'absolute inset-x-0 bottom-0 lg:relative lg:inset-auto ' +
                'lg:flex lg:items-center lg:justify-center lg:min-h-full lg:p-4'
              }
            >
              <div
                className={
                  'relative bg-white w-full ' +
                  'rounded-t-2xl max-h-[95vh] overflow-y-auto ' +
                  'lg:rounded-2xl lg:max-w-[480px] lg:max-h-[90vh] lg:shadow-2xl ' +
                  'transition-transform duration-300 ease-out ' +
                  (modalVisible ? 'translate-y-0' : 'translate-y-full') + ' ' +
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
                      <div className="space-y-3 animate-pulse">
                        <div className="h-11 bg-gray-100 rounded-lg" />
                        <div className="h-11 bg-gray-100 rounded-lg" />
                        <div className="flex gap-3">
                          <div className="h-11 bg-gray-100 rounded-lg flex-1" />
                          <div className="h-11 bg-gray-100 rounded-lg flex-1" />
                        </div>
                        <div className="h-11 bg-gray-100 rounded-lg" />
                      </div>
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
