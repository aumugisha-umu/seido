import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger, logError } from '@/lib/logger'

/**
 * 🛡️ MIDDLEWARE AUTHENTIFICATION RÉELLE - SEIDO APP (Best Practices 2025)
 *
 * Conformément aux recommandations officielles Next.js/Supabase :
 * - Authentification réelle avec supabase.auth.getUser()
 * - Rafraîchissement automatique des tokens
 * - Redirections serveur pour sécurité optimale
 * - Centralisé pour éviter conflits avec AuthGuard client
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

    try {
      // ✅ AUTHENTIFICATION RÉELLE: Vérifier et rafraîchir la session
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user || !user.email_confirmed_at) {
        console.log('🚫 [MIDDLEWARE] Authentication failed:', error?.message || 'No confirmed user')
        return NextResponse.redirect(new URL('/auth/login?reason=session_expired', request.url))
      }

      console.log('✅ [MIDDLEWARE] User authenticated:', user.id)

      // Optionnel: Vérification basique des rôles par URL
      const roleFromPath = pathname.split('/')[1] // admin, gestionnaire, etc.
      if (roleFromPath && ['admin', 'gestionnaire', 'locataire', 'prestataire'].includes(roleFromPath)) {
        // La vérification détaillée des rôles se fera dans les Server Components avec DAL
        console.log(`🔍 [MIDDLEWARE] Access to ${roleFromPath} section - detailed role check in Server Component`)
      }

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
