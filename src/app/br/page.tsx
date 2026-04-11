'use client'

import { Suspense } from 'react'
import LandingContent from '@/shared/components/LandingContent'

export default function LandingBR() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LandingContent defaultLang="pt" />
    </Suspense>
  )
}
