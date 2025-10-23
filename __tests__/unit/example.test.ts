/**
 * Unit Test Example
 * Template de test unitaire selon les recommandations Next.js
 * @see https://nextjs.org/docs/app/building-your-application/testing/vitest
 */
import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Exemple de fonction à tester (à remplacer par vos vraies fonctions)
 */
function calculateTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

describe('calculateTotal', () => {
  it('devrait calculer le total correctement avec plusieurs items', () => {
    const items = [
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ]

    const result = calculateTotal(items)

    expect(result).toBe(35) // (10*2) + (5*3) = 35
  })

  it('devrait retourner 0 pour un tableau vide', () => {
    const result = calculateTotal([])
    expect(result).toBe(0)
  })

  it('devrait gérer les quantités à 0', () => {
    const items = [
      { price: 10, quantity: 0 },
      { price: 5, quantity: 2 },
    ]

    const result = calculateTotal(items)

    expect(result).toBe(10) // (10*0) + (5*2) = 10
  })
})

/**
 * 📝 Notes pour vos vrais tests:
 *
 * 1. Tests de services (lib/services/)
 *    - Mocker les appels Supabase avec vi.mock()
 *    - Tester la logique métier isolément
 *    - Éviter les tests asynchrones Server Components (préférer E2E)
 *
 * 2. Tests d'utilitaires (lib/utils, lib/validators)
 *    - Tester toutes les branches (if/else)
 *    - Tester les edge cases
 *    - Tests rapides et synchrones
 *
 * 3. Tests de hooks (hooks/)
 *    - Utiliser @testing-library/react-hooks si nécessaire
 *    - Mocker les contextes
 *    - Tester les effets de bord
 *
 * Exemple de mock Supabase:
 *
 * vi.mock('@/lib/services/core/supabase-client', () => ({
 *   createBrowserSupabaseClient: vi.fn(() => ({
 *     from: vi.fn(() => ({
 *       select: vi.fn(() => ({
 *         eq: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
 *       }))
 *     }))
 *   }))
 * }))
 */
