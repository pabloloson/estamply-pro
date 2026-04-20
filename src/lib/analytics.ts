/**
 * Centralized analytics — fires events to both Meta Pixel and GA4.
 * Only active when env vars are set.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  // Meta Pixel
  if (typeof window !== 'undefined' && window.fbq) {
    const pixelMap: Record<string, string> = {
      sign_up: 'Lead',
      begin_trial: 'StartTrial',
      purchase: 'Purchase',
    }
    const fbEvent = pixelMap[name]
    if (fbEvent) window.fbq('track', fbEvent, params)
  }

  // GA4
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params)
  }
}

export function trackPageView(url?: string) {
  if (typeof window === 'undefined') return

  if (window.fbq) window.fbq('track', 'PageView')

  if (window.gtag) {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (gaId) window.gtag('config', gaId, { page_path: url || window.location.pathname })
  }
}
