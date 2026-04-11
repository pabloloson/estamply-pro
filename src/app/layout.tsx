import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://estamply.app'),
  title: 'Estamply — Software para talleres de estampado',
  description: 'El primer sistema diseñado para talleres de sublimación, DTF, vinilo y serigrafía. Cotiza en segundos, envía presupuestos profesionales, gestiona pedidos y ten tu propio catálogo web.',
  keywords: 'software sublimación, cotizador sublimación, gestión taller estampado, presupuesto sublimación, catálogo sublimación, DTF, vinilo, serigrafía',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Estamply — Software para talleres de estampado',
    description: 'El primer sistema diseñado para talleres de sublimación, DTF, vinilo y serigrafía. Cotiza en segundos, envía presupuestos profesionales y gestiona pedidos.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Estamply' }],
    type: 'website',
    siteName: 'Estamply',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Estamply — Software para talleres de estampado',
    description: 'El primer sistema diseñado para talleres de sublimación, DTF, vinilo y serigrafía.',
    images: ['/og-image.png'],
  },
  alternates: {
    languages: {
      'es': 'https://estamply.app',
      'pt-BR': 'https://estamply.app/br',
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="alternate" hrefLang="es" href="https://estamply.app" />
        <link rel="alternate" hrefLang="pt-BR" href="https://estamply.app/br" />
      </head>
      <body>{children}</body>
    </html>
  )
}
