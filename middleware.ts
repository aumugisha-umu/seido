import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { canProceedWithMiddlewareCheck } from '@/lib/auth-coordination-dal'
import { getRateLimiterForRoute, getClientIdentifier } from '@/lib/rate-limit'

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
 *
 * 🚦 RATE LIMITING (22 oct. 2025)
 * - Protection contre brute force et DoS attacks
 * - Rate limits différenciés par type de route
 * - Upstash Redis (production) + fallback in-memory (dev)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🚦 RATE LIMITING: Appliquer sur toutes les routes API
  if (pathname.startsWith('/api/')) {
    try {
      const ratelimiter = getRateLimiterForRoute(pathname)
      const identifier = getClientIdentifier(request)

      const { success, limit, remaining, reset } = await ratelimiter.limit(identifier)

      // Ajouter les headers de rate limit dans tous les cas
      const headers = new Headers()
      headers.set('X-RateLimit-Limit', limit.toString())
      headers.set('X-RateLimit-Remaining', remaining.toString())
      headers.set('X-RateLimit-Reset', new Date(reset).toISOString())

      if (!success) {
        console.warn(`[RATE-LIMIT] ⚠️  Limit exceeded for ${pathname} (${identifier})`)
        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: new Date(reset).toISOString()
          }),
          {
            status: 429,
            headers: {
              ...Object.fromEntries(headers),
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
            }
          }
        )
      }

      // Si rate limit OK, continuer avec les headers
      // Note: Les headers seront ajoutés à la response finale
      request.headers.set('x-ratelimit-limit', limit.toString())
      request.headers.set('x-ratelimit-remaining', remaining.toString())
      request.headers.set('x-ratelimit-reset', new Date(reset).toISOString())
    } catch (error) {
      console.error('[RATE-LIMIT] ❌ Error checking rate limit:', error)
      // En cas d'erreur, laisser passer la requête (fail-open pour éviter de bloquer le service)
    }
  }

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
