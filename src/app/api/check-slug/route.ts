import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ available: true })

  try {
    const all = await prisma.workshopSettings.findMany({ select: { settings: true } })
    const taken = all.some((ws: { settings: unknown }) => {
      const s = ws.settings as Record<string, unknown> | null
      return s?.catalog_slug === slug
    })
    return NextResponse.json({ available: !taken })
  } catch {
    // DB unreachable or empty — slug is available
    return NextResponse.json({ available: true })
  }
}
