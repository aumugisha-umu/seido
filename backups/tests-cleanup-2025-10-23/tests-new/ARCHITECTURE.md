# 🏗️ Architecture - Tests E2E Auto-Healing

Documentation technique de l'architecture de l'infrastructure de tests.

---

## 📐 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Developer)                         │
└────────────┬────────────────────────────────────────────────┘
             │
             │ npm run test:new:signup
             ▼
┌─────────────────────────────────────────────────────────────┐
│             Global Setup (helpers/global-setup.ts)          │
│  1. Prompt: Headed or Headless?                             │
│  2. Create log directories                                  │
│  3. Set environment variables                               │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            Test Runner (helpers/test-runner.ts)             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  test.extend<TestContext>({                        │     │
│  │    page,           // Playwright Page              │     │
│  │    logCollector,   // Logs multi-sources           │     │
│  │    bugDetector,    // Infinite loop detection      │     │
│  │    runWithHealing  // Auto-healing wrapper         │     │
│  │  })                                                 │     │
│  └────────────────────────────────────────────────────┘     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              Test Execution (auth/signup.spec.ts)           │
│  ┌────────────────────────────────────────────────────┐     │
│  │  test('signup', async ({ page, logCollector }) => │     │
│  │    // Setup email capture                          │     │
│  │    const emailCapture = createEmailCapture(...)    │     │
│  │                                                     │     │
│  │    // Steps                                        │     │
│  │    1. Navigate to signup                           │     │
│  │    2. Fill form                                    │     │
│  │    3. Submit                                       │     │
│  │    4. Wait for success                             │     │
│  │    5. Wait for email                               │     │
│  │    6. Extract link                                 │     │
│  │    7. Click link                                   │     │
│  │    8. Verify dashboard                             │     │
│  │  })                                                │     │
│  └────────────────────────────────────────────────────┘     │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────────────┬─────────────────┬─────────────┐
             ▼                  ▼                 ▼             ▼
      ┌──────────┐      ┌──────────┐     ┌──────────┐  ┌──────────┐
      │   Log    │      │   Bug    │     │  Email   │  │  Auth    │
      │Collector │      │ Detector │     │ Capture  │  │ Helpers  │
      └──────────┘      └──────────┘     └──────────┘  └──────────┘
             │                  │                 │             │
             ▼                  ▼                 ▼             ▼
      Capture logs       Detect loops      Intercept       Navigate
      - console          - Same bug 5x     Resend API      Fill forms
      - server           - Recommend       - Save HTML     Submit
      - supabase         - Stop if loop    - Extract link  Wait/Verify
      - pino
      - network
             │                  │
             ▼                  ▼
      ┌──────────────────────────────┐
      │  Save to files               │
      │  - console.log               │
      │  - server.log                │
      │  - supabase.log              │
      │  - pino.log                  │
      │  - network.log               │
      │  - report.md  ◄──────────────┤
      │  - infinite-loop.md          │
      │  - screenshots/              │
      │  - emails/                   │
      └──────────────────────────────┘
             │
             ▼
      ┌──────────────────────────────┐
      │  IF FAILED                   │
      │  Auto-Healing Loop           │
      │                              │
      │  1. Record bug               │
      │  2. Check infinite loop?     │
      │     ├─ YES: STOP + Report    │
      │     └─ NO: Continue          │
      │  3. [TODO] Call Coordinator  │
      │  4. Pause 2s                 │
      │  5. Retry (max 5 times)      │
      └──────────────────────────────┘
             │
             ▼
      ┌──────────────────────────────┐
      │  Global Teardown             │
      │  - Cleanup test user         │
      │  - Close resources           │
      └──────────────────────────────┘
```

---

## 🧩 Composants Clés

### 1. Configuration Layer

#### `config/test-config.ts`
**Responsabilité** : Configuration centralisée

```typescript
export const TEST_CONFIG = {
  baseURL: string,
  timeout: { test, action, navigation },
  autoHealing: { maxIterations, enabled, pauseBetweenRuns },
  logging: { enabled, logDir, capture... },
  screenshots: { onFailure, directory },
  testUsers: { gestionnaire, prestataire, locataire, admin },
  email: { mockEnabled, emailsDir },
  agents: { coordinator, frontend, backend, api },
}
```

**Helpers** :
- `getTestUser(role)` : Récupérer utilisateur de test
- `generateTestEmail(role, timestamp)` : Générer email unique
- `isAutoHealingEnabled()` : Vérifier si auto-healing activé
- `getLogPaths(testName)` : Chemins des fichiers de logs

#### `config/playwright.config.ts`
**Responsabilité** : Configuration Playwright

```typescript
export default defineConfig({
  testDir: '../',
  fullyParallel: false,  // Auto-healing séquentiel
  retries: 0,            // Géré par auto-healing
  workers: 1,            // Logs clairs
  reporter: ['list', 'html', 'json'],
  use: {
    baseURL,
    trace: 'on',         // Nécessaire pour debug
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  globalSetup: './helpers/global-setup.ts',
  globalTeardown: './helpers/global-teardown.ts',
})
```

---

### 2. Logging Layer

#### `agents/utils/log-collector.ts`
**Responsabilité** : Collecte logs multi-sources

```typescript
export class LogCollector {
  // Sources de logs
  - Browser Console  (page.on('console'))
  - JavaScript Errors (page.on('pageerror'))
  - Network Requests (page.on('request'))
  - Pino Logs       (JSON parsing)
  - Supabase Logs   (pattern matching)

  // Méthodes
  + initialize(page)
  + addLog(log)
  + getLogs()
  + getErrors()
  + saveLogs()
  + generateReport()
}
```

**Workflow** :
1. `initialize(page)` : Setup event listeners
2. Capture automatique pendant le test
3. `saveLogs()` : Sauvegarde dans fichiers séparés
4. `generateReport()` : Génère report.md

**Exemple d'événement** :
```typescript
page.on('console', (msg) => {
  const level = this.mapConsoleType(msg.type())
  const message = msg.text()

  // Détection Pino (JSON)
  if (this.isPinoLog(message)) {
    this.parsePinoLog(message)
    return
  }

  // Détection Supabase
  const source = message.includes('SUPABASE') ? 'supabase' : 'console'

  this.addLog({ timestamp, level, source, message })
})
```

#### `agents/utils/bug-detector.ts`
**Responsabilité** : Détection boucles infinies

```typescript
export class BugDetector {
  - bugHistory: BugReport[]
  - maxIterations: number

  // Méthodes
  + recordBug(error, metadata)
  + detectInfiniteLoop()
  + generateRecommendation(bug)
  + analyzeLogPatterns(logs)
  + getBugHistory()
}
```

**Algorithm Détection** :
1. Enregistrer bug avec ID unique (hash du message)
2. Incrémenter compteur si bug existe déjà
3. Vérifier si occurrences >= maxIterations (5)
4. Si oui : Générer recommandations intelligentes
5. Si non : Continuer auto-healing

**Recommandations Intelligentes** :
```typescript
const errorPatterns = [
  {
    pattern: /timeout|timed out/i,
    solution: "Vérifier serveur, augmenter timeouts..."
  },
  {
    pattern: /element not found/i,
    solution: "Vérifier sélecteurs, ajouter waitFor..."
  },
  // ...
]
```

---

### 3. Test Runner Layer

#### `helpers/test-runner.ts`
**Responsabilité** : Extension Playwright avec auto-healing

```typescript
export interface TestContext {
  page: Page
  logCollector: LogCollector
  bugDetector: BugDetector
  runWithHealing: <T>(testFn: () => Promise<T>) => Promise<T>
}

export const test = base.extend<TestContext>({
  page: async ({ page }, use) => {
    // Setup LogCollector
    const logCollector = createLogCollector(testInfo.title)
    await logCollector.initialize(page)

    try {
      await use(page)
      // Success
      await logCollector.saveLogs()
      await logCollector.generateReport({ passed: true })
    } catch (error) {
      // Failure
      bugDetector.recordBug(error)
      await logCollector.saveLogs()
      await logCollector.generateReport({ passed: false })
      throw error
    }
  },

  runWithHealing: async ({}, use) => {
    const runWithHealing = async (testFn) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await testFn()
        } catch (error) {
          const bug = bugDetector.recordBug(error)

          // Check infinite loop
          const loopDetection = bugDetector.detectInfiniteLoop()
          if (loopDetection.detected) {
            // STOP + Save infinite-loop.md
            throw new Error('Infinite loop detected')
          }

          // [TODO] Call coordinator agent
          // Pause
          await sleep(pauseBetweenRuns)
        }
      }
      throw lastError
    }

    await use(runWithHealing)
  }
})
```

**Workflow Auto-Healing** :
```
┌─────────────────────┐
│   Execute Test      │
└──────────┬──────────┘
           │
           ▼
      ┌────────┐
      │Success?│
      └───┬─┬──┘
          │ │
      YES │ │ NO
          │ │
          ▼ ▼
     ┌────────┐  ┌──────────────────┐
     │ Save   │  │ Record Bug       │
     │ Logs   │  │ bugDetector.     │
     │ Report │  │ recordBug(error) │
     └────────┘  └─────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Infinite Loop?  │
                  │ (>= 5x same bug)│
                  └────┬────────┬───┘
                       │        │
                   YES │        │ NO
                       │        │
                       ▼        ▼
              ┌──────────┐  ┌──────────┐
              │  STOP    │  │ [TODO]   │
              │ Save     │  │ Call     │
              │ infinite-│  │Coordi-   │
              │ loop.md  │  │nator     │
              └──────────┘  └────┬─────┘
                                 │
                                 ▼
                            ┌─────────┐
                            │ Pause   │
                            │ 2s      │
                            └────┬────┘
                                 │
                                 ▼
                            ┌─────────┐
                            │ Retry   │
                            │(attempt │
                            │ < 5)    │
                            └────┬────┘
                                 │
                                 └──► LOOP
```

---

### 4. Helpers Layer

#### `helpers/auth-helpers.ts`
**Responsabilité** : Helpers authentification réutilisables

```typescript
// Form Helpers
+ fillSignupForm(page, user)
+ submitSignupForm(page)
+ fillLoginForm(page, credentials)
+ submitLoginForm(page)

// Navigation Helpers
+ navigateToSignup(page)
+ navigateToLogin(page)
+ waitForRedirect(page, path)
+ waitForSignupSuccess(page, email)
+ waitForDashboard(page, role)

// Verification Helpers
+ expectAuthenticated(page)
+ expectNotAuthenticated(page)
+ waitForToast(page, message)
+ waitForError(page, message)
+ waitForFormReady(page)

// Lifecycle Helpers
+ logout(page)
+ cleanupTestUser(email)
```

**Exemple** :
```typescript
export const fillSignupForm = async (page, user) => {
  console.log('📝 Filling signup form...', { email: user.email })

  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.fill('input[name="firstName"]', user.firstName)
  await page.fill('input[name="lastName"]', user.lastName)

  if (user.phone) {
    await page.fill('input[name="phone"]', user.phone)
  }

  await page.check('input[name="acceptTerms"]')

  console.log('✅ Signup form filled')
}
```

#### `helpers/email-helpers.ts`
**Responsabilité** : Interception emails Resend

```typescript
export class EmailCapture {
  - emails: CapturedEmail[]

  // Setup
  + async setupInterception(page)
    → page.route('https://api.resend.com/**', ...)

  // Retrieval
  + getLastEmail()
  + getEmailByRecipient(email)
  + getEmailBySubject(subject)

  // Extraction
  + extractConfirmationLink(email)

  // Waiting
  + async waitForEmail(predicate)
  + async waitForSignupConfirmation(email)
  + async waitForWelcomeEmail(email)

  // Reporting
  + generateReport()
}
```

**Interception** :
```typescript
await page.route('https://api.resend.com/**', async (route, request) => {
  if (request.method() === 'POST' && request.url().includes('/emails')) {
    const postData = request.postDataJSON()

    const email: CapturedEmail = {
      to: postData.to,
      from: postData.from,
      subject: postData.subject,
      html: postData.html,
      text: postData.text,
      timestamp: new Date().toISOString(),
    }

    this.emails.push(email)
    await this.saveEmail(email)

    await route.fulfill({
      status: 200,
      body: JSON.stringify({ id: `mock-email-${Date.now()}` })
    })
  }
})
```

---

### 5. Global Setup/Teardown Layer

#### `helpers/global-setup.ts`
**Responsabilité** : Configuration globale avant tests

```typescript
export default async function globalSetup() {
  1. Prompt: Headed or Headless?
     → const browserMode = await promptBrowserMode()

  2. Save choice to env
     → process.env.BROWSER_MODE = browserMode

  3. Create log directories
     → fs.mkdir(TEST_CONFIG.logging.logDir)
     → fs.mkdir(TEST_CONFIG.screenshots.directory)
     → fs.mkdir(TEST_CONFIG.email.emailsDir)
}
```

#### `helpers/global-teardown.ts`
**Responsabilité** : Nettoyage après tests

```typescript
export default async function globalTeardown() {
  // Cleanup global resources
}
```

---

### 6. Test Layer

#### `auth/signup.spec.ts`
**Responsabilité** : Test signup complet

```typescript
test('Complete signup flow', async ({ page, logCollector, bugDetector }) => {
  const testEmail = generateTestEmail('gestionnaire', Date.now())
  const testUser = { email, password, firstName, lastName }

  const emailCapture = createEmailCapture('signup-test')
  await emailCapture.setupInterception(page)

  try {
    // STEP 1: Navigate to signup
    await navigateToSignup(page)

    // STEP 2: Fill form
    await fillSignupForm(page, testUser)

    // STEP 3: Submit
    await submitSignupForm(page)

    // STEP 4: Wait success page
    await waitForSignupSuccess(page, testEmail)

    // STEP 5: Wait confirmation email
    const confirmEmail = await emailCapture.waitForSignupConfirmation(testEmail)

    // STEP 6: Extract confirmation link
    const confirmLink = emailCapture.extractConfirmationLink(confirmEmail)

    // STEP 7: Click confirmation link
    await page.goto(confirmLink)

    // STEP 8: Wait dashboard
    await waitForDashboard(page, 'gestionnaire')

    // STEP 9: Verify authenticated
    await expectAuthenticated(page)

    // STEP 10: Wait welcome email (optional)
    await emailCapture.waitForWelcomeEmail(testEmail)

    console.log('✅ ✅ ✅ SIGNUP TEST PASSED ✅ ✅ ✅')
  } catch (error) {
    bugDetector.recordBug(error)
    await page.screenshot({ path: '...' })
    throw error
  } finally {
    await cleanupTestUser(testEmail)
  }
})
```

---

### 7. API Layer

#### `app/api/test/cleanup-user/route.ts`
**Responsabilité** : Nettoyage utilisateurs de test

```typescript
POST /api/test/cleanup-user
Body: { email: string }

Workflow:
1. Verify environment != production
2. Verify test email pattern
3. Find user in auth.users
4. Find profile in public.users
5. Delete team_members
6. Delete teams (if no members)
7. Delete profile
8. Delete auth user

Security:
- Only in test environment
- Only @seido-test.com or test- emails
- Detailed logging
```

---

## 🔄 Data Flow

### Test Execution Flow

```
USER
  │
  └──> npm run test:new:signup
         │
         └──> Global Setup
                │
                ├──> Prompt: Headed/Headless
                ├──> Create log dirs
                └──> Set env vars
                       │
                       └──> Playwright Test Runner
                              │
                              └──> test.extend<TestContext>
                                     │
                                     ├──> page (with LogCollector)
                                     ├──> logCollector
                                     ├──> bugDetector
                                     └──> runWithHealing
                                            │
                                            └──> Execute Test (signup.spec.ts)
                                                   │
                                                   ├──> Setup EmailCapture
                                                   │      │
                                                   │      └──> page.route('resend')
                                                   │
                                                   ├──> Use Auth Helpers
                                                   │      ├──> navigateToSignup()
                                                   │      ├──> fillSignupForm()
                                                   │      └──> submitSignupForm()
                                                   │
                                                   ├──> Wait & Verify
                                                   │      ├──> waitForSignupSuccess()
                                                   │      ├──> waitForEmail()
                                                   │      └──> expectAuthenticated()
                                                   │
                                                   └──> Cleanup
                                                          └──> cleanupTestUser()
```

### Log Collection Flow

```
Browser/Server Events
  │
  ├──> page.on('console')  ──┐
  ├──> page.on('pageerror')──┤
  ├──> page.on('request')  ──┤
  │                          │
  │                          ▼
  │                    LogCollector
  │                          │
  │                          ├──> Parse event
  │                          ├──> Detect source
  │                          │    (console, server,
  │                          │     supabase, pino)
  │                          │
  │                          └──> addLog({
  │                                 timestamp,
  │                                 level,
  │                                 source,
  │                                 message,
  │                                 metadata
  │                               })
  │
  └──> Test End
         │
         └──> LogCollector.saveLogs()
                │
                ├──> console.log
                ├──> server.log
                ├──> supabase.log
                ├──> pino.log
                ├──> network.log
                │
                └──> LogCollector.generateReport()
                       │
                       └──> report.md
```

### Email Capture Flow

```
Browser
  │
  └──> emailService.sendSignupConfirmationEmail(...)
         │
         └──> Resend API Request
                │
                └──> page.route('https://api.resend.com/**')
                       │
                       ├──> Intercept Request
                       │      │
                       │      └──> Extract email data
                       │             (to, from, subject, html)
                       │
                       ├──> Save to EmailCapture.emails[]
                       │
                       ├──> Save HTML file
                       │      └──> logs/[test]/emails/[timestamp]-[subject].html
                       │
                       └──> Mock Response
                              │
                              └──> { id: 'mock-email-12345' }
                                     │
                                     └──> Browser continues
                                            │
                                            └──> Test extracts link
                                                   └──> emailCapture.extractConfirmationLink()
```

---

## 🎯 Extension Points

### Ajouter un Agent Auto-Healing

1. Créer agent dans `agents/debugger/[name]-debugger.ts`
2. Implémenter interface :
   ```typescript
   export interface Debugger {
     analyze(logs: LogEntry[], error: Error): DebugAnalysis
     fix(analysis: DebugAnalysis): CodeFix
     validate(fix: CodeFix): Promise<boolean>
   }
   ```

3. Enregistrer dans Coordinator :
   ```typescript
   // agents/coordinator.ts
   export class Coordinator {
     private debuggers = {
       frontend: new FrontendDebugger(),
       backend: new BackendDebugger(),
       api: new APIDebugger(),
     }
   }
   ```

### Ajouter un Test

1. Créer fichier dans `auth/`, `interventions/`, etc.
2. Importer helpers :
   ```typescript
   import { test, expect } from '../helpers/test-runner'
   import { navigateToLogin, fillLoginForm } from '../helpers/auth-helpers'
   ```

3. Écrire test :
   ```typescript
   test('My test', async ({ page, logCollector }) => {
     // Use helpers
     await navigateToLogin(page)
     await fillLoginForm(page, credentials)
     // ...
   })
   ```

### Ajouter un Helper

1. Ajouter fonction dans `helpers/auth-helpers.ts` ou créer nouveau fichier
2. Exporter fonction :
   ```typescript
   export const myHelper = async (page: Page, ...args) => {
     console.log('📝 Doing something...')
     // Implementation
     console.log('✅ Done')
   }
   ```

3. Utiliser dans tests :
   ```typescript
   import { myHelper } from '../helpers/auth-helpers'
   await myHelper(page, ...)
   ```

---

## 📊 Metrics & Observability

### Logs Générés

| Source | Fichier | Contenu |
|--------|---------|---------|
| Console Browser | `console.log` | Logs console.log/error/warn |
| Server Next.js | `server.log` | Logs serveur (stdout/stderr) |
| Supabase | `supabase.log` | Logs Supabase (queries, errors) |
| Pino | `pino.log` | Logs structurés (JSON) |
| Network | `network.log` | Requêtes HTTP (request/response) |

### Rapports Générés

| Fichier | Contenu |
|---------|---------|
| `report.md` | Résumé test (status, duration, errors, stats) |
| `infinite-loop.md` | Recommandations si boucle détectée |
| `screenshots/` | Screenshots en cas d'échec |
| `emails/` | Emails capturés (HTML) |

### Métadonnées Collectées

```typescript
{
  test: {
    name: string,
    duration: number,
    passed: boolean,
    healingAttempts: number,
  },
  logs: {
    total: number,
    errors: number,
    warnings: number,
  },
  network: {
    totalRequests: number,
    errors: number,  // 4xx/5xx
    avgDuration: number,
  },
  bugs: {
    totalUnique: number,
    totalOccurrences: number,
    mostFrequent: BugReport,
  }
}
```

---

## 🔒 Security Considerations

### Environnement de Test

- ✅ API cleanup désactivée en production (`NODE_ENV !== 'production'`)
- ✅ Vérification emails de test (`@seido-test.com` ou `test-`)
- ✅ Logs non committés (`.gitignore`)

### Données Sensibles

- ⚠️ Passwords de test en clair dans config (acceptable pour tests)
- ✅ Cleanup automatique après tests
- ✅ Pas de logs en production

### Isolation

- ✅ Emails uniques par test (timestamp)
- ✅ Cleanup automatique (API `/api/test/cleanup-user`)
- ✅ Pas de partage de données entre tests

---

**Version** : 1.0.0
**Dernière Mise à Jour** : 2025-10-04
