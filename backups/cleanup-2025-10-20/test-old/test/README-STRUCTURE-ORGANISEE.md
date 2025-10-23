# Structure de Test SEIDO - Organisation par Rôle

## ✅ Configuration Complète Mise en Place

### Vue d'ensemble

La structure de test SEIDO est maintenant **entièrement organisée par rôle**, avec détection automatique et rangement intelligent des captures d'écran, vidéos et traces.

## 📁 Structure Organisée

```
test/
├── 📂 screenshots/           # Captures organisées par rôle
│   ├── 👨‍💼 admin/          # Tests admin
│   ├── 🏢 gestionnaire/     # Tests gestionnaire
│   ├── 🔧 prestataire/      # Tests prestataire
│   ├── 🏠 locataire/        # Tests locataire
│   ├── 🔐 auth/             # Tests authentification
│   └── 📋 general/          # Tests généraux
│
├── 📂 videos/               # Vidéos organisées (même structure)
│   └── [même organisation par rôle]
│
├── 📂 traces/               # Traces Playwright (même structure)
│   └── [même organisation par rôle]
│
├── 📂 e2e/                  # Tests E2E organisés
│   ├── admin/               # Tests spécifiques admin
│   ├── gestionnaire/        # Tests spécifiques gestionnaire
│   ├── prestataire/         # Tests spécifiques prestataire
│   ├── locataire/           # Tests spécifiques locataire
│   └── auth/                # Tests authentification
│
├── 📂 helpers/              # Helpers avancés
│   ├── screenshot-helper.ts         # Helper captures avec détection rôle
│   └── media-organization-helper.ts # Organisation automatique
│
├── 📂 utils/                # Utilitaires centralisés
│   └── test-helpers.ts      # Helpers principaux avec exports
│
└── 📂 reports/              # Tous les rapports générés
    └── summary-*.md         # Rapports avec stats par rôle
```

## 🎯 Fonctionnalités Clés

### 1. Détection Automatique du Rôle

Le système détecte automatiquement le rôle basé sur:
- **Nom du projet Playwright** (priorité haute)
- **Chemin du fichier** (ex: `/test/e2e/gestionnaire/`)
- **Titre du test** (mots-clés détectés)
- **Fallback**: `general` si aucune détection

### 2. Organisation Automatique

```typescript
// Exemple: Test gestionnaire
test('Dashboard gestionnaire', async ({ page }, testInfo) => {
  const screenshot = createScreenshotHelper(page, testInfo)

  // Capture automatiquement dans test/screenshots/gestionnaire/
  await screenshot.capture({ name: 'dashboard' })
})
```

### 3. Helpers Avancés

```typescript
import { test, loginAsRole } from '../utils/test-helpers'

// Login simplifié par rôle
await loginAsRole(page, 'gestionnaire')

// Screenshot organisée automatiquement
await organizedScreenshot('nom-capture')

// Capture d'état complet
await capturePageState(page, testInfo, 'etat-complet')
```

## 🚀 Utilisation

### Commandes NPM par Rôle

```bash
# Tests par rôle (avec organisation automatique)
npm run test:e2e:admin
npm run test:e2e:gestionnaire
npm run test:e2e:prestataire
npm run test:e2e:locataire

# Tests d'authentification
npm run test:e2e:auth

# Tests complets
npm run test:e2e

# Validation de la structure
node test/scripts/validate-test-structure.js
```

### Exemple de Test avec Organisation

```typescript
// test/e2e/gestionnaire/interventions.spec.ts
import { test, expect } from '../../utils/test-helpers'
import { createScreenshotHelper } from '../../helpers/screenshot-helper'

test.describe('Gestion Interventions', () => {
  test('workflow complet', async ({ page }, testInfo) => {
    // Helper détecte automatiquement: rôle = gestionnaire
    const screenshot = createScreenshotHelper(page, testInfo)

    // Toutes les captures iront dans:
    // test/screenshots/gestionnaire/2025-09-27/workflow-complet/

    await screenshot.capture({ name: 'liste-initiale' })

    // Séquence de captures
    await screenshot.captureSequence([
      { name: 'creation', action: async () => {...} },
      { name: 'validation', action: async () => {...} }
    ])

    // Rapport généré automatiquement
    await screenshot.generateReport()
  })
})
```

## 📊 Rapports Enrichis

### Rapport de Synthèse avec Stats par Rôle

Le `global-teardown.ts` génère maintenant des rapports avec:

```markdown
## Artifacts by Role

### 🏢 Gestionnaire
- Screenshots: 45
- Videos: 12
- Traces: 8

### 🔧 Prestataire
- Screenshots: 32
- Videos: 8
- Traces: 5
```

## ✅ Avantages de cette Organisation

1. **Clarté**: Facile de trouver les captures par rôle
2. **Automatisation**: Pas besoin de spécifier les chemins
3. **Scalabilité**: Ajout facile de nouveaux rôles
4. **Maintenance**: Structure claire et prévisible
5. **CI/CD**: Artifacts organisés pour analyse

## 🔧 Configuration Technique

### playwright.config.ts

```typescript
// Projets configurés avec vidéos organisées
{
  name: 'gestionnaire',
  testDir: './test/e2e/gestionnaire',
  use: {
    contextOptions: {
      recordVideo: {
        dir: './test/videos/gestionnaire',
      }
    }
  }
}
```

### Helpers Disponibles

- `detectRole()`: Détecte le rôle automatiquement
- `getScreenshotPath()`: Génère le chemin organisé
- `takeOrganizedScreenshot()`: Capture avec organisation
- `configureVideoRecording()`: Configure vidéos par rôle
- `capturePageState()`: Capture état complet

## 📈 Statistiques Actuelles

```
📸 Screenshots: Organisés par rôle
🎥 Videos: Enregistrements par rôle
🔍 Traces: Debug organisé
🧪 Tests E2E: 19 fichiers organisés
```

## 💡 Bonnes Pratiques

1. **Nommage des Tests**: Inclure le rôle dans le titre aide la détection
2. **Organisation Fichiers**: Respecter la structure `/e2e/{role}/`
3. **Captures Descriptives**: Utiliser des noms explicites
4. **Génération Rapports**: Toujours appeler `generateReport()` en fin de test

## 🚦 Validation

Pour vérifier que tout est configuré correctement:

```bash
node test/scripts/validate-test-structure.js
```

Ce script vérifie:
- Présence de tous les dossiers
- Organisation correcte
- Fichiers de configuration
- Statistiques d'utilisation

---

**Configuration mise en place et validée** - Janvier 2025

Tous les tests SEIDO bénéficient maintenant d'une organisation automatique par rôle, facilitant le debug, l'analyse et la maintenance.