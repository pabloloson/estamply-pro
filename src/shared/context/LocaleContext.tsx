'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
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
  const { status } = useSession()
  const [locale, setLocale] = useState('es')
  const [country, setCountry] = useState<CountryConfig>(DEFAULT_COUNTRY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') { setLoading(status === 'loading'); return }
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.locale) {
          const countryCode = data.locale.pais || 'AR'
          const c = getCountry(countryCode)
          setCountry(c)
          setLocale(c.locale)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  const fmt = (n: number) => fmtCurrency(n, country)

  return <Ctx.Provider value={{ locale, country, fmt, loading }}>{children}</Ctx.Provider>
}

export function useLocale() { return useContext(Ctx) }
