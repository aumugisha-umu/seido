# Configuration Complète des Captures d'Écran et Rapports SEIDO

## ✅ Configuration Mise en Place avec Organisation par Rôle

### 1. Structure des Dossiers de Test (Organisation par Rôle)

```
test/
├── reports/              # Tous les rapports générés
│   ├── html/            # Rapport HTML interactif Playwright
│   ├── test-results.json # Données JSON des résultats
│   ├── junit.xml        # Rapport JUnit pour CI/CD
│   └── summary-*.md     # Résumés markdown avec timestamp
├── screenshots/          # Captures organisées par rôle
│   ├── admin/           # Screenshots tests admin
│   ├── gestionnaire/    # Screenshots tests gestionnaire
│   ├── prestataire/     # Screenshots tests prestataire
│   ├── locataire/       # Screenshots tests locataire
│   ├── auth/            # Screenshots tests authentification
│   └── general/         # Screenshots tests généraux
├── videos/              # Vidéos organisées par rôle
│   ├── admin/           # Vidéos tests admin
│   ├── gestionnaire/    # Vidéos tests gestionnaire
│   ├── prestataire/     # Vidéos tests prestataire
│   ├── locataire/       # Vidéos tests locataire
│   ├── auth/            # Vidéos tests authentification
│   └── general/         # Vidéos tests généraux
├── traces/              # Traces organisées par rôle
│   └── [même structure que screenshots/videos]
├── test-results/        # Résultats bruts Playwright
├── auth-states/         # États d'authentification sauvegardés
├── helpers/             # Helpers avancés
│   ├── screenshot-helper.ts         # Helper captures avec rôle
│   └── media-organization-helper.ts # Organisation automatique
├── utils/               # Utilitaires centralisés
│   └── test-helpers.ts  # Helpers principaux
├── e2e/                 # Tests End-to-End organisés
│   ├── auth/            # Tests authentification
│   ├── admin/           # Tests admin
│   ├── gestionnaire/    # Tests gestionnaire
│   ├── prestataire/     # Tests prestataire
│   ├── locataire/       # Tests locataire
│   └── [tests généraux]
└── global-teardown.ts   # Post-traitement avec organisation
```

### 2. Configuration Playwright Optimisée

**Fichier:** `playwright.config.ts`

#### Principales Améliorations:
- ✅ **Captures systématiques**: Screenshots activés pour TOUS les tests
- ✅ **Vidéos automatiques**: Enregistrement vidéo pour debug
- ✅ **Traces complètes**: Traces Playwright pour analyse détaillée
- ✅ **Rapports multiples**: HTML, JSON, JUnit, Console
- ✅ **Organisation dans test/**: Tous les artifacts dans le dossier test/
- ✅ **Configuration par rôle**: Projects séparés pour chaque rôle SEIDO

### 3. Helpers de Capture avec Organisation par Rôle

**Fichiers principaux:**
- `test/helpers/screenshot-helper.ts` - Helper de capture principal
- `test/helpers/media-organization-helper.ts` - Organisation automatique par rôle
- `test/utils/test-helpers.ts` - Helpers centralisés

#### Fonctionnalités Avancées:
- **Détection automatique du rôle** basée sur:
  - Nom du projet Playwright
  - Chemin du fichier de test
  - Titre du test
- **Organisation automatique** dans sous-dossiers par rôle
- **Nommage intelligent** avec rôle, test et timestamp
- Capture avec nom descriptif et timestamp
- Capture d'éléments spécifiques
- Capture avant/après actions
- Capture de séquences d'étapes
- Capture d'erreurs automatique
- Génération de rapport visuel par rôle
- Attachement automatique aux rapports Playwright

### 4. Script de Test avec Rapport Complet

**Fichier:** `test/run-tests-with-report.js`

#### Fonctionnalités:
- Nettoyage automatique des anciens résultats
- Exécution des tests avec collecte de métriques
- Organisation automatique des screenshots et vidéos
- Génération de rapport markdown de synthèse
- Création d'index HTML pour navigation facile
- Ouverture automatique du rapport HTML

### 5. Global Teardown

**Fichier:** `test/global-teardown.ts`

#### Actions Post-Test:
- Organisation des captures dans les bons dossiers
- Génération de rapport de synthèse
- Création d'index HTML de navigation
- Archivage des résultats avec timestamp
- Nettoyage des fichiers temporaires

## 📚 Utilisation

### Commandes NPM Disponibles

```bash
# Tests E2E avec rapport complet
npm run test:e2e:full-report

# Tests avec captures d'écran (exemple)
npm run test:e2e:screenshots

# Tests par rôle
npm run test:e2e:gestionnaire
npm run test:e2e:prestataire
npm run test:e2e:locataire
npm run test:e2e:admin

# Tests par navigateur
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
npm run test:e2e:mobile

# Visualiser le rapport HTML
npm run test:show-report
```

### Exemple d'Utilisation dans un Test avec Organisation par Rôle

```typescript
// Test avec organisation automatique par rôle
import { test, expect, loginAsRole } from '../utils/test-helpers'
import { createScreenshotHelper } from '../helpers/screenshot-helper'

test('Test gestionnaire avec captures organisées', async ({ page, screenshotHelper, organizedScreenshot }) => {
  // Login automatique avec capture organisée
  await loginAsRole(page, 'gestionnaire')

  // Capture organisée automatiquement dans test/screenshots/gestionnaire/
  await organizedScreenshot('dashboard-initial')

  // Utilisation du helper avancé
  await screenshotHelper.capture({ name: 'interventions-list' })

  // Capture d'élément spécifique
  await screenshotHelper.captureElement('[data-testid="stats-card"]', 'stats')

  // Capture de séquence avec organisation
  await screenshotHelper.captureSequence([
    {
      name: 'create-intervention',
      action: async () => await page.click('[data-testid="new-intervention"]'),
      waitAfter: 1000
    },
    {
      name: 'fill-form',
      action: async () => {
        await page.fill('#title', 'Test intervention')
        await page.fill('#description', 'Description test')
      }
    }
  ])
})

// Test multi-rôles avec captures organisées
test.describe('Workflow multi-rôles', () => {
  const roles = ['gestionnaire', 'prestataire', 'locataire'] as const

  for (const role of roles) {
    test(`Dashboard ${role}`, async ({ page }, testInfo) => {
      const screenshot = createScreenshotHelper(page, testInfo)

      // Login avec le rôle
      await loginAsRole(page, role)

      // Les captures seront automatiquement dans test/screenshots/{role}/
      await screenshot.capture({ name: `dashboard-${role}` })

      // Vérifie que le dashboard est chargé
      await expect(page).toHaveURL(new RegExp(`/dashboard/${role}`))

      // Capture finale
      await screenshot.capture({ name: `dashboard-loaded-${role}` })
    })
  }
})
```

## 📊 Rapports Générés

### 1. Rapport HTML Interactif
- **Emplacement**: `test/reports/html/index.html`
- **Contenu**: Vue interactive des tests avec screenshots, vidéos et traces
- **Ouverture**: `npx playwright show-report test/reports/html`

### 2. Rapport JSON
- **Emplacement**: `test/reports/test-results.json`
- **Contenu**: Données structurées pour analyse programmatique
- **Usage**: Intégration CI/CD, dashboards personnalisés

### 3. Rapport JUnit
- **Emplacement**: `test/reports/junit.xml`
- **Contenu**: Format standard pour outils CI/CD
- **Usage**: Jenkins, GitLab CI, GitHub Actions

### 4. Rapport Markdown
- **Emplacement**: `test/reports/test-summary.md`
- **Contenu**: Résumé lisible avec statistiques et liens
- **Usage**: Documentation, revues de code

### 5. Index HTML
- **Emplacement**: `test/index.html`
- **Contenu**: Page de navigation pour tous les rapports
- **Usage**: Point d'entrée unique pour consulter les résultats

## 🎯 Captures d'Écran avec Organisation par Rôle

### Organisation Automatique
- **Structure**: `test/screenshots/{role}/{date}/{test-name}/`
- **Rôles détectés**: admin, gestionnaire, prestataire, locataire, auth, general
- **Nommage**: `{counter}-{description}-{timestamp}.png`
- **Format**: PNG avec full page par défaut
- **Animations**: Désactivées pour stabilité

### Vidéos Organisées
- **Structure**: `test/videos/{role}/`
- **Format**: WebM ou MP4
- **Résolution**: 1280x720
- **Mode**: Enregistrement systématique par rôle

### Traces Organisées
- **Structure**: `test/traces/{role}/`
- **Format**: ZIP (trace Playwright)
- **Contenu**: Network, console, DOM snapshots
- **Visualisation**: `npx playwright show-trace trace.zip`

### Détection Automatique du Rôle
Le système détecte automatiquement le rôle basé sur:
1. **Nom du projet Playwright** (priorité haute)
2. **Chemin du fichier de test** (ex: `/test/e2e/gestionnaire/`)
3. **Titre du test** (mots-clés: admin, gestionnaire, etc.)
4. **Fallback**: `general` si aucune détection

## 🔧 Configuration Avancée

### Variables d'Environnement

```bash
# Port du serveur de développement
BASE_URL=http://localhost:3006

# Configuration CI/CD
CI=true  # Active le mode CI (pas de retry, parallel limité)

# Debug
PWDEBUG=1  # Active le mode debug Playwright
```

### Personnalisation des Seuils

Dans `playwright.config.ts`:
```typescript
expect: {
  timeout: 10 * 1000,
  toMatchSnapshot: {
    maxDiffPixels: 100,  // Tolérance pour tests visuels
    threshold: 0.2       // Seuil de différence
  }
}
```

## 🐛 Résolution de Problèmes

### Problème: Tests timeout
**Solution**: Vérifier que le serveur dev est démarré sur le port 3006
```bash
npm run dev  # Dans un terminal séparé
```

### Problème: Screenshots non générés
**Solution**: Vérifier les permissions du dossier test/
```bash
chmod -R 755 test/  # Unix/Linux
```

### Problème: Rapport HTML ne s'ouvre pas
**Solution**: Utiliser la commande Playwright
```bash
npx playwright show-report test/reports/html
```

## ✅ Checklist de Validation

- [x] Configuration Playwright avec captures activées
- [x] Helper de screenshot créé et fonctionnel
- [x] Structure de dossiers organisée dans test/
- [x] Scripts npm pour exécution facilitée
- [x] Global teardown pour post-traitement
- [x] Rapports multiples (HTML, JSON, JUnit, Markdown)
- [x] Index HTML pour navigation
- [x] Documentation complète

## 📈 Prochaines Étapes

1. **Tests de Régression Visuelle**
   - Créer des baselines pour chaque page
   - Implémenter la comparaison automatique

2. **Intégration CI/CD**
   - Configurer GitHub Actions avec upload des artifacts
   - Notifications automatiques sur échec

3. **Dashboard de Métriques**
   - Créer un dashboard web pour visualiser l'historique
   - Graphiques de tendance des tests

4. **Optimisation**
   - Compression des screenshots (sharp/imagemin)
   - Archivage automatique des anciens résultats

---

*Configuration mise en place et validée pour SEIDO - Janvier 2025*