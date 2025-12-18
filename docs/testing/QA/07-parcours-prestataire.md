# Parcours E2E Prestataire - SEIDO

> **Rôle** : Prestataire (15% des utilisateurs)
> **Focus** : Exécution des interventions, devis, planning
> **Priorité** : P2 - Important
> **UX** : Mobile-first, gros boutons d'action

---

## 1. Connexion et Dashboard

### 1.1 Parcours : Première Connexion via Invitation

**Préconditions** : Invitation reçue par email du gestionnaire

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Email | Cliquer lien invitation | Page set-password | ☐ |
| 2 | Password | Créer mot de passe | Validation force | ☐ |
| 3 | Confirmation | Confirmer password | Match validé | ☐ |
| 4 | Submit | Valider | Compte activé | ☐ |
| 5 | Redirection | | Dashboard prestataire | ☐ |
| 6 | Profil | Compléter profil | Spécialités, zone | ☐ |

### 1.2 Parcours : Connexion Standard

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Login | `/auth/login` | Page login | ☐ |
| 2 | Credentials | Entrer email/password | Validation | ☐ |
| 3 | Submit | Se connecter | Redirection dashboard | ☐ |
| 4 | Dashboard | Vérifier | KPIs, interventions assignées | ☐ |

### 1.3 Parcours : Dashboard Prestataire

| # | Élément | Vérification | Status |
|---|---------|--------------|--------|
| 1.3.1 | KPIs | Nombre interventions en cours | ☐ |
| 1.3.2 | Urgences | Interventions urgentes en premier | ☐ |
| 1.3.3 | Actions | Gros boutons d'action visibles | ☐ |
| 1.3.4 | Prochains RDV | Liste des prochaines interventions | ☐ |
| 1.3.5 | Devis à faire | Demandes de devis en attente | ☐ |
| 1.3.6 | Mobile | Interface adaptée mobile | ☐ |

---

## 2. Réception et Gestion des Demandes

### 2.1 Parcours : Réception Notification Intervention

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | Notif push/email "Nouvelle intervention" | Alerte visible | ☐ |
| 2 | Badge | Dashboard | Badge notifications incrémenté | ☐ |
| 3 | Click | Cliquer notification | Page détail intervention | ☐ |
| 4 | Détails | Lire intervention | Description, photos, adresse | ☐ |
| 5 | Contact | Voir contact locataire | Nom, téléphone (si autorisé) | ☐ |
| 6 | Documents | Voir pièces jointes | Photos problème visibles | ☐ |

### 2.2 Parcours : Intervention Directe (Sans Devis)

**Préconditions** : Intervention assignée en mode direct

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Réception | Notification assignation | Intervention visible | ☐ |
| 2 | Consultation | Voir détails | Tout info disponible | ☐ |
| 3 | Disponibilités | Section planning | Formulaire disponibilités | ☐ |
| 4 | Proposer | Sélectionner créneaux (3-5) | Créneaux enregistrés | ☐ |
| 5 | Submit | Envoyer disponibilités | Confirmation | ☐ |
| 6 | Notification | | Gestionnaire notifié | ☐ |
| 7 | Attente | | Statut "En attente validation" | ☐ |

---

## 3. Gestion des Devis

### 3.1 Parcours : Soumission d'un Devis

**Préconditions** : Demande de devis reçue

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | Notif "Demande de devis" | Visible | ☐ |
| 2 | Navigation | Aller à intervention | Page détail | ☐ |
| 3 | Section devis | Onglet/Section Devis | Formulaire devis | ☐ |
| 4 | Montant | Saisir montant HT | Calcul TTC automatique | ☐ |
| 5 | Description | Détailler prestation | Texte enregistré | ☐ |
| 6 | Délai | Estimer durée intervention | Durée enregistrée | ☐ |
| 7 | Validité | Durée validité devis | Date limite | ☐ |
| 8 | Pièces jointes | Upload devis PDF (optionnel) | Document uploadé | ☐ |
| 9 | Preview | Vérifier récapitulatif | Tout correct | ☐ |
| 10 | Submit | Soumettre devis | Devis envoyé | ☐ |
| 11 | Confirmation | Toast + statut | "Devis soumis" | ☐ |
| 12 | Notification | | Gestionnaire notifié | ☐ |

### 3.2 Parcours : Modification Devis (Avant Validation)

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Intervention → Section devis | Mon devis visible | ☐ |
| 2 | Modifier | Cliquer "Modifier" | Formulaire éditable | ☐ |
| 3 | Changement | Modifier montant/description | Modifications possibles | ☐ |
| 4 | Save | Sauvegarder | Devis mis à jour | ☐ |
| 5 | Notification | | Gestionnaire notifié du changement | ☐ |

### 3.3 Parcours : Réponse à Demande de Révision

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | "Demande de révision devis" | Visible | ☐ |
| 2 | Détails | Voir commentaire gestionnaire | Raison demande | ☐ |
| 3 | Révision | Modifier devis selon demande | Modifications | ☐ |
| 4 | Resoumettre | Envoyer nouveau devis | Devis révisé | ☐ |

---

## 4. Planification des Interventions

### 4.1 Parcours : Proposition de Disponibilités

**Préconditions** : Intervention approuvée/devis validé

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | "Proposer vos disponibilités" | Visible | ☐ |
| 2 | Navigation | Aller à intervention | Section planning | ☐ |
| 3 | Calendrier | Voir calendrier semaine | Jours affichés | ☐ |
| 4 | Sélection | Cliquer créneaux disponibles | Créneaux sélectionnés (highlight) | ☐ |
| 5 | Minimum | Sélectionner 3+ créneaux | Validation 3 minimum | ☐ |
| 6 | Submit | Envoyer disponibilités | Confirmation | ☐ |
| 7 | Statut | Vérifier | "En attente de matching" | ☐ |

### 4.2 Parcours : Confirmation RDV

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | "RDV confirmé" | Date et heure | ☐ |
| 2 | Détails | Voir intervention | Créneau final visible | ☐ |
| 3 | Adresse | Voir adresse complète | Adresse + instructions | ☐ |
| 4 | Contact | Téléphone locataire | Numéro disponible | ☐ |
| 5 | Calendrier | Ajouter au calendrier (optionnel) | Export ICS/Google | ☐ |
| 6 | Rappel | Rappel 24h avant | Notification rappel | ☐ |

---

## 5. Exécution des Travaux

### 5.1 Parcours : Jour de l'Intervention

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Dashboard | Voir "Aujourd'hui" | Intervention du jour visible | ☐ |
| 2 | Navigation | Cliquer intervention | Détails complets | ☐ |
| 3 | Adresse | Voir/copier adresse | Navigation possible (Maps) | ☐ |
| 4 | Appel | Bouton appeler locataire | Appel téléphonique | ☐ |
| 5 | Début | Marquer "Travaux commencés" | Statut "en_cours" | ☐ |
| 6 | Photos | Prendre photos "avant" | Upload depuis mobile | ☐ |

### 5.2 Parcours : Rapport de Travaux

**Préconditions** : Intervention en cours, travaux terminés

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Section | Aller à "Rapport travaux" | Formulaire visible | ☐ |
| 2 | Description | Décrire travaux effectués | Texte enregistré | ☐ |
| 3 | Photos après | Upload photos résultat | Photos uploadées | ☐ |
| 4 | Matériaux | Lister matériaux utilisés (optionnel) | Liste enregistrée | ☐ |
| 5 | Durée | Indiquer durée réelle | Temps enregistré | ☐ |
| 6 | Observations | Notes supplémentaires | Notes enregistrées | ☐ |
| 7 | Preview | Vérifier rapport | Tout complet | ☐ |
| 8 | Submit | "Marquer comme terminé" | Rapport envoyé | ☐ |
| 9 | Statut | Vérifier | "cloturee_par_prestataire" | ☐ |
| 10 | Notification | | Gestionnaire + Locataire notifiés | ☐ |

### 5.3 Parcours : Problème Pendant Intervention

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Chat | Ouvrir section commentaires | Zone message | ☐ |
| 2 | Message | Décrire problème rencontré | Message envoyé | ☐ |
| 3 | Photo | Joindre photo du problème | Photo uploadée | ☐ |
| 4 | Envoi | Envoyer | Gestionnaire notifié | ☐ |
| 5 | Réponse | Attendre instruction | Réponse dans chat | ☐ |
| 6 | Suite | Selon instruction | Continuer ou reporter | ☐ |

---

## 6. Historique et Suivi

### 6.1 Parcours : Consulter Historique

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Dashboard → "Mes interventions" | Liste complète | ☐ |
| 2 | Filtres | Filtrer par statut | Résultats filtrés | ☐ |
| 3 | Recherche | Chercher par adresse/nom | Résultats pertinents | ☐ |
| 4 | Détail | Cliquer intervention passée | Historique complet | ☐ |
| 5 | Documents | Voir rapport/photos | Tous documents | ☐ |

### 6.2 Parcours : Statistiques (si disponible)

| # | Élément | Vérification | Status |
|---|---------|--------------|--------|
| 6.2.1 | Interventions ce mois | Nombre affiché | ☐ |
| 6.2.2 | Note moyenne | Si système notation | ☐ |
| 6.2.3 | Revenus (si affiché) | Total devis validés | ☐ |

---

## 7. Gestion du Profil

### 7.1 Parcours : Mise à Jour Profil

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Menu → Profil | Page profil | ☐ |
| 2 | Photo | Changer photo | Upload fonctionnel | ☐ |
| 3 | Coordonnées | Modifier téléphone | Sauvegardé | ☐ |
| 4 | Spécialités | Modifier catégories | Catégories mises à jour | ☐ |
| 5 | Zone | Modifier zone intervention | Zone mise à jour | ☐ |
| 6 | Sauvegarde | Enregistrer | Toast confirmation | ☐ |

---

## 8. Notifications et Alertes

### 8.1 Parcours : Gestion Notifications

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Badge | Voir nombre non-lues | Badge visible | ☐ |
| 2 | Liste | Ouvrir notifications | Liste chronologique | ☐ |
| 3 | Types | Différents types visibles | Icônes distinctives | ☐ |
| 4 | Action | Cliquer notification | Redirection appropriée | ☐ |
| 5 | Marquer | Marquer comme lu | Badge décrémenté | ☐ |

### 8.2 Types de Notifications

| Type | Urgence | Status Test |
|------|---------|-------------|
| Nouvelle intervention assignée | Haute | ☐ |
| Demande de devis | Haute | ☐ |
| Devis accepté | Moyenne | ☐ |
| Devis refusé | Moyenne | ☐ |
| RDV confirmé | Haute | ☐ |
| Rappel intervention J-1 | Haute | ☐ |
| Message chat | Moyenne | ☐ |
| Travaux validés | Basse | ☐ |

---

## 9. Tests Mobile

### 9.1 Parcours Mobile : Intervention Terrain

| # | Étape | Device | Status |
|---|-------|--------|--------|
| 9.1.1 | Login sur mobile | Smartphone | ☐ |
| 9.1.2 | Dashboard lisible | 375px width | ☐ |
| 9.1.3 | Gros boutons cliquables | Touch 44px+ | ☐ |
| 9.1.4 | Prise photo | Appareil photo intégré | ☐ |
| 9.1.5 | Upload depuis galerie | Galerie photos | ☐ |
| 9.1.6 | Navigation GPS | Clic adresse → Maps | ☐ |
| 9.1.7 | Appel direct | Clic téléphone → Appel | ☐ |
| 9.1.8 | Formulaires utilisables | Clavier virtuel OK | ☐ |

### 9.2 Performance Mobile

| # | Test | Critère | Status |
|---|------|---------|--------|
| 9.2.1 | Chargement dashboard | < 3s (4G) | ☐ |
| 9.2.2 | Upload photo 5MB | < 10s | ☐ |
| 9.2.3 | Scroll liste fluide | 60fps | ☐ |
| 9.2.4 | Offline indicator | Message si déconnexion | ☐ |

---

## 10. Cas d'Erreur

### 10.1 Gestion Erreurs

| # | Scénario | Comportement Attendu | Status |
|---|----------|----------------------|--------|
| 10.1.1 | Soumission devis sans montant | Erreur validation | ☐ |
| 10.1.2 | Upload fichier trop gros | Message taille max | ☐ |
| 10.1.3 | Session expirée | Redirection login | ☐ |
| 10.1.4 | Intervention déjà clôturée | Message info | ☐ |
| 10.1.5 | Double submit | Prévention duplicate | ☐ |
| 10.1.6 | Perte connexion pendant upload | Retry possible | ☐ |

---

## Résumé Parcours Prestataire

| Parcours | Étapes | Testées | Bugs |
|----------|--------|---------|------|
| Connexion | 6 | ☐ | |
| Dashboard | 6 | ☐ | |
| Réception demande | 6 | ☐ | |
| Soumission devis | 12 | ☐ | |
| Planification | 7 | ☐ | |
| Exécution travaux | 10 | ☐ | |
| Rapport travaux | 10 | ☐ | |
| Profil | 6 | ☐ | |
| Notifications | 5 | ☐ | |
| Mobile | 8 | ☐ | |
| **TOTAL** | **76** | | |

---

**Testeur** : _________________
**Date** : _________________
**Device Mobile** : _________________
