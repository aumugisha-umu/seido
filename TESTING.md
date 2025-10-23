# 🧪 SEIDO - Infrastructure de Tests

Infrastructure de tests moderne suivant les **recommandations officielles Next.js 15**.

## 📚 Documentation Officielle

- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)
- [Vitest avec Next.js](https://nextjs.org/docs/app/building-your-application/testing/vitest)
- [Playwright avec Next.js](https://nextjs.org/docs/app/building-your-application/testing/playwright)

---

## 🏗️ Architecture

```
SEIDO-app/
├── __tests__/              # Tests Vitest (Unit + Integration)
│   ├── setup.ts           # Configuration globale Vitest
│   ├── unit/              # Tests unitaires (services, utils)
│   └── integration/       # Tests d'intégration (API routes)
│
├── e2e/                   # Tests E2E Playwright
│   ├── auth/             # Tests authentification
│   ├── properties/       # Tests gestion biens/lots
│   ├── contacts/         # Tests gestion contacts
│   ├── interventions/    # Tests workflow interventions
│   └── fixtures/         # Données de test réutilisables
│
├── lib/**/*.test.ts      # Tests colocalisés (optionnel)
├── components/**/*.test.tsx
│
├── vitest.config.ts      # Config Vitest
├── playwright.config.ts  # Config Playwright
└── .github/workflows/test.yml  # CI/CD GitHub Actions
```

---

## 🚀 Scripts NPM

### Tests Vitest (Unit + Integration)

```bash
# Mode watch (développement)
npm test

# Exécution unique (CI)
npm run test:run

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration uniquement
npm run test:integration

# Couverture de code
npm run test:coverage

# Interface UI
npm run test:ui
```

### Tests E2E (Playwright)

```bash
# Tests E2E headless (CI)
npm run test:e2e

# Tests E2E avec navigateur visible
npm run test:e2e:headed

# Interface UI interactive
npm run test:e2e:ui

# Mode debug
npm run test:e2e:debug

# Voir le rapport
npm run test:e2e:report
```

### Tests CI complets

```bash
# Tous les tests (Vitest + Playwright)
npm run test:ci
```

---

## 📝 Écrire des Tests

### 1. Tests Unitaires (Vitest)

**Emplacement** : `__tests__/unit/` ou colocalisé `lib/**/*.test.ts`

**Exemple** :
```typescript
import { describe, it, expect } from 'vitest'

describe('calculateTotal', () => {
  it('devrait calculer le total correctement', () => {
    const result = calculateTotal([
      { price: 10, quantity: 2 },
      { price: 5, quantity: 3 },
    ])
    expect(result).toBe(35)
  })
})
```

**À tester** :
- ✅ Logique métier (services)
- ✅ Fonctions utilitaires
- ✅ Hooks React
- ❌ Async Server Components (préférer E2E)

### 2. Tests d'Intégration (Vitest)

**Emplacement** : `__tests__/integration/`

**Exemple** :
```typescript
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/buildings/route'

// Mock Supabase
vi.mock('@/lib/services/core/supabase-client')

describe('POST /api/buildings', () => {
  it('devrait créer un building', async () => {
    const request = new Request('http://localhost/api/buildings', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Building' })
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
```

**À tester** :
- ✅ API Routes
- ✅ Intégrations services + DB
- ✅ Validation (Zod schemas)

### 3. Tests E2E (Playwright)

**Emplacement** : `e2e/`

**Exemple** :
```typescript
import { test, expect } from '@playwright/test'
import { getTestUser } from './fixtures/test-users'

test('devrait connecter un gestionnaire', async ({ page }) => {
  const user = getTestUser('gestionnaire')

  await page.goto('/login')
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByLabel(/mot de passe/i).fill(user.password)
  await page.getByRole('button', { name: /se connecter/i }).click()

  await expect(page).toHaveURL(/\/gestionnaire/)
})
```

**À tester** :
- ✅ User flows critiques (auth, CRUD)
- ✅ Async Server Components
- ✅ Navigation et routing
- ✅ Intégrations complètes

---

## 🔧 Configuration

### Vitest

**Fichier** : `vitest.config.ts`

- ✅ Environnement jsdom
- ✅ Support TypeScript path aliases (`vite-tsconfig-paths`)
- ✅ Setup global (`__tests__/setup.ts`)
- ✅ Globals activés (pas besoin d'importer `describe`, `it`, `expect`)
- ✅ Coverage avec seuils à 70%

### Playwright

**Fichier** : `playwright.config.ts`

- ✅ Tests contre build production sur CI
- ✅ Mode dev en local (HMR)
- ✅ Chromium par défaut (Firefox/WebKit optionnels)
- ✅ Retries sur CI (2 tentatives)
- ✅ Workers = 1 sur CI, 4 en local
- ✅ Locale française

---

## 🤖 CI/CD GitHub Actions

**Fichier** : `.github/workflows/test.yml`

### Jobs

1. **vitest-tests** : Tests unitaires + intégration (Vitest)
2. **e2e-tests** : Tests E2E (Playwright)
3. **build-check** : TypeScript + ESLint + Build
4. **lighthouse-audit** : Performance (Pull Requests uniquement)
5. **test-summary** : Résumé des résultats

### Configuration requise

⚠️ **GitHub Secrets à configurer** (pour tests E2E sur CI) :
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY`
- `TEST_SUPABASE_SERVICE_KEY`

**Comment configurer** : GitHub Repo > Settings > Secrets and variables > Actions

---

## 📊 Stratégie de Tests

### Recommandations Next.js

> **E2E prioritaires pour Server Components async**
>
> Les Server Components asynchrones sont nouveaux. Les outils ne les supportent pas tous.
> → **Préférer les tests E2E (Playwright) pour les Server Components.**

### Répartition conseillée

- **70% E2E** : User flows, Server Components, intégrations
- **20% Unit** : Logique métier, services, utils
- **10% Integration** : API routes, validation

### Objectifs de couverture

- **Tests E2E** : 100% des user flows critiques
- **Tests Unit/Integration** : > 70% de couverture
- **Performance** : Lighthouse score > 90

---

## 🐛 Debugging

### Vitest

```bash
# Mode UI pour explorer les tests
npm run test:ui

# Watch mode pour développement
npm test
```

### Playwright

```bash
# Mode debug avec DevTools
npm run test:e2e:debug

# Mode UI interactif
npm run test:e2e:ui

# Tests avec navigateur visible
npm run test:e2e:headed
```

---

## 📖 Ressources

### Documentation Next.js
- [Testing Overview](https://nextjs.org/docs/app/building-your-application/testing)
- [Vitest Setup](https://nextjs.org/docs/app/building-your-application/testing/vitest)
- [Playwright Setup](https://nextjs.org/docs/app/building-your-application/testing/playwright)

### Guides Vitest
- [Getting Started](https://vitest.dev/guide/)
- [API Reference](https://vitest.dev/api/)
- [Mocking](https://vitest.dev/guide/mocking.html)

### Guides Playwright
- [Getting Started](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)

---

## ✅ Checklist avant Push

- [ ] Tests locaux passent : `npm test && npm run test:e2e`
- [ ] Couverture > 70% : `npm run test:coverage`
- [ ] Build réussit : `npm run build`
- [ ] Pas de `test.only` laissé dans le code
- [ ] Variables d'environnement configurées sur CI

---

**Dernière mise à jour** : 2025-10-23
**Version** : Next.js 15.2.4
