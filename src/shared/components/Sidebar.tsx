'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import {
  LayoutDashboard, Calculator, FileText, ShoppingBag,
  Users, Package, BarChart3,
  Settings, UserCircle, LogOut, Menu, X,
} from 'lucide-react'
import { usePresupuesto } from '@/features/presupuesto/context/PresupuestoContext'
import { usePermissions } from '@/shared/context/PermissionsContext'
import { useTranslations } from '@/shared/hooks/useTranslations'

interface SidebarProps {
  workshopName?: string
}

export function Sidebar({ workshopName = 'Mi Taller' }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { items, clearItems } = usePresupuesto()
  const { canAccess, isOwner } = usePermissions()
  const t = useTranslations('sidebar')

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const NavLink = ({
    href,
    icon: Icon,
    label,
    badge,
    onNav,
  }: {
    href: string
    icon: React.ElementType
    label: string
    badge?: number
    onNav?: () => void
  }) => (
    <Link
      href={href}
      onClick={() => { setMobileOpen(false); onNav?.() }}
      className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
    >
      <Icon size={17} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="text-xs px-2 py-0.5 rounded-full text-white font-bold"
          style={{ background: '#6C5CE7' }}
        >
          {badge}
        </span>
      )}
    </Link>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <Image src="/logo-icon.png" alt="Estamply" width={36} height={36} className="flex-shrink-0" priority />
        <div className="min-w-0">
          <span className="font-bold text-gray-900 block leading-tight" style={{ fontSize: 15 }}>
            Estamply
          </span>
          <span className="text-xs text-gray-400 block leading-tight truncate">{workshopName}</span>
        </div>
      </div>

      {/* ── Sección 1: Uso diario ── */}
      <nav className="px-3 pt-4 space-y-0.5">
        {canAccess('inicio') && <NavLink href="/dashboard" icon={LayoutDashboard} label={t('home')} />}
        {canAccess('cotizador') && <NavLink href="/cotizador" icon={Calculator} label={t('quoter')} />}
        {canAccess('presupuestos') && <NavLink href="/presupuesto" icon={FileText} label={t('quotes')} badge={items.length} onNav={clearItems} />}
        {canAccess('pedidos') && <NavLink href="/orders" icon={ShoppingBag} label={t('orders')} />}
        {canAccess('clientes') && <NavLink href="/clients" icon={Users} label={t('clients')} />}
        {canAccess('catalogo') && <NavLink href="/catalogo" icon={Package} label={t('catalog')} />}
        {canAccess('estadisticas') && <NavLink href="/estadisticas" icon={BarChart3} label={t('statistics')} />}
      </nav>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Sección 3: Ajustes (anclado al fondo) ── */}
      <div className="px-3 pt-3 border-t border-gray-100 space-y-0.5 pb-1">
        {(isOwner || canAccess('configuracion')) && <NavLink href="/settings" icon={Settings} label={t('settings')} />}
        <NavLink href="/cuenta" icon={UserCircle} label={t('myAccount')} />
      </div>

      {/* ── Logout ── */}
      <div className="px-3 pb-4">
        <form action={logout}>
          <button type="submit" className="sidebar-link w-full text-left">
            <LogOut size={17} />
            {t('logout')}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-64 bg-white h-screen sticky top-0 border-r border-gray-100 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo-icon.png" alt="Estamply" width={28} height={28} />
          <span className="font-bold text-gray-900">Estamply</span>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Link
              href="/presupuesto"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold text-white"
              style={{ background: '#6C5CE7' }}
            >
              <FileText size={12} />
              {items.length}
            </Link>
          )}
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
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
