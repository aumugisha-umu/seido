/**
 * Configuration centralisée pour l'environnement de test
 * Garantit l'utilisation consistante du port 3000 partout
 */

const TEST_CONFIG = {
  // Port principal pour tous les tests
  PORT: 3000,

  // URL de base pour tous les tests
  BASE_URL: 'http://localhost:3000',

  // Ports alternatifs à nettoyer (historique)
  PORTS_TO_CLEAN: [3000, 3001, 3002, 3003, 3004, 3005, 3006],

  // Timeouts
  TIMEOUTS: {
    SERVER_START: 120000, // 2 minutes pour démarrer le serveur
    NAVIGATION: 30000,    // 30 secondes pour navigation
    ACTION: 15000,        // 15 secondes pour actions
    AUTH: 10000,          // 10 secondes pour authentification
    API_RESPONSE: 5000,   // 5 secondes pour réponse API
  },

  // Accounts de test
  TEST_ACCOUNTS: {
    gestionnaire: {
      email: 'arthur@umumentum.com',
      password: 'Wxcvbn123',
      expectedRedirect: '/gestionnaire/dashboard'
    },
    prestataire: {
      email: 'arthur+prest@seido.pm',
      password: 'Wxcvbn123',
      expectedRedirect: '/prestataire/dashboard'
    },
    locataire: {
      email: 'arthur+loc@seido.pm',
      password: 'Wxcvbn123',
      expectedRedirect: '/locataire/dashboard'
    },
    admin: {
      email: 'arthur+admin@seido.pm',
      password: 'Wxcvbn123',
      expectedRedirect: '/admin/dashboard'
    }
  },

  // Configuration Playwright
  PLAYWRIGHT: {
    outputDir: './test/test-results',
    reportDir: './test/reports',
    tracesDir: './test/traces',
    screenshotsDir: './test/screenshots',
    videosDir: './test/videos',
  },

  // Configuration Vitest
  VITEST: {
    setupFiles: ['./test/setup.ts'],
    coverage: {
      reportsDirectory: './test/coverage'
    }
  },

  // Environnement
  ENV: {
    CI: process.env.CI === 'true',
    DEBUG: process.env.DEBUG === 'true',
    HEADLESS: process.env.HEADLESS !== 'false',
  }
};

// Export for CommonJS and ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TEST_CONFIG;
}

export default TEST_CONFIG;