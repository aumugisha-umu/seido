# 📊 Plan de Stabilisation des Tests E2E Phase 2 Buildings

**Date:** 30 septembre 2025 - 23:45
**Status Actuel:** 1/16 tests passés (6.25%) en suite complète, 1/1 (100%) en isolation
**Objectif:** Atteindre 80%+ de taux de succès

---

## 🔍 Analyse des Problèmes

### Symptômes Observés

**Tests en Isolation** ✅
- `should display buildings list`: **PASSED** (1.0m)
- Authentication fonctionne parfaitement
- Page se charge correctement

**Tests en Suite Complète** ❌
- 9/16 tests échouent avec timeouts
- 1/16 test passe (`gestionnaire should have full CRUD access`)
- Timeouts variables: 30s - 1.4m

**Conclusion:** Le problème n'est PAS dans les helpers ou l'authentification, mais dans **l'isolation des états entre tests**.

---

## 🐛 Causes Identifiées

### 1. État Partagé Entre Tests

**Problème:**
```typescript
test.beforeEach(async ({ page }) => {
  await loginAsGestionnaire(page)  // Chaque test re-login
})
```

Les tests partagent potentiellement:
- ❌ Sessions navigateur
- ❌ Cache serveur (base-repository cache)
- ❌ État des cookies
- ❌ LocalStorage/SessionStorage

**Impact:** Test N peut hériter d'état corrompu de Test N-1

---

### 2. Global Setup Complexe

**Problème actuel** (`helpers/global-setup.ts`):
```typescript
// 1. Kill port 3000
// 2. Clean .next cache
// 3. Start fresh dev server
// 4. Wait for responsive
```

**Limitation:** Le serveur est partagé entre TOUS les tests. Si un test corrompt l'état serveur (cache, mémoire), les tests suivants échouent.

---

### 3. Timeouts Progressifs

**Pattern observé:**
```
Test 1: 57.9s (failed - timeout login)
Test 2: 1.0m (failed - timeout form)
Test 4: 1.4m (failed - timeout confirmation)
Test 7: 45s (PASSED)
```

**Explication:** Les tests deviennent de plus en plus lents → accumulation d'état/mémoire.

---

### 4. Cache BaseRepository Non Nettoyé

**Code actuel** (`lib/services/core/base-repository.ts`):
```typescript
private cache = new Map<string, CacheEntry>()
protected defaultCacheTTL = 300 // 5 minutes
```

**Problème:**
- Cache JAMAIS vidé entre tests
- TTL 5 minutes = données persistent entre 10+ tests
- Cache peut contenir données obsolètes/corrompues

---

## ✅ Solutions Proposées

### Solution 1: Isolation Complète par Context

**Principe:** Chaque test a son propre contexte navigateur isolé.

**Implémentation:**
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Force nouveau context pour chaque test
    browserName: 'chromium',
    launchOptions: {
      args: ['--disable-dev-shm-usage']  // Évite OOM
    }
  },

  // Chaque test worker a son propre browser
  workers: 1,  // Déjà configuré
  fullyParallel: false  // Tests séquentiels
})
```

**Nouveau helper:**
```typescript
// helpers/test-isolation.ts
export async function cleanBrowserState(page: Page) {
  // Clear all storage
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

// À appeler dans afterEach
test.afterEach(async ({ page }) => {
  await cleanBrowserState(page)
  await page.screenshot({ path: `screenshots/${test.info().title}.png` })
})
```

---

### Solution 2: Reset Cache Serveur Entre Tests

**Problème:** Cache BaseRepository persiste entre tests.

**Solution A - Endpoint de Nettoyage:**
```typescript
// app/api/test/clear-cache/route.ts
import { NextResponse } from 'next/server'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Clear all repository caches
  // TODO: Implement global cache clear

  return NextResponse.json({ success: true })
}
```

**Utilisation dans tests:**
```typescript
test.afterEach(async ({ request }) => {
  await request.post('http://localhost:3000/api/test/clear-cache')
})
```

**Solution B - TTL Court en Test:**
```typescript
// lib/services/core/base-repository.ts
protected defaultCacheTTL = process.env.NODE_ENV === 'test' ? 1 : 300
```

---

### Solution 3: Restart Serveur Entre Groupes de Tests

**Principe:** Au lieu d'un seul global setup, restart entre chaque describe block.

**Implémentation:**
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'phase2-buildings-list',
      testMatch: '**/buildings-management.spec.ts',
      testIgnore: '**/*create*',  // Seulement test 1
    },
    {
      name: 'phase2-buildings-create',
      testMatch: '**/buildings-management.spec.ts',
      testGrep: /create/,  // Seulement test 2
      dependencies: ['phase2-buildings-list']  // Après test 1
    }
    // etc.
  ]
})
```

**Bénéfice:** Serveur frais pour chaque groupe → pas d'accumulation mémoire.

---

### Solution 4: Augmenter Timeouts Progressivement

**Constat:** Tests deviennent plus lents au fil de la suite.

**Solution:**
```typescript
// helpers/auth-helpers.ts
const getAuthTimeout = () => {
  const testNumber = parseInt(process.env.PLAYWRIGHT_TEST_NUMBER || '1')
  const baseTimeout = 45000
  const increment = testNumber * 5000  // +5s par test
  return Math.min(baseTimeout + increment, 120000)  // Max 2 minutes
}

export async function loginAsGestionnaire(page: Page) {
  const timeout = getAuthTimeout()
  await Promise.all([
    page.waitForURL(`**${gestionnaire.expectedDashboard}**`, { timeout }),
    page.click('button[type="submit"]', { timeout: timeout + 5000 })
  ])
}
```

---

### Solution 5: Mode Debug pour Tests Échoués

**Objectif:** Comprendre POURQUOI un test timeout.

**Implémentation:**
```typescript
// helpers/debug-helpers.ts
export async function debugTestFailure(page: Page, testName: string) {
  const timestamp = Date.now()

  // 1. Screenshot
  await page.screenshot({
    path: `test-failures/${testName}-${timestamp}.png`,
    fullPage: true
  })

  // 2. Console logs
  const logs = await page.evaluate(() => {
    return window.console.logs || []
  })

  // 3. Network requests pending
  const pending = await page.evaluate(() => {
    return performance.getEntriesByType('resource')
      .filter(r => r.duration === 0)
  })

  // 4. DOM snapshot
  const html = await page.content()

  return {
    screenshot: `${testName}-${timestamp}.png`,
    logs,
    pendingRequests: pending,
    finalUrl: page.url(),
    dom: html
  }
}

// Usage dans test
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    const debug = await debugTestFailure(page, testInfo.title)
    console.log('🐛 Debug Info:', JSON.stringify(debug, null, 2))
  }
})
```

---

## 📋 Plan d'Action Prioritaire

### Phase 1: Quick Wins (30 min)

1. ✅ **Ajouter nettoyage browser state**
   ```typescript
   test.afterEach(async ({ page }) => {
     await page.context().clearCookies()
     await page.evaluate(() => {
       localStorage.clear()
       sessionStorage.clear()
     })
   })
   ```

2. ✅ **Réduire TTL cache en développement**
   ```typescript
   protected defaultCacheTTL = 30  // 30s au lieu de 5min
   ```

3. ✅ **Augmenter timeout global des tests**
   ```typescript
   test.setTimeout(120000)  // 2 minutes au lieu de 90s
   ```

---

### Phase 2: Isolation Robuste (1h)

4. ⏳ **Créer helper d'isolation**
   - `helpers/test-isolation.ts`
   - Nettoyage state complet
   - Appel automatique dans afterEach

5. ⏳ **Implémenter mode debug**
   - `helpers/debug-helpers.ts`
   - Capture automatique sur échec
   - Logs détaillés

6. ⏳ **Tests en parallèle par groupe**
   - Séparer tests read-only (safe) vs write (isolés)
   - Read-only peuvent runner en parallèle
   - Write doivent être séquentiels

---

### Phase 3: Optimisations Avancées (2h)

7. ⏳ **API de nettoyage cache**
   - Endpoint `/api/test/clear-cache`
   - Appel dans afterEach

8. ⏳ **Fixtures de données**
   - Créer données de test via API
   - Reset entre chaque test
   - État prévisible

9. ⏳ **Monitoring performance**
   - Logger durée chaque étape
   - Identifier bottlenecks
   - Optimiser parties lentes

---

## 🎯 Objectifs Mesurables

| Métrique | Actuel | Objectif Phase 1 | Objectif Phase 2 | Objectif Phase 3 |
|----------|--------|------------------|------------------|------------------|
| **Taux succès** | 6.25% (1/16) | 50% (8/16) | 75% (12/16) | 85%+ (14+/16) |
| **Durée moyenne/test** | 58s | 45s | 35s | 30s |
| **Timeouts** | 9/16 | 4/16 | 1/16 | 0/16 |
| **Flakiness** | Non mesuré | < 10% | < 5% | < 2% |

---

## 🔬 Tests de Validation

**Après chaque phase**, exécuter:

```bash
# Test isolation
npx playwright test --grep="should display buildings list" --repeat-each=5

# Suite complète
npx playwright test --project=phase2-buildings --retries=0

# Avec debug
DEBUG=pw:api npx playwright test --project=phase2-buildings
```

**Critères de succès:**
- ✅ 5/5 runs passent en isolation (0% flakiness)
- ✅ Taux de succès augmente de 20%+ par phase
- ✅ Aucun timeout sur tests précédemment passés

---

## 📚 Références

- **Playwright Best Practices:** https://playwright.dev/docs/best-practices
- **Test Isolation:** https://playwright.dev/docs/test-isolation
- **Debugging:** https://playwright.dev/docs/debug

---

**Créé:** 2025-09-30 23:45
**Status:** 📋 Plan prêt pour implémentation
**Prochaine étape:** Phase 1 Quick Wins
