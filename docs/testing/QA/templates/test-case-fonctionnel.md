# Template Test Fonctionnel - SEIDO

> **Version** : 1.0
> **Date** : 2025-12-18
> **Usage** : Pour les tests fonctionnels simples utilisant le format checklist

---

## Format Checklist Enrichi

Ce template est utilisé pour enrichir les items de la checklist fonctionnelle (`01-checklist-fonctionnel.md`).
Chaque test simple devient un bloc structuré avec critères d'acceptation précis.

---

## Structure d'un Test Fonctionnel

```markdown
### [Numéro] [Titre du Test]

| Attribut | Valeur |
|----------|--------|
| **ID** | TC-[MODULE]-[NNN] |
| **Priorité** | P0/P1/P2/P3 |
| **Rôle** | [Gestionnaire/Prestataire/Locataire/Admin] |
| **Page** | `[URL de la page]` |

#### Préconditions
- [ ] [Condition 1 - spécifique et vérifiable]
- [ ] [Condition 2]

#### Critères d'Acceptation
- [ ] **CA-1** : [Critère mesurable]
- [ ] **CA-2** : [Critère mesurable]
- [ ] **CA-3** : [Critère mesurable]

#### Données de Test
| Champ | Valeur | Notes |
|-------|--------|-------|
| [champ] | `[valeur]` | [info] |

#### Cas d'Erreur
| Scénario | Résultat attendu |
|----------|------------------|
| [cas erreur] | [message/comportement] |

#### Statut : ☐
```

---

## Exemple Complet : Page Login

### Avant (trop vague)
```markdown
| # | Test | Status |
|---|------|--------|
| 1.2.1 | Formulaire email/password visible | ☐ |
| 1.2.2 | Validation email format | ☐ |
| 1.2.3 | Validation password requis | ☐ |
```

### Après (critères précis)

---

### 1.2.1 Formulaire de connexion visible

| Attribut | Valeur |
|----------|--------|
| **ID** | TC-AUTH-001 |
| **Priorité** | P0 |
| **Rôle** | Tous |
| **Page** | `/auth/login` |

#### Préconditions
- [ ] Utilisateur non connecté (pas de session active)
- [ ] Navigateur : Chrome 120+ ou Firefox 120+ ou Safari 17+

#### Critères d'Acceptation
- [ ] **CA-1** : Le titre "Connexion" ou "Se connecter" est visible en haut de la page
- [ ] **CA-2** : Un champ email avec label "Email" ou "Adresse email" est présent
- [ ] **CA-3** : Un champ password avec label "Mot de passe" est présent (masqué par défaut)
- [ ] **CA-4** : Un bouton "Se connecter" est visible et cliquable
- [ ] **CA-5** : Un lien "Mot de passe oublié ?" est visible sous le formulaire
- [ ] **CA-6** : Un lien "Créer un compte" ou "S'inscrire" est visible
- [ ] **CA-7** : Le logo SEIDO est affiché en haut du formulaire

#### Vérifications Techniques
- [ ] Pas d'erreur dans la console (F12)
- [ ] Temps de chargement < 2s
- [ ] Formulaire accessible au clavier (Tab navigation)

#### Statut : ☐

---

### 1.2.2 Validation format email

| Attribut | Valeur |
|----------|--------|
| **ID** | TC-AUTH-002 |
| **Priorité** | P1 |
| **Rôle** | Tous |
| **Page** | `/auth/login` |

#### Préconditions
- [ ] Page login chargée
- [ ] Champ email visible

#### Critères d'Acceptation
- [ ] **CA-1** : Email valide `test@seido.fr` est accepté (pas d'erreur affichée)
- [ ] **CA-2** : Email invalide `test@` affiche erreur "Format d'email invalide"
- [ ] **CA-3** : Email invalide `@seido.fr` affiche erreur "Format d'email invalide"
- [ ] **CA-4** : Email invalide `test` (sans @) affiche erreur "Format d'email invalide"
- [ ] **CA-5** : Champ vide + blur affiche "L'email est requis"
- [ ] **CA-6** : L'erreur disparaît quand l'email devient valide

#### Données de Test
| Entrée | Type | Résultat attendu |
|--------|------|------------------|
| `gestionnaire@seido.fr` | Valide | Aucune erreur |
| `user.name+tag@example.com` | Valide | Aucune erreur |
| `test@` | Invalide | "Format d'email invalide" |
| `@domain.com` | Invalide | "Format d'email invalide" |
| `test` | Invalide | "Format d'email invalide" |
| `` (vide) | Invalide | "L'email est requis" |
| `a@b.c` | Valide (court) | Aucune erreur |

#### Statut : ☐

---

### 1.2.3 Validation mot de passe requis

| Attribut | Valeur |
|----------|--------|
| **ID** | TC-AUTH-003 |
| **Priorité** | P1 |
| **Rôle** | Tous |
| **Page** | `/auth/login` |

#### Préconditions
- [ ] Page login chargée
- [ ] Email valide saisi

#### Critères d'Acceptation
- [ ] **CA-1** : Le champ password est de type `password` (caractères masqués)
- [ ] **CA-2** : Un bouton toggle (oeil) permet d'afficher/masquer le password
- [ ] **CA-3** : Password vide + clic sur "Se connecter" → erreur "Le mot de passe est requis"
- [ ] **CA-4** : L'erreur s'affiche sous le champ password (couleur rouge #dc2626)
- [ ] **CA-5** : Le bouton "Se connecter" reste actif mais la validation empêche la soumission

#### Données de Test
| Entrée | Résultat attendu |
|--------|------------------|
| `` (vide) | "Le mot de passe est requis" |
| `a` | Aucune erreur de validation format |
| `TestSeido2024!` | Aucune erreur |

#### Statut : ☐

---

## Exemples par Module

### Dashboard Gestionnaire

---

### 2.1.1 KPIs Dashboard visibles

| Attribut | Valeur |
|----------|--------|
| **ID** | TC-DASH-001 |
| **Priorité** | P0 |
| **Rôle** | Gestionnaire |
| **Page** | `/gestionnaire/dashboard` |

#### Préconditions
- [ ] Connecté en tant que gestionnaire (`gestionnaire@test-seido.fr`)
- [ ] Le gestionnaire a au moins 1 bien et 1 intervention

#### Critères d'Acceptation
- [ ] **CA-1** : KPI "Interventions en cours" affiche un nombre ≥ 0
- [ ] **CA-2** : KPI "Biens gérés" affiche le nombre total d'immeubles + lots
- [ ] **CA-3** : KPI "Interventions urgentes" affiche un nombre avec badge rouge si > 0
- [ ] **CA-4** : KPI "À traiter" affiche les interventions en attente d'action
- [ ] **CA-5** : Chaque KPI est cliquable et redirige vers la liste filtrée correspondante
- [ ] **CA-6** : Les valeurs se mettent à jour en temps réel (Realtime activé)

#### Données de Test
| État initial | KPI attendu |
|--------------|-------------|
| 0 biens | "Biens gérés : 0" |
| 3 interventions en cours | "Interventions en cours : 3" |
| 1 urgente | Badge rouge "1" sur "Urgentes" |

#### Statut : ☐

---

### Création d'Immeuble

---

### 2.3.1 Formulaire multi-étapes création immeuble

| Attribut | Valeur |
|----------|--------|
| **ID** | TC-BIEN-001 |
| **Priorité** | P1 |
| **Rôle** | Gestionnaire |
| **Page** | `/gestionnaire/biens/immeubles/nouveau` |

#### Préconditions
- [ ] Connecté en tant que gestionnaire
- [ ] Navigué vers "Biens" > "Nouveau" > "Immeuble"

#### Critères d'Acceptation
- [ ] **CA-1** : Un stepper/wizard affiche 4 étapes : "Informations", "Adresse", "Contacts", "Documents"
- [ ] **CA-2** : L'étape 1 "Informations" est active par défaut (indicateur bleu/primaire)
- [ ] **CA-3** : Les étapes 2, 3, 4 sont grisées (non accessibles directement)
- [ ] **CA-4** : Le bouton "Suivant" est visible en bas à droite
- [ ] **CA-5** : Le bouton "Précédent" est masqué sur l'étape 1
- [ ] **CA-6** : Le bouton "Annuler" est visible et permet de quitter le formulaire
- [ ] **CA-7** : La progression est affichée (ex: "Étape 1 sur 4")

#### Éléments UI Attendus
```
┌─────────────────────────────────────────────────┐
│  Logo SEIDO          [Annuler]                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  [1]───[2]───[3]───[4]                         │
│   ●     ○     ○     ○                          │
│  Info  Adr.  Cont. Docs                        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Nom de l'immeuble *                    │   │
│  │  [________________________]             │   │
│  │                                         │   │
│  │  Description                            │   │
│  │  [________________________]             │   │
│  │  [________________________]             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│                           [Suivant →]          │
└─────────────────────────────────────────────────┘
```

#### Statut : ☐

---

### 2.3.6 Validation à chaque étape

| Attribut | Valeur |
|----------|--------|
| **ID** | TC-BIEN-006 |
| **Priorité** | P1 |
| **Rôle** | Gestionnaire |
| **Page** | `/gestionnaire/biens/immeubles/nouveau` |

#### Préconditions
- [ ] Sur la page de création d'immeuble
- [ ] Étape 1 active

#### Critères d'Acceptation - Étape 1 (Informations)
- [ ] **CA-1** : Champ "Nom" obligatoire - sans valeur → erreur "Le nom est requis"
- [ ] **CA-2** : Nom minimum 2 caractères → erreur "Minimum 2 caractères"
- [ ] **CA-3** : Nom maximum 100 caractères (compteur visible si > 80)
- [ ] **CA-4** : Description optionnelle (pas d'erreur si vide)
- [ ] **CA-5** : Bouton "Suivant" déclenche la validation avant passage étape 2

#### Critères d'Acceptation - Étape 2 (Adresse)
- [ ] **CA-6** : Champ "Adresse" obligatoire avec autocomplétion (Google Places ou similaire)
- [ ] **CA-7** : Code postal validé (5 chiffres pour France)
- [ ] **CA-8** : Ville obligatoire
- [ ] **CA-9** : Pays par défaut "France"

#### Critères d'Acceptation - Étape 3 (Contacts)
- [ ] **CA-10** : Au moins 1 contact gestionnaire requis (peut être soi-même)
- [ ] **CA-11** : Possibilité d'ajouter contact existant ou nouveau
- [ ] **CA-12** : Validation email si nouveau contact

#### Critères d'Acceptation - Étape 4 (Documents)
- [ ] **CA-13** : Étape optionnelle (peut être vide)
- [ ] **CA-14** : Formats acceptés : PDF, JPG, PNG, WEBP
- [ ] **CA-15** : Taille max par fichier : 10MB
- [ ] **CA-16** : Nombre max de fichiers : 10

#### Données de Test par Étape

**Étape 1 - Informations**
| Champ | Valeur valide | Valeur invalide |
|-------|---------------|-----------------|
| Nom | `Résidence Les Lilas` | `` (vide), `A` (1 char) |
| Description | `Immeuble 1960, 4 étages` | - (optionnel) |

**Étape 2 - Adresse**
| Champ | Valeur valide | Valeur invalide |
|-------|---------------|-----------------|
| Adresse | `12 rue de la Paix` | `` (vide) |
| Code postal | `75001` | `7500` (4 chiffres), `ABCDE` |
| Ville | `Paris` | `` (vide) |

#### Statut : ☐

---

## Guide de Rédaction

### Verbes d'Action Standards

| Catégorie | Verbes |
|-----------|--------|
| **Affichage** | est visible, s'affiche, apparaît, est présent |
| **Masquage** | est masqué, disparaît, est absent, n'apparaît pas |
| **Interaction** | est cliquable, est sélectionnable, est modifiable |
| **Validation** | est accepté, est rejeté, affiche erreur |
| **Navigation** | redirige vers, ouvre, navigue vers |
| **État** | est activé, est désactivé, est grisé |

### Formulation des Critères

| ❌ Vague | ✅ Précis |
|----------|----------|
| Le bouton marche | Le bouton "Créer" redirige vers `/dashboard` |
| L'erreur s'affiche | L'erreur "Email invalide" s'affiche en rouge sous le champ |
| Les données sont bonnes | Le KPI affiche "12 interventions" |
| La page charge vite | La page charge en moins de 2 secondes (LCP < 2s) |

### Codes Couleur Standards SEIDO

| Élément | Couleur | Code |
|---------|---------|------|
| Erreur / Danger | Rouge | `#dc2626` |
| Succès | Vert | `#16a34a` |
| Warning | Orange | `#f59e0b` |
| Info | Bleu | `#3b82f6` |
| Primaire | Bleu SEIDO | Variable CSS `--primary` |
| Texte désactivé | Gris | `#9ca3af` |

---

## Checklist de Validation Rapide

Avant de considérer un test comme "PASS", vérifier :

- [ ] Tous les critères d'acceptation sont cochés
- [ ] Pas d'erreur console (F12 > Console)
- [ ] Responsive testé (Desktop + Mobile)
- [ ] Navigation clavier possible
- [ ] Temps de chargement acceptable (< 3s)

---

## Références

- [Design System SEIDO](/docs/design/design-system/)
- [Glossaire Terminologie](/docs/testing/QA/12-glossaire.md)
- [Données de Test](/docs/testing/QA/11-donnees-test.md)
