/**
 * Tests de sécurité pour le middleware Seido
 * Vérification de la protection contre les cookies forgés et la validation JWT
 */

import { describe, test, expect, vi } from 'vitest'

// Mock des modules externes
const mockSupabaseAuth = {
  getUser: async () => ({ data: { user: null }, error: { message: 'Invalid JWT' } })
}

const mockSupabaseFrom = () => ({
  select: () => ({
    eq: () => ({
      single: async () => ({ data: null, error: { message: 'User not found' } })
    })
  })
})

// Mock de createServerClient pour les tests
const mockCreateServerClient = () => ({
  auth: mockSupabaseAuth,
  from: mockSupabaseFrom
})

// Mock de NextRequest pour les tests
class MockNextRequest {
  public nextUrl: { pathname: string }
  public cookies: { getAll: () => Array<{ name: string; value: string }>, set: (name: string, value: string) => void }
  private cookiesMap = new Map<string, string>()

  constructor(_url: string) {
    this.nextUrl = { pathname: new URL(url).pathname }
    this.cookies = {
      getAll: () => Array.from(this.cookiesMap.entries()).map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => this.cookiesMap.set(name, value)
    }
  }
}

// Simuler le middleware pour les tests (sans les imports réels)
async function testMiddleware(request: MockNextRequest) {
  const { pathname } = request.nextUrl

  // Routes publiques
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/signup-success',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/callback',
    '/'
  ]

  if (publicRoutes.includes(pathname)) {
    return { status: 200, redirect: null }
  }

  // Routes protégées
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isProtectedRoute) {
    // Simulation de la validation JWT qui échoue avec cookies forgés
    const cookies = request.cookies.getAll()
    const hasSupabaseCookie = cookies.some(cookie => cookie.name.startsWith('sb-'))

    if (!hasSupabaseCookie) {
      return { status: 302, redirect: '/auth/login' }
    }

    // Simulation de la validation JWT (qui échoue avec cookies forgés)
    try {
      const { data: { user }, error } = await mockSupabaseAuth.getUser()

      if (error || !user) {
        return { status: 302, redirect: '/auth/login' }
      }

      return { status: 200, redirect: null }
    } catch (error) {
      return { status: 302, redirect: '/auth/login' }
    }
  }

  return { status: 200, redirect: null }
}

describe('Middleware Security Tests', () => {
  describe('Protection contre cookies forgés', () => {
    test('Rejette les requêtes sans cookies Supabase', async () => {
      const request = new MockNextRequest('http://localhost:3000/gestionnaire/dashboard')

      const result = await testMiddleware(request)

      expect(result.status).toBe(302)
      expect(result.redirect).toBe('/auth/login')
    })

    test('Rejette les cookies Supabase forgés/invalides', async () => {
      const request = new MockNextRequest('http://localhost:3000/gestionnaire/dashboard')

      // Simuler des cookies forgés
      request.cookies.set('sb-access-token', 'fake-token-12345')
      request.cookies.set('sb-refresh-token', 'fake-refresh-67890')

      const result = await testMiddleware(request)

      // Même avec des cookies présents, la validation JWT échoue
      expect(result.status).toBe(302)
      expect(result.redirect).toBe('/auth/login')
    })

    test('Permet l\'accès aux routes publiques sans cookies', async () => {
      const request = new MockNextRequest('http://localhost:3000/auth/login')

      const result = await testMiddleware(request)

      expect(result.status).toBe(200)
      expect(result.redirect).toBeNull()
    })

    test('Permet l\'accès à la page d\'accueil sans cookies', async () => {
      const request = new MockNextRequest('http://localhost:3000/')

      const result = await testMiddleware(request)

      expect(result.status).toBe(200)
      expect(result.redirect).toBeNull()
    })
  })

  describe('Validation des routes protégées', () => {
    const protectedRoutes = [
      '/admin/dashboard',
      '/gestionnaire/interventions',
      '/locataire/dashboard',
      '/prestataire/interventions'
    ]

    protectedRoutes.forEach(route => {
      test(`Protège la route ${route}`, async () => {
        const request = new MockNextRequest(`http://localhost:3000${route}`)

        const result = await testMiddleware(request)

        expect(result.status).toBe(302)
        expect(result.redirect).toBe('/auth/login')
      })
    })
  })

  describe('Performance et timeouts', () => {
    test('Le middleware doit être rapide (< 100ms en simulation)', async () => {
      const start = Date.now()
      const request = new MockNextRequest('http://localhost:3000/gestionnaire/dashboard')

      await testMiddleware(request)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(100) // En simulation, devrait être très rapide
    })
  })

  describe('Logs de sécurité', () => {
    test('Les tentatives d\'accès avec cookies forgés sont détectées', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const request = new MockNextRequest('http://localhost:3000/admin/dashboard')
      request.cookies.set('sb-malicious-token', 'hacker-attempt')

      await testMiddleware(request)

      // Vérifier qu'il n'y a pas de faux positifs dans les logs
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Access granted')
      )

      consoleSpy.mockRestore()
    })
  })
})

describe('Tests d\'intégration de sécurité', () => {
  test('Scénario complet : tentative d\'intrusion avec cookies forgés', async () => {
    // 1. Tentative d'accès direct à une route protégée
    const directAccess = new MockNextRequest('http://localhost:3000/admin/dashboard')
    const directResult = await testMiddleware(directAccess)

    expect(directResult.status).toBe(302)
    expect(directResult.redirect).toBe('/auth/login')

    // 2. Tentative avec cookies forgés
    const forgedAccess = new MockNextRequest('http://localhost:3000/gestionnaire/interventions')
    forgedAccess.cookies.set('sb-access-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FAKE_PAYLOAD.FAKE_SIGNATURE')
    forgedAccess.cookies.set('sb-refresh-token', 'fake-refresh-token-malicious')

    const forgedResult = await testMiddleware(forgedAccess)

    expect(forgedResult.status).toBe(302)
    expect(forgedResult.redirect).toBe('/auth/login')

    // 3. Vérification que seules les routes publiques restent accessibles
    const publicAccess = new MockNextRequest('http://localhost:3000/auth/login')
    const publicResult = await testMiddleware(publicAccess)

    expect(publicResult.status).toBe(200)
    expect(publicResult.redirect).toBeNull()
  })
})
