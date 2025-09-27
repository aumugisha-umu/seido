// Critical polyfills for Edge Runtime compatibility
if (typeof self === 'undefined') {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).self = globalThis
  } else if (typeof global !== 'undefined') {
    (global as any).self = global
  }
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Seido Supabase Middleware Helper
 * Updates the session and handles authentication refresh
 * Simplified approach to avoid Edge Runtime conflicts
 */
export async function updateSession(request: NextRequest) {
  // Initialize response
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    // Create Supabase client with cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh session if exists and return response
    const { data: { user }, error } = await supabase.auth.getUser()

    // Handle authentication for protected routes
    return handleRouteProtection(request, user, supabaseResponse)
  } catch (error) {
    // Fallback: Simple cookie-based auth check
    return handleRouteProtectionFallback(request, supabaseResponse)
  }
}

function handleRouteProtection(request: NextRequest, user: any, response: NextResponse) {
  const { pathname } = request.nextUrl
  const protectedRoutes = [
    '/dashboard',
    '/admin',
    '/gestionnaire',
    '/prestataire',
    '/locataire'
  ]

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = pathname.startsWith('/auth/')

  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated user accesses auth pages
  if (isAuthRoute && user && pathname !== '/auth/logout') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/gestionnaire'
    return NextResponse.redirect(url)
  }

  return response
}

function handleRouteProtectionFallback(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl
  const protectedRoutes = [
    '/dashboard',
    '/admin',
    '/gestionnaire',
    '/prestataire',
    '/locataire'
  ]

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Simple fallback: check for Supabase auth cookies
  const authCookies = request.cookies.getAll().filter(cookie =>
    cookie.name.startsWith('sb-') &&
    (cookie.name.includes('auth') || cookie.name.includes('session'))
  )

  // Redirect to login if accessing protected route without auth cookies
  if (isProtectedRoute && authCookies.length === 0) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return response
}