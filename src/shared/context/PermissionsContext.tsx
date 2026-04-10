'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Permisos {
  secciones: Record<string, boolean>
  datos_sensibles: Record<string, boolean>
  acciones: Record<string, boolean>
}

interface PermCtx {
  isOwner: boolean
  rol: string
  permisos: Permisos
  loading: boolean
  canAccess: (section: string) => boolean
  canSee: (data: string) => boolean
  canDo: (action: string) => boolean
}

const DEFAULT_PERMISOS: Permisos = {
  secciones: { inicio: true, cotizador: true, presupuestos: true, pedidos: true, clientes: true, catalogo: true, estadisticas: true, materiales: true, equipamiento: true, produccion: true },
  datos_sensibles: { ver_costos: true, ver_margen: true, ver_precios_venta: true },
  acciones: { crear_presupuestos: true, editar_presupuestos: true, confirmar_pedidos: true, eliminar_pedidos: true, crear_clientes: true, editar_clientes: true, exportar_datos: true, acceder_configuracion: true },
}

const Ctx = createContext<PermCtx>({
  isOwner: true, rol: 'dueño', permisos: DEFAULT_PERMISOS, loading: true,
  canAccess: () => true, canSee: () => true, canDo: () => true,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [isOwner, setIsOwner] = useState(true)
  const [rol, setRol] = useState('dueño')
  const [permisos, setPermisos] = useState<Permisos>(DEFAULT_PERMISOS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Check if this user is a team member (not owner)
      const { data: member } = await supabase.from('team_members').select('rol,permisos').eq('user_id', user.id).single()
      if (member) {
        setIsOwner(false)
        setRol(member.rol)
        setPermisos(member.permisos as Permisos)
      }
      setLoading(false)
    }
    load()
  }, [])

  const canAccess = (section: string) => isOwner || (permisos.secciones[section] ?? false)
  const canSee = (data: string) => isOwner || (permisos.datos_sensibles[data] ?? false)
  const canDo = (action: string) => isOwner || (permisos.acciones[action] ?? false)

  return <Ctx.Provider value={{ isOwner, rol, permisos, loading, canAccess, canSee, canDo }}>{children}</Ctx.Provider>
}

export function usePermissions() { return useContext(Ctx) }
