import { auth } from "@/auth"
import { NextResponse } from "next/server"

const APP_HOST = 'app.estamply.app'
const LANDING_HOST = 'estamply.app'

// Routes that belong to the app (served on app.estamply.app)
const appRoutes = [
  '/login', '/signup', '/register', '/onboarding',
  '/dashboard', '/cotizador', '/presupuesto', '/orders', '/clients',
  '/materiales', '/equipamiento', '/tecnicas', '/settings',
  '/estadisticas', '/promociones', '/catalogo', '/cuenta',
  '/planes', '/admin', '/base-de-costos', '/compras',
  '/estrategia-precios', '/insumos', '/insumos-equipos',
  '/inventario', '/reglas-de-venta',
]

// Routes that belong to the landing (served on estamply.app)
const landingRoutes = ['/', '/br', '/precios', '/features', '/blog', '/contacto', '/legal', '/privacidad']

// Prefixes that are always public (on both domains)
const publicPrefixes = ['/p/', '/api/', '/legal/']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const host = (req.headers.get('host') || '').toLowerCase()
  const isAppSubdomain = host.startsWith('app.')
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const isWww = host.startsWith('www.')
  const isLoggedIn = !!req.auth

  // ── www.estamply.app → estamply.app (301) ──
  if (isWww) {
    const url = new URL(req.url)
    url.hostname = LANDING_HOST
    url.port = ''
    return NextResponse.redirect(url, 301)
  }

  // ── Landing domain (estamply.app) ──
  if (!isAppSubdomain && !isLocalhost) {
    const isAppRoute = appRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))

    if (isAppRoute) {
      const appUrl = new URL(req.url)
      appUrl.hostname = APP_HOST
      appUrl.port = ''
      if (pathname === '/register') appUrl.pathname = '/signup'
      return NextResponse.redirect(appUrl, 301)
    }

    // Everything else on the landing domain passes through (/, /br, /precios, etc.)
    return NextResponse.next()
  }

  // ── App subdomain (app.estamply.app) or localhost ──

  // Redirect landing-only routes to landing domain
  if (!isLocalhost && landingRoutes.includes(pathname)) {
    const landingUrl = new URL(req.url)
    landingUrl.hostname = LANDING_HOST
    landingUrl.port = ''
    return NextResponse.redirect(landingUrl, 301)
  }

  // Admin routes: skip middleware, let layout handle
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  // Public prefixes (/p/, /api/) always pass through
  const isPublicPrefix = publicPrefixes.some(prefix => pathname.startsWith(prefix))
  if (isPublicPrefix) return NextResponse.next()

  // Auth pages: public but redirect to dashboard if already logged in
  const isAuthPage = pathname === '/login' || pathname === '/signup'
  if (isAuthPage) {
    return isLoggedIn
      ? NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      : NextResponse.next()
  }

  // Onboarding is public (accessed right after signup)
  if (pathname === '/onboarding') return NextResponse.next()

  // Catalogo routes on app subdomain are public
  if (pathname.startsWith('/catalogo')) return NextResponse.next()

  // Everything else requires auth
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
