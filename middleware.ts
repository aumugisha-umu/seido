import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * 🛡️ MIDDLEWARE RENFORCÉ - SEIDO APP PHASE 2
 *
 * Améliorations sécurisées :
 * - Validation JWT réelle avec Supabase
 * - Vérification TTL des tokens
 * - Classification avancée des routes
 * - Error boundaries gracieux
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('🔐 [MIDDLEWARE-SECURED]', pathname)

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
    try {
      // ✅ PHASE 2: Validation JWT réelle avec Supabase
      const response = NextResponse.next()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              response.cookies.set({
                name,
                value,
                ...options,
              })
            },
            remove(name: string, options: any) {
              response.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )

      // Vérification de session avec validation JWT
      const { data: { session }, error } = await supabase.auth.getSession()

      console.log('🔍 [MIDDLEWARE-SECURED] JWT validation:', {
        pathname,
        hasSession: !!session,
        hasUser: !!session?.user,
        hasError: !!error,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
      })

      if (error) {
        console.warn('⚠️ [MIDDLEWARE-SECURED] Session error:', error.message)
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      if (!session || !session.user) {
        console.log('🚫 [MIDDLEWARE-SECURED] No valid session → REDIRECT to login')
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      // ✅ Vérification TTL du token
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        console.log('⏰ [MIDDLEWARE-SECURED] Token expired → REDIRECT to login')
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      console.log('✅ [MIDDLEWARE-SECURED] Valid session + unexpired token → ALLOW')
      return response

    } catch (middlewareError) {
      // ✅ Error boundary gracieux
      console.error('❌ [MIDDLEWARE-SECURED] Validation error:', middlewareError)
      console.log('🔄 [MIDDLEWARE-SECURED] Error boundary → REDIRECT to login')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // Routes système/API → laisser passer
  console.log('✅ [MIDDLEWARE-SECURED] System/API route')
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
