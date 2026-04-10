'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { useTranslations } from '@/shared/hooks/useTranslations'

export default function TrialBanner() {
  const t = useTranslations('onboarding')
  const [daysLeft, setDaysLeft] = useState<number | null>(null)
  const [expired, setExpired] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles')
        .select('plan_status, trial_ends_at')
        .eq('id', user.id)
        .single()
      if (!profile) return

      if (profile.plan_status === 'trial' && profile.trial_ends_at) {
        const ends = new Date(profile.trial_ends_at)
        const now = new Date()
        const days = Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (days <= 0) {
          // Trial expired — update in DB
          await supabase.from('profiles').update({
            plan_status: 'expired',
            plan: 'emprendedor',
          }).eq('id', user.id)
          setExpired(true)
          setShow(true)
        } else {
          setDaysLeft(days)
          setShow(true)
        }
      } else if (profile.plan_status === 'expired') {
        setExpired(true)
        setShow(true)
      }
    }
    check()
  }, [])

  if (!show || dismissed) return null

  return (
    <div className={`flex items-center justify-center gap-3 px-4 py-2 text-sm ${expired ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'}`}>
      <p className="font-medium">
        {expired
          ? t('trialExpired')
          : t('trialBanner', { days: daysLeft ?? 0 })
        }
      </p>
      <button className={`text-xs font-bold px-3 py-1 rounded-full ${expired ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}>
        {expired ? t('viewPlans') : t('choosePlan')}
      </button>
      {!expired && (
        <button onClick={() => setDismissed(true)} className="p-0.5 rounded hover:bg-purple-100 ml-1">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
