import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 🛡️ MIDDLEWARE SIMPLIFIÉ - SEIDO APP
 * 
 * Version ultra-simple qui se contente de :
 * - Vérifier si la route est protégée
 * - Détecter les cookies Supabase basiques  
 * - Rediriger vers login si nécessaire
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('🔐 [MIDDLEWARE-SIMPLE]', pathname)
  
  // Routes publiques (accessibles sans authentification)
  const publicRoutes = [
    '/auth/login', 
    '/auth/signup', 
    '/auth/signup-success', 
    '/auth/reset-password', 
    '/auth/callback', 
    '/'
  ]
  
  // Si route publique → vérifier si déjà connecté pour rediriger
  if (publicRoutes.includes(pathname)) {
    // Routes auth : rediriger si déjà connecté
    if (pathname.startsWith('/auth/')) {
      const cookies = request.cookies.getAll()
      const hasAuthCookie = cookies.some(cookie => 
        cookie.name.startsWith('sb-') && cookie.value && cookie.value.length > 0
      )
      
      if (hasAuthCookie) {
        // Essayer de récupérer le rôle depuis le JWT token dans les cookies
        let userRole = 'gestionnaire' // fallback par défaut
        
        try {
          // Chercher le cookie access token de Supabase
          const authTokenCookie = cookies.find(cookie => 
            cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
          )
          
          if (authTokenCookie && authTokenCookie.value) {
            // Le cookie contient un JSON avec access_token
            const authData = JSON.parse(authTokenCookie.value)
            if (authData.access_token) {
              // Décoder le JWT pour récupérer user_metadata
              const tokenPayload = JSON.parse(atob(authData.access_token.split('.')[1]))
              userRole = tokenPayload.user_metadata?.role || 'gestionnaire'
              console.log('🔍 [MIDDLEWARE-SIMPLE] Extracted role from token:', userRole)
            }
          }
        } catch (error) {
          console.log('⚠️ [MIDDLEWARE-SIMPLE] Could not extract role from token, using fallback')
        }
        
        const dashboardPath = `/${userRole}/dashboard`
        console.log('🔄 [MIDDLEWARE-SIMPLE] Auth page + existing session → REDIRECT to:', dashboardPath)
        return NextResponse.redirect(new URL(dashboardPath, request.url))
      }
    }
    
    console.log('✅ [MIDDLEWARE-SIMPLE] Public route')
    return NextResponse.next()
  }
  
  // Routes protégées
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  
  if (isProtectedRoute) {
    // Détection cookies Supabase simple
    const cookies = request.cookies.getAll()
    const hasAuthCookie = cookies.some(cookie => 
      cookie.name.startsWith('sb-') && cookie.value && cookie.value.length > 0
    )
    
    if (hasAuthCookie) {
      console.log('✅ [MIDDLEWARE-SIMPLE] Protected route + auth cookie → ALLOW')
      return NextResponse.next()
    } else {
      console.log('🚫 [MIDDLEWARE-SIMPLE] Protected route + no auth → REDIRECT to login')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }
  
  // Routes système/API → laisser passer
  console.log('✅ [MIDDLEWARE-SIMPLE] System route')
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
