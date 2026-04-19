'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'

type VisibilityLevel = 'completa' | 'solo_precios' | 'solo_produccion'

interface PermCtx {
  isOwner: boolean
  nivel: VisibilityLevel
  loading: boolean
  canAccess: (section: string) => boolean
  showCosts: boolean
  showPrices: boolean
}

const Ctx = createContext<PermCtx>({
  isOwner: true, nivel: 'completa', loading: true,
  canAccess: () => true, showCosts: true, showPrices: true,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [isOwner, setIsOwner] = useState(true)
  const [nivel, setNivel] = useState<VisibilityLevel>('completa')
  const [secciones, setSecciones] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') { setLoading(status === 'loading'); return }
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        if (data.permisos && !data.isOwner) {
          const p = data.permisos as Record<string, unknown>
          setIsOwner(false)
          setNivel((p.nivel_visibilidad as VisibilityLevel) || 'solo_precios')
          setSecciones((p.secciones as Record<string, boolean>) || {})
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [status])

  const canAccess = (section: string) => isOwner || (secciones[section] ?? false)
  const showCosts = isOwner || nivel === 'completa'
  const showPrices = isOwner || nivel !== 'solo_produccion'

  return <Ctx.Provider value={{ isOwner, nivel, loading, canAccess, showCosts, showPrices }}>{children}</Ctx.Provider>
}

export function usePermissions() { return useContext(Ctx) }
