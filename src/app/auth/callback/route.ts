import { NextResponse } from 'next/server'

// OAuth callback is now handled by NextAuth at /api/auth/callback/[provider]
// This route redirects for backward compatibility
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return NextResponse.redirect(`${origin}/dashboard`)
}
