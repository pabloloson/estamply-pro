'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Users, DollarSign, TrendingUp, Globe, Mail, Settings, Menu, X } from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/talleres', label: 'Talleres', icon: Users },
  { href: '/admin/ingresos', label: 'Ingresos', icon: DollarSign },
  { href: '/admin/metricas', label: 'Métricas', icon: TrendingUp },
  { href: '/admin/tracking', label: 'Tracking', icon: Globe },
  { href: '/admin/comunicacion', label: 'Comunicación', icon: Mail },
  { href: '/admin/configuracion', label: 'Config', icon: Settings },
]

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col p-4 text-white" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-2.5 px-3 py-4 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="Estamply" width={32} height={32} className="rounded-lg" />
          <div>
            <span className="font-bold text-sm">Estamply</span>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Admin</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${active ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <Icon size={16} />{label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto px-3 py-3 border-t border-white/10">
          <p className="text-[10px] text-gray-500 truncate">{email}</p>
          <Link href="/dashboard" className="text-[10px] text-purple-400 hover:text-purple-300 mt-1 block">← Volver al taller</Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" width={24} height={24} className="rounded" />
          <span className="font-bold text-white text-sm">Admin</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white p-1">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col p-4 text-white" style={{ background: '#0F172A' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 px-3 py-4 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="Estamply" width={32} height={32} className="rounded-lg" />
              <div>
                <span className="font-bold text-sm">Estamply</span>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Admin</p>
              </div>
            </div>
            <nav className="flex-1 space-y-0.5">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
                return (
                  <Link key={href} href={href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${active ? 'bg-white/10 text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                    <Icon size={16} />{label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-auto px-3 py-3 border-t border-white/10">
              <p className="text-[10px] text-gray-500 truncate">{email}</p>
              <Link href="/dashboard" className="text-[10px] text-purple-400 hover:text-purple-300 mt-1 block">← Volver al taller</Link>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
