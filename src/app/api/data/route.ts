import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getTeamOwnerId } from '@/lib/db/tenant'
import { NextRequest, NextResponse } from 'next/server'

// Model name mapping (client sends table name, we map to Prisma model)
const MODEL_MAP: Record<string, string> = {
  profiles: 'profile', workshop_settings: 'workshopSettings', tecnicas: 'tecnica',
  products: 'product', catalog_products: 'catalogProduct', categories: 'category',
  equipment: 'equipment', insumos: 'insumo', orders: 'order', presupuestos: 'presupuesto',
  clients: 'client', payments: 'payment', team_members: 'teamMember', suppliers: 'supplier',
  promotions: 'promotion', coupons: 'coupon', medios_pago: 'medioPago',
  guias_talles: 'guiaTalles', pedido_materiales: 'pedidoMaterial', operators: 'operator',
  stock_movements: 'stockMovement',
}

// Tables that anon can read (for public catalog, presupuestos, etc.)
const ANON_READ_TABLES = ['workshop_settings', 'profiles', 'catalog_products', 'categories', 'coupons', 'medios_pago', 'guias_talles', 'presupuestos', 'promotions']

// Field name mapping: snake_case from client → camelCase for Prisma
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}
function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
}

function mapFieldsToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[toCamel(k)] = v
  }
  return result
}

function mapFieldsToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[toSnake(k)] = v
  }
  return result
}

function mapArrayToSnake(arr: Record<string, unknown>[]): Record<string, unknown>[] {
  return arr.map(mapFieldsToSnake)
}

// GET: read data
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')
  if (!table) return NextResponse.json({ error: 'Missing table' }, { status: 400 })

  const modelName = MODEL_MAP[table]
  if (!modelName) return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })

  const session = await auth()
  const isAnon = !session?.user?.id

  if (isAnon && !ANON_READ_TABLES.includes(table)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const model = (prisma as unknown as Record<string, Record<string, Function>>)[modelName]
  if (!model) return NextResponse.json({ error: 'Model not found' }, { status: 500 })

  // Build where clause
  const where: Record<string, unknown> = {}

  // Tenant filter for authenticated users
  if (!isAnon) {
    const ownerId = await getTeamOwnerId(session.user.id)
    // Most tables filter by userId, profiles filter by userId or id
    if (table === 'profiles') {
      where.userId = ownerId
    } else {
      where.userId = ownerId
    }
  }

  // Additional filters from query params
  for (const [key, value] of searchParams.entries()) {
    if (['table', 'select', 'order', 'limit', 'single', 'count', 'head'].includes(key)) continue
    const camelKey = toCamel(key.replace('eq.', ''))
    if (value === 'true') where[camelKey] = true
    else if (value === 'false') where[camelKey] = false
    else where[camelKey] = value
  }

  // Handle special queries
  const isSingle = searchParams.get('single') === 'true'
  const isCount = searchParams.get('count') === 'true'
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
  const orderParam = searchParams.get('order')

  try {
    if (isCount) {
      const count = await model.count({ where })
      return NextResponse.json({ count })
    }

    if (isSingle) {
      const data = await model.findFirst({ where })
      return NextResponse.json(data ? mapFieldsToSnake(data as Record<string, unknown>) : null)
    }

    const orderBy: Record<string, string> | undefined = orderParam
      ? { [toCamel(orderParam.replace('.desc', '').replace('.asc', ''))]: orderParam.includes('.desc') ? 'desc' : 'asc' }
      : undefined

    const data = await model.findMany({ where, orderBy, take: limit })
    return NextResponse.json(mapArrayToSnake(data as Record<string, unknown>[]))
  } catch (error) {
    console.error(`Data API error (${table}):`, error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
}

// POST: insert data
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { table, data: rawData } = body
  if (!table || !rawData) return NextResponse.json({ error: 'Missing table or data' }, { status: 400 })

  const modelName = MODEL_MAP[table]
  if (!modelName) return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })

  const model = (prisma as unknown as Record<string, Record<string, Function>>)[modelName]
  const ownerId = await getTeamOwnerId(session.user.id)

  const camelData = mapFieldsToCamel(rawData)
  camelData.userId = ownerId

  try {
    const result = await model.create({ data: camelData })
    return NextResponse.json(mapFieldsToSnake(result as Record<string, unknown>))
  } catch (error) {
    console.error(`Data API insert error (${table}):`, error)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  }
}

// PATCH: update data
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { table, id, data: rawData } = body
  if (!table || !id || !rawData) return NextResponse.json({ error: 'Missing table, id, or data' }, { status: 400 })

  const modelName = MODEL_MAP[table]
  if (!modelName) return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })

  const model = (prisma as unknown as Record<string, Record<string, Function>>)[modelName]

  try {
    const result = await model.update({ where: { id }, data: mapFieldsToCamel(rawData) })
    return NextResponse.json(mapFieldsToSnake(result as Record<string, unknown>))
  } catch (error) {
    console.error(`Data API update error (${table}):`, error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// DELETE: delete data
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')
  const id = searchParams.get('id')
  if (!table || !id) return NextResponse.json({ error: 'Missing table or id' }, { status: 400 })

  const modelName = MODEL_MAP[table]
  if (!modelName) return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 })

  const model = (prisma as unknown as Record<string, Record<string, Function>>)[modelName]

  try {
    await model.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`Data API delete error (${table}):`, error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
