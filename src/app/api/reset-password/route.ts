import { prisma } from '@/lib/db/prisma'
import { sendPasswordReset } from '@/lib/email'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST: request password reset (sends email)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    // Don't reveal if user exists
    if (!user) return NextResponse.json({ ok: true })

    // Generate token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    })

    await sendPasswordReset(email, token)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT: actually reset the password with token
export async function PUT(req: NextRequest) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 })

    const record = await prisma.verificationToken.findUnique({ where: { token } })
    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: 'Link expirado o inválido' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { email: record.identifier }, data: { password: hashedPassword } })

    // Clean up token
    await prisma.verificationToken.delete({ where: { token } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reset password PUT error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
