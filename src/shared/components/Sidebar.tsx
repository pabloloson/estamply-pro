'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Layers, LayoutDashboard, Calculator, ShoppingBag, Settings, LogOut, Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/calculator', label: 'Calculadora', icon: Calculator },
  { href: '/orders', label: 'Pedidos', icon: ShoppingBag },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

interface SidebarProps {
  workshopName?: string
}

export function Sidebar({ workshopName = 'Mi Taller' }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}>
          <Layers size={18} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-gray-900 block leading-tight" style={{ fontSize: 15 }}>Estamply</span>
          <span className="text-xs text-gray-400 block leading-tight truncate max-w-[120px]">{workshopName}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`sidebar-link ${pathname === href ? 'active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <form action={logout}>
          <button type="submit" className="sidebar-link w-full text-left">
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white h-screen sticky top-0 border-r border-gray-100 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#6C5CE7' }}>
            <Layers size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Estamply</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
          <Menu size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100"
            >
              <X size={18} className="text-gray-600" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
