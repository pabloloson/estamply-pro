import Link from 'next/link'
import Image from 'next/image'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/">
            <Image src="/logo-full.png" alt="Estamply" width={850} height={213} style={{ height: 24, width: 'auto' }} priority unoptimized />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>&copy; {new Date().getFullYear()} Estamply. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link href="/legal/terminos" className="hover:text-gray-600 transition-colors">Terminos y Condiciones</Link>
            <Link href="/legal/privacidad" className="hover:text-gray-600 transition-colors">Privacidad</Link>
            <Link href="/legal/cookies" className="hover:text-gray-600 transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
