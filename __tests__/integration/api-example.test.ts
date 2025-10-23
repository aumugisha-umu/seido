/**
 * Integration Test Example - API Routes
 * Template de test d'intégration pour les API routes Next.js
 * @see https://nextjs.org/docs/app/building-your-application/testing/vitest
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 📝 Test d'intégration pour API Routes
 *
 * Ces tests vérifient que plusieurs composants fonctionnent ensemble:
 * - API route handler
 * - Service layer
 * - Database queries
 * - Validation (Zod)
 *
 * ⚠️ Important:
 * - Mocker les appels Supabase pour éviter de toucher la vraie DB
 * - Mocker les services externes (email, storage, etc.)
 * - Tester les cas d'erreur ET les cas de succès
 * - Vérifier les status codes HTTP
 * - Vérifier la structure des réponses JSON
 */

describe('API Routes Integration Tests (Example)', () => {
  beforeEach(() => {
    // Reset tous les mocks avant chaque test
    vi.clearAllMocks()
  })

  describe('POST /api/buildings', () => {
    it('devrait créer un building avec des données valides', async () => {
      // TODO: Implémenter le test quand vous êtes prêt
      // Ce test devrait:
      // 1. Mocker Supabase pour retourner un building créé
      // 2. Appeler la route API avec fetch ou une bibliothèque de test
      // 3. Vérifier le status code 201
      // 4. Vérifier que le building retourné a les bonnes propriétés

      expect(true).toBe(true) // Placeholder
    })

    it('devrait retourner 400 avec des données invalides', async () => {
      // TODO: Test de validation
      // Envoyer des données invalides et vérifier l'erreur 400

      expect(true).toBe(true) // Placeholder
    })

    it('devrait retourner 401 sans authentification', async () => {
      // TODO: Test d'authentification
      // Appeler sans token et vérifier erreur 401

      expect(true).toBe(true) // Placeholder
    })
  })
})

/**
 * 📚 Ressources pour vos vrais tests d'intégration:
 *
 * 1. Mocker Supabase:
 *    vi.mock('@/lib/services/core/supabase-client')
 *
 * 2. Tester une API route:
 *    - Importer le handler: import { POST } from '@/app/api/buildings/route'
 *    - Créer un Request mock: new Request('http://localhost/api/buildings', { ... })
 *    - Appeler: const response = await POST(request)
 *    - Assert: expect(response.status).toBe(201)
 *
 * 3. Libraries utiles:
 *    - node-mocks-http: pour mocker req/res
 *    - msw: pour mocker les requêtes HTTP
 *
 * 4. Exemples de ce qu'il faut tester:
 *    - /api/buildings (CRUD buildings)
 *    - /api/lots (CRUD lots)
 *    - /api/interventions (workflow interventions)
 *    - /api/quote-requests (gestion devis)
 *    - /api/auth/* (authentification)
 */
