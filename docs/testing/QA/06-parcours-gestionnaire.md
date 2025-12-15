# Parcours E2E Gestionnaire - SEIDO

> **Rôle** : Gestionnaire (70% des utilisateurs)
> **Focus** : Gestion d'interventions, biens, contacts
> **Priorité** : P1 - Critique

---

## 1. Connexion et Navigation

### 1.1 Parcours : Connexion Gestionnaire

**Préconditions** : Compte gestionnaire existant

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Accès login | Aller à `/auth/login` | Page login affichée | ☐ |
| 2 | Saisie email | Entrer email valide | Email accepté | ☐ |
| 3 | Saisie password | Entrer password | Password masqué | ☐ |
| 4 | Submit | Cliquer "Se connecter" | Loading visible | ☐ |
| 5 | Redirection | Attendre | Redirigé vers `/gestionnaire/dashboard` | ☐ |
| 6 | Dashboard | Vérifier | KPIs et données chargées | ☐ |

**Variantes à tester** :
- [ ] Login avec email incorrect → Message erreur
- [ ] Login avec password incorrect → Message erreur
- [ ] Login avec compte non confirmé → Message approprié

---

## 2. Création d'Intervention (Parcours Complet)

### 2.1 Parcours : Nouvelle Intervention Directe

**Préconditions** :
- Connecté en tant que gestionnaire
- Au moins 1 bien créé
- Au moins 1 prestataire dans les contacts

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Dashboard → Cliquer "Nouvelle intervention" | Page création ouverte | ☐ |
| 2 | Sélection bien | Choisir un immeuble/lot | Bien sélectionné, adresse affichée | ☐ |
| 3 | Type | Sélectionner type d'intervention | Type enregistré | ☐ |
| 4 | Description | Rédiger description du problème | Texte enregistré | ☐ |
| 5 | Priorité | Choisir priorité (normale/urgente) | Priorité enregistrée | ☐ |
| 6 | Photos | Upload 1-2 photos (optionnel) | Photos uploadées avec preview | ☐ |
| 7 | Prestataire | Sélectionner prestataire | Prestataire assigné | ☐ |
| 8 | Mode | Choisir "Intervention directe" | Mode sélectionné | ☐ |
| 9 | Validation | Vérifier récapitulatif | Toutes infos correctes | ☐ |
| 10 | Création | Cliquer "Créer l'intervention" | Loading puis redirection | ☐ |
| 11 | Confirmation | Page détail intervention | Statut "approuvee", toast succès | ☐ |
| 12 | Notification | Vérifier | Prestataire notifié (Realtime) | ☐ |

### 2.2 Parcours : Nouvelle Intervention avec Demande de Devis

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1-7 | (Idem ci-dessus) | | | ☐ |
| 8 | Mode | Choisir "Demander un devis" | Mode devis sélectionné | ☐ |
| 9 | Multi-prestataires | Sélectionner 2-3 prestataires | Tous sélectionnés | ☐ |
| 10 | Création | Cliquer "Créer" | Intervention créée | ☐ |
| 11 | Statut | Vérifier | Statut "demande_de_devis" | ☐ |
| 12 | Attente | Devis Section | "En attente de devis" affiché | ☐ |

---

## 3. Gestion des Devis

### 3.1 Parcours : Réception et Validation Devis

**Préconditions** :
- Intervention en statut "demande_de_devis"
- Prestataire a soumis un devis

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | Recevoir notif "Nouveau devis" | Notif visible dans badge | ☐ |
| 2 | Navigation | Cliquer notification | Page intervention | ☐ |
| 3 | Section devis | Aller à l'onglet Devis | Liste devis visible | ☐ |
| 4 | Voir devis | Cliquer sur un devis | Détails: montant, description, pièces jointes | ☐ |
| 5 | Comparaison | Si multi-devis | Comparaison côte à côte | ☐ |
| 6 | Validation | Cliquer "Accepter ce devis" | Modal confirmation | ☐ |
| 7 | Confirmation | Confirmer | Devis validé, autres rejetés | ☐ |
| 8 | Statut | Vérifier | Statut passe à "planification" | ☐ |
| 9 | Notification | | Prestataire notifié (devis accepté) | ☐ |

### 3.2 Parcours : Rejet de Devis

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1-4 | (Voir devis) | | | ☐ |
| 5 | Rejet | Cliquer "Rejeter" | Modal avec raison | ☐ |
| 6 | Raison | Saisir raison du rejet | Texte enregistré | ☐ |
| 7 | Confirmer | Valider | Devis marqué rejeté | ☐ |
| 8 | Notification | | Prestataire notifié (devis rejeté) | ☐ |

---

## 4. Planification d'Intervention

### 4.1 Parcours : Planification Standard

**Préconditions** :
- Intervention en statut "planification"
- Prestataire a proposé ses disponibilités

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Aller à intervention | Page détail | ☐ |
| 2 | Section planning | Onglet Planning | Disponibilités prestataire visibles | ☐ |
| 3 | Créneaux | Voir créneaux proposés | Liste de créneaux avec dates/heures | ☐ |
| 4 | Sélection | Choisir un créneau | Créneau sélectionné | ☐ |
| 5 | Locataire | Envoyer pour confirmation locataire | Notif envoyée au locataire | ☐ |
| 6 | Attente | | Statut "en attente confirmation" | ☐ |
| 7 | Confirmation | Locataire confirme | Statut "planifiee" | ☐ |
| 8 | Notification | | Prestataire notifié (RDV confirmé) | ☐ |

### 4.2 Parcours : Matching Automatique

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Dispo prestataire | Prestataire soumet | Créneaux enregistrés | ☐ |
| 2 | Dispo locataire | Locataire soumet | Créneaux enregistrés | ☐ |
| 3 | Matching | Système compare | Créneaux communs identifiés | ☐ |
| 4 | Proposition | Gestionnaire voit matchs | Liste créneaux compatibles | ☐ |
| 5 | Sélection | Choisir créneau | Intervention planifiée | ☐ |

---

## 5. Suivi et Clôture d'Intervention

### 5.1 Parcours : Suivi Intervention en Cours

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Liste | `/gestionnaire/interventions` | Liste avec filtres | ☐ |
| 2 | Filtre | Filtrer par "en_cours" | Interventions en cours | ☐ |
| 3 | Sélection | Cliquer intervention | Page détail | ☐ |
| 4 | Timeline | Voir historique | Toutes étapes visibles | ☐ |
| 5 | Chat | Onglet commentaires | Échanges visibles | ☐ |
| 6 | Documents | Voir pièces jointes | Photos avant/pendant | ☐ |

### 5.2 Parcours : Clôture par Gestionnaire

**Préconditions** :
- Intervention en statut "cloturee_par_locataire"

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | Notif "Travaux validés par locataire" | Visible | ☐ |
| 2 | Navigation | Aller à intervention | Page détail | ☐ |
| 3 | Rapport | Voir rapport travaux prestataire | Photos après, description | ☐ |
| 4 | Validation locataire | Voir feedback locataire | Note/commentaire | ☐ |
| 5 | Finalisation | Cliquer "Finaliser l'intervention" | Modal confirmation | ☐ |
| 6 | Notes | Ajouter notes internes (optionnel) | Notes enregistrées | ☐ |
| 7 | Confirmer | Valider finalisation | Statut "cloturee_par_gestionnaire" | ☐ |
| 8 | Archivage | Intervention archivée | Visible dans historique | ☐ |

---

## 6. Gestion des Biens

### 6.1 Parcours : Création Immeuble + Lots

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | `/gestionnaire/biens` → "Nouveau bien" | Page création | ☐ |
| 2 | Type | Choisir "Immeuble" | Formulaire immeuble | ☐ |
| 3 | Nom | Saisir nom immeuble | Nom enregistré | ☐ |
| 4 | Adresse | Saisir adresse complète | Adresse validée | ☐ |
| 5 | Étape suivante | Cliquer "Suivant" | Étape contacts | ☐ |
| 6 | Contacts | Ajouter syndic/gardien | Contacts liés | ☐ |
| 7 | Documents | Upload documents (optionnel) | Docs uploadés | ☐ |
| 8 | Preview | Vérifier récapitulatif | Infos correctes | ☐ |
| 9 | Création | Confirmer | Immeuble créé, redirection détail | ☐ |
| 10 | Ajout lot | Cliquer "Ajouter un lot" | Formulaire lot | ☐ |
| 11 | Info lot | Remplir (nom, étage, surface) | Infos enregistrées | ☐ |
| 12 | Catégorie | Choisir catégorie (appartement) | Catégorie enregistrée | ☐ |
| 13 | Création lot | Confirmer | Lot créé, visible dans liste | ☐ |

### 6.2 Parcours : Modification Bien

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Détail immeuble → "Modifier" | Formulaire édition | ☐ |
| 2 | Modification | Changer une info (nom, adresse) | Modification possible | ☐ |
| 3 | Sauvegarde | Cliquer "Enregistrer" | Changements sauvés | ☐ |
| 4 | Confirmation | Toast succès | "Immeuble modifié" | ☐ |
| 5 | Vérification | Retour détail | Nouvelles infos affichées | ☐ |

### 6.3 Parcours : Suppression Bien

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Détail immeuble → Menu → "Supprimer" | Modal confirmation | ☐ |
| 2 | Avertissement | Lire message | Mention des lots/interventions liés | ☐ |
| 3 | Confirmation | Confirmer suppression | Bien supprimé | ☐ |
| 4 | Redirection | | Retour liste biens | ☐ |
| 5 | Vérification | Chercher l'immeuble | Non trouvé | ☐ |

---

## 7. Gestion des Contacts

### 7.1 Parcours : Création Contact + Invitation

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | `/gestionnaire/contacts` → "Nouveau" | Formulaire | ☐ |
| 2 | Type | Choisir individu | Formulaire individu | ☐ |
| 3 | Infos | Remplir nom, prénom, email, téléphone | Infos enregistrées | ☐ |
| 4 | Rôle | Choisir "Prestataire" | Rôle enregistré | ☐ |
| 5 | Catégorie | Choisir spécialité (plombier) | Catégorie enregistrée | ☐ |
| 6 | Invitation | Cocher "Envoyer invitation" | Option cochée | ☐ |
| 7 | Création | Confirmer | Contact créé | ☐ |
| 8 | Email | Vérifier boîte mail | Invitation reçue | ☐ |
| 9 | Badge | Sur contact | Badge "Invitation envoyée" | ☐ |

### 7.2 Parcours : Association Contact à Bien

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Détail immeuble → "Ajouter contact" | Sélecteur contact | ☐ |
| 2 | Recherche | Chercher contact existant | Contact trouvé | ☐ |
| 3 | Rôle | Définir rôle (syndic, gardien) | Rôle assigné | ☐ |
| 4 | Confirmation | Ajouter | Contact lié au bien | ☐ |
| 5 | Vérification | Section contacts | Contact visible | ☐ |

---

## 8. Gestion des Contrats

### 8.1 Parcours : Création Contrat de Location

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | `/gestionnaire/contrats` → "Nouveau" | Formulaire | ☐ |
| 2 | Lot | Sélectionner lot disponible | Lot sélectionné | ☐ |
| 3 | Locataire | Sélectionner/créer locataire | Locataire lié | ☐ |
| 4 | Dates | Définir début et fin | Dates valides | ☐ |
| 5 | Loyer | Saisir montant loyer | Montant enregistré | ☐ |
| 6 | Charges | Saisir charges | Charges enregistrées | ☐ |
| 7 | Dépôt | Saisir dépôt garantie | Montant enregistré | ☐ |
| 8 | Documents | Upload bail signé | Document uploadé | ☐ |
| 9 | Création | Confirmer | Contrat créé, statut "actif" | ☐ |
| 10 | Vérification | Lot | Locataire visible sur lot | ☐ |

---

## 9. Notifications et Communication

### 9.1 Parcours : Gestion Notifications

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Badge | Voir badge header | Nombre non-lues | ☐ |
| 2 | Popover | Cliquer icône | Liste notifications récentes | ☐ |
| 3 | Marquer lu | Cliquer notification | Marquée comme lue | ☐ |
| 4 | Navigation | Cliquer → action | Redirigé vers page liée | ☐ |
| 5 | Tout voir | Cliquer "Voir tout" | Page notifications complète | ☐ |
| 6 | Filtres | Filtrer par type | Liste filtrée | ☐ |
| 7 | Tout marquer | "Tout marquer comme lu" | Toutes lues | ☐ |

### 9.2 Parcours : Chat sur Intervention

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Détail intervention → Onglet Chat | Zone chat visible | ☐ |
| 2 | Message | Rédiger message | Message dans input | ☐ |
| 3 | Envoi | Envoyer | Message apparaît dans fil | ☐ |
| 4 | Pièce jointe | Attacher fichier | Fichier uploadé | ☐ |
| 5 | Envoi | Envoyer avec PJ | Message + PJ visible | ☐ |
| 6 | Real-time | (Prestataire répond) | Réponse apparaît immédiatement | ☐ |

---

## 10. Annulation et Cas d'Erreur

### 10.1 Parcours : Annulation Intervention

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Détail intervention | Page détail | ☐ |
| 2 | Action | Menu → "Annuler" | Modal confirmation | ☐ |
| 3 | Raison | Saisir raison annulation | Raison enregistrée | ☐ |
| 4 | Confirmation | Confirmer | Intervention annulée | ☐ |
| 5 | Statut | Vérifier | Statut "annulee" | ☐ |
| 6 | Notifications | | Tous acteurs notifiés | ☐ |
| 7 | Historique | Timeline | Annulation visible avec raison | ☐ |

### 10.2 Parcours : Rejet Demande d'Intervention

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | Notif "Nouvelle demande" (locataire) | Visible | ☐ |
| 2 | Navigation | Aller à intervention | Page détail, statut "demande" | ☐ |
| 3 | Évaluation | Lire description, voir photos | Infos complètes | ☐ |
| 4 | Rejet | Cliquer "Rejeter" | Modal avec raison | ☐ |
| 5 | Raison | Saisir raison | Raison enregistrée | ☐ |
| 6 | Confirmation | Confirmer | Statut "rejetee" | ☐ |
| 7 | Notification | | Locataire notifié avec raison | ☐ |

---

## 11. Performance et Edge Cases

### 11.1 Tests de Performance

| # | Test | Critère | Status |
|---|------|---------|--------|
| 11.1.1 | Dashboard chargement | < 3s | ☐ |
| 11.1.2 | Liste interventions (50+) | < 2s | ☐ |
| 11.1.3 | Détail intervention | < 2s | ☐ |
| 11.1.4 | Création intervention | < 5s total | ☐ |
| 11.1.5 | Upload images (5MB) | < 10s | ☐ |

### 11.2 Edge Cases

| # | Test | Résultat Attendu | Status |
|---|------|------------------|--------|
| 11.2.1 | Création intervention sans prestataire | Erreur validation | ☐ |
| 11.2.2 | Upload fichier > 10MB | Erreur taille | ☐ |
| 11.2.3 | Double submit création | Prévention double | ☐ |
| 11.2.4 | Session expirée pendant action | Redirection login | ☐ |
| 11.2.5 | Perte connexion pendant upload | Message erreur, retry | ☐ |
| 11.2.6 | Intervention sur bien supprimé | Gestion gracieuse | ☐ |

---

## Résumé Parcours Gestionnaire

| Parcours | Étapes | Testées | Bugs |
|----------|--------|---------|------|
| Connexion | 6 | ☐ | |
| Création intervention directe | 12 | ☐ | |
| Création intervention devis | 12 | ☐ | |
| Gestion devis | 9 | ☐ | |
| Planification | 8 | ☐ | |
| Clôture | 8 | ☐ | |
| Création bien | 13 | ☐ | |
| Gestion contacts | 9 | ☐ | |
| Gestion contrats | 10 | ☐ | |
| Notifications | 7 | ☐ | |
| Annulation | 7 | ☐ | |
| **TOTAL** | **101** | | |

---

**Testeur** : _________________
**Date** : _________________
**Environnement** : ☐ Local / ☐ Preview / ☐ Production
