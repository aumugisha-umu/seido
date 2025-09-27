# 05 - Métriques de Succès et Stratégies de Test - SEIDO

## Vue d'ensemble des KPIs

### Objectifs Principaux
1. **Performance**: Amélioration de 60% des métriques Core Web Vitals
2. **Qualité**: Test coverage >70% avec 0 bugs critiques
3. **Sécurité**: Score de sécurité A+ (OWASP Top 10)
4. **Business**: +40% retention, -50% support tickets

## Métriques de Performance

### Core Web Vitals

#### Largest Contentful Paint (LCP)
**Objectif: <2.5s (actuellement 5.1s)**

```typescript
// lib/monitoring/lcp-tracker.ts
export class LCPTracker {
  private static measurements: number[] = []

  static init() {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any

      this.measurements.push(lastEntry.renderTime || lastEntry.loadTime)

      // Send to analytics
      this.report({
        metric: 'LCP',
        value: lastEntry.renderTime || lastEntry.loadTime,
        rating: this.getRating(lastEntry.renderTime || lastEntry.loadTime)
      })
    })

    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  }

  private static getRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  static getP75(): number {
    const sorted = [...this.measurements].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.75)
    return sorted[index] || 0
  }
}
```

#### First Input Delay (FID) / Interaction to Next Paint (INP)
**Objectif: <100ms (actuellement ~300ms)**

```typescript
// lib/monitoring/inp-tracker.ts
export class INPTracker {
  private static interactions: Map<number, InteractionData> = new Map()

  static init() {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        if (entry.interactionId) {
          const interaction = this.interactions.get(entry.interactionId) || {
            latency: 0,
            entries: []
          }

          interaction.entries.push(entry)
          interaction.latency = Math.max(
            interaction.latency,
            entry.processingEnd - entry.startTime
          )

          this.interactions.set(entry.interactionId, interaction)
        }
      }

      // Calculate INP (P98)
      const latencies = Array.from(this.interactions.values())
        .map(i => i.latency)
        .sort((a, b) => a - b)

      const p98Index = Math.floor(latencies.length * 0.98)
      const inp = latencies[p98Index] || 0

      this.report({
        metric: 'INP',
        value: inp,
        rating: inp < 100 ? 'good' : inp < 300 ? 'needs-improvement' : 'poor'
      })
    })

    observer.observe({ type: 'event', buffered: true, durationThreshold: 0 })
  }
}
```

#### Cumulative Layout Shift (CLS)
**Objectif: <0.1 (actuellement 0.25)**

```typescript
// lib/monitoring/cls-tracker.ts
export class CLSTracker {
  private static clsValue = 0
  private static clsEntries: LayoutShift[] = []
  private static sessionValue = 0
  private static sessionEntries: LayoutShift[] = []

  static init() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShift[]) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = this.sessionEntries[0]
          const lastSessionEntry = this.sessionEntries[this.sessionEntries.length - 1]

          // Start new session if gap > 1s or duration > 5s
          if (
            this.sessionValue &&
            (entry.startTime - lastSessionEntry.startTime > 1000 ||
             entry.startTime - firstSessionEntry.startTime > 5000)
          ) {
            this.sessionValue = entry.value
            this.sessionEntries = [entry]
          } else {
            this.sessionValue += entry.value
            this.sessionEntries.push(entry)
          }

          if (this.sessionValue > this.clsValue) {
            this.clsValue = this.sessionValue
            this.clsEntries = [...this.sessionEntries]
          }
        }
      }

      this.report({
        metric: 'CLS',
        value: this.clsValue,
        rating: this.clsValue < 0.1 ? 'good' : this.clsValue < 0.25 ? 'needs-improvement' : 'poor'
      })
    })

    observer.observe({ type: 'layout-shift', buffered: true })
  }
}
```

### Métriques Custom

#### Time to Interactive (TTI)
**Objectif: <3s (actuellement 8.5s)**

```typescript
// lib/monitoring/tti-tracker.ts
export class TTITracker {
  static async measureTTI(): Promise<number> {
    if (typeof window === 'undefined') return 0

    return new Promise((resolve) => {
      // Wait for page load
      if (document.readyState === 'complete') {
        measureTTI()
      } else {
        window.addEventListener('load', measureTTI)
      }

      async function measureTTI() {
        const fcp = await getFCP()
        const longTasksFinished = await waitForIdleNetwork()
        const tti = Math.max(fcp, longTasksFinished)

        TTITracker.report({
          metric: 'TTI',
          value: tti,
          rating: tti < 3000 ? 'good' : tti < 5000 ? 'needs-improvement' : 'poor'
        })

        resolve(tti)
      }
    })
  }

  private static async waitForIdleNetwork(): Promise<number> {
    return new Promise((resolve) => {
      let idleStart = performance.now()
      let requests = 0

      // Monitor network activity
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            requests++
            setTimeout(() => {
              requests--
              if (requests === 0) {
                idleStart = performance.now()
              }
            }, 5000)
          }
        }
      })

      observer.observe({ entryTypes: ['resource'] })

      // Check for idle period
      const checkIdle = setInterval(() => {
        if (requests === 0 && performance.now() - idleStart > 5000) {
          clearInterval(checkIdle)
          observer.disconnect()
          resolve(performance.now())
        }
      }, 100)
    })
  }
}
```

#### Bundle Size Metrics
**Objectif: <1.5MB (actuellement 5MB)**

```javascript
// scripts/bundle-analyzer.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const fs = require('fs')
const path = require('path')

class BundleSizeTracker {
  apply(compiler) {
    compiler.hooks.done.tap('BundleSizeTracker', (stats) => {
      const jsonStats = stats.toJson({
        chunks: true,
        modules: true,
        assets: true,
      })

      const bundles = {}
      let totalSize = 0

      jsonStats.assets.forEach((asset) => {
        if (asset.name.endsWith('.js') || asset.name.endsWith('.css')) {
          bundles[asset.name] = {
            size: asset.size,
            sizeFormatted: this.formatBytes(asset.size),
          }
          totalSize += asset.size
        }
      })

      const report = {
        timestamp: new Date().toISOString(),
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        bundles,
        chunks: jsonStats.chunks.map(chunk => ({
          name: chunk.names[0],
          size: chunk.size,
          modules: chunk.modules?.length || 0,
        })),
      }

      // Save report
      fs.writeFileSync(
        path.join(process.cwd(), 'bundle-report.json'),
        JSON.stringify(report, null, 2)
      )

      // Check thresholds
      this.checkThresholds(report)
    })
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  checkThresholds(report) {
    const MAX_BUNDLE_SIZE = 1.5 * 1024 * 1024 // 1.5MB
    const MAX_CHUNK_SIZE = 500 * 1024 // 500KB

    if (report.totalSize > MAX_BUNDLE_SIZE) {
      console.error(`❌ Bundle size exceeds threshold: ${report.totalSizeFormatted} > 1.5MB`)
      process.exit(1)
    }

    report.chunks.forEach(chunk => {
      if (chunk.size > MAX_CHUNK_SIZE) {
        console.warn(`⚠️ Large chunk detected: ${chunk.name} (${this.formatBytes(chunk.size)})`)
      }
    })
  }
}

module.exports = BundleSizeTracker
```

## Stratégies de Test

### Architecture de Test

```
test/
├── unit/                 # Tests unitaires (Vitest)
│   ├── components/      # Composants React
│   ├── lib/            # Logique métier
│   └── hooks/          # Custom hooks
│
├── integration/         # Tests d'intégration
│   ├── api/            # API routes
│   ├── database/       # Supabase queries
│   └── workflows/      # Business workflows
│
├── e2e/                # Tests E2E (Playwright)
│   ├── critical/       # Parcours critiques
│   ├── roles/          # Tests par rôle
│   └── performance/    # Tests de performance
│
├── fixtures/           # Données de test
├── mocks/             # Mocks et stubs
└── utils/             # Utilitaires de test
```

### 1. Tests Unitaires (Vitest)

#### Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        '.next',
        'test',
        '*.config.js',
        '*.config.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

#### Tests de Composants
```typescript
// test/unit/components/intervention-card.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { InterventionCard } from '@/components/intervention/intervention-card'

describe('InterventionCard', () => {
  const mockIntervention = {
    id: '123',
    title: 'Test Intervention',
    status: 'pending',
    priority: 'high',
    createdAt: new Date('2025-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders intervention details correctly', () => {
    render(<InterventionCard intervention={mockIntervention} />)

    expect(screen.getByText('Test Intervention')).toBeInTheDocument()
    expect(screen.getByText('En attente')).toBeInTheDocument()
    expect(screen.getByText('Priorité haute')).toBeInTheDocument()
  })

  it('handles status change optimistically', async () => {
    const onStatusChange = vi.fn().mockResolvedValue(true)

    render(
      <InterventionCard
        intervention={mockIntervention}
        onStatusChange={onStatusChange}
      />
    )

    const statusButton = screen.getByRole('button', { name: /Valider/ })
    fireEvent.click(statusButton)

    // Check optimistic update
    expect(screen.getByText('Validation...')).toBeInTheDocument()

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('123', 'validated')
      expect(screen.getByText('Validée')).toBeInTheDocument()
    })
  })

  it('handles error gracefully', async () => {
    const onStatusChange = vi.fn().mockRejectedValue(new Error('Network error'))

    render(
      <InterventionCard
        intervention={mockIntervention}
        onStatusChange={onStatusChange}
      />
    )

    const statusButton = screen.getByRole('button', { name: /Valider/ })
    fireEvent.click(statusButton)

    await waitFor(() => {
      expect(screen.getByText('En attente')).toBeInTheDocument()
      expect(screen.getByText('Erreur lors de la mise à jour')).toBeInTheDocument()
    })
  })
})
```

#### Tests de Hooks
```typescript
// test/unit/hooks/use-interventions.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { useInterventions } from '@/hooks/use-interventions'

vi.mock('@/lib/database-service', () => ({
  interventionService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}))

describe('useInterventions', () => {
  it('fetches interventions on mount', async () => {
    const mockInterventions = [
      { id: '1', title: 'Intervention 1' },
      { id: '2', title: 'Intervention 2' },
    ]

    interventionService.getAll.mockResolvedValue(mockInterventions)

    const { result } = renderHook(() => useInterventions())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.interventions).toEqual(mockInterventions)
    })
  })

  it('handles pagination correctly', async () => {
    const { result } = renderHook(() => useInterventions({ limit: 10 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Go to next page
    result.current.nextPage()

    await waitFor(() => {
      expect(interventionService.getAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 10,
      })
    })
  })
})
```

### 2. Tests d'Intégration

#### Tests API
```typescript
// test/integration/api/interventions.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/interventions/route'
import { supabase } from '@/lib/supabase'

describe('API: /api/interventions', () => {
  beforeAll(async () => {
    // Setup test database
    await supabase.from('interventions').delete().neq('id', '')
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('interventions').delete().neq('id', '')
  })

  describe('GET /api/interventions', () => {
    it('returns paginated interventions', async () => {
      // Insert test data
      await supabase.from('interventions').insert([
        { title: 'Test 1', status: 'pending' },
        { title: 'Test 2', status: 'in_progress' },
        { title: 'Test 3', status: 'completed' },
      ])

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '2' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.interventions).toHaveLength(2)
      expect(data.total).toBe(3)
      expect(data.page).toBe(1)
    })

    it('filters by status correctly', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'pending' },
      })

      await handler(req, res)

      const data = JSON.parse(res._getData())
      expect(data.interventions.every(i => i.status === 'pending')).toBe(true)
    })
  })

  describe('POST /api/interventions', () => {
    it('creates new intervention with validation', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'New Intervention',
          description: 'Test description',
          priority: 'high',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.intervention.title).toBe('New Intervention')
    })

    it('rejects invalid data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'x', // Too short
          priority: 'invalid',
        },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.errors).toBeDefined()
    })
  })
})
```

#### Tests Database
```typescript
// test/integration/database/intervention-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { InterventionService } from '@/lib/services/intervention-service'
import { createTestDatabase } from '@/test/utils/test-database'

describe('InterventionService', () => {
  let service: InterventionService
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const { db, cleanup: cleanupFn } = await createTestDatabase()
    service = new InterventionService(db)
    cleanup = cleanupFn
  })

  afterEach(async () => {
    await cleanup()
  })

  describe('getInterventionsWithRelations', () => {
    it('fetches interventions with all relations', async () => {
      // Insert test data
      const intervention = await service.create({
        title: 'Test',
        propertyId: 'prop-1',
        assignedContacts: ['contact-1', 'contact-2'],
      })

      const result = await service.getInterventionsWithRelations({
        id: intervention.id,
      })

      expect(result).toBeDefined()
      expect(result.property).toBeDefined()
      expect(result.assignedContacts).toHaveLength(2)
    })

    it('applies RLS policies correctly', async () => {
      // Test that users can only see their team's interventions
      const user1Interventions = await service.getInterventionsForUser('user-1')
      const user2Interventions = await service.getInterventionsForUser('user-2')

      expect(user1Interventions).not.toEqual(user2Interventions)
    })
  })

  describe('performance', () => {
    it('handles large datasets efficiently', async () => {
      // Insert 1000 interventions
      const interventions = Array.from({ length: 1000 }, (_, i) => ({
        title: `Intervention ${i}`,
        status: ['pending', 'in_progress', 'completed'][i % 3],
      }))

      await service.bulkCreate(interventions)

      const start = performance.now()
      const result = await service.getAll({ limit: 100 })
      const duration = performance.now() - start

      expect(result).toHaveLength(100)
      expect(duration).toBeLessThan(100) // Should complete in <100ms
    })
  })
})
```

### 3. Tests E2E (Playwright)

#### Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
```

#### Tests de Parcours Critiques
```typescript
// test/e2e/critical/intervention-lifecycle.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs, createIntervention, assignTo } from '../helpers'

test.describe('Intervention Lifecycle', () => {
  test('complete intervention workflow', async ({ page, context }) => {
    // Step 1: Locataire creates request
    await loginAs(page, 'locataire@test.com')
    await page.goto('/locataire/interventions/new')

    await page.fill('[name="title"]', 'Fuite d\'eau urgente')
    await page.fill('[name="description"]', 'Fuite dans la salle de bain')
    await page.selectOption('[name="priority"]', 'urgent')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/locataire\/interventions\/[\w-]+/)
    const interventionUrl = page.url()
    const interventionId = interventionUrl.split('/').pop()

    // Step 2: Gestionnaire validates
    const page2 = await context.newPage()
    await loginAs(page2, 'gestionnaire@test.com')
    await page2.goto(`/gestionnaire/interventions/${interventionId}`)

    await page2.click('button:has-text("Valider")')
    await expect(page2.locator('.status-badge')).toContainText('Validée')

    // Assign to prestataire
    await page2.click('button:has-text("Assigner")')
    await page2.selectOption('[name="prestataire"]', 'prestataire-1')
    await page2.click('button:has-text("Confirmer")')

    // Step 3: Prestataire accepts and quotes
    const page3 = await context.newPage()
    await loginAs(page3, 'prestataire@test.com')
    await page3.goto(`/prestataire/interventions/${interventionId}`)

    await page3.click('button:has-text("Accepter")')
    await page3.click('button:has-text("Créer un devis")')

    await page3.fill('[name="amount"]', '250')
    await page3.fill('[name="description"]', 'Réparation fuite')
    await page3.click('button:has-text("Soumettre devis")')

    // Step 4: Gestionnaire approves quote
    await page2.reload()
    await page2.click('button:has-text("Approuver devis")')

    // Step 5: Prestataire completes work
    await page3.reload()
    await page3.click('button:has-text("Marquer comme terminé")')
    await page3.fill('[name="completionNotes"]', 'Fuite réparée')
    await page3.click('button:has-text("Confirmer")')

    // Verify completion
    await page.reload()
    await expect(page.locator('.status-badge')).toContainText('Terminée')
  })

  test('performance metrics during workflow', async ({ page }) => {
    await page.goto('/')

    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstByte: navigation.responseStart - navigation.requestStart,
      }
    })

    expect(metrics.domContentLoaded).toBeLessThan(1000)
    expect(metrics.loadComplete).toBeLessThan(3000)
    expect(metrics.firstByte).toBeLessThan(200)
  })
})
```

### 4. Tests de Performance

#### Load Testing avec k6
```javascript
// test/performance/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    errors: ['rate<0.1'],               // Custom error rate under 10%
  },
}

export default function () {
  // Login
  const loginRes = http.post('http://localhost:3000/api/auth/login', {
    email: 'test@example.com',
    password: 'password',
  })

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'login time < 1s': (r) => r.timings.duration < 1000,
  })

  errorRate.add(loginRes.status !== 200)

  const token = loginRes.json('token')

  // Dashboard request
  const dashboardRes = http.get('http://localhost:3000/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  })

  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard time < 2s': (r) => r.timings.duration < 2000,
  })

  // Create intervention
  const interventionRes = http.post(
    'http://localhost:3000/api/interventions',
    JSON.stringify({
      title: 'Load test intervention',
      priority: 'medium',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  check(interventionRes, {
    'intervention created': (r) => r.status === 201,
    'creation time < 500ms': (r) => r.timings.duration < 500,
  })

  sleep(1)
}
```

#### Lighthouse CI
```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs')
            const results = JSON.parse(
              fs.readFileSync('.lighthouseci/manifest.json', 'utf8')
            )

            const scores = results[0].summary
            const comment = `
            ## 🚀 Lighthouse Results

            | Metric | Score |
            |--------|-------|
            | Performance | ${scores.performance * 100}% |
            | Accessibility | ${scores.accessibility * 100}% |
            | Best Practices | ${scores['best-practices'] * 100}% |
            | SEO | ${scores.seo * 100}% |
            `

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            })
```

## Dashboard de Métriques

### Interface de Monitoring
```typescript
// app/admin/metrics/page.tsx
import { MetricsDashboard } from '@/components/admin/metrics-dashboard'
import { getMetrics } from '@/lib/monitoring/metrics-service'

export default async function MetricsPage() {
  const metrics = await getMetrics()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tableau de Bord Métriques</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="LCP"
          value={metrics.lcp.p75}
          target={2500}
          unit="ms"
          trend={metrics.lcp.trend}
        />
        <MetricCard
          title="FID/INP"
          value={metrics.inp.p75}
          target={100}
          unit="ms"
          trend={metrics.inp.trend}
        />
        <MetricCard
          title="CLS"
          value={metrics.cls.p75}
          target={0.1}
          precision={3}
          trend={metrics.cls.trend}
        />
        <MetricCard
          title="Bundle Size"
          value={metrics.bundleSize.total}
          target={1.5}
          unit="MB"
          trend={metrics.bundleSize.trend}
        />
      </div>

      <MetricsDashboard metrics={metrics} />
    </div>
  )
}

function MetricCard({ title, value, target, unit = '', precision = 0, trend }) {
  const isGood = value <= target
  const percentageOfTarget = (value / target) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {title}
          <TrendIndicator trend={trend} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {value.toFixed(precision)}{unit}
        </div>
        <Progress value={Math.min(percentageOfTarget, 100)} />
        <div className="mt-2 text-sm text-muted-foreground">
          Objectif: {target}{unit}
        </div>
        <Badge variant={isGood ? 'success' : 'destructive'}>
          {isGood ? 'Conforme' : 'À améliorer'}
        </Badge>
      </CardContent>
    </Card>
  )
}
```

## Quality Gates

### CI/CD Pipeline avec Quality Gates
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
    branches: [main, develop]

jobs:
  quality-checks:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      # TypeScript Check
      - name: TypeScript
        run: npm run type-check
        continue-on-error: false

      # Linting
      - name: ESLint
        run: npm run lint
        continue-on-error: false

      # Unit Tests with Coverage
      - name: Unit Tests
        run: npm run test:coverage
        continue-on-error: false

      - name: Check Coverage Thresholds
        run: |
          coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$coverage < 70" | bc -l) )); then
            echo "Coverage is below 70%: $coverage%"
            exit 1
          fi

      # Bundle Size Check
      - name: Build and Check Bundle Size
        run: |
          npm run build
          npm run analyze:bundle

      # E2E Tests
      - name: E2E Tests
        run: npm run test:e2e
        continue-on-error: false

      # Performance Audit
      - name: Lighthouse Performance
        run: |
          npm run build
          npm run start &
          sleep 10
          npm run lighthouse:ci

      # Security Audit
      - name: Security Audit
        run: npm audit --audit-level=high

      # Generate Report
      - name: Generate Quality Report
        if: always()
        run: |
          node scripts/generate-quality-report.js

      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: quality-reports
          path: |
            coverage/
            lighthouse-report.html
            bundle-report.html
            quality-report.json
```

## Alerting et Monitoring Production

### Configuration des Alertes
```typescript
// lib/monitoring/alerts.ts
export const alertRules = {
  performance: {
    lcp: {
      threshold: 2500,
      severity: 'warning',
      message: 'LCP dépasse 2.5s',
    },
    fid: {
      threshold: 100,
      severity: 'warning',
      message: 'FID dépasse 100ms',
    },
    cls: {
      threshold: 0.1,
      severity: 'warning',
      message: 'CLS dépasse 0.1',
    },
  },

  errors: {
    rate: {
      threshold: 0.01, // 1%
      severity: 'critical',
      message: 'Taux d\'erreur dépasse 1%',
    },
    count: {
      threshold: 100,
      window: 300, // 5 minutes
      severity: 'warning',
      message: 'Plus de 100 erreurs en 5 minutes',
    },
  },

  availability: {
    uptime: {
      threshold: 0.999, // 99.9%
      severity: 'critical',
      message: 'Uptime en dessous de 99.9%',
    },
    responseTime: {
      threshold: 3000,
      severity: 'warning',
      message: 'Temps de réponse moyen > 3s',
    },
  },

  business: {
    loginFailure: {
      threshold: 10,
      window: 60, // 1 minute
      severity: 'warning',
      message: '10+ échecs de connexion en 1 minute',
    },
    interventionCreation: {
      threshold: 0,
      window: 3600, // 1 hour
      severity: 'info',
      message: 'Aucune intervention créée depuis 1h',
    },
  },
}
```

## Conclusion

Cette stratégie complète de métriques et tests garantit:

1. **Performance**: Monitoring continu des Core Web Vitals
2. **Qualité**: Coverage >70% avec tests multi-niveaux
3. **Fiabilité**: Quality gates automatisés
4. **Visibilité**: Dashboards temps réel
5. **Réactivité**: Alerting proactif

Les KPIs définis permettent de mesurer objectivement le succès de la refactorisation et d'assurer une amélioration continue de la plateforme SEIDO.