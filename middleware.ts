import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 🛡️ MIDDLEWARE ULTRA-SIMPLIFIÉ - SEIDO APP
 *
 * Version minimaliste qui se contente de :
 * - Classification des routes (publique/protégée)
 * - Détection cookies Supabase basique UNIQUEMENT
 * - Redirection simple sans parsing JWT
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('🔐 [MIDDLEWARE-ULTRA-SIMPLE]', pathname)

  // Routes publiques (accessibles sans authentification)
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/signup-success',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/callback',
    '/'
  ]

  // Si route publique, laisser passer (plus de redirection depuis middleware)
  if (publicRoutes.includes(pathname)) {
    console.log('✅ [MIDDLEWARE-ULTRA-SIMPLE] Public route - pass through')
    return NextResponse.next()
  }

  // Routes protégées - vérification simple
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isProtectedRoute) {
    // ✅ DÉTECTION SIMPLE : Juste vérifier présence cookies Supabase
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some(cookie =>
      cookie.name.startsWith('sb-') && cookie.value && cookie.value.length > 10
    )

    console.log('🔍 [MIDDLEWARE-ULTRA-SIMPLE] Protected route check:', {
      pathname,
      hasAuthCookie,
      totalCookies: cookies.length,
      supabaseCookies: cookies.filter(c => c.name.startsWith('sb-')).length
    })

    if (hasAuthCookie) {
      console.log('✅ [MIDDLEWARE-ULTRA-SIMPLE] Protected route + auth cookie → ALLOW')
      return NextResponse.next()
    } else {
      console.log('🚫 [MIDDLEWARE-ULTRA-SIMPLE] Protected route + no auth → REDIRECT to login')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Routes système/API → laisser passer
  console.log('✅ [MIDDLEWARE-ULTRA-SIMPLE] System/API route')
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
