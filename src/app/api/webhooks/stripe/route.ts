// Redirect old webhook path to new flat path
import { NextRequest } from 'next/server'
import { POST as handler } from '../../stripe-webhook/route'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return handler(req)
}
