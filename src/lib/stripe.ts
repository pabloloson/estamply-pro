import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
})

export const STRIPE_PRICE_TO_PLAN: Record<string, string> = {
  emprendedor_mensual: 'emprendedor',
  emprendedor_anual: 'emprendedor',
  pro_mensual: 'pro',
  pro_anual: 'pro',
  negocio_mensual: 'negocio',
  negocio_anual: 'negocio',
}

export function getPlanFromPriceId(lookupKey: string): string {
  return STRIPE_PRICE_TO_PLAN[lookupKey] || 'emprendedor'
}
