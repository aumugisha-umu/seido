import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 🛡️ MIDDLEWARE OPTIMISTE - SEIDO APP (Bonnes Pratiques 2025)
 *
 * Conformément aux bonnes pratiques Next.js 15 :
 * - Vérifications optimistes UNIQUEMENT (pas d'authentification réelle)
 * - Pas d'appels DB/API (performances)
 * - Redirection basée sur présence cookies seulement
 * - Authentification réelle déplacée vers DAL
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques (accessibles sans authentification)
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/signup-success',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/callback',
    '/auth/unauthorized',
    '/'
  ]

  // Si route publique, laisser passer
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Routes protégées - vérification optimiste uniquement
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isProtectedRoute) {
    // ✅ BONNE PRATIQUE 2025: Vérification optimiste seulement
    // Pas d'appel à supabase.auth.getUser() dans middleware (performance)
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some(cookie =>
      cookie.name.startsWith('sb-') &&
      cookie.value &&
      cookie.value.length > 20 // Plus strict pour éviter faux positifs
    )

    if (!hasAuthCookie) {
      // Redirection optimiste - l'authentification réelle se fait dans DAL
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Laisser passer - la vérification réelle se fait dans le DAL
    return NextResponse.next()
  }

  // Routes système/API → laisser passer
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
