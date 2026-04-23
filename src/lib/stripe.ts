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
