import { auth } from '@/auth'
import { uploadFile } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const bucket = formData.get('bucket') as string
  const path = formData.get('path') as string

  if (!file || !bucket || !path) {
    return NextResponse.json({ error: 'Missing file, bucket, or path' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const publicUrl = await uploadFile(bucket, path, buffer)

  return NextResponse.json({ publicUrl })
}
