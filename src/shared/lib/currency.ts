export interface CountryConfig {
  code: string
  name: string
  currency: string
  symbol: string
  thousandsSep: string
  decimalSep: string
  decimals: number
  locale: string
}

export const COUNTRIES: CountryConfig[] = [
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$', thousandsSep: '.', decimalSep: ',', decimals: 0, locale: 'es' },
  { code: 'MX', name: 'México', currency: 'MXN', symbol: '$', thousandsSep: ',', decimalSep: '.', decimals: 2, locale: 'es' },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$', thousandsSep: '.', decimalSep: ',', decimals: 0, locale: 'es' },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$', thousandsSep: '.', decimalSep: ',', decimals: 0, locale: 'es' },
  { code: 'PE', name: 'Perú', currency: 'PEN', symbol: 'S/', thousandsSep: ',', decimalSep: '.', decimals: 2, locale: 'es' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', symbol: '$', thousandsSep: ',', decimalSep: '.', decimals: 2, locale: 'es' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', symbol: '$', thousandsSep: '.', decimalSep: ',', decimals: 0, locale: 'es' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', symbol: '₲', thousandsSep: '.', decimalSep: ',', decimals: 0, locale: 'es' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', symbol: 'Bs', thousandsSep: '.', decimalSep: ',', decimals: 2, locale: 'es' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', symbol: 'R$', thousandsSep: '.', decimalSep: ',', decimals: 2, locale: 'pt' },
  { code: 'VE', name: 'Venezuela', currency: 'VES', symbol: 'Bs', thousandsSep: '.', decimalSep: ',', decimals: 2, locale: 'es' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', symbol: '₡', thousandsSep: '.', decimalSep: ',', decimals: 0, locale: 'es' },
  { code: 'PA', name: 'Panamá', currency: 'USD', symbol: '$', thousandsSep: ',', decimalSep: '.', decimals: 2, locale: 'es' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', symbol: 'Q', thousandsSep: ',', decimalSep: '.', decimals: 2, locale: 'es' },
  { code: 'DO', name: 'Rep. Dominicana', currency: 'DOP', symbol: 'RD$', thousandsSep: ',', decimalSep: '.', decimals: 2, locale: 'es' },
]

export function formatCurrency(amount: number, config?: Partial<CountryConfig>): string {
  const sym = config?.symbol ?? '$'
  const tSep = config?.thousandsSep ?? '.'
  const dSep = config?.decimalSep ?? ','
  let dec = config?.decimals ?? 0

  // Smart precision: show decimals when they matter
  // - Values < 1 (e.g. $0.07): always show 2 decimals
  // - Values < 100 with meaningful decimals (e.g. $5.25): show 2 decimals
  if (dec === 0 && Math.abs(amount) > 0 && Math.abs(amount) < 1) {
    dec = 2
  } else if (dec === 0 && Math.abs(amount) < 100 && amount !== Math.round(amount)) {
    dec = 2
  }

  const rounded = dec > 0 ? amount.toFixed(dec) : Math.round(amount).toString()
  const [intPart, decPart] = rounded.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, tSep)
  return dec > 0 && decPart ? `${sym}${formatted}${dSep}${decPart}` : `${sym}${formatted}`
}

export function getCountry(code: string): CountryConfig {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0]
}
