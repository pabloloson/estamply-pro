import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.estamply.app'),
  title: 'Estamply — Gestión para talleres de estampado',
  description: 'Estamply — El software para gestionar tu taller de estampado. Cotizá, presupuestá y gestioná pedidos en un solo lugar.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Estamply — Gestión para talleres de estampado',
    description: 'El software para gestionar tu taller de estampado. Cotizá, presupuestá y gestioná pedidos en un solo lugar.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Estamply' }],
    type: 'website',
    siteName: 'Estamply',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Estamply — Gestión para talleres de estampado',
    description: 'El software para gestionar tu taller de estampado. Cotizá, presupuestá y gestioná pedidos en un solo lugar.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
