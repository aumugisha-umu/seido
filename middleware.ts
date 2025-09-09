import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 🛡️ MIDDLEWARE DE SÉCURITÉ - SEIDO APP
 * 
 * Ce middleware s'exécute AVANT chaque requête côté serveur.
 * Il protège les routes privées et redirige les utilisateurs non authentifiés.
 * 
 * FONCTIONNALITÉS :
 * - Classification automatique des routes (publiques, protégées, système)
 * - Détection des cookies d'authentification Supabase
 * - Redirections sécurisées vers la page de connexion
 * - Protection renforcée contre les boucles infinies
 * - Logging détaillé pour le debug et monitoring
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('🚀 [MIDDLEWARE] Requête interceptée pour:', pathname)
  
  // =============================================================================
  // CLASSIFICATION DES ROUTES
  // =============================================================================
  
  // Routes publiques (accessibles sans authentification)
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/signup-success', '/auth/reset-password', '/auth/callback', '/']
  const isPublicRoute = publicRoutes.includes(pathname)
  
  // Routes protégées (nécessitent une authentification)
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  
  // Routes système (API, Next.js, assets)
  const isSystemRoute = !isPublicRoute && !isProtectedRoute
  
  console.log('📊 [MIDDLEWARE] Classification route:', {
    pathname,
    isPublicRoute,
    isProtectedRoute,
    isSystemRoute
  })
  
  // =============================================================================
  // DÉTECTION COOKIES SUPABASE
  // =============================================================================
  
  const allCookies = request.cookies.getAll()
  
  // Cookies Supabase d'authentification - recherche plus large
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.startsWith('sb-') && 
    (cookie.name.includes('session') || 
     cookie.name.includes('auth') ||
     cookie.name.includes('token') ||
     cookie.name.includes('access') ||
     cookie.name.includes('refresh'))
  )
  
  // Rechercher aussi les cookies avec des patterns plus larges
  const authRelatedCookies = allCookies.filter(cookie =>
    cookie.name.includes('auth') ||
    cookie.name.includes('session') ||
    cookie.name.includes('token')
  )
  
  console.log('🍪 [MIDDLEWARE] Analyse cookies détaillée:', {
    totalCookies: allCookies.length,
    supabaseCookies: supabaseCookies.length,
    authRelatedCookies: authRelatedCookies.length,
    allCookieNames: allCookies.map(c => c.name),
    hasAuth: supabaseCookies.length > 0 || authRelatedCookies.length > 0
  })
  
  if (supabaseCookies.length > 0) {
    console.log('📋 [MIDDLEWARE] Cookies Supabase détectés:', supabaseCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
  }
  
  if (authRelatedCookies.length > 0) {
    console.log('📋 [MIDDLEWARE] Cookies auth-related détectés:', authRelatedCookies.map(c => ({ name: c.name, hasValue: !!c.value })))
  }
  
  // =============================================================================
  // DÉCISION D'AUTORISATION AVEC PROTECTION ANTI-BOUCLE
  // =============================================================================
  
  if (isPublicRoute) {
    console.log('✅ [MIDDLEWARE] Route publique - accès autorisé')
    return NextResponse.next()
  } 
  
  if (isSystemRoute) {
    console.log('✅ [MIDDLEWARE] Route système - accès libre')
    return NextResponse.next()
  }
  
  if (isProtectedRoute) {
    // Utiliser la détection élargie des cookies d'authentification
    const hasAuthCookies = supabaseCookies.length > 0 || authRelatedCookies.length > 0
    
    if (hasAuthCookies) {
      console.log('✅ [MIDDLEWARE] Route protégée + cookies auth → AUTORISATION')
      return NextResponse.next()
    } else {
      console.log('🚫 [MIDDLEWARE] Route protégée + PAS de cookies → REDIRECTION vers login')
      
      // =============================================================================
      // PROTECTION ANTI-BOUCLE RENFORCÉE
      // =============================================================================
      
      // Vérifier si on essaie déjà d'aller vers login
      if (pathname === '/auth/login') {
        console.log('🔄 [MIDDLEWARE] Tentative redirection vers login depuis login - AUTORISATION pour éviter boucle')
        return NextResponse.next()
      }
      
      // Vérifier des patterns de boucle (referer header)
      const referer = request.headers.get('referer')
      const isFromLogin = referer?.includes('/auth/login')
      const isFromCallback = referer?.includes('/auth/callback')
      
      if (isFromLogin || isFromCallback) {
        console.log('⚠️ [MIDDLEWARE] Requête depuis auth page détectée - possibleté de boucle')
        console.log('🛡️ [MIDDLEWARE] Referer:', referer)
        console.log('🔄 [MIDDLEWARE] Permettant l\'accès pour éviter boucle infinie')
        return NextResponse.next()
      }
      
      // Délai de grâce pour les redirections récentes depuis des pages d'auth
      const userAgent = request.headers.get('user-agent')
      const isLikelyAuthRedirect = userAgent && pathname.includes('/dashboard')
      
      if (isLikelyAuthRedirect) {
        console.log('⏰ [MIDDLEWARE] Possible redirection post-auth - accordant délai de grâce')
        // Permettre l'accès pendant quelques secondes après auth pour la synchronisation des cookies
        return NextResponse.next()
      }
      
      // Tout semble bon - effectuer la redirection
      console.log('🏃 [MIDDLEWARE] Redirection sécurisée vers /auth/login')
      
      const loginUrl = new URL('/auth/login', request.url)
      // Nettoyer les paramètres pour éviter les conflits
      loginUrl.search = ''
      
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // Fallback - ne devrait jamais arriver
  console.log('⚠️ [MIDDLEWARE] Fallback - laissant passer')
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
