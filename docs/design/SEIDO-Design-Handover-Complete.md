# SEIDO - Document de Handover Design Complet

> **Objectif** : Ce document recense **toutes les fonctionnalites et ecrans** de l'application SEIDO, regroupes logiquement par module. Il sert de reference exhaustive pour la designer afin de refaire tous les ecrans de l'application.
>
> **Date** : 2026-03-09
> **Source** : User stories CSV + analyse complete du codebase

---

## Table des Matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Landing Page & Marketing](#2-landing-page--marketing)
3. [Blog](#3-blog)
4. [Pages Legales](#4-pages-legales)
5. [Authentification & Onboarding](#5-authentification--onboarding)
6. [Navigation & Layout](#6-navigation--layout)
7. [Dashboard Gestionnaire](#7-dashboard-gestionnaire)
8. [Patrimoine (Biens)](#8-patrimoine-biens)
9. [Contacts & Societes](#9-contacts--societes)
10. [Contrats](#10-contrats)
11. [Interventions - Vue Gestionnaire](#11-interventions---vue-gestionnaire)
12. [Systeme Email (Gestionnaire)](#12-systeme-email-gestionnaire)
13. [Dashboard Locataire](#13-dashboard-locataire)
14. [Interventions - Vue Locataire](#14-interventions---vue-locataire)
15. [Contrat - Vue Locataire](#15-contrat---vue-locataire)
16. [Dashboard Prestataire](#16-dashboard-prestataire)
17. [Interventions - Vue Prestataire](#17-interventions---vue-prestataire)
18. [Profil Utilisateur (Tous roles)](#18-profil-utilisateur-tous-roles)
19. [Parametres & Preferences (Tous roles)](#19-parametres--preferences-tous-roles)
20. [Notifications (Tous roles)](#20-notifications-tous-roles)
21. [Abonnement & Facturation (Gestionnaire)](#21-abonnement--facturation-gestionnaire)
22. [Proprietaire (Lecture seule)](#22-proprietaire-lecture-seule)
23. [Administration (Admin)](#23-administration-admin)
24. [PWA & Installation](#24-pwa--installation)
25. [Composants Transversaux](#25-composants-transversaux)
26. [Import de Donnees](#26-import-de-donnees)
27. [Annexes](#27-annexes)

---

## 1. Vue d'ensemble

### 1.1 Roles utilisateurs

| Role | Description | Proportion | Usage principal |
|------|-------------|------------|-----------------|
| **Gestionnaire** | Gestionnaire de biens immobiliers | ~70% des users | Desktop, productivite |
| **Prestataire** | Prestataire de services (plombier, electricien...) | ~20% | 75% mobile, terrain |
| **Locataire** | Occupant d'un logement | ~10% | Occasionnel, simplicite |
| **Admin** | Administration systeme SEIDO | Interne | Interface dense, gestion users |
| **Proprietaire** | Proprietaire de biens immobiliers | ~1% | Lecture seule, suivi patrimoine |

### 1.2 Modules principaux

```
SEIDO
├── Marketing (Landing Page, Blog, Pages Legales)
├── Authentification (Login, Signup, Reset, OAuth, Onboarding)
├── Gestionnaire
│   ├── Dashboard (KPIs, actions rapides, activite)
│   ├── Patrimoine (Immeubles, Lots)
│   ├── Contacts (Personnes, Societes, Invitations)
│   ├── Contrats (Baux, Documents)
│   ├── Interventions (Workflow 9 statuts, Devis, Planning)
│   ├── Emails (Boite mail integree, Sync, Blacklist)
│   ├── Notifications (Centre notifications)
│   └── Parametres (Profil, Abonnement, Email settings)
├── Locataire
│   ├── Dashboard (Logement, Contrat, Interventions)
│   ├── Interventions (Creation, Suivi, Chat)
│   ├── Lots (Detail logement)
│   ├── Notifications
│   └── Parametres (Profil, PWA)
├── Prestataire
│   ├── Dashboard (Interventions assignees, Messages)
│   ├── Interventions (Detail, Devis, Planning, Cloture)
│   ├── Notifications
│   └── Parametres (Profil, PWA)
├── Proprietaire
│   ├── Dashboard (Liens vers Biens et Interventions)
│   ├── Mes Biens (Immeubles + Lots, lecture seule)
│   └── Mes Interventions (Interventions assignees)
└── Admin
    ├── Dashboard (Stats systeme)
    ├── Gestion Utilisateurs
    ├── Types d'interventions
    └── Parametres
```

---

## 2. Landing Page & Marketing

**Route** : `/`

### 2.1 Hero Section
| ID | User Story | Elements UI |
|----|-----------|-------------|
| LP-01 | Comprendre rapidement ce qu'est SEIDO | Titre + slogan + description courte |
| LP-02 | Demander une demonstration | Bouton CTA "Demander une demo" |

**Elements de design :**
- Header avec logo, lien login, CTA principal
- Titre accrocheur + sous-titre explicatif
- Animation ou image hero du produit
- Bouton CTA primaire bien visible

### 2.2 Presentation produit
| ID | User Story | Elements UI |
|----|-----------|-------------|
| LP-03 | Comprendre le probleme que SEIDO resout | Texte expliquant les difficultes de gestion immobiliere |
| LP-04 | Comprendre comment SEIDO simplifie la gestion | Explication de la plateforme avec visuels |

### 2.3 Modules & Fonctionnalites
| ID | User Story | Elements UI |
|----|-----------|-------------|
| LP-05 | Decouvrir les fonctionnalites principales | Cards des 4 modules : Patrimoine, Contacts, Contrats, Interventions |
| LP-06 | Module Patrimoine | Description + icone/illustration |
| LP-07 | Module Contacts | Description + icone/illustration |
| LP-08 | Module Contrats | Description + icone/illustration |
| LP-09 | Module Interventions | Description + icone/illustration |

### 2.4 Benefices
| ID | User Story | Elements UI |
|----|-----------|-------------|
| LP-10 | Connaitre les avantages de SEIDO | 3 avantages : Gain de temps, Collaboration, Visibilite |

**Elements supplementaires identifies dans le code :**
- Section Stats (nombre d'utilisateurs, proprietes, interventions)
- Section Temoignages (carousel de citations clients)
- Section Blog (3 derniers articles)

### 2.5 Tarifs
| ID | User Story | Elements UI |
|----|-----------|-------------|
| LP-11 | Comparer les offres | Cards plans tarifaires avec prix |
| LP-12 | Comparer les fonctionnalites | Tableau comparatif des plans |

### 2.6 FAQ
| ID | User Story | Elements UI |
|----|-----------|-------------|
| LP-13 | Consulter les questions frequentes | Accordeon FAQ |
| LP-14 | Questions fonctionnement, securite, support | Sections thematiques dans la FAQ |

**Note technique** : La FAQ utilise du schema markup JSON-LD pour le SEO (FAQPage).

### 2.7 CTA Final & Footer
| ID | User Story | Elements UI |
|----|-----------|-------------|
| LP-15 | Demander une demo ou contacter l'equipe | Bouton contact / demo (section finale) |
| LP-16 | Acceder aux informations complementaires | Footer avec liens : Contact, Mentions legales, Conditions, Confidentialite |

**Metadata SEO** :
- Title : "Gestion Locative Simplifiee — Gagnez jusqu'a 10h/semaine | SEIDO"
- Open Graph image : `/images/preview_image.webp`
- Schema markup : Organization, SoftwareApplication, FAQPage

---

## 3. Blog

**Routes** : `/blog`, `/blog/[slug]`

### 3.1 Page Index Blog
| Ecran | Elements UI |
|-------|-------------|
| Liste des articles | Cards avec titre, date, auteur, categorie, extrait, image |
| Filtrage | Filtres par categorie, tags, recherche texte |
| Tri | Par date de publication |

### 3.2 Page Article
| Ecran | Elements UI |
|-------|-------------|
| Article complet | Titre, auteur, date, categorie, contenu Markdown, images |
| Navigation | Breadcrumb, lien retour liste |
| SEO | Canonical URL, Open Graph, schema markup |

---

## 4. Pages Legales

**Routes** : `/conditions-generales`, `/confidentialite`, `/cookies`

| Page | Contenu |
|------|---------|
| Conditions Generales | CGU completes |
| Politique de Confidentialite | RGPD, traitement des donnees |
| Politique Cookies | Types de cookies, consentement |

**Design** : Template commun avec theme sombre, texte legal structure.

---

## 5. Authentification & Onboarding

### 5.1 Page de Connexion
**Route** : `/auth/login`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| AUTH-01 | Se connecter a mon compte | Formulaire email + mot de passe |
| AUTH-02 | Message d'erreur si identifiants incorrects | Alert d'erreur explicite |
| AUTH-03 | Se connecter via Google | Bouton "Continuer avec Google" (OAuth) |

**Etats d'erreur specifiques** :
- Token expire
- Email non confirme
- Session expiree
- Identifiants incorrects

**Design** : Fond bleu fonce avec gradient, blobs animes, card centree max-width 448px.

### 5.2 Creation de Compte
**Route** : `/auth/signup`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| AUTH-04 | Creer un compte | Formulaire : Nom, Email, Mot de passe |
| AUTH-05 | Confirmer mon adresse email | Email de confirmation avec lien |
| AUTH-06 | Inscription via Google OAuth | Bouton Google + callback |

**Page post-inscription** : `/auth/signup-success` — Message de succes + instructions.

### 5.3 Mot de Passe Oublie
**Routes** : `/auth/reset-password`, `/auth/update-password`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| AUTH-07 | Reinitialiser mon mot de passe | Lien "Mot de passe oublie" sur page login |
| AUTH-08 | Recevoir un email de reinitialisation | Formulaire email → envoi lien reset |

### 5.4 Pages supplementaires (hors CSV)

| Route | Fonction | Elements UI |
|-------|----------|-------------|
| `/auth/set-password` | Definir mot de passe initial (nouveaux users invites) | Formulaire nouveau mdp |
| `/auth/complete-profile` | Onboarding enrichi (prestataires) | Infos societe, adresse facturation |
| `/auth/callback` | Gestionnaire OAuth redirect | Transparent, gere token exchange |
| `/auth/confirm` | Confirmation email legacy | Lien de verification |
| `/auth/unauthorized` | Page 403 | Message acces refuse + redirection |
| `/auth/beta-thank-you` | Remerciement beta testeurs | Page statique |

### 5.5 Redirection post-connexion

| ID | User Story | Elements UI |
|----|-----------|-------------|
| AUTH-09 | Etre redirige vers le dashboard apres connexion | Redirection automatique vers `/{role}/dashboard` |

---

## 6. Navigation & Layout

### 6.1 Layout Gestionnaire

**Sidebar permanente (desktop)** :
| Element | Icone | Route |
|---------|-------|-------|
| Dashboard | LayoutDashboard | `/gestionnaire/dashboard` |
| Patrimoine | Building | `/gestionnaire/biens` |
| Contacts | Users | `/gestionnaire/contacts` |
| Contrats | FileText | `/gestionnaire/contrats` |
| Interventions | Wrench | `/gestionnaire/interventions` |
| Emails | Mail | `/gestionnaire/mail` |
| Parametres | Settings | `/gestionnaire/parametres` |
| Aide | HelpCircle | `/gestionnaire/aide` |

**Footer sidebar** :
- Lien profil utilisateur (avatar + nom)
- Bouton deconnexion
- Card statut abonnement (trial/actif)
- Selecteur d'equipe (si multi-equipe)

**Topbar (pages avec navbar)** :
- Titre de page dynamique
- Selecteur d'equipe compact
- Cloche notifications avec badge compteur non-lu
- Popover notifications (10 dernieres)

**Comportement responsive** :
- Sidebar auto-collapse sur tablette
- Menu hamburger sur mobile
- Etat collapse sauvegarde en cookie

### 6.2 Layout Locataire

**Header simplifie** :
- Logo SEIDO (lien dashboard)
- Bouton "Nouvelle demande" (intervention)
- Cloche notifications avec badge
- Menu utilisateur (avatar/initiales)

**Pas de sidebar** — navigation via header + cards dashboard.

**Menu utilisateur dropdown** :
- Mon profil → `/locataire/profile`
- Parametres → `/locataire/parametres`
- Se deconnecter

### 6.3 Layout Prestataire

**Header simplifie** (identique au locataire) :
- Logo SEIDO Pro
- Sous-titre "Prestataire"
- Selecteur d'equipe (si multi-equipe)
- Cloche notifications avec badge
- Menu utilisateur (avatar + nom + role)

**Pas de sidebar** — navigation via header.

### 6.4 Patterns de Layout

| Type | Usage | Caracteristiques |
|------|-------|-----------------|
| **With-navbar** | Pages liste, dashboard | Topbar avec titre + actions |
| **No-navbar** | Pages detail, creation | Header custom, pleine largeur |
| **Content wrapper** | Contenu principal | Max-width container avec padding |
| **Hybrid** | Detail intervention | Sidebar info + onglets + contenu |

---

## 7. Dashboard Gestionnaire

**Route** : `/gestionnaire/dashboard`

### 7.1 KPIs (Bandeau de statistiques)
| ID | User Story | Donnee affichee |
|----|-----------|-----------------|
| DG-01 | Resume global du patrimoine | Nombre d'immeubles + nombre de lots |
| DG-02 | Taux d'occupation | % lots occupes vs vacants |
| DG-03 | Contrats actifs | Nombre de contrats en cours |
| DG-04 | Interventions en cours | Nombre d'interventions ouvertes |

**KPIs supplementaires (code)** :
- Contacts : total, comptes actifs, invitations en attente
- Contrats : expirant ce mois, expirant 30j, expires, loyer mensuel total, loyer moyen, total locataires
- Graphiques et metriques interactifs

### 7.2 Liste des Interventions
| ID | User Story | Elements UI |
|----|-----------|-------------|
| DG-05 | Liste des interventions en cours | Liste avec statut, titre, immeuble, lot |
| DG-06 | Rechercher/filtrer les interventions | Recherche mot-cle, filtres statut/immeuble/priorite/date |

### 7.3 Messages
| ID | User Story | Elements UI |
|----|-----------|-------------|
| DG-07 | Messages non lus dans les interventions | Section messages non lus avec apercu |

### 7.4 Activite Recente
| ID | User Story | Elements UI |
|----|-----------|-------------|
| DG-08 | Dernieres activites | Timeline : creation intervention, nouveaux messages, MAJ contrats |

### 7.5 Actions Rapides
| ID | User Story | Elements UI |
|----|-----------|-------------|
| DG-09 | Acces rapide aux actions principales | Boutons : Ajouter immeuble, lot, contrat, intervention, importer |

---

## 8. Patrimoine (Biens)

**Route** : `/gestionnaire/biens`

### 8.1 Liste du Patrimoine

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PAT-01 | Voir la liste des immeubles | Liste/Cards des immeubles |
| PAT-02 | Rechercher/filtrer les immeubles | Recherche par nom, filtres |
| PAT-03 | Acces rapide creation | Boutons "Nouveau lot", "Importer" |

**Design** :
- Navigation par onglets : **Immeubles** | **Lots**
- Toggle vue Cards / Liste
- Chaque card immeuble : nom, adresse, nombre lots, taux occupation, image
- Chaque card lot : reference, immeuble, surface, etage, chambres, loyer, charges, statut occupation, locataire

**Restrictions abonnement (Lot Locking)** :
- Lots depassant la limite du plan affichent une **icone cadenas**
- Actions desactivees sur les lots verrouilles (edit, detail)
- `UpgradeModal` s'affiche quand l'utilisateur tente de creer/acceder a un lot au-dela de la limite
- Card lot verrouille : style visuel grise/desature avec overlay cadenas

### 8.2 Creation d'Immeuble (Wizard multi-etapes)
**Route** : `/gestionnaire/biens/immeubles/nouveau`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PAT-04 | Ajouter un immeuble | Formulaire creation multi-etapes |
| PAT-05 | Informations generales | Reference, adresse, rue, code postal, ville, pays, description |
| PAT-06 | Ajouter les lots associes | Creation des lots dans l'immeuble |
| PAT-07 | Associer des contacts | Gestionnaire, prestataires, locataires |
| PAT-08 | Ajouter des documents | Documents recommandes ou autres fichiers |
| PAT-09 | Suivis techniques recommandes | Liste de suivis techniques (maintenance) |
| PAT-10 | Confirmer la creation | Message de confirmation |

**Etapes du wizard** :
1. Infos de base (nom, adresse) — avec **integration Google Maps** pour selection adresse
2. Details propriete (annee construction, etages, etc.)
3. Assignation gestionnaire(s) — multi-select des membres de l'equipe
4. Assignation contacts par lot — proprietaire, coproprietaire, syndic

**Integration Google Maps** (composants dedies) :
- `AddressFieldsWithMap` : champs adresse avec autocompletion Google Places + carte preview
- `GoogleMapPreview` : carte interactive centree sur l'adresse avec marqueur
- `GoogleMapsProvider` : wrapper context pour l'API Google Maps
- Utilise dans : creation/edition immeubles, affichage adresse dans details

### 8.3 Detail d'un Immeuble
**Route** : `/gestionnaire/biens/immeubles/[id]`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PAT-11 | Voir les informations d'un immeuble | Header + onglets detail |
| PAT-12 | Modifier les informations | Bouton edition |
| PAT-13 | Voir les lots associes | Onglet liste des lots |
| PAT-14 | Archiver un immeuble | Action archivage |
| PAT-15 | Supprimer un immeuble | Action suppression avec confirmation |

**Onglets** :
- **Details** : adresse, annee construction, etages, contacts gestionnaires
- **Lots** : liste des lots de l'immeuble
- **Documents** : documentation du batiment
- **Interventions** : interventions liees
- **Contacts** : contacts associes par role

**Roles de contacts par immeuble/lot** (hors CSV) :
- `proprietaire` — Proprietaire du bien
- `coproprietaire` — Co-proprietaire
- `syndic` — Administrateur/syndic
- `occupant` — Locataire (auto-assigne via contrats)
- Assignment via modal multi-select dans creation/edition immeuble

### 8.4 Creation de Lot
**Route** : `/gestionnaire/biens/lots/nouveau`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PAT-16 | Definir la categorie du lot | Appartement, Maison, Garage, Local commercial, Autre |
| PAT-17 | Renseigner les informations du lot | Etage, porte/boite, description |

**Champs du formulaire** :
- Reference
- Selection immeuble (ou lot independant)
- Surface (m2)
- Etage
- Nombre de pieces
- Caracteristiques
- Description
- Dropdown immeuble avec creation rapide

### 8.5 Detail d'un Lot
**Route** : `/gestionnaire/biens/lots/[id]`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PAT-18 | Voir les informations d'un lot | Header + sections detail |
| PAT-19 | Voir le statut d'occupation | Badge occupe/vacant |
| PAT-20 | Archiver un lot | Action archivage |
| PAT-21 | Supprimer un lot | Action suppression avec confirmation |

**Onglets/Sections** :
- **Details** : surface, etage, pieces, categorie
- **Finances** : loyer, charges, info locataire actuel
- **Locataire** : details occupant
- **Documents** : bail, etat des lieux, etc.
- **Interventions** : interventions specifiques au lot
- **Contacts** : contacts lies

### 8.6 Modification
**Routes** : `/gestionnaire/biens/immeubles/modifier/[id]`, `/gestionnaire/biens/lots/modifier/[id]`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PAT-22 | Modifier immeuble | Formulaire pre-rempli |
| PAT-23 | Modifier lot | Formulaire pre-rempli |

### 8.7 Import de Donnees

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PAT-24 | Importer immeubles ou lots | Import CSV/Excel via wizard |

*(Voir section [25. Import de Donnees](#25-import-de-donnees) pour details)*

---

## 9. Contacts & Societes

**Route** : `/gestionnaire/contacts`

### 9.1 Liste des Contacts

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CON-01 | Voir la liste des contacts | Liste avec nom, email, telephone, type, avatar, statut |
| CON-02 | Rechercher/filtrer les contacts | Recherche par nom, type, entreprise |

**Navigation par onglets** :
- **Contacts** — tous les contacts
- **Invitations** — invitations en attente (avec badge compteur)
- **Societes** — liste des entreprises

**Actions page** : Boutons "Nouveau contact", "Importer"

### 9.2 Creation de Contact
**Route** : `/gestionnaire/contacts/nouveau`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CON-03 | Creer un contact | Acces formulaire de creation |
| CON-04 | Type personne physique ou societe | Choix type contact |
| CON-05 | Informations generales | Nom, prenom, email, telephone |
| CON-06 | Associer a une societe | Choisir societe existante ou en creer une |
| CON-07 | Associer a un immeuble ou lot | Selection immeuble/lot |
| CON-08 | Invitation automatique par email | Email d'invitation envoye a la creation |
| CON-09 | Confirmation de creation | Message confirmation + invitation envoyee |

**Prefill** : Le parametre `?type=prestataire|locataire` pre-selectionne le type de contact.

### 9.3 Gestion des Invitations

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CON-10 | Voir le statut d'invitation | Badge : envoyee, acceptee, en attente, expiree |
| CON-11 | Renvoyer une invitation | Bouton renvoi invitation |

**Onglet Invitations** :
- Liste de toutes les invitations
- Infos : email invite, statut, date envoi, date expiration
- Actions : Renvoyer, Annuler, Supprimer
- Filtres par statut (toutes, en attente, acceptees, expirees)

### 9.4 Detail d'un Contact
**Route** : `/gestionnaire/contacts/details/[id]`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CON-12 | Consulter la fiche d'un contact | Infos completes + relations patrimoine + interventions |
| CON-13 | Modifier les informations | Bouton edition |
| CON-14 | Archiver un contact | Action archivage |
| CON-15 | Supprimer un contact | Action suppression |

**Onglets detail** :
- **Profil** : infos contact, societe, role
- **Interventions** : interventions assignees
- **Contrats** : contrats lies
- **Proprietes** : lots/immeubles associes

### 9.5 Societes

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CON-16 | Voir la liste des societes | Liste des entreprises |
| CON-17 | Rechercher/filtrer les societes | Recherche par nom, activite |
| CON-18 | Creer une societe | Formulaire : nom, adresse, email, telephone, description |
| CON-19 | Informations societe | Nom, TVA, email, telephone, adresse, site web |
| CON-20 | Contacts associes a une societe | Liste des contacts lies |
| CON-21 | Modifier une societe | Formulaire pre-rempli |
| CON-22 | Archiver une societe | Action archivage |
| CON-23 | Supprimer une societe | Action suppression |

**Routes detail/edition** :
- `/gestionnaire/contacts/societes/[id]`
- `/gestionnaire/contacts/societes/modifier/[id]`

---

## 10. Contrats

**Route** : `/gestionnaire/contrats`

### 10.1 Liste des Contrats

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CTR-01 | Voir la liste des contrats | Liste avec titre, type, statut, dates, lots, locataire, loyer |
| CTR-02 | Contrats par statut | Filtres : actif, a venir, termine, resilie |
| CTR-03 | Progression du contrat | Barre progression %, jours restants, statut |
| CTR-04 | Rechercher/filtrer | Recherche par reference, locataire, immeuble |
| CTR-05 | Acces rapide creation | Bouton "Nouveau contrat" |

**Actions page** : "Nouveau contrat", "Importer"

**Statuts contrat** : `actif`, `a_venir` (draft), `expire`, `expiring_this_month`, `expiring_next_30_days`

**Traitement automatique** : Transitions de statut automatiques + notifications contrats expirants (background apres chargement page).

### 10.2 Creation de Contrat (Wizard)
**Route** : `/gestionnaire/contrats/nouveau`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CTR-06 | Creer un contrat | Acces formulaire wizard |
| CTR-07 | Selectionner immeuble et lot | Choix du bien |
| CTR-08 | Informations principales du bail | Reference du bail |
| CTR-09 | Date de debut et duree | Date debut, duree |
| CTR-10 | Loyer et charges | Montant loyer + charges |
| CTR-11 | Garantie locative | Montant garantie/caution |
| CTR-12 | Frequence de paiement | Mensuel ou autre periodicite |
| CTR-13 | Documents du bail | Upload documents contractuels |

**Etapes du wizard** :
1. Infos de base (titre, type, dates)
2. Selection propriete (immeuble/lots)
3. Assignation locataire
4. Conditions financieres (loyer, charges)
5. Upload documents

**Features** : Selection template, calculs automatiques (duree, prochaine revision).

### 10.3 Detail d'un Contrat
**Route** : `/gestionnaire/contrats/[id]`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CTR-14 | Consulter informations contrat | Detail bail + documents |
| CTR-15 | Modifier le contrat | Bouton edition |
| CTR-16 | Resilier un contrat | Passage en statut resilie |
| CTR-17 | Voir contrats termines | Section historique |

**Onglets** :
- **Details** : infos contrat, dates, conditions
- **Lots/Proprietes** : biens associes
- **Locataire** : info locataire, contact
- **Finances** : loyer, charges, historique paiements
- **Documents** : fichiers contractuels
- **Messages** : discussions liees au contrat

---

## 11. Interventions - Vue Gestionnaire

**Route** : `/gestionnaire/interventions`

### 11.1 Liste des Interventions

| ID | User Story | Elements UI |
|----|-----------|-------------|
| INT-01 | Voir la liste des interventions | Liste complete avec details |
| INT-02 | Interventions par statut | Filtres par les 9 statuts |
| INT-03 | Rechercher/filtrer | Recherche par immeuble, lot, statut, urgence |
| INT-04 | Acces rapide creation | Bouton "Nouvelle intervention" |
| INT-05 | Actions rapides par statut | Boutons contextuels : approuver, devis, planifier, cloturer |

**Vue Calendrier** (hors CSV) :
- `InterventionsCalendarView` : vue calendrier des interventions planifiees (React Big Calendar)
- Navigation par mois/semaine/jour
- Events colores par statut/urgence
- Click sur event → navigation vers detail intervention

**Les 9 statuts d'intervention** :
1. `demande` — Demande initiale
2. `rejetee` — Refusee par le gestionnaire
3. `approuvee` — Approuvee, prete pour action
4. `planification` — Phase de planification (devis/creneaux)
5. `planifiee` — Planifiee, date confirmee
6. `cloturee_par_prestataire` — Prestataire a termine
7. `cloturee_par_locataire` — Locataire a valide
8. `cloturee_par_gestionnaire` — Cloture finale par gestionnaire
9. `annulee` — Annulee

### 11.2 Creation d'Intervention (Wizard)
**Route** : `/gestionnaire/interventions/nouvelle-intervention`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| INT-06 | Creer une intervention | Acces formulaire creation |
| INT-07 | Selectionner immeuble et lot | Dropdown avec recherche |
| INT-08 | Decrire l'intervention | Titre + description |
| INT-09 | Definir la categorie | Plomberie, electricite, chauffage, autres |
| INT-10 | Definir le niveau d'urgence | Basse, Normale, Haute, Urgente |
| INT-11 | Associer un contact | Selection locataire ou prestataire |
| INT-12 | Ajouter photos/documents | Upload fichiers |

**Etapes du wizard** :
1. Selection propriete (immeuble/lot)
2. Details intervention (titre, type, description, priorite)
3. Caracteristiques (categorie, types d'intervention)
4. Assignation (gestionnaire, locataire, prestataire)
5. Planification (date initiale optionnelle)
6. Resume & Creation

**Features** : Type d'intervention avec categories, pre-selection gestionnaire connecte, titre auto-genere depuis reference.

### 11.3 Detail d'une Intervention
**Route** : `/gestionnaire/interventions/[id]`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| INT-13 | Approuver/refuser une demande | Modal approbation/rejet |
| INT-14 | Demander des devis | Modal envoi demande de devis avec deadline |
| INT-15 | Selectionner/valider un devis | Liste devis recus + selection |
| INT-16 | Definir un creneau | Modal planification date/heure |
| INT-17 | Confirmer la cloture | Modal validation fin (apres cloture prestataire) |
| INT-18 | Ajouter photos/documents | Section upload |
| INT-19 | Echanger des messages | Fils de discussion (3 threads) |
| INT-20 | Historique des actions | Timeline des actions |
| INT-21 | Modifier l'intervention | Edition titre, categorie, urgence, description |
| INT-22 | Archiver | Action archivage |
| INT-23 | Supprimer | Action suppression |

**Layout** : Sidebar info + Stepper horizontal + Onglets

**Onglets** :
- **Details** : description, caracteristiques, priorite
- **Assignation** : gestionnaire, locataire, prestataire (mode single ou separate)
- **Planification** : creneaux horaires, statut confirmation
- **Devis** : demandes de devis, reponses, selection
- **Documents** : fichiers uploades, photos, rapports
- **Messages** : 3 types de fils de discussion
  - Thread groupe (tous participants)
  - Thread locataire ↔ gestionnaires
  - Thread prestataire ↔ gestionnaires

**Modales/Dialogues** :
1. Modal Approbation — approuver/rejeter la demande
2. Modal Demande de Devis — demander devis au prestataire avec deadline
3. Modal Succes Devis — confirmation apres demande
4. Modal Planification — planifier avec creneaux date/heure
5. Modal Annulation Devis — confirmer annulation demande devis
6. Gestionnaire Annulation — annulation complete avec motif

### 11.4 Modification d'Intervention
**Route** : `/gestionnaire/interventions/modifier/[id]`

**Regles d'edition selon statut** :
- Toujours modifiable : details, description, caracteristiques
- Modifiable si en planification : planning, assignations
- Non modifiable apres debut execution

---

## 12. Systeme Email (Gestionnaire)

> **HORS CSV** — Fonctionnalite complete non couverte par les user stories originales.

**Route** : `/gestionnaire/mail`

### 12.1 Interface Email

| Ecran | Elements UI |
|-------|-------------|
| **Sidebar Email** | Boite de reception (non lus), Traites, Envoyes, Archives + compteurs par dossier |
| **Entites liees** | Liens vers : Immeubles, Lots, Contacts, Contrats, Interventions, Societes |
| **Liste emails** | Threading, expediteur, objet, date, indicateur pieces jointes, statut lu/non-lu |
| **Detail email** | Contenu complet, expediteur, destinataires, PJ, liens entites liees |

### 12.2 Actions Email

| Action | Elements UI |
|--------|-------------|
| Composer un email | Modal de composition |
| Repondre | Formulaire de reponse |
| Marquer comme traite | Dialog confirmation |
| Marquer comme non pertinent | Dialog avec gestion blacklist |
| Lier a une entite | Dialog de liaison (immeuble, contrat, etc.) |
| Ajouter participant | Modal ajout participant |
| Apercu piece jointe | Modal preview |
| Demarrer conversation | Modal start conversation |
| Chat interne | Panel de discussion interne |

### 12.3 Parametres Email (dans Parametres)
**Route** : `/gestionnaire/parametres/emails`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| EM-01 | Ajouter une adresse email | Formulaire ajout connexion email |
| EM-02 | Synchroniser ma boite mail | Statut sync, derniere sync, token expiration |

**Features supplementaires** :
- Gestion connexions email multiples (Gmail, Outlook)
- OAuth pour authentification email
- Gestion blacklist (bloquer expediteurs/domaines)
- Configuration groupes de notifications
- Statut de connexion en temps reel

---

## 13. Dashboard Locataire

**Route** : `/locataire/dashboard`

### 13.1 Selecteur de Propriete

| Ecran | Elements UI |
|-------|-------------|
| Card selecteur (gradient primaire) | Dropdown : "Vue d'ensemble" ou lot individuel |
| Info propriete selectionnee | Nom lot/immeuble, numero appartement, adresse |

### 13.2 Contrat Actuel

| ID | User Story | Elements UI |
|----|-----------|-------------|
| DL-01 | Voir mon contrat actuel | Card contrat en cours |
| DL-02 | Date debut et fin du bail | Dates affichees |
| DL-03 | Montant loyer et charges | Montants financiers |

**Navigation contrats** : Fleches pour naviguer entre contrats multiples du meme lot.

### 13.3 Interventions

| ID | User Story | Elements UI |
|----|-----------|-------------|
| DL-04 | Voir mes interventions | Liste cards interventions (filtrees par propriete selectionnee) |
| DL-05 | Interventions par statut | Statuts : a traiter, a planifier, a venir, terminees |
| DL-06 | Rechercher/filtrer/paginer | Recherche mot-cle, filtres statut/urgence/date, pagination |
| DL-07 | Messages non lus | Banniere messages non lus avec apercu |
| DL-08 | Nouvelle demande | Bouton "Nouvelle demande" (adaptatif : "Demande" sur mobile) |

**Etats speciaux** :
- Skeleton loading pendant hydration
- Etat "Pas de contrat" si aucun contrat lie
- Etat "Contrat a venir" desactive la creation d'intervention
- Erreur si donnees locataire indisponibles

---

## 14. Interventions - Vue Locataire

### 14.1 Creation de Demande (Wizard)
**Route** : `/locataire/interventions/nouvelle-demande`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| IL-01 | Creer une nouvelle intervention | Wizard multi-etapes (2-3 etapes) |
| IL-02 | Type de probleme | Combobox searchable (types d'intervention de la DB) |
| IL-03 | Niveau d'urgence | 4 options : Basse, Normale, Haute, Urgente |
| IL-04 | Description du probleme | Textarea libre |
| IL-05 | Pieces jointes | Zone drag-and-drop, picker fichier, multi-upload |

**Etapes** :
1. **Selection logement** (si plusieurs lots) — Grid de cards avec radio selection
   - Reference, immeuble, adresse, surface, interventions actives
2. **Details de la demande** — Type, urgence, description, fichiers
3. **Confirmation** — Resume complet avec bouton "Envoyer"

**Validation** : Champs requis (type, description), taille max fichier 5MB, types acceptes (images, PDF, docs).

### 14.2 Liste des Interventions

| ID | User Story | Elements UI |
|----|-----------|-------------|
| IL-06 | Voir la liste de mes interventions | Liste avec statut, dates, type |
| IL-07 | Rechercher/filtrer/paginer | Recherche, filtres, pagination |
| IL-08 | Progression de l'intervention | Indicateur de progression |

### 14.3 Detail d'une Intervention
**Route** : `/locataire/interventions/[id]`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| IL-09 | Informations generales | Titre, categorie, urgence, description, statut |
| IL-10 | Conversations | Fil de discussion (group + tenant_to_managers) |
| IL-11 | Envoyer des messages | Champ de saisie + envoi |
| IL-12 | Creneaux proposes | Liste creneaux avec dates/heures |

**4 Onglets** :
1. **General** — Details intervention, rapports de cloture, documents, card progression (timeline/stepper horizontal)
2. **Conversations** — Threads visibles : "group" et "tenant_to_managers", chargement lazy
3. **Rendez-vous (Planning)** — Creneaux proposes avec actions locataire
   - Selectionner un creneau → statut passe a "planifiee"
   - Decliner un creneau
   - Modal reponse multi-creneaux (`MultiSlotResponseModal`)
   - Modal annulation creneau (`CancelSlotModal`) — annuler une selection avec motif

> **Note** : Un onglet "Localisation" (carte Google Maps) existe dans le code mais n'est **pas accessible** via la navigation par onglets (code orphelin). A confirmer si la designer doit le prevoir.

**Bannieres de confirmation** (si l'intervention requiert confirmation locataire) :
- `ConfirmationRequiredBanner` — Boutons Accepter (vert) / Rejeter (rouge)
- `ConfirmationSuccessBanner` — Confirmation validee (banniere verte)
- `ConfirmationRejectedBanner` — Confirmation rejetee (banniere rouge)

**Modales locataire** :
1. **MultiSlotResponseModal** — Repondre a plusieurs creneaux (accepter un = rejeter les autres)
2. **CancelSlotModal** — Annuler sa selection de creneau avec motif
3. **DocumentPreviewModal** — Apercu document in-app

---

## 15. Contrat - Vue Locataire

### 15.1 Vue Contrat (depuis Dashboard)

| ID | User Story | Elements UI |
|----|-----------|-------------|
| CL-01 | Voir immeuble et lot que j'occupe | Identifiant logement |
| CL-02 | Informations principales du contrat | Card details contrat |
| CL-03 | Progression du contrat | Barre progression (%) |
| CL-04 | Date debut et fin | Dates affichees |
| CL-05 | Montant du loyer | Loyer affiche |
| CL-06 | Statut du contrat | Badge actif/termine |
| CL-07 | Jours restants | Compteur jours restants |
| CL-08 | Interventions liees | Liste interventions du logement |
| CL-09 | Documents du bail | Documents telechargeable |

### 15.2 Detail du Lot
**Route** : `/locataire/lots/[id]`

| Ecran | Elements UI |
|-------|-------------|
| Header | Reference lot, nom immeuble, adresse, icone categorie |
| Contrats | Cards contrats lies (locataire, dates, statut, loyer) |
| Interventions | Liste interventions filtrees pour ce lot |
| Documents | Documents contractuels et d'interventions |
| Details | Surface, categorie, immeuble, adresse |

---

## 16. Dashboard Prestataire

**Route** : `/prestataire/dashboard`

### 16.1 Interventions Assignees

| ID | User Story | Elements UI |
|----|-----------|-------------|
| DP-01 | Interventions assignees | Liste avec statut, titre, localisation |
| DP-02 | Rechercher/filtrer/paginer | Recherche, filtres, pagination |
| DP-03 | Messages non lus | Section apercu messages non lus |

**5 Onglets de navigation** :
1. **A traiter** — Interventions necessitant une action (devis, creneaux, demarrer)
2. **Mes interventions** — Toutes les interventions assignees
3. **Planification** — En phase de planification
4. **Terminees** — Interventions cloturees
5. **Archivees** — Cloturees/annulees

**Statistiques affichees** :
- Total interventions
- Interventions actives (planification + planifiee)
- Interventions terminees
- Actions en attente
- Threads non lus

---

## 17. Interventions - Vue Prestataire

**Route** : `/prestataire/interventions/[id]`

### 17.1 Detail Intervention

| ID | User Story | Elements UI |
|----|-----------|-------------|
| IP-01 | Informations generales | Titre, categorie, urgence, description, statut |
| IP-02 | Conversations | Fils de discussion (group + provider_to_managers) |
| IP-03 | Envoyer des messages | Champ saisie + envoi |
| IP-04 | Documents de l'intervention | Liste documents avec preview/download |
| IP-05 | Ajouter documents/photos | Upload documents |
| IP-06 | Consulter/envoyer un devis | Section devis avec modal soumission |
| IP-07 | Creneaux d'intervention | Liste creneaux avec reponse |
| IP-08 | Marquer comme terminee | Dialog de completion |

**3 Onglets** :
1. **General** — Details, participants (groupes par role), documents, timeline progression, rapports de cloture
2. **Conversations** — Threads : group + provider_to_managers, chargement lazy
3. **Planning et Estimation** — Creneaux horaires + Section devis (QuotesCard) avec statistiques

> **Note** : Un onglet "Localisation" (carte Google Maps) existe dans le code mais n'est **pas accessible** via la navigation par onglets (code orphelin). A confirmer si la designer doit le prevoir.

**Banniere Instructions Prestataire** (mode assignation separee) :
- Alert bleu avec instructions specifiques du gestionnaire pour ce prestataire
- Visible uniquement si le gestionnaire a renseigne des instructions dans l'assignation

**Bannieres de confirmation** (si l'intervention requiert confirmation prestataire) :
- `ConfirmationRequiredBanner` — Boutons Accepter / Rejeter
- `ConfirmationSuccessBanner` — Confirmation validee
- `ConfirmationRejectedBanner` — Confirmation rejetee

### 17.2 Panel d'Actions (Header)

**Actions contextuelles selon statut** :

| Statut | Actions disponibles |
|--------|-------------------|
| `approuvee` | Demarrer travaux, Proposer creneaux, Soumettre devis |
| `planification` | Accepter/Rejeter creneaux, Soumettre devis, Modifier choix |
| `planifiee` | Demarrer travaux, Modifier reponse creneau |
| `en_cours` | Terminer travaux, Ajouter documents |
| `cloturee_par_prestataire` | Voir rapport, Ajouter documents finaux |

### 17.3 Modales Prestataire

| Modal | Fonction |
|-------|----------|
| **TimeSlotProposer** | Proposer nouveaux creneaux (date, debut, fin, notes) |
| **QuoteSubmissionModal** | Creer/editer devis (montant, description, lignes, duree, validite, PJ) |
| **RejectQuoteRequestModal** | Rejeter demande devis avec motif |
| **MultiSlotResponseModal** | Repondre a tous les creneaux (accepter/rejeter avec motif) |
| **ModifyChoiceModal** | Modifier reponse creneau precedente |
| **CompletionDialog** | Rapport d'intervention (requis) + rappel photos/facture |
| **DocumentPreviewModal** | Apercu in-app + download |

### 17.4 Types de Documents Prestataire
- `photo_avant` — Photo avant intervention
- `photo_apres` — Photo apres intervention
- `facture` — Facture
- `devis` — Devis
- `bon_de_commande` — Bon de commande
- `certificat` — Certificat
- `garantie` — Garantie

---

## 18. Profil Utilisateur (Tous roles)

**Routes** : `/{role}/profile`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| PRO-01 | Voir informations personnelles | Nom, prenom, email, telephone |
| PRO-02 | Modifier informations | Edition nom, prenom, email, telephone |
| PRO-03 | Changer mot de passe | Modal : ancien mdp, nouveau, confirmation |
| PRO-04 | Avatar | Photo circulaire + bouton "Changer" avec upload (JPG/PNG/WebP, max 5MB) |

**Sections** :
- **Avatar** : affichage large, bouton camera, upload fichier
- **Info de base** : badge role (avec icone specifique + couleur), titre et description role
- **Champs editables** : prenom (requis), nom (requis), telephone (optionnel), email (lecture seule + bouton "Changer")
- **Securite** : bouton "Changer mot de passe" → modal, bouton "Changer email" → modal avec verification
- **Section specifique prestataire** : infos societe, SIRET/TVA

**Boutons** : Sauvegarder (actif si modifie), Annuler, Retour dashboard.

---

## 19. Parametres & Preferences (Tous roles)

**Routes** : `/{role}/parametres`

| ID | User Story | Elements UI |
|----|-----------|-------------|
| SET-01 | Parametres de notification | Toggle notifications email/plateforme |
| SET-02 | Preferences compte | Section parametres utilisateur |
| SET-03 | Installer l'application | Lien/bouton installation PWA |

**Sections universelles** :
1. **Installation PWA** — Bouton "Installer SEIDO" avec instructions
2. **Notifications Push** — Toggle enable/disable, demande permission navigateur

**Section gestionnaire uniquement** :
3. **Parametres Email** — Connexions email, sync, blacklist
4. **Abonnement/Facturation** — (voir section 21)

---

## 20. Notifications (Tous roles)

**Routes** : `/{role}/notifications`

### 20.1 Centre de Notifications

| Ecran | Elements UI |
|-------|-------------|
| Liste notifications | Icone, titre, description, horodatage relatif, indicateur lu/non-lu, badge type |
| Actions par notification | Click → navigation vers entite, Marquer lu/non-lu, Archiver |
| Actions globales | "Tout marquer comme lu", Rafraichir |
| Etats | Skeleton loading, etat vide, erreur avec retry |

**Onglets gestionnaire** :
- Notifications equipe (notifications pour les membres)
- Notifications personnelles

**Mise a jour temps reel** : WebSocket pour nouvelles notifications.

### 20.2 Popover Notifications (Header)

| Ecran | Elements UI |
|-------|-------------|
| Cloche avec badge | Compteur non-lus en temps reel |
| Popover (10 dernieres) | Icone, titre, date par notification |
| Actions | Marquer lu, "Tout marquer lu", "Voir tout" → page notifications |

### 20.3 Types de Notifications (Prestataire)
- Nouvelle intervention assignee
- Gestionnaire demande devis
- Devis accepte/rejete
- Nouveau creneau propose
- Creneau confirme
- Nouveau message (group / provider_to_managers)
- Intervention cloturee

---

## 21. Abonnement & Facturation (Gestionnaire)

> **HORS CSV** — Partiellement couvert par les stories, complete par le code.

**Route** : `/gestionnaire/settings/billing`

### 21.1 Informations Abonnement

| ID | User Story | Elements UI |
|----|-----------|-------------|
| ABO-01 | Voir periode essai/abonnement | Badge trial/actif dans sidebar |
| ABO-02 | Voir les offres d'abonnement | Cards plans tarifaires |
| ABO-03 | Choisir/modifier abonnement | Selection plan + checkout Stripe |

### 21.2 Page Facturation (hors CSV)

| Ecran | Elements UI |
|-------|-------------|
| Plan actuel | Nom plan, prix, date renouvellement |
| Statut abonnement | Actif, trial, expire, pause |
| Metriques d'usage | Lots actuels vs limite plan, proprietes facturables, membres equipe |
| Options | Upgrade/downgrade, historique facturation, methode paiement |

**Composants** :
- `SubscriptionSummaryCard` — Resume plan + cout + date renouvellement
- `SubscriptionManagementSection` — UI upgrade/downgrade
- `SubscriptionBanners` — Alertes expiration trial, echec paiement
- `SubscriptionLimitPage` — "Upgrader pour ajouter des proprietes"
- `SubscriptionSidebarCard` — Mini widget dans sidebar

### 21.3 Elements UI Abonnement dans l'App (hors page billing)

| Composant | Emplacement | Fonction |
|-----------|-------------|----------|
| `SubscriptionSidebarCard` | Sidebar gestionnaire (footer) | Mini-card : plan actuel, lots utilises/limite, bouton upgrade |
| `SubscriptionBanners` | Haut de toutes pages gestionnaire | Alertes : trial expirant, echec paiement, social proof equipes actives |
| `UpgradeModal` | Declenchee a la creation lot/contact | S'affiche si lot depasse la limite du plan, propose upgrade |
| `SubscriptionLimitPage` | Page plein ecran | "Upgrader pour ajouter des proprietes" quand limite atteinte |

### 21.4 Integration Stripe
- Checkout Stripe pour paiement
- Gestion abonnement via portal Stripe
- Webhooks : checkout complete, subscription created/updated/deleted/paused, invoice paid/failed
- Plans : Essai gratuit (14j) → 5EUR/lot/mois ou 50EUR/lot/an

---

## 22. Proprietaire (Lecture seule)

> **HORS CSV** — Role complet non couvert par les user stories originales.

**Routes** : `/proprietaire/*`

### 22.1 Dashboard Proprietaire
**Route** : `/proprietaire/dashboard`

| Ecran | Elements UI |
|-------|-------------|
| Card "Mes Biens" | Lien vers `/proprietaire/biens` avec icone Building |
| Card "Mes Interventions" | Lien vers `/proprietaire/interventions` avec icone Wrench |
| Card "Mon Equipe" | Infos sur l'equipe de gestion |
| Disclaimer | Banniere indiquant l'acces en lecture seule |

### 22.2 Mes Biens
**Route** : `/proprietaire/biens`

| Ecran | Elements UI |
|-------|-------------|
| Section Immeubles | Cards des immeubles dont le proprietaire est assigne (lecture seule) |
| Section Lots | Cards des lots associes (lecture seule) |
| Disclaimer | Banniere acces lecture seule |

**Pas d'actions** : Aucun bouton creation, edition ou suppression.

### 22.3 Mes Interventions
**Route** : `/proprietaire/interventions`

| Ecran | Elements UI |
|-------|-------------|
| Liste interventions | Interventions ou le proprietaire est assigne comme participant |
| Participation | Peut participer de maniere similaire aux prestataires (messages, documents) |

### 22.4 Limites du Role

| Feature | Disponible |
|---------|:---:|
| Profil | Non (pas de page `/proprietaire/profile`) |
| Parametres | Non (pas de page `/proprietaire/parametres`) |
| Notifications | Non (pas de page dediee) |
| Creation/Edition | Non (lecture seule) |

> **Note pour la designer** : Ce role est minimaliste — 3 pages sans navigation standard (pas de sidebar ni header complet). A confirmer si des pages profil/notifications doivent etre ajoutees.

---

## 23. Administration (Admin)

> **HORS CSV** — Aucune story pour l'admin dans les CSV.

**Routes** : `/admin/*`

### 23.1 Dashboard Admin
**Route** : `/admin/dashboard`

| Ecran | Elements UI |
|-------|-------------|
| KPIs systeme | Total utilisateurs, equipes, proprietes, interventions |
| Graphiques | Stats d'utilisation, activite |
| Vue d'ensemble | Metriques globales |

### 23.2 Gestion Utilisateurs
**Route** : `/admin/users`

| Ecran | Elements UI |
|-------|-------------|
| Liste utilisateurs | CRUD utilisateurs avec filtres |
| Assignation roles | Modifier role utilisateur |
| Assignation equipes | Affecter a une equipe |
| Impersonation | Se connecter en tant qu'un utilisateur |

### 23.3 Types d'Interventions
**Route** : `/admin/intervention-types`

| Ecran | Elements UI |
|-------|-------------|
| Categories | Gestion des categories de type (plomberie, electricite...) |
| Types | CRUD types d'intervention par categorie |

### 23.4 Banniere Impersonation (hors CSV)
- Banniere orange fixe en bas de page quand admin se connecte en tant qu'un autre user
- Affiche : nom utilisateur impersonne, email admin original (desktop)
- Bouton "Retourner a mon compte"
- Minimisable en petit badge

---

## 24. PWA & Installation

> **HORS CSV** — Mentionne dans une story (SET-03), mais le systeme est bien plus complet.

### 24.1 Composants PWA

| Composant | Fonction |
|-----------|----------|
| `InstallPWAButton` | Bouton dans sidebar/menu pour installer l'app |
| `InstallPWAHeaderButton` | Bouton dans le header/topbar |
| `PWAInstallBanner` | Banniere plein ecran incitant a installer |
| `PWAInstallPromptModal` | Modal avec instructions d'installation |
| `PWABannerWrapper` | Coordinateur affichage/masquage bannieres |

### 24.2 Service Worker
- Gestion notifications push entrantes
- Affichage notifications systeme avec boutons d'action
- Routage clics notification vers la bonne page
- Enregistrement automatique + mise a jour horaire

### 24.3 Detection Mobile
- Evenement `beforeinstallprompt` (Chrome/Android)
- Instructions specifiques iOS (Safari)
- Timing : apparait apres navigation (pas sur landing page)
- Frequence : une fois par session

---

## 25. Composants Transversaux

### 25.1 Cookie Consent (RGPD)

| Ecran | Elements UI |
|-------|-------------|
| Banniere cookie | En bas de page, 3 options : Accepter tout, Refuser, Personnaliser |
| Personnalisation | Toggles : Essentiels (toujours on), Analytics, Marketing, Fonctionnels |

### 25.2 Indicateur de Connexion

| Ecran | Elements UI |
|-------|-------------|
| Online | Icone WiFi verte (discret) |
| Offline | Alerte fixe en haut-droite + bouton "Reconnecter" + animation pulsante |

### 25.3 Selecteur d'Equipe (Multi-team)

| Ecran | Elements UI |
|-------|-------------|
| Dropdown equipe | Dans sidebar (gestionnaire) ou header (prestataire) |
| Options | Liste equipes + "Toutes les equipes" (vue consolidee) |
| Action | Switch equipe → rafraichit la page |

### 25.4 Formulaire Demo
**Route** : `/demo` (ou modal depuis landing page)

| ID | User Story | Elements UI |
|----|-----------|-------------|
| DEM-01 | Demander une demonstration | Formulaire lead generation |
| DEM-02 | Informations visiteur | Nom, email, entreprise, message |

### 25.5 Page d'Aide
**Route** : `/gestionnaire/aide`

| Ecran | Elements UI |
|-------|-------------|
| Contenu aide | FAQ, documentation, support |
| Widget feedback | Integration Frill pour feedback utilisateur |

### 25.6 Pages d'Erreur

| Page | Elements UI |
|------|-------------|
| **Error Boundary** (par role) | Icone erreur, titre, message, boutons : Reessayer, Dashboard, Page precedente |
| **404 Not Found** (par role) | Icone fichier ?, "Page non trouvee", boutons navigation |

### 25.7 Systeme de Toast
- Notifications inline pour feedback actions (succes, erreur, info)
- Via Sonner (toast library)
- Position : coin superieur droit

### 25.8 Systeme de Documents (Cross-role)

| Composant | Fonction |
|-----------|----------|
| `DocumentFileAttachment` | Upload avec zone drag-and-drop |
| `PropertyDocumentsPanel` | GED pour documents propriete |
| `DocumentSlotGeneric` | Upload par type (assurances, contrats...) |
| `DocumentChecklistGeneric` | Checklist documents requis |

**Stockage** : S3 buckets avec RLS Supabase. Limite : ~25MB par fichier.

---

## 26. Import de Donnees

> **HORS CSV** — Une seule story mentionne l'import, mais c'est un wizard complet.

**Route** : `/gestionnaire/import`

### 26.1 Wizard d'Import (5 etapes)

| Etape | Ecran |
|-------|-------|
| 1. Upload | Selection fichier CSV/Excel |
| 2. Mapping | Correspondance colonnes fichier ↔ champs entite |
| 3. Preview | Validation des donnees avant import |
| 4. Execution | Traitement batch avec barre de progression |
| 5. Resultats | Resume succes/erreurs |

### 26.2 Entites Importables
- Immeubles
- Lots
- Contacts
- Contrats

### 26.3 Features
- Telechargement templates par type d'entite
- Validation regles metier
- Detection doublons
- Rapport d'erreurs detaille
- Import partiel (lignes invalides ignorees)

---

## 27. Annexes

### 27.1 Design System

| Element | Specification |
|---------|--------------|
| **Couleurs** | Systeme OKLCH (contraste accessible) |
| **Typographie** | Geist Sans (corps), Geist Mono (code) |
| **Icones** | Lucide React exclusivement |
| **Composants** | 77 composants shadcn/ui + extensions custom |
| **Espacement** | Echelle Tailwind (unites 4px) |
| **Ombres** | Systeme de profondeur coherent |
| **Animations** | Utilitaires Tailwind + keyframes custom |
| **Dark Mode** | Support via classes Tailwind `dark:` |

### 27.2 Responsive Breakpoints

| Breakpoint | Cible | Comportements |
|------------|-------|--------------|
| < 640px | Mobile | Navigation simplifiee, colonnes empilees, boutons CTA adaptatifs |
| 640-768px | Tablette portrait | Sidebar auto-collapse, tabs → dropdown |
| 768-1024px | Tablette paysage | Layout hybride |
| > 1024px | Desktop | Layout complet avec sidebar + topbar |

### 27.3 Etats de Chargement

| Pattern | Usage |
|---------|-------|
| `PageSkeleton variant="dashboard"` | Dashboards |
| `PageSkeleton variant="form"` | Pages profil/formulaires |
| Cards skeleton | Detail pages |
| Spinner sur boutons | Soumission formulaires |
| Skeleton components | Contenu asynchrone |

### 27.4 Notifications Email (Backend)

| Evenement | Email envoye |
|-----------|-------------|
| Intervention creee | Notification aux participants |
| Intervention planifiee | Confirmation date |
| Changement statut intervention | Mise a jour statut |
| Intervention terminee | Rapport de cloture |
| Creneaux proposes | Notification selection |
| Nouveau message (conversation) | Alerte message |
| Devis soumis/valide | Notification devis |
| Trial expire bientot | Avertissement 3j avant |
| Abonnement modifie | Confirmation |

### 27.5 Cron Jobs (Backend, invisible UI)

| Job | Frequence | Effet visible |
|-----|-----------|---------------|
| Sync emails | Horaire | Nouveaux emails dans boite |
| Rappels interventions | TBD | Notifications de rappel |
| Notifications trial | Quotidien | Banniere trial expirant |
| Expiration trial | Quotidien | Desactivation acces |
| Triggers comportementaux | Horaire | Emails contextuels |

### 27.6 Cartographie des Ecrans par Role

| Ecran | Gestionnaire | Locataire | Prestataire | Proprietaire | Admin |
|-------|:---:|:---:|:---:|:---:|:---:|
| Landing Page | - | - | - | - | - |
| Login/Signup | X | X | X | X | X |
| Dashboard | X | X | X | X | X |
| Patrimoine (liste) | X | - | - | X (lecture) | - |
| Immeuble detail | X | - | - | - | - |
| Lot detail | X | X | - | - | - |
| Contacts | X | - | - | - | - |
| Societes | X | - | - | - | - |
| Contrats (liste) | X | - | - | - | - |
| Contrat detail | X | X (limite) | - | - | - |
| Interventions (liste) | X | X | X | X | - |
| Intervention creation | X | X | - | - | - |
| Intervention detail | X | X | X | - | - |
| Calendrier interventions | X | - | - | - | - |
| Emails (boite mail) | X | - | - | - | - |
| Notifications | X | X | X | - | X |
| Profil | X | X | X | - | X |
| Parametres | X | X | X | - | X |
| Abonnement/Billing | X | - | - | - | - |
| Import donnees | X | - | - | - | - |
| Gestion utilisateurs | - | - | - | - | X |
| Types interventions | - | - | - | - | X |
| Aide | X | - | - | - | - |

### 27.7 Recapitulatif des Stories par Module

| Module | Stories CSV | Features Code (hors CSV) | Total |
|--------|:---:|:---:|:---:|
| Landing Page | 16 | 3 (stats, temoignages, blog) | 19 |
| Authentification | 9 | 6 (OAuth, set-password, complete-profile, callback, beta, unauthorized) | 15 |
| Demo | 2 | 0 | 2 |
| Dashboard Gestionnaire | 8 | 3 (KPIs detailles, graphiques, multi-team) | 11 |
| Patrimoine | 24 | 4 (Google Maps, wizard, subscription gating, lot independant) | 28 |
| Contacts | 23 | 3 (onglet invitations, prefill type, statut compte) | 26 |
| Contrats | 17 | 3 (transitions auto, notifications expiration, templates) | 20 |
| Interventions Gestionnaire | 23 | 8 (9 statuts, modes assignation, 3 threads, modales, lazy loading) | 31 |
| Email System | 2 | 15 (boite complete, sync, blacklist, threading, entites liees) | 17 |
| Dashboard Locataire | 8 | 4 (selecteur propriete, multi-contrat, etats speciaux, unread) | 12 |
| Interventions Locataire | 12 | 5 (4 onglets, rapports, bannieres confirmation, 3 modales) | 17 |
| Contrat Locataire | 9 | 2 (detail lot, navigation contrats) | 11 |
| Dashboard Prestataire | 3 | 4 (5 onglets, stats, multi-team, tri) | 7 |
| Interventions Prestataire | 8 | 12 (3 onglets, 7 modales, types documents, actions contextuelles, instructions, confirmation) | 20 |
| Profil | 6 | 3 (avatar upload, change email modal, infos societe) | 9 |
| Parametres | 4 | 3 (PWA, push toggle, email settings) | 7 |
| Notifications | 1 | 5 (centre complet, popover, temps reel, types, onglets) | 6 |
| Abonnement | 3 | 6 (page billing, Stripe, metriques, bannieres, limites) | 9 |
| Admin | 0 | 6 (dashboard, users, types, impersonation, profil, settings) | 6 |
| PWA | 1 | 5 (composants multiples, service worker, detection mobile) | 6 |
| Import | 1 | 4 (wizard 5 etapes, templates, validation, rapport) | 5 |
| Transversaux | 0 | 8 (cookie consent, connexion, equipe, erreurs, toast, documents) | 8 |
| Blog | 0 | 2 (index, article) | 2 |
| Proprietaire | 0 | 4 (dashboard, biens, interventions, limites role) | 4 |
| Pages Legales | 0 | 3 (CGU, confidentialite, cookies) | 3 |
| Calendrier | 0 | 1 (vue calendrier interventions) | 1 |
| Google Maps | 0 | 3 (address picker, map preview, provider) | 3 |
| **TOTAL** | **~180** | **~120** | **~300** |

---

> **Note pour la designer** : Ce document couvre **~300 ecrans/fonctionnalites** au total. Les ~180 stories originales des CSV ne representent que ~60% de l'application reelle. Les ~120 fonctionnalites supplementaires identifiees dans le code sont marquees "HORS CSV" ou integrees dans les sections avec la mention "supplementaire". Chaque ecran liste les elements UI a designer, les interactions, les etats (loading, erreur, vide), et les regles de responsive.
>
> **Points d'attention :**
> - L'onglet "Localisation" (carte Google Maps) existe dans le code des details interventions locataire et prestataire mais n'est **pas accessible** (code orphelin). A confirmer s'il doit etre integre au design.
> - Le role **Proprietaire** est minimaliste (3 pages, pas de profil/notifications). A confirmer si des pages supplementaires sont prevues.
> - Le **calendrier des interventions** (vue BigCalendar) est present dans le code gestionnaire mais son integration exacte dans la navigation est a confirmer.
