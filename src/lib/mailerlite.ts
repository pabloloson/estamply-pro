const API_BASE = 'https://connect.mailerlite.com/api'

function token() {
  return process.env.MAILERLITE_API_TOKEN || ''
}

function groups() {
  return {
    todos: process.env.MAILERLITE_GROUP_TODOS || '',
    trial: process.env.MAILERLITE_GROUP_TRIAL || '',
    emprendedor: process.env.MAILERLITE_GROUP_EMPRENDEDOR || '',
    pro: process.env.MAILERLITE_GROUP_PRO || '',
    negocio: process.env.MAILERLITE_GROUP_NEGOCIO || '',
  }
}

type PlanKey = 'trial' | 'emprendedor' | 'pro' | 'negocio'

async function mlFetch(path: string, method: string, body?: unknown): Promise<unknown> {
  const t = token()
  if (!t) {
    console.error('[mailerlite] MAILERLITE_API_TOKEN not set')
    return null
  }
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
  if (!res.ok) {
    console.error(`[mailerlite] ${method} ${path} → ${res.status}: ${text}`)
    return null
  }
  try { return JSON.parse(text) } catch { return null }
}

/** Add subscriber to a group by email (no subscriber_id needed) */
async function addToGroup(groupId: string, email: string) {
  if (!groupId) return
  await mlFetch(`/groups/${groupId}/subscribers`, 'POST', { email })
}

/** Remove subscriber from a group by subscriber_id */
async function removeFromGroupById(subscriberId: string, groupId: string) {
  if (!groupId || !subscriberId) return
  await mlFetch(`/subscribers/${subscriberId}/groups/${groupId}`, 'DELETE')
}

/** Get subscriber ID by email */
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
    // 1. Create/update subscriber
    await mlFetch('/subscribers', 'POST', {
      email,
      fields: {
        name,
        last_name: '',
        ...(fields?.plan ? { plan: fields.plan } : { plan: 'trial' }),
        ...(fields?.signup_date ? { signup_date: fields.signup_date } : { signup_date: new Date().toISOString().slice(0, 10) }),
        ...(fields?.country ? { country: fields.country } : {}),
      },
      status: 'active',
    })

    // 2. Assign to groups (uses email, no subscriber_id needed)
    const g = groups()
    await addToGroup(g.todos, email)
    await addToGroup(g.trial, email)
  } catch (err) {
    console.error('[mailerlite] addSubscriber error:', err)
  }
}

export async function moveToGroup(email: string, groupId: string) {
  try {
    await addToGroup(groupId, email)
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
    const g = groups()

    // 1. Get subscriber ID (needed for DELETE)
    const subscriberId = await getSubscriberId(email)
    if (!subscriberId) return

    // 2. Remove from all plan groups
    for (const p of planKeys) {
      const gid = g[p]
      if (gid) {
        await removeFromGroupById(subscriberId, gid)
      }
    }

    // 3. Add to new plan group (uses email)
    const newGroupId = g[newPlan]
    if (newGroupId) {
      await addToGroup(newGroupId, email)
    }

    // 4. Update custom field
    await mlFetch(`/subscribers/${subscriberId}`, 'PUT', {
      fields: { plan: newPlan },
    })
  } catch (err) {
    console.error('[mailerlite] changePlan error:', err)
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
