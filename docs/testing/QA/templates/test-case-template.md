# Template de Test Case - SEIDO

> **Version** : 1.0
> **Date** : 2025-12-18
> **Usage** : Copier ce template pour créer de nouveaux tests

---

## Structure d'un Test Case

```markdown
### TC-[MODULE]-[NNN] : [Titre descriptif du test]

**ID** : TC-[MODULE]-[NNN]
**Priorité** : P0 (Bloquant) | P1 (Critique) | P2 (Majeur) | P3 (Mineur)
**Type** : Fonctionnel | Régression | E2E | Sécurité | Performance | Accessibilité
**Durée estimée** : ~X minutes
**Automatisable** : Oui | Non | Partiel

---

#### Préconditions

> Liste des conditions qui DOIVENT être remplies AVANT de commencer le test.

- [ ] **Environnement** : [Local | Preview | Production]
- [ ] **Utilisateur** : Connecté en tant que `[rôle]` avec email `[email@test.com]`
- [ ] **Données requises** :
  - [ ] [Entité 1] créée avec [caractéristiques spécifiques]
  - [ ] [Entité 2] dans l'état [état spécifique]
- [ ] **État initial** : [Description de l'état de départ]

---

#### Étapes de Test

| # | Action | Données de test | Résultat attendu | Vérification |
|---|--------|-----------------|------------------|--------------|
| 1 | [Verbe d'action] [élément UI] | `[valeur exacte]` | [Ce qui doit se passer] | [ ] |
| 2 | [Verbe d'action] [élément UI] | `[valeur exacte]` | [Ce qui doit se passer] | [ ] |
| 3 | [Verbe d'action] [élément UI] | `[valeur exacte]` | [Ce qui doit se passer] | [ ] |

**Verbes d'action standards** :
- Cliquer, Double-cliquer, Survoler
- Saisir, Sélectionner, Cocher/Décocher
- Attendre, Vérifier, Comparer
- Naviguer vers, Rafraîchir, Retour arrière

---

#### Critères d'Acceptation

> **Format Checklist** (pour tests fonctionnels simples)

- [ ] **CA-1** : [Critère mesurable et vérifiable]
- [ ] **CA-2** : [Critère mesurable et vérifiable]
- [ ] **CA-3** : [Critère mesurable et vérifiable]

> **Format Gherkin** (pour tests E2E complexes) - Voir `test-case-e2e.md`

---

#### Cas d'Erreur à Tester

| Scénario | Action | Message/Comportement attendu | Status |
|----------|--------|------------------------------|--------|
| Champ vide | Soumettre formulaire sans [champ] | Toast erreur : "[message exact]" | [ ] |
| Format invalide | Saisir `[valeur invalide]` dans [champ] | Erreur inline : "[message exact]" | [ ] |
| Timeout réseau | Simuler déconnexion | Toast : "Erreur de connexion" + retry | [ ] |
| Permission refusée | Accéder à [ressource] sans droits | Redirect vers `/auth/unauthorized` | [ ] |

---

#### Données de Test

| Champ | Valeur valide | Valeur invalide | Limite | Notes |
|-------|---------------|-----------------|--------|-------|
| Email | `test@seido.fr` | `invalid`, `@.com` | 255 chars | Format RFC 5322 |
| Nom | `Jean Dupont` | `` (vide) | 100 chars | Requis |
| Téléphone | `0612345678` | `123` | 10-15 chars | Format FR |

---

#### Points de Vérification Supplémentaires

- [ ] **Console** : Pas d'erreurs JavaScript (F12 > Console)
- [ ] **Réseau** : Pas de requêtes 4xx/5xx (F12 > Network)
- [ ] **Performance** : Temps de réponse < [X]ms
- [ ] **Accessibilité** : Navigation clavier possible
- [ ] **Responsive** : Affichage correct sur [Mobile/Tablet/Desktop]

---

#### Résultat du Test

| Critère | Statut | Notes |
|---------|--------|-------|
| **Résultat global** | ✅ PASS / ❌ FAIL / ⚠️ PARTIAL / ⏭️ SKIP | |
| **Bugs détectés** | [Liens vers tickets] | |
| **Testeur** | [Nom] | |
| **Date d'exécution** | [YYYY-MM-DD] | |
| **Environnement** | [Local/Preview/Prod] | |
| **Navigateur** | [Chrome/Firefox/Safari] + version | |

---

#### Tests Automatisés Liés

| Type | Fichier | Ligne | Statut |
|------|---------|-------|--------|
| Unit | `lib/services/__tests__/[service].test.ts` | L[XX] | ✅/❌ |
| E2E | `tests-new/[module]/[test].spec.ts` | L[XX] | ✅/❌ |

---

#### Historique des Modifications

| Date | Auteur | Modification |
|------|--------|--------------|
| [YYYY-MM-DD] | [Nom] | Création initiale |
```

---

## Conventions de Nommage

### ID de Test Case

Format : `TC-[MODULE]-[NNN]`

| Module | Code | Exemple |
|--------|------|---------|
| Authentication | AUTH | TC-AUTH-001 |
| Dashboard | DASH | TC-DASH-001 |
| Interventions | INTV | TC-INTV-001 |
| Biens (Immeubles) | BIEN | TC-BIEN-001 |
| Lots | LOTS | TC-LOTS-001 |
| Contacts | CONT | TC-CONT-001 |
| Devis | DEVI | TC-DEVI-001 |
| Contrats | CTRA | TC-CTRA-001 |
| Notifications | NOTF | TC-NOTF-001 |
| Planning | PLAN | TC-PLAN-001 |
| Import | IMPT | TC-IMPT-001 |
| Sécurité | SECU | TC-SECU-001 |
| Performance | PERF | TC-PERF-001 |
| Accessibilité | A11Y | TC-A11Y-001 |

### Priorités

| Priorité | Description | SLA Correction |
|----------|-------------|----------------|
| **P0** | Bloquant - App inutilisable | Immédiat |
| **P1** | Critique - Fonctionnalité majeure KO | < 24h |
| **P2** | Majeur - Fonctionnalité secondaire KO | < 1 semaine |
| **P3** | Mineur - Cosmétique, amélioration | Backlog |

---

## Bonnes Pratiques

### DO (À faire)

- [ ] Un test = Un objectif (principe KISS)
- [ ] Données de test explicites (pas de "valeur quelconque")
- [ ] Messages d'erreur textuels exacts
- [ ] Préconditions vérifiables
- [ ] Étapes reproductibles par quelqu'un d'autre

### DON'T (À éviter)

- [ ] ❌ "Vérifier que ça marche" → Trop vague
- [ ] ❌ "L'utilisateur voit le bon résultat" → Quel résultat exactement ?
- [ ] ❌ "Données de test : email valide" → Quel email ?
- [ ] ❌ Tests dépendants les uns des autres (sauf E2E explicite)

---

## Exemple Complet

```markdown
### TC-AUTH-001 : Connexion gestionnaire avec credentials valides

**ID** : TC-AUTH-001
**Priorité** : P0 (Bloquant)
**Type** : Fonctionnel
**Durée estimée** : ~2 minutes
**Automatisable** : Oui

---

#### Préconditions

- [ ] **Environnement** : Preview (https://preview.seido.app)
- [ ] **Utilisateur** : Compte gestionnaire existant
- [ ] **Données requises** :
  - [ ] Email : `gestionnaire@test-seido.fr`
  - [ ] Password : `TestSeido2024!`
  - [ ] Compte confirmé (email vérifié)
- [ ] **État initial** : Déconnecté (pas de session active)

---

#### Étapes de Test

| # | Action | Données de test | Résultat attendu | Vérification |
|---|--------|-----------------|------------------|--------------|
| 1 | Naviguer vers `/auth/login` | - | Page login affichée avec formulaire | [ ] |
| 2 | Saisir email | `gestionnaire@test-seido.fr` | Email affiché dans le champ | [ ] |
| 3 | Saisir password | `TestSeido2024!` | Caractères masqués (•••) | [ ] |
| 4 | Cliquer "Se connecter" | - | Bouton affiche spinner + "Connexion..." | [ ] |
| 5 | Attendre redirection | - | URL = `/gestionnaire/dashboard` en < 3s | [ ] |
| 6 | Vérifier dashboard | - | Header affiche "Bonjour [Prénom]" | [ ] |

---

#### Critères d'Acceptation

- [ ] **CA-1** : Le formulaire affiche 2 champs (email, password) + bouton "Se connecter"
- [ ] **CA-2** : Le password est masqué par défaut avec toggle visibility
- [ ] **CA-3** : La redirection vers dashboard se fait en moins de 3 secondes
- [ ] **CA-4** : Le nom de l'utilisateur apparaît dans le header après connexion
- [ ] **CA-5** : Pas d'erreur dans la console navigateur

---

#### Cas d'Erreur à Tester

| Scénario | Action | Message/Comportement attendu | Status |
|----------|--------|------------------------------|--------|
| Email vide | Cliquer "Se connecter" sans email | Erreur : "L'email est requis" | [ ] |
| Email invalide | Saisir `not-an-email` | Erreur : "Format d'email invalide" | [ ] |
| Password vide | Cliquer "Se connecter" sans password | Erreur : "Le mot de passe est requis" | [ ] |
| Credentials incorrects | Saisir `wrong@email.com` + `wrongpass` | Toast : "Email ou mot de passe incorrect" | [ ] |
| Compte non confirmé | Se connecter avec compte non vérifié | Toast : "Veuillez confirmer votre email" | [ ] |

---

#### Tests Automatisés Liés

| Type | Fichier | Ligne | Statut |
|------|---------|-------|--------|
| E2E | `tests-new/performance/navigation.spec.ts` | L45 | ⚠️ Skipped |
```

---

## Références

- [ISTQB Test Case Design](https://www.istqb.org/)
- [IEEE 829 Test Documentation Standard](https://standards.ieee.org/)
- [Cucumber Gherkin Syntax](https://cucumber.io/docs/gherkin/)
