'use server'

import { signIn, signOut } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import bcrypt from "bcryptjs"
import { AuthError } from "next-auth"
import { sendWelcome } from "@/lib/email"

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" }
    }
    throw error
  }
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return { error: "Ya existe una cuenta con este email" }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { email, name: fullName, password: hashedPassword },
    })

    await prisma.profile.create({
      data: {
        id: user.id,
        userId: user.id,
        email: user.email,
        fullName,
        onboardingCompleted: false,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        plan: 'pro',
        planStatus: 'trial',
      },
    })

    // Send welcome email (fire-and-forget)
    sendWelcome(email, fullName || '').catch(() => {})

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/onboarding",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Error al crear la cuenta" }
    }
    throw error
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" })
}
