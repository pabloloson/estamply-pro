import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true })
  return _stripe
}
// Keep backward compat export — lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) { return (getStripe() as unknown as Record<string | symbol, unknown>)[prop] },
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

// Cache price IDs — fetched once per server lifetime, then reused
const priceCache: Record<string, string> = {}
let priceCacheLoaded = false

export async function getPriceId(lookupKey: string): Promise<string | null> {
  if (priceCache[lookupKey]) return priceCache[lookupKey]

  // First call: load all prices at once
  if (!priceCacheLoaded) {
    const allKeys = Object.keys(STRIPE_PRICE_TO_PLAN)
    const prices = await stripe.prices.list({ lookup_keys: allKeys, active: true, limit: 20 })
    for (const p of prices.data) {
      if (p.lookup_key) priceCache[p.lookup_key] = p.id
    }
    priceCacheLoaded = true
  }

  return priceCache[lookupKey] || null
}
