'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type CountryConfig, getCountry, formatCurrency as fmtCurrency } from '@/shared/lib/currency'

interface LocaleCtx {
  locale: string
  country: CountryConfig
  fmt: (amount: number) => string
  loading: boolean
}

const DEFAULT_COUNTRY = getCountry('AR')

const Ctx = createContext<LocaleCtx>({
  locale: 'es', country: DEFAULT_COUNTRY,
  fmt: (n) => fmtCurrency(n, DEFAULT_COUNTRY), loading: true,
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('es')
  const [country, setCountry] = useState<CountryConfig>(DEFAULT_COUNTRY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('workshop_settings').select('settings').single()
      if (data?.settings) {
        const s = data.settings as Record<string, unknown>
        const countryCode = (s.pais as string) || 'AR'
        const lang = (s.idioma as string) || 'es'
        const c = getCountry(countryCode)
        setCountry(c)
        setLocale(lang || c.locale)
      }
      setLoading(false)
    }
    load()
  }, [])

  const fmt = (n: number) => fmtCurrency(n, country)

  return <Ctx.Provider value={{ locale, country, fmt, loading }}>{children}</Ctx.Provider>
}

export function useLocale() { return useContext(Ctx) }
