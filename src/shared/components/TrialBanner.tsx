'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { X } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'

export default function TrialBanner() {
  const t = useTranslations('onboarding')
  const { status } = useSession()
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [expired, setExpired] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.planStatus === 'trial' && data.trialEndsAt) {
          const ends = new Date(data.trialEndsAt)
          const days = Math.ceil((ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (days <= 0) { setExpired(true); setShow(true) }
          else { setDaysLeft(days); setShow(true) }
        } else if (data.planStatus === 'expired') {
          setExpired(true); setShow(true)
        }
      })
      .catch(() => {})
  }, [status])

  if (!show || dismissed) return null

  return (
    <div className={`flex items-center justify-center gap-3 px-4 py-2 text-sm ${expired ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'}`}>
      <p className="font-medium">
        {expired ? t('trialExpired') : t('trialBanner', { days: daysLeft ?? 0 })}
      </p>
      <a href="/planes" className={`text-xs font-bold px-3 py-1 rounded-full ${expired ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}>
        {expired ? t('viewPlans') : t('choosePlan')}
      </a>
      {!expired && (
        <button onClick={() => setDismissed(true)} className="p-0.5 rounded hover:bg-purple-100 ml-1"><X size={14} /></button>
      )}
    </div>
  )
}
