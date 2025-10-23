# 🤝 Contributing Guide - Tests E2E Auto-Healing

Guide pour contribuer aux tests E2E avec auto-healing.

---

## 📖 Table des Matières

- [Prérequis](#-prérequis)
- [Configuration Développement](#-configuration-développement)
- [Écrire un Test](#-écrire-un-test)
- [Créer un Helper](#-créer-un-helper)
- [Implémenter un Agent](#-implémenter-un-agent)
- [Debugging](#-debugging)
- [Best Practices](#-best-practices)
- [Checklist Pull Request](#-checklist-pull-request)

---

## ✅ Prérequis

### Connaissances Requises

- ✅ JavaScript/TypeScript
- ✅ Playwright (bases)
- ✅ Next.js App Router
- ✅ Async/await patterns
- ✅ Git workflow

### Outils Installés

```bash
# Node.js >= 18
node --version

# Playwright
npx playwright --version

# Si manquant :
npx playwright install
npx playwright install-deps
```

---

## 🔧 Configuration Développement

### 1. Cloner et installer

```bash
# Clone
git clone [repo]
cd seido-app

# Install dependencies
npm install

# Verify Playwright
npx playwright --version
```

### 2. Configuration environnement

```bash
# Copier .env.example
cp .env.example .env.local

# Configurer les variables
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - RESEND_API_KEY
```

### 3. Démarrer serveur de dev

```bash
# Terminal 1
npm run dev

# Attendre : ✓ Ready in 2.3s
```

### 4. Lancer les tests

```bash
# Terminal 2
npm run test:new:signup
```

---

## ✍️ Écrire un Test

### Template de Base

```typescript
/**
 * 🧪 TEST [FEATURE] - [Description]
 *
 * Test du workflow :
 * 1. Étape 1
 * 2. Étape 2
 * 3. ...
 */

import { test, expect } from '../helpers/test-runner'
import { generateTestEmail } from '../config/test-config'
import {
  // Importer helpers nécessaires
  navigateToLogin,
  fillLoginForm,
  // ...
} from '../helpers/auth-helpers'

test.describe('[Feature] - [Category]', () => {
  test('[Test name]', async ({ page, logCollector, bugDetector }) => {
    // Générer données de test uniques
    const testEmail = generateTestEmail('gestionnaire', Date.now())
    const testData = { /* ... */ }

    console.log('🧪 Starting test: [Test name]')

    try {
      // ÉTAPE 1 : Description
      console.log('\n📍 STEP 1: [Description]')
      await helperFunction(page, testData)

      // ÉTAPE 2 : Description
      console.log('\n📍 STEP 2: [Description]')
      // ...

      // Assertions
      expect(result).toBeTruthy()

      console.log('\n✅ ✅ ✅ TEST PASSED ✅ ✅ ✅\n')
    } catch (error) {
      console.error('\n❌ TEST FAILED\n')

      if (error instanceof Error) {
        bugDetector.recordBug(error, {
          step: '[current-step]',
          testData,
        })
      }

      // Screenshot
      await page.screenshot({
        fullPage: true,
        path: `${logCollector['logPaths'].screenshots}/failure-${Date.now()}.png`,
      })

      throw error
    } finally {
      // Cleanup
      console.log('\n🧹 Cleanup')
      // Cleanup code here
    }
  })
})
```

### Exemple Concret : Login Test

```typescript
/**
 * 🧪 TEST LOGIN - Test du flux de connexion
 *
 * Test du workflow :
 * 1. Naviguer vers page de login
 * 2. Remplir formulaire avec credentials valides
 * 3. Soumettre formulaire
 * 4. Vérifier redirection vers dashboard
 * 5. Vérifier authentification
 */

import { test, expect } from '../helpers/test-runner'
import { testUsers } from '../config/test-config'
import {
  navigateToLogin,
  fillLoginForm,
  submitLoginForm,
  waitForDashboard,
  expectAuthenticated,
} from '../helpers/auth-helpers'

test.describe('Authentication - Login', () => {
  test('Login with valid credentials', async ({ page }) => {
    const testUser = testUsers.gestionnaire

    console.log('🧪 Starting login test with:', testUser.email)

    // ÉTAPE 1 : Naviguer vers login
    console.log('\n📍 STEP 1: Navigate to login page')
    await navigateToLogin(page)

    // ÉTAPE 2 : Remplir formulaire
    console.log('\n📍 STEP 2: Fill login form')
    await fillLoginForm(page, {
      email: testUser.email,
      password: testUser.password,
    })

    // ÉTAPE 3 : Soumettre
    console.log('\n📍 STEP 3: Submit login form')
    await submitLoginForm(page)

    // ÉTAPE 4 : Attendre redirection
    console.log('\n📍 STEP 4: Wait for dashboard redirect')
    await waitForDashboard(page, testUser.role)

    // ÉTAPE 5 : Vérifier authentification
    console.log('\n📍 STEP 5: Verify authentication')
    await expectAuthenticated(page)

    // Vérifier URL
    const url = page.url()
    expect(url).toContain(`/${testUser.role}/dashboard`)

    console.log('\n✅ ✅ ✅ LOGIN TEST PASSED ✅ ✅ ✅\n')
  })

  test('Login with invalid credentials should show error', async ({ page }) => {
    console.log('\n🧪 Starting login validation test')

    await navigateToLogin(page)

    await fillLoginForm(page, {
      email: 'invalid@test.com',
      password: 'wrong-password',
    })

    await submitLoginForm(page)

    // Vérifier message d'erreur
    const error = page.locator('text=/Email ou mot de passe incorrect/i')
    await expect(error).toBeVisible({ timeout: 5000 })

    console.log('✅ Error message shown correctly')
  })
})
```

---

## 🛠️ Créer un Helper

### Template Helper

```typescript
/**
 * [Description du helper]
 *
 * @param page - Playwright Page
 * @param [autres params] - Description
 * @returns [Type de retour]
 *
 * @example
 * await myHelper(page, data)
 */
export const myHelper = async (
  page: Page,
  // Autres paramètres
): Promise<void> => {
  console.log('📝 [HELPER-NAME] Starting...')

  try {
    // Implémentation
    await page.click('button')

    console.log('✅ [HELPER-NAME] Done')
  } catch (error) {
    console.error('❌ [HELPER-NAME] Failed:', error)
    throw error
  }
}
```

### Exemple : Helper pour Vérifier Dashboard Content

```typescript
/**
 * Vérifier que le dashboard contient le nom de l'utilisateur
 *
 * @param page - Playwright Page
 * @param userName - Nom de l'utilisateur à vérifier
 *
 * @example
 * await expectDashboardWithUserName(page, 'Jean Dupont')
 */
export const expectDashboardWithUserName = async (
  page: Page,
  userName: string
): Promise<void> => {
  console.log('🔍 Verifying dashboard contains user name:', userName)

  // Attendre que le nom soit visible
  const userNameLocator = page.locator(`text=${userName}`)
  await userNameLocator.waitFor({ timeout: 5000 })

  // Vérifier visibilité
  await expect(userNameLocator).toBeVisible()

  console.log('✅ User name found on dashboard')
}
```

### Ajouter au Fichier Helpers

```typescript
// helpers/auth-helpers.ts

// ... existing helpers ...

export const expectDashboardWithUserName = async (
  page: Page,
  userName: string
): Promise<void> => {
  // Implementation
}

// Exporter à la fin
export default {
  // ... existing exports ...
  expectDashboardWithUserName,
}
```

---

## 🤖 Implémenter un Agent

### Template Agent

```typescript
/**
 * 🤖 [AGENT NAME] - [Description]
 *
 * Responsabilité :
 * - [Responsabilité 1]
 * - [Responsabilité 2]
 */

import { LogEntry } from '../utils/log-collector'

export interface DebugAnalysis {
  bugType: 'frontend' | 'backend' | 'api'
  severity: 'low' | 'medium' | 'high'
  root cause: string
  affectedComponents: string[]
  suggestedFix: string
}

export interface CodeFix {
  filePath: string
  changes: Array<{
    line: number
    oldCode: string
    newCode: string
  }>
  description: string
}

export class [AgentName]Debugger {
  /**
   * Analyser les logs et l'erreur
   */
  async analyze(
    logs: LogEntry[],
    error: Error
  ): Promise<DebugAnalysis> {
    console.log('[AGENT] Analyzing error:', error.message)

    // Analyse des logs
    const errorLogs = logs.filter((log) => log.level === 'error')

    // Détection du type de bug
    const bugType = this.detectBugType(error, errorLogs)

    // Identification de la cause
    const rootCause = this.identifyRootCause(error, errorLogs)

    return {
      bugType,
      severity: 'high',
      rootCause,
      affectedComponents: [],
      suggestedFix: '',
    }
  }

  /**
   * Générer un fix automatique
   */
  async fix(analysis: DebugAnalysis): Promise<CodeFix> {
    console.log('[AGENT] Generating fix for:', analysis.rootCause)

    // Générer le fix
    return {
      filePath: '',
      changes: [],
      description: '',
    }
  }

  /**
   * Valider que le fix fonctionne
   */
  async validate(fix: CodeFix): Promise<boolean> {
    console.log('[AGENT] Validating fix:', fix.description)

    // Appliquer le fix temporairement
    // Relancer le test
    // Vérifier succès

    return true
  }

  private detectBugType(
    error: Error,
    logs: LogEntry[]
  ): DebugAnalysis['bugType'] {
    // Détecter le type de bug basé sur le message d'erreur
    if (error.message.includes('element not found')) {
      return 'frontend'
    }

    if (error.message.includes('database') || error.message.includes('RLS')) {
      return 'backend'
    }

    if (error.message.includes('404') || error.message.includes('401')) {
      return 'api'
    }

    return 'frontend'
  }

  private identifyRootCause(error: Error, logs: LogEntry[]): string {
    // Analyser les logs pour identifier la cause racine
    return error.message
  }
}

export const create[AgentName]Debugger = (): [AgentName]Debugger => {
  return new [AgentName]Debugger()
}
```

### Intégrer dans Coordinator

```typescript
// agents/coordinator.ts

import { create[AgentName]Debugger } from './debugger/[agent-name]-debugger'

export class Coordinator {
  private debuggers = {
    frontend: createFrontendDebugger(),
    backend: createBackendDebugger(),
    api: createAPIDebugger(),
    [agentName]: create[AgentName]Debugger(), // Nouveau
  }

  async analyzeAndFix(
    logs: LogEntry[],
    error: Error
  ): Promise<void> {
    // Identifier le debugger approprié
    const debuggerType = this.identifyDebuggerType(error)
    const debugger = this.debuggers[debuggerType]

    // Analyser
    const analysis = await debugger.analyze(logs, error)

    // Générer fix
    const fix = await debugger.fix(analysis)

    // Appliquer fix
    await this.applyFix(fix)

    // Valider
    const valid = await debugger.validate(fix)

    if (!valid) {
      throw new Error('Fix validation failed')
    }
  }
}
```

---

## 🐛 Debugging

### Lancer en Mode Headed

```bash
npm run test:new:headed
# ou
HEADED=true npm run test:new:signup
```

### Lancer avec Debug Playwright

```bash
DEBUG=pw:api npm run test:new:signup
```

### Consulter les Logs

```bash
# Rapport principal
notepad tests-new\logs\[test-name]\report.md

# Logs console
type tests-new\logs\[test-name]\console.log

# Logs réseau
type tests-new\logs\[test-name]\network.log
```

### Désactiver Auto-Healing

```bash
# Temporairement
DISABLE_AUTO_HEALING=true npm run test:new:signup
```

### Playwright Inspector

```bash
# Lancer avec inspector
npx playwright test --debug tests-new/auth/signup.spec.ts
```

---

## 📚 Best Practices

### 1. Nommage

```typescript
// ✅ Bon
test('Login with valid credentials')
export const fillSignupForm = async (page, user) => {}

// ❌ Mauvais
test('test1')
export const doStuff = async (page) => {}
```

### 2. Logs

```typescript
// ✅ Bon - Logs descriptifs à chaque étape
console.log('📍 STEP 1: Navigate to signup page')
console.log('✅ Signup page loaded')

// ❌ Mauvais - Pas de logs
// ...code without logs...
```

### 3. Error Handling

```typescript
// ✅ Bon - Enregistrer le bug avec métadonnées
try {
  await testFunction()
} catch (error) {
  if (error instanceof Error) {
    bugDetector.recordBug(error, {
      step: 'signup-form-submission',
      email: testEmail,
      timestamp: Date.now(),
    })
  }
  throw error
}

// ❌ Mauvais - Pas de métadonnées
try {
  await testFunction()
} catch (error) {
  throw error
}
```

### 4. Cleanup

```typescript
// ✅ Bon - Cleanup dans finally
try {
  await test()
} finally {
  await cleanupTestUser(testEmail)
}

// ❌ Mauvais - Pas de cleanup
await test()
```

### 5. Assertions

```typescript
// ✅ Bon - Assertions descriptives
expect(result).toBeTruthy()
expect(url).toContain('/dashboard')

// ❌ Mauvais - Pas d'assertions
// ...no assertions...
```

### 6. Timeouts

```typescript
// ✅ Bon - Timeouts configurables
await page.waitForSelector('button', {
  timeout: TEST_CONFIG.timeout.action,
})

// ❌ Mauvais - Timeout hardcodé
await page.waitForSelector('button', { timeout: 5000 })
```

### 7. Data Uniques

```typescript
// ✅ Bon - Email unique par test
const testEmail = generateTestEmail('gestionnaire', Date.now())

// ❌ Mauvais - Email fixe (conflicts entre tests)
const testEmail = 'test@test.com'
```

---

## ✔️ Checklist Pull Request

Avant de soumettre une PR :

### Tests

- [ ] Tous les tests passent localement
- [ ] Tests ajoutés pour nouvelle fonctionnalité
- [ ] Tests en mode headed ET headless
- [ ] Pas de tests flaky (qui échouent parfois)

### Code Quality

- [ ] TypeScript strict (pas d'erreurs TS)
- [ ] ESLint passe (npm run lint)
- [ ] Pas de console.error non géré
- [ ] Logs descriptifs à chaque étape

### Documentation

- [ ] README mis à jour si nécessaire
- [ ] Commentaires JSDoc pour nouveaux helpers
- [ ] Exemple d'utilisation fourni

### Cleanup

- [ ] Cleanup automatique implémenté
- [ ] Pas de données de test laissées en DB
- [ ] Logs gitignored

### CI/CD

- [ ] Tests passent en CI
- [ ] Pas de fichiers volumineux committés
- [ ] .gitignore à jour

---

## 📞 Questions ?

- **Documentation** : Lire [README.md](./README.md) et [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Exemples** : Consulter `auth/signup.spec.ts`
- **Helpers** : Voir `helpers/auth-helpers.ts`
- **Playwright Docs** : https://playwright.dev/

---

**Happy Testing!** 🧪✨
