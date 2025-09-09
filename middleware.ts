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
  
  // Si route publique → laisser passer
  if (publicRoutes.includes(pathname)) {
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
