import { auth } from '@/auth'
import { upload, deleteFile } from '@/lib/bunny'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = (formData.get('type') as string) || (formData.get('bucket') as string) || 'products'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'El archivo excede el máximo de 5MB' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WebP' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${crypto.randomUUID()}.${ext}`
  const folder = type === 'logos' ? 'logos' : 'products'
  const path = `${folder}/${filename}`

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await upload(buffer, path)
    return NextResponse.json({ url, publicUrl: url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    const cdnHost = process.env.BUNNY_CDN_HOSTNAME || 'estamply-cdn.b-cdn.net'
    const path = url.replace(`https://${cdnHost}/`, '')
    if (!path || path === url) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })

    await deleteFile(path)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
