# Checklist Fonctionnel - SEIDO

> **Version** : 2.0 (enrichie avec critères d'acceptation)
> **Date** : 2025-12-18
> **Objectif** : Tester exhaustivement chaque page et fonctionnalité de l'application
> **Notation** : ✅ OK | ❌ Bug | ⚠️ À améliorer | ⏭️ Non applicable

---

## Références

- **Données de test** : [11-donnees-test.md](./11-donnees-test.md)
- **Glossaire** : [12-glossaire.md](./12-glossaire.md)
- **Templates** : [templates/](./templates/)

---

## Instructions Générales

### Vérifications Systématiques par Page

Pour **chaque page**, vérifier :

| # | Vérification | Critère d'acceptation |
|---|--------------|----------------------|
| ☐ | Console | Aucune erreur rouge dans F12 > Console |
| ☐ | Données | Les données correspondent à l'utilisateur connecté |
| ☐ | Actions | Tous les boutons/liens répondent au clic |
| ☐ | État vide | Message "Aucun [élément]" si liste vide |
| ☐ | État erreur | Toast rouge avec message explicite si erreur |
| ☐ | Loading | Skeleton ou spinner pendant chargement |
| ☐ | Mobile 375px | Layout adapté, pas de scroll horizontal |
| ☐ | Tablet 768px | Layout adapté |
| ☐ | Desktop 1440px | Contenu centré, pas de stretching excessif |

---

## 1. Pages Publiques (14 pages)

### 1.1 Landing Page `/`

**Préconditions** : Utilisateur non connecté

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.1.1 | Header visible avec logo SEIDO | ☐ | |
| 1.1.2 | Navigation vers login/signup | ☐ | |
| 1.1.3 | Sections de présentation | ☐ | |
| 1.1.4 | CTA (Call to Action) fonctionnel | ☐ | |
| 1.1.5 | Footer avec liens légaux | ☐ | |
| 1.1.6 | Responsive mobile | ☐ | |
| 1.1.7 | Performance (LCP < 3s) | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**1.1.1 Header visible avec logo SEIDO**
- [ ] Logo SEIDO visible en haut à gauche
- [ ] Logo cliquable, redirige vers `/`
- [ ] Taille logo adaptée mobile/desktop

**1.1.2 Navigation vers login/signup**
- [ ] Bouton "Se connecter" visible en haut à droite
- [ ] Bouton "S'inscrire" ou "Commencer" visible
- [ ] Clic "Se connecter" → `/auth/login`
- [ ] Clic "S'inscrire" → `/auth/signup`

**1.1.3 Sections de présentation**
- [ ] Section Hero avec titre et sous-titre
- [ ] Section fonctionnalités (au moins 3)
- [ ] Section avantages ou témoignages
- [ ] Contenu lisible, pas de lorem ipsum

**1.1.4 CTA fonctionnel**
- [ ] Bouton CTA principal visible (ex: "Essayer gratuitement")
- [ ] Clic CTA → `/auth/signup` ou modale
- [ ] Style distinct (couleur primaire)

**1.1.5 Footer avec liens légaux**
- [ ] Lien "CGU" ou "Conditions" → `/terms`
- [ ] Lien "Confidentialité" → `/privacy`
- [ ] Copyright © 2025 SEIDO visible
- [ ] Liens fonctionnels (pas 404)

**1.1.6 Responsive mobile**
- [ ] Menu burger sur mobile (< 768px)
- [ ] Textes lisibles sans zoom
- [ ] Images adaptées
- [ ] Pas de scroll horizontal

**1.1.7 Performance**
- [ ] LCP (Largest Contentful Paint) < 3s
- [ ] Mesurer avec DevTools > Lighthouse
- [ ] Score Performance > 70

</details>

---

### 1.2 Login `/auth/login`

**Préconditions** : Utilisateur non connecté
**Compte de test** : `gestionnaire@test-seido.fr` / `TestSeido2024!`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.2.1 | Formulaire email/password visible | ☐ | |
| 1.2.2 | Validation email format | ☐ | |
| 1.2.3 | Validation password requis | ☐ | |
| 1.2.4 | Bouton désactivé si invalide | ☐ | |
| 1.2.5 | Loading state pendant connexion | ☐ | |
| 1.2.6 | Erreur si credentials invalides | ☐ | |
| 1.2.7 | Redirection après login réussi | ☐ | |
| 1.2.8 | Lien "Mot de passe oublié" | ☐ | |
| 1.2.9 | Lien vers inscription | ☐ | |
| 1.2.10 | Remember me (si présent) | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**1.2.1 Formulaire visible**
- [ ] Titre "Connexion" ou "Se connecter"
- [ ] Champ email avec label "Email" ou "Adresse email"
- [ ] Champ password avec label "Mot de passe"
- [ ] Bouton "Se connecter"
- [ ] Champ password masqué par défaut (●●●●●)

**1.2.2 Validation email format**
| Entrée | Résultat |
|--------|----------|
| `test@seido.fr` | Valide (pas d'erreur) |
| `test@` | Erreur : "Format d'email invalide" |
| `@domain.com` | Erreur : "Format d'email invalide" |
| `test` | Erreur : "Format d'email invalide" |
| `` (vide) | Erreur : "L'email est requis" |

**1.2.3 Validation password requis**
- [ ] Password vide + submit → "Le mot de passe est requis"
- [ ] Erreur affichée sous le champ (rouge)

**1.2.4 Bouton désactivé si invalide**
- [ ] Bouton grisé si email ou password invalide
- [ ] OU bouton actif mais validation au submit

**1.2.5 Loading state**
- [ ] Clic "Se connecter" → bouton affiche spinner
- [ ] Texte change en "Connexion..." ou spinner seul
- [ ] Formulaire non modifiable pendant loading

**1.2.6 Erreur credentials invalides**
- [ ] Email `wrong@email.com` + password `wrong`
- [ ] Toast ou message : "Email ou mot de passe incorrect"
- [ ] Couleur rouge
- [ ] Formulaire reste accessible pour réessayer

**1.2.7 Redirection après login réussi**
- [ ] Email `gestionnaire@test-seido.fr` + password `TestSeido2024!`
- [ ] Redirection vers `/gestionnaire/dashboard`
- [ ] Temps < 3 secondes
- [ ] Sidebar navigation visible après redirect

**1.2.8 Lien "Mot de passe oublié"**
- [ ] Lien visible sous le formulaire
- [ ] Clic → `/auth/reset-password`

**1.2.9 Lien vers inscription**
- [ ] Texte "Pas encore de compte ?" ou similaire
- [ ] Lien "S'inscrire" → `/auth/signup`

</details>

---

### 1.3 Signup `/auth/signup`

**Préconditions** : Utilisateur non connecté

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.3.1 | Formulaire complet | ☐ | |
| 1.3.2 | Validation email format | ☐ | |
| 1.3.3 | Validation force password | ☐ | |
| 1.3.4 | Confirmation password match | ☐ | |
| 1.3.5 | Sélection du rôle | ☐ | |
| 1.3.6 | CGU/Confidentialité checkbox | ☐ | |
| 1.3.7 | Message succès après inscription | ☐ | |
| 1.3.8 | Email de confirmation envoyé | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**1.3.1 Formulaire complet**
- [ ] Champ "Prénom" (optionnel ou requis)
- [ ] Champ "Nom" (optionnel ou requis)
- [ ] Champ "Email" (requis)
- [ ] Champ "Mot de passe" (requis)
- [ ] Champ "Confirmer mot de passe" (requis)

**1.3.3 Validation force password**
- [ ] Minimum 8 caractères → sinon erreur
- [ ] Au moins 1 majuscule → sinon erreur
- [ ] Au moins 1 minuscule → sinon erreur
- [ ] Au moins 1 chiffre → sinon erreur
- [ ] Au moins 1 caractère spécial → sinon erreur (optionnel)
- [ ] Indicateur de force visuel (faible/moyen/fort)

**1.3.4 Confirmation password match**
- [ ] Password ≠ Confirmation → "Les mots de passe ne correspondent pas"
- [ ] Erreur affichée immédiatement ou au blur

**1.3.5 Sélection du rôle**
- [ ] Options : Gestionnaire, Prestataire, Locataire
- [ ] OU assignation automatique

**1.3.6 CGU checkbox**
- [ ] Checkbox "J'accepte les CGU et la politique de confidentialité"
- [ ] Liens vers `/terms` et `/privacy`
- [ ] Submit impossible sans cocher

**1.3.7 Message succès**
- [ ] Après submit → message "Inscription réussie"
- [ ] OU redirection vers `/auth/signup-success`

**1.3.8 Email confirmation**
- [ ] Email reçu dans la boîte de l'utilisateur
- [ ] Email contient lien de confirmation
- [ ] Lien expire après 24h (ou durée configurée)

</details>

---

### 1.4-1.13 Autres Pages Auth

| Page | Tests rapides | Status |
|------|---------------|--------|
| **1.4 Reset Password** `/auth/reset-password` | Champ email, validation, message envoi | ☐ |
| **1.5 Set Password** `/auth/set-password` | Nouveaux champs password, validation, succès | ☐ |
| **1.6 CGU** `/terms` | Contenu lisible, formaté, navigation retour | ☐ |
| **1.7 Privacy** `/privacy` | Contenu lisible, formaté, navigation retour | ☐ |
| **1.8 Signup Success** `/auth/signup-success` | Message confirmation, instructions email | ☐ |
| **1.9 Logout** `/auth/logout` | Déconnexion effective, session terminée, redirect login | ☐ |
| **1.10 Beta Thank You** `/auth/beta-thank-you` | Message remerciement | ☐ |
| **1.11 Callback** `/auth/callback` | Gestion OAuth, redirect approprié | ☐ |
| **1.12 Confirm** `/auth/confirm` | Confirmation email OK, redirect dashboard | ☐ |
| **1.13 Error** `/auth/error` | Message erreur clair, lien retour login | ☐ |
| **1.14 Unauthorized** `/auth/unauthorized` | Message accès refusé, lien dashboard autorisé | ☐ |

---

## 2. Gestionnaire (27 pages)

### 2.1 Dashboard `/gestionnaire/dashboard`

**Préconditions** :
- Connecté comme `gestionnaire@test-seido.fr`
- Au moins 1 immeuble, 1 lot, 1 intervention existants

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.1.1 | KPIs visibles | ☐ | |
| 2.1.2 | Interventions urgentes en évidence | ☐ | |
| 2.1.3 | Actions rapides accessibles | ☐ | |
| 2.1.4 | Navigation vers sections | ☐ | |
| 2.1.5 | Données correctement calculées | ☐ | |
| 2.1.6 | Refresh des données | ☐ | |
| 2.1.7 | Graphiques/stats | ☐ | |
| 2.1.8 | Notifications badge | ☐ | |
| 2.1.9 | Performance < 3s | ☐ | |
| 2.1.10 | Responsive mobile | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.1.1 KPIs visibles**
- [ ] KPI "Interventions en cours" : nombre ≥ 0
- [ ] KPI "Biens gérés" : nombre total immeubles + lots
- [ ] KPI "Urgentes" : nombre avec badge rouge si > 0
- [ ] KPI "À traiter" : interventions en attente d'action
- [ ] Chaque KPI cliquable → liste filtrée

**2.1.2 Interventions urgentes**
- [ ] Section "Urgences" visible si urgentes > 0
- [ ] Liste des 3-5 premières urgences
- [ ] Badge rouge sur chaque carte urgente
- [ ] Clic → détail intervention

**2.1.3 Actions rapides**
- [ ] Bouton "Nouvelle intervention"
- [ ] Bouton "Nouveau bien" ou raccourci
- [ ] Boutons visibles, accessibles en < 2 clics

**2.1.4 Navigation sections**
- [ ] Clic KPI "Interventions" → `/gestionnaire/interventions`
- [ ] Clic KPI "Biens" → `/gestionnaire/biens`
- [ ] Sidebar fonctionnelle

**2.1.5 Données calculées**
- [ ] Nombres cohérents avec les listes réelles
- [ ] Pas de données obsolètes (cache invalidé)

**2.1.6 Refresh**
- [ ] Pull-to-refresh sur mobile OU bouton refresh
- [ ] Données mises à jour après action

**2.1.8 Notifications badge**
- [ ] Badge rouge sur icône notifications si > 0 non lues
- [ ] Nombre affiché (ex: "5")
- [ ] Clic → `/gestionnaire/notifications`

**2.1.9 Performance**
- [ ] Page charge en < 3s
- [ ] Pas de freeze pendant chargement initial

</details>

---

### 2.2 Biens - Liste `/gestionnaire/biens`

**Préconditions** : Connecté gestionnaire, données de test présentes

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.2.1 | Liste immeubles visible | ☐ | |
| 2.2.2 | Liste lots visible | ☐ | |
| 2.2.3 | Tabs/filtres fonctionnels | ☐ | |
| 2.2.4 | Recherche fonctionnelle | ☐ | |
| 2.2.5 | Tri par colonnes | ☐ | |
| 2.2.6 | Pagination | ☐ | |
| 2.2.7 | Bouton "Nouveau bien" | ☐ | |
| 2.2.8 | Click sur item → détail | ☐ | |
| 2.2.9 | État vide | ☐ | |
| 2.2.10 | Actions rapides | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.2.1 Liste immeubles**
- [ ] Tableau ou grille d'immeubles
- [ ] Colonnes : Nom, Adresse, Nombre de lots
- [ ] Au moins IMM-001 "Résidence Les Lilas" visible

**2.2.3 Tabs/filtres**
- [ ] Tab "Immeubles" / Tab "Lots"
- [ ] Filtre par catégorie de lot (appartement, garage, etc.)
- [ ] Filtre appliqué → liste mise à jour

**2.2.4 Recherche**
- [ ] Champ recherche visible
- [ ] Taper "Lilas" → filtre sur "Résidence Les Lilas"
- [ ] Recherche case-insensitive
- [ ] Résultats en < 500ms

**2.2.7 Bouton "Nouveau bien"**
- [ ] Bouton visible en haut de page
- [ ] Clic → menu ou `/gestionnaire/biens/immeubles/nouveau`

**2.2.9 État vide**
- [ ] Si 0 biens → message "Aucun bien"
- [ ] Bouton "Ajouter votre premier bien"

</details>

---

### 2.3 Immeubles - Nouveau `/gestionnaire/biens/immeubles/nouveau`

**Préconditions** : Connecté gestionnaire

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.3.1 | Formulaire multi-étapes visible | ☐ | |
| 2.3.2 | Step 1: Informations générales | ☐ | |
| 2.3.3 | Step 2: Adresse | ☐ | |
| 2.3.4 | Step 3: Contacts | ☐ | |
| 2.3.5 | Step 4: Documents | ☐ | |
| 2.3.6 | Validation chaque étape | ☐ | |
| 2.3.7 | Navigation précédent/suivant | ☐ | |
| 2.3.8 | Preview avant création | ☐ | |
| 2.3.9 | Création réussie → redirection | ☐ | |
| 2.3.10 | Toast confirmation | ☐ | |
| 2.3.11 | Gestion erreurs serveur | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.3.1 Formulaire multi-étapes**
- [ ] Stepper visible avec 4 étapes : "Informations", "Adresse", "Contacts", "Documents"
- [ ] Étape 1 active par défaut (indicateur bleu)
- [ ] Étapes 2-4 grisées (non cliquables directement)
- [ ] Progression "Étape 1 sur 4" visible

**2.3.2 Step 1: Informations**
- [ ] Champ "Nom de l'immeuble" (requis)
- [ ] Champ "Description" (optionnel)
- [ ] Validation : nom minimum 2 caractères

**Données de test Step 1 :**
| Champ | Valeur |
|-------|--------|
| Nom | `Immeuble Test QA` |
| Description | `Créé pour tests QA` |

**2.3.3 Step 2: Adresse**
- [ ] Champ "Adresse" (requis) avec autocomplétion
- [ ] Champ "Code postal" (requis, 5 chiffres)
- [ ] Champ "Ville" (requis)
- [ ] Champ "Pays" (défaut: France)

**Données de test Step 2 :**
| Champ | Valeur |
|-------|--------|
| Adresse | `99 rue du Test` |
| Code postal | `75001` |
| Ville | `Paris` |

**2.3.6 Validation chaque étape**
- [ ] Bouton "Suivant" déclenche validation
- [ ] Erreurs affichées sous les champs
- [ ] Impossible de passer à l'étape suivante si erreur

**Cas d'erreur Step 1 :**
| Entrée | Résultat |
|--------|----------|
| Nom vide | "Le nom est requis" |
| Nom = "A" | "Minimum 2 caractères" |

**2.3.7 Navigation précédent/suivant**
- [ ] Bouton "Suivant" visible (sauf dernière étape)
- [ ] Bouton "Précédent" visible (sauf première étape)
- [ ] Données conservées lors du retour arrière

**2.3.9 Création réussie**
- [ ] Bouton "Créer" sur dernière étape
- [ ] Clic → spinner + "Création en cours..."
- [ ] Succès → redirect vers `/gestionnaire/biens/immeubles/[id]`
- [ ] Temps < 3 secondes

**2.3.10 Toast confirmation**
- [ ] Toast vert "Immeuble créé avec succès"
- [ ] Auto-dismiss après 5 secondes

**2.3.11 Erreurs serveur**
- [ ] Si erreur 500 → toast rouge "Une erreur est survenue"
- [ ] Formulaire reste accessible pour réessayer

</details>

---

### 2.4-2.8 Autres Pages Biens

| Page | Tests clés | Status |
|------|------------|--------|
| **2.4 Immeuble Détail** `/gestionnaire/biens/immeubles/[id]` | Header nom, breadcrumb, infos, lots, contacts, documents, bouton modifier | ☐ |
| **2.5 Immeuble Modifier** `/gestionnaire/biens/immeubles/modifier/[id]` | Pré-remplissage, modification, sauvegarde, toast | ☐ |
| **2.6 Lot Nouveau** `/gestionnaire/biens/lots/nouveau` | Sélection immeuble parent, infos lot, catégorie, création | ☐ |
| **2.7 Lot Détail** `/gestionnaire/biens/lots/[id]` | Header, lien immeuble parent, locataire actuel, interventions | ☐ |
| **2.8 Lot Modifier** `/gestionnaire/biens/lots/modifier/[id]` | Pré-remplissage, modification, sauvegarde | ☐ |

---

### 2.9 Contacts - Liste `/gestionnaire/contacts`

**Préconditions** : Connecté gestionnaire, contacts de test présents

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.9.1 | Liste contacts visible | ☐ | |
| 2.9.2 | Liste sociétés visible | ☐ | |
| 2.9.3 | Tabs contacts/sociétés | ☐ | |
| 2.9.4 | Filtres par type | ☐ | |
| 2.9.5 | Recherche par nom/email | ☐ | |
| 2.9.6 | Bouton "Nouveau contact" | ☐ | |
| 2.9.7 | Click → détail contact | ☐ | |
| 2.9.8 | Badge statut invitation | ☐ | |
| 2.9.9 | Actions rapides | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.9.4 Filtres par type**
- [ ] Options : Tous, Locataires, Prestataires, Propriétaires
- [ ] Sélection "Prestataires" → liste filtrée
- [ ] Compteur par type visible

**2.9.5 Recherche**
- [ ] Taper "Dupont" → filtre contacts avec "Dupont"
- [ ] Taper "plomberie" → filtre prestataires plomberie
- [ ] Case-insensitive

**2.9.8 Badge statut invitation**
- [ ] Badge "En attente" (orange) si invitation pending
- [ ] Badge "Acceptée" (vert) si invitation accepted
- [ ] Pas de badge si utilisateur actif sans invitation

</details>

---

### 2.10-2.14 Autres Pages Contacts

| Page | Tests clés | Status |
|------|------------|--------|
| **2.10 Contact Nouveau** | Type contact, infos, rôle, option invitation | ☐ |
| **2.11 Contact Détail** | Header, infos, biens associés, statut invitation | ☐ |
| **2.12 Contact Modifier** | Pré-remplissage, modification, sauvegarde | ☐ |
| **2.13 Société Détail** | Infos société, contacts associés | ☐ |
| **2.14 Société Modifier** | Modification infos société | ☐ |

---

### 2.15 Contrats - Liste `/gestionnaire/contrats`

**Préconditions** : Connecté gestionnaire, contrats de test présents

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.15.1 | Liste contrats visible | ☐ | |
| 2.15.2 | Filtre par statut (actif/expiré/à venir) | ☐ | |
| 2.15.3 | Recherche par locataire | ☐ | |
| 2.15.4 | Recherche par lot/immeuble | ☐ | |
| 2.15.5 | Badge statut coloré | ☐ | |
| 2.15.6 | Badge "Expire bientôt" (< 30j) | ☐ | |
| 2.15.7 | Tri par date début/fin | ☐ | |
| 2.15.8 | Bouton "Nouveau contrat" | ☐ | |
| 2.15.9 | Click → détail contrat | ☐ | |
| 2.15.10 | Pagination | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.15.2 Filtre par statut**
| Statut | Badge | Description |
|--------|-------|-------------|
| `actif` | Vert | Date début passée et date fin future |
| `expire` | Rouge | Date fin passée |
| `a_venir` | Bleu | Date début future |
| `resilie` | Gris | Contrat annulé manuellement |

**2.15.6 Badge "Expire bientôt"**
- [ ] Badge orange si expiration < 30 jours
- [ ] Badge rouge si expiration < 7 jours
- [ ] Tooltip avec date exacte d'expiration

</details>

---

### 2.16 Contrat - Nouveau `/gestionnaire/contrats/nouveau`

**Préconditions** :
- Connecté gestionnaire
- Au moins 1 lot disponible
- Au moins 1 contact type "locataire"

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.16.1 | Sélection lot (dropdown recherche) | ☐ | |
| 2.16.2 | Sélection locataire existant | ☐ | |
| 2.16.3 | Création locataire à la volée | ☐ | |
| 2.16.4 | Date de début (obligatoire) | ☐ | |
| 2.16.5 | Date de fin (optionnelle) | ☐ | |
| 2.16.6 | Montant loyer HT | ☐ | |
| 2.16.7 | Montant charges | ☐ | |
| 2.16.8 | Montant total affiché | ☐ | |
| 2.16.9 | Dépôt de garantie | ☐ | |
| 2.16.10 | Type de contrat (bail habitation, commercial, etc.) | ☐ | |
| 2.16.11 | Upload document contrat (PDF) | ☐ | |
| 2.16.12 | Notes/commentaires | ☐ | |
| 2.16.13 | Validation formulaire | ☐ | |
| 2.16.14 | Création réussie → redirect détail | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.16.1 Sélection lot**
- [ ] Dropdown avec recherche par nom/référence
- [ ] Affichage : "Référence - Immeuble (Adresse)"
- [ ] Lots déjà sous contrat actif grisés (ou warning)

**2.16.2 Sélection locataire**
- [ ] Dropdown avec contacts de type "locataire"
- [ ] Affichage : "Nom - Email"
- [ ] Option "Créer nouveau locataire"

**2.16.8 Montant total affiché**
- [ ] Calcul automatique : loyer HT + charges
- [ ] Affichage en temps réel

**Données de test :**
| Champ | Valeur valide |
|-------|---------------|
| Lot | `APT-101 - Résidence Les Lilas` |
| Locataire | `Jean Dupont (jean@test.fr)` |
| Date début | `01/01/2025` |
| Date fin | `31/12/2025` |
| Loyer HT | `800 €` |
| Charges | `100 €` |
| Dépôt garantie | `900 €` |

**Tests négatifs :**
| Test | Résultat attendu |
|------|------------------|
| Lot non sélectionné | "Le lot est requis" |
| Locataire non sélectionné | "Le locataire est requis" |
| Date début vide | "La date de début est requise" |
| Date fin < date début | "La date de fin doit être après la date de début" |
| Loyer négatif | "Le montant doit être positif" |

</details>

---

### 2.17 Contrat - Détail `/gestionnaire/contrats/[id]`

**Préconditions** : Contrat de test existant

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.17.1 | Header avec statut badge | ☐ | |
| 2.17.2 | Informations locataire (nom, email, téléphone) | ☐ | |
| 2.17.3 | Lien vers fiche locataire | ☐ | |
| 2.17.4 | Informations lot (référence, immeuble, adresse) | ☐ | |
| 2.17.5 | Lien vers fiche lot | ☐ | |
| 2.17.6 | Détails financiers (loyer, charges, total, dépôt) | ☐ | |
| 2.17.7 | Dates du contrat | ☐ | |
| 2.17.8 | Documents attachés | ☐ | |
| 2.17.9 | Téléchargement document | ☐ | |
| 2.17.10 | Historique modifications | ☐ | |
| 2.17.11 | Bouton "Modifier" | ☐ | |
| 2.17.12 | Bouton "Résilier" | ☐ | |
| 2.17.13 | Warning si expire bientôt | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.17.1 Header avec statut**
- [ ] Titre : "Contrat - [Référence lot]"
- [ ] Badge statut (Actif/Expiré/À venir)
- [ ] Date de création

**2.17.12 Bouton "Résilier"**
- [ ] Dialog de confirmation avec motif obligatoire
- [ ] Options : "Résiliation amiable", "Résiliation pour impayés", "Autre"
- [ ] Date de résiliation effective
- [ ] Envoi notification au locataire (optionnel)

**2.17.13 Warning expiration**
- [ ] Bandeau warning si < 30 jours
- [ ] Message : "Ce contrat expire le [date]. Pensez à le renouveler."
- [ ] Bouton "Créer nouveau contrat" (reconduction)

</details>

---

### 2.18 Contrat - Modifier `/gestionnaire/contrats/[id]/modifier`

**Préconditions** : Contrat existant non résilié

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.18.1 | Pré-remplissage données existantes | ☐ | |
| 2.18.2 | Modification dates | ☐ | |
| 2.18.3 | Modification montants | ☐ | |
| 2.18.4 | Ajout document | ☐ | |
| 2.18.5 | Suppression document | ☐ | |
| 2.18.6 | Lot non modifiable (bloqué) | ☐ | |
| 2.18.7 | Locataire non modifiable (bloqué) | ☐ | |
| 2.18.8 | Sauvegarde modifications | ☐ | |
| 2.18.9 | Historique mis à jour | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.18.6 & 2.18.7 Champs non modifiables**
- [ ] Lot affiché mais champ disabled
- [ ] Locataire affiché mais champ disabled
- [ ] Tooltip : "Pour changer de lot/locataire, créez un nouveau contrat"

**Raison** : Éviter les incohérences historiques. Un contrat est lié à un lot et locataire spécifiques.

**Cas spécial : Reconduction**
- [ ] Bouton "Reconduire le contrat" crée une copie avec nouvelles dates
- [ ] Ancien contrat passe en statut "terminé"
- [ ] Nouveau contrat lié à l'historique

</details>

---

### 2.19 Interventions - Liste `/gestionnaire/interventions`

**Préconditions** : Connecté gestionnaire, interventions de test présentes

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.19.1 | Liste interventions visible | ☐ | |
| 2.19.2 | Filtres par statut | ☐ | |
| 2.19.3 | Filtres par priorité | ☐ | |
| 2.19.4 | Filtres par bien | ☐ | |
| 2.19.5 | Recherche | ☐ | |
| 2.19.6 | Vue liste / calendrier | ☐ | |
| 2.19.7 | Bouton "Nouvelle intervention" | ☐ | |
| 2.19.8 | Click → détail | ☐ | |
| 2.19.9 | Badges statut colorés | ☐ | |
| 2.19.10 | Actions rapides | ☐ | |
| 2.19.11 | Pagination | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.19.2 Filtres par statut**
Options disponibles et couleurs attendues :
| Statut | Label | Badge |
|--------|-------|-------|
| `demande` | Demande | Gris |
| `approuvee` | Approuvée | Vert |
| `demande_de_devis` | En attente de devis | Orange |
| `planifiee` | Planifiée | Bleu |
| `en_cours` | En cours | Violet |
| `cloturee_par_gestionnaire` | Clôturée | Vert foncé |

**2.19.3 Filtres par priorité**
| Priorité | Label | Badge |
|----------|-------|-------|
| `basse` | Basse | Gris |
| `normale` | Normale | Bleu |
| `haute` | Haute | Orange |
| `urgente` | Urgente | Rouge |

**2.19.9 Badges statut**
- [ ] Chaque intervention a un badge coloré selon statut
- [ ] Couleurs conformes au glossaire (voir 12-glossaire.md)

</details>

---

### 2.20 Interventions - Nouvelle `/gestionnaire/interventions/nouvelle-intervention`

**Préconditions** :
- Connecté gestionnaire
- Au moins 1 bien et 1 prestataire existants

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.20.1 | Sélection bien | ☐ | |
| 2.20.2 | Type d'intervention | ☐ | |
| 2.20.3 | Description problème | ☐ | |
| 2.20.4 | Priorité | ☐ | |
| 2.20.5 | Photos/Documents | ☐ | |
| 2.20.6 | Assignation prestataire(s) | ☐ | |
| 2.20.7 | Mode: Direct / Demande de devis | ☐ | |
| 2.20.8 | Validation formulaire | ☐ | |
| 2.20.9 | Création réussie | ☐ | |
| 2.20.10 | Notification envoyée | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.20.1 Sélection bien**
- [ ] Dropdown ou recherche d'immeubles
- [ ] Sélection immeuble → propose lots ou "Parties communes"
- [ ] Adresse affichée après sélection

**Données de test :**
| Champ | Valeur |
|-------|--------|
| Immeuble | `Résidence Les Lilas` |
| Lot | `Parties communes` ou `Apt 3B` |

**2.20.2 Type d'intervention**
- [ ] Options : Plomberie, Électricité, Chauffage, etc.
- [ ] Icône par type
- [ ] Sélection obligatoire

**2.20.3 Description**
- [ ] Textarea avec compteur caractères
- [ ] Minimum 10 caractères (validation)
- [ ] Maximum 2000 caractères

**Données de test :**
```
Fuite d'eau dans la cave niveau -1.
Urgence : eau qui coule depuis ce matin.
```

**2.20.4 Priorité**
- [ ] Options : Basse, Normale, Haute, Urgente
- [ ] Défaut : Normale
- [ ] Badge couleur visible

**2.20.5 Photos**
- [ ] Zone drag & drop ou bouton upload
- [ ] Formats acceptés : JPG, PNG, WEBP
- [ ] Taille max : 10MB par fichier
- [ ] Max 5 fichiers
- [ ] Preview miniature après upload
- [ ] Bouton suppression par fichier

**2.20.6 Assignation prestataire**
- [ ] Recherche prestataires par nom ou spécialité
- [ ] Liste filtrée selon type d'intervention
- [ ] Multi-sélection si mode devis

**2.20.7 Mode intervention**
- [ ] Radio "Intervention directe" : 1 prestataire assigné
- [ ] Radio "Demande de devis" : multi-prestataires possible

**2.20.9 Création réussie**
- [ ] Bouton "Créer l'intervention"
- [ ] Spinner pendant création
- [ ] Redirect vers `/gestionnaire/interventions/[id]`
- [ ] Référence format `INT-2025-XXXX`

**2.20.10 Notification**
- [ ] Prestataire(s) assigné(s) reçoit notification
- [ ] Notification visible dans leur dashboard
- [ ] Email envoyé (si configuré)

</details>

---

### 2.21 Interventions - Détail `/gestionnaire/interventions/[id]`

**Préconditions** : Intervention existante

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.21.1 | Header avec titre et statut | ☐ | |
| 2.21.2 | Breadcrumb | ☐ | |
| 2.21.3 | Informations intervention | ☐ | |
| 2.21.4 | Bien concerné (lien) | ☐ | |
| 2.21.5 | Prestataire(s) assigné(s) | ☐ | |
| 2.21.6 | Timeline/Historique | ☐ | |
| 2.21.7 | Documents/Photos | ☐ | |
| 2.21.8 | Section Devis | ☐ | |
| 2.21.9 | Section Planning | ☐ | |
| 2.21.10 | Section Chat | ☐ | |
| 2.21.11 | Actions selon statut | ☐ | |

<details>
<summary><strong>Actions par statut</strong></summary>

| Statut actuel | Actions disponibles | Résultat |
|---------------|---------------------|----------|
| `demande` | Approuver, Rejeter | `approuvee` ou `rejetee` |
| `approuvee` | Assigner, Demander devis | `demande_de_devis` ou assignation |
| `demande_de_devis` | Voir/Valider/Rejeter devis | `planification` si devis accepté |
| `planification` | Proposer créneaux | Créneaux envoyés |
| `planifiee` | Voir planning, Annuler | `annulee` si annulation |
| `en_cours` | Suivre avancement | - |
| `cloturee_par_prestataire` | Valider travaux | `cloturee_par_locataire` |
| `cloturee_par_locataire` | Finaliser | `cloturee_par_gestionnaire` |

</details>

---

### 2.22-2.26 Autres Pages Gestionnaire

| Page | Tests clés | Status |
|------|------------|--------|
| **2.22 Mail** | Liste emails, filtres, sync, lecture | ☐ |
| **2.23 Notifications** | Liste, badge non-lues, marquer lu, real-time | ☐ |
| **2.24 Paramètres** | Configuration générale, préférences | ☐ |
| **2.25 Paramètres Emails** | Config SMTP, test envoi | ☐ |
| **2.26 Profile** | Infos profil, modification, avatar, password | ☐ |

---

### 2.27 Import Excel/CSV `/gestionnaire/biens/import`

**Préconditions** : Connecté comme `gestionnaire@test-seido.fr`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.27.1 | Page import accessible depuis /biens | ☐ | |
| 2.27.2 | Téléchargement template Excel | ☐ | |
| 2.27.3 | Zone drag & drop visible | ☐ | |
| 2.27.4 | Upload fichier .xlsx valide | ☐ | |
| 2.27.5 | Upload fichier .csv valide | ☐ | |
| 2.27.6 | Prévisualisation des données | ☐ | |
| 2.27.7 | Mapping des colonnes | ☐ | |
| 2.27.8 | Validation des données | ☐ | |
| 2.27.9 | Rapport d'erreurs détaillé | ☐ | |
| 2.27.10 | Import réussi avec toast succès | ☐ | |
| 2.27.11 | Données importées visibles dans /biens | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**2.27.1 Accès à la page Import**
- [ ] Bouton "Importer" visible sur `/gestionnaire/biens`
- [ ] Redirection vers `/gestionnaire/biens/import`
- [ ] Wizard multi-étapes affiché (Upload → Mapping → Validation → Import)

**2.27.2 Téléchargement du template**
- [ ] Bouton "Télécharger le template" visible
- [ ] Fichier téléchargé = `template_import_seido.xlsx`
- [ ] Template contient colonnes : Nom, Adresse, Code Postal, Ville, Type, Surface, Étage
- [ ] Message obligatoire : "Utilisation du template obligatoire"

**2.27.3 Zone Drag & Drop**
- [ ] Zone visuelle avec bordure pointillée
- [ ] Message "Glissez votre fichier ici"
- [ ] Icône Upload visible
- [ ] Hover state change de couleur

**2.27.4 Upload fichier Excel (.xlsx) valide**
- [ ] Fichier accepté après drag & drop
- [ ] Fichier accepté via bouton "Parcourir"
- [ ] Nom du fichier affiché après upload
- [ ] Parsing automatique déclenché
- [ ] Spinner de chargement pendant parsing

**2.27.5 Upload fichier CSV valide**
- [ ] Fichier .csv accepté
- [ ] Encodage UTF-8 détecté
- [ ] Séparateur ; ou , auto-détecté
- [ ] Prévisualisation des données générée

**2.27.6 Prévisualisation des données**
- [ ] Tableau avec les 10 premières lignes
- [ ] Colonnes du fichier source visibles
- [ ] Nombre total de lignes affiché
- [ ] Option "Voir plus" si >10 lignes

**2.27.7 Mapping des colonnes**
- [ ] Colonnes source ↔ colonnes SEIDO
- [ ] Auto-mapping intelligent (Nom→name, Adresse→address)
- [ ] Dropdown pour modifier le mapping
- [ ] Indicateur colonnes obligatoires (*)
- [ ] Erreur si colonne obligatoire non mappée

**2.27.8 Validation des données**
- [ ] Validation format email (si présent)
- [ ] Validation code postal (5 chiffres)
- [ ] Validation surface (nombre positif)
- [ ] Détection doublons (même adresse)
- [ ] Compteur : "25/30 lignes valides"

**2.27.9 Rapport d'erreurs détaillé**
- [ ] Liste des erreurs par ligne
- [ ] Type d'erreur (format, obligatoire, doublon)
- [ ] Ligne concernée (ex: "Ligne 15: Code postal invalide")
- [ ] Bouton "Télécharger le rapport d'erreurs"
- [ ] Option "Ignorer les erreurs et continuer"

**2.27.10 Import réussi**
- [ ] Bouton "Lancer l'import" actif si données valides
- [ ] Barre de progression pendant import
- [ ] Toast succès : "X immeubles et Y lots importés"
- [ ] Redirection vers `/gestionnaire/biens` après succès

**2.27.11 Vérification post-import**
- [ ] Nouveaux immeubles visibles dans la liste
- [ ] Nouveaux lots associés correctement
- [ ] Données importées correctes (nom, adresse, etc.)

</details>

<details>
<summary><strong>Tests négatifs Import</strong></summary>

| # | Cas d'erreur | Message attendu | Status |
|---|--------------|-----------------|--------|
| NEG-1 | Fichier vide | "Le fichier est vide" | ☐ |
| NEG-2 | Format invalide (.pdf, .doc) | "Format non supporté (xlsx, csv uniquement)" | ☐ |
| NEG-3 | Fichier > 10 MB | "Fichier trop volumineux (max 10 MB)" | ☐ |
| NEG-4 | Colonnes obligatoires manquantes | "Colonne 'Nom' requise" | ☐ |
| NEG-5 | 100% lignes invalides | "Aucune ligne valide à importer" | ☐ |
| NEG-6 | Doublons internes | "Doublons détectés (lignes 5, 12)" | ☐ |
| NEG-7 | Encodage incorrect | "Problème d'encodage détecté" (warning) | ☐ |

</details>

<details>
<summary><strong>Données de test Import</strong></summary>

**Fichier valide minimal** :
```csv
Nom,Adresse,Code Postal,Ville,Type
Résidence Test,123 Rue du Test,75001,Paris,appartement
Immeuble Import,456 Avenue Import,69001,Lyon,appartement
```

**Fichier avec erreurs** :
```csv
Nom,Adresse,Code Postal,Ville,Type
,123 Rue Sans Nom,75001,Paris,appartement
Immeuble OK,456 Rue OK,ABC,Paris,appartement
Doublon,789 Rue X,75003,Paris,appartement
Doublon,789 Rue X,75003,Paris,appartement
```

**Résultat attendu** :
- Ligne 1 : Erreur "Nom requis"
- Ligne 2 : Erreur "Code postal invalide"
- Lignes 3-4 : Warning "Doublon détecté"

</details>

---

## 3. Prestataire (5 pages - 32 tests)

> **Persona** : Marc, 38 ans, plombier, 75% terrain, mobile-first
> **Focus** : Réactivité, simplicité, actions rapides depuis le terrain

### 3.1 Dashboard `/prestataire/dashboard`

**Préconditions** :
- [ ] Connecté comme `prestataire@test-seido.fr` (mot de passe: `TestSeido2024!`)
- [ ] Au moins 2 interventions assignées dans différents statuts
- [ ] Au moins 1 devis en attente de soumission

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.1.1 | KPIs visibles (interventions, devis, RDV) | ☐ | |
| 3.1.2 | Liste interventions assignées | ☐ | |
| 3.1.3 | Badge actions en attente | ☐ | |
| 3.1.4 | Section prochains RDV | ☐ | |
| 3.1.5 | Indicateur devis à soumettre | ☐ | |
| 3.1.6 | Navigation rapide vers intervention | ☐ | |
| 3.1.7 | Design mobile-first (gros boutons) | ☐ | |
| 3.1.8 | Couleur thème prestataire (violet) | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**3.1.1 KPIs visibles**
- [ ] Card "Interventions en cours" avec nombre
- [ ] Card "Devis en attente" avec nombre
- [ ] Card "RDV aujourd'hui" ou "Prochains RDV"
- [ ] Chargement < 2s

**3.1.2 Liste interventions assignées**
- [ ] Titre, adresse, statut pour chaque intervention
- [ ] Badge statut coloré (planifiée = bleu, en cours = vert)
- [ ] Clic → page détail intervention

**3.1.3 Badge actions en attente**
- [ ] Badge rouge si action requise (ex: devis à soumettre)
- [ ] Nombre d'actions en attente visible
- [ ] Clic → filtre sur ces interventions

**3.1.7 Mobile-first**
- [ ] Boutons touch-friendly (min 44x44px)
- [ ] Textes lisibles (min 16px)
- [ ] Actions principales accessibles en 1-2 taps
- [ ] Pas de hover-only interactions

**3.1.8 Couleur thème**
- [ ] Sidebar/header avec accent violet (prestataire)
- [ ] Cohérent avec design system SEIDO

</details>

---

### 3.2 Intervention Détail `/prestataire/interventions/[id]`

**Préconditions** :
- [ ] Intervention assignée au prestataire connecté
- [ ] Intervention avec devis, documents, et créneaux

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.2.1 | Header avec référence et statut | ☐ | |
| 3.2.2 | Tabs: Vue d'ensemble, Devis, Documents, Chat | ☐ | |
| 3.2.3 | Infos intervention (titre, catégorie, urgence) | ☐ | |
| 3.2.4 | Adresse avec lien Google Maps | ☐ | |
| 3.2.5 | Contact locataire (nom, téléphone) | ☐ | |
| 3.2.6 | Bouton retour vers dashboard | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**3.2.1 Header**
- [ ] Référence intervention visible (ex: INT-2024-001)
- [ ] Badge statut coloré
- [ ] Titre de l'intervention

**3.2.4 Adresse avec Maps**
- [ ] Adresse complète affichée
- [ ] Icône MapPin cliquable
- [ ] Clic → ouvre Google Maps avec l'adresse

**3.2.5 Contact locataire**
- [ ] Nom du locataire
- [ ] Numéro de téléphone cliquable (tel:)
- [ ] Email si disponible

</details>

---

### 3.3 Devis (Tab Devis) `/prestataire/interventions/[id]#devis`

**Préconditions** :
- [ ] Intervention en statut "demande_de_devis" ou après
- [ ] Prestataire autorisé à soumettre des devis

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.3.1 | Bouton "Créer un devis" visible | ☐ | |
| 3.3.2 | Modal création devis | ☐ | |
| 3.3.3 | Champs: montant, description, validité | ☐ | |
| 3.3.4 | Upload fichier devis (PDF) | ☐ | |
| 3.3.5 | Liste mes devis soumis | ☐ | |
| 3.3.6 | Statut devis (brouillon, envoyé, accepté, rejeté) | ☐ | |
| 3.3.7 | Modifier devis brouillon | ☐ | |
| 3.3.8 | Supprimer devis brouillon | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**3.3.2 Modal création devis**
- [ ] Champ montant HT (numérique, requis)
- [ ] Champ montant TTC (calculé ou manuel)
- [ ] Zone description (textarea)
- [ ] Date validité (datepicker)
- [ ] Upload fichier PDF optionnel
- [ ] Boutons "Enregistrer brouillon" et "Envoyer"

**3.3.5 Liste devis**
- [ ] Montant affiché
- [ ] Date de création
- [ ] Badge statut (draft/pending/sent/accepted/rejected)
- [ ] Actions selon statut

**3.3.6 Statuts devis**
| Statut | Couleur | Actions possibles |
|--------|---------|-------------------|
| draft | Gris | Modifier, Supprimer, Envoyer |
| pending | Jaune | Annuler |
| sent | Bleu | Aucune |
| accepted | Vert | Aucune |
| rejected | Rouge | Voir raison |

</details>

---

### 3.4 Planning & Créneaux `/prestataire/interventions/[id]#planning`

**Préconditions** :
- [ ] Intervention en statut "planification" ou "planifiee"
- [ ] Créneaux proposés par le gestionnaire

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.4.1 | Liste créneaux proposés | ☐ | |
| 3.4.2 | Accepter un créneau | ☐ | |
| 3.4.3 | Refuser un créneau (avec raison) | ☐ | |
| 3.4.4 | Proposer nouveau créneau | ☐ | |
| 3.4.5 | Notification créneau confirmé | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**3.4.1 Liste créneaux**
- [ ] Date et heure de début
- [ ] Durée estimée
- [ ] Proposé par: [Gestionnaire] ou [Prestataire]
- [ ] Statut (proposé, accepté, refusé)

**3.4.2 Accepter créneau**
- [ ] Bouton "Accepter" visible
- [ ] Clic → confirmation ou action directe
- [ ] Toast "Créneau accepté"
- [ ] Statut intervention → "planifiee"

**3.4.3 Refuser créneau**
- [ ] Bouton "Refuser"
- [ ] Modal avec champ raison (requis)
- [ ] Toast "Créneau refusé"
- [ ] Notification envoyée au gestionnaire

</details>

---

### 3.5 Documents & Chat

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.5.1 | Liste documents intervention | ☐ | |
| 3.5.2 | Télécharger document | ☐ | |
| 3.5.3 | Uploader rapport/photo | ☐ | |
| 3.5.4 | Chat avec gestionnaire | ☐ | |
| 3.5.5 | Envoi message temps réel | ☐ | |
| 3.5.6 | Envoi pièce jointe chat | ☐ | |

---

### 3.6 Notifications `/prestataire/notifications`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.6.1 | Liste notifications | ☐ | |
| 3.6.2 | Badge non lues dans header | ☐ | |
| 3.6.3 | Types: nouvelle intervention, rappel RDV, devis accepté | ☐ | |
| 3.6.4 | Clic → navigation vers ressource | ☐ | |
| 3.6.5 | Marquer comme lu | ☐ | |
| 3.6.6 | Marquer toutes comme lues | ☐ | |

---

### 3.7 Profile `/prestataire/profile`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.7.1 | Afficher infos profil | ☐ | |
| 3.7.2 | Modifier nom/prénom | ☐ | |
| 3.7.3 | Modifier téléphone | ☐ | |
| 3.7.4 | Spécialités (tags) | ☐ | |
| 3.7.5 | Zone d'intervention | ☐ | |
| 3.7.6 | Photo de profil | ☐ | |

---

## 4. Locataire (6 pages - 28 tests)

> **Persona** : Emma, 29 ans, locataire, mobile-first, veut simplicité
> **Focus** : Interface simple, rassurante, signalement facile

### 4.1 Dashboard `/locataire/dashboard`

**Préconditions** :
- [ ] Connecté comme `locataire@test-seido.fr` (mot de passe: `TestSeido2024!`)
- [ ] Au moins 1 intervention en cours sur le logement du locataire

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.1.1 | Message bienvenue personnalisé | ☐ | |
| 4.1.2 | Infos logement (adresse, lot) | ☐ | |
| 4.1.3 | Liste interventions en cours | ☐ | |
| 4.1.4 | CTA "Signaler un problème" proéminent | ☐ | |
| 4.1.5 | Section annonces/messages | ☐ | |
| 4.1.6 | Design simple (peu d'options) | ☐ | |
| 4.1.7 | Couleur thème locataire (emerald/vert) | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**4.1.1 Message bienvenue**
- [ ] "Bonjour [Prénom]" affiché
- [ ] Date du jour visible
- [ ] Ton chaleureux et rassurant

**4.1.4 CTA Signaler**
- [ ] Bouton visible sans scroll (above the fold)
- [ ] Couleur distincte (vert primaire)
- [ ] Texte clair "Signaler un problème" ou "Nouvelle demande"
- [ ] Clic → page création intervention

**4.1.7 Couleur thème**
- [ ] Header/accents en emerald (vert)
- [ ] Cohérent avec design system SEIDO

</details>

---

### 4.2 Mes Interventions `/locataire/interventions`

**Préconditions** :
- [ ] Au moins 2 interventions (en cours + historique)

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.2.1 | Liste interventions du locataire | ☐ | |
| 4.2.2 | Filtres par statut | ☐ | |
| 4.2.3 | Badges statut colorés | ☐ | |
| 4.2.4 | Historique visible | ☐ | |
| 4.2.5 | Clic → détail intervention | ☐ | |

---

### 4.3 Nouvelle Demande `/locataire/interventions/nouvelle`

**Préconditions** :
- [ ] Locataire connecté avec logement associé

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.3.1 | Wizard multi-étapes visible | ☐ | |
| 4.3.2 | Étape 1: Type de problème | ☐ | |
| 4.3.3 | Étape 2: Description | ☐ | |
| 4.3.4 | Étape 3: Photos (optionnel) | ☐ | |
| 4.3.5 | Étape 4: Confirmation | ☐ | |
| 4.3.6 | Boutons Précédent/Suivant | ☐ | |
| 4.3.7 | Soumission avec succès | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**4.3.2 Type de problème**
- [ ] Liste catégories: Plomberie, Électricité, Chauffage, Serrurerie, Autre
- [ ] Sélection unique (radio ou cards)
- [ ] Icônes pour chaque catégorie

**4.3.3 Description**
- [ ] Titre court (max 100 caractères)
- [ ] Description longue (textarea)
- [ ] Indicateur de caractères restants
- [ ] Placeholder avec exemple

**4.3.4 Photos**
- [ ] Upload multiple (3 max)
- [ ] Prévisualisation miniatures
- [ ] Possibilité de supprimer
- [ ] Types acceptés: jpg, png, heic

**4.3.7 Soumission**
- [ ] Toast "Demande envoyée"
- [ ] Redirect vers liste interventions
- [ ] Email confirmation envoyé

</details>

---

### 4.4 Détail Intervention `/locataire/interventions/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.4.1 | Statut actuel visible (badge) | ☐ | |
| 4.4.2 | Timeline/historique des étapes | ☐ | |
| 4.4.3 | Infos RDV planifié | ☐ | |
| 4.4.4 | Contact prestataire (si assigné) | ☐ | |
| 4.4.5 | Bouton "Valider les travaux" (si terminé) | ☐ | |
| 4.4.6 | Chat avec gestionnaire | ☐ | |

<details>
<summary><strong>Critères d'acceptation détaillés</strong></summary>

**4.4.5 Valider travaux**
- [ ] Visible uniquement si statut = "cloturee_par_prestataire"
- [ ] Modal de confirmation
- [ ] Option: laisser un commentaire
- [ ] Après validation: statut → "cloturee_par_locataire"
- [ ] Toast "Travaux validés"

</details>

---

### 4.5 Notifications `/locataire/notifications`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.5.1 | Liste notifications | ☐ | |
| 4.5.2 | Types: RDV confirmé, statut changé, message | ☐ | |
| 4.5.3 | Marquer comme lu | ☐ | |

---

### 4.6 Paramètres `/locataire/parametres`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.6.1 | Préférences notifications (email/push) | ☐ | |
| 4.6.2 | Langue/région | ☐ | |
| 4.6.3 | Modifier mot de passe | ☐ | |

---

## 5. Admin (4 pages)

| Page | Tests clés | Status |
|------|------------|--------|
| **5.1 Dashboard** | Stats système, utilisateurs actifs, logs, alertes | ☐ |
| **5.2 Notifications** | Notifications système, alertes critiques | ☐ |
| **5.3 Paramètres** | Configuration système, gestion utilisateurs | ☐ |
| **5.4 Profile** | Infos admin, modification | ☐ |

---

## 6. Propriétaire (3 pages)

> **Note** : Rôle en **lecture seule**

| Page | Tests clés | Status |
|------|------------|--------|
| **6.1 Dashboard** | Vue patrimoine, nombre biens, interventions (RO) | ☐ |
| **6.2 Biens** | Liste biens RO, détails, occupation, **PAS de boutons création** | ☐ |
| **6.3 Interventions** | Liste interventions RO, filtres, détails, **PAS d'actions** | ☐ |

---

## 7. Fonctionnalités Transversales

### 7.1 Navigation

| # | Test | Critère | Status |
|---|------|---------|--------|
| 7.1.1 | Sidebar | Visible sur desktop, links actifs, icônes | ☐ |
| 7.1.2 | Breadcrumbs | Format "Dashboard > Biens > Immeuble" | ☐ |
| 7.1.3 | Back button | Retour page précédente | ☐ |
| 7.1.4 | Active state | Item menu actif surligné | ☐ |
| 7.1.5 | Mobile hamburger | Menu burger sur mobile, drawer | ☐ |

### 7.2 Formulaires

| # | Test | Critère | Status |
|---|------|---------|--------|
| 7.2.1 | Validation temps réel | Erreurs au blur ou onChange | ☐ |
| 7.2.2 | Messages erreur | Rouge, sous le champ, message explicite | ☐ |
| 7.2.3 | Required fields | Astérisque * sur labels requis | ☐ |
| 7.2.4 | Submit disabled | Grisé si formulaire invalide | ☐ |
| 7.2.5 | Loading submit | Spinner + "Enregistrement..." | ☐ |
| 7.2.6 | Confirmation perte | Modal si quitte avec données non sauvées | ☐ |

### 7.3 Uploads

| # | Test | Critère | Status |
|---|------|---------|--------|
| 7.3.1 | Drag & drop | Zone drop visible, feedback hover | ☐ |
| 7.3.2 | Click select | Bouton "Parcourir" fonctionnel | ☐ |
| 7.3.3 | Preview images | Miniature après upload | ☐ |
| 7.3.4 | Progress | Barre progression pendant upload | ☐ |
| 7.3.5 | Validation | Erreur si type/taille invalide | ☐ |
| 7.3.6 | Suppression | Bouton X pour supprimer fichier | ☐ |

### 7.4 Toasts

| # | Test | Critère | Status |
|---|------|---------|--------|
| 7.4.1 | Succès | Toast vert, icône ✓ | ☐ |
| 7.4.2 | Erreur | Toast rouge, icône ✗ | ☐ |
| 7.4.3 | Warning | Toast orange | ☐ |
| 7.4.4 | Info | Toast bleu | ☐ |
| 7.4.5 | Auto-dismiss | Disparaît après 5s | ☐ |
| 7.4.6 | Dismiss manuel | Bouton X visible | ☐ |

### 7.5 Modales

| # | Test | Critère | Status |
|---|------|---------|--------|
| 7.5.1 | Ouverture | Animation fade-in | ☐ |
| 7.5.2 | Overlay click | Clic overlay = ferme | ☐ |
| 7.5.3 | Escape | Touche Escape = ferme | ☐ |
| 7.5.4 | Focus trap | Tab reste dans modale | ☐ |
| 7.5.5 | Body scroll | Scroll body bloqué quand modale ouverte | ☐ |

### 7.6 Tables/Listes

| # | Test | Critère | Status |
|---|------|---------|--------|
| 7.6.1 | Header sticky | Header visible au scroll | ☐ |
| 7.6.2 | Tri colonnes | Clic header = tri asc/desc | ☐ |
| 7.6.3 | Pagination | Boutons page, affichage "1-20 sur 100" | ☐ |
| 7.6.4 | État vide | Message "Aucun élément" | ☐ |
| 7.6.5 | Loading skeleton | Skeleton rectangles pendant chargement | ☐ |
| 7.6.6 | Actions row | Menu ⋮ avec options par ligne | ☐ |

---

## Résumé Exécution

| Section | Pages | Testées | PASS | FAIL | Notes |
|---------|-------|---------|------|------|-------|
| Publiques/Auth | 14 | ☐ | | | |
| Gestionnaire | 27 | ☐ | | | |
| Prestataire | 5 | ☐ | | | |
| Locataire | 6 | ☐ | | | |
| Admin | 4 | ☐ | | | |
| Propriétaire | 3 | ☐ | | | |
| Transversal | 6 | ☐ | | | |
| **TOTAL** | **65** | | | | |

---

**Testeur** : _________________
**Date début** : _________________
**Date fin** : _________________
**Environnement** : ☐ Local | ☐ Preview | ☐ Production
**Navigateur** : _________________

---

## Références

- [Données de test](./11-donnees-test.md)
- [Glossaire](./12-glossaire.md)
- [Template Test Case](./templates/test-case-template.md)
- [Template E2E Gherkin](./templates/test-case-e2e.md)
