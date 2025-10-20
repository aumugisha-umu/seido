/**
 * Helper pour générer et gérer les comptes de test standardisés
 * Format: arthur+XXX@seido.pm avec mot de passe Wxcvbn123
 */

export interface TestAccount {
  email: string;
  password: string;
  role: 'gestionnaire' | 'prestataire' | 'locataire' | 'admin';
  name: string;
  suffix: string;
}

export class TestAccountsHelper {
  private static counter = 0;
  private static readonly STANDARD_PASSWORD = 'Wxcvbn123';
  private static readonly BASE_EMAIL = 'arthur+';
  private static readonly EMAIL_DOMAIN = '@seido.pm';

  /**
   * Génère un compte de test avec un suffixe incrémental
   */
  static generateTestAccount(role: TestAccount['role'], customSuffix?: string): TestAccount {
    const suffix = customSuffix || this.generateSuffix();
    const name = `Test ${this.capitalizeFirst(role)} ${suffix}`;
    
    return {
      email: `${this.BASE_EMAIL}${suffix}${this.EMAIL_DOMAIN}`,
      password: this.STANDARD_PASSWORD,
      role,
      name,
      suffix
    };
  }

  /**
   * Génère un suffixe à 3 chiffres incrémental
   */
  private static generateSuffix(): string {
    const suffix = this.counter.toString().padStart(3, '0');
    this.counter++;
    return suffix;
  }

  /**
   * Génère plusieurs comptes de test pour différents rôles
   */
  static generateMultipleAccounts(roles: TestAccount['role'][]): TestAccount[] {
    return roles.map(role => this.generateTestAccount(role));
  }

  /**
   * Génère les comptes de test standardisés par défaut
   */
  static getDefaultTestAccounts(): TestAccount[] {
    return [
      { role: 'gestionnaire', suffix: '000', name: 'Test Gestionnaire 000' },
      { role: 'prestataire', suffix: '001', name: 'Test Prestataire 001' },
      { role: 'locataire', suffix: '002', name: 'Test Locataire 002' },
      { role: 'admin', suffix: '003', name: 'Test Admin 003' }
    ].map(account => ({
      ...account,
      email: `${this.BASE_EMAIL}${account.suffix}${this.EMAIL_DOMAIN}`,
      password: this.STANDARD_PASSWORD
    }));
  }

  /**
   * Génère un compte de test pour un rôle spécifique avec un suffixe personnalisé
   */
  static generateCustomAccount(role: TestAccount['role'], suffix: string): TestAccount {
    return this.generateTestAccount(role, suffix);
  }

  /**
   * Valide qu'un email suit le format de test standardisé
   */
  static isValidTestEmail(_email: string): boolean {
    const pattern = /^arthur\+\d{3}@seido\.pm$/;
    return pattern.test(email);
  }

  /**
   * Extrait le suffixe d'un email de test
   */
  static extractSuffixFromEmail(_email: string): string | null {
    const match = email.match(/^arthur\+(\d{3})@seido\.pm$/);
    return match ? match[1] : null;
  }

  /**
   * Génère des données de test pour les tests E2E
   */
  static getE2ETestData() {
    return {
      gestionnaire: this.generateTestAccount('gestionnaire', '000'),
      prestataire: this.generateTestAccount('prestataire', '001'),
      locataire: this.generateTestAccount('locataire', '002'),
      admin: this.generateTestAccount('admin', '003')
    };
  }

  /**
   * Génère des données de test pour les tests d'intégration
   */
  static getIntegrationTestData() {
    return {
      users: this.getDefaultTestAccounts(),
      teams: [
        { id: 'team-001', name: 'Team Alpha' },
        { id: 'team-002', name: 'Team Beta' }
      ],
      properties: [
        { id: 'prop-001', name: 'Immeuble Test 1' },
        { id: 'prop-002', name: 'Immeuble Test 2' }
      ]
    };
  }

  /**
   * Reset le compteur pour les tests
   */
  static resetCounter(): void {
    this.counter = 0;
  }

  /**
   * Utilitaire pour capitaliser la première lettre
   */
  private static capitalizeFirst(_str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export des constantes utiles
export const TEST_ACCOUNTS = {
  STANDARD_PASSWORD: 'Wxcvbn123',
  EMAIL_PATTERN: /^arthur\+\d{3}@seido\.pm$/,
  DEFAULT_ROLES: ['gestionnaire', 'prestataire', 'locataire', 'admin'] as const
};

// Export des helpers pour les tests
export const testAccountHelpers = {
  /**
   * Génère un email de test avec un suffixe donné
   */
  generateTestEmail: (_suffix: string) => `arthur+${suffix}@seido.pm`,
  
  /**
   * Génère un nom d'utilisateur de test
   */
  generateTestName: (role: string, suffix: string) => `Test ${role} ${suffix}`,
  
  /**
   * Vérifie si un compte est un compte de test
   */
  isTestAccount: (_email: string) => TestAccountsHelper.isValidTestEmail(email)
};

