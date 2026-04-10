'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

type VisibilityLevel = 'completa' | 'solo_precios' | 'solo_produccion'

interface PermCtx {
  isOwner: boolean
  nivel: VisibilityLevel
  loading: boolean
  canAccess: (section: string) => boolean
  showCosts: boolean    // Can see production costs and margins
  showPrices: boolean   // Can see selling prices and monetary amounts
}

const Ctx = createContext<PermCtx>({
  isOwner: true, nivel: 'completa', loading: true,
  canAccess: () => true, showCosts: true, showPrices: true,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [isOwner, setIsOwner] = useState(true)
  const [nivel, setNivel] = useState<VisibilityLevel>('completa')
  const [secciones, setSecciones] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: member } = await supabase.from('team_members').select('permisos').eq('user_id', user.id).single()
      if (member) {
        const p = member.permisos as Record<string, unknown>
        setIsOwner(false)
        setNivel((p.nivel_visibilidad as VisibilityLevel) || 'solo_precios')
        setSecciones((p.secciones as Record<string, boolean>) || {})
      }
      setLoading(false)
    }
    load()
  }, [])

  const canAccess = (section: string) => isOwner || (secciones[section] ?? false)
  const showCosts = isOwner || nivel === 'completa'
  const showPrices = isOwner || nivel !== 'solo_produccion'

  return <Ctx.Provider value={{ isOwner, nivel, loading, canAccess, showCosts, showPrices }}>{children}</Ctx.Provider>
}

export function usePermissions() { return useContext(Ctx) }
