import { auth } from '@/auth'
import { getTeamOwnerId } from '@/lib/db/tenant'
import { seedDemoData, cleanDemoData } from '@/lib/demo-data'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST: seed demo data
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const ownerId = await getTeamOwnerId(session.user.id)

  const { techniques } = await req.json()
  if (!techniques?.length) return NextResponse.json({ error: 'No techniques' }, { status: 400 })

  try {
    await seedDemoData(ownerId, techniques)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Seed demo data error:', error)
    return NextResponse.json({ error: 'Failed to seed' }, { status: 500 })
  }
}

// DELETE: clean demo data
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const ownerId = await getTeamOwnerId(session.user.id)

  try {
    await cleanDemoData(ownerId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Clean demo data error:', error)
    return NextResponse.json({ error: 'Failed to clean' }, { status: 500 })
  }
}
