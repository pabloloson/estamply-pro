/**
 * Centralized analytics — fires events to Meta Pixel, GA4, and PostHog.
 * Only active when env vars are set.
 */

import { posthog } from './posthog'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  // PostHog
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(name, params)
  }

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
