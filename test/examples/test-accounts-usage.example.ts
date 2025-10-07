/**
 * Exemples d'utilisation des comptes de test standardisés
 * Format: arthur+XXX@seido.pm avec mot de passe Wxcvbn123
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TestAccountsHelper } from '../utils/test-accounts-helper'
import { TEST_ACCOUNTS_CONFIG, getTestAccountByRole } from '../config/test-accounts.config'

describe('Test Accounts Usage Examples', () => {
  beforeEach(() => {
    // Reset du compteur pour les tests
    TestAccountsHelper.resetCounter()
  })

  describe('Basic Account Generation', () => {
    it('should generate a test account with default suffix', () => {
      const account = TestAccountsHelper.generateTestAccount('gestionnaire')
      
      expect(account.email).toMatch(/^arthur\+\d{3}@seido\.pm$/)
      expect(account.password).toBe('Wxcvbn123')
      expect(account.role).toBe('gestionnaire')
      expect(account.name).toContain('Test Gestionnaire')
    })

    it('should generate a test account with custom suffix', () => {
      const account = TestAccountsHelper.generateCustomAccount('prestataire', '999')
      
      expect(account.email).toBe('arthur+999@seido.pm')
      expect(account.password).toBe('Wxcvbn123')
      expect(account.role).toBe('prestataire')
    })

    it('should validate test email format', () => {
      expect(TestAccountsHelper.isValidTestEmail('arthur+123@seido.pm')).toBe(true)
      expect(TestAccountsHelper.isValidTestEmail('arthur+000@seido.pm')).toBe(true)
      expect(TestAccountsHelper.isValidTestEmail('arthur@seido.pm')).toBe(false)
      expect(TestAccountsHelper.isValidTestEmail('test@example.com')).toBe(false)
    })
  })

  describe('Default Test Accounts', () => {
    it('should provide default test accounts for all roles', () => {
      const defaultAccounts = TestAccountsHelper.getDefaultTestAccounts()
      
      expect(defaultAccounts).toHaveLength(4)
      expect(defaultAccounts.map(a => a.role)).toEqual(['gestionnaire', 'prestataire', 'locataire', 'admin'])
      expect(defaultAccounts.map(a => a.suffix)).toEqual(['000', '001', '002', '003'])
    })

    it('should provide E2E test data', () => {
      const e2eData = TestAccountsHelper.getE2ETestData()
      
      expect(e2eData.gestionnaire.email).toBe('arthur+000@seido.pm')
      expect(e2eData.prestataire.email).toBe('arthur+001@seido.pm')
      expect(e2eData.locataire.email).toBe('arthur+002@seido.pm')
      expect(e2eData.admin.email).toBe('arthur+003@seido.pm')
    })
  })

  describe('Configuration Usage', () => {
    it('should use test accounts from configuration', () => {
      const gestionnaireAccount = getTestAccountByRole('gestionnaire')
      
      expect(gestionnaireAccount.email).toBe('arthur+000@seido.pm')
      expect(gestionnaireAccount.role).toBe('gestionnaire')
    })

    it('should provide integration test data', () => {
      const integrationData = TEST_ACCOUNTS_CONFIG.integration
      
      expect(integrationData.users).toHaveLength(4)
      expect(integrationData.teams).toHaveLength(2)
      expect(integrationData.properties).toHaveLength(2)
    })
  })

  describe('Multiple Account Generation', () => {
    it('should generate multiple accounts with incremental suffixes', () => {
      const accounts = TestAccountsHelper.generateMultipleAccounts(['gestionnaire', 'prestataire', 'locataire'])
      
      expect(accounts).toHaveLength(3)
      expect(accounts[0].suffix).toBe('000')
      expect(accounts[1].suffix).toBe('001')
      expect(accounts[2].suffix).toBe('002')
    })

    it('should maintain incremental counter across generations', () => {
      const account1 = TestAccountsHelper.generateTestAccount('gestionnaire')
      const account2 = TestAccountsHelper.generateTestAccount('prestataire')
      
      expect(account1.suffix).toBe('000')
      expect(account2.suffix).toBe('001')
    })
  })

  describe('Suffix Extraction', () => {
    it('should extract suffix from test email', () => {
      expect(TestAccountsHelper.extractSuffixFromEmail('arthur+123@seido.pm')).toBe('123')
      expect(TestAccountsHelper.extractSuffixFromEmail('arthur+000@seido.pm')).toBe('000')
      expect(TestAccountsHelper.extractSuffixFromEmail('arthur@seido.pm')).toBe(null)
    })
  })
})

// Exemple d'utilisation dans un test E2E
describe('E2E Test Example', () => {
  it('should login with test accounts', async () => {
    const testAccounts = TestAccountsHelper.getE2ETestData()
    
    // Simuler une connexion avec les comptes de test
    const loginData = {
      gestionnaire: {
        email: testAccounts.gestionnaire.email,
        password: testAccounts.gestionnaire.password
      },
      prestataire: {
        email: testAccounts.prestataire.email,
        password: testAccounts.prestataire.password
      }
    }
    
    expect(loginData.gestionnaire.email).toBe('arthur+000@seido.pm')
    expect(loginData.prestataire.email).toBe('arthur+001@seido.pm')
    expect(loginData.gestionnaire.password).toBe('Wxcvbn123')
    expect(loginData.prestataire.password).toBe('Wxcvbn123')
  })
})

// Exemple d'utilisation dans un test d'API
describe('API Test Example', () => {
  it('should test API with different user roles', async () => {
    const testAccounts = TEST_ACCOUNTS_CONFIG.default
    
    // Simuler des appels API avec différents rôles
    const apiCalls = testAccounts.map(account => ({
      user: account,
      endpoint: `/api/intervention`,
      expectedStatus: account.role === 'locataire' ? 200 : 403
    }))
    
    expect(apiCalls).toHaveLength(4)
    expect(apiCalls[0].user.role).toBe('gestionnaire')
    expect(apiCalls[1].user.role).toBe('prestataire')
  })
})

