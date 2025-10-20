# 🧪 Tests UI Optimisés Seido

Configuration et outils pour les tests E2E avec captures d'écran automatiques et rapports visuels complets.

## 🚀 Démarrage Rapide

```bash
# Tests complets optimisés avec captures automatiques
npm run test:e2e:optimized

# Mode debug visuel
npm run test:e2e:optimized:debug

# Tests par rôle spécifique
npm run test:e2e:gestionnaire
npm run test:e2e:prestataire
npm run test:e2e:locataire
npm run test:e2e:admin

# Générer le rapport visuel
npm run test:e2e:visual
```

## 📁 Structure des Tests

```
test/
├── e2e/                          # Tests E2E principaux
│   ├── helpers/                  # Utilitaires et helpers
│   │   ├── screenshot-helpers.ts # Gestion des captures d'écran
│   │   ├── auth-helpers.ts       # Authentification robuste
│   │   └── test-selectors.ts     # Sélecteurs optimisés
│   ├── auth-optimized.spec.ts    # Tests d'auth avec captures
│   └── intervention-lifecycle.spec.ts
├── scripts/                      # Scripts d'exécution
│   ├── run-optimized-tests.js    # Lanceur de tests optimisé
│   └── generate-visual-report.js # Générateur de rapport visuel
├── reports/                      # Rapports générés
│   ├── html/                     # Rapport HTML Playwright
│   ├── test-results.json         # Résultats JSON
│   ├── visual-report.html        # Rapport visuel enrichi
│   └── DERNIERE-EXECUTION.md     # Synthèse dernière exécution
├── test-results/                 # Artifacts de test
├── videos/                       # Enregistrements vidéo
├── traces/                       # Traces de débogage
└── auth-states/                  # États d'authentification sauvés
```

## 🔧 Configuration Optimisée

### Playwright Configuration

- **Captures d'écran**: `on` - Capture automatique à chaque étape
- **Vidéos**: `on` - Enregistrement complet des sessions
- **Traces**: `on` - Traces détaillées pour le débogage
- **Timeouts**: Optimisés pour l'application Seido
- **Multi-browser**: Chrome, Firefox, Safari, Mobile

### Helpers Avancés

#### ScreenshotHelper
```typescript
// Capture avec métadonnées
await screenshotHelper.captureStep('login_success', {
  annotations: [
    { type: 'success', description: 'Connexion réussie' },
    { type: 'info', description: 'URL: /gestionnaire/dashboard' }
  ]
})

// Capture responsive multi-device
await screenshotHelper.captureResponsive('dashboard_responsive')

// Capture avec éléments masqués
await screenshotHelper.captureWithMask('secure_page', [
  '.sensitive-data',
  '[data-personal]'
])
```

#### AuthHelper
```typescript
// Connexion robuste avec captures automatiques
const authHelper = createAuthHelper(page, screenshotHelper)
await authHelper.login(TEST_USERS.gestionnaire, { captureSteps: true })

// Test de sécurité d'accès
await authHelper.verifyAccessDenied('/admin/dashboard', currentUser)

// Test de performance
const loginTime = await authHelper.loginPerformanceTest(user)
```

#### Sélecteurs Robustes
```typescript
// Sélecteurs avec fallback hiérarchique
const emailFilled = await fillFirstAvailable(page, [
  '[data-testid="email-input"]',
  'input[name="email"]',
  'input[type="email"]',
  'input[placeholder*="email" i]'
], 'user@example.com')
```

## 📊 Types de Rapports

### 1. Rapport HTML Interactif
- Navigation par tests et étapes
- Screenshots intégrés
- Vidéos de reproduction
- Traces cliquables
- Filtres par statut/navigateur

### 2. Rapport Visuel Enrichi
- Galerie de screenshots organisée
- Lecteur vidéo intégré
- Lightbox pour agrandissement
- Métadonnées des fichiers
- Statistiques visuelles

### 3. Rapport de Synthèse Markdown
- Résumé exécutif
- Statistiques de performance
- Liens vers artifacts
- Commandes utiles

## 🎯 Cas d'Usage Spécifiques

### Tests d'Authentification
```bash
# Test complet multi-rôles avec captures
npm run test:e2e:optimized -- --grep "Authentication"

# Test de sécurité d'accès
npm run test:e2e:optimized -- --grep "access control"

# Test de performance de connexion
npm run test:e2e:optimized -- --grep "performance"
```

### Tests Responsifs
```bash
# Tests mobile uniquement
npm run test:e2e:optimized -- --project mobile-chrome

# Tests multi-device
npm run test:e2e:optimized -- --grep "responsiveness"
```

### Tests par Workflow
```bash
# Workflow intervention complète
npm run test:e2e:optimized -- --spec test/e2e/intervention-lifecycle.spec.ts

# Workflow gestionnaire uniquement
npm run test:e2e:gestionnaire
```

## 🐛 Débogage et Diagnostic

### Mode Debug Visuel
```bash
# Debug avec interface graphique
npm run test:e2e:optimized:debug

# Debug avec slowMo
npm run test:e2e:optimized:headed -- --timeout 60000
```

### Analyse des Échecs
```bash
# Réexécuter les tests échoués
npx playwright test --last-failed

# Ouvrir le trace viewer pour un test spécifique
npx playwright show-trace test/test-results/auth-test-chromium/trace.zip
```

### Captures Personnalisées
```typescript
// Dans vos tests
await test.step('Vérification dashboard', async () => {
  await screenshotHelper.capturePageState('dashboard_loaded', {
    userRole: 'gestionnaire',
    timestamp: Date.now()
  })
})
```

## 📈 Métriques et Performance

### Indicateurs Surveillés
- **Temps de connexion**: < 5 secondes
- **Chargement dashboard**: < 3 secondes
- **Navigation inter-pages**: < 2 secondes
- **Réactivité mobile**: < 1 seconde

### Artifacts de Performance
- Captures temporelles des étapes critiques
- Mesures de temps d'exécution
- Comparaisons multi-navigateurs
- Métriques de stabilité

## 🔐 Sécurité et Données Sensibles

### Masquage Automatique
- Données personnelles masquées dans les captures
- Tokens d'authentification occultés
- Informations sensibles remplacées par des placeholders

### États d'Authentification
- Sauvegarde sécurisée des sessions
- Isolation des tests par rôle
- Nettoyage automatique entre tests

## 🚀 CI/CD et Intégration

### Variables d'Environnement
```bash
export BASE_URL="https://staging.seido.com"
export CI=true
export PLAYWRIGHT_WORKERS=2
```

### Pipeline Recommandé
1. **Build**: `npm run build`
2. **Tests unités**: `npm run test:unit`
3. **Tests E2E**: `npm run test:e2e:optimized`
4. **Rapport visuel**: `npm run test:e2e:visual`
5. **Archivage artifacts**: Sauvegarder `test/reports/`

## 📚 Ressources et Documentation

### Commandes Utiles
```bash
# Voir tous les scripts disponibles
npm run | grep test:e2e

# Ouvrir le dernier rapport
npm run test:e2e:report

# Nettoyer les artifacts anciens
rm -rf test/test-results/* test/videos/* test/traces/*

# Régénérer types Playwright
npx playwright install
```

### Liens Utiles
- [Documentation Playwright](https://playwright.dev/)
- [Guide shadcn/ui Testing](https://ui.shadcn.com/docs/testing)
- [Best Practices E2E](https://playwright.dev/docs/best-practices)

---

## 🤝 Contribution

Pour ajouter de nouveaux tests:

1. Utiliser les helpers existants
2. Suivre les patterns de capture d'écran
3. Ajouter des annotations descriptives
4. Tester sur multi-navigateurs
5. Documenter les cas d'usage spécifiques

**Dernière mise à jour**: ${new Date().toLocaleDateString('fr-FR')}