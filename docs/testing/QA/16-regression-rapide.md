# Checklist de Régression Rapide - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Durée estimée** : 25-30 minutes
> **Objectif** : Vérifier les fonctionnalités critiques avant chaque déploiement

---

## Quand Utiliser Cette Checklist

| Situation | Action |
|-----------|--------|
| **Avant merge vers `main`** | Obligatoire |
| **Avant déploiement production** | Obligatoire |
| **Après hotfix** | Obligatoire |
| **Build preview** | Recommandé |
| **Fin de sprint** | Recommandé |

---

## Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Gestionnaire** | `gestionnaire@test-seido.fr` | `TestSeido2024!` |
| **Prestataire** | `prestataire@test-seido.fr` | `TestSeido2024!` |
| **Locataire** | `locataire@test-seido.fr` | `TestSeido2024!` |

---

## Checklist Complète (20 Tests)

### Section 1 : Authentification (4 tests) - ~5 min

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 1.1 | **Login Gestionnaire** | Login avec `gestionnaire@test-seido.fr` | Redirect vers `/gestionnaire/dashboard` < 3s | ☐ |
| 1.2 | **Logout** | Cliquer sur "Déconnexion" | Redirect vers `/auth/login` | ☐ |
| 1.3 | **Login Prestataire** | Login avec `prestataire@test-seido.fr` | Redirect vers `/prestataire/dashboard` | ☐ |
| 1.4 | **Login Locataire** | Login avec `locataire@test-seido.fr` | Redirect vers `/locataire/dashboard` | ☐ |

**Critère de succès** : 4/4 OK

---

### Section 2 : Navigation Critique (4 tests) - ~3 min

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 2.1 | **Dashboard → Interventions** | Cliquer sur "Interventions" dans navbar | Page liste interventions < 1s | ☐ |
| 2.2 | **Dashboard → Biens** | Cliquer sur "Biens" dans navbar | Page liste biens affichée | ☐ |
| 2.3 | **Dashboard → Contacts** | Cliquer sur "Contacts" dans navbar | Page liste contacts affichée | ☐ |
| 2.4 | **Retour Dashboard** | Cliquer sur logo/Dashboard | Retour au dashboard | ☐ |

**Critère de succès** : 4/4 OK, aucune navigation > 2s

---

### Section 3 : Intervention - Happy Path (5 tests) - ~10 min

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 3.1 | **Créer intervention** | Nouvelle intervention > Remplir formulaire > Soumettre | Intervention créée, toast succès | ☐ |
| 3.2 | **Voir détail** | Cliquer sur intervention créée | Page détail affichée avec données correctes | ☐ |
| 3.3 | **Changer statut** | Approuver l'intervention | Statut passe à "Approuvée" | ☐ |
| 3.4 | **Notification créée** | Vérifier badge notifications | Badge +1 notification | ☐ |
| 3.5 | **Filtrer liste** | Filtrer par statut "Approuvée" | Seules interventions approuvées affichées | ☐ |

**Données de test pour création** :
```
Titre: "Test Régression - [Date]"
Lot: Premier lot disponible
Catégorie: Plomberie
Description: "Test automatique de régression"
```

**Critère de succès** : 5/5 OK

---

### Section 4 : Affichage des Données (3 tests) - ~3 min

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 4.1 | **Dashboard KPIs** | Vérifier dashboard gestionnaire | KPIs affichés (interventions, biens, contacts) | ☐ |
| 4.2 | **Liste avec données** | Ouvrir liste interventions | Au moins 1 intervention affichée | ☐ |
| 4.3 | **Détail complet** | Ouvrir détail d'un bien | Toutes les sections affichées (info, lots, contacts) | ☐ |

**Critère de succès** : 3/3 OK, aucune erreur console

---

### Section 5 : Formulaires & Validation (2 tests) - ~3 min

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 5.1 | **Validation champ requis** | Soumettre formulaire intervention vide | Messages d'erreur sous champs requis | ☐ |
| 5.2 | **Validation email** | Entrer email invalide dans contact | Message "Format email invalide" | ☐ |

**Critère de succès** : 2/2 OK

---

### Section 6 : Performance (2 tests) - ~3 min

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 6.1 | **Page login < 2s** | Rafraîchir `/auth/login` | Page affichée en moins de 2 secondes | ☐ |
| 6.2 | **Dashboard < 3s** | Charger dashboard gestionnaire | Contenu principal visible < 3 secondes | ☐ |

**Comment mesurer** : DevTools > Network > "Finish" time ou observateur manuel

**Critère de succès** : 2/2 OK

---

## Résumé d'Exécution

### Compteur de Tests

| Section | Tests | Passés | Échoués |
|---------|-------|--------|---------|
| 1. Authentification | 4 | ☐ /4 | ☐ |
| 2. Navigation | 4 | ☐ /4 | ☐ |
| 3. Intervention | 5 | ☐ /5 | ☐ |
| 4. Affichage | 3 | ☐ /3 | ☐ |
| 5. Formulaires | 2 | ☐ /2 | ☐ |
| 6. Performance | 2 | ☐ /2 | ☐ |
| **TOTAL** | **20** | ☐ /20 | ☐ |

### Critères de Go/No-Go

| Résultat | Décision |
|----------|----------|
| **20/20** | ✅ GO - Déploiement autorisé |
| **18-19/20** | ⚠️ WARNING - Review des échecs, go possible si mineurs |
| **< 18/20** | ❌ NO-GO - Correction requise avant déploiement |

---

## Rapport de Régression

### Informations de Session

| Champ | Valeur |
|-------|--------|
| **Date** | ____/____/________ |
| **Testeur** | ________________________ |
| **Environnement** | ☐ Local ☐ Preview ☐ Production |
| **Branche/PR** | ________________________ |
| **Version** | ________________________ |

### Résultat Final

| Métrique | Valeur |
|----------|--------|
| **Tests passés** | ____/20 |
| **Tests échoués** | ____ |
| **Durée totale** | ____ minutes |
| **Décision** | ☐ GO ☐ WARNING ☐ NO-GO |

### Bugs Découverts

| # | Test | Description | Sévérité | Ticket |
|---|------|-------------|----------|--------|
| 1 | | | ☐ Critical ☐ Major ☐ Minor | |
| 2 | | | ☐ Critical ☐ Major ☐ Minor | |
| 3 | | | ☐ Critical ☐ Major ☐ Minor | |

### Notes Additionnelles

```
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## Version Condensée (10 min)

Si le temps est limité, exécuter uniquement ces **10 tests critiques** :

| # | Test Critique | Status |
|---|---------------|--------|
| 1 | Login Gestionnaire → Dashboard | ☐ |
| 2 | Login Prestataire → Dashboard | ☐ |
| 3 | Login Locataire → Dashboard | ☐ |
| 4 | Navigation Dashboard → Interventions | ☐ |
| 5 | Créer nouvelle intervention | ☐ |
| 6 | Voir détail intervention créée | ☐ |
| 7 | Changer statut intervention | ☐ |
| 8 | Dashboard affiche KPIs | ☐ |
| 9 | Page login charge < 2s | ☐ |
| 10 | Aucune erreur console critique | ☐ |

**Critère GO** : 10/10 OK

---

## Automatisation Future

### Tests à Automatiser en Priorité

Ces tests de la checklist sont candidats à l'automatisation Playwright :

```typescript
// tests-new/regression/smoke.spec.ts (proposé)

test.describe('Smoke Tests', () => {
  test('Login tous les rôles', async ({ page }) => {
    // Tests 1.1, 1.3, 1.4
  })

  test('Navigation critique', async ({ page }) => {
    // Tests 2.1-2.4
  })

  test('Création intervention', async ({ page }) => {
    // Tests 3.1-3.3
  })

  test('Performance basique', async ({ page }) => {
    // Tests 6.1-6.2
  })
})
```

### Commande Proposée

```bash
# Exécuter les smoke tests de régression
npx playwright test tests-new/regression/smoke.spec.ts
```

---

## Références

- **Parcours E2E complets** : `06-parcours-*.md`
- **Cas négatifs** : `14-cas-negatifs.md`
- **Baselines performance** : `15-baselines-performance.md`
- **Comptes de test** : `11-donnees-test.md`
- **Template bug report** : `09-template-bug-report.md`

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale (20 tests) |

---

**Mainteneur** : Claude Code
**Tests** : 20 (version complète) / 10 (version rapide)
**Durée** : 25-30 min (complète) / 10 min (rapide)
