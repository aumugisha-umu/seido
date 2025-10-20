# 🤖 Système Auto-Healing SEIDO

## 📋 Vue d'Ensemble

Le système Auto-Healing est une infrastructure intelligente qui détecte automatiquement les erreurs dans les tests E2E, analyse leur cause, applique des corrections au code, et relance les tests jusqu'à résolution.

### 🌟 Caractéristiques

- ✅ **Détection automatique** d'erreurs critiques (timeout, redirect, selector, etc.)
- 🔍 **Analyse contextuelle** complète (DOM, network, logs, screenshots)
- 🤖 **Correction automatique** du code source avec backup
- 🔄 **Retry intelligent** jusqu'à 5 tentatives
- 📊 **Rapports détaillés** de chaque cycle de correction
- 💾 **Rollback automatique** en cas d'échec

---

## 🏗️ Architecture

```
Auto-Healing System
├── config.ts                      # Configuration et types
├── error-context-collector.ts     # Collecte contexte d'erreur
├── auto-fix-agent.ts              # Agent de correction automatique
├── orchestrator.ts                # Orchestrateur principal
├── test-runner.ts                 # Wrapper Playwright
└── demo-login-test.spec.ts        # Test de démonstration
```

### 🔄 Flux d'Exécution

```
Test E2E Playwright
    ↓
Erreur Détectée (ex: timeout redirect)
    ↓
ErrorContextCollector
    ├── Screenshot complet
    ├── DOM Snapshot
    ├── Network logs
    ├── Console logs
    └── Source files concernés
    ↓
AutoFixAgent.analyzeAndFix()
    ├── Analyse type d'erreur
    ├── Détecte pattern problématique
    ├── Génère correction
    ├── Crée backup
    └── Applique modification
    ↓
Orchestrator relance test
    ↓
Succès ? → ✅ Fin
Échec ? → 🔄 Retry (max 5x)
    ↓
Rapport Final Généré
```

---

## 🚀 Utilisation

### Test de Démonstration

```bash
# Windows
docs\refacto\Tests\run-auto-healing-demo.bat

# Linux/Mac
npx playwright test docs/refacto/Tests/auto-healing/demo-login-test.spec.ts --reporter=list --headed
```

### Intégration dans Vos Tests

#### Méthode 1 : Wrapper Manuel

```typescript
import { AutoHealingOrchestrator } from './auto-healing/orchestrator'

test('My test with auto-healing', async ({ page }) => {
  const orchestrator = new AutoHealingOrchestrator({
    maxRetries: 3,
    retryDelay: 2000
  })

  let attempt = 0
  const maxAttempts = 3

  while (attempt < maxAttempts) {
    try {
      // Your test logic
      await page.goto('/login')
      await page.fill('input[type="email"]', 'test@example.com')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard**', { timeout: 10000 })

      return // Success!

    } catch (error) {
      if (attempt < maxAttempts - 1) {
        // Trigger auto-healing
        await orchestrator.heal(
          `test-${Date.now()}`,
          'my-test',
          'user',
          error as Error,
          'current-step',
          page,
          '/dashboard'
        )
        await new Promise(r => setTimeout(r, 2000))
        attempt++
      } else {
        throw error
      }
    }
  }
})
```

#### Méthode 2 : Décorateur (à venir)

```typescript
import { withAutoHealing } from './auto-healing/test-runner'

test('My test', withAutoHealing(async (page) => {
  // Your test logic - auto-healing automatique sur erreur
  await page.goto('/login')
  // ...
}))
```

---

## 📊 Types d'Erreurs Supportées

### ✅ Redirect Issues (Implémenté)

**Symptômes** :
- Timeout sur `page.waitForURL()`
- URL attendue différente de l'URL actuelle
- Server Action ne redirige pas

**Corrections** :
- Restructure Server Actions pour `redirect()` synchrone
- Vérifie logique de routing
- Corrige patterns async/await

### 🚧 Authentication Issues (À implémenter)

**Symptômes** :
- Session non créée
- Utilisateur non trouvé
- Rôle incorrect

**Corrections prévues** :
- Vérifier création session Supabase
- Corriger logique d'assignation de rôle
- Synchroniser auth middleware

### 🚧 Selector Issues (À implémenter)

**Symptômes** :
- Element not found
- Selector timeout
- DOM structure changed

**Corrections prévues** :
- Ajouter `data-testid`
- Utiliser sélecteurs plus robustes
- Ajouter waits explicites

---

## 🛠️ Configuration

### Configuration par Défaut

```typescript
{
  maxRetries: 5,
  retryDelay: 2000,
  debuggerTimeout: 60000,
  fixApplicationTimeout: 30000,
  enableBackup: true,
  enableDryRun: false,
  autoRollback: true,
  verboseLogging: true,
  saveArtifacts: true,
  errorPatterns: {
    timeout: true,
    redirect: true,
    selector: true,
    network: true,
    authentication: true
  }
}
```

### Personnalisation

```typescript
const orchestrator = new AutoHealingOrchestrator({
  maxRetries: 3,           // Moins de tentatives
  retryDelay: 5000,        // Plus de temps entre retries
  enableDryRun: true,      // Mode simulation (pas de modif)
  verboseLogging: false    // Logs concis
})
```

---

## 📁 Artifacts Générés

Après chaque exécution, les artifacts sont sauvegardés dans :

```
docs/refacto/Tests/auto-healing-artifacts/
├── <testId>/
│   ├── error-context.json        # Contexte complet de l'erreur
│   ├── error-screenshot.png      # Screenshot au moment de l'erreur
│   ├── dom-snapshot.html         # Snapshot du DOM
│   ├── console.log               # Logs console navigateur
│   └── network.log               # Logs réseau
├── backups/
│   └── <testId>-<timestamp>/
│       └── <file>.backup         # Backups avant modification
└── reports/
    └── auto-healing-<test>-<timestamp>.json  # Rapport complet
```

---

## 📈 Rapports

### Structure du Rapport Final

```json
{
  "testName": "login-admin-auto-heal",
  "initialError": {
    "type": "redirect",
    "message": "Timeout waiting for URL",
    "step": "waitForURL"
  },
  "cycles": [
    {
      "cycleNumber": 1,
      "fixApplied": {
        "description": "Fixed Server Action redirect",
        "filesModified": ["app/actions/auth-actions.ts"],
        "confidence": "high"
      },
      "testResult": {
        "passed": true,
        "duration": 5234
      }
    }
  ],
  "finalResult": {
    "resolved": true,
    "totalAttempts": 1,
    "totalDuration": 8500,
    "successfulCycle": 1
  },
  "recommendations": [
    "✅ Le problème a été résolu automatiquement",
    "Vérifier que la correction appliquée est appropriée",
    "Commiter les changements si tout fonctionne correctement"
  ]
}
```

---

## 🔍 Exemple : Bug de Redirection Login

### Problème Détecté

```typescript
// ❌ Code problématique dans auth-actions.ts:176
export async function loginAction(prevState, formData) {
  // ... authentification async ...

  let dashboardPath = '/admin/dashboard'
  try {
    // Opérations async
    const userResult = await userService.getByAuthUserId(user.id)
    dashboardPath = getDashboardPath(userResult.data.role)
  } catch (error) {
    // ...
  }

  redirect(dashboardPath) // ❌ redirect() après async dans Server Action
}
```

### Correction Automatique

```typescript
// ✅ Code corrigé par auto-healing
export async function loginAction(prevState, formData) {
  // ... authentification async ...

  let dashboardPath = '/admin/dashboard'
  let roleDetected = false

  try {
    const userResult = await userService.getByAuthUserId(user.id)
    if (userResult.success && userResult.data?.role) {
      dashboardPath = getDashboardPath(userResult.data.role)
      roleDetected = true
    }
  } catch (error) {
    console.log('Using fallback dashboard')
  }

  // ✅ redirect() hors du try/catch, appelé de manière synchrone
  redirect(dashboardPath)
}
```

---

## 🤝 Contribuer

### Ajouter un Nouveau Type d'Erreur

1. **Étendre les types** dans `config.ts`
2. **Ajouter le détecteur** dans `ErrorContextCollector.detectErrorType()`
3. **Implémenter la correction** dans `AutoFixAgent.fix{Type}Issue()`
4. **Tester** avec un cas d'exemple

### Améliorer les Corrections

Les corrections sont dans `auto-fix-agent.ts` :
- `fixRedirectIssue()` - Problèmes de redirection
- `fixAuthenticationIssue()` - Problèmes d'auth
- `fixSelectorIssue()` - Problèmes de sélecteurs
- `fixTimeoutIssue()` - Problèmes de timeout

---

## 📚 Ressources

- **Code Source** : `docs/refacto/Tests/auto-healing/`
- **Tests Démo** : `demo-login-test.spec.ts`
- **Configuration** : `config.ts`
- **Rapports** : `auto-healing-artifacts/reports/`

---

## ⚠️ Limitations

- **Max 5 tentatives** par test (configurable)
- **Corrections basiques** (patterns simples uniquement)
- **Pas de machine learning** (logique déterministe)
- **Backup manuel** requis avant utilisation en production
- **Corrections Server Actions uniquement** pour l'instant

---

## 🎯 Prochaines Étapes

- [ ] Implémenter corrections authentication
- [ ] Implémenter corrections selector
- [ ] Ajouter support TypeScript AST pour modifications plus précises
- [ ] Intégrer avec CI/CD
- [ ] Ajouter dashboard web pour visualiser rapports
- [ ] Support corrections côté client (React components)

---

**🤖 Système Auto-Healing v1.0**
*Développé pour SEIDO - Tests E2E Intelligents*