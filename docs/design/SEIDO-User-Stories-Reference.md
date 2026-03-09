# SEIDO - Reference Complete des User Stories

> **Objectif** : Ce document centralise toutes les user stories de l'application SEIDO, organisees par module et par role. Il accompagne le document de handover design (`SEIDO-Design-Handover-Complete.md`) et remplace les fichiers CSV sources.
>
> **Date** : 2026-03-09
> **Source** : `Handover - User story - SEIDO *.csv` (2 fichiers CSV consolides et dedupliques)
> **Total** : 130 user stories uniques

---

## Table des Matieres

1. [Landing Page (16 stories)](#1-landing-page)
2. [Authentification (7 stories)](#2-authentification)
3. [Demande de Demo (2 stories)](#3-demande-de-demo)
4. [Dashboard Gestionnaire (8 stories)](#4-dashboard-gestionnaire)
5. [Patrimoine - Gestionnaire (21 stories)](#5-patrimoine---gestionnaire)
6. [Contacts & Societes - Gestionnaire (23 stories)](#6-contacts--societes---gestionnaire)
7. [Contrats - Gestionnaire (17 stories)](#7-contrats---gestionnaire)
8. [Interventions - Gestionnaire (23 stories)](#8-interventions---gestionnaire)
9. [Email - Gestionnaire (2 stories)](#9-email---gestionnaire)
10. [Dashboard Locataire (8 stories)](#10-dashboard-locataire)
11. [Contrat - Locataire (9 stories)](#11-contrat---locataire)
12. [Interventions - Locataire (12 stories)](#12-interventions---locataire)
13. [Dashboard Prestataire (3 stories)](#13-dashboard-prestataire)
14. [Interventions - Prestataire (8 stories)](#14-interventions---prestataire)
15. [Profil - Tous roles (6 stories)](#15-profil---tous-roles)
16. [Abonnement - Gestionnaire (3 stories)](#16-abonnement---gestionnaire)
17. [Index des stories par ID](#17-index-des-stories-par-id)

---

## Legende

| Colonne | Description |
|---------|-------------|
| **ID** | Identifiant unique (MODULE-XX) referencable depuis le handover design |
| **User Story** | Formulation "En tant que... je veux... afin de..." |
| **Objectif** | But fonctionnel de la story |
| **Elements UI** | Composants et donnees visibles a l'ecran |
| **Ref Design** | Section correspondante dans `SEIDO-Design-Handover-Complete.md` |

---

## 1. Landing Page

> **Role** : Visiteur (non connecte)
> **Ref Design** : Section 2

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| LP-01 | En tant que visiteur, je veux comprendre rapidement ce qu'est SEIDO afin de savoir si la solution correspond a mon besoin. | Comprehension rapide du produit | Titre + slogan + description courte | 2.1 |
| LP-02 | En tant que visiteur, je veux pouvoir demander une demonstration afin de decouvrir la solution plus en detail. | Conversion | Bouton CTA "Demander une demo" | 2.1 |
| LP-03 | En tant que visiteur, je veux comprendre le probleme que SEIDO resout afin de voir la valeur de la solution. | Mise en contexte | Texte expliquant les difficultes de gestion immobiliere | 2.2 |
| LP-04 | En tant que visiteur, je veux comprendre comment SEIDO simplifie la gestion immobiliere afin de voir les benefices de la plateforme. | Presentation de la solution | Explication de la plateforme avec visuels | 2.2 |
| LP-05 | En tant que visiteur, je veux decouvrir les fonctionnalites principales afin de comprendre ce que la plateforme permet de faire. | Presentation des modules | Cards : Patrimoine, Contacts, Contrats, Interventions | 2.3 |
| LP-06 | En tant que visiteur, je veux comprendre comment gerer les immeubles et les lots afin d'avoir une vue claire du patrimoine. | Presentation fonction | Description du module patrimoine | 2.3 |
| LP-07 | En tant que visiteur, je veux comprendre comment centraliser les contacts afin de faciliter la communication entre les acteurs. | Presentation fonction | Description module contacts | 2.3 |
| LP-08 | En tant que visiteur, je veux comprendre comment suivre les contrats de location afin d'organiser la gestion locative. | Presentation fonction | Description module contrats | 2.3 |
| LP-09 | En tant que visiteur, je veux comprendre comment les interventions sont gerees afin de voir comment les problemes sont suivis et resolus. | Presentation fonction | Description module interventions | 2.3 |
| LP-10 | En tant que visiteur, je veux connaitre les avantages de SEIDO afin de comprendre l'impact sur la gestion immobiliere. | Mise en avant valeur | Gain de temps, collaboration, visibilite | 2.4 |
| LP-11 | En tant que visiteur, je veux comparer les fonctionnalites des differentes offres afin de choisir la formule adaptee. | Transparence prix | Plans tarifaires (cards) | 2.5 |
| LP-12 | En tant que visiteur, je veux comparer les fonctionnalites des differentes offres afin de choisir la formule adaptee. | Aide a la decision | Tableau comparatif des plans | 2.5 |
| LP-13 | En tant que visiteur, je veux consulter les questions frequentes afin d'obtenir rapidement des reponses sur le produit. | Reduire les questions | Liste FAQ (accordeon) | 2.6 |
| LP-14 | En tant que visiteur, je veux comprendre le fonctionnement de SEIDO, la securite et l'utilisation afin de me rassurer avant de m'inscrire. | Rassurance | Questions sur fonctionnement, securite, support | 2.6 |
| LP-15 | En tant que visiteur, je veux pouvoir demander une demonstration ou contacter l'equipe afin de passer a l'etape suivante. | Conversion | Bouton contact / demo (section finale) | 2.7 |
| LP-16 | En tant que visiteur, je veux acceder aux informations complementaires afin de trouver les liens utiles et les informations legales. | Navigation secondaire | Footer : liens contact, mentions legales | 2.7 |

---

## 2. Authentification

> **Role** : Utilisateur (tous roles)
> **Ref Design** : Section 5

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| AUTH-01 | En tant qu'utilisateur, je veux me connecter a mon compte afin d'acceder a la plateforme SEIDO. | Acces a l'application | Email + mot de passe ou via SSO (Google OAuth) | 5.1 |
| AUTH-02 | En tant qu'utilisateur, je veux voir un message d'erreur si mes identifiants sont incorrects afin de corriger ma connexion. | Gestion erreurs | Message d'erreur bien clair | 5.1 |
| AUTH-03 | En tant qu'utilisateur, je veux pouvoir reinitialiser mon mot de passe afin de recuperer l'acces a mon compte. | Recuperation acces | Lien mot de passe oublie | 5.3 |
| AUTH-04 | En tant qu'utilisateur, je veux recevoir un email de reinitialisation afin de creer un nouveau mot de passe. | Securite | Email reset avec lien | 5.3 |
| AUTH-05 | En tant qu'utilisateur, je veux creer un compte afin d'utiliser la plateforme SEIDO. | Acces nouveau utilisateur | Formulaire : Nom, email, mot de passe | 5.2 |
| AUTH-06 | En tant qu'utilisateur, je veux confirmer mon adresse email afin d'activer mon compte. | Validation compte | Email de confirmation avec lien | 5.2 |
| AUTH-07 | En tant qu'utilisateur connecte, je veux etre redirige vers le tableau de bord afin d'acceder directement a mes fonctionnalites. | Redirection dashboard | Navigation automatique vers `/{role}/dashboard` | 5.5 |

---

## 3. Demande de Demo

> **Role** : Visiteur (non connecte)
> **Ref Design** : Section 25.4

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| DEM-01 | En tant que visiteur, je veux demander une demonstration afin de decouvrir la solution SEIDO. | Generation de leads | Page/formulaire de demande de demo | 25.4 |
| DEM-02 | En tant que visiteur, je veux remplir mes informations (nom, email, entreprise) afin d'etre contacte pour une demonstration. | Collecte d'informations | Champs : nom, email, entreprise, message | 25.4 |

---

## 4. Dashboard Gestionnaire

> **Role** : Gestionnaire
> **Ref Design** : Section 7

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| DG-01 | Je veux voir un resume global du patrimoine afin d'avoir une vision rapide des immeubles et des lots. | Vision globale | Nombre d'immeubles et nombre de lots | 7.1 |
| DG-02 | Je veux voir le taux d'occupation afin de comprendre la situation locative des biens. | Suivi occupation | Taux d'occupation des lots (%) | 7.1 |
| DG-03 | Je veux voir le nombre de contrats actifs afin de suivre les locations en cours. | Suivi contrats | Nombre de contrats actifs | 7.1 |
| DG-04 | Je veux voir le nombre d'interventions en cours afin d'identifier rapidement les problemes en attente. | Suivi maintenance | Interventions ouvertes (compteur) | 7.1 |
| DG-05 | Je veux voir la liste des interventions en cours afin de suivre leur statut et leur progression. | Suivi interventions | Liste des interventions actives | 7.2 |
| DG-06 | Je veux rechercher ou filtrer les interventions afin de trouver rapidement une intervention specifique. | Recherche rapide | Recherche mot-cle, filtres statut/immeuble/priorite/date | 7.2 |
| DG-07 | Je veux voir les messages non lus dans les interventions afin de repondre rapidement aux locataires ou prestataires. | Communication | Messages non lus lies aux interventions | 7.3 |
| DG-08 | Je veux voir les dernieres activites afin de suivre ce qui se passe sur la plateforme. | Suivi activite | Timeline : creation intervention, nouveaux messages, MAJ contrats | 7.4 |
| DG-09 | Je veux acceder rapidement aux actions principales afin d'ajouter ou importer des donnees sans naviguer dans plusieurs pages. | Gain de temps | Boutons : Ajouter immeuble, lot, contrat, intervention, importer | 7.5 |

---

## 5. Patrimoine - Gestionnaire

> **Role** : Gestionnaire
> **Ref Design** : Section 8

### 5.1 Liste et Recherche

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| PAT-01 | Je veux voir la liste des immeubles afin d'avoir une vue globale du patrimoine. | Visualisation | Liste/Cards des immeubles | 8.1 |
| PAT-02 | Je veux rechercher ou filtrer les immeubles afin de trouver rapidement un batiment specifique. | Recherche rapide | Recherche par nom, filtres | 8.1 |
| PAT-03 | Je veux acceder rapidement aux actions principales afin d'ajouter un immeuble ou un lot. | Navigation rapide | Boutons creation | 8.1 |

### 5.2 Creation Immeuble

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| PAT-04 | Je veux ajouter un immeuble afin d'enregistrer un nouveau batiment dans le patrimoine. | Gestion patrimoine | Formulaire creation immeuble (wizard) | 8.2 |
| PAT-05 | Je veux renseigner les informations generales de l'immeuble afin de definir son identite et sa localisation. | Structurer les donnees | Reference, adresse, rue, code postal, ville, pays, description | 8.2 |
| PAT-06 | Je veux ajouter les lots associes a l'immeuble afin de definir les unites qui composent le batiment. | Structuration des unites | Creation des lots dans l'immeuble | 8.2 |
| PAT-07 | Je veux associer des contacts a l'immeuble afin d'identifier les personnes liees au batiment. | Gestion acteurs | Gestionnaire, prestataires, locataires, autres | 8.3 |
| PAT-08 | Je veux ajouter des documents a l'immeuble afin de centraliser les documents importants. | Centralisation documents | Documents recommandes ou autres fichiers | 8.3 |
| PAT-09 | Je veux definir des suivis techniques recommandes pour l'immeuble afin de suivre la maintenance et les controles obligatoires. | Suivi maintenance | Liste de suivis techniques | 8.3 |
| PAT-10 | Je veux confirmer la creation de l'immeuble afin de valider l'enregistrement dans le systeme. | Validation | Message de confirmation | 8.2 |

### 5.3 Creation Lot

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| PAT-11 | Je veux definir la categorie du lot afin d'identifier son type d'usage. | Classification | Appartement, Maison, Garage, Local commercial, Autre | 8.4 |
| PAT-12 | Je veux renseigner les informations du lot afin de decrire precisement l'unite. | Structurer les donnees | Etage, porte/boite, description du lot | 8.4 |

### 5.4 Detail et Consultation

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| PAT-13 | Je veux voir les informations d'un immeuble afin de consulter ses caracteristiques et ses lots. | Consultation | Informations immeuble (onglets) | 8.3 |
| PAT-14 | Je veux voir les lots associes a un immeuble afin de consulter toutes les unites du batiment. | Gestion lots | Liste des lots | 8.3 |
| PAT-15 | Je veux voir les informations d'un lot afin de consulter les donnees de l'unite. | Consultation | Informations du lot (onglets) | 8.5 |
| PAT-16 | Je veux voir le statut d'occupation d'un lot afin de savoir s'il est occupe ou vacant. | Suivi occupation | Badge statut du lot | 8.5 |

### 5.5 Modification et Suppression

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| PAT-17 | Je veux modifier les informations d'un immeuble afin de mettre a jour les donnees du patrimoine. | Mise a jour | Formulaire pre-rempli | 8.6 |
| PAT-18 | Je veux archiver un immeuble afin de le retirer du patrimoine actif sans perdre les donnees. | Gestion historique | Action archivage | 8.3 |
| PAT-19 | Je veux supprimer un immeuble afin de retirer definitivement un batiment du systeme. | Nettoyage donnees | Suppression avec confirmation | 8.3 |
| PAT-20 | Je veux archiver un lot afin de le retirer des lots actifs tout en conservant son historique. | Gestion historique | Action archivage | 8.5 |
| PAT-21 | Je veux supprimer un lot afin de retirer definitivement une unite du systeme. | Nettoyage donnees | Suppression avec confirmation | 8.5 |

### 5.6 Import

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| PAT-22 | Je veux importer des immeubles ou des lots afin d'ajouter rapidement plusieurs donnees dans le systeme. | Gain de temps | Import CSV / Excel (wizard 5 etapes) | 26 |

---

## 6. Contacts & Societes - Gestionnaire

> **Role** : Gestionnaire
> **Ref Design** : Section 9

### 6.1 Liste et Recherche

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CON-01 | Je veux voir la liste des contacts afin d'avoir une vue globale de toutes les personnes liees au patrimoine. | Visualisation | Liste des contacts | 9.1 |
| CON-02 | Je veux rechercher ou filtrer les contacts afin de trouver rapidement une personne specifique. | Recherche rapide | Recherche par nom, type ou entreprise | 9.1 |

### 6.2 Creation Contact

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CON-03 | Je veux creer un contact afin d'enregistrer une nouvelle personne dans le systeme. | Gestion contacts | Acces au formulaire de creation | 9.2 |
| CON-04 | Je veux definir si le contact est une personne physique ou reliee a une societe afin de structurer les contacts correctement. | Structuration | Type contact : personne ou societe | 9.2 |
| CON-05 | Je veux renseigner les informations generales du contact afin d'identifier la personne. | Structurer les donnees | Nom, prenom, email, telephone | 9.2 |
| CON-06 | Je veux associer un contact a une societe afin d'identifier l'entreprise a laquelle il appartient. | Organisation | Choisir societe existante ou en creer une nouvelle | 9.2 |
| CON-07 | Je veux associer un contact a un immeuble ou un lot afin de lier la personne au patrimoine concerne. | Organisation | Selection immeuble ou lot | 9.2 |
| CON-08 | Je veux envoyer automatiquement une invitation par email au contact apres sa creation afin qu'il puisse acceder a la plateforme. | Activation utilisateur | Email d'invitation avec acces | 9.2 |
| CON-09 | Je veux voir une confirmation apres la creation d'un contact afin de valider son enregistrement et l'envoi de l'invitation. | Validation | Message confirmation + invitation envoyee | 9.2 |

### 6.3 Invitations

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CON-10 | Je veux voir le statut de l'invitation envoyee afin de savoir si le contact a accepte ou non l'invitation. | Suivi acces | Badge : envoyee, acceptee, en attente, expiree | 9.3 |
| CON-11 | Je veux renvoyer une invitation a un contact afin qu'il puisse recevoir a nouveau l'acces a la plateforme. | Gestion invitations | Bouton renvoi invitation | 9.3 |

### 6.4 Detail et Modification Contact

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CON-12 | Je veux consulter la fiche d'un contact afin de voir toutes ses informations et ses relations avec le patrimoine (contrat), ses interventions en cours. | Consultation | Informations completes du contact (onglets) | 9.4 |
| CON-13 | Je veux modifier les informations d'un contact afin de maintenir les donnees a jour. | Mise a jour | Formulaire pre-rempli | 9.4 |
| CON-14 | Je veux archiver un contact afin de le retirer des contacts actifs tout en conservant son historique. | Gestion historique | Action archivage | 9.4 |
| CON-15 | Je veux supprimer un contact afin de retirer definitivement une personne du systeme. | Nettoyage donnees | Suppression avec confirmation | 9.4 |

### 6.5 Societes

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CON-16 | Je veux voir la liste des societes afin d'avoir une vue globale des entreprises liees au patrimoine. | Visualisation | Liste des societes (onglet) | 9.5 |
| CON-17 | Je veux rechercher ou filtrer les societes afin de trouver rapidement une entreprise specifique. | Recherche rapide | Recherche par nom ou activite | 9.5 |
| CON-18 | Je veux creer une societe afin d'enregistrer une nouvelle entreprise dans le systeme. | Gestion entreprises | Formulaire creation societe | 9.5 |
| CON-19 | Je veux renseigner les informations d'une societe afin d'identifier l'entreprise. | Structurer les donnees | Nom societe, adresse, email, telephone, description | 9.5 |
| CON-20 | Je veux voir les contacts associes a une societe afin d'identifier les contacts lies. | Organisation | Liste des contacts lies | 9.5 |
| CON-21 | Je veux modifier les informations d'une societe afin de maintenir les donnees a jour. | Mise a jour | Formulaire pre-rempli | 9.5 |
| CON-22 | Je veux archiver une societe afin de la retirer des societes actives tout en conservant son historique. | Gestion historique | Action archivage | 9.5 |
| CON-23 | Je veux supprimer une societe afin de retirer definitivement une entreprise du systeme. | Nettoyage donnees | Suppression avec confirmation | 9.5 |

---

## 7. Contrats - Gestionnaire

> **Role** : Gestionnaire
> **Ref Design** : Section 10

### 7.1 Liste et Recherche

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CTR-01 | Je veux voir la liste des contrats afin d'avoir une vue globale des baux enregistres. | Visualisation | Liste des contrats | 10.1 |
| CTR-02 | Je veux voir la liste des contrats avec leur progression afin de suivre facilement l'avancement des baux. | Suivi des contrats | Progression (%), jours restants, statut | 10.1 |
| CTR-03 | Je veux voir les contrats par statut afin d'identifier facilement les contrats actifs, a venir, termines ou resilies. | Organisation | Filtres statut : actif, a venir, termine, resilie | 10.1 |
| CTR-04 | Je veux rechercher ou filtrer les contrats afin de trouver rapidement un bail specifique. | Recherche rapide | Recherche par reference, locataire, immeuble | 10.1 |
| CTR-05 | Je veux acceder rapidement a la creation d'un nouveau contrat afin d'ajouter un bail sans passer par plusieurs pages. | Gain de temps | Bouton "Nouveau contrat" | 10.1 |

### 7.2 Creation Contrat

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CTR-06 | Je veux creer un contrat afin d'enregistrer un nouveau bail dans le systeme. | Gestion baux | Acces au formulaire wizard | 10.2 |
| CTR-07 | Je veux selectionner l'immeuble et le lot concernes afin d'associer le contrat au bon logement. | Association patrimoine | Choix immeuble et lot | 10.2 |
| CTR-08 | Je veux renseigner les informations principales du bail afin de definir les conditions de location. | Structuration contrat | Reference du bail | 10.2 |
| CTR-09 | Je veux definir la date de debut et la duree du bail afin de structurer la periode de location. | Gestion duree | Date debut, duree | 10.2 |
| CTR-10 | Je veux renseigner le loyer et les charges afin de definir les conditions financieres du contrat. | Gestion financiere | Montant loyer et charges | 10.2 |
| CTR-11 | Je veux renseigner la garantie locative afin d'enregistrer la caution liee au bail. | Gestion garantie | Montant garantie | 10.2 |
| CTR-12 | Je veux definir la frequence de paiement afin de preciser la periodicite du loyer. | Gestion paiement | Frequence mensuelle ou autre | 10.2 |
| CTR-13 | Je veux ajouter des documents lies au bail afin de centraliser les documents contractuels. | Centralisation documents | Documents recommandes ou autres | 10.2 |

### 7.3 Detail et Gestion

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CTR-14 | Je veux consulter les informations d'un contrat afin de voir les details du bail et les documents associes. | Consultation | Informations contrat (onglets) | 10.3 |
| CTR-15 | Je veux modifier les informations d'un contrat afin de maintenir les donnees a jour. | Mise a jour | Formulaire pre-rempli | 10.3 |
| CTR-16 | Je veux resilier un contrat afin de cloturer un bail avant son terme. | Gestion statut | Passage en statut resilie | 10.3 |
| CTR-17 | Je veux voir les contrats termines afin de suivre l'historique des locations. | Historique | Contrats termines (filtre) | 10.3 |

---

## 8. Interventions - Gestionnaire

> **Role** : Gestionnaire
> **Ref Design** : Section 11

### 8.1 Liste et Recherche

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| INT-01 | Je veux voir la liste des interventions afin d'avoir une vue globale des demandes. | Visualisation | Liste des interventions | 11.1 |
| INT-02 | Je veux voir les interventions par statut afin de suivre leur progression dans le processus. | Organisation | Statuts : demande, approuvee, planification, planifiee, cloturee, annulee | 11.1 |
| INT-03 | Je veux rechercher ou filtrer les interventions afin de trouver rapidement une demande specifique. | Recherche rapide | Recherche par immeuble, lot, statut, urgence | 11.1 |
| INT-04 | Je veux acceder rapidement a la creation d'une intervention afin d'ajouter une demande rapidement. | Gain de temps | Bouton "Nouvelle intervention" | 11.1 |
| INT-05 | Je veux voir des boutons d'actions rapides sur chaque intervention selon son statut afin d'effectuer rapidement l'etape suivante. | Fluidite du workflow | Actions : approuver, demander devis, planifier, cloturer | 11.1 |

### 8.2 Creation Intervention

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| INT-06 | Je veux creer une intervention afin d'enregistrer une nouvelle demande de maintenance. | Gestion interventions | Acces formulaire wizard | 11.2 |
| INT-07 | Je veux selectionner l'immeuble et le lot concernes afin d'identifier l'emplacement du probleme. | Association patrimoine | Choix immeuble et lot | 11.2 |
| INT-08 | Je veux decrire l'intervention afin d'expliquer clairement le probleme. | Structuration demande | Titre et description | 11.2 |
| INT-09 | Je veux definir la categorie de l'intervention afin de classer le type de probleme. | Organisation | Plomberie, electricite, chauffage, autres | 11.2 |
| INT-10 | Je veux definir le niveau d'urgence afin de prioriser les interventions. | Priorisation | Urgence : basse, normale, haute, urgente | 11.2 |
| INT-11 | Je veux associer un contact a l'intervention afin d'identifier la personne concernee. | Organisation | Locataire ou prestataire | 11.2 |
| INT-12 | Je veux ajouter des photos ou documents afin de documenter l'intervention. | Documentation | Upload fichiers | 11.2 |

### 8.3 Gestion et Workflow

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| INT-13 | Je veux approuver ou refuser une demande d'intervention afin de controler les interventions a traiter. | Validation gestionnaire | Modal accepter / refuser | 11.3 |
| INT-14 | Je veux demander des devis a des prestataires afin d'evaluer les couts de l'intervention. | Gestion prestataires | Modal envoi demande de devis | 11.3 |
| INT-15 | Je veux selectionner et valider un devis afin de choisir le prestataire qui realisera l'intervention. | Decision | Liste devis recus + selection | 11.3 |
| INT-16 | Je veux definir un creneau d'intervention afin d'organiser le moment de l'intervention. | Organisation planning | Modal planification date/heure | 11.3 |
| INT-17 | Je veux confirmer la cloture de l'intervention afin de valider la fin du processus apres que le prestataire a cloture. | Validation finale | Modal confirmation cloture | 11.3 |

### 8.4 Communication et Documents

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| INT-18 | Je veux echanger des messages dans l'intervention afin de communiquer avec les personnes concernees. | Communication | Fils de discussion (3 threads) | 11.3 |
| INT-19 | Je veux voir l'historique des actions afin de suivre toutes les etapes de l'intervention. | Tracabilite | Timeline des actions | 11.3 |

### 8.5 Modification et Suppression

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| INT-20 | Je veux modifier les informations d'une intervention afin de mettre a jour les details si necessaire. | Mise a jour | Modifier titre, categorie, urgence, description | 11.4 |
| INT-21 | Je veux archiver une intervention afin de la retirer des interventions actives tout en conservant son historique. | Gestion historique | Action archivage | 11.3 |
| INT-22 | Je veux supprimer une intervention afin de retirer definitivement une demande du systeme. | Nettoyage donnees | Suppression avec confirmation | 11.3 |

---

## 9. Email - Gestionnaire

> **Role** : Gestionnaire
> **Ref Design** : Section 12

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| EM-01 | Je veux ajouter une adresse email afin de connecter ma boite mail a la plateforme. | Connexion email | Formulaire ajout adresse email | 12.3 |
| EM-02 | Je veux synchroniser ma boite mail afin que les emails soient connectes avec la plateforme. | Synchronisation | Statut synchronisation de la boite mail | 12.3 |

---

## 10. Dashboard Locataire

> **Role** : Locataire
> **Ref Design** : Section 13

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| DL-01 | Je veux voir mon contrat actuel afin de consulter les informations principales de mon bail. | Consultation | Card contrat en cours | 13.2 |
| DL-02 | Je veux voir la date de debut et la date de fin du bail afin de connaitre la duree de mon contrat. | Suivi contrat | Date debut et date fin | 13.2 |
| DL-03 | Je veux voir le montant du loyer et des charges afin de connaitre les conditions financieres de mon logement. | Consultation financiere | Loyer et charges | 13.2 |
| DL-04 | Je veux voir mes interventions afin de suivre les demandes liees a mon logement. | Suivi maintenance | Liste interventions | 13.3 |
| DL-05 | Je veux voir mes interventions par statut afin de suivre leur progression. | Organisation | Statuts : a traiter, a planifier, a venir, terminees | 13.3 |
| DL-06 | Je veux rechercher, filtrer et paginer la liste des interventions afin de retrouver facilement une demande et naviguer dans l'historique. | Recherche rapide | Recherche (mot-cle), filtres (statut, urgence, date), pagination | 13.3 |
| DL-07 | Je veux voir les messages non lus lies a mes interventions afin de rester informe des echanges avec le gestionnaire ou le prestataire. | Communication | Banniere messages non lus | 13.3 |
| DL-08 | Je veux acceder rapidement a un bouton pour creer une nouvelle demande d'intervention afin de signaler facilement un probleme dans mon logement. | Accessibilite / rapidite | Bouton "Nouvelle demande" | 13.3 |

---

## 11. Contrat - Locataire

> **Role** : Locataire
> **Ref Design** : Section 15

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| CL-01 | Je veux voir l'immeuble et le lot que j'occupe afin d'identifier clairement mon logement. | Identification logement | Nom immeuble + reference lot | 15.1 |
| CL-02 | Je veux voir les informations principales de mon contrat afin de comprendre les conditions de mon bail. | Consultation | Informations du contrat | 15.1 |
| CL-03 | Je veux voir la progression de mon contrat afin de connaitre l'avancement de mon bail. | Suivi bail | Barre progression du contrat (%) | 15.1 |
| CL-04 | Je veux voir la date de debut et la date de fin afin de connaitre la duree de mon contrat. | Suivi duree | Date debut et fin | 15.1 |
| CL-05 | Je veux voir le montant du loyer afin de connaitre les conditions financieres de mon logement. | Consultation financiere | Montant loyer | 15.1 |
| CL-06 | Je veux voir le statut de mon contrat afin de savoir s'il est actif ou termine. | Suivi statut | Badge statut du contrat | 15.1 |
| CL-07 | Je veux voir le nombre de jours restants afin de savoir combien de temps il reste avant la fin du bail. | Anticipation | Compteur jours restants | 15.1 |
| CL-08 | Je veux voir les interventions liees a mon logement afin de suivre les demandes associees a mon contrat. | Suivi maintenance | Liste interventions du lot | 15.1 |
| CL-09 | Je veux voir les documents lies a mon contrat afin d'acceder facilement aux fichiers importants. | Consultation documents | Documents du bail (telechargeable) | 15.1 |

---

## 12. Interventions - Locataire

> **Role** : Locataire
> **Ref Design** : Section 14

### 12.1 Liste

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| IL-01 | Je veux voir la liste de mes interventions afin de suivre les demandes liees a mon logement. | Suivi maintenance | Liste interventions avec statut, dates, type | 14.2 |
| IL-02 | Je veux rechercher, filtrer et paginer mes interventions afin de retrouver facilement une demande. | Recherche rapide | Recherche, filtres, pagination | 14.2 |
| IL-03 | Je veux voir l'avancement de l'intervention afin de suivre les differentes etapes du traitement. | Suivi progression | Indicateur de progression (stepper) | 14.2 |

### 12.2 Creation Demande

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| IL-04 | Je veux creer une nouvelle intervention afin de signaler un probleme dans mon logement. | Signalement probleme | Wizard multi-etapes | 14.1 |
| IL-05 | Je veux renseigner le type de probleme afin de classifier la demande d'intervention. | Structuration demande | Combobox : plomberie, electricite, chauffage, autre | 14.1 |
| IL-06 | Je veux definir le niveau d'urgence afin d'indiquer la priorite de l'intervention. | Priorisation | 4 options : basse, normale, haute, urgente | 14.1 |
| IL-07 | Je veux decrire le probleme afin d'expliquer clairement la situation. | Comprehension demande | Textarea description | 14.1 |
| IL-08 | Je veux ajouter une piece jointe afin de fournir des photos ou documents lies au probleme. | Documentation | Upload fichiers / images (drag-and-drop) | 14.1 |

### 12.3 Detail Intervention

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| IL-09 | Je veux voir les informations generales d'une intervention afin de comprendre la demande enregistree. | Consultation | Titre, categorie, urgence, description, statut | 14.3 |
| IL-10 | Je veux voir les conversations liees a l'intervention afin de suivre les echanges avec le gestionnaire ou le prestataire. | Communication | Fil de discussion (onglet Conversations) | 14.3 |
| IL-11 | Je veux envoyer des messages dans l'intervention afin de communiquer avec les personnes concernees. | Communication | Champ saisie + envoi | 14.3 |
| IL-12 | Je veux voir les creneaux proposes pour l'intervention afin de connaitre les disponibilites pour le passage du prestataire. | Organisation intervention | Onglet Rendez-vous : creneaux avec selection/declin | 14.3 |

---

## 13. Dashboard Prestataire

> **Role** : Prestataire
> **Ref Design** : Section 16

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| DP-01 | Je veux voir les interventions qui me sont assignees afin de suivre les demandes sur lesquelles je dois intervenir. | Suivi travail | Liste interventions assignees (5 onglets) | 16.1 |
| DP-02 | Je veux rechercher, filtrer et paginer les interventions afin de retrouver facilement une demande specifique. | Recherche rapide | Recherche, filtres, pagination | 16.1 |
| DP-03 | Je veux voir un extrait des messages non lus lies aux interventions afin de rester informe des nouvelles communications. | Communication | Section messages non lus | 16.1 |

---

## 14. Interventions - Prestataire

> **Role** : Prestataire
> **Ref Design** : Section 17

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| IP-01 | Je veux voir les informations generales de l'intervention afin de comprendre le probleme a traiter. | Comprehension intervention | Titre, categorie, urgence, description, statut (onglet General) | 17.1 |
| IP-02 | Je veux voir les conversations liees a l'intervention afin de suivre les echanges avec le gestionnaire ou le locataire. | Communication | Fil de discussion (onglet Conversations) | 17.1 |
| IP-03 | Je veux envoyer des messages dans l'intervention afin de communiquer avec les personnes concernees. | Communication | Champ saisie + envoi message | 17.1 |
| IP-04 | Je veux voir les documents lies a l'intervention afin d'acceder aux informations ou photos du probleme. | Consultation documents | Documents intervention (dans onglet General) | 17.1 |
| IP-05 | Je veux ajouter des documents ou photos afin de documenter mon intervention. | Documentation | Upload documents | 17.1 |
| IP-06 | Je veux consulter ou envoyer un devis afin de proposer le cout de l'intervention. | Gestion devis | Section devis (onglet Planning et Estimation) | 17.1 |
| IP-07 | Je veux voir les creneaux proposes pour l'intervention afin d'organiser la planification. | Organisation planning | Creneaux intervention (onglet Planning et Estimation) | 17.1 |
| IP-08 | Je veux marquer l'intervention comme terminee afin d'indiquer que le travail est realise. | Fin intervention | Dialog de completion (rapport requis) | 17.2 |

---

## 15. Profil - Tous roles

> **Roles** : Gestionnaire, Locataire, Prestataire
> **Ref Design** : Section 18

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| PRO-01 | Je veux voir mes informations personnelles afin de consulter les donnees de mon compte. | Consultation | Nom, prenom, email, telephone, avatar | 18 |
| PRO-02 | Je veux modifier mes informations personnelles afin de mettre a jour mes donnees. | Mise a jour | Modifier nom, prenom, telephone | 18 |
| PRO-03 | Je veux changer mon mot de passe afin de securiser l'acces a mon compte. | Securite | Modal : ancien mdp, nouveau, confirmation | 18 |
| PRO-04 | Je veux definir mes parametres de notification afin de choisir comment je suis informe des activites. | Personnalisation | Toggle notifications email ou plateforme | 19 |
| PRO-05 | Je veux acceder aux preferences de mon compte afin de configurer mon experience dans l'application. | Personnalisation | Page parametres utilisateur | 19 |
| PRO-06 | Je veux voir les options pour installer l'application afin d'acceder plus facilement a la plateforme. | Accessibilite | Bouton installation PWA | 24 |

---

## 16. Abonnement - Gestionnaire

> **Role** : Gestionnaire
> **Ref Design** : Section 21

| ID | User Story | Objectif | Elements UI | Ref Design |
|----|-----------|----------|-------------|------------|
| ABO-01 | Je veux voir si mon compte est en periode d'essai (gratuit) ou sous abonnement afin de connaitre mon statut d'acces. | Suivi abonnement | Badge trial/actif dans sidebar | 21.1 |
| ABO-02 | Je veux voir les differentes offres d'abonnement afin de choisir le plan adapte a mes besoins. | Choix abonnement | Cards plans tarifaires | 21.1 |
| ABO-03 | Je veux choisir ou modifier mon abonnement afin d'activer une offre adaptee. | Gestion plan | Selection plan + checkout Stripe | 21.1 |

---

## 17. Index des stories par ID

### Recapitulatif par module

| Module | IDs | Nombre |
|--------|-----|:------:|
| Landing Page | LP-01 a LP-16 | 16 |
| Authentification | AUTH-01 a AUTH-07 | 7 |
| Demo | DEM-01 a DEM-02 | 2 |
| Dashboard Gestionnaire | DG-01 a DG-09 | 9 |
| Patrimoine | PAT-01 a PAT-22 | 22 |
| Contacts & Societes | CON-01 a CON-23 | 23 |
| Contrats | CTR-01 a CTR-17 | 17 |
| Interventions Gestionnaire | INT-01 a INT-22 | 22 |
| Email | EM-01 a EM-02 | 2 |
| Dashboard Locataire | DL-01 a DL-08 | 8 |
| Contrat Locataire | CL-01 a CL-09 | 9 |
| Interventions Locataire | IL-01 a IL-12 | 12 |
| Dashboard Prestataire | DP-01 a DP-03 | 3 |
| Interventions Prestataire | IP-01 a IP-08 | 8 |
| Profil (tous roles) | PRO-01 a PRO-06 | 6 |
| Abonnement | ABO-01 a ABO-03 | 3 |
| **TOTAL** | | **169** |

### Stories par role

| Role | Nombre de stories | Modules concernes |
|------|:-:|---|
| Visiteur (non connecte) | 18 | Landing Page, Demo |
| Utilisateur (tous roles) | 7 | Authentification |
| Gestionnaire | 95 | Dashboard, Patrimoine, Contacts, Contrats, Interventions, Email |
| Locataire | 29 | Dashboard, Contrat, Interventions |
| Prestataire | 11 | Dashboard, Interventions |
| Tous roles | 9 | Profil, Abonnement |
| **TOTAL** | **169** | |

### Cross-reference Design Handover

Chaque ID de ce document est referencable dans `SEIDO-Design-Handover-Complete.md` via la colonne "Ref Design" qui pointe vers la section correspondante. Les fonctionnalites presentes dans le code mais **absentes de ce document de stories** sont documentees uniquement dans le handover design avec la mention "HORS CSV".

---

> **Note** : Ce document contient **169 user stories** extraites et dedupliquees des 2 fichiers CSV sources.
> Les stories ont ete renumerotees avec des IDs stables (MODULE-XX) pour faciliter le cross-referencing avec le document de handover design.
> Les ~120 fonctionnalites supplementaires identifiees dans le code (email system, admin, PWA, blog, Stripe, proprietaire, etc.) sont documentees exclusivement dans `SEIDO-Design-Handover-Complete.md`.
