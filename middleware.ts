import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger, logError } from '@/lib/logger'
import { getUserProfileForMiddleware, getDashboardPath } from '@/lib/auth-dal'
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
        // Marquer que le middleware a vérifié
        response.cookies.set('middleware-check', 'true', { maxAge: 5 })
        return NextResponse.redirect(new URL('/auth/login?reason=session_expired', request.url))
      }

      // ✅ VÉRIFICATION EMAIL CONFIRMÉ
      if (!user.email_confirmed_at) {
        console.log('📧 [MIDDLEWARE] Email not confirmed for user:', user.email)
        return NextResponse.redirect(new URL('/auth/login?reason=email_not_confirmed', request.url))
      }

      console.log('✅ [MIDDLEWARE] User authenticated:', user.id)

      // 🛡️ PHASE 2.5: VÉRIFICATION PROFIL + RÔLE MULTI-COUCHES
      const userProfile = await getUserProfileForMiddleware(user.id)

      // 🛡️ CHECK 1: Profil existe dans la table users
      if (!userProfile) {
        console.log('⚠️ [MIDDLEWARE] Auth user exists but no profile in DB:', user.email)
        return NextResponse.redirect(new URL('/auth/login?reason=no_profile', request.url))
      }

      // 🛡️ CHECK 2: Compte actif
      if (userProfile.is_active === false) {
        console.log('⚠️ [MIDDLEWARE] User account is deactivated:', userProfile.email)
        return NextResponse.redirect(new URL('/auth/unauthorized?reason=account_inactive', request.url))
      }

      // 🛡️ CHECK 3: Password configuré (onboarding terminé)
      if (userProfile.password_set === false && pathname !== '/auth/set-password') {
        console.log('📝 [MIDDLEWARE] Password not set, redirecting to onboarding:', userProfile.email)
        return NextResponse.redirect(new URL('/auth/set-password', request.url))
      }

      // 🛡️ CHECK 4: Rôle correspond à la section accédée
      const roleFromPath = pathname.split('/')[1] // admin, gestionnaire, etc.
      if (roleFromPath && ['admin', 'gestionnaire', 'locataire', 'prestataire'].includes(roleFromPath)) {
        if (userProfile.role !== roleFromPath) {
          console.log(`⚠️ [MIDDLEWARE] Role mismatch: ${userProfile.role} trying to access ${roleFromPath}`)
          const correctDashboard = getDashboardPath(userProfile.role)
          return NextResponse.redirect(new URL(correctDashboard, request.url))
        }
        console.log(`✅ [MIDDLEWARE] Role check passed: ${userProfile.role} accessing ${roleFromPath}`)
      }

      // 🛡️ CHECK 5: Utilisateur a une équipe assignée
      console.log('🔍 [MIDDLEWARE] Checking team membership...')

      const { data: userTeams, error: teamError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userProfile.id)
        .limit(1)

      if (teamError) {
        console.error('❌ [MIDDLEWARE] Team query error:', teamError)
        return NextResponse.redirect(new URL('/auth/unauthorized?reason=team_query_error', request.url))
      }

      if (!userTeams || userTeams.length === 0) {
        console.log('⚠️ [MIDDLEWARE] User has no team:', userProfile.email)
        return NextResponse.redirect(new URL('/auth/unauthorized?reason=no_team', request.url))
      }

      console.log(`✅ [MIDDLEWARE] User belongs to team: ${userTeams[0].team_id}`)

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
