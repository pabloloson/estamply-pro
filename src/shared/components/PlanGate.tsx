'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

const WHITELIST = ['/planes', '/cuenta', '/settings']

export default function PlanGate({ expired, children }: { expired: boolean; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isWhitelisted = WHITELIST.some(p => pathname === p || pathname.startsWith(p + '/'))

  useEffect(() => {
    if (expired && !isWhitelisted) {
      router.replace('/planes')
    }
  }, [expired, isWhitelisted, router])

  if (expired && !isWhitelisted) return null

  return <>{children}</>
}
