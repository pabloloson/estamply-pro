'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import {
  LayoutDashboard, Calculator, FileText, ShoppingBag,
  Users, Package, Tag, BarChart3,
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
      <Icon size={18} strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-teal-50 text-teal-700">
          {badge}
        </span>
      )}
    </Link>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/logo-icon.png" alt="Estamply" width={32} height={32} className="flex-shrink-0" priority />
        <div className="min-w-0">
          <span className="font-semibold text-gray-900 block leading-tight text-[15px]">
            Estamply
          </span>
          <span className="text-xs text-gray-400 block leading-tight truncate">{workshopName}</span>
        </div>
      </div>

      {/* ── Sección 1: Uso diario ── */}
      <nav className="px-3 pt-2 space-y-0.5 flex-1">
        {canAccess('inicio') && <NavLink href="/dashboard" icon={LayoutDashboard} label={t('home')} />}
        {canAccess('cotizador') && <NavLink href="/cotizador" icon={Calculator} label={t('quoter')} />}
        {canAccess('presupuestos') && <NavLink href="/presupuesto" icon={FileText} label={t('quotes')} badge={items.length} onNav={clearItems} />}
        {canAccess('pedidos') && <NavLink href="/orders" icon={ShoppingBag} label={t('orders')} />}
        {canAccess('clientes') && <NavLink href="/clients" icon={Users} label={t('clients')} />}
        {canAccess('catalogo') && <NavLink href="/catalogo" icon={Package} label={t('catalog')} />}
        {canAccess('catalogo') && <NavLink href="/promociones" icon={Tag} label={t('promotions')} />}
        {canAccess('estadisticas') && <NavLink href="/estadisticas" icon={BarChart3} label={t('statistics')} />}
      </nav>

      {/* ── Sección 2: Ajustes (anclado al fondo) ── */}
      <div className="px-3 pt-3 border-t border-gray-100 space-y-0.5 pb-1">
        {(isOwner || canAccess('configuracion')) && <NavLink href="/settings" icon={Settings} label={t('settings')} />}
        <NavLink href="/cuenta" icon={UserCircle} label={t('myAccount')} />
      </div>

      {/* ── Logout ── */}
      <div className="px-3 pb-4">
        <form action={logout}>
          <button type="submit" className="sidebar-link w-full text-left">
            <LogOut size={18} strokeWidth={1.75} />
            {t('logout')}
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-white h-screen sticky top-0 border-r border-[#E5E5E3] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E5E5E3] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-icon.png" alt="Estamply" width={28} height={28} />
          <span className="font-semibold text-gray-900 text-[15px]">Estamply</span>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Link
              href="/presupuesto"
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold text-white"
              style={{ background: '#0F766E' }}
            >
              <FileText size={12} />
              {items.length}
            </Link>
          )}
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-xl transition-transform duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
