'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { initPostHog, identifyUser } from '@/lib/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      identifyUser(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      })
    }
  }, [status, session])

  return <>{children}</>
}
