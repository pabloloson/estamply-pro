'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, ArrowLeft } from 'lucide-react'

const CONFIG_SECTIONS = [
  { group: 'Mi negocio', items: [{ id: 'perfil', label: 'Perfil' }, { id: 'moneda-idioma', label: 'Moneda e idioma' }] },
  { group: 'Producción', items: [
    { id: 'productos', label: 'Productos base' },
    { id: 'insumos', label: 'Insumos' },
    { id: 'equipamiento', label: 'Equipamiento' },
    { id: 'mano-obra', label: 'Mano de obra' },
    { id: 'tecnicas', label: 'Técnicas' },
    { id: 'proveedores', label: 'Proveedores' },
  ]},
  { group: 'Ventas', items: [
    { id: 'descuentos', label: 'Descuentos' },
    { id: 'medios-pago', label: 'Medios de pago' },
    { id: 'condiciones', label: 'Condiciones' },
  ]},
  { group: 'Tienda online', items: [
    { id: 'catalogo', label: 'Tienda online' },
    { id: 'guia-talles', label: 'Guía de talles' },
  ]},
  { group: 'Equipo', items: [{ id: 'usuarios', label: 'Usuarios y permisos' }] },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const section = pathname.split('/settings/')[1] || null
  const isIndex = pathname === '/settings'

  return (
    <div>
      {/* ── Mobile: menu list (only on /settings index) ── */}
      {isIndex && (
        <div className="md:hidden">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración</h1>
          {CONFIG_SECTIONS.map(s => (
            <div key={s.group} className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1.5">{s.group}</p>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {s.items.map((item, i) => (
                  <Link key={item.id} href={`/settings/${item.id}`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${i < s.items.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Desktop: sidebar + content ── */}
      <div className={`${isIndex ? 'hidden md:flex' : 'flex'}`}>
        {/* Sidebar — stays mounted, never re-renders content */}
        <aside className="hidden md:block w-52 flex-shrink-0 pr-6 border-r border-gray-100 mr-6">
          <p className="text-xs text-gray-400 font-semibold mb-4">Configuración</p>
          <nav className="space-y-4">
            {CONFIG_SECTIONS.map(s => (
              <div key={s.group}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">{s.group}</p>
                <div className="space-y-0.5">
                  {s.items.map(item => (
                    <Link key={item.id} href={`/settings/${item.id}`}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        section === item.id ? 'bg-teal-50 text-teal-800 font-medium' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                      }`}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content — only this changes on navigation */}
        <div className="flex-1 min-w-0">
          {/* Mobile back button */}
          {!isIndex && (
            <Link href="/settings" className="md:hidden flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-4">
              <ArrowLeft size={16} /> Configuración
            </Link>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
