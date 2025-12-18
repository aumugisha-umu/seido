# Parcours E2E Locataire - SEIDO

> **Rôle** : Locataire (10% des utilisateurs)
> **Focus** : Demandes d'intervention, suivi, validation
> **Priorité** : P2 - Important
> **UX** : Simple, rassurant, mobile-first

---

## 1. Connexion et Onboarding

### 1.1 Parcours : Première Connexion via Invitation

**Préconditions** : Invitation reçue par email du gestionnaire

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Email | Cliquer lien invitation | Page set-password | ☐ |
| 2 | Password | Créer mot de passe | Validation force | ☐ |
| 3 | Confirmation | Confirmer password | Match validé | ☐ |
| 4 | Submit | Valider | Compte activé | ☐ |
| 5 | Bienvenue | Message d'accueil | Explication interface | ☐ |
| 6 | Dashboard | Redirection | Dashboard locataire | ☐ |

### 1.2 Parcours : Connexion Standard

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Login | `/auth/login` | Page login | ☐ |
| 2 | Credentials | Entrer email/password | Validation | ☐ |
| 3 | Submit | Se connecter | Redirection dashboard | ☐ |
| 4 | Dashboard | Vérifier | Interface simple et accueillante | ☐ |

### 1.3 Parcours : Dashboard Locataire

| # | Élément | Vérification | Status |
|---|---------|--------------|--------|
| 1.3.1 | Bienvenue | Message personnalisé avec prénom | ☐ |
| 1.3.2 | Mon logement | Adresse du lot visible | ☐ |
| 1.3.3 | Interventions | Interventions en cours listées | ☐ |
| 1.3.4 | Bouton CTA | "Signaler un problème" bien visible | ☐ |
| 1.3.5 | Annonces | Messages du gestionnaire | ☐ |
| 1.3.6 | Design | Couleurs rassurantes (emerald) | ☐ |
| 1.3.7 | Simplicité | Pas de surcharge d'informations | ☐ |

---

## 2. Demande d'Intervention

### 2.1 Parcours : Nouvelle Demande (Wizard Simplifié)

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | CTA | Cliquer "Signaler un problème" | Wizard step 1 | ☐ |
| 2 | Type | Choisir type de problème | Catégories claires (plomberie, électricité, etc.) | ☐ |
| 3 | Step 2 | Suivant | Étape description | ☐ |
| 4 | Description | Décrire le problème | Zone texte avec placeholder guidant | ☐ |
| 5 | Urgence | Indiquer si urgent | Option urgence visible | ☐ |
| 6 | Step 3 | Suivant | Étape photos | ☐ |
| 7 | Photos | Ajouter photos (optionnel) | Upload facile, preview | ☐ |
| 8 | Step 4 | Suivant | Récapitulatif | ☐ |
| 9 | Vérification | Relire demande | Toutes infos visibles | ☐ |
| 10 | Modification | Cliquer "Modifier" si besoin | Retour étape concernée | ☐ |
| 11 | Submit | "Envoyer ma demande" | Loading | ☐ |
| 12 | Confirmation | Page succès | Message rassurant, numéro demande | ☐ |
| 13 | Notification | | Gestionnaire notifié | ☐ |

### 2.2 Variantes à Tester

| # | Variante | Résultat Attendu | Status |
|---|----------|------------------|--------|
| 2.2.1 | Demande sans photo | Acceptée (optionnel) | ☐ |
| 2.2.2 | Demande avec 5 photos | Toutes uploadées | ☐ |
| 2.2.3 | Demande urgente | Badge urgence visible | ☐ |
| 2.2.4 | Annulation en cours de wizard | Confirmation avant quitter | ☐ |

---

## 3. Suivi des Interventions

### 3.1 Parcours : Voir Mes Interventions

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Menu → "Mes interventions" | Liste interventions | ☐ |
| 2 | Liste | Voir toutes mes demandes | Liste chronologique | ☐ |
| 3 | Statuts | Badges de statut visibles | Couleurs distinctives | ☐ |
| 4 | Filtre | Filtrer par statut | Liste filtrée | ☐ |
| 5 | Détail | Cliquer une intervention | Page détail | ☐ |

### 3.2 Parcours : Suivi d'une Intervention Active

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Détail | Ouvrir intervention en cours | Page détail | ☐ |
| 2 | Timeline | Voir progression | Étapes visuelles (stepper) | ☐ |
| 3 | Statut actuel | Statut clairement visible | Badge coloré + description | ☐ |
| 4 | Prochaine étape | Information sur la suite | Texte explicatif | ☐ |
| 5 | Interlocuteurs | Voir qui s'en occupe | Nom gestionnaire/prestataire | ☐ |
| 6 | Documents | Voir photos/docs | Photos de la demande | ☐ |

### 3.3 États d'Intervention (Vue Locataire)

| Statut | Affichage Locataire | Message | Status Test |
|--------|---------------------|---------|-------------|
| `demande` | "En attente de validation" | "Votre demande est en cours d'examen" | ☐ |
| `rejetee` | "Demande non retenue" | Raison du rejet + contact | ☐ |
| `approuvee` | "Demande acceptée" | "Un prestataire va être assigné" | ☐ |
| `demande_de_devis` | "Recherche de prestataire" | "Nous recherchons le meilleur prestataire" | ☐ |
| `planification` | "Planification en cours" | "Choisissez vos disponibilités" | ☐ |
| `planifiee` | "RDV confirmé" | Date et heure du RDV | ☐ |
| `en_cours` | "Travaux en cours" | "Le prestataire intervient" | ☐ |
| `cloturee_par_prestataire` | "Travaux terminés" | "Validez les travaux" | ☐ |
| `cloturee_par_locataire` | "En finalisation" | "Merci pour votre validation" | ☐ |
| `cloturee_par_gestionnaire` | "Terminé" | "Intervention clôturée" | ☐ |

---

## 4. Planification et Disponibilités

### 4.1 Parcours : Confirmer Disponibilités

**Préconditions** : Intervention en statut "planification"

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | "Indiquez vos disponibilités" | Notification reçue | ☐ |
| 2 | Navigation | Cliquer notification | Page intervention | ☐ |
| 3 | Section | Voir section "Planning" | Calendrier/créneaux | ☐ |
| 4 | Créneaux | Voir créneaux proposés par prestataire | Liste créneaux | ☐ |
| 5 | Sélection | Sélectionner créneaux qui conviennent | Créneaux sélectionnés (plusieurs possibles) | ☐ |
| 6 | Validation | Confirmer sélection | Créneaux enregistrés | ☐ |
| 7 | Message | Toast confirmation | "Disponibilités envoyées" | ☐ |
| 8 | Attente | Statut mis à jour | "En attente de confirmation" | ☐ |

### 4.2 Parcours : Confirmation du RDV Final

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | "RDV confirmé" | Notification push/email | ☐ |
| 2 | Détails | Voir intervention | Date, heure, prestataire | ☐ |
| 3 | Infos | Voir détails prestataire | Nom, spécialité, photo | ☐ |
| 4 | Instructions | Consignes éventuelles | Si nécessaire (accès, présence) | ☐ |
| 5 | Rappel | 24h avant | Notification rappel | ☐ |

### 4.3 Parcours : Report de RDV

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Intervention | Ouvrir intervention planifiée | Page détail | ☐ |
| 2 | Action | Cliquer "Demander report" | Modal/formulaire | ☐ |
| 3 | Raison | Saisir raison | Texte enregistré | ☐ |
| 4 | Submit | Confirmer | Demande envoyée | ☐ |
| 5 | Notification | | Gestionnaire notifié | ☐ |
| 6 | Statut | | Retour en planification | ☐ |

---

## 5. Validation des Travaux

### 5.1 Parcours : Valider Travaux Terminés

**Préconditions** : Intervention en statut "cloturee_par_prestataire"

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Notification | "Travaux terminés - Validez" | Notification urgente | ☐ |
| 2 | Navigation | Cliquer notification | Page intervention | ☐ |
| 3 | Rapport | Voir rapport du prestataire | Photos après, description | ☐ |
| 4 | Comparaison | Photos avant/après | Comparaison visuelle | ☐ |
| 5 | Satisfaction | Êtes-vous satisfait ? | Choix Oui/Non | ☐ |
| 6 | Note | Noter le travail (optionnel) | 1-5 étoiles | ☐ |
| 7 | Commentaire | Ajouter commentaire (optionnel) | Texte libre | ☐ |
| 8 | Validation | "Je valide les travaux" | Bouton vert visible | ☐ |
| 9 | Confirmation | Modal confirmation | "Êtes-vous sûr ?" | ☐ |
| 10 | Submit | Confirmer | Validation enregistrée | ☐ |
| 11 | Merci | Message remerciement | Feedback positif | ☐ |
| 12 | Statut | Vérifier | "cloturee_par_locataire" | ☐ |

### 5.2 Parcours : Signaler un Problème

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Rapport | Voir rapport travaux | Photos après | ☐ |
| 2 | Problème | Cliquer "Signaler un problème" | Formulaire | ☐ |
| 3 | Description | Décrire le problème | Texte enregistré | ☐ |
| 4 | Photos | Ajouter photos du problème | Photos uploadées | ☐ |
| 5 | Submit | Envoyer | Signalement envoyé | ☐ |
| 6 | Notification | | Gestionnaire alerté | ☐ |
| 7 | Suite | | Intervention potentiellement rouverte | ☐ |

---

## 6. Communication

### 6.1 Parcours : Chat sur Intervention

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Intervention | Ouvrir intervention | Page détail | ☐ |
| 2 | Chat | Section commentaires/chat | Zone visible | ☐ |
| 3 | Message | Rédiger question | Input texte | ☐ |
| 4 | Envoi | Envoyer | Message apparaît | ☐ |
| 5 | Réponse | Attendre réponse | Notif quand réponse | ☐ |
| 6 | Voir | Retourner sur intervention | Réponse visible | ☐ |

### 6.2 Parcours : Notifications

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Badge | Voir nombre non-lues | Badge visible | ☐ |
| 2 | Ouvrir | Cliquer icône notifications | Liste | ☐ |
| 3 | Lire | Voir notifications | Types distincts | ☐ |
| 4 | Action | Cliquer → aller à page liée | Redirection correcte | ☐ |

---

## 7. Profil et Paramètres

### 7.1 Parcours : Mise à Jour Profil

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Menu → Profil | Page profil | ☐ |
| 2 | Infos | Voir mes informations | Nom, email, téléphone | ☐ |
| 3 | Logement | Voir mon logement | Adresse du lot | ☐ |
| 4 | Modifier | Modifier téléphone | Champ éditable | ☐ |
| 5 | Save | Sauvegarder | Confirmation | ☐ |

### 7.2 Parcours : Paramètres Notifications

| # | Étape | Action | Résultat Attendu | Status |
|---|-------|--------|------------------|--------|
| 1 | Navigation | Menu → Paramètres | Page paramètres | ☐ |
| 2 | Notifications | Section notifications | Options visibles | ☐ |
| 3 | Email | Activer/désactiver emails | Toggle fonctionnel | ☐ |
| 4 | Push | Activer/désactiver push | Toggle fonctionnel | ☐ |
| 5 | Save | Sauvegarder | Préférences enregistrées | ☐ |

---

## 8. Tests Mobile (Priorité Haute)

### 8.1 Parcours Mobile : Demande Complète

| # | Étape | Device | Status |
|---|-------|--------|--------|
| 8.1.1 | Login mobile | Smartphone 375px | ☐ |
| 8.1.2 | Dashboard lisible | Touch navigation | ☐ |
| 8.1.3 | Wizard "Signaler" | Étapes claires | ☐ |
| 8.1.4 | Upload photo camera | Depuis appareil photo | ☐ |
| 8.1.5 | Upload photo galerie | Depuis galerie | ☐ |
| 8.1.6 | Formulaires clavier | Clavier virtuel OK | ☐ |
| 8.1.7 | Scroll intervention | Fluide 60fps | ☐ |
| 8.1.8 | Validation travaux | Boutons accessibles | ☐ |

### 8.2 UX Mobile Spécifique

| # | Test | Critère | Status |
|---|------|---------|--------|
| 8.2.1 | Touch targets | ≥ 44px | ☐ |
| 8.2.2 | Police lisible | ≥ 16px sans zoom | ☐ |
| 8.2.3 | Contraste | Texte lisible au soleil | ☐ |
| 8.2.4 | Chargement | < 3s (4G) | ☐ |
| 8.2.5 | Couleurs | Emerald/vert rassurant | ☐ |

---

## 9. Cas d'Erreur et Edge Cases

### 9.1 Gestion Erreurs

| # | Scénario | Comportement Attendu | Status |
|---|----------|----------------------|--------|
| 9.1.1 | Demande sans description | Erreur validation | ☐ |
| 9.1.2 | Photo trop volumineuse | Message taille max | ☐ |
| 9.1.3 | Session expirée | Redirection login douce | ☐ |
| 9.1.4 | Validation déjà faite | Message "déjà validé" | ☐ |
| 9.1.5 | Intervention annulée | Message clair | ☐ |
| 9.1.6 | Perte connexion upload | Retry proposé | ☐ |

### 9.2 Cas Particuliers

| # | Scénario | Comportement Attendu | Status |
|---|----------|----------------------|--------|
| 9.2.1 | Aucune intervention | Message "Rien pour le moment" + CTA | ☐ |
| 9.2.2 | Intervention rejetée | Explication + possibilité re-demande | ☐ |
| 9.2.3 | Changement de logement | Données mises à jour | ☐ |
| 9.2.4 | Multi-interventions actives | Liste claire avec priorité | ☐ |

---

## 10. Accessibilité et Simplicité

### 10.1 Tests Accessibilité (Important pour locataires)

| # | Test | Critère | Status |
|---|------|---------|--------|
| 10.1.1 | Navigation clavier | Tab complet | ☐ |
| 10.1.2 | Contraste texte | 4.5:1 minimum | ☐ |
| 10.1.3 | Labels formulaires | Tous présents | ☐ |
| 10.1.4 | Messages d'erreur | Clairs et visibles | ☐ |
| 10.1.5 | Focus visible | Ring visible | ☐ |

### 10.2 Tests Simplicité

| # | Test | Critère | Status |
|---|------|---------|--------|
| 10.2.1 | Demande intervention | < 2 minutes | ☐ |
| 10.2.2 | Nombre de clics | Minimum nécessaire | ☐ |
| 10.2.3 | Termes utilisés | Français simple | ☐ |
| 10.2.4 | Aide contextuelle | Tooltips si besoin | ☐ |
| 10.2.5 | Feedback actions | Toast/message visible | ☐ |

---

## Résumé Parcours Locataire

| Parcours | Étapes | Testées | Bugs |
|----------|--------|---------|------|
| Connexion | 6 | ☐ | |
| Dashboard | 7 | ☐ | |
| Demande intervention | 13 | ☐ | |
| Suivi intervention | 6 | ☐ | |
| Disponibilités | 8 | ☐ | |
| Validation travaux | 12 | ☐ | |
| Communication | 6 | ☐ | |
| Profil | 5 | ☐ | |
| Mobile | 8 | ☐ | |
| Accessibilité | 5 | ☐ | |
| **TOTAL** | **76** | | |

---

**Testeur** : _________________
**Date** : _________________
**Device Mobile** : _________________
**Temps moyen demande** : _____ min
