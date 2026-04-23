'use client'

import { useState, useEffect } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'

interface Props {
  planName: string
  price: string
  billingLabel: string
  onSuccess: () => void
}

export default function StripeCheckoutForm({ planName, price, billingLabel, onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!stripe) return
    const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret')
    if (clientSecret) {
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        if (paymentIntent?.status === 'succeeded') {
          setSuccess(true)
          setTimeout(() => onSuccess(), 5000)
        }
      })
    }
  }, [stripe, onSuccess])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Error de validación')
      setLoading(false)
      return
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/planes?status=success`,
      },
    })

    if (confirmError) {
      if (confirmError.type === 'card_error' || confirmError.type === 'validation_error') {
        setError(confirmError.message || 'Error en la tarjeta')
      } else {
        setError('Hubo un error procesando el pago. Intentá de nuevo.')
      }
    }
    setLoading(false)
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: '#ECFDF5' }}>
          <CheckCircle2 size={28} style={{ color: '#0F766E' }} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">¡Suscripción activada!</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          Tu plan {planName} está activo. Ya podés usar todas las funcionalidades.
        </p>
        <a
          href="/dashboard"
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: '#0F766E' }}
        >
          Ir al inicio
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Plan summary */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#0F766E' }}>E</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{planName}</p>
            <p className="text-xs text-gray-400">{billingLabel}</p>
          </div>
        </div>
        <p className="text-xl font-bold text-gray-900">{price}</p>
      </div>

      {/* Stripe PaymentElement */}
      <div className="min-h-[200px]">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: 'tabs' }}
        />
        {!ready && (
          <div className="space-y-3 animate-pulse">
            <div className="h-11 bg-gray-100 rounded-lg" />
            <div className="h-11 bg-gray-100 rounded-lg" />
            <div className="flex gap-3">
              <div className="h-11 bg-gray-100 rounded-lg flex-1" />
              <div className="h-11 bg-gray-100 rounded-lg flex-1" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Trust signals */}
      <div className="flex items-center justify-center gap-4 py-1">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Lock size={11} />
          <span>Pago seguro por Stripe</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Visa */}
          <svg className="h-4 w-auto opacity-40" viewBox="0 0 48 16" fill="none"><path d="M19.5 1.5l-3 13h-3l3-13h3zm12.8 8.4l1.6-4.4.9 4.4h-2.5zm2.8 4.6h2.8L35.5 1.5h-2.5c-.6 0-1 .3-1.2.8l-4.3 12.2h3l.6-1.6h3.6l.4 1.6zm-7-8.7c0 3.2-4.4 3.4-4.4 5 0 .4.4.9 1.4.9 1.2 0 2.2-.6 2.2-.6l.4 2.5s-1.3.5-2.8.5c-3 0-4.2-1.6-4.2-3.3 0-3.5 4.4-3.7 4.4-5.1 0-.5-.4-1-1.4-1-1.1 0-2 .5-2 .5L21.4 3S22.6 2.3 24 2.3c2.8-.5 4.1 1.5 4.1 3.5zM17.3 1.5L13 14.5h-3l-2.2-10c-.1-.5-.3-.7-.7-.9C6.2 3.2 5 2.8 5 2.8l.1-.3h4.8c.6 0 1.2.5 1.3 1.2l1.2 6.3 3-7.5h3z" fill="currentColor"/></svg>
          {/* Mastercard */}
          <svg className="h-4 w-auto opacity-40" viewBox="0 0 32 20" fill="none"><circle cx="12" cy="10" r="8" fill="currentColor" opacity=".3"/><circle cx="20" cy="10" r="8" fill="currentColor" opacity=".3"/></svg>
          {/* Amex */}
          <svg className="h-4 w-auto opacity-40" viewBox="0 0 32 20" fill="none"><rect x="1" y="2" width="30" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><text x="16" y="13" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">AMEX</text></svg>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!stripe || !elements || loading || !ready}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
        style={{ background: '#0F766E' }}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Procesando...</>
        ) : (
          <><Lock size={14} /> Suscribirme · {price}</>
        )}
      </button>

      {/* Reassurance + legal */}
      <div className="text-center space-y-1">
        <p className="text-xs text-gray-400">Cancelá en cualquier momento. Sin compromiso.</p>
        <p className="text-[10px] text-gray-300">Al suscribirte, aceptás los Términos de Servicio. Facturación {billingLabel.toLowerCase()}.</p>
      </div>

      {/* Social proof */}
      <p className="text-center text-[11px] text-gray-300 pt-1">+200 talleres ya usan Estamply</p>
    </form>
  )
}
