/**
 * Configuration des comptes de test standardisés pour SEIDO
 * Utilise le format arthur+XXX@seido.pm avec mot de passe Wxcvbn123
 */

import { TestAccountsHelper } from '../utils/test-accounts-helper'

// Configuration des comptes de test par environnement
export const TEST_ACCOUNTS_CONFIG = {
  // Comptes de test par défaut (toujours disponibles)
  default: TestAccountsHelper.getDefaultTestAccounts(),
  
  // Comptes pour les tests E2E
  e2e: TestAccountsHelper.getE2ETestData(),
  
  // Comptes pour les tests d'intégration
  integration: TestAccountsHelper.getIntegrationTestData(),
  
  // Configuration par rôle pour les tests spécifiques
  byRole: {
    gestionnaire: TestAccountsHelper.generateTestAccount('gestionnaire', '000'),
    prestataire: TestAccountsHelper.generateTestAccount('prestataire', '001'),
    locataire: TestAccountsHelper.generateTestAccount('locataire', '002'),
    admin: TestAccountsHelper.generateTestAccount('admin', '003')
  }
}

// Variables d'environnement pour les tests
export const TEST_ENV_VARS = {
  TEST_USER_GESTIONNAIRE_EMAIL: 'arthur+000@seido.pm',
  TEST_USER_PRESTATAIRE_EMAIL: 'arthur+001@seido.pm',
  TEST_USER_LOCATAIRE_EMAIL: 'arthur+002@seido.pm',
  TEST_USER_ADMIN_EMAIL: 'arthur+003@seido.pm',
  TEST_PASSWORD: 'Wxcvbn123'
}

// Configuration Playwright pour les tests E2E
export const PLAYWRIGHT_TEST_CONFIG = {
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000'),
  testAccounts: TEST_ACCOUNTS_CONFIG.e2e
}

// Configuration Vitest pour les tests unitaires
export const VITEST_TEST_CONFIG = {
  testAccounts: TEST_ACCOUNTS_CONFIG.default,
  mockData: {
    users: TEST_ACCOUNTS_CONFIG.default,
    teams: [
      { id: 'team-001', name: 'Team Alpha' },
      { id: 'team-002', name: 'Team Beta' }
    ],
    properties: [
      { id: 'prop-001', name: 'Immeuble Test 1' },
      { id: 'prop-002', name: 'Immeuble Test 2' }
    ]
  }
}

// Helper pour valider les comptes de test
export const validateTestAccount = (email: string, password: string): boolean => {
  return TestAccountsHelper.isValidTestEmail(email) && password === 'Wxcvbn123'
}

// Helper pour obtenir un compte de test par rôle
export const getTestAccountByRole = (role: 'gestionnaire' | 'prestataire' | 'locataire' | 'admin') => {
  return TEST_ACCOUNTS_CONFIG.byRole[role]
}

// Helper pour générer des comptes de test supplémentaires
export const generateAdditionalTestAccounts = (count: number) => {
  const accounts = []
  for (let i = 0; i < count; i++) {
    const suffix = (100 + i).toString().padStart(3, '0')
    accounts.push(TestAccountsHelper.generateTestAccount('gestionnaire', suffix))
  }
  return accounts
}

