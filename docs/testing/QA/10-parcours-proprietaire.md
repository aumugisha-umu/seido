# Parcours E2E Proprietaire - SEIDO

> **Role** : Proprietaire (5% des utilisateurs)
> **Focus** : Consultation patrimoine, suivi interventions (lecture seule)
> **Priorite** : P3 - Important pour la transparence
> **UX** : Interface professionnelle, donnees consolidees, pas d'actions de modification

---

## 1. Connexion et Dashboard

### 1.1 Parcours : Premiere Connexion via Invitation

**Preconditions** : Invitation recue par email du gestionnaire

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Email | Cliquer lien invitation | Page set-password | ☐ |
| 2 | Password | Creer mot de passe | Validation force | ☐ |
| 3 | Confirmation | Confirmer password | Match valide | ☐ |
| 4 | Submit | Valider | Compte active | ☐ |
| 5 | Redirection | | Dashboard proprietaire | ☐ |
| 6 | Verification | Role = proprietaire | Acces lecture seule | ☐ |

### 1.2 Parcours : Connexion Standard

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Login | `/auth/login` | Page login | ☐ |
| 2 | Credentials | Entrer email/password | Validation | ☐ |
| 3 | Submit | Se connecter | Redirection dashboard | ☐ |
| 4 | Dashboard | Verifier | Vue patrimoine | ☐ |

### 1.3 Parcours : Dashboard Proprietaire

| # | Element | Verification | Status |
|---|---------|--------------|--------|
| 1.3.1 | Vue patrimoine | Nombre total de biens | ☐ |
| 1.3.2 | Statistiques | KPIs consolides | ☐ |
| 1.3.3 | Interventions | Nombre en cours visible | ☐ |
| 1.3.4 | Occupation | Taux d'occupation (si dispo) | ☐ |
| 1.3.5 | Navigation | Liens vers sections | ☐ |
| 1.3.6 | **Pas de bouton "Creer"** | Aucune action de creation | ☐ |

---

## 2. Consultation des Biens

### 2.1 Parcours : Liste des Biens

**Preconditions** : Connecte en tant que proprietaire

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Cliquer "Biens" dans menu | Liste biens | ☐ |
| 2 | Liste | Voir biens | Immeubles et lots visibles | ☐ |
| 3 | Filtres | Utiliser filtres | Resultats filtres | ☐ |
| 4 | Recherche | Chercher par nom/adresse | Resultats pertinents | ☐ |
| 5 | **Verification** | **PAS de bouton "Nouveau"** | Bouton absent | ☐ |

### 2.2 Parcours : Detail d'un Immeuble

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Selection | Cliquer sur un immeuble | Page detail | ☐ |
| 2 | Informations | Voir infos generales | Adresse, caracteristiques | ☐ |
| 3 | Lots | Liste des lots | Tous lots visibles | ☐ |
| 4 | Occupation | Statut occupation lots | Occupe/Vacant visible | ☐ |
| 5 | Documents | Section documents | Documents consultables | ☐ |
| 6 | **Verification** | **PAS de bouton "Modifier"** | Bouton absent | ☐ |
| 7 | **Verification** | **PAS de bouton "Supprimer"** | Bouton absent | ☐ |

### 2.3 Parcours : Detail d'un Lot

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Selection | Cliquer sur un lot | Page detail lot | ☐ |
| 2 | Informations | Voir caracteristiques | Surface, pieces, etage | ☐ |
| 3 | Locataire | Voir locataire actuel | Nom (si occupe) | ☐ |
| 4 | Contrat | Voir dates contrat | Debut/fin visible | ☐ |
| 5 | Interventions | Historique interventions | Liste interventions liees | ☐ |
| 6 | **Verification** | **PAS de bouton "Modifier"** | Bouton absent | ☐ |

---

## 3. Consultation des Interventions

### 3.1 Parcours : Liste des Interventions

**Preconditions** : Connecte en tant que proprietaire

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Cliquer "Interventions" | Liste interventions | ☐ |
| 2 | Liste | Voir toutes interventions | Interventions du patrimoine | ☐ |
| 3 | Filtres statut | Filtrer par statut | En cours, terminees, etc. | ☐ |
| 4 | Filtres bien | Filtrer par bien | Interventions du bien | ☐ |
| 5 | Recherche | Chercher par mot-cle | Resultats pertinents | ☐ |
| 6 | Tri | Trier par date | Ordre correct | ☐ |
| 7 | **Verification** | **PAS de bouton "Nouvelle"** | Bouton absent | ☐ |

### 3.2 Parcours : Detail d'une Intervention

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Selection | Cliquer sur intervention | Page detail | ☐ |
| 2 | Informations | Voir description | Description complete | ☐ |
| 3 | Statut | Voir statut actuel | Badge statut visible | ☐ |
| 4 | Bien | Voir bien concerne | Lien vers immeuble/lot | ☐ |
| 5 | Timeline | Historique actions | Timeline complete | ☐ |
| 6 | Prestataire | Voir prestataire | Nom prestataire | ☐ |
| 7 | Devis | Voir devis valide | Montant visible | ☐ |
| 8 | Couts | Voir couts totaux | Montants visibles | ☐ |
| 9 | Documents | Photos/Documents | Consultables | ☐ |
| 10 | **Verification** | **PAS d'actions** | Aucun bouton action | ☐ |

### 3.3 Parcours : Consultation Devis

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Section devis | Ouvrir section devis | Liste devis visibles | ☐ |
| 2 | Detail devis | Voir un devis | Montant, description | ☐ |
| 3 | Statut devis | Voir statut | Valide/Refuse/En attente | ☐ |
| 4 | **Verification** | **PAS de validation** | Aucune action possible | ☐ |

---

## 4. Verifications Lecture Seule

### 4.1 Tests Actions Interdites

**Objectif** : Verifier qu'aucune action de modification n'est possible

| # | Page | Element Interdit | Verification | Status |
|---|------|------------------|--------------|--------|
| 4.1.1 | Dashboard | Bouton "Nouveau bien" | Absent | ☐ |
| 4.1.2 | Dashboard | Bouton "Nouvelle intervention" | Absent | ☐ |
| 4.1.3 | Liste Biens | Bouton "Ajouter" | Absent | ☐ |
| 4.1.4 | Detail Immeuble | Bouton "Modifier" | Absent | ☐ |
| 4.1.5 | Detail Immeuble | Bouton "Supprimer" | Absent | ☐ |
| 4.1.6 | Detail Lot | Bouton "Modifier" | Absent | ☐ |
| 4.1.7 | Liste Interventions | Bouton "Creer" | Absent | ☐ |
| 4.1.8 | Detail Intervention | Boutons d'action | Absents | ☐ |
| 4.1.9 | Detail Intervention | Validation devis | Impossible | ☐ |
| 4.1.10 | Detail Intervention | Changement statut | Impossible | ☐ |

### 4.2 Tests URL Directes (Securite)

**Objectif** : Verifier que l'acces direct aux URLs de modification est refuse

| # | URL Tentee | Resultat Attendu | Status |
|---|------------|------------------|--------|
| 4.2.1 | `/gestionnaire/biens/immeubles/nouveau` | Redirection ou 403 | ☐ |
| 4.2.2 | `/gestionnaire/biens/lots/nouveau` | Redirection ou 403 | ☐ |
| 4.2.3 | `/gestionnaire/interventions/nouvelle-intervention` | Redirection ou 403 | ☐ |
| 4.2.4 | `/gestionnaire/contacts/nouveau` | Redirection ou 403 | ☐ |

---

## 5. Navigation et UX

### 5.1 Parcours : Navigation Complete

| # | Etape | Action | Resultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Menu | Ouvrir menu lateral | Menu visible | ☐ |
| 2 | Dashboard | Cliquer Dashboard | Page dashboard | ☐ |
| 3 | Biens | Cliquer Biens | Liste biens | ☐ |
| 4 | Interventions | Cliquer Interventions | Liste interventions | ☐ |
| 5 | Breadcrumb | Navigation fil d'ariane | Fonctionne | ☐ |
| 6 | Retour | Bouton retour | Navigation correcte | ☐ |

### 5.2 Verification UX Proprietaire

| # | Element UX | Verification | Status |
|---|------------|--------------|--------|
| 5.2.1 | Interface | Claire et professionnelle | ☐ |
| 5.2.2 | Donnees | Consolidees et lisibles | ☐ |
| 5.2.3 | Lecture seule | Clairement indiquee | ☐ |
| 5.2.4 | Navigation | Intuitive | ☐ |
| 5.2.5 | Responsive | Mobile fonctionnel | ☐ |

---

## 6. Tests Mobile

### 6.1 Parcours Mobile

| # | Test | Verification | Status |
|---|------|--------------|--------|
| 6.1.1 | Login | Fonctionne sur mobile | ☐ |
| 6.1.2 | Dashboard | Lisible 375px | ☐ |
| 6.1.3 | Navigation | Menu hamburger | ☐ |
| 6.1.4 | Liste biens | Scroll vertical | ☐ |
| 6.1.5 | Detail | Informations accessibles | ☐ |
| 6.1.6 | Filtres | Utilisables sur mobile | ☐ |

---

## 7. Cas d'Erreur

### 7.1 Gestion Erreurs

| # | Scenario | Comportement Attendu | Status |
|---|----------|----------------------|--------|
| 7.1.1 | Bien inexistant | Page 404 ou message | ☐ |
| 7.1.2 | Intervention d'un autre patrimoine | Acces refuse | ☐ |
| 7.1.3 | Session expiree | Redirection login | ☐ |
| 7.1.4 | Erreur serveur | Message d'erreur clair | ☐ |

---

## Resume Parcours Proprietaire

| Parcours | Etapes | Testees | Bugs |
|----------|--------|---------|------|
| Connexion | 6 | ☐ | |
| Dashboard | 6 | ☐ | |
| Consultation Biens | 13 | ☐ | |
| Consultation Interventions | 17 | ☐ | |
| Verification Lecture Seule | 14 | ☐ | |
| Navigation UX | 11 | ☐ | |
| Mobile | 6 | ☐ | |
| Erreurs | 4 | ☐ | |
| **TOTAL** | **77** | | |

---

## Points Critiques Proprietaire

### Securite Lecture Seule

> **IMPORTANT** : Le role Proprietaire ne doit **JAMAIS** pouvoir :
> - Creer des biens, lots, contacts ou interventions
> - Modifier des donnees existantes
> - Supprimer des elements
> - Valider ou rejeter des devis
> - Changer le statut d'une intervention
> - Assigner des prestataires

### Donnees Accessibles

Le Proprietaire doit pouvoir **consulter** :
- Tous les biens de son patrimoine
- Tous les lots et leur occupation
- Toutes les interventions (statut, historique, couts)
- Les devis valides et leur montant
- Les documents associes

---

**Testeur** : _________________
**Date** : _________________
**Device** : ☐ Desktop / ☐ Tablet / ☐ Mobile
