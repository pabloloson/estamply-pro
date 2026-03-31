import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Estamply — Gestión de Taller',
  description: 'Software profesional para talleres de Sublimación, DTF y Vinilo Textil',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
