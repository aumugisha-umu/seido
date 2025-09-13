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
          // Chercher le cookie access token de Supabase
          const authTokenCookie = cookies.find(cookie => 
            cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
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
            try {
              // Le cookie contient un JSON avec access_token
              authData = JSON.parse(authTokenCookie.value)
            } catch (parseError) {
              console.log('⚠️ [MIDDLEWARE-SIMPLE] Cookie JSON parse failed, trying base64 decode:', {
                error: parseError.message,
                cookieStart: authTokenCookie.value.substring(0, 20)
              })
              
              // Si le cookie est base64 encodé, le décoder d'abord
              try {
                const decodedValue = atob(authTokenCookie.value)
                authData = JSON.parse(decodedValue)
                console.log('✅ [MIDDLEWARE-SIMPLE] Successfully decoded base64 cookie')
              } catch (base64Error) {
                console.log('❌ [MIDDLEWARE-SIMPLE] Base64 decode also failed:', base64Error.message)
                throw parseError // Garder l'erreur originale
              }
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
        
        const redirectResponse = NextResponse.redirect(new URL(dashboardPath, request.url))
        console.log('✅ [MIDDLEWARE-SIMPLE] Redirect response created successfully')
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
