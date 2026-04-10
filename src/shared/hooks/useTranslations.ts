'use client'

import { useLocale } from '@/shared/context/LocaleContext'
import esMessages from '../../../messages/es.json'
import ptMessages from '../../../messages/pt.json'

const messages: Record<string, Record<string, Record<string, string>>> = { es: esMessages as unknown as Record<string, Record<string, string>>, pt: ptMessages as unknown as Record<string, Record<string, string>> }

export function useTranslations(namespace: string) {
  const { locale } = useLocale()
  const ns = messages[locale]?.[namespace] || messages.es[namespace] || {}

  return function t(key: string, params?: Record<string, string | number>): string {
    let text = ns[key] || messages.es[namespace]?.[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => { text = text.replace(`{${k}}`, String(v)) })
    }
    return text
  }
}
