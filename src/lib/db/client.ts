/**
 * Drop-in replacement for Supabase client using /api/data proxy.
 * Supports the chained API: db.from('table').insert({}).select().single()
 */

class QueryBuilder {
  private table: string
  private filters: Array<{ field: string; value: string }> = []
  private _order: string | null = null
  private _limit: number | null = null
  private _single = false
  private _count = false
  private _head = false
  private _op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private _payload: unknown = null
  private _returnData = false // true when .select() is chained after insert/update

  constructor(table: string) { this.table = table }

  select(_fields = '*', opts?: { count?: string; head?: boolean }) {
    // If already set to a write op, .select() means "return data after write"
    if (this._op === 'insert' || this._op === 'update' || this._op === 'upsert') {
      this._returnData = true
    } else {
      this._op = 'select'
    }
    if (opts?.count) this._count = true
    if (opts?.head) this._head = true
    return this
  }

  insert(data: unknown) { this._op = 'insert'; this._payload = data; return this }
  update(data: unknown) { this._op = 'update'; this._payload = data; return this }
  upsert(data: unknown) { this._op = 'upsert'; this._payload = data; return this }
  delete() { this._op = 'delete'; return this }

  eq(field: string, value: unknown) { this.filters.push({ field, value: String(value) }); return this }
  neq(field: string, value: unknown) { this.filters.push({ field: `${field}_neq`, value: String(value) }); return this }
  in(_field: string, _values: unknown[]) { return this }
  or(_expr: string) { return this }
  filter(_field: string, _op: string, _value: unknown) { return this }
  gte(_field: string, _value: unknown) { return this }
  lte(_field: string, _value: unknown) { return this }
  ilike(_field: string, _value: string) { return this }
  contains(_field: string, _value: unknown) { return this }

  order(field: string, opts?: { ascending?: boolean }) {
    this._order = `${field}${opts?.ascending === false ? '.desc' : ''}`
    return this
  }

  limit(n: number) { this._limit = n; return this }
  single() { this._single = true; return this }
  maybeSingle() { this._single = true; return this }

  private async _exec(): Promise<{ data: unknown; error: unknown; count?: number }> {
    try {
      // SELECT
      if (this._op === 'select') {
        const params = new URLSearchParams({ table: this.table })
        for (const f of this.filters) params.set(f.field, f.value)
        if (this._single) params.set('single', 'true')
        if (this._count || this._head) params.set('count', 'true')
        if (this._limit) params.set('limit', String(this._limit))
        if (this._order) params.set('order', this._order)

        const res = await fetch(`/api/data?${params}`)
        const json = await res.json()
        if (this._count || this._head) return { data: null, error: null, count: json.count }
        return { data: json, error: null }
      }

      // INSERT / UPSERT
      if (this._op === 'insert' || this._op === 'upsert') {
        const rows = Array.isArray(this._payload) ? this._payload : [this._payload]
        const results = []
        for (const row of rows) {
          const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: this.table, data: row, upsert: this._op === 'upsert' }),
          })
          const json = await res.json()
          if (json.error) return { data: null, error: json.error }
          results.push(json)
        }
        if (this._single) return { data: results[0] || null, error: null }
        return { data: results.length === 1 ? results[0] : results, error: null }
      }

      // UPDATE
      if (this._op === 'update') {
        const idFilter = this.filters.find(f => f.field === 'id')
        if (!idFilter) {
          // Try user_id or other filters for settings-style updates
          const anyFilter = this.filters[0]
          if (!anyFilter) return { data: null, error: 'update requires at least one .eq() filter' }
          const res = await fetch('/api/data', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: this.table, filter: { [anyFilter.field]: anyFilter.value }, data: this._payload }),
          })
          const json = await res.json()
          return { data: json, error: json.error || null }
        }
        const res = await fetch('/api/data', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: this.table, id: idFilter.value, data: this._payload }),
        })
        const json = await res.json()
        return { data: json, error: json.error || null }
      }

      // DELETE
      if (this._op === 'delete') {
        const idFilter = this.filters.find(f => f.field === 'id')
        if (!idFilter) return { data: null, error: 'delete requires .eq("id", value)' }
        await fetch(`/api/data?table=${this.table}&id=${idFilter.value}`, { method: 'DELETE' })
        return { data: null, error: null }
      }

      return { data: null, error: 'Unknown operation' }
    } catch (error) {
      console.error(`DB client error (${this._op} ${this.table}):`, error)
      return { data: null, error }
    }
  }

  then(
    resolve: (value: { data: unknown; error: unknown; count?: number }) => void,
    reject?: (reason: unknown) => void
  ) {
    this._exec().then(resolve, reject)
  }
}

class StorageBuilder {
  private bucket: string
  constructor(bucket: string) { this.bucket = bucket }

  async upload(path: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', this.bucket === 'logos' ? 'logos' : 'products')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.error) return { data: null, error: json.error }
      return { data: { publicUrl: json.url }, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  getPublicUrl(path: string) {
    const cdn = 'estamply-cdn.b-cdn.net'
    return { data: { publicUrl: path.startsWith('http') ? path : `https://${cdn}/${path}` } }
  }
}

class DBClient {
  from(table: string) { return new QueryBuilder(table) }

  storage = { from: (bucket: string) => new StorageBuilder(bucket) }

  async rpc(fn: string) {
    if (fn === 'get_team_owner_id') {
      const res = await fetch('/api/me')
      const json = await res.json()
      return { data: json.ownerId, error: null }
    }
    return { data: null, error: `Unknown RPC: ${fn}` }
  }

  auth = {
    getUser: async () => {
      const res = await fetch('/api/me')
      const json = await res.json()
      if (json.error) return { data: { user: null }, error: json.error }
      return { data: { user: { id: json.ownerId, email: json.email || '' } }, error: null }
    },
    signInWithPassword: async (_: unknown) => ({ error: { message: 'Use NextAuth' } }),
    updateUser: async (_: unknown) => ({ error: { message: 'Use /api/change-password' } }),
  }
}

export function createClient() {
  return new DBClient()
}
