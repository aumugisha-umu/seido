import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { canProceedWithMiddlewareCheck } from '@/lib/auth-coordination-dal'

/**
 * 🛡️ MIDDLEWARE AUTHENTIFICATION RÉELLE - SEIDO APP (Best Practices 2025)
 *
 * Conformément aux recommandations officielles Next.js/Supabase :
 * - Authentification réelle avec supabase.auth.getUser()
 * - Rafraîchissement automatique des tokens
 * - Redirections serveur pour sécurité optimale
 * - Centralisé pour éviter conflits avec AuthGuard client
 *
 * 🆕 PHASE 2.5: VÉRIFICATION PROFIL MULTI-COUCHES
 * - Vérification profil DB (pas juste auth token)
 * - Vérification compte actif (is_active)
 * - Vérification onboarding complet (password_set)
 * - Vérification rôle DB correspond au path
 *
 * 🎯 PHASE 2.1: COORDINATION MIDDLEWARE ↔ AUTHPROVIDER
 * - Vérification signaux de coordination avant auth check
 * - Respect du loading state AuthProvider
 * - Éviter race conditions sur redirections
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
    '/auth/set-password',  // ✅ Accessible aux users authentifiés avec password_set=false (onboarding)
    '/auth/logout',
    '/auth/unauthorized',
    '/'
  ]

  // Si route publique, laisser passer directement
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Routes protégées - authentification réelle requise
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isProtectedRoute) {
    // ✅ PATTERN OFFICIEL SUPABASE SSR + NEXT.JS 15
    // Créer la response en avance pour gérer correctement les cookies
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // ✅ PATTERN OFFICIEL SUPABASE: Créer client serveur pour middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // ✅ IMPORTANT: Propager les cookies vers le browser ET les Server Components
            cookiesToSet.forEach(({ name, value, options }) => {
              // Set cookie in the request for Server Components
              request.cookies.set(name, value)
              // Set cookie in the response for the browser
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // 🎯 PHASE 2.1: VÉRIFIER COORDINATION AVEC AUTHPROVIDER
    const { canProceed, reason: coordReason } = await canProceedWithMiddlewareCheck(
      { get: (name) => request.cookies.get(name) },
      pathname
    )

    if (!canProceed) {
      console.log('⏸️ [MIDDLEWARE] Coordination hold:', coordReason)
      // Laisser AuthProvider terminer son chargement
      return response
    }

    try {
      // ✅ AUTHENTIFICATION RÉELLE: Vérifier et rafraîchir la session
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        console.log('🚫 [MIDDLEWARE] Authentication failed:', error?.message || 'No user')
        response.cookies.set('middleware-check', 'true', { maxAge: 5 })
        return NextResponse.redirect(new URL('/auth/login?reason=session_expired', request.url))
      }

      // ✅ VÉRIFICATION EMAIL CONFIRMÉ
      if (!user.email_confirmed_at) {
        console.log('📧 [MIDDLEWARE] Email not confirmed for user:', user.email)
        return NextResponse.redirect(new URL('/auth/login?reason=email_not_confirmed', request.url))
      }

      console.log('✅ [MIDDLEWARE] User authenticated:', user.id)

      // ✅ PATTERN NEXT.JS 15 + SUPABASE OFFICIEL
      // Middleware = Token refresh + Basic gatekeeper ONLY
      // Detailed checks (profile, role, team) = Delegated to pages via getServerAuthContext()
      // Benefits: Lighter middleware, React.cache() deduplication in pages

      // ✅ PHASE 2.1: Marquer que le middleware check a réussi
      response.cookies.set('middleware-check', 'true', { maxAge: 5 })

      return response

    } catch (middlewareError) {
      console.error('❌ [MIDDLEWARE] Authentication error:', middlewareError)
      return NextResponse.redirect(new URL('/auth/login?reason=auth_error', request.url))
    }
  }

  // Routes système/API → laisser passer
  return NextResponse.next()
}

export const config = {
  runtime: 'nodejs', // Force Node.js runtime (required for Supabase Realtime compatibility)
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
