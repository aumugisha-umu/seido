# Matrice de Couverture des Tests - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Objectif** : Visualiser la couverture des tests par fonctionnalité et identifier les gaps

---

## Vue d'Ensemble

### Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | Couvert - Tests existants et fonctionnels |
| ⚠️ | Partiel - Tests existants mais incomplets ou skipped |
| ❌ | Non couvert - Aucun test automatisé |
| 🔄 | En cours - Tests en développement |
| ⏭️ | Non applicable - Pas besoin de ce type de test |

### Types de Tests

| Type | Outil | Fichiers | Description |
|------|-------|----------|-------------|
| **Unit** | Vitest | `lib/services/**/__tests__/*.test.ts` | Tests unitaires isolés |
| **Integration** | Vitest | `lib/services/**/__tests__/*.test.ts` | Tests d'intégration services |
| **E2E Auto** | Playwright | `tests-new/**/*.spec.ts` | Tests E2E automatisés |
| **E2E Manual** | QA Docs | `docs/testing/QA/0[6-8,10]*.md` | Parcours E2E manuels (Gherkin) |
| **Functional** | QA Docs | `docs/testing/QA/01-checklist*.md` | Tests fonctionnels manuels |

---

## Matrice par Domaine Fonctionnel

### 1. Authentification & Autorisation

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Login email/password** | ❌ | ❌ | ⚠️ Skipped | ✅ Gherkin | ✅ | P0 |
| **Logout** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Magic link** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Redirection post-login** | ❌ | ❌ | ⚠️ Skipped | ✅ Gherkin | ✅ | P0 |
| **Session persistence** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **RLS policies - Users** | ❌ | ❌ | ❌ | ⏭️ | ⏭️ | P0 |
| **RLS policies - Buildings** | ❌ | ❌ | ❌ | ⏭️ | ⏭️ | P0 |
| **RLS policies - Lots** | ❌ | ❌ | ❌ | ⏭️ | ⏭️ | P0 |
| **RLS policies - Interventions** | ❌ | ❌ | ❌ | ⏭️ | ⏭️ | P0 |
| **Role-based access control** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |

**Gap Analysis** :
- ⚠️ Tests E2E automatisés skipped (pending auth helper)
- ❌ Aucun test unitaire pour AuthService
- ❌ Aucun test de sécurité RLS automatisé

---

### 2. Gestion des Biens (Buildings & Lots)

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Création immeuble** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Modification immeuble** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Suppression immeuble** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Liste immeubles** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Détail immeuble** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Création lot** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Modification lot** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Suppression lot** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Affectation locataire** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Import Excel/CSV** | ❌ | ❌ | ❌ | ❌ | ✅ | P1 |
| **Validation données import** | ❌ | ❌ | ❌ | ❌ | ✅ | P1 |

**Gap Analysis** :
- ❌ Aucun test automatisé pour le CRUD des biens
- ❌ Import Excel/CSV non testé en E2E
- ✅ Bonne couverture manuelle

---

### 3. Gestion des Contacts

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Création contact** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Modification contact** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Suppression contact** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P2 |
| **Liste contacts** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Filtrage contacts** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P2 |
| **Association bien/contact** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |

**Gap Analysis** :
- ❌ Aucun test automatisé
- ✅ Couverture manuelle adéquate pour P1-P2

---

### 4. Interventions (Workflow Principal)

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Création intervention (gestionnaire)** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Création intervention (locataire)** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Approbation intervention** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Rejet intervention** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Demande de devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Soumission devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Validation devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Planification RDV** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Confirmation créneau** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Exécution travaux** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Clôture prestataire** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Validation locataire** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Clôture gestionnaire** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Annulation intervention** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Machine à états (transitions)** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |

**Gap Analysis** :
- ⚠️ **CRITIQUE** : Workflow principal sans tests automatisés
- ❌ Machine à états non testée unitairement
- ✅ Excellente couverture Gherkin (4 parcours complets)

---

### 5. Notifications

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Notification création intervention** | ✅ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Notification changement statut** | ✅ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Notification nouveau devis** | ⚠️ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Notification planification** | ⚠️ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Dispatcher multi-canal** | ✅ | ❌ | ❌ | ⏭️ | ⏭️ | P0 |
| **Email templates** | ✅ | ❌ | ❌ | ⏭️ | ⏭️ | P1 |
| **Badge notifications (UI)** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Mark as read** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P2 |

**Gap Analysis** :
- ✅ **NotificationDispatcher** bien testé unitairement
- ✅ **EmailNotificationService** testé unitairement
- ❌ Intégration bout-en-bout non testée

**Fichiers de tests existants** :
- `lib/services/domain/__tests__/notification-dispatcher.service.test.ts`
- `lib/services/domain/__tests__/email-notification.service.test.ts`

---

### 6. Devis & Facturation

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Création devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Modification devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Validation devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Rejet devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Historique devis** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P2 |

---

### 7. Planning & Calendrier

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Vue calendrier** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Proposition créneaux** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Sélection créneau** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Modification RDV** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Annulation RDV** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |

---

### 8. Dashboard & Statistiques

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Dashboard gestionnaire** | ❌ | ❌ | ⚠️ | ✅ Gherkin | ✅ | P0 |
| **Dashboard prestataire** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Dashboard locataire** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Dashboard propriétaire** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P2 |
| **KPIs interventions** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P1 |
| **Statistiques équipe** | ❌ | ❌ | ❌ | ✅ Gherkin | ✅ | P2 |

---

### 9. Performance

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Temps de navigation** | ⏭️ | ⏭️ | ⚠️ Skipped | ✅ | ⏭️ | P0 |
| **Login page load** | ⏭️ | ⏭️ | ✅ | ✅ | ⏭️ | P0 |
| **First Contentful Paint** | ⏭️ | ⏭️ | ✅ | ✅ | ⏭️ | P1 |
| **Cumulative Layout Shift** | ⏭️ | ⏭️ | ⚠️ Skipped | ✅ | ⏭️ | P1 |
| **Protection double-clic** | ⏭️ | ⏭️ | ⚠️ Skipped | ✅ | ⏭️ | P1 |

**Fichier E2E Performance** : `tests-new/performance/navigation.spec.ts`

**Gap Analysis** :
- ⚠️ Plusieurs tests skipped (pending auth helper)
- ✅ Framework en place pour mesurer Core Web Vitals

---

### 10. Mobile & Responsive

| Fonctionnalité | Unit | Integration | E2E Auto | E2E Manual | Functional | Priorité |
|----------------|------|-------------|----------|------------|------------|----------|
| **Viewport 375px (Mobile)** | ⏭️ | ⏭️ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Viewport 768px (Tablet)** | ⏭️ | ⏭️ | ❌ | ✅ Gherkin | ✅ | P0 |
| **Touch targets 44px** | ⏭️ | ⏭️ | ❌ | ✅ Gherkin | ✅ | P0 |
| **PWA Install** | ⏭️ | ⏭️ | ❌ | ❌ | ✅ | P1 |
| **Offline mode** | ⏭️ | ⏭️ | ❌ | ❌ | ⚠️ | P2 |

---

## Résumé de Couverture par Type

### Tests Automatisés

| Type | Fichiers | Tests | Couverture |
|------|----------|-------|------------|
| **Unit Tests** | 2 | ~15 | Notifications uniquement |
| **E2E Playwright** | 1 | 9 | Performance (6 skipped) |
| **Total Auto** | 3 | ~24 | **< 5%** fonctionnalités |

### Tests Manuels (Documentation QA)

| Type | Fichiers | Scenarios/Items | Couverture |
|------|----------|-----------------|------------|
| **E2E Gherkin** | 4 | ~166 scenarios | 100% parcours critiques |
| **Checklists Fonctionnelles** | 1 | ~300+ items | 100% des 65 pages |
| **Total Manuel** | 5 | ~466+ | **~95%** fonctionnalités |

---

## Priorisation des Gaps

### 🔴 Critiques (à automatiser en priorité)

| Fonctionnalité | Raison | Effort estimé |
|----------------|--------|---------------|
| **Auth helper E2E** | Débloquer tous les tests E2E skipped | 4-8h |
| **Intervention state machine** | Workflow principal, risque de régression élevé | 8-16h |
| **RLS policies** | Sécurité multi-tenant critique | 4-8h |

### 🟠 Importants (prochaine phase)

| Fonctionnalité | Raison | Effort estimé |
|----------------|--------|---------------|
| **CRUD Biens** | Tests de base pour entités principales | 8-16h |
| **CRUD Contacts** | Dépendance des interventions | 4-8h |
| **Devis workflow** | Business logic complexe | 8-16h |

### 🟡 Souhaitables (amélioration continue)

| Fonctionnalité | Raison | Effort estimé |
|----------------|--------|---------------|
| **Dashboard tests** | Vérifier affichage données | 4-8h |
| **Mobile E2E** | Viewport-specific tests | 8-16h |
| **Import Excel** | Feature récente, à stabiliser | 4-8h |

---

## Métriques de Couverture

### Par Priorité

| Priorité | Total Features | Unit | Integration | E2E Auto | E2E Manual | Functional |
|----------|----------------|------|-------------|----------|------------|------------|
| **P0** | 28 | 7% | 0% | 7% | 96% | 100% |
| **P1** | 24 | 4% | 0% | 0% | 92% | 100% |
| **P2** | 12 | 0% | 0% | 0% | 83% | 100% |

### Par Rôle

| Rôle | E2E Gherkin | Scenarios | Couverture Critique |
|------|-------------|-----------|---------------------|
| **Gestionnaire** | ✅ | 48 | 100% |
| **Prestataire** | ✅ | 47 | 100% |
| **Locataire** | ✅ | 39 | 100% |
| **Propriétaire** | ✅ | 32 | 100% |
| **Admin** | ❌ | 0 | 0% (à documenter) |

---

## Plan d'Amélioration

### Phase 1 : Débloquer E2E (Sprint 1)

```
1. Implémenter auth helper Playwright
   - Fichier: tests-new/helpers/auth-helper.ts
   - Support: login programmatique, session storage
   - Dépend: Comptes de test (11-donnees-test.md)

2. Activer tests navigation skipped
   - Fichier: tests-new/performance/navigation.spec.ts
   - Objectif: 9/9 tests passants
```

### Phase 2 : Couverture Critique (Sprint 2-3)

```
3. Tests unitaires intervention service
   - Fichier: lib/services/domain/__tests__/intervention.service.test.ts
   - Focus: Machine à états, validations

4. Tests E2E workflow intervention
   - Fichier: tests-new/e2e/intervention-workflow.spec.ts
   - Scenarios: Création → Devis → Planification → Clôture
```

### Phase 3 : Consolidation (Sprint 4+)

```
5. Tests RLS Supabase
   - Fichier: tests-new/security/rls-policies.spec.ts
   - Méthode: Multi-user, vérification isolation

6. Tests CRUD entités
   - Buildings, Lots, Contacts
   - Pattern: Factory + Cleanup
```

---

## Références

### Fichiers de Test Existants

| Chemin | Type | Status |
|--------|------|--------|
| `lib/services/domain/__tests__/notification-dispatcher.service.test.ts` | Unit | ✅ Actif |
| `lib/services/domain/__tests__/email-notification.service.test.ts` | Unit | ✅ Actif |
| `tests-new/performance/navigation.spec.ts` | E2E | ⚠️ Partiellement skipped |

### Documentation QA

| Chemin | Type | Scenarios |
|--------|------|-----------|
| `docs/testing/QA/06-parcours-gestionnaire.md` | E2E Gherkin | 48 |
| `docs/testing/QA/07-parcours-prestataire.md` | E2E Gherkin | 47 |
| `docs/testing/QA/08-parcours-locataire.md` | E2E Gherkin | 39 |
| `docs/testing/QA/10-parcours-proprietaire.md` | E2E Gherkin | 32 |
| `docs/testing/QA/01-checklist-fonctionnel.md` | Checklist | ~300+ |

### Commandes

```bash
# Exécuter tests unitaires
npm test

# Exécuter tests E2E
npx playwright test

# Exécuter tests avec couverture
npm test -- --coverage

# Tests E2E spécifiques
npx playwright test tests-new/performance/navigation.spec.ts
```

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale |

---

**Mainteneur** : Claude Code
**Dernière analyse** : 2025-12-18
