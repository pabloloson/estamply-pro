'use client'

import { useState, useEffect } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react'

interface Props {
  planName: string
  price: string
  onSuccess: () => void
  onCancel: () => void
}

export default function StripeCheckoutForm({ planName, price, onSuccess, onCancel }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!stripe) return
    // Check if returning from 3D Secure redirect
    const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret')
    if (clientSecret) {
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        if (paymentIntent?.status === 'succeeded') onSuccess()
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

    // Only reaches here if there's an error (otherwise redirect happens)
    if (confirmError) {
      if (confirmError.type === 'card_error' || confirmError.type === 'validation_error') {
        setError(confirmError.message || 'Error en la tarjeta')
      } else {
        setError('Hubo un error procesando el pago. Intentá de nuevo.')
      }
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Plan summary */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">{planName}</p>
          <p className="text-xs text-gray-500">Suscripción</p>
        </div>
        <p className="text-lg font-bold text-gray-900">{price}</p>
      </div>

      {/* Stripe PaymentElement */}
      <div className="min-h-[200px]">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: 'tabs' }}
        />
        {!ready && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={!stripe || !elements || loading || !ready}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
          style={{ background: '#0F766E' }}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Procesando...</>
          ) : (
            <><CreditCard size={16} /> Suscribirme</>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

      {/* Security note */}
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
        <ShieldCheck size={12} />
        Pago seguro procesado por Stripe. Tus datos nunca tocan nuestros servidores.
      </p>
    </form>
  )
}
