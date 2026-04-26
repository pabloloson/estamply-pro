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
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token()}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MailerLite ${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json().catch(() => null)
}

export async function addSubscriber(
  email: string,
  name: string,
  fields?: { plan?: string; signup_date?: string; country?: string }
) {
  try {
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
    }) as { data?: { id?: string } }

    const subscriberId = result?.data?.id
    if (!subscriberId) return

    // 2. Assign to groups via separate POST calls
    const g = groups()
    if (g.todos) {
      await mlFetch(`/subscribers/${subscriberId}/groups/${g.todos}`, 'POST').catch(err =>
        console.error('[mailerlite] assign group Todos error:', err))
    }
    if (g.trial) {
      await mlFetch(`/subscribers/${subscriberId}/groups/${g.trial}`, 'POST').catch(err =>
        console.error('[mailerlite] assign group Trial error:', err))
    }
  } catch (err) {
    console.error('[mailerlite] addSubscriber error:', err)
  }
}

export async function moveToGroup(email: string, groupId: string) {
  try {
    // Get subscriber ID first
    const data = await mlFetch(`/subscribers/${encodeURIComponent(email)}`, 'GET') as { data?: { id?: string } }
    const subscriberId = data?.data?.id
    if (!subscriberId) return
    await mlFetch(`/subscribers/${subscriberId}/groups/${groupId}`, 'POST')
  } catch (err) {
    console.error('[mailerlite] moveToGroup error:', err)
  }
}

export async function removeFromGroup(email: string, groupId: string) {
  try {
    const data = await mlFetch(`/subscribers/${encodeURIComponent(email)}`, 'GET') as { data?: { id?: string } }
    const subscriberId = data?.data?.id
    if (!subscriberId) return
    await mlFetch(`/subscribers/${subscriberId}/groups/${groupId}`, 'DELETE')
  } catch (err) {
    console.error('[mailerlite] removeFromGroup error:', err)
  }
}

export async function changePlan(email: string, newPlan: PlanKey) {
  try {
    const planKeys: PlanKey[] = ['trial', 'emprendedor', 'pro', 'negocio']

    // 1. Get subscriber ID
    const data = await mlFetch(`/subscribers/${encodeURIComponent(email)}`, 'GET') as { data?: { id?: string } }
    const subscriberId = data?.data?.id
    if (!subscriberId) return

    const g = groups()

    // 2. Remove from all plan groups
    for (const p of planKeys) {
      const gid = g[p]
      if (gid) {
        await mlFetch(`/subscribers/${subscriberId}/groups/${gid}`, 'DELETE').catch(() => {})
      }
    }

    // 3. Add to new plan group
    const newGroupId = g[newPlan]
    if (newGroupId) {
      await mlFetch(`/subscribers/${subscriberId}/groups/${newGroupId}`, 'POST')
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
