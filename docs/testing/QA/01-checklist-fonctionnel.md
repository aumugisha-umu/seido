# Checklist Fonctionnel - SEIDO

> **Objectif** : Tester exhaustivement chaque page et fonctionnalité de l'application.
> **Méthode** : Cocher chaque item après vérification.
> **Notation** : ✅ OK | ❌ Bug | ⚠️ À améliorer | ⏭️ Non applicable

---

## Instructions Générales

Pour **chaque page**, vérifier systématiquement :
1. ☐ Page charge sans erreur console (F12 > Console)
2. ☐ Données affichées correctement
3. ☐ Toutes les actions fonctionnent
4. ☐ États vides gérés (message approprié)
5. ☐ États d'erreur gérés (toast/message)
6. ☐ Loading states présents
7. ☐ Responsive : Mobile (375px) / Tablet (768px) / Desktop (1440px)

---

## 1. Pages Publiques

### 1.1 Landing Page `/`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.1.1 | Header visible avec logo SEIDO | ☐ | |
| 1.1.2 | Navigation vers login/signup | ☐ | |
| 1.1.3 | Sections de présentation | ☐ | |
| 1.1.4 | CTA (Call to Action) fonctionnel | ☐ | |
| 1.1.5 | Footer avec liens légaux | ☐ | |
| 1.1.6 | Responsive mobile | ☐ | |
| 1.1.7 | Performance (LCP < 3s) | ☐ | |

### 1.2 Login `/auth/login`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.2.1 | Formulaire email/password visible | ☐ | |
| 1.2.2 | Validation email format | ☐ | |
| 1.2.3 | Validation password requis | ☐ | |
| 1.2.4 | Bouton "Se connecter" désactivé si invalide | ☐ | |
| 1.2.5 | Loading state pendant connexion | ☐ | |
| 1.2.6 | Erreur si credentials invalides | ☐ | |
| 1.2.7 | Redirection après login réussi | ☐ | |
| 1.2.8 | Lien "Mot de passe oublié" | ☐ | |
| 1.2.9 | Lien vers inscription | ☐ | |
| 1.2.10 | Remember me (si présent) | ☐ | |

### 1.3 Signup `/auth/signup`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.3.1 | Formulaire complet (nom, email, password) | ☐ | |
| 1.3.2 | Validation email format | ☐ | |
| 1.3.3 | Validation force password | ☐ | |
| 1.3.4 | Confirmation password match | ☐ | |
| 1.3.5 | Sélection du rôle (si applicable) | ☐ | |
| 1.3.6 | CGU/Confidentialité checkbox | ☐ | |
| 1.3.7 | Message succès après inscription | ☐ | |
| 1.3.8 | Email de confirmation envoyé | ☐ | |

### 1.4 Reset Password `/auth/reset-password`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.4.1 | Champ email visible | ☐ | |
| 1.4.2 | Validation email | ☐ | |
| 1.4.3 | Message de confirmation envoi | ☐ | |
| 1.4.4 | Email reçu avec lien valide | ☐ | |

### 1.5 Set/Update Password `/auth/set-password`, `/auth/update-password`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.5.1 | Champs nouveau password + confirmation | ☐ | |
| 1.5.2 | Validation force password | ☐ | |
| 1.5.3 | Message succès après changement | ☐ | |
| 1.5.4 | Redirection vers login | ☐ | |

### 1.6 Pages Légales

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.6.1 | CGU `/terms` accessible | ☐ | |
| 1.6.2 | Confidentialité `/privacy` accessible | ☐ | |
| 1.6.3 | Contenu lisible et formaté | ☐ | |

### 1.7 Signup Success `/auth/signup-success`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.7.1 | Message de confirmation visible | ☐ | |
| 1.7.2 | Instructions vérification email | ☐ | |
| 1.7.3 | Lien vers login | ☐ | |

### 1.8 Logout `/auth/logout`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.8.1 | Déconnexion effective | ☐ | |
| 1.8.2 | Redirection vers login | ☐ | |
| 1.8.3 | Session terminée | ☐ | |

### 1.9 Beta Thank You `/auth/beta-thank-you`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.9.1 | Message remerciement visible | ☐ | |
| 1.9.2 | Instructions prochaines étapes | ☐ | |

### 1.10 Callback `/auth/callback`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.10.1 | Gestion OAuth callback | ☐ | |
| 1.10.2 | Redirection appropriée | ☐ | |
| 1.10.3 | Gestion erreurs auth | ☐ | |

### 1.11 Confirm `/auth/confirm`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.11.1 | Confirmation email réussie | ☐ | |
| 1.11.2 | Message succès | ☐ | |
| 1.11.3 | Redirection vers dashboard | ☐ | |

### 1.12 Error `/auth/error`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.12.1 | Message erreur clair | ☐ | |
| 1.12.2 | Lien retour login | ☐ | |
| 1.12.3 | Support contact (si dispo) | ☐ | |

### 1.13 Unauthorized `/auth/unauthorized`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.13.1 | Message accès refusé | ☐ | |
| 1.13.2 | Explication claire | ☐ | |
| 1.13.3 | Lien vers dashboard autorisé | ☐ | |

---

## 2. Gestionnaire (27 pages)

### 2.1 Dashboard `/gestionnaire/dashboard`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.1.1 | KPIs visibles (interventions, biens, etc.) | ☐ | |
| 2.1.2 | Interventions urgentes en évidence | ☐ | |
| 2.1.3 | Actions rapides accessibles | ☐ | |
| 2.1.4 | Navigation vers sections principales | ☐ | |
| 2.1.5 | Données correctement calculées | ☐ | |
| 2.1.6 | Refresh des données | ☐ | |
| 2.1.7 | Graphiques/stats (si présents) | ☐ | |
| 2.1.8 | Notifications badge | ☐ | |
| 2.1.9 | Performance chargement < 3s | ☐ | |
| 2.1.10 | Responsive mobile | ☐ | |

### 2.2 Biens - Liste `/gestionnaire/biens`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.2.1 | Liste immeubles visible | ☐ | |
| 2.2.2 | Liste lots visible | ☐ | |
| 2.2.3 | Tabs/filtres fonctionnels | ☐ | |
| 2.2.4 | Recherche fonctionnelle | ☐ | |
| 2.2.5 | Tri par colonnes | ☐ | |
| 2.2.6 | Pagination (si > 20 items) | ☐ | |
| 2.2.7 | Bouton "Nouveau bien" visible | ☐ | |
| 2.2.8 | Click sur item → détail | ☐ | |
| 2.2.9 | État vide si aucun bien | ☐ | |
| 2.2.10 | Actions rapides (menu contextuel) | ☐ | |

### 2.3 Immeubles - Nouveau `/gestionnaire/biens/immeubles/nouveau`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.3.1 | Formulaire multi-étapes visible | ☐ | |
| 2.3.2 | Step 1: Informations générales | ☐ | |
| 2.3.3 | Step 2: Adresse (autocomplete si dispo) | ☐ | |
| 2.3.4 | Step 3: Contacts (sélection/création) | ☐ | |
| 2.3.5 | Step 4: Documents (upload optionnel) | ☐ | |
| 2.3.6 | Validation chaque étape | ☐ | |
| 2.3.7 | Navigation précédent/suivant | ☐ | |
| 2.3.8 | Preview avant création | ☐ | |
| 2.3.9 | Création réussie → redirection | ☐ | |
| 2.3.10 | Toast confirmation | ☐ | |
| 2.3.11 | Gestion erreurs serveur | ☐ | |

### 2.4 Immeubles - Détail `/gestionnaire/biens/immeubles/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.4.1 | Header avec nom immeuble | ☐ | |
| 2.4.2 | Breadcrumb navigation | ☐ | |
| 2.4.3 | Informations générales | ☐ | |
| 2.4.4 | Adresse complète | ☐ | |
| 2.4.5 | Liste des lots associés | ☐ | |
| 2.4.6 | Contacts liés | ☐ | |
| 2.4.7 | Documents attachés | ☐ | |
| 2.4.8 | Bouton "Modifier" | ☐ | |
| 2.4.9 | Bouton "Ajouter un lot" | ☐ | |
| 2.4.10 | Historique/Timeline (si présent) | ☐ | |
| 2.4.11 | Actions: Supprimer (avec confirmation) | ☐ | |

### 2.5 Immeubles - Modifier `/gestionnaire/biens/immeubles/modifier/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.5.1 | Pré-remplissage des données | ☐ | |
| 2.5.2 | Modification possible | ☐ | |
| 2.5.3 | Validation des champs | ☐ | |
| 2.5.4 | Sauvegarde réussie | ☐ | |
| 2.5.5 | Toast confirmation | ☐ | |
| 2.5.6 | Bouton "Annuler" → retour | ☐ | |

### 2.6 Lots - Nouveau `/gestionnaire/biens/lots/nouveau`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.6.1 | Sélection immeuble parent | ☐ | |
| 2.6.2 | Informations du lot (nom, étage, etc.) | ☐ | |
| 2.6.3 | Catégorie lot (appartement, parking, etc.) | ☐ | |
| 2.6.4 | Surface, pièces | ☐ | |
| 2.6.5 | Contacts assignés | ☐ | |
| 2.6.6 | Documents | ☐ | |
| 2.6.7 | Création réussie | ☐ | |
| 2.6.8 | Redirection vers détail | ☐ | |

### 2.7 Lots - Détail `/gestionnaire/biens/lots/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.7.1 | Header avec infos lot | ☐ | |
| 2.7.2 | Lien vers immeuble parent | ☐ | |
| 2.7.3 | Informations complètes | ☐ | |
| 2.7.4 | Locataire actuel (si contrat actif) | ☐ | |
| 2.7.5 | Contrats associés | ☐ | |
| 2.7.6 | Interventions liées | ☐ | |
| 2.7.7 | Documents | ☐ | |
| 2.7.8 | Actions: Modifier, Supprimer | ☐ | |

### 2.8 Lots - Modifier `/gestionnaire/biens/lots/modifier/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.8.1 | Pré-remplissage des données | ☐ | |
| 2.8.2 | Modification possible | ☐ | |
| 2.8.3 | Sauvegarde réussie | ☐ | |

### 2.9 Contacts - Liste `/gestionnaire/contacts`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.9.1 | Liste contacts visible | ☐ | |
| 2.9.2 | Liste sociétés visible | ☐ | |
| 2.9.3 | Tabs contacts/sociétés | ☐ | |
| 2.9.4 | Filtres par type (locataire, prestataire, etc.) | ☐ | |
| 2.9.5 | Recherche par nom/email | ☐ | |
| 2.9.6 | Bouton "Nouveau contact" | ☐ | |
| 2.9.7 | Click → détail contact | ☐ | |
| 2.9.8 | Badge statut invitation | ☐ | |
| 2.9.9 | Actions rapides | ☐ | |

### 2.10 Contacts - Nouveau `/gestionnaire/contacts/nouveau`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.10.1 | Type de contact (individu/société) | ☐ | |
| 2.10.2 | Informations: nom, prénom, email, téléphone | ☐ | |
| 2.10.3 | Rôle: locataire, prestataire, propriétaire | ☐ | |
| 2.10.4 | Catégorie prestataire (si applicable) | ☐ | |
| 2.10.5 | Association société existante | ☐ | |
| 2.10.6 | Option: Envoyer invitation | ☐ | |
| 2.10.7 | Validation email unique | ☐ | |
| 2.10.8 | Création réussie | ☐ | |
| 2.10.9 | Invitation envoyée (si cochée) | ☐ | |

### 2.11 Contacts - Détail `/gestionnaire/contacts/details/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.11.1 | Header avec nom contact | ☐ | |
| 2.11.2 | Photo/avatar | ☐ | |
| 2.11.3 | Informations complètes | ☐ | |
| 2.11.4 | Rôle et statut | ☐ | |
| 2.11.5 | Biens associés (immeubles/lots) | ☐ | |
| 2.11.6 | Interventions liées | ☐ | |
| 2.11.7 | Statut invitation | ☐ | |
| 2.11.8 | Actions: Modifier, Renvoyer invitation | ☐ | |
| 2.11.9 | Actions: Révoquer invitation | ☐ | |

### 2.12 Contacts - Modifier `/gestionnaire/contacts/modifier/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.12.1 | Pré-remplissage | ☐ | |
| 2.12.2 | Modification infos | ☐ | |
| 2.12.3 | Changement rôle | ☐ | |
| 2.12.4 | Sauvegarde réussie | ☐ | |

### 2.13 Sociétés - Détail `/gestionnaire/contacts/societes/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.13.1 | Informations société | ☐ | |
| 2.13.2 | Liste contacts associés | ☐ | |
| 2.13.3 | Interventions liées | ☐ | |
| 2.13.4 | Actions: Modifier | ☐ | |

### 2.14 Sociétés - Modifier `/gestionnaire/contacts/societes/modifier/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.14.1 | Pré-remplissage | ☐ | |
| 2.14.2 | Modification | ☐ | |
| 2.14.3 | Sauvegarde | ☐ | |

### 2.15 Contrats - Liste `/gestionnaire/contrats`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.15.1 | Liste contrats visible | ☐ | |
| 2.15.2 | Filtres: actif, expiré, en attente | ☐ | |
| 2.15.3 | Recherche | ☐ | |
| 2.15.4 | Tri par date | ☐ | |
| 2.15.5 | Bouton "Nouveau contrat" | ☐ | |
| 2.15.6 | Click → détail | ☐ | |
| 2.15.7 | Badge statut | ☐ | |

### 2.16 Contrats - Nouveau `/gestionnaire/contrats/nouveau`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.16.1 | Sélection lot | ☐ | |
| 2.16.2 | Sélection locataire | ☐ | |
| 2.16.3 | Dates début/fin | ☐ | |
| 2.16.4 | Montant loyer | ☐ | |
| 2.16.5 | Charges | ☐ | |
| 2.16.6 | Dépôt de garantie | ☐ | |
| 2.16.7 | Documents contrat | ☐ | |
| 2.16.8 | Validation cohérence dates | ☐ | |
| 2.16.9 | Création réussie | ☐ | |

### 2.17 Contrats - Détail `/gestionnaire/contrats/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.17.1 | Informations contrat | ☐ | |
| 2.17.2 | Locataire lié | ☐ | |
| 2.17.3 | Lot/Immeuble lié | ☐ | |
| 2.17.4 | Documents | ☐ | |
| 2.17.5 | Historique paiements (si dispo) | ☐ | |
| 2.17.6 | Actions: Modifier, Terminer | ☐ | |

### 2.18 Contrats - Modifier `/gestionnaire/contrats/modifier/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.18.1 | Pré-remplissage | ☐ | |
| 2.18.2 | Modification | ☐ | |
| 2.18.3 | Sauvegarde | ☐ | |

### 2.19 Interventions - Liste `/gestionnaire/interventions`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.19.1 | Liste interventions visible | ☐ | |
| 2.19.2 | Filtres par statut | ☐ | |
| 2.19.3 | Filtres par priorité | ☐ | |
| 2.19.4 | Filtres par bien | ☐ | |
| 2.19.5 | Recherche | ☐ | |
| 2.19.6 | Vue liste / Vue calendrier | ☐ | |
| 2.19.7 | Bouton "Nouvelle intervention" | ☐ | |
| 2.19.8 | Click → détail | ☐ | |
| 2.19.9 | Badges statut colorés | ☐ | |
| 2.19.10 | Actions rapides | ☐ | |
| 2.19.11 | Pagination | ☐ | |

### 2.20 Interventions - Nouvelle `/gestionnaire/interventions/nouvelle-intervention`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.20.1 | Sélection bien (immeuble/lot) | ☐ | |
| 2.20.2 | Type d'intervention | ☐ | |
| 2.20.3 | Description problème | ☐ | |
| 2.20.4 | Priorité | ☐ | |
| 2.20.5 | Photos/Documents | ☐ | |
| 2.20.6 | Assignation prestataire(s) | ☐ | |
| 2.20.7 | Mode: Direct / Demande de devis | ☐ | |
| 2.20.8 | Validation formulaire | ☐ | |
| 2.20.9 | Création réussie | ☐ | |
| 2.20.10 | Notification envoyée au prestataire | ☐ | |

### 2.21 Interventions - Détail `/gestionnaire/interventions/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.21.1 | Header avec titre et statut | ☐ | |
| 2.21.2 | Breadcrumb | ☐ | |
| 2.21.3 | Informations intervention | ☐ | |
| 2.21.4 | Bien concerné (lien) | ☐ | |
| 2.21.5 | Prestataire(s) assigné(s) | ☐ | |
| 2.21.6 | Timeline/Historique | ☐ | |
| 2.21.7 | Documents/Photos | ☐ | |
| 2.21.8 | Section Devis (si demandé) | ☐ | |
| 2.21.9 | Section Planning | ☐ | |
| 2.21.10 | Section Chat/Commentaires | ☐ | |
| 2.21.11 | Actions selon statut | ☐ | |

#### Actions par Statut

| Statut | Actions Disponibles | Test |
|--------|---------------------|------|
| `demande` | Approuver, Rejeter | ☐ |
| `approuvee` | Assigner, Demander devis | ☐ |
| `demande_de_devis` | Voir devis, Valider/Rejeter devis | ☐ |
| `planification` | Proposer créneaux | ☐ |
| `planifiee` | Voir planning, Annuler | ☐ |
| `en_cours` | Suivre avancement | ☐ |
| `cloturee_par_prestataire` | Valider travaux | ☐ |
| `cloturee_par_locataire` | Finaliser | ☐ |
| `cloturee_par_gestionnaire` | Archiver, Voir rapport | ☐ |

### 2.22 Mail `/gestionnaire/mail`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.22.1 | Liste emails visible | ☐ | |
| 2.22.2 | Filtres: Inbox, Sent, etc. | ☐ | |
| 2.22.3 | Recherche | ☐ | |
| 2.22.4 | Connexion compte email | ☐ | |
| 2.22.5 | Synchronisation | ☐ | |
| 2.22.6 | Lecture email | ☐ | |
| 2.22.7 | Réponse (si dispo) | ☐ | |

### 2.23 Notifications `/gestionnaire/notifications`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.23.1 | Liste notifications | ☐ | |
| 2.23.2 | Badge non-lues | ☐ | |
| 2.23.3 | Marquer comme lu | ☐ | |
| 2.23.4 | Marquer tout comme lu | ☐ | |
| 2.23.5 | Click → action/page liée | ☐ | |
| 2.23.6 | Real-time (nouvelle notif) | ☐ | |
| 2.23.7 | Filtres par type | ☐ | |

### 2.24 Paramètres `/gestionnaire/parametres`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.24.1 | Configuration générale | ☐ | |
| 2.24.2 | Préférences notifications | ☐ | |
| 2.24.3 | Sauvegarde paramètres | ☐ | |

### 2.25 Paramètres Emails `/gestionnaire/parametres/emails`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.25.1 | Configuration SMTP/Provider | ☐ | |
| 2.25.2 | Test envoi email | ☐ | |
| 2.25.3 | Templates emails | ☐ | |
| 2.25.4 | Sauvegarde configuration | ☐ | |

### 2.26 Profile `/gestionnaire/profile`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.26.1 | Informations profil | ☐ | |
| 2.26.2 | Modification nom/prénom | ☐ | |
| 2.26.3 | Upload avatar | ☐ | |
| 2.26.4 | Changement email | ☐ | |
| 2.26.5 | Changement password | ☐ | |
| 2.26.6 | Info équipe | ☐ | |
| 2.26.7 | Déconnexion | ☐ | |

---

## 3. Prestataire (5 pages)

### 3.1 Dashboard `/prestataire/dashboard`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.1.1 | KPIs visibles | ☐ | |
| 3.1.2 | Interventions assignées | ☐ | |
| 3.1.3 | Actions en attente | ☐ | |
| 3.1.4 | Prochains RDV | ☐ | |
| 3.1.5 | Devis à soumettre | ☐ | |
| 3.1.6 | Navigation rapide | ☐ | |
| 3.1.7 | Mobile-first (gros boutons) | ☐ | |

### 3.2 Intervention Détail `/prestataire/interventions/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.2.1 | Informations intervention | ☐ | |
| 3.2.2 | Adresse du bien | ☐ | |
| 3.2.3 | Contact locataire | ☐ | |
| 3.2.4 | Documents/Photos | ☐ | |
| 3.2.5 | Formulaire devis | ☐ | |
| 3.2.6 | Proposition disponibilités | ☐ | |
| 3.2.7 | Rapport travaux | ☐ | |
| 3.2.8 | Upload photos travaux | ☐ | |
| 3.2.9 | Chat avec gestionnaire | ☐ | |
| 3.2.10 | Marquer comme terminé | ☐ | |

### 3.3 Notifications `/prestataire/notifications`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.3.1 | Liste notifications | ☐ | |
| 3.3.2 | Alertes nouvelles interventions | ☐ | |
| 3.3.3 | Rappels RDV | ☐ | |
| 3.3.4 | Real-time | ☐ | |

### 3.4 Paramètres `/prestataire/parametres`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.4.1 | Préférences | ☐ | |
| 3.4.2 | Notifications | ☐ | |

### 3.5 Profile `/prestataire/profile`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.5.1 | Informations profil | ☐ | |
| 3.5.2 | Spécialités | ☐ | |
| 3.5.3 | Zone d'intervention | ☐ | |
| 3.5.4 | Modification | ☐ | |

---

## 4. Locataire (6 pages)

### 4.1 Dashboard `/locataire/dashboard`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.1.1 | Bienvenue + infos logement | ☐ | |
| 4.1.2 | Interventions en cours | ☐ | |
| 4.1.3 | Bouton "Signaler un problème" | ☐ | |
| 4.1.4 | Annonces/Messages | ☐ | |
| 4.1.5 | Interface simple | ☐ | |
| 4.1.6 | Couleurs rassurantes (emerald) | ☐ | |

### 4.2 Interventions - Liste `/locataire/interventions`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.2.1 | Mes interventions | ☐ | |
| 4.2.2 | Filtres par statut | ☐ | |
| 4.2.3 | Historique | ☐ | |
| 4.2.4 | Click → détail | ☐ | |
| 4.2.5 | Bouton "Nouvelle demande" | ☐ | |

### 4.3 Interventions - Nouvelle `/locataire/interventions/nouvelle-demande`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.3.1 | Wizard simplifié | ☐ | |
| 4.3.2 | Type de problème | ☐ | |
| 4.3.3 | Description | ☐ | |
| 4.3.4 | Photos | ☐ | |
| 4.3.5 | Disponibilités préférées | ☐ | |
| 4.3.6 | Récapitulatif | ☐ | |
| 4.3.7 | Soumission réussie | ☐ | |
| 4.3.8 | Confirmation | ☐ | |

### 4.4 Interventions - Détail `/locataire/interventions/[id]`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.4.1 | Statut visible | ☐ | |
| 4.4.2 | Timeline avancement | ☐ | |
| 4.4.3 | RDV planifié | ☐ | |
| 4.4.4 | Confirmer disponibilité | ☐ | |
| 4.4.5 | Valider travaux terminés | ☐ | |
| 4.4.6 | Feedback | ☐ | |
| 4.4.7 | Documents | ☐ | |

### 4.5 Notifications `/locataire/notifications`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.5.1 | Liste notifications | ☐ | |
| 4.5.2 | Mises à jour intervention | ☐ | |
| 4.5.3 | RDV confirmés | ☐ | |

### 4.6 Paramètres `/locataire/parametres`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.6.1 | Préférences | ☐ | |
| 4.6.2 | Notifications | ☐ | |

---

## 5. Admin (4 pages)

### 5.1 Dashboard `/admin/dashboard`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 5.1.1 | Stats système | ☐ | |
| 5.1.2 | Utilisateurs actifs | ☐ | |
| 5.1.3 | Logs activité | ☐ | |
| 5.1.4 | Alertes système | ☐ | |
| 5.1.5 | Interface dense | ☐ | |

### 5.2 Notifications `/admin/notifications`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 5.2.1 | Notifications système | ☐ | |
| 5.2.2 | Alertes critiques | ☐ | |

### 5.3 Paramètres `/admin/parametres`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 5.3.1 | Configuration système | ☐ | |
| 5.3.2 | Gestion utilisateurs | ☐ | |

### 5.4 Profile `/admin/profile`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 5.4.1 | Informations admin | ☐ | |
| 5.4.2 | Modification | ☐ | |

---

## 6. Proprietaire (3 pages)

> **Note** : Le rôle Proprietaire a un accès en **lecture seule** aux biens et interventions de son patrimoine.

### 6.1 Dashboard `/proprietaire/dashboard`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.1.1 | Vue d'ensemble patrimoine | ☐ | |
| 6.1.2 | Nombre de biens | ☐ | |
| 6.1.3 | Interventions en cours (lecture seule) | ☐ | |
| 6.1.4 | Statistiques globales | ☐ | |
| 6.1.5 | Navigation vers sections | ☐ | |
| 6.1.6 | Interface claire et professionnelle | ☐ | |

### 6.2 Biens `/proprietaire/biens`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.2.1 | Liste biens (lecture seule) | ☐ | |
| 6.2.2 | Détails immeuble visibles | ☐ | |
| 6.2.3 | Liste lots par immeuble | ☐ | |
| 6.2.4 | Occupation des lots | ☐ | |
| 6.2.5 | **PAS** de boutons création/modification | ☐ | |
| 6.2.6 | Filtres et recherche | ☐ | |
| 6.2.7 | Export données (si disponible) | ☐ | |

### 6.3 Interventions `/proprietaire/interventions`

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.3.1 | Liste interventions (lecture seule) | ☐ | |
| 6.3.2 | Filtres par statut | ☐ | |
| 6.3.3 | Filtres par bien | ☐ | |
| 6.3.4 | Détails intervention visibles | ☐ | |
| 6.3.5 | Timeline/historique | ☐ | |
| 6.3.6 | Devis et coûts visibles | ☐ | |
| 6.3.7 | **PAS** d'actions de modification | ☐ | |
| 6.3.8 | Recherche | ☐ | |

---

## 7. Fonctionnalités Transversales

### 7.1 Navigation

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.1.1 | Sidebar navigation | ☐ | |
| 6.1.2 | Breadcrumbs | ☐ | |
| 6.1.3 | Back button | ☐ | |
| 6.1.4 | Active state menu | ☐ | |
| 6.1.5 | Mobile: hamburger menu | ☐ | |
| 6.1.6 | Mobile: drawer navigation | ☐ | |

### 7.2 Formulaires (Global)

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.2.1 | Validation temps réel | ☐ | |
| 6.2.2 | Messages d'erreur clairs | ☐ | |
| 6.2.3 | Required fields marqués | ☐ | |
| 6.2.4 | Submit disabled si invalide | ☐ | |
| 6.2.5 | Loading state submit | ☐ | |
| 6.2.6 | Confirmation avant perte données | ☐ | |

### 7.3 Uploads

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.3.1 | Drag & drop | ☐ | |
| 6.3.2 | Click to select | ☐ | |
| 6.3.3 | Preview images | ☐ | |
| 6.3.4 | Progress upload | ☐ | |
| 6.3.5 | Validation type/taille | ☐ | |
| 6.3.6 | Suppression fichier | ☐ | |

### 7.4 Toasts/Notifications UI

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.4.1 | Toast succès (vert) | ☐ | |
| 6.4.2 | Toast erreur (rouge) | ☐ | |
| 6.4.3 | Toast warning (orange) | ☐ | |
| 6.4.4 | Toast info (bleu) | ☐ | |
| 6.4.5 | Auto-dismiss | ☐ | |
| 6.4.6 | Dismiss manuel | ☐ | |

### 7.5 Modales

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.5.1 | Ouverture/Fermeture | ☐ | |
| 6.5.2 | Overlay click = fermer | ☐ | |
| 6.5.3 | Escape = fermer | ☐ | |
| 6.5.4 | Focus trap | ☐ | |
| 6.5.5 | Scroll body bloqué | ☐ | |

### 7.6 Tables/Listes

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.6.1 | Header sticky (si long) | ☐ | |
| 6.6.2 | Tri colonnes | ☐ | |
| 6.6.3 | Pagination | ☐ | |
| 6.6.4 | État vide | ☐ | |
| 6.6.5 | Loading skeleton | ☐ | |
| 6.6.6 | Actions row (menu) | ☐ | |

---

## Résumé Exécution

| Section | Pages | Testées | Bugs |
|---------|-------|---------|------|
| Publiques/Auth | 14 | ☐ | |
| Gestionnaire | 27 | ☐ | |
| Prestataire | 5 | ☐ | |
| Locataire | 8 | ☐ | |
| Admin | 4 | ☐ | |
| Proprietaire | 3 | ☐ | |
| Transversal | - | ☐ | |
| **TOTAL** | **63** | | |

---

**Testeur** : _________________
**Date début** : _________________
**Date fin** : _________________
