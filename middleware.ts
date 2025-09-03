import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// MIDDLEWARE TEMPORAIREMENT DÉSACTIVÉ POUR NETTOYAGE
// Suppression de toutes les redirections automatiques pour éviter les conflits
// Routes auth mises à jour : /auth/login, /auth/signup, /auth/reset-password

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Pour l'instant, on laisse passer toutes les requêtes
  // TODO: Réactiver la protection après nettoyage de l'auth
  // Nouvelles routes publiques: ['/auth/login', '/auth/signup', '/auth/reset-password', '/']
  console.log('🚧 Middleware désactivé - Accès libre à toutes les routes')
  
  return response
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
