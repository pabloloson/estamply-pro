const API_BASE = 'https://connect.mailerlite.com/api'

function token() {
  return process.env.MAILERLITE_API_TOKEN || ''
}

const GROUPS = {
  todos: '185765610219636433',
  trial: '185765216948061997',
  emprendedor: '185765240191845421',
  pro: '185765256598914620',
  negocio: '185765269312898329',
  cancelados: '185851142813517697',
} as const

type PlanKey = 'trial' | 'emprendedor' | 'pro' | 'negocio'

async function mlFetch(path: string, method: string, body?: unknown): Promise<unknown> {
  const t = token()
  if (!t) {
    console.error('[mailerlite] MAILERLITE_API_TOKEN not set')
    return null
  }
  console.log(`[mailerlite] >>> ${method} ${path}`, body ? JSON.stringify(body) : '(no body)')
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${t}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text().catch(() => '')
  console.log(`[mailerlite] <<< ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`)
  if (!res.ok) {
    return null
  }
  try { return JSON.parse(text) } catch { return null }
}

async function addToGroup(subscriberId: string, groupId: string) {
  if (!subscriberId || !groupId) return
  await mlFetch(`/subscribers/${subscriberId}/groups/${groupId}`, 'POST')
}

async function removeFromGroupById(subscriberId: string, groupId: string) {
  if (!groupId || !subscriberId) return
  await mlFetch(`/subscribers/${subscriberId}/groups/${groupId}`, 'DELETE')
}

async function getSubscriberId(email: string): Promise<string | null> {
  const data = await mlFetch(`/subscribers/${encodeURIComponent(email)}`, 'GET') as { data?: { id?: string } } | null
  return data?.data?.id || null
}

export async function addSubscriber(
  email: string,
  name: string,
  fields?: { plan?: string; signup_date?: string; country?: string }
) {
  try {
    console.log(`[mailerlite] addSubscriber called: email=${email}, name=${name}`)
    console.log(`[mailerlite] group IDs — todos: "${GROUPS.todos}", trial: "${GROUPS.trial}"`)

    // 1. Create/update subscriber
    const result = await mlFetch('/subscribers', 'POST', {
      email,
      fields: {
        name,
        last_name: '',
        ...(fields?.plan ? { plan: fields.plan } : { plan: 'trial' }),
        ...(fields?.signup_date ? { signup_date: fields.signup_date } : { signup_date: new Date().toISOString().slice(0, 10) }),
        ...(fields?.country ? { country: fields.country } : {}),
      },
      status: 'active',
    }) as { data?: { id?: string } } | null
    const subscriberId = result?.data?.id
    console.log(`[mailerlite] subscriber created/updated, id: ${subscriberId}`)
    if (!subscriberId) return

    // 2. Assign to groups: POST /subscribers/{id}/groups/{group_id}
    console.log(`[mailerlite] assigning to Todos group...`)
    await addToGroup(subscriberId, GROUPS.todos)
    console.log(`[mailerlite] assigning to Trial group...`)
    await addToGroup(subscriberId, GROUPS.trial)
    console.log(`[mailerlite] addSubscriber completed for ${email}`)
  } catch (err) {
    console.error('[mailerlite] addSubscriber error:', err)
  }
}

export async function moveToGroup(email: string, groupId: string) {
  try {
    const subscriberId = await getSubscriberId(email)
    if (!subscriberId) return
    await addToGroup(subscriberId, groupId)
  } catch (err) {
    console.error('[mailerlite] moveToGroup error:', err)
  }
}

export async function removeFromGroup(email: string, groupId: string) {
  try {
    const subscriberId = await getSubscriberId(email)
    if (!subscriberId) return
    await removeFromGroupById(subscriberId, groupId)
  } catch (err) {
    console.error('[mailerlite] removeFromGroup error:', err)
  }
}

export async function changePlan(email: string, newPlan: PlanKey) {
  try {
    const planKeys: PlanKey[] = ['trial', 'emprendedor', 'pro', 'negocio']

    const subscriberId = await getSubscriberId(email)
    if (!subscriberId) return

    // Remove from all plan groups + cancelados (in case reactivating)
    for (const p of planKeys) {
      await removeFromGroupById(subscriberId, GROUPS[p])
    }
    await removeFromGroupById(subscriberId, GROUPS.cancelados)

    // Add to new plan group
    await addToGroup(subscriberId, GROUPS[newPlan])

    // Update custom field
    await mlFetch(`/subscribers/${subscriberId}`, 'PUT', {
      fields: { plan: newPlan },
    })
  } catch (err) {
    console.error('[mailerlite] changePlan error:', err)
  }
}

/** Move subscriber to Cancelados group, remove from plan groups, update field */
export async function moveToCancelled(email: string, previousPlan: string, fieldValue: 'cancelled' | 'expired') {
  try {
    const subscriberId = await getSubscriberId(email)
    if (!subscriberId) return

    // Remove from previous plan group
    const planKeys: PlanKey[] = ['trial', 'emprendedor', 'pro', 'negocio']
    for (const p of planKeys) {
      if (p === previousPlan) {
        await removeFromGroupById(subscriberId, GROUPS[p])
      }
    }

    // Add to Cancelados
    await addToGroup(subscriberId, GROUPS.cancelados)

    // Update custom field
    await mlFetch(`/subscribers/${subscriberId}`, 'PUT', {
      fields: { plan: fieldValue },
    })
  } catch (err) {
    console.error('[mailerlite] moveToCancelled error:', err)
  }
}

export async function unsubscribe(email: string) {
  try {
    await mlFetch('/subscribers', 'POST', {
      email,
      status: 'unsubscribed',
    })
  } catch (err) {
    console.error('[mailerlite] unsubscribe error:', err)
  }
}
