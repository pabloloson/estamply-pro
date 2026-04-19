import { auth } from "@/auth"
import { getTeamOwnerId } from "@/lib/db/tenant"

export async function getSession() {
  return await auth()
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("No autenticado")
  }
  return session.user
}

export async function getTenantId() {
  const user = await requireAuth()
  return await getTeamOwnerId(user.id)
}
