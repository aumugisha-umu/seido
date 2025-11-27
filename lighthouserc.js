module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/auth/login',
        'http://localhost:3000/auth/signup',
      ],
      numberOfRuns: 1, // Test initial rapide
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 60000,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'interactive': ['warn', { maxNumericValue: 3000 }],
        'speed-index': ['warn', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        // Désactiver certaines assertions moins pertinentes pour une app privée
        'categories:accessibility': ['off'],
        'categories:best-practices': ['off'],
        'categories:seo': ['off'],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
