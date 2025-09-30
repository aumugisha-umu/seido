# 🚀 Plan d'Action : Migration Tests E2E avec Auto-Healing

**Date de création** : 30 septembre 2025
**Version** : 1.0
**Objectif** : Migrer tous les tests E2E existants vers l'architecture auto-healing

---

## 📊 État des Lieux

### ✅ Infrastructure Existante

```
docs/refacto/Tests/
├── ✅ auto-healing/          # Système auto-healing complet
│   ├── config.ts
│   ├── error-context-collector.ts
│   ├── auto-fix-agent.ts
│   ├── orchestrator.ts
│   └── test-runner.ts
├── ✅ helpers/               # Utilitaires intelligents
│   ├── e2e-test-logger.ts   # Logger Pino + screenshots
│   ├── seido-debugger-agent.ts
│   └── custom-pino-reporter.ts
├── ✅ fixtures/
│   └── users.fixture.ts     # Fixtures utilisateurs 4 rôles
├── ✅ tests/phase1-auth/
│   └── auth-login.spec.ts   # Exemple complet auto-healing
└── ✅ config/                # Config Playwright + Pino
```

### ⚠️ Tests à Migrer

**Localisation** : `test/e2e/`
**Total** : 29 fichiers de tests

**Catégories identifiées** :
- **Auth** : 8 tests (divers niveaux de complexité)
- **Dashboards** : 3 tests (gestionnaire, locataire, prestataire)
- **Contacts** : 1 test (gestionnaire-invite-locataire.spec.ts)
- **Interventions** : 2 tests (lifecycle, workflows)
- **Validation/Performance** : 15 tests (divers)

---

## 🎯 Stratégie de Migration en 3 Phases

### Phase 1 : CONTACTS (Priorité 1) ⏱️ 2-3h

**Objectif** : Tests gestion contacts/invitations avec auto-healing

#### Fichiers à Créer

1. **fixtures/contacts.fixture.ts**
   ```typescript
   // Types
   export interface TestContact {
     email: string
     firstName: string
     lastName: string
     type: 'locataire' | 'proprietaire' | 'prestataire'
     phone?: string
     teamId?: string
   }

   export interface TestContactInvitation {
     contactId: string
     status: 'pending' | 'accepted' | 'expired' | 'cancelled'
     token: string
     expiresAt: Date
   }

   // Données de test
   export const TEST_CONTACTS: Record<string, TestContact>
   export const TEST_INVITATIONS: TestContactInvitation[]

   // Helpers
   export function generateContact(override?: Partial<TestContact>): TestContact
   export function validateContactData(contact: TestContact): ValidationResult
   ```

2. **tests/phase2-contacts/contacts-management.spec.ts**
   - Basé sur : `test/e2e/gestionnaire-invite-locataire.spec.ts`
   - Ajouts :
     - E2ETestLogger pour logging structuré
     - Auto-healing pour erreurs courantes
     - Screenshots automatiques
     - Métriques de performance

3. **tests/phase2-contacts/contacts-filters.spec.ts**
   - Tests filtrage par type
   - Tests recherche par nom/email
   - Tests tri (alphabétique, date)

#### Plan d'Implémentation Détaillé

**Étape 1.1** : Créer fixtures/contacts.fixture.ts
```bash
# Contenu
- Types TypeScript stricts
- 5-10 contacts de test variés
- Validation avec zod ou yup
- Helpers de génération
```

**Étape 1.2** : Analyser gestionnaire-invite-locataire.spec.ts
```bash
# Actions
- Identifier étapes clés du workflow
- Repérer points de défaillance potentiels
- Lister sélecteurs à améliorer
```

**Étape 1.3** : Migrer vers contacts-management.spec.ts
```typescript
// Pattern de migration
test('Workflow invitation locataire', async ({ page }) => {
  const testLogger = new E2ETestLogger('contact-invitation', 'gestionnaire')

  try {
    // Étape 1: Login
    await testLogger.logStep('Login gestionnaire', page, {
      email: TEST_USERS.gestionnaire.email
    })
    await page.goto('/auth/login')
    // ... login steps with auto-healing

    // Étape 2: Navigation contacts
    await testLogger.logStep('Navigate to contacts', page)
    // ... with auto-healing for timeouts

    // Étape 3: Ouvrir modal invitation
    await testLogger.logStep('Open invitation modal', page)
    // ... with selector auto-healing

    // Etc.

    const summary = await testLogger.finalize()
    testSummaries.push(summary)

  } catch (error) {
    await testLogger.logError(error, 'Contact invitation workflow', page)
    throw error
  }
})
```

**Étape 1.4** : Ajouter tests complémentaires
- Test suppression contact
- Test modification contact
- Test filtrage liste
- Test gestion permissions

**Étape 1.5** : Validation Phase 1
```bash
# Commandes de test
npm run test:e2e:complete -- tests/phase2-contacts
npm run test:analyze

# Vérifications
- ✅ Tous tests passent à 100%
- ✅ Auto-healing détecte/corrige erreurs
- ✅ Screenshots générés correctement
- ✅ Logs structurés dans logs/
- ✅ Debugger agent produit rapport
```

---

### Phase 2 : BIENS/BUILDINGS (Priorité 2) ⏱️ 2-3h

**Objectif** : Tests gestion bâtiments/lots avec multi-rôle

#### Fichiers à Créer

1. **fixtures/buildings.fixture.ts**
   ```typescript
   export interface TestBuilding {
     id: string
     name: string
     address: TestAddress
     teamId: string
     lots: TestLot[]
     managerId?: string
   }

   export interface TestLot {
     id: string
     buildingId: string
     number: string
     floor: number
     tenantId?: string
     surface: number
     occupancyStatus: 'occupied' | 'vacant' | 'maintenance'
   }

   export interface TestAddress {
     street: string
     city: string
     postalCode: string
     country: string
   }

   export const TEST_BUILDINGS: Record<string, TestBuilding>
   export const TEST_LOTS: TestLot[]
   ```

2. **tests/phase2-buildings/buildings-management.spec.ts**
   - CRUD bâtiments complet
   - Association avec équipe
   - Tests permissions gestionnaire/propriétaire

3. **tests/phase2-buildings/lots-management.spec.ts**
   - CRUD lots
   - Association locataires
   - Gestion statuts occupation
   - Filtrage par bâtiment/étage

#### Plan d'Implémentation

**Étape 2.1** : Créer fixtures/buildings.fixture.ts
- 3-5 bâtiments de test
- 10-15 lots variés
- Relations hiérarchiques complètes

**Étape 2.2** : Extraire tests bâtiments existants
- Analyser dashboard-gestionnaire.spec.ts (partie biens)
- Identifier workflows CRUD
- Lister cas d'edge

**Étape 2.3** : Migrer vers buildings-management.spec.ts
- Avec E2ETestLogger
- Auto-healing pour sélecteurs bâtiments
- Tests multi-rôle (gestionnaire + propriétaire)

**Étape 2.4** : Créer lots-management.spec.ts
- Tests spécifiques lots
- Relations bâtiment-lot-locataire
- Validation occupation

**Étape 2.5** : Validation Phase 2
```bash
npm run test:e2e:complete -- tests/phase2-buildings
npm run test:analyze
```

---

### Phase 3 : INTERVENTIONS (Priorité 3) ⏱️ 4-5h

**Objectif** : Tests workflow complet interventions avec multi-rôle

#### Fichiers à Créer

1. **fixtures/interventions.fixture.ts**
   ```typescript
   export interface TestIntervention {
     id: string
     title: string
     description: string
     type: 'plumbing' | 'electrical' | 'heating' | 'other'
     urgency: 'low' | 'medium' | 'high' | 'urgent'
     status: InterventionStatus
     tenantId: string
     lotId: string
     buildingId: string
     assignedProviderId?: string
     quotes?: TestQuote[]
     availability?: TestAvailability[]
   }

   export type InterventionStatus =
     | 'draft'
     | 'pending_validation'
     | 'approved'
     | 'in_progress'
     | 'completed'
     | 'cancelled'

   export interface TestQuote {
     id: string
     interventionId: string
     providerId: string
     amount: number
     description: string
     status: 'draft' | 'submitted' | 'approved' | 'rejected'
     validUntil: Date
   }

   export interface TestAvailability {
     id: string
     providerId: string
     date: Date
     startTime: string
     endTime: string
     isAvailable: boolean
   }

   export const TEST_INTERVENTIONS: Record<string, TestIntervention>
   export const TEST_QUOTES: TestQuote[]
   export const TEST_AVAILABILITIES: TestAvailability[]
   ```

2. **tests/phase3-interventions/intervention-lifecycle.spec.ts**
   - Basé sur : `test/e2e/intervention-lifecycle.spec.ts`
   - Workflow complet : création → validation → assignment → execution → completion
   - Tests multi-rôle (locataire → gestionnaire → prestataire)
   - Auto-healing pour transitions d'état

3. **tests/phase3-interventions/intervention-assignment.spec.ts**
   - Assignment automatique/manuel prestataire
   - Gestion disponibilités
   - Résolution conflits de planning
   - Notifications multi-rôle

4. **tests/phase3-interventions/intervention-quotes.spec.ts**
   - Soumission devis par prestataire
   - Validation/rejet par gestionnaire
   - Workflow approbation
   - Tests limites budgétaires

5. **tests/phase3-interventions/intervention-performance.spec.ts**
   - Benchmark workflow complet
   - Tests charge (multiple interventions)
   - Optimisation requêtes DB
   - Cache validation

#### Plan d'Implémentation

**Étape 3.1** : Créer fixtures/interventions.fixture.ts
- 10-15 interventions variées (tous types/urgences)
- 5-10 devis de test
- Planning disponibilités prestataires

**Étape 3.2** : Analyser intervention-lifecycle.spec.ts existant
- Cartographier états et transitions
- Identifier points de synchronisation
- Lister erreurs courantes

**Étape 3.3** : Migrer intervention-lifecycle.spec.ts
- Avec E2ETestLogger pour chaque transition
- Auto-healing pour :
  - Timeouts transition d'état
  - Sélecteurs formulaires dynamiques
  - Redirections multi-rôle
  - Notifications asynchrones

**Étape 3.4** : Créer tests spécialisés
- intervention-assignment.spec.ts
- intervention-quotes.spec.ts
- intervention-performance.spec.ts

**Étape 3.5** : Tests d'intégration multi-workflow
- Plusieurs interventions en parallèle
- Prestataire multitâche
- Gestionnaire multi-bâtiment

**Étape 3.6** : Validation Phase 3
```bash
npm run test:e2e:complete -- tests/phase3-interventions
npm run test:analyze
npm run test:e2e:integration
```

---

## 📚 Documentation à Créer

### GUIDE-MIGRATION-TESTS.md

**Contenu détaillé** :

1. **Introduction**
   - Objectif de la migration
   - Avantages auto-healing
   - Architecture cible

2. **Pattern de Migration** (Before/After)
   ```typescript
   // ❌ AVANT (test simple)
   test('Login test', async ({ page }) => {
     await page.goto('/auth/login')
     await page.fill('[type="email"]', email)
     await page.fill('[type="password"]', password)
     await page.click('[type="submit"]')
     await page.waitForURL('/dashboard')
     expect(page.url()).toContain('/dashboard')
   })

   // ✅ APRÈS (test avec auto-healing)
   test('Login test with auto-healing', async ({ page }) => {
     const testLogger = new E2ETestLogger('login-test', 'gestionnaire')

     try {
       await testLogger.logStep('Navigate to login', page)
       await page.goto('/auth/login')

       await testLogger.logStep('Fill credentials', page, {
         email: TEST_USERS.gestionnaire.email
       })
       await page.fill('[type="email"]', email)
       await page.fill('[type="password"]', password)

       await testLogger.logStep('Submit form', page)
       await page.click('[type="submit"]')

       await testLogger.logStep('Wait for redirect', page)
       await page.waitForURL('**/dashboard', {
         timeout: SECURITY_CONFIG.authTimeout
       })

       const summary = await testLogger.finalize()
       testSummaries.push(summary)

       console.log(`✅ Login test passed: ${summary.totalDuration}ms`)

     } catch (error) {
       await testLogger.logError(error as Error, 'Login test', page)
       const summary = await testLogger.finalize()
       testSummaries.push(summary)
       throw error
     }
   })
   ```

3. **Utilisation E2ETestLogger**
   - Initialisation
   - logStep() avec metadata
   - logError() avec contexte
   - finalize() et summaries

4. **Intégration Auto-Healing**
   - Configuration par défaut
   - Patterns d'erreurs détectés
   - Customisation fixes
   - Backups et rollbacks

5. **Best Practices SEIDO**
   - Nommage tests/steps
   - Organisation fixtures
   - Gestion multi-rôle
   - Performance tests

6. **Troubleshooting Commun**
   - Timeouts fréquents
   - Sélecteurs cassés
   - Problèmes auth
   - Race conditions

7. **Exemples Complets**
   - Test auth simple
   - Test CRUD complet
   - Test workflow multi-rôle
   - Test performance

---

## 📁 Structure Finale Cible

```
docs/refacto/Tests/
├── README.md                           # ✅ Existant
├── SYSTEME-AUTO-HEALING.md             # ✅ Existant
├── PLAN-ACTION-MIGRATION.md            # ✅ Ce document
├── GUIDE-MIGRATION-TESTS.md            # ⬜ À créer
│
├── auto-healing/                       # ✅ Complet
│   ├── config.ts
│   ├── error-context-collector.ts
│   ├── auto-fix-agent.ts
│   ├── orchestrator.ts
│   ├── test-runner.ts
│   ├── demo-login-test.spec.ts
│   └── README.md
│
├── config/                             # ✅ Existant
│   ├── playwright.e2e.config.ts
│   └── pino-test.config.ts
│
├── helpers/                            # ✅ Existant
│   ├── e2e-test-logger.ts
│   ├── seido-debugger-agent.ts
│   ├── custom-pino-reporter.ts
│   └── analyze-results.ts
│
├── fixtures/                           # ⬜ À compléter
│   ├── users.fixture.ts               # ✅ Existant
│   ├── contacts.fixture.ts            # ⬜ Phase 1
│   ├── buildings.fixture.ts           # ⬜ Phase 2
│   └── interventions.fixture.ts       # ⬜ Phase 3
│
├── tests/
│   ├── phase1-auth/                   # ✅ Fait
│   │   └── auth-login.spec.ts
│   │
│   ├── phase2-contacts/               # ⬜ Phase 1 (2-3h)
│   │   ├── contacts-management.spec.ts
│   │   └── contacts-filters.spec.ts
│   │
│   ├── phase2-buildings/              # ⬜ Phase 2 (2-3h)
│   │   ├── buildings-management.spec.ts
│   │   └── lots-management.spec.ts
│   │
│   └── phase3-interventions/          # ⬜ Phase 3 (4-5h)
│       ├── intervention-lifecycle.spec.ts
│       ├── intervention-assignment.spec.ts
│       ├── intervention-quotes.spec.ts
│       └── intervention-performance.spec.ts
│
├── screenshots/                        # Auto-généré
├── logs/                               # Auto-généré
├── reports/                            # Auto-généré
└── auto-healing-artifacts/             # Auto-généré
```

---

## ⏱️ Estimation Temporelle

| Phase | Tâches | Durée Estimée | Priorité |
|-------|--------|---------------|----------|
| **Setup** | GUIDE-MIGRATION-TESTS.md | 1-2h | HAUTE |
| **Phase 1** | Contacts (fixtures + 2 tests) | 2-3h | HAUTE |
| **Phase 2** | Buildings (fixtures + 2 tests) | 2-3h | MOYENNE |
| **Phase 3** | Interventions (fixtures + 4 tests) | 4-5h | MOYENNE |
| **Validation** | Tests intégration + docs | 1-2h | HAUTE |
| **TOTAL** | | **10-15h** | |

---

## ✅ Critères de Succès Globaux

### Par Phase

- [ ] Fixtures créées avec validation TypeScript
- [ ] Tests migrés passent à 100% sans flakiness
- [ ] Auto-healing fonctionne sur erreurs courantes
- [ ] Screenshots générés à chaque étape
- [ ] Logs structurés Pino lisibles
- [ ] Debugger agent produit recommandations pertinentes
- [ ] Performance acceptable (< 30s par test)

### Projet Complet

- [ ] **Coverage** : Tous tests critiques migrés
- [ ] **Stabilité** : 0% flakiness sur 10 runs
- [ ] **Auto-Healing** : > 80% erreurs auto-corrigées
- [ ] **Documentation** : Guide complet utilisable
- [ ] **CI/CD** : Intégration pipeline prête
- [ ] **Performance** : Suite complète < 5 minutes

---

## 🚦 Démarrage : Prochaines Étapes Immédiates

### Étape Initiale : Préparation

1. **Créer GUIDE-MIGRATION-TESTS.md** avec patterns
2. **Créer fixtures/contacts.fixture.ts**
3. **Migrer premier test** : gestionnaire-invite-locataire.spec.ts

### Commandes Rapides

```bash
# 1. Créer dossier phase2-contacts
mkdir -p docs/refacto/Tests/tests/phase2-contacts

# 2. Lancer serveur dev
npm run dev

# 3. Premier test
npx playwright test docs/refacto/Tests/tests/phase2-contacts/contacts-management.spec.ts --headed

# 4. Analyse
npm run test:analyze
```

---

## 📞 Support et Questions

**En cas de blocage** :
1. Consulter SYSTEME-AUTO-HEALING.md
2. Vérifier logs dans `docs/refacto/Tests/logs/`
3. Analyser artifacts auto-healing
4. Consulter tests phase1-auth comme référence

**Ressources** :
- Playwright Docs : https://playwright.dev
- Pino Logger : https://getpino.io
- Auto-Healing README : `docs/refacto/Tests/auto-healing/README.md`

---

**Statut Actuel** : ✅ Document créé
**Prochaine Action** : Créer GUIDE-MIGRATION-TESTS.md
**Date** : 30 septembre 2025