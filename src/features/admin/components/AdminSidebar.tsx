'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { BarChart3, Users, DollarSign, TrendingUp, Globe, Mail, Settings } from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3 },
  { href: '/admin/talleres', label: 'Talleres', icon: Users },
  { href: '/admin/ingresos', label: 'Ingresos', icon: DollarSign },
  { href: '/admin/metricas', label: 'Métricas', icon: TrendingUp },
  { href: '/admin/tracking', label: 'Tracking', icon: Globe },
  { href: '/admin/comunicacion', label: 'Comunicación', icon: Mail },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col p-4 text-white" style={{ background: '#0F172A' }}>
      <div className="flex items-center gap-2.5 px-3 py-4 mb-4">
        <Image src="/logo-icon.png" alt="Estamply" width={32} height={32} className="rounded-lg" />
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
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto px-3 py-3 border-t border-white/10">
        <p className="text-[10px] text-gray-500 truncate">{email}</p>
        <Link href="/dashboard" className="text-[10px] text-purple-400 hover:text-purple-300 mt-1 block">← Volver al taller</Link>
      </div>
    </aside>
  )
}
