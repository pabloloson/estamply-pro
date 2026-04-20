import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

export function initPostHog() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  if (posthog.__loaded) return

  posthog.init(POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      recordCrossOriginIframes: true,
    },
    enable_recording_console_log: true,
  })
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.identify(userId, properties)
}

export function resetPostHog() {
  if (typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.reset()
}

export { posthog }
