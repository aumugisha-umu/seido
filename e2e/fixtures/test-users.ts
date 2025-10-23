/**
 * Test Users Fixtures
 * Utilisateurs de test pour les E2E tests
 * @see https://playwright.dev/docs/test-fixtures
 */

export interface TestUser {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
}

/**
 * Utilisateurs de test pour E2E
 * ⚠️ Ces utilisateurs doivent exister dans la base de données de test Supabase
 */
export const testUsers = {
  gestionnaire: {
    email: 'test-gestionnaire@seido-test.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Gestionnaire',
    role: 'gestionnaire' as const,
  },
  prestataire: {
    email: 'test-prestataire@seido-test.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Prestataire',
    role: 'prestataire' as const,
  },
  locataire: {
    email: 'test-locataire@seido-test.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Locataire',
    role: 'locataire' as const,
  },
  admin: {
    email: 'test-admin@seido-test.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin' as const,
  },
} as const

/**
 * Helper pour générer un email unique pour les tests d'inscription
 */
export function generateUniqueEmail(role: string): string {
  const timestamp = Date.now()
  return `test-${role}-${timestamp}@seido-test.com`
}

/**
 * Helper pour récupérer un utilisateur de test par rôle
 */
export function getTestUser(role: keyof typeof testUsers): TestUser {
  return testUsers[role]
}
