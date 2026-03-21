# E2E Testing Strategy — Complete QA Overhaul

**Date**: 2026-03-21
**Status**: Validated
**Budget**: 100% gratuit (GitHub Actions free tier)
**Framework**: Playwright (unifié, migration depuis Puppeteer)

---

## Objectifs

1. **Fiabilité déploiement** : Zéro régression en production
2. **Couverture flows critiques** : De 15% à 85%+ des parcours business testés
3. **Qualité globale** : Performance (Core Web Vitals), accessibilité (WCAG 2.1 AA), responsive/mobile
4. **Automatisation AI** : Playwright Agents (planner/generator/healer) natifs v1.58

---

## Architecture — 7 Couches de Testing

```
┌─────────────────────────────────────────────────────────┐
│  COUCHE 7 — Synthetic Monitoring (Production cron 6h)   │
│  Smoke tests critiques sur prod toutes les 6h           │
├─────────────────────────────────────────────────────────┤
│  COUCHE 6 — Visual Regression (PR Gate)                 │
│  Screenshots baseline vs diff sur composants clés       │
├─────────────────────────────────────────────────────────┤
│  COUCHE 5 — Performance Budget (CI Gate)                │
│  Core Web Vitals : LCP < 3s, CLS < 0.15, FCP < 2s      │
├─────────────────────────────────────────────────────────┤
│  COUCHE 4 — Accessibility (CI Gate)                     │
│  axe-core WCAG 2.1 AA sur 19 pages (4 rôles)           │
├─────────────────────────────────────────────────────────┤
│  COUCHE 3 — E2E Cross-Browser & Mobile (Nightly)        │
│  Chrome, Firefox, WebKit, Pixel 7, iPhone 14, iPad Pro  │
├─────────────────────────────────────────────────────────┤
│  COUCHE 2 — E2E Flows Critiques (CI Gate — chaque PR)   │
│  12 flows business, 4 projets parallèles par rôle       │
├─────────────────────────────────────────────────────────┤
│  COUCHE 1 — Smoke Tests Rapides (CI Gate — chaque push) │
│  Auth + Dashboard + Navigation par rôle (< 2 min)       │
└─────────────────────────────────────────────────────────┘
```

### Quand chaque couche s'exécute

| Couche | Trigger | Durée cible | Bloquant ? |
|--------|---------|-------------|------------|
| 1 — Smoke | Chaque push | < 2 min | Oui |
| 2 — E2E Critiques | Chaque PR | < 10 min | Oui |
| 3 — Cross-Browser | Nightly 3h + pre-release | < 30 min | Non (alertes) |
| 4 — Accessibilité | Chaque PR | < 3 min | Oui |
| 5 — Performance | Chaque PR | < 3 min | Oui (budget) |
| 6 — Visual Regression | Chaque PR | < 5 min | Review requis |
| 7 — Synthetic Monitoring | Cron 6h | < 1 min | Alertes Slack |

---

## Budget GitHub Actions (Private Repo — 2000 min/mois gratuit)

| Job | Fréquence | Durée/run | Min/mois |
|-----|-----------|-----------|----------|
| lint + typecheck + unit | ~60 push/mois | 3 min | 180 |
| build | ~60 push/mois | 4 min | 240 |
| e2e-smoke | ~30 PR/mois | 3 min | 90 |
| e2e-flows (×4 matrix) | ~30 PR/mois | 8 min | 240 |
| a11y + perf | ~30 PR/mois | 4 min | 120 |
| visual regression | ~30 PR/mois | 4 min | 120 |
| nightly cross-browser | 30 nuits | 15 min | 450 |
| synthetic monitoring | 120 runs/mois | 1 min | 120 |
| **TOTAL** | | | **~1560 min** |

**Marge : ~440 min/mois de réserve.**

---

## Structure des Fichiers

```
tests/
├── e2e/
│   ├── playwright.config.ts          # Config unifiée Playwright
│   ├── fixtures/
│   │   ├── auth.fixture.ts           # Auth fixture (storageState par rôle)
│   │   ├── accessibility.fixture.ts  # axe-core fixture partagée
│   │   └── test-accounts.ts          # Comptes de test (existant, réutilisé)
│   ├── pages/                        # Page Object Models (migrés de Puppeteer)
│   │   ├── login.page.ts
│   │   ├── dashboard.page.ts
│   │   ├── building-wizard.page.ts
│   │   ├── lot-wizard.page.ts
│   │   ├── contract-wizard.page.ts
│   │   ├── intervention-wizard.page.ts
│   │   ├── intervention-detail.page.ts
│   │   └── intervention-request.page.ts
│   ├── smoke/                        # Couche 1
│   │   └── auth-smoke.spec.ts
│   ├── flows/                        # Couche 2
│   │   ├── property/
│   │   │   ├── building-creation.spec.ts
│   │   │   └── lot-creation.spec.ts
│   │   ├── contract/
│   │   │   └── contract-creation.spec.ts
│   │   ├── intervention/
│   │   │   ├── intervention-gestionnaire.spec.ts
│   │   │   ├── intervention-locataire.spec.ts
│   │   │   ├── intervention-workflow.spec.ts
│   │   │   ├── intervention-lifecycle.spec.ts
│   │   │   └── quote-workflow.spec.ts          # NOUVEAU
│   │   ├── billing/
│   │   │   ├── billing-ui.spec.ts
│   │   │   ├── read-only-enforcement.spec.ts
│   │   │   └── checkout-flow.spec.ts
│   │   ├── conversation/
│   │   │   └── conversation-thread.spec.ts     # NOUVEAU
│   │   ├── supplier-contract/
│   │   │   └── supplier-contract-crud.spec.ts  # NOUVEAU
│   │   ├── admin/
│   │   │   └── admin-impersonation.spec.ts     # NOUVEAU
│   │   └── email/
│   │       └── email-integration.spec.ts       # NOUVEAU
│   ├── accessibility/                # Couche 4
│   │   ├── gestionnaire-a11y.spec.ts
│   │   ├── prestataire-a11y.spec.ts
│   │   ├── locataire-a11y.spec.ts
│   │   └── public-a11y.spec.ts
│   ├── performance/                  # Couche 5
│   │   └── web-vitals.spec.ts
│   └── visual/                       # Couche 6
│       └── visual-regression.spec.ts
├── monitoring/                       # Couche 7
│   └── smoke-production.spec.ts
└── fixtures/                         # Shared (existant)
    ├── test-accounts.ts
    ├── known-entities.ts
    └── test-document.pdf
```

---

## Couche 1 — Smoke Tests

**Tag :** `@smoke`
**Trigger :** Chaque push
**Durée :** < 2 min

Tests :
- Gestionnaire login + dashboard visible
- Prestataire login + dashboard visible
- Locataire login + dashboard visible
- Pages publiques (landing, login, blog)
- API health check

Utilise `storageState` pré-authentifié. Aucune création de données.

---

## Couche 2 — E2E Flows Business

**Tag :** `@flow`
**Trigger :** Chaque PR
**Durée :** < 10 min (4 projets en parallèle via matrix)

### Matrice des flows

| # | Flow | Rôle(s) | Priorité | Status |
|---|------|---------|----------|--------|
| 1 | Création immeuble (wizard 5 steps) | Gestionnaire | P0 | Migration |
| 2 | Création lot (wizard 5 steps) | Gestionnaire | P0 | Migration |
| 3 | Création contrat (wizard 5 steps) | Gestionnaire | P0 | Migration |
| 4 | Intervention creation + workflow | Multi-rôle | P0 | Migration |
| 5 | Demande intervention locataire | Locataire | P0 | Migration |
| 6 | Devis : demande → soumission → approbation | Multi-rôle | P0 | **NOUVEAU** |
| 7 | Subscription : trial → checkout | Gestionnaire | P0 | Migration |
| 8 | Read-only mode (trial expiré) | Gestionnaire | P1 | Migration |
| 9 | Conversation thread + participants | Multi-rôle | P1 | **NOUVEAU** |
| 10 | Contrat fournisseur CRUD | Gestionnaire | P1 | **NOUVEAU** |
| 11 | Admin impersonation | Admin | P2 | **NOUVEAU** |
| 12 | Email : OAuth + sync + lien entité | Gestionnaire | P2 | **NOUVEAU** |

### Projets Playwright (CI matrix)

```
gestionnaire : flows 1, 2, 3, 7, 8, 10
prestataire  : flow 6 (partie prestataire)
locataire    : flow 5
multi-role   : flows 4, 6, 9, 11, 12
```

### Migration Puppeteer → Playwright : Mapping

| Puppeteer | Playwright |
|-----------|------------|
| `page.waitForSelector('.class')` | `page.locator('.class').waitFor()` |
| `page.$eval('#id', el => el.textContent)` | `page.locator('#id').textContent()` |
| `page.type('input', 'text')` | `page.locator('input').fill('text')` |
| `page.click('button')` | `page.getByRole('button').click()` |
| `page.waitForNavigation()` | `page.waitForURL('**/path')` |
| `waitForContent(page, markers)` | `expect(page.locator('text=marker')).toBeVisible()` |
| `screenshotOnFailure()` | Config: `screenshot: 'only-on-failure'` (automatique) |
| Cookie injection manuelle | `storageState` natif Playwright |
| `page.evaluate()` pour inputs React | `page.locator('input').fill()` (natif Playwright) |
| CDP click fallback | Non nécessaire (Playwright gère les portals) |

---

## Couche 3 — Cross-Browser & Mobile (Nightly)

**Tag :** `@cross-browser`
**Trigger :** Nightly 3h + pre-release
**Durée :** < 30 min

### Projets additionnels

| Projet | Device | Viewport | Cible |
|--------|--------|----------|-------|
| `firefox` | Desktop Firefox | 1440×900 | Cross-browser |
| `webkit` | Desktop Safari | 1440×900 | Cross-browser |
| `mobile-chrome` | Pixel 7 | 412×915 | Prestataire (75% mobile) |
| `mobile-safari` | iPhone 14 | 390×844 | Locataire, Prestataire |
| `tablet` | iPad Pro 11 | 834×1194 | Gestionnaire mobile |

---

## Couche 4 — Accessibilité

**Tag :** `@a11y`
**Trigger :** Chaque PR
**Durée :** < 3 min
**Dépendance :** `@axe-core/playwright` v4.11.1

### Pages scannées (19 total)

**Gestionnaire (8):** dashboard, biens, interventions, contrats, contacts, operations, billing, profile
**Prestataire (3):** dashboard, intervention detail, profile
**Locataire (4):** dashboard, intervention detail, nouvelle demande, lot detail
**Public (4):** landing, login, signup, blog

### Configuration axe-core

- Tags WCAG : `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
- Exclusions : `[data-testid="google-maps"]`, `[data-testid="stripe-elements"]` (contenu tiers)
- Output : Rapport JSON attaché au test pour debug

---

## Couche 5 — Performance Budget

**Tag :** `@perf`
**Trigger :** Chaque PR
**Durée :** < 3 min

### Budgets par page

| Page | LCP max | FCP max | CLS max |
|------|---------|---------|---------|
| `/` (landing) | 2000ms | 1500ms | 0.1 |
| `/auth/login` | 1500ms | 1000ms | 0.05 |
| `/gestionnaire/dashboard` | 3000ms | 2000ms | 0.15 |
| `/gestionnaire/biens` | 2500ms | 1800ms | 0.1 |
| `/gestionnaire/interventions` | 2500ms | 1800ms | 0.1 |

### Méthode de mesure

- **FCP** : Paint Timing API (`performance.getEntriesByType('paint')`)
- **LCP** : PerformanceObserver `largest-contentful-paint` (dernier événement du flux)
- **CLS** : Layout Instability API, exclut `hadRecentInput`
- **Note CI** : Les valeurs sont ~20-30% plus lentes en CI (pas de GPU). Budgets ajustés en conséquence.

---

## Couche 6 — Visual Regression

**Tag :** `@visual`
**Trigger :** Chaque PR
**Durée :** < 5 min

### Composants surveillés

| Nom | Page | Sélecteur |
|-----|------|-----------|
| `login-page` | `/auth/login` | `main` |
| `dashboard-sidebar` | `/gestionnaire/dashboard` | `[data-testid="sidebar"]` |
| `intervention-card` | `/gestionnaire/interventions` | `[data-testid="intervention-list"]` |
| `billing-plans` | `/gestionnaire/settings/billing` | `[data-testid="pricing-cards"]` |
| `landing-hero` | `/` | `[data-testid="hero-section"]` |

### Configuration

- **Animations** : `disabled` (fige les animations CSS)
- **Tolérance** : `maxDiffPixelRatio: 0.01` (1%)
- **Masquage** : timestamps, avatars, notification counts
- **Baselines** : Générées en CI (pas en local), stockées en Git
- **Update** : `npx playwright test --update-snapshots`

---

## Couche 7 — Synthetic Monitoring

**Trigger :** Cron GitHub Actions toutes les 6h (`0 */6 * * *`)
**Durée :** < 1 min
**URL cible :** `https://app.seido.be` (production)
**Alerte :** Webhook Slack si échec

### Tests (read-only, aucune mutation)

1. Landing page loads (status 200 + title SEIDO)
2. Login page reachable (bouton connexion visible)
3. API health check (`/api/health` status 200)
4. Gestionnaire dashboard loads (compte monitoring read-only)
5. Blog accessible

### Compte monitoring dédié

- Email : `monitoring@seido.be` (ou similaire)
- Rôle : gestionnaire
- Accès : lecture seule
- Données : 1 immeuble pré-peuplé, 1 lot, 1 intervention

---

## Playwright Config Unifiée

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [['blob'], ['github']]
    : [['html', { open: 'never' }]],

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // ── Auth Setup ──
    { name: 'auth-setup', testMatch: /auth\.setup\.ts/, teardown: 'cleanup' },

    // ── Couche 1: Smoke ──
    {
      name: 'smoke',
      testMatch: /smoke\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Couche 2: E2E par rôle ──
    {
      name: 'gestionnaire',
      testMatch: /flows\/(property|contract|billing|supplier-contract).*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/gestionnaire.json' },
    },
    {
      name: 'prestataire',
      testMatch: /flows\/intervention-prestataire.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/prestataire.json' },
    },
    {
      name: 'locataire',
      testMatch: /flows\/intervention-locataire.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/locataire.json' },
    },
    {
      name: 'multi-role',
      testMatch: /flows\/.*(lifecycle|quote|conversation|admin|email).*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Couche 3: Cross-Browser (nightly) ──
    {
      name: 'firefox',
      testMatch: /flows\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /flows\/.*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: /flows\/intervention-(prestataire|locataire).*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      testMatch: /flows\/intervention-(prestataire|locataire).*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'tablet',
      testMatch: /flows\/(property|contract).*\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['iPad Pro 11'] },
    },

    // ── Cleanup ──
    { name: 'cleanup', testMatch: /global\.teardown\.ts/ },
  ],

  // Serveur Next.js local (pas en CI — utilise preview URL)
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

---

## CI/CD Pipeline

### Workflow principal (ci.yml)

```
Push/PR
  │
  ├── lint ──────────┐
  ├── typecheck ─────┤── build ── e2e-smoke ── e2e-flows (×4 matrix)
  ├── unit-tests     │
  │                  │
  ├── accessibility ─┘  (parallèle après build)
  ├── performance ──────(parallèle après build)
  └── visual-regression (PR only, parallèle après build)
```

### Workflow nightly (nightly.yml)

```
Cron 3h → cross-browser (×5 matrix: firefox, webkit, pixel, iphone, ipad)
```

### Workflow monitoring (synthetic-monitoring.yml)

```
Cron 6h → smoke-production (5 tests read-only sur app.seido.be)
         → Slack webhook si échec
```

---

## Dépendances à installer

```bash
# Déjà installé
@playwright/test: ^1.58.2

# À installer
npm install -D @axe-core/playwright
```

**À supprimer (après migration Phase 4) :**
```bash
npm uninstall puppeteer
```

**Fichiers à supprimer (après migration) :**
- `tests/e2e/vitest.e2e.config.ts`
- `tests/e2e/setup/global-setup.ts`
- `tests/e2e/setup/global-teardown.ts`
- `tests/e2e/helpers/browser.ts`
- `tests/e2e/helpers/cookies.ts`
- Tous les `.e2e.ts` (remplacés par `.spec.ts`)

---

## Automatisation AI

### Playwright Agents (natifs v1.58)

Playwright v1.58 inclut 3 agents LLM natifs :
- **Planner** : Explore l'app et produit un plan de test en Markdown
- **Generator** : Transforme le plan en fichiers `.spec.ts`
- **Healer** : Exécute les tests et répare automatiquement les échecs

### Slash Command Claude Code

```
/.claude/commands/generate-e2e-test.md
```

Génère un test E2E pour un flow spécifié en utilisant les POMs existants.

### Hook post-PR

Après chaque PR, Claude Code analyse le diff et suggère les tests manquants.

---

## Roadmap d'Implémentation

| Phase | Contenu | Complexité |
|-------|---------|------------|
| **Phase 1** | Setup Playwright config unifiée + auth fixtures (4 rôles) | Simple |
| **Phase 2** | Migration 8 tests Puppeteer → Playwright (POMs + specs) | Moyenne |
| **Phase 3** | CI/CD pipeline complet (3 workflows GitHub Actions) | Simple |
| **Phase 4** | 5 flows manquants (devis, conversations, fournisseur, admin, email) | Élevée |
| **Phase 5** | Accessibilité (axe-core fixture + 19 pages scannées) | Simple |
| **Phase 6** | Performance budget (Web Vitals sur 5 pages) | Simple |
| **Phase 7** | Visual regression (baselines pour 5 composants) | Simple |
| **Phase 8** | Cross-browser & mobile (nightly pipeline + 5 projets) | Simple |
| **Phase 9** | Synthetic monitoring (cron 6h + alerte Slack) | Simple |
| **Phase 10** | Agents AI (slash command + Playwright Agents v1.58) | Moyenne |

---

## Sources

- [Playwright Best Practices (officiel)](https://playwright.dev/docs/best-practices)
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Playwright Emulation](https://playwright.dev/docs/emulation)
- [Playwright CI Setup](https://playwright.dev/docs/ci-intro)
- [15 Playwright Best Practices 2026 — BrowserStack](https://www.browserstack.com/guide/playwright-best-practices)
- [Playwright CI/CD GitHub Actions — Techlistic](https://www.techlistic.com/2026/02/playwright-cicd-integration-with-github.html)
- [E2E Testing Next.js + Playwright — enreina.com](https://enreina.com/blog/e2e-testing-in-next-js-with-playwright-vercel-and-github-actions-a-guide-with-example/)
- [Supawright — Playwright Test Harness for Supabase](https://github.com/isaacharrisholt/supawright)
- [Autonomous QA with AI Agents — OpenObserve](https://openobserve.ai/blog/autonomous-qa-testing-ai-agents-claude-code/)
- [Playwright Agents + Claude Code — Shipyard](https://shipyard.build/blog/playwright-agents-claude-code/)
- [Checkly — Measuring Page Performance](https://www.checklyhq.com/docs/learn/playwright/performance/)
- [Synthetic Monitoring with Playwright — Step.dev](https://step.dev/tutorials/synthetic-monitoring-with-playwright/)
- [MakerKit — E2E Testing SaaS](https://makerkit.dev/blog/tutorials/playwright-testing)
- [@axe-core/playwright — npm](https://www.npmjs.com/package/@axe-core/playwright)
