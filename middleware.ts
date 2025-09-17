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
    // Routes auth : rediriger si déjà connecté (SAUF /auth/callback qui doit s'exécuter)
    if (pathname.startsWith('/auth/') && pathname !== '/auth/callback') {
      const cookies = request.cookies.getAll()
      const hasAuthCookie = cookies.some(cookie => 
        cookie.name.startsWith('sb-') && cookie.value && cookie.value.length > 0
      )
      
      console.log('🔍 [MIDDLEWARE-SIMPLE] Auth route detected:', pathname, 'hasAuthCookie:', hasAuthCookie)
      console.log('🔍 [MIDDLEWARE-SIMPLE] All cookies:', cookies.map(c => ({ 
        name: c.name, 
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
        isSupabase: c.name.startsWith('sb-')
      })))
      
      if (hasAuthCookie) {
        // Essayer de récupérer le rôle depuis le JWT token dans les cookies
        let userRole = 'gestionnaire' // fallback par défaut
        
        try {
          // Chercher le cookie access token de Supabase - nom correct
          const authTokenCookie = cookies.find(cookie => 
            cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
          )
          
          console.log('🔍 [MIDDLEWARE-SIMPLE] Auth token cookie search result:', {
            found: !!authTokenCookie,
            cookieName: authTokenCookie?.name,
            hasValue: !!authTokenCookie?.value,
            totalSupabaseCookies: cookies.filter(c => c.name.startsWith('sb-')).length
          })
          
          if (authTokenCookie && authTokenCookie.value) {
            console.log('🔍 [MIDDLEWARE-SIMPLE] Raw cookie value preview:', {
              cookieValue: authTokenCookie.value.substring(0, 100) + '...'
            })
            
            let authData
            let rawCookieValue = authTokenCookie.value
            
            try {
              // Si le cookie commence par "base64-", enlever ce préfixe et décoder
              if (rawCookieValue.startsWith('base64-')) {
                console.log('🔍 [MIDDLEWARE-SIMPLE] Cookie has base64- prefix, removing and decoding...')
                const base64Content = rawCookieValue.substring(7) // Enlever "base64-"
                rawCookieValue = atob(base64Content)
                console.log('✅ [MIDDLEWARE-SIMPLE] Successfully decoded base64 cookie')
              }
              
              // Parser le JSON résultant
              authData = JSON.parse(rawCookieValue)
            } catch (parseError) {
              console.log('⚠️ [MIDDLEWARE-SIMPLE] Cookie parsing failed:', {
                error: parseError.message,
                cookieStart: authTokenCookie.value.substring(0, 30),
                hasBase64Prefix: authTokenCookie.value.startsWith('base64-')
              })
              throw parseError
            }
            
            console.log('🔍 [MIDDLEWARE-SIMPLE] Auth data parsed:', {
              hasAccessToken: !!authData.access_token,
              hasRefreshToken: !!authData.refresh_token,
              accessTokenPreview: authData.access_token ? authData.access_token.substring(0, 50) + '...' : 'none'
            })
            
            if (authData.access_token) {
              // Décoder le JWT pour récupérer user_metadata
              const tokenPayload = JSON.parse(atob(authData.access_token.split('.')[1]))
              const extractedRole = tokenPayload.user_metadata?.role
              userRole = extractedRole || 'gestionnaire'
              
              console.log('🔍 [MIDDLEWARE-SIMPLE] Token payload decoded:', {
                sub: tokenPayload.sub,
                email: tokenPayload.email,
                userMetadata: tokenPayload.user_metadata,
                rawRole: extractedRole,
                finalRole: userRole,
                roleWasFound: !!extractedRole
              })
              
              if (!extractedRole) {
                console.log('⚠️ [MIDDLEWARE-SIMPLE] No role in user_metadata! Using fallback:', userRole)
              }
            } else {
              console.log('⚠️ [MIDDLEWARE-SIMPLE] No access_token in auth data!')
            }
          }
        } catch (error) {
          console.log('⚠️ [MIDDLEWARE-SIMPLE] Could not extract role from token:', {
            error: error.message,
            fallbackRole: userRole,
            cookiesAvailable: cookies.length
          })
        }
        
        const dashboardPath = `/${userRole}/dashboard`
        console.log('🔄 [MIDDLEWARE-SIMPLE] Auth page + existing session → REDIRECT to:', {
          detectedRole: userRole,
          targetPath: dashboardPath,
          originalPath: pathname,
          timestamp: new Date().toISOString(),
          redirectUrl: new URL(dashboardPath, request.url).toString()
        })
        
        // ✅ AMÉLIORATION SaaS : Headers pour coordination avec client
        const redirectResponse = NextResponse.redirect(new URL(dashboardPath, request.url))
        redirectResponse.headers.set('x-auth-redirect', 'true')
        redirectResponse.headers.set('x-redirect-from', pathname)
        redirectResponse.headers.set('x-redirect-to', dashboardPath)
        redirectResponse.headers.set('x-user-role', userRole)
        
        console.log('✅ [MIDDLEWARE-SIMPLE] Redirect response created with coordination headers')
        return redirectResponse
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
      
      // ✅ AMÉLIORATION SaaS : Headers informatifs pour le client
      const response = NextResponse.next()
      response.headers.set('x-auth-status', 'authenticated')
      response.headers.set('x-route-type', 'protected')
      
      return response
    } else {
      console.log('🚫 [MIDDLEWARE-SIMPLE] Protected route + no auth → REDIRECT to login')
      
      // ✅ AMÉLIORATION SaaS : Headers pour coordination avec client
      const redirectResponse = NextResponse.redirect(new URL('/auth/login', request.url))
      redirectResponse.headers.set('x-auth-redirect', 'true')
      redirectResponse.headers.set('x-redirect-reason', 'unauthenticated')
      redirectResponse.headers.set('x-redirect-from', pathname)
      redirectResponse.headers.set('x-redirect-to', '/auth/login')
      
      return redirectResponse
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
