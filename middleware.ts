import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const APP_HOST = 'app.estamply.app'
const MAIN_HOSTS = ['estamply.app', 'www.estamply.app']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''
  const isMainDomain = MAIN_HOSTS.some(h => host === h || host.startsWith(`${h}:`))
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')

  // ── MAIN DOMAIN (estamply.app): landing + public routes only ──
  if (isMainDomain && !isLocalhost) {
    const landingRoutes = ['/', '/br', '/catalogo/', '/p/', '/terms', '/privacy']
    const isLandingRoute = landingRoutes.some(r => r === pathname || pathname.startsWith(r))

    if (isLandingRoute) {
      return supabaseResponse // Serve landing/public content
    }

    // Redirect auth/app routes to app subdomain
    const appUrl = new URL(request.url)
    appUrl.hostname = APP_HOST
    appUrl.port = '' // Remove port for production

    // Map /register to /signup on app subdomain
    if (pathname === '/register') {
      appUrl.pathname = '/signup'
    }

    return NextResponse.redirect(appUrl, 301)
  }

  // ── APP SUBDOMAIN (app.estamply.app) or LOCALHOST: normal auth logic ──

  // Admin routes: skip middleware, let layout handle auth
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Public routes on app subdomain
  const publicRoutes = ['/', '/login', '/signup', '/auth/callback', '/onboarding', '/p/', '/catalogo/']
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
