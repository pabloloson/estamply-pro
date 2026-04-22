import { auth } from "@/auth"
import { NextResponse } from "next/server"

const APP_HOST = 'app.estamply.app'

const publicRoutes = ['/', '/login', '/signup', '/onboarding', '/br']
const publicPrefixes = ['/p/', '/catalogo/', '/api/auth/', '/api/catalog-order', '/api/validate-coupon', '/api/webhooks/', '/api/stripe/']

export default auth((req) => {
  const { pathname } = req.nextUrl
  const host = (req.headers.get('host') || '').toLowerCase()
  const isAppSubdomain = host.startsWith('app.')
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const isLoggedIn = !!req.auth

  // Main domain — redirect app routes to app subdomain
  if (!isAppSubdomain && !isLocalhost) {
    const appRedirectRoutes = ['/login', '/signup', '/register', '/admin', '/dashboard',
      '/cotizador', '/presupuesto', '/orders', '/clients', '/materiales',
      '/equipamiento', '/tecnicas', '/settings', '/estadisticas', '/promociones', '/onboarding']
    const shouldRedirectToApp = appRedirectRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))

    if (shouldRedirectToApp) {
      const appUrl = new URL(req.url)
      appUrl.hostname = APP_HOST
      appUrl.port = ''
      if (pathname === '/register') appUrl.pathname = '/signup'
      return NextResponse.redirect(appUrl, 301)
    }
    return NextResponse.next()
  }

  // App subdomain / localhost — auth logic
  // Admin routes: skip middleware, let layout handle
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  const isPublicRoute = publicRoutes.includes(pathname)
  const isPublicPrefix = publicPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isPublicRoute || isPublicPrefix) {
    if (isLoggedIn && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
    }
    return NextResponse.next()
  }

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
