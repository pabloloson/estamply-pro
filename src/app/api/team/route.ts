import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verify inviter is an owner (not a team member)
    const isMember = await prisma.teamMember.findFirst({ where: { userId: session.user.id } })
    if (isMember) return NextResponse.json({ error: 'Solo el dueño del taller puede invitar usuarios' }, { status: 403 })

    const { nombre, email, password, permisos } = await req.json()
    if (!nombre || !email || !password) return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 12)
      user = await prisma.user.create({
        data: { email, name: nombre, password: hashedPassword },
      })
    }

    // Create team member record
    await prisma.teamMember.create({
      data: {
        ownerId: session.user.id, userId: user.id,
        nombre, email, rol: 'personalizado', estado: 'activo', permisos,
      },
    })

    return NextResponse.json({ ok: true, userId: user.id })
  } catch (e) {
    console.error('Team invite error:', e)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
