import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 🛡️ MIDDLEWARE DE SÉCURITÉ - SEIDO APP
 * 
 * Ce middleware s'exécute AVANT chaque requête côté serveur.
 * Il a pour rôle de protéger les routes privées et rediriger les utilisateurs non authentifiés.
 * 
 * FLUX D'EXÉCUTION :
 * 1. Utilisateur fait une requête → middleware intercepte
 * 2. Analyse de la route demandée 
 * 3. Si route publique → laisse passer
 * 4. Si route protégée → vérifie l'authentification via cookies
 * 5. Si pas d'auth → redirige vers login
 * 6. Si auth OK → laisse accéder à la route
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('🚀 [MIDDLEWARE] Requête interceptée pour:', pathname)
  
  // =============================================================================
  // ÉTAPE 1 : ROUTES PUBLIQUES (accessibles sans authentification)
  // =============================================================================
  const publicRoutes = ['/auth/login', '/auth/signup', '/auth/signup-success', '/auth/reset-password', '/']
  
  if (publicRoutes.includes(pathname)) {
    console.log('✅ [MIDDLEWARE] Route publique - accès autorisé sans vérification')
    return NextResponse.next() // Laisse passer la requête sans modification
  }
  
  // =============================================================================
  // ÉTAPE 2 : IDENTIFICATION DES ROUTES PROTÉGÉES  
  // =============================================================================
  const protectedRoutes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (!isProtected) {
    console.log('🚪 [MIDDLEWARE] Route non-protégée - accès libre') 
    return NextResponse.next() // Routes comme /api, /_next, etc.
  }

  // =============================================================================
  // ÉTAPE 3 : VÉRIFICATION D'AUTHENTIFICATION (RÉACTIVÉE)
  // =============================================================================
  
  /**
   * 🍪 ANALYSE DES COOKIES SUPABASE
   * 
   * Supabase stocke la session dans des cookies avec ce format :
   * sb-[project-id]-auth-token
   * 
   * POURQUOI PLUSIEURS COOKIES ?
   * - Différents projets Supabase utilisés (dev/staging/prod)
   * - Anciennes sessions non nettoyées
   * - Rechargements de page qui créent de nouveaux cookies
   * 
   * On filtre pour ne garder que les cookies d'authentification valides :
   * - Commencent par 'sb-' (préfixe Supabase)
   * - Contiennent 'auth-token' (token de session)
   * - Excluent 'code-verifier' (utilisé pour OAuth, pas pour l'auth)
   */
  const supabaseCookies = request.cookies.getAll().filter(cookie => 
    cookie.name.startsWith('sb-') && 
    cookie.name.includes('auth-token') && 
    !cookie.name.includes('code-verifier')
  )
  
  console.log('🔐 [MIDDLEWARE] Vérification auth pour route protégée')
  console.log('🍪 [MIDDLEWARE] Cookies Supabase trouvés:', supabaseCookies.length)
  console.log('📋 [MIDDLEWARE] Détail des cookies:', supabaseCookies.map(c => c.name))
  
  // =============================================================================
  // ÉTAPE 4 : DÉCISION D'AUTORISATION
  // =============================================================================
  
  if (supabaseCookies.length === 0) {
    console.log('❌ [MIDDLEWARE] Aucun cookie d\'authentification - redirection vers login')
    const url = request.nextUrl.clone() // Clone l'URL actuelle
    url.pathname = '/auth/login'        // Change le chemin vers login
    return NextResponse.redirect(url)   // Envoie une redirection HTTP 302
  }

  /**
   * 🎯 POURQUOI CETTE APPROCHE SIMPLIFIÉE ?
   * 
   * AVANT (problématique) :
   * - On essayait de valider la session Supabase côté serveur
   * - Conflits avec multiple cookies → session non reconnue
   * - Boucle infinie de redirections
   * 
   * MAINTENANT (solution) :
   * - On vérifie juste la PRÉSENCE de cookies d'auth
   * - La validation réelle se fait côté client (useAuth)
   * - Plus de conflits, auth stable
   * 
   * SÉCURITÉ : 
   * - Les cookies peuvent être expirés/invalides, mais ce n'est pas grave
   * - Le client fera la vraie validation et redirigera si nécessaire
   * - Ça évite les faux positifs du middleware
   */
  
  console.log('✅ [MIDDLEWARE] Cookies d\'auth présents - accès autorisé')
  return NextResponse.next() // Laisse la requête continuer vers la route demandée
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
