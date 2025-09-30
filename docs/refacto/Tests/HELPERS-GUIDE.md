# 🧪 Guide de l'Architecture Modulaire des Tests E2E

## 📋 Vue d'ensemble

Cette architecture modulaire a été créée à partir des **patterns validés** de Phase 2 Contacts qui ont obtenu **100% de succès**. Elle permet de réutiliser des composants de test fiables dans tous les test suites.

## 🎯 Objectifs

1. **DRY (Don't Repeat Yourself)**: Éliminer la duplication de code dans les tests
2. **Fiabilité**: Utiliser des patterns validés avec taux de réussite prouvé
3. **Maintenabilité**: Modifications centralisées au lieu de mises à jour dans chaque test
4. **Rapidité**: Tests de validation rapide (< 15s) avant suites complètes

## 📁 Structure des Fichiers

```
docs/refacto/Tests/
├── helpers/
│   ├── auth-helpers.ts           # 🔐 Fonctions d'authentification
│   ├── navigation-helpers.ts     # 🧭 Fonctions de navigation
│   ├── e2e-test-logger.ts        # 📊 Logger pour tests (optionnel)
│   └── index.ts                  # 📦 Exports centralisés
├── fixtures/
│   ├── users.fixture.ts          # 👤 Données utilisateur de test
│   ├── buildings.fixture.ts      # 🏢 Données bâtiments de test
│   └── contacts.fixture.ts       # 📇 Données contacts de test
└── tests/
    ├── phase1-auth/              # Tests authentification
    ├── phase2-contacts/          # Tests contacts (100% success)
    ├── phase2-buildings/         # Tests bâtiments (migrés)
    └── phase2-interventions/     # Tests interventions (à venir)

test/e2e/standalone/
└── auth-validation.spec.ts       # ⚡ Test validation rapide
```

## 🔐 Auth Helpers

### Imports

```typescript
import {
  loginAsGestionnaire,
  loginAsLocataire,
  loginAsPrestataire,
  login,
  logout
} from '@/docs/refacto/Tests/helpers'
```

### Fonctions Disponibles

#### `loginAsGestionnaire(page: Page)`
Authentification en tant que Gestionnaire (Manager).

**Exemple:**
```typescript
test('should access buildings list', async ({ page }) => {
  await loginAsGestionnaire(page)
  // Le test commence directement sur /gestionnaire/dashboard
  await expect(page).toHaveURL(/gestionnaire\/dashboard/)
})
```

#### `loginAsLocataire(page: Page)`
Authentification en tant que Locataire (Tenant).

**Exemple:**
```typescript
test('should create intervention request', async ({ page }) => {
  await loginAsLocataire(page)
  await expect(page).toHaveURL(/locataire\/dashboard/)
})
```

#### `loginAsPrestataire(page: Page)`
Authentification en tant que Prestataire (Service Provider).

**Exemple:**
```typescript
test('should view assigned interventions', async ({ page }) => {
  await loginAsPrestataire(page)
  await expect(page).toHaveURL(/prestataire\/dashboard/)
})
```

#### `login(page: Page, role: 'gestionnaire' | 'locataire' | 'prestataire')`
Authentification dynamique par rôle.

**Exemple:**
```typescript
const testRoles = ['gestionnaire', 'locataire', 'prestataire'] as const

for (const role of testRoles) {
  test(`${role} should login successfully`, async ({ page }) => {
    await login(page, role)
    await expect(page).toHaveURL(new RegExp(role))
  })
}
```

#### `logout(page: Page)`
Déconnexion utilisateur avec redirection vers login.

**Exemple:**
```typescript
test('should logout and redirect to login', async ({ page }) => {
  await loginAsGestionnaire(page)
  await logout(page)
  await expect(page).toHaveURL(/auth\/login/)
})
```

## 🧭 Navigation Helpers

### Imports

```typescript
import {
  navigateToContacts,
  navigateToBuildings,
  navigateToLots,
  navigateToInterventions,
  navigateToDashboard,
  navigateTo
} from '@/docs/refacto/Tests/helpers'
```

### Fonctions Disponibles

#### `navigateToBuildings(page: Page)`
Navigation vers la page Biens (Buildings).

**Exemple:**
```typescript
test('should display buildings list', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateToBuildings(page)

  await expect(page).toHaveURL(/gestionnaire\/biens/)
  await expect(page.locator('h1, h2')).toContainText(/Biens|Bâtiments/i)
})
```

#### `navigateToContacts(page: Page)`
Navigation vers la page Contacts.

**Exemple:**
```typescript
test('should manage contacts', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateToContacts(page)

  const addButton = page.locator('button:has-text("Ajouter")')
  await expect(addButton).toBeVisible()
})
```

#### `navigateToLots(page: Page)`
Navigation vers la page Lots (Units).

**Exemple:**
```typescript
test('should display lots list', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateToLots(page)

  await expect(page).toHaveURL(/gestionnaire\/lots/)
})
```

#### `navigateToInterventions(page: Page)`
Navigation vers la page Interventions.

**Exemple:**
```typescript
test('should view interventions', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateToInterventions(page)

  await expect(page.locator('h1')).toContainText(/Interventions/i)
})
```

#### `navigateToDashboard(page: Page, role?: string)`
Navigation vers le dashboard du rôle actuel.

**Exemple:**
```typescript
test('should return to dashboard', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateToBuildings(page)
  await navigateToDashboard(page, 'gestionnaire')

  await expect(page).toHaveURL(/gestionnaire\/dashboard/)
})
```

#### `navigateTo(page: Page, path: string, options?)`
Navigation générique avec attente de stabilité.

**Exemple:**
```typescript
test('should navigate to custom page', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateTo(page, '/gestionnaire/rapports', {
    waitForSelector: '[data-testid="reports-table"]',
    timeout: 20000
  })
})
```

## 🎨 Patterns Validés

### Pattern 1: Login avec Next.js 15 Server Actions

**✅ VALIDÉ** dans Phase 2 Contacts (100% success)

```typescript
// ✅ Correct: Promise.all() capture le redirect de Server Action
await Promise.all([
  page.waitForURL(`**${expectedDashboard}**`, {
    timeout: 45000  // Auth + middleware + redirect
  }),
  page.click('button[type="submit"]', { timeout: 5000 })
])

// Attendre stabilité React
await page.waitForLoadState('networkidle')
await page.waitForTimeout(2000)
```

**❌ Incorrect:**
```typescript
// Ne capture pas le redirect de Next.js redirect()
await page.click('button[type="submit"]')
await page.waitForURL(expectedDashboard)  // Trop tard
```

### Pattern 2: Navigation avec React Hydration

**✅ VALIDÉ** dans Phase 2 Contacts

```typescript
await page.goto(url, {
  waitUntil: 'domcontentloaded',  // Plus permissif que 'networkidle'
  timeout: 30000
})

// Attendre navigation visible
await page.waitForSelector('nav, header, [role="navigation"]', {
  timeout: 15000
})

// Attendre hydration React
await page.waitForTimeout(2000)
```

### Pattern 3: Timeouts Appropriés

**✅ VALIDÉ** empiriquement

| Action | Timeout | Raison |
|--------|---------|--------|
| Login complet | 45s | Auth + middleware + redirect + hydration |
| Navigation | 30s | Network + React hydration |
| Selector wait | 15s | DOM mount + render |
| React stabilization | 2s | Component mounting |
| Form submission | 30s | Server Action + validation |

### Pattern 4: Sélecteurs Robustes

**✅ VALIDÉ** dans tous les tests Phase 2

```typescript
// ✅ Préférer: Sélecteurs multiples avec fallback
const button = page.locator(
  'button:has-text("Ajouter"), button:has-text("Nouveau"), [data-testid="add-button"]'
).first()

// ✅ Texte case-insensitive avec regex
await expect(page.locator('h1')).toContainText(/Biens|Buildings|Bâtiments/i)

// ❌ Éviter: Sélecteurs CSS fragiles
const button = page.locator('.css-class-that-might-change')
```

## ⚡ Test Standalone de Validation

**Objectif:** Vérifier rapidement que les helpers fonctionnent (< 15s par rôle).

**Fichier:** `test/e2e/standalone/auth-validation.spec.ts`

### Utilisation

```bash
# Validation rapide avant suite complète
npx playwright test test/e2e/standalone/auth-validation.spec.ts --headed

# Si succès: lancer suite complète
npx playwright test --project=phase2-buildings
```

### Résultats Attendus

```
✅ Login Gestionnaire should work (16.9s)
✅ Login Locataire should work (14.3s)
✅ Login Prestataire should work (15.1s)

3 passed (46.3s)
```

## 📊 Migration d'un Test Existant

### Avant (Code Dupliqué)

```typescript
// ❌ 50+ lignes de code dupliqué
async function loginAsGestionnaire(page: Page) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', 'arthur@seido.pm')
  await page.fill('input[type="password"]', 'Wxcvbn123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/gestionnaire/dashboard**')
  // ... plus de code
}

async function navigateToBuildingsPage(page: Page) {
  await page.goto('/gestionnaire/biens')
  await page.waitForLoadState('networkidle')
  // ... plus de code
}

test('should display buildings', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateToBuildingsPage(page)
  // test logic
})
```

### Après (Helpers Modulaires)

```typescript
// ✅ 2 lignes - Helpers validés
import { loginAsGestionnaire, navigateToBuildings } from '../../helpers'

test('should display buildings', async ({ page }) => {
  await loginAsGestionnaire(page)
  await navigateToBuildings(page)
  // test logic
})
```

**Résultat:**
- **-48 lignes** de code par fichier de test
- **0 duplication** de logique d'auth/navigation
- **Patterns validés** automatiquement appliqués

## 🏗️ Créer un Nouveau Test

### Template Minimal

```typescript
import { test, expect } from '@playwright/test'
import { loginAsGestionnaire, navigateToBuildings } from '../../helpers'

test.describe('🏢 My New Feature Tests', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGestionnaire(page)
  })

  test('should do something', async ({ page }) => {
    await navigateToBuildings(page)

    // Votre logique de test ici
    const addButton = page.locator('button:has-text("Ajouter")')
    await expect(addButton).toBeVisible({ timeout: 10000 })
  })
})
```

### Template Complet avec Multi-Rôles

```typescript
import { test, expect } from '@playwright/test'
import { login } from '../../helpers'
import { TEST_USERS } from '../../fixtures/users.fixture'

test.describe('🔒 Multi-Role Feature Tests', () => {

  const roles = ['gestionnaire', 'locataire', 'prestataire'] as const

  for (const role of roles) {
    test(`${role} should have proper access`, async ({ page }) => {
      await login(page, role)

      const user = TEST_USERS[role]
      await expect(page).toHaveURL(new RegExp(user.expectedDashboard))

      // Test logique spécifique au rôle
      if (role === 'gestionnaire') {
        const addButton = page.locator('button:has-text("Ajouter")')
        await expect(addButton).toBeVisible()
      }
    })
  }
})
```

## 🐛 Troubleshooting

### Test Timeout sur Login

**Symptôme:** Test timeout après 2 minutes sur page login

**Causes possibles:**
1. ❌ **Server bugs** - Vérifier logs serveur avec `npm run dev`
2. ❌ **Mauvais credentials** - Vérifier `fixtures/users.fixture.ts`
3. ❌ **Middleware redirect loop** - Vérifier `middleware.ts`

**Solution:**
```bash
# Lancer serveur en mode dev avec logs
npm run dev

# Exécuter test standalone en mode headed
npx playwright test test/e2e/standalone/auth-validation.spec.ts --headed

# Observer comportement dans navigateur
```

### Sélecteurs Non Trouvés

**Symptôme:** `Error: locator.click: Timeout 15000ms exceeded`

**Solution:**
```typescript
// ❌ Sélecteur trop spécifique
await page.click('button.css-hash-class')

// ✅ Sélecteurs multiples avec fallback
const button = page.locator(
  'button:has-text("Ajouter"), [data-testid="add-btn"], [aria-label="Ajouter"]'
).first()

await button.waitFor({ state: 'visible', timeout: 15000 })
await button.click()
```

### React Hydration Race Conditions

**Symptôme:** Sélecteur trouvé mais click échoue

**Solution:**
```typescript
// ✅ Attendre stabilité après navigation
await page.goto('/gestionnaire/biens', {
  waitUntil: 'domcontentloaded'
})

await page.waitForLoadState('networkidle')
await page.waitForTimeout(2000)  // React hydration

// Maintenant interactions sont safe
await page.click('button:has-text("Ajouter")')
```

## 📈 Métriques de Qualité

### Phase 2 Contacts (Baseline)
- ✅ **100% success rate** (7/7 tests passed)
- ⚡ **Moyenne: 24s par test**
- 🎯 **0 flaky tests**

### Phase 2 Buildings (Après Migration)
- 🔄 **En cours de validation** (bloqué par bugs serveur)
- 📊 **16 tests migrés** vers helpers modulaires
- 📉 **-96 lignes** de code dupliqué éliminé

### Objectif Global
- 🎯 **100% success rate** sur tous les test suites
- ⚡ **< 30s par test** en moyenne
- 📦 **0 duplication** de logique auth/navigation
- 🔄 **< 5 min** pour migration d'un nouveau test suite

## 🚀 Prochaines Étapes

1. **Résoudre bugs serveur** (bloque validation)
   - ❌ `Auth session missing!` dans auth-dal
   - ❌ `buildingService.findByTeam is not a function`

2. **Valider Phase 2 Buildings** avec helpers
   - Exécuter suite complète après fix serveur
   - Vérifier 100% success rate

3. **Migrer Phase 2 Interventions** vers helpers
   - Appliquer même pattern de migration
   - Ajouter helpers spécifiques si nécessaires

4. **Créer Phase 3 Tests** (workflows cross-rôle)
   - Locataire crée intervention
   - Gestionnaire approuve
   - Prestataire soumet devis
   - etc.

## 📚 Références

- **Source validée:** `test/e2e/gestionnaire-invite-locataire.spec.ts` (100% success)
- **Playwright Docs:** https://playwright.dev/docs/intro
- **Next.js 15 Testing:** https://nextjs.org/docs/app/building-your-application/testing/playwright
- **Test Fixtures:** `docs/refacto/Tests/fixtures/`

---

**Créé:** 2025-09-30
**Dernière mise à jour:** 2025-09-30
**Status:** ✅ Architecture Complete - ⚠️ Validation bloquée par bugs serveur
