# 🧪 Tests E2E Auto-Healing - SEIDO

Tests E2E avec système d'auto-healing intelligent pour l'application SEIDO.

> 📊 **[Voir le Rapport Complet des Tests d'Authentification →](./AUTH-TEST-REPORT.md)**
>
> Status: ✅ **78% Production Ready** (10/13 tests passing)

## 📋 Table des Matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [Configuration](#-configuration)
- [Logs et Rapports](#-logs-et-rapports)
- [Auto-Healing](#-auto-healing)
- [Dépannage](#-dépannage)

## ✨ Fonctionnalités

- ✅ **Mode Interactif** : Choix headed/headless au démarrage
- ✅ **Logs Complets** : Console, Server, Supabase, Pino, Network
- ✅ **Auto-Healing** : Correction automatique des bugs (max 5 tentatives)
- ✅ **Détection Boucles** : Arrêt automatique si même bug répété 5x
- ✅ **Email Mocking** : Interception des emails Resend
- ✅ **Rapports Détaillés** : Markdown avec screenshots et métadonnées
- ✅ **Agents Spécialisés** : Frontend, Backend, API debuggers (à venir)

## 🏗️ Architecture

```
tests-new/
├── config/                      # Configuration
│   ├── playwright.config.ts    # Config Playwright
│   └── test-config.ts          # Config tests (timeouts, users, etc.)
├── agents/                      # Agents auto-healing
│   ├── coordinator.ts          # Coordinateur (à venir)
│   ├── debugger/               # Debuggers spécialisés (à venir)
│   └── utils/
│       ├── log-collector.ts    # Collecte logs multi-sources
│       └── bug-detector.ts     # Détection boucles infinies
├── helpers/                     # Helpers réutilisables
│   ├── test-runner.ts          # Runner avec auto-healing
│   ├── auth-helpers.ts         # Helpers authentification
│   ├── email-helpers.ts        # Helpers emails (Resend mock)
│   ├── global-setup.ts         # Setup global
│   └── global-teardown.ts      # Teardown global
├── fixtures/                    # Données de test
│   └── test-data.ts
├── auth/                        # Tests authentification
│   ├── signup.spec.ts          # ✅ Test signup complet (PASSED)
│   ├── login.spec.ts           # ✅ Test login (3/4 PASSED)
│   ├── logout.spec.ts          # ✅ Test logout (PASSED)
│   └── password-reset.spec.ts  # ⏳ Test reset password (à tester)
├── logs/                        # Logs générés (gitignored)
│   └── [test-name]/
│       ├── console.log
│       ├── server.log
│       ├── supabase.log
│       ├── pino.log
│       ├── network.log
│       ├── report.md
│       ├── screenshots/
│       └── emails/
├── run-tests.ps1               # Script PowerShell
├── run-tests.bat               # Script Batch
└── README.md                   # Ce fichier
```

## 📦 Installation

Les dépendances sont déjà installées avec le projet principal.

Vérifier l'installation de Playwright :

```bash
npx playwright install
```

## 🚀 Utilisation

### Lancer tous les tests

```bash
# Windows PowerShell
.\tests-new\run-tests.ps1

# Windows CMD
.\tests-new\run-tests.bat

# Directement avec npx
npx playwright test --config=tests-new/config/playwright.config.ts
```

### Lancer un test spécifique

```bash
# Signup test
.\tests-new\run-tests.ps1 tests-new/auth/signup.spec.ts

# Login test
.\tests-new\run-tests.ps1 tests-new/auth/login.spec.ts
```

### Options

```bash
# Mode headed (navigateur visible)
.\tests-new\run-tests.ps1 --headed

# Mode headless (navigateur caché)
.\tests-new\run-tests.ps1 --headless

# Mode debug
.\tests-new\run-tests.ps1 --debug

# Combinaison
.\tests-new\run-tests.ps1 tests-new/auth/signup.spec.ts --headed
```

### Variables d'environnement

```bash
# Désactiver l'auto-healing
$env:DISABLE_AUTO_HEALING = "true"
.\tests-new\run-tests.ps1

# Forcer mode headless
$env:HEADLESS = "true"
.\tests-new\run-tests.ps1

# Forcer mode headed
$env:HEADED = "true"
.\tests-new\run-tests.ps1
```

## ⚙️ Configuration

### Fichier `config/test-config.ts`

```typescript
export const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',

  timeout: {
    test: 30000,        // 30s par test
    action: 5000,       // 5s par action
    navigation: 10000,  // 10s navigation
  },

  autoHealing: {
    maxIterations: 5,         // Max 5 tentatives
    enabled: true,            // Activer auto-healing
    pauseBetweenRuns: 2000,   // 2s entre tentatives
  },

  // ...
}
```

### Personnaliser les utilisateurs de test

Modifier `testUsers` dans `config/test-config.ts` :

```typescript
testUsers: {
  gestionnaire: {
    email: 'test-gestionnaire@seido-test.com',
    password: 'TestPassword123!',
    // ...
  },
}
```

## 📊 Logs et Rapports

### Structure des logs

Après chaque test, les logs sont sauvegardés dans :

```
tests-new/logs/[test-name]/
├── console.log        # Logs console browser
├── server.log         # Logs serveur Next.js
├── supabase.log       # Logs Supabase
├── pino.log           # Logs Pino (structurés)
├── network.log        # Requêtes réseau HTTP
├── report.md          # Rapport Markdown
├── screenshots/       # Screenshots (échecs)
└── emails/            # Emails capturés (HTML)
```

### Rapport Markdown

Chaque test génère un rapport `report.md` avec :

- ✅ Statut (PASSED/FAILED)
- ⏱️ Duration
- 🔄 Nombre de tentatives auto-healing
- ❌ Erreurs détaillées avec stack traces
- 🌐 Erreurs réseau (status 4xx/5xx)
- 📄 Liens vers logs détaillés

Exemple :

```markdown
# Test Report: Complete signup flow with email confirmation

## Summary

- **Status**: ✅ PASSED
- **Duration**: 12543ms
- **Healing Attempts**: 0

## Statistics

- **Total Logs**: 247
- **Errors**: 0
- **Network Requests**: 18
- **Network Errors**: 0
```

### Rapport de boucle infinie

Si le même bug est détecté 5 fois, un rapport `infinite-loop.md` est généré avec :

- 🆔 Bug ID
- 📊 Occurrences
- 📝 Message d'erreur
- 🔍 Stack trace
- 💡 Recommandations pour débloquer

## 🔄 Auto-Healing

### Workflow

1. **Exécution Test** → Échec détecté
2. **Bug Detector** → Enregistre l'erreur
3. **Vérification Boucle** → Même bug 5x ?
   - ✅ **Non** → Coordinator Agent analyse
   - ❌ **Oui** → Arrêt + Rapport
4. **Agent Coordinator** → Dispatche vers agent spécialisé
   - 🎨 **Frontend Debugger** → Erreurs UI/Components
   - ⚙️ **Backend Debugger** → Erreurs Services/DAL
   - 🌐 **API Debugger** → Erreurs Routes API
5. **Correction** → Agent corrige le code
6. **Relance Test** → Nouvelle tentative
7. **Répéter** jusqu'à succès ou max 5 tentatives

### Agents (À venir)

#### Coordinator Agent

- Analyse les logs et erreurs
- Identifie la catégorie du bug
- Dispatche vers l'agent approprié

#### Frontend Debugger

- Erreurs de sélecteurs CSS/XPath
- Timeouts d'éléments UI
- Erreurs de composants React
- Problèmes de navigation

#### Backend Debugger

- Erreurs de services
- Erreurs de repositories
- Problèmes de transactions DB
- Erreurs de validation

#### API Debugger

- Erreurs routes API (4xx/5xx)
- Problèmes d'authentification
- Erreurs de middleware
- Problèmes de CORS/Headers

### Désactiver l'auto-healing

```bash
# Temporairement
$env:DISABLE_AUTO_HEALING = "true"
.\tests-new\run-tests.ps1

# Dans le code
import { TEST_CONFIG } from './config/test-config'
TEST_CONFIG.autoHealing.enabled = false
```

## 🔧 Dépannage

### Le serveur de dev ne démarre pas

```bash
# Vérifier que le port 3000 est libre
netstat -ano | findstr :3000

# Tuer le processus si nécessaire
taskkill /PID [PID] /F

# Redémarrer le serveur
npm run dev
```

### Playwright ne trouve pas les navigateurs

```bash
# Installer les navigateurs
npx playwright install

# Installer les dépendances système
npx playwright install-deps
```

### Erreur "Email not received"

1. Vérifier que Resend API key est configuré dans `.env.local`
2. Vérifier que l'interception email est activée
3. Vérifier les logs dans `tests-new/logs/[test]/network.log`

### Tests timeout systématiquement

1. Augmenter les timeouts dans `config/test-config.ts`
2. Vérifier que le serveur est démarré
3. Lancer en mode headed pour observer
4. Consulter les logs réseau

### Boucle infinie détectée

1. Consulter le rapport `infinite-loop.md`
2. Lire les recommandations
3. Corriger le problème identifié
4. Relancer le test

## 📝 Bonnes Pratiques

### Écrire un nouveau test

```typescript
import { test, expect } from '../helpers/test-runner'
import { createEmailCapture } from '../helpers/email-helpers'

test('Mon test', async ({ page, logCollector, bugDetector }) => {
  // Setup email capture si nécessaire
  const emailCapture = createEmailCapture('mon-test')
  await emailCapture.setupInterception(page)

  try {
    // Étapes du test
    console.log('📍 STEP 1: Description')
    // ...

    console.log('📍 STEP 2: Description')
    // ...

    // Assertions
    expect(result).toBeTruthy()

    console.log('✅ Test passed')
  } catch (error) {
    // Enregistrer l'erreur
    if (error instanceof Error) {
      bugDetector.recordBug(error, { step: 'mon-test' })
    }
    throw error
  }
})
```

### Utiliser les helpers

```typescript
import {
  navigateToSignup,
  fillSignupForm,
  submitSignupForm,
  waitForSignupSuccess,
} from '../helpers/auth-helpers'

// Au lieu de :
await page.goto('/auth/signup')
await page.fill('input[name="email"]', 'test@test.com')
// ...

// Utiliser :
await navigateToSignup(page)
await fillSignupForm(page, testUser)
await submitSignupForm(page)
```

## 🎯 Prochaines Étapes

- [ ] Implémenter les agents auto-healing (Coordinator, Frontend, Backend, API)
- [ ] Tests login complet
- [ ] Tests logout
- [ ] Tests reset password
- [ ] Tests interventions (création, validation, quotes)
- [ ] Tests multi-rôles
- [ ] CI/CD integration

## 📞 Support

En cas de problème, consulter :

1. Les logs dans `tests-new/logs/`
2. Le rapport Markdown `report.md`
3. Les screenshots dans `screenshots/`
4. La documentation Playwright : https://playwright.dev/

---

**Auteur** : Claude Code
**Version** : 1.0.0
**Date** : 2025-10-04
