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
      <Icon size={18} strokeWidth={isActive(href) ? 2 : 1.75} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`text-[11px] min-w-[20px] text-center px-1.5 py-0.5 rounded-full font-semibold ${
          isActive(href)
            ? 'bg-white/25 text-white'
            : 'bg-teal-50 text-teal-700'
        }`}>
          {badge}
        </span>
      )}
    </Link>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo area ── */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
               style={{ background: '#0F766E' }}>
            <Image src="/logo-icon.png" alt="Estamply" width={22} height={22} priority />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-[15px] text-gray-900 block leading-tight tracking-tight">
              Estamply
            </span>
            <span className="text-[11.5px] text-gray-400 block leading-tight truncate mt-0.5">
              {workshopName}
            </span>
          </div>
        </div>
      </div>

      {/* ── Navegación principal ── */}
      <nav className="px-3 flex-1">
        <div className="sidebar-section-label">Gestión</div>
        <div className="space-y-1">
          {canAccess('inicio') && <NavLink href="/dashboard" icon={LayoutDashboard} label={t('home')} />}
          {canAccess('cotizador') && <NavLink href="/cotizador" icon={Calculator} label={t('quoter')} />}
          {canAccess('presupuestos') && <NavLink href="/presupuesto" icon={FileText} label={t('quotes')} badge={items.length} onNav={clearItems} />}
          {canAccess('pedidos') && <NavLink href="/orders" icon={ShoppingBag} label={t('orders')} />}
        </div>

        <div className="sidebar-section-label">Negocio</div>
        <div className="space-y-1">
          {canAccess('clientes') && <NavLink href="/clients" icon={Users} label={t('clients')} />}
          {canAccess('catalogo') && <NavLink href="/catalogo" icon={Package} label={t('catalog')} />}
          {canAccess('catalogo') && <NavLink href="/promociones" icon={Tag} label={t('promotions')} />}
          {canAccess('estadisticas') && <NavLink href="/estadisticas" icon={BarChart3} label={t('statistics')} />}
        </div>
      </nav>

      {/* ── Footer del sidebar ── */}
      <div className="px-3 pb-2">
        <div className="border-t border-[#EBEBEA] pt-3 space-y-1">
          {(isOwner || canAccess('configuracion')) && <NavLink href="/settings" icon={Settings} label={t('settings')} />}
          <NavLink href="/cuenta" icon={UserCircle} label={t('myAccount')} />
          <form action={logout}>
            <button type="submit" className="sidebar-link w-full text-left">
              <LogOut size={18} strokeWidth={1.75} />
              <span className="flex-1">{t('logout')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[260px] bg-white h-screen sticky top-0 border-r border-[#EBEBEA] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EBEBEA] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
               style={{ background: '#0F766E' }}>
            <Image src="/logo-icon.png" alt="Estamply" width={18} height={18} />
          </div>
          <span className="font-semibold text-gray-900 text-[15px] tracking-tight">Estamply</span>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Link
              href="/presupuesto"
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold text-white"
              style={{ background: '#0F766E' }}
            >
              <FileText size={12} />
              {items.length}
            </Link>
          )}
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-[280px] bg-white h-full shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
