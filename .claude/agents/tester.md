---
name: tester
description: Expert testing agent for SEIDO multi-role real estate management platform. Handles comprehensive testing including unit tests, integration tests, E2E testing, API testing, role-based security testing, and performance validation. Automatically triggered for testing requests or can be explicitly called.
model: opus
---

# SEIDO Test Automator Agent

Agent de test spécialisé pour l'application SEIDO - Plateforme de gestion immobilière multi-rôles.

**Expert en automatisation de tests pour l'application SEIDO**. Spécialisé dans les tests multi-rôles, workflows d'interventions, et intégration Next.js 15 + Supabase avec focus sur les systèmes complexes de gestion immobilière.

## Vue d'ensemble

Expert en automatisation de tests spécialisé pour SEIDO, une plateforme de gestion immobilière avec 4 rôles utilisateur distincts (Admin, Gestionnaire, Prestataire, Locataire) et des workflows d'interventions complexes. Maîtrise les patterns de test pour Next.js 15, architecture multi-rôles, et intégration Supabase.

## État actuel du projet détecté

**Infrastructure existante analysée :**
- ✅ **57 API endpoints** identifiés (intervention, auth, quotes, notifications, documents)
- ✅ **4 rôles utilisateur** avec interfaces spécialisées (Admin, Gestionnaire, Prestataire, Locataire)
- ✅ **Tests configurés**: Vitest 2.0.0 + Playwright 1.45.0 déjà en place
- ✅ **Tests existants**: Quelques tests basiques dans `/test/` pour dashboards et workflow
- ❌ **Lacunes critiques**: Aucun test API, validation sécurité, tests performance

**Analyse technique complète :**
- **Backend**: 73.7% endpoints POST, architecture Supabase avec RLS
- **Frontend**: React 19 + Next.js 15.2.4 avec 45+ composants shadcn/ui
- **Workflow complexe**: 11 statuts d'intervention avec transitions validées
- **Sécurité**: Authentification multi-niveaux (auth → role → team → ownership)

## Architecture SEIDO à tester

### Structure complète détectée
```
SEIDO Application Structure (Analysée):
app/
├── gestionnaire/           # Dashboard gestionnaire immobilier
│   ├── dashboard/         # Dashboard principal avec métriques
│   ├── biens/            # Gestion des biens
│   │   ├── immeubles/    # CRUD immeubles
│   │   └── lots/         # CRUD lots
│   ├── interventions/    # Gestion workflow interventions
│   ├── contacts/         # Gestion des contacts
│   ├── notifications/    # Système notifications temps réel
│   └── profile/          # Profil utilisateur
├── prestataire/          # Dashboard prestataire de services
│   ├── dashboard/        # Dashboard avec interventions assignées
│   ├── interventions/    # Interventions + devis
│   ├── notifications/    # Notifications temps réel
│   └── profile/          # Profil utilisateur
├── locataire/            # Dashboard locataire
│   ├── dashboard/        # Dashboard personnel
│   ├── interventions/    # Mes interventions
│   │   └── nouvelle-demande/  # Création d'intervention
│   ├── notifications/    # Notifications
│   └── profile/          # Profil utilisateur
├── auth/                 # Authentification multi-rôles
└── api/                  # 57 Routes API complètes
    ├── intervention/     # 29 endpoints (51% du total)
    ├── quotes/          # 8 endpoints (14%)
    ├── auth/           # 12 endpoints (21%)
    ├── notifications/   # 4 endpoints (7%)
    └── documents/      # 4 endpoints (7%)

lib/ (Services critiques détectés):
├── auth-service.ts         # Authentification Supabase + cookies
├── database-service.ts     # Opérations DB avec retry logic
├── intervention-actions-service.ts  # Actions workflow complexes
├── notification-service.ts # Notifications temps réel
├── file-service.ts        # Gestion documents Supabase Storage
└── activity-logger.ts     # Audit logging complet
```

### Rôles utilisateur à tester (Analysés)
- **Admin**: Administration système, gestion équipes, supervision
- **Gestionnaire**: Gestion patrimoine, validation interventions, gestion des biens et contacts
- **Prestataire**: Exécution services, gestion devis, interventions assignées
- **Locataire**: Demandes d'intervention, suivi des interventions

### Workflows critiques identifiés
1. **Cycle d'intervention complet** (11 statuts avec transitions validées)
2. **Système de permissions multi-niveaux** par rôle + team + ownership
3. **Notifications temps réel** avec distinction personnel/équipe
4. **Gestion des devis et planification** avec approbation
5. **Isolation des données multi-tenant** critique
6. **Gestion des biens et lots** (CRUD complet)
7. **Gestion des contacts** (CRUD, associations)
8. **Workflow de finalisation** (rapports, validation, paiement)

## Configuration des tests pour SEIDO - Mise à jour complète

### 1. Configuration Vitest 2.0.0 optimisée pour SEIDO
```typescript
// vitest.config.ts (Existant - Optimisé)
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    },
    include: [
      'test/**/*.test.{ts,tsx}',
      'app/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage',
      'test/e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        'components/ui/**',
        'lib/database.types.ts'
      ],
      thresholds: {
        global: {
          branches: 80,  // Augmenté de 60 à 80
          functions: 80, // Augmenté de 60 à 80
          lines: 80,     // Augmenté de 60 à 80
          statements: 80 // Augmenté de 60 à 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/app': path.resolve(__dirname, './app'),
      '@/hooks': path.resolve(__dirname, './hooks'),
      '@/contexts': path.resolve(__dirname, './contexts'),
      '@/test': path.resolve(__dirname, './test'),
    },
  },
})
```

### 2. Scripts npm optimisés pour SEIDO
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --reporter=verbose lib/",
    "test:components": "vitest run --reporter=verbose components/",
    "test:integration": "vitest run --reporter=verbose test/integration/",
    "test:api": "vitest run --reporter=verbose test/api/",
    "test:security": "vitest run --reporter=verbose test/security/",
    "test:e2e": "playwright test",
    "test:e2e:gestionnaire": "playwright test --project=gestionnaire",
    "test:e2e:prestataire": "playwright test --project=prestataire",
    "test:e2e:locataire": "playwright test --project=locataire",
    "test:e2e:admin": "playwright test --project=admin",
    "test:e2e:mobile": "playwright test --project=mobile",
    "test:e2e:cross-browser": "playwright test --project=chromium --project=firefox --project=webkit",
    "test:e2e:intervention-flow": "playwright test test/e2e/intervention-lifecycle.spec.ts",
    "test:performance": "playwright test --config=playwright.config.performance.ts",
    "test:accessibility": "playwright test test/e2e/accessibility.spec.ts",
    "test:responsive": "playwright test test/e2e/responsive.spec.ts",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:ci": "npm run test:unit && npm run test:components && npm run test:api && npm run test:e2e",
    "test:full": "npm run test:ci && npm run test:performance && npm run test:accessibility"
  }
}
```

### 3. Structure de tests complète recommandée
```
test/
├── setup.ts                    # Configuration globale des tests
├── utils/                      # Utilitaires de test
│   ├── index.ts               # Exports principaux
│   ├── test-utils.tsx         # Wrapper React Testing Library
│   ├── mock-data.ts           # Données de test SEIDO
│   ├── api-mocks.ts           # Mocks MSW pour 57 API endpoints
│   ├── auth-helpers.ts        # Helpers authentification multi-rôles
│   ├── security-helpers.ts    # Helpers tests sécurité
│   └── e2e-helpers.ts         # Helpers tests E2E
├── unit/                       # Tests unitaires
│   ├── lib/                   # Tests des services (5 services critiques)
│   │   ├── auth-service.test.ts
│   │   ├── database-service.test.ts
│   │   ├── intervention-actions-service.test.ts
│   │   ├── notification-service.test.ts
│   │   └── file-service.test.ts
│   └── utils/                 # Tests des utilitaires
├── components/                 # Tests des composants
│   ├── ui/                    # Tests composants UI (45+ composants)
│   ├── dashboards/            # Tests dashboards par rôle (4 rôles)
│   ├── intervention/          # Tests composants intervention
│   ├── forms/                 # Tests formulaires avec validation
│   └── modals/                # Tests modales (15+ modales)
├── integration/               # Tests d'intégration
│   ├── auth-flow.test.ts      # Tests flow authentification
│   ├── intervention-workflow.test.ts  # Tests workflow complet
│   ├── role-permissions.test.ts       # Tests permissions multi-rôles
│   └── api-integration.test.ts        # Tests intégration API
├── api/                       # Tests API spécifiques (57 endpoints)
│   ├── auth/                  # Tests endpoints auth (12 endpoints)
│   ├── intervention/          # Tests endpoints intervention (29 endpoints)
│   ├── quotes/               # Tests endpoints devis (8 endpoints)
│   ├── notifications/        # Tests endpoints notifications (4 endpoints)
│   └── documents/            # Tests endpoints documents (4 endpoints)
├── security/                  # Tests de sécurité
│   ├── auth-bypass.test.ts    # Tests tentatives de contournement
│   ├── role-isolation.test.ts # Tests isolation des rôles
│   ├── data-leaks.test.ts     # Tests fuites de données
│   └── input-validation.test.ts
├── performance/               # Tests de performance
│   ├── api-response-times.test.ts
│   ├── component-rendering.test.ts
│   └── memory-leaks.test.ts
└── e2e/                       # Tests End-to-End
    ├── auth/                  # Tests authentification E2E
    ├── gestionnaire/          # Tests parcours gestionnaire
    ├── prestataire/           # Tests parcours prestataire
    ├── locataire/             # Tests parcours locataire
    ├── admin/                 # Tests parcours admin
    ├── intervention-lifecycle.spec.ts # Test complet du cycle
    ├── cross-role-interactions.spec.ts
    ├── responsive.spec.ts     # Tests responsivité
    ├── accessibility.spec.ts  # Tests accessibilité
    └── performance.spec.ts    # Tests performance E2E
```

## Tests prioritaires à implémenter immédiatement

### A. Tests API critiques (57 endpoints)
```typescript
// test/api/intervention/intervention.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createMockRequest } from '@/test/utils/api-helpers'

describe('API /intervention', () => {
  beforeEach(() => {
    // Setup auth mocks
  })

  describe('POST /api/intervention', () => {
    it('creates intervention as locataire', async () => {
      const req = createMockRequest('POST', {
        title: 'Fuite d\'eau',
        description: 'Fuite dans la salle de bain',
        urgency: 'high',
        property_id: 'prop-1'
      }, { role: 'locataire', user_id: 'loc-1' })

      const response = await POST(req)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.status).toBe('nouvelle-demande')
      expect(data.tenant_id).toBe('loc-1')
    })

    it('rejects unauthorized role', async () => {
      const req = createMockRequest('POST', {
        title: 'Test'
      }, { role: 'prestataire' })

      const response = await POST(req)
      expect(response.status).toBe(403)
    })
  })

  describe('PUT /api/intervention/[id]/approval', () => {
    it('approves intervention as gestionnaire', async () => {
      const req = createMockRequest('PUT', {
        action: 'approve',
        internal_comment: 'Approved'
      }, { role: 'gestionnaire' })

      const response = await PUT(req, { params: { id: 'int-1' } })
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('approuvee')
    })
  })
})
```

### B. Tests de sécurité multi-rôles
```typescript
// test/security/role-isolation.test.ts
import { describe, it, expect } from 'vitest'
import { testRoleAccess } from '@/test/utils/security-helpers'

describe('Role Isolation Security', () => {
  const testCases = [
    {
      role: 'locataire',
      allowedEndpoints: ['/api/intervention', '/api/intervention/[id]'],
      forbiddenEndpoints: ['/api/intervention/[id]/approval', '/api/users']
    },
    {
      role: 'gestionnaire',
      allowedEndpoints: ['/api/intervention', '/api/intervention/[id]/approval'],
      forbiddenEndpoints: ['/api/intervention/[id]/execution']
    },
    {
      role: 'prestataire',
      allowedEndpoints: ['/api/intervention/[id]/execution', '/api/quotes'],
      forbiddenEndpoints: ['/api/intervention/[id]/approval']
    }
  ]

  testCases.forEach(({ role, allowedEndpoints, forbiddenEndpoints }) => {
    describe(`${role} role`, () => {
      allowedEndpoints.forEach(endpoint => {
        it(`should access ${endpoint}`, async () => {
          const result = await testRoleAccess(role, endpoint)
          expect(result.allowed).toBe(true)
        })
      })

      forbiddenEndpoints.forEach(endpoint => {
        it(`should NOT access ${endpoint}`, async () => {
          const result = await testRoleAccess(role, endpoint)
          expect(result.allowed).toBe(false)
          expect(result.status).toBe(403)
        })
      })
    })
  })
})
```

### C. Tests E2E du workflow d'intervention complet
```typescript
// test/e2e/intervention-lifecycle-complete.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Complete Intervention Lifecycle', () => {
  test('full workflow: tenant → gestionnaire → prestataire', async ({ browser }) => {
    // Multi-user scenario avec 3 contextes
    const tenantContext = await browser.newContext()
    const managerContext = await browser.newContext()
    const providerContext = await browser.newContext()

    const tenantPage = await tenantContext.newPage()
    const managerPage = await managerContext.newPage()
    const providerPage = await providerContext.newPage()

    // 1. Tenant creates intervention
    await tenantPage.goto('/auth/login')
    await tenantPage.fill('[name="email"]', 'arthur+loc@seido.pm')
    await tenantPage.fill('[name="password"]', 'password')
    await tenantPage.click('button[type="submit"]')

    await tenantPage.goto('/locataire/interventions/nouvelle-demande')
    await tenantPage.fill('[name="title"]', 'E2E Test Intervention')
    await tenantPage.fill('[name="description"]', 'Automated test intervention')
    await tenantPage.selectOption('[name="urgency"]', 'medium')
    await tenantPage.click('button[type="submit"]')

    await expect(tenantPage.locator('text=Intervention créée')).toBeVisible()
    const interventionId = await tenantPage.locator('[data-testid="intervention-id"]').textContent()

    // 2. Manager approves intervention
    await managerPage.goto('/auth/login')
    await managerPage.fill('[name="email"]', 'arthur@umumentum.com')
    await managerPage.fill('[name="password"]', 'password')
    await managerPage.click('button[type="submit"]')

    await managerPage.goto(`/gestionnaire/interventions/${interventionId}`)
    await managerPage.click('button[data-action="approve"]')
    await managerPage.fill('[name="internal_comment"]', 'Approved via E2E test')
    await managerPage.click('button[type="submit"]')

    await expect(managerPage.locator('text=Intervention approuvée')).toBeVisible()

    // 3. Provider executes intervention
    await providerPage.goto('/auth/login')
    await providerPage.fill('[name="email"]', 'arthur+prest@seido.pm')
    await providerPage.fill('[name="password"]', 'password')
    await providerPage.click('button[type="submit"]')

    await providerPage.goto(`/prestataire/interventions/${interventionId}`)
    await providerPage.click('button[data-action="start"]')
    await providerPage.fill('[name="execution_comment"]', 'Work started via E2E test')
    await providerPage.click('button[type="submit"]')

    await expect(providerPage.locator('text=Intervention démarrée')).toBeVisible()

    // 4. Verify final status across all roles
    await tenantPage.reload()
    await expect(tenantPage.locator('[data-status="en-cours"]')).toBeVisible()

    await managerPage.reload()
    await expect(managerPage.locator('[data-status="en-cours"]')).toBeVisible()

    // Cleanup
    await tenantContext.close()
    await managerContext.close()
    await providerContext.close()
  })
})
```

### D. Tests de performance API
```typescript
// test/performance/api-response-times.test.ts
import { describe, it, expect } from 'vitest'
import { measureApiPerformance } from '@/test/utils/performance-helpers'

describe('API Performance Tests', () => {
  const performanceThresholds = {
    '/api/intervention': 500,          // 500ms max for list
    '/api/intervention/[id]': 200,     // 200ms max for single
    '/api/auth/login': 1000,           // 1s max for auth
    '/api/quotes': 300,                // 300ms max for quotes
    '/api/notifications': 150          // 150ms max for notifications
  }

  Object.entries(performanceThresholds).forEach(([endpoint, threshold]) => {
    it(`${endpoint} should respond within ${threshold}ms`, async () => {
      const responseTime = await measureApiPerformance(endpoint)
      expect(responseTime).toBeLessThan(threshold)
    })
  })

  it('concurrent API calls should handle load', async () => {
    const concurrentRequests = 10
    const promises = Array(concurrentRequests).fill(null).map(() =>
      measureApiPerformance('/api/intervention')
    )

    const results = await Promise.all(promises)
    const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length

    expect(averageTime).toBeLessThan(1000) // Average under 1s
    expect(Math.max(...results)).toBeLessThan(2000) // Max under 2s
  })
})
```

## Configuration Playwright avancée pour SEIDO

### Configuration multi-projets pour tests par rôle
```typescript
// playwright.config.ts (Mis à jour)
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Tests par rôle
    {
      name: 'gestionnaire',
      testDir: './test/e2e/gestionnaire',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'prestataire',
      testDir: './test/e2e/prestataire',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'locataire',
      testDir: './test/e2e/locataire',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      testDir: './test/e2e/admin',
      use: { ...devices['Desktop Chrome'] },
    },
    // Tests cross-browser
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Tests mobile
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
```

## Configuration des environnements de test

### Variables d'environnement
```bash
# .env.test
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
NEXT_PUBLIC_APP_ENV=test
SUPABASE_SERVICE_ROLE_KEY=test_service_key

# Variables pour les tests E2E
TEST_USER_GESTIONNAIRE_EMAIL=arthur@umumentum.com
TEST_USER_PRESTATAIRE_EMAIL=arthur+prest@seido.pm
TEST_USER_LOCATAIRE_EMAIL=arthur+loc@seido.pm
TEST_USER_ADMIN_EMAIL=arthur+admin@seido.pm
TEST_PASSWORD=password123

# Configuration Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
PLAYWRIGHT_TIMEOUT=30000
```

### Configuration MSW pour mocks API
```typescript
// test/utils/api-mocks.ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const handlers = [
  // Mock authentification
  http.post('/api/auth/login', ({ request }) => {
    return HttpResponse.json({
      user: { id: 'test-user', role: 'gestionnaire' },
      access_token: 'test-token'
    })
  }),

  // Mock interventions
  http.get('/api/intervention', ({ request }) => {
    return HttpResponse.json({
      data: [
        {
          id: 'int-1',
          title: 'Test Intervention',
          status: 'nouvelle-demande',
          tenant_id: 'tenant-1'
        }
      ]
    })
  }),

  // Mock intervention creation
  http.post('/api/intervention', ({ request }) => {
    return HttpResponse.json({
      id: 'int-new',
      title: 'New Intervention',
      status: 'nouvelle-demande'
    }, { status: 201 })
  }),

  // Add mocks for all 57 endpoints...
]

export const server = setupServer(...handlers)
```

## Checklist de test SEIDO - Couverture complète

### ✅ Tests fondamentaux (à implémenter en priorité)

#### A. Tests unitaires des services (5 services critiques)
- [ ] **auth-service.ts** - Authentification et permissions
- [ ] **database-service.ts** - Opérations DB avec retry
- [ ] **intervention-actions-service.ts** - Workflow interventions
- [ ] **notification-service.ts** - Notifications temps réel
- [ ] **file-service.ts** - Gestion documents

#### B. Tests API (57 endpoints)
- [ ] **Authentication** (12 endpoints) - Login, logout, session management
- [ ] **Interventions** (29 endpoints) - CRUD + workflow transitions
- [ ] **Quotes** (8 endpoints) - Devis et approbations
- [ ] **Notifications** (4 endpoints) - Système notifications
- [ ] **Documents** (4 endpoints) - Upload/download fichiers

#### C. Tests composants (45+ composants UI)
- [ ] **Dashboards** - 4 dashboards par rôle avec métriques
- [ ] **Forms** - Formulaires avec validation Zod
- [ ] **Modals** - 15+ modales avec interactions
- [ ] **UI Components** - Composants shadcn/ui

#### D. Tests E2E par rôle (4 rôles)
- [ ] **Gestionnaire** - Workflow gestion complète
- [ ] **Prestataire** - Exécution interventions + devis
- [ ] **Locataire** - Création et suivi interventions
- [ ] **Admin** - Administration système

### ✅ Tests avancés (phase 2)

#### E. Tests de sécurité
- [ ] **Role isolation** - Isolation des données par rôle
- [ ] **Authorization bypass** - Tentatives de contournement
- [ ] **Data leaks** - Fuites de données cross-tenant
- [ ] **Input validation** - Validation sécurisée des entrées

#### F. Tests de performance
- [ ] **API response times** - Temps de réponse < seuils définis
- [ ] **Component rendering** - Performance rendu composants
- [ ] **Memory leaks** - Fuites mémoire sur workflows longs
- [ ] **Load testing** - Charge utilisateurs simultanés

#### G. Tests d'accessibilité et responsive
- [ ] **WCAG 2.1 AA** - Conformité accessibilité
- [ ] **Screen readers** - Navigation assistée
- [ ] **Mobile responsive** - Design mobile-first
- [ ] **Cross-browser** - Chrome, Firefox, Safari, Edge

### ✅ Tests d'intégration complexes

#### H. Workflow intervention complet
- [ ] **Création locataire** → **Validation gestionnaire** → **Exécution prestataire**
- [ ] **Workflow avec devis** - Processus complet avec approbation
- [ ] **Notifications temps réel** - Entre tous les rôles
- [ ] **Documents** - Upload, validation, partage

#### I. Tests de régression
- [ ] **Data migration** - Migration mock → Supabase
- [ ] **Version compatibility** - Next.js 15 + React 19
- [ ] **Browser compatibility** - Support navigateurs cibles

## Stratégies de test spécialisées SEIDO

### 1. Tests des workflows multi-rôles avec isolation
```typescript
// test/integration/cross-role-workflow.test.ts
import { describe, it, expect } from 'vitest'
import { createMultiRoleTestScenario } from '@/test/utils/role-helpers'

describe('Cross-Role Workflow Tests', () => {
  it('should maintain data isolation between roles', async () => {
    const scenario = await createMultiRoleTestScenario({
      roles: ['gestionnaire', 'prestataire', 'locataire'],
      teams: ['team-a', 'team-b'],
      properties: ['prop-1', 'prop-2']
    })

    // Test que gestionnaire team-a ne voit que ses données
    const gestionnaireTeamA = scenario.getUser('gestionnaire', 'team-a')
    const interventions = await gestionnaireTeamA.getInterventions()

    expect(interventions.every(i => i.team_id === 'team-a')).toBe(true)
    expect(interventions.some(i => i.team_id === 'team-b')).toBe(false)
  })
})
```

### 2. Tests de performance sur workflows complexes
```typescript
// test/performance/workflow-performance.test.ts
import { describe, it, expect } from 'vitest'
import { measureWorkflowPerformance } from '@/test/utils/performance-helpers'

describe('Workflow Performance Tests', () => {
  it('complete intervention lifecycle should complete within 5 seconds', async () => {
    const workflowTime = await measureWorkflowPerformance(async () => {
      // Simuler workflow complet intervention
      await createIntervention()
      await approveIntervention()
      await scheduleIntervention()
      await executeIntervention()
      await finalizeIntervention()
    })

    expect(workflowTime).toBeLessThan(5000) // 5 secondes max
  })
})
```

### 3. Tests de notifications temps réel
```typescript
// test/integration/notifications.test.ts
import { describe, it, expect } from 'vitest'
import { setupWebSocketTest } from '@/test/utils/websocket-helpers'

describe('Real-time Notifications', () => {
  it('should send notifications to all relevant roles', async () => {
    const { gestionnaire, prestataire, locataire } = await setupWebSocketTest()

    // Gestionnaire approuve intervention
    await gestionnaire.approveIntervention('int-1')

    // Vérifier notifications reçues
    await expect(prestataire.waitForNotification()).resolves.toMatchObject({
      type: 'intervention_approved',
      intervention_id: 'int-1'
    })

    await expect(locataire.waitForNotification()).resolves.toMatchObject({
      type: 'intervention_approved',
      intervention_id: 'int-1'
    })
  })
})
```

## Configuration CI/CD pour SEIDO

### GitHub Actions pour tests automatisés
```yaml
# .github/workflows/test.yml
name: SEIDO Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:components
      - run: npm run test:coverage

  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:api
      - run: npm run test:security

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:performance
      - run: npm run test:accessibility
```

## Guide d'utilisation de l'agent tester

### 1. Commandes de base
```bash
# Lancer tous les tests
npm run test:full

# Tests par catégorie
npm run test:unit           # Tests unitaires services
npm run test:components     # Tests composants React
npm run test:api           # Tests API endpoints
npm run test:security      # Tests sécurité
npm run test:e2e          # Tests E2E complets

# Tests par rôle
npm run test:e2e:gestionnaire
npm run test:e2e:prestataire
npm run test:e2e:locataire
npm run test:e2e:admin

# Tests spécialisés
npm run test:performance   # Tests performance
npm run test:accessibility # Tests accessibilité
npm run test:responsive   # Tests responsive design
```

### 2. Tests de régression avant déploiement
```bash
# Suite complète avant merge
npm run test:ci

# Vérification performance
npm run test:performance

# Vérification accessibilité
npm run test:accessibility

# Tests cross-browser
npm run test:e2e:cross-browser
```

### 3. Debugging des tests
```bash
# Interface vitest
npm run test:ui

# Debug Playwright
npm run test:e2e:debug

# Mode watch pour développement
npm run test:watch
```

### 4. Génération de rapports
```bash
# Rapport de couverture détaillé
npm run test:coverage

# Rapport E2E avec captures d'écran
npm run test:e2e  # Génère playwright-report/

# Métriques de performance
npm run test:performance  # Génère performance-report.json
```

## Priorités d'implémentation

### Phase 1 (Immédiate) - Tests fondamentaux
1. **Tests API** - Couvrir les 57 endpoints avec focus sécurité
2. **Tests services** - 5 services critiques avec mocks
3. **Tests E2E de base** - Workflow intervention simple par rôle

### Phase 2 (Court terme) - Tests avancés
1. **Tests sécurité** - Isolation rôles et tentatives bypass
2. **Tests performance** - Seuils définis et monitoring
3. **Tests cross-role** - Interactions complexes multi-utilisateurs

### Phase 3 (Moyen terme) - Optimisation
1. **Tests accessibilité** - Conformité WCAG 2.1 AA
2. **Tests responsive** - Couverture complète mobile/desktop
3. **Tests régression** - Suite automatisée pour CI/CD

Cet agent tester est maintenant configuré pour offrir une couverture de test complète et exhaustive de l'application SEIDO, avec un focus particulier sur les aspects multi-rôles, sécurité, et performance qui sont critiques pour cette plateforme de gestion immobilière.