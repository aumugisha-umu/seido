import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Edge Runtime Compatible Middleware for Supabase Auth
 *
 * This implementation uses simple cookie-based authentication checking
 * without importing Supabase SSR which is not compatible with Edge Runtime
 */

export async function updateSessionEdge(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log(`🛡️ [MIDDLEWARE-EDGE] Processing: ${pathname}`)

  // Allow auth routes to proceed without interference
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    console.log(`🔓 [MIDDLEWARE-EDGE] Allowing auth route: ${pathname}`)
    return NextResponse.next()
  }

  // Define protected routes
  const protectedRoutes = [
    '/admin',
    '/gestionnaire',
    '/prestataire',
    '/locataire',
    '/dashboard'
  ]

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (!isProtectedRoute) {
    console.log(`🔓 [MIDDLEWARE-EDGE] Public route, allowing: ${pathname}`)
    return NextResponse.next()
  }

  // Check for Supabase session cookies
  const cookies = request.cookies
  const authCookies = Array.from(cookies.getAll()).filter(cookie =>
    cookie.name.startsWith('sb-') && (
      cookie.name.includes('auth-token') ||
      cookie.name.includes('session') ||
      cookie.name.includes('access-token')
    )
  )

  console.log(`🍪 [MIDDLEWARE-EDGE] Found ${authCookies.length} auth cookies for protected route`)

  if (authCookies.length === 0) {
    console.log(`🚫 [MIDDLEWARE-EDGE] No auth cookies found, redirecting to login`)
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Check if we have a valid session token structure
  const sessionTokens = authCookies.filter(cookie =>
    cookie.value && cookie.value.length > 50 // Reasonable token length check
  )

  if (sessionTokens.length === 0) {
    console.log(`🚫 [MIDDLEWARE-EDGE] Invalid session tokens, redirecting to login`)
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  console.log(`✅ [MIDDLEWARE-EDGE] Valid session detected, allowing access to: ${pathname}`)
  return NextResponse.next()
}

/**
 * Simple role-based redirect helper (Edge Runtime compatible)
 */
export function getDefaultDashboardPath(_cookies: unknown): string {
  // Try to extract role from a safe cookie or use default
  const roleCookie = cookies.get('seido-user-role')
  if (roleCookie?.value) {
    switch (roleCookie.value) {
      case 'admin':
        return '/admin/dashboard'
      case 'gestionnaire':
        return '/gestionnaire/dashboard'
      case 'prestataire':
        return '/prestataire/dashboard'
      case 'locataire':
        return '/locataire/dashboard'
    }
  }

  // Default fallback
  return '/gestionnaire/dashboard'
}
