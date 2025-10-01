# 📧 Spécifications Templates Email - Application Seido

> **Date de création** : Janvier 2025  
> **Version** : 1.0  
> **Statut** : Spécifications pour designer  

## 🎨 Guidelines de Design

### Identité Visuelle
- **Couleurs principales** : Utiliser la palette de l'application Seido (couleurs primaires, secondaires, neutres)
- **Logo** : Intégrer le logo Seido en en-tête
- **Typographie** : Police moderne et lisible (Inter ou équivalent)
- **Style** : Design épuré, professionnel, responsive

### Structure Template
- **En-tête** : Logo + nom de l'application
- **Corps principal** : Message clair et actionnable
- **Boutons d'action** : CTA visibles avec couleurs de l'app
- **Pied de page** : Informations légales, désabonnement, contact
- **Responsive** : Adaptation mobile optimale

### Éléments Visuels
- **Icônes** : Utiliser les icônes Lucide (cohérentes avec l'app)
- **Badges** : Pour les statuts (urgent, normal, etc.)
- **Espacement** : Aération généreuse pour la lisibilité
- **Contraste** : Respecter les standards d'accessibilité

---

## 📋 Liste des Templates par Rôle Utilisateur

### 🔐 **AUTHENTIFICATION & COMPTE**

#### 1. **Confirmation d'inscription** (Tous rôles)
- **Déclencheur** : Inscription d'un nouvel utilisateur
- **Destinataire** : Utilisateur qui s'inscrit
- **Objectif** : Confirmer l'email et activer le compte
- **Contenu** :
  - Message de bienvenue personnalisé selon le rôle
  - Bouton "Confirmer mon email"
  - Instructions de connexion
  - Support technique si problème

#### 2. **Réinitialisation de mot de passe** (Tous rôles)
- **Déclencheur** : Demande de reset password
- **Destinataire** : Utilisateur ayant oublié son mot de passe
- **Objectif** : Permettre la réinitialisation sécurisée
- **Contenu** :
  - Lien sécurisé de réinitialisation (expire dans 1h)
  - Instructions de sécurité
  - Si non demandé, contacter le support

#### 3. **Mot de passe modifié** (Tous rôles)
- **Déclencheur** : Changement de mot de passe réussi
- **Destinataire** : Utilisateur ayant changé son mot de passe
- **Objectif** : Confirmer le changement et alerter si non autorisé
- **Contenu** :
  - Confirmation du changement
  - Date/heure de modification
  - Si non autorisé, contacter immédiatement le support

---

### 👥 **GESTIONNAIRE**

#### 4. **Bienvenue gestionnaire** (Nouveau compte)
- **Déclencheur** : Inscription complète d'un gestionnaire
- **Destinataire** : Nouveau gestionnaire
- **Objectif** : Onboarding et présentation des fonctionnalités
- **Contenu** :
  - Message de bienvenue personnalisé
  - Guide des premières étapes
  - Liens vers les fonctionnalités principales
  - Support et formation

#### 5. **Invitation d'équipe** (Invitation externe)
- **Déclencheur** : Invitation d'un contact à rejoindre l'équipe
- **Destinataire** : Contact invité (email externe)
- **Objectif** : Inviter à rejoindre l'équipe Seido
- **Contenu** :
  - Message d'invitation personnalisé
  - Lien d'inscription avec rôle pré-attribué
  - Informations sur l'équipe et les permissions
  - Date d'expiration de l'invitation

#### 6. **Nouvelle demande d'intervention** (Notification)
- **Déclencheur** : Soumission d'une demande par un locataire
- **Destinataire** : Gestionnaire de l'équipe
- **Objectif** : Notifier d'une nouvelle demande à traiter
- **Contenu** :
  - Détails de la demande (titre, type, urgence)
  - Informations du locataire et du bien
  - Bouton "Voir la demande"
  - Délai de traitement recommandé

#### 7. **Demande d'intervention approuvée** (Confirmation)
- **Déclencheur** : Approbation d'une demande par le gestionnaire
- **Destinataire** : Locataire demandeur
- **Objectif** : Confirmer l'approbation et prochaines étapes
- **Contenu** :
  - Confirmation d'approbation
  - Prochaines étapes (recherche prestataire, planification)
  - Délai estimé de traitement
  - Contact pour questions

#### 8. **Demande d'intervention rejetée** (Notification)
- **Déclencheur** : Rejet d'une demande par le gestionnaire
- **Destinataire** : Locataire demandeur
- **Objectif** : Informer du rejet avec motif
- **Contenu** :
  - Notification de rejet
  - Motif du rejet
  - Alternatives possibles
  - Contact pour clarification

#### 9. **Nouveau locataire ajouté** (Notification)
- **Déclencheur** : Ajout d'un locataire à un bien
- **Destinataire** : Locataire ajouté
- **Objectif** : Informer de l'ajout et présenter les fonctionnalités
- **Contenu** :
  - Message de bienvenue
  - Informations sur le bien
  - Guide d'utilisation de l'app
  - Contact gestionnaire

---

### 🏠 **LOCATAIRE**

#### 10. **Bienvenue locataire** (Nouveau compte)
- **Déclencheur** : Ajout d'un locataire à un bien
- **Destinataire** : Nouveau locataire
- **Objectif** : Onboarding et présentation des fonctionnalités
- **Contenu** :
  - Message de bienvenue personnalisé
  - Informations sur le bien
  - Guide de soumission de demandes
  - Contact gestionnaire

#### 11. **Demande soumise** (Confirmation)
- **Déclencheur** : Soumission d'une demande d'intervention
- **Destinataire** : Locataire demandeur
- **Objectif** : Confirmer la réception et prochaines étapes
- **Contenu** :
  - Confirmation de réception
  - Numéro de référence
  - Délai de traitement estimé
  - Suivi de la demande

#### 12. **Demande en cours** (Notification)
- **Déclencheur** : Début d'une intervention
- **Destinataire** : Locataire concerné
- **Objectif** : Informer du début des travaux
- **Contenu** :
  - Notification de début d'intervention
  - Informations du prestataire
  - Délai estimé
  - Contact prestataire

#### 13. **Intervention terminée** (Notification)
- **Déclencheur** : Finalisation d'une intervention
- **Destinataire** : Locataire concerné
- **Objectif** : Confirmer la fin et demander validation
- **Contenu** :
  - Confirmation de fin d'intervention
  - Résumé des travaux effectués
  - Demande de validation
  - Contact pour questions

---

### 🔧 **PRESTATAIRE**

#### 14. **Bienvenue prestataire** (Nouveau compte)
- **Déclencheur** : Inscription d'un prestataire
- **Destinataire** : Nouveau prestataire
- **Objectif** : Onboarding et présentation des fonctionnalités
- **Contenu** :
  - Message de bienvenue personnalisé
  - Guide des fonctionnalités prestataire
  - Gestion des disponibilités
  - Support technique

#### 15. **Demande de devis reçue** (Notification)
- **Déclencheur** : Envoi d'une demande de devis
- **Destinataire** : Prestataire sélectionné
- **Objectif** : Notifier d'une nouvelle demande de devis
- **Contenu** :
  - Détails de la demande
  - Informations du bien et du locataire
  - Lien d'accès direct (magic link)
  - Délai de réponse

#### 16. **Devis soumis** (Confirmation)
- **Déclencheur** : Soumission d'un devis
- **Destinataire** : Prestataire qui a soumis
- **Objectif** : Confirmer la soumission et prochaines étapes
- **Contenu** :
  - Confirmation de soumission
  - Détails du devis
  - Délai de validation
  - Suivi de la réponse

#### 17. **Devis approuvé** (Notification)
- **Déclencheur** : Approbation d'un devis par le gestionnaire
- **Destinataire** : Prestataire concerné
- **Objectif** : Informer de l'approbation et planifier
- **Contenu** :
  - Notification d'approbation
  - Détails de l'intervention
  - Prochaines étapes
  - Contact gestionnaire

#### 18. **Devis rejeté** (Notification)
- **Déclencheur** : Rejet d'un devis par le gestionnaire
- **Destinataire** : Prestataire concerné
- **Objectif** : Informer du rejet avec motif
- **Contenu** :
  - Notification de rejet
  - Motif du rejet
  - Retours constructifs
  - Opportunités futures

#### 19. **Intervention planifiée** (Notification)
- **Déclencheur** : Planification d'une intervention
- **Destinataire** : Prestataire assigné
- **Objectif** : Confirmer la planification et détails
- **Contenu** :
  - Détails de l'intervention
  - Date et heure planifiées
  - Informations du bien et du locataire
  - Contact et accès

#### 20. **Intervention terminée** (Confirmation)
- **Déclencheur** : Finalisation d'une intervention
- **Destinataire** : Prestataire concerné
- **Objectif** : Confirmer la finalisation et paiement
- **Contenu** :
  - Confirmation de finalisation
  - Détails de facturation
  - Processus de paiement
  - Évaluation de performance

---

### 🔔 **NOTIFICATIONS SYSTÈME**

#### 21. **Rappel de devis** (Rappel)
- **Déclencheur** : Délai de réponse approchant
- **Destinataire** : Prestataire concerné
- **Objectif** : Rappeler de soumettre le devis
- **Contenu** :
  - Rappel du délai
  - Détails de la demande
  - Lien d'accès direct
  - Conséquences du retard

#### 22. **Rappel d'intervention** (Rappel)
- **Déclencheur** : Intervention programmée prochainement
- **Destinataire** : Prestataire et locataire
- **Objectif** : Rappeler l'intervention à venir
- **Contenu** :
  - Détails de l'intervention
  - Date et heure
  - Préparatifs nécessaires
  - Contact d'urgence

#### 23. **Intervention en retard** (Alerte)
- **Déclencheur** : Intervention non commencée à l'heure
- **Destinataire** : Gestionnaire et prestataire
- **Objectif** : Alerter du retard et prendre action
- **Contenu** :
  - Alerte de retard
  - Détails de l'intervention
  - Actions à prendre
  - Contact d'urgence

#### 24. **Rapport hebdomadaire** (Rapport)
- **Déclencheur** : Fin de semaine
- **Destinataire** : Gestionnaire
- **Objectif** : Résumé de l'activité de la semaine
- **Contenu** :
  - Statistiques de la semaine
  - Interventions en cours
  - Actions requises
  - Performance de l'équipe

---

### 🚨 **ALERTES & URGENCES**

#### 25. **Intervention urgente** (Alerte)
- **Déclencheur** : Demande marquée comme urgente
- **Destinataire** : Gestionnaire et prestataires disponibles
- **Objectif** : Alerter immédiatement de l'urgence
- **Contenu** :
  - Alerte urgente
  - Détails de l'urgence
  - Actions immédiates
  - Contact d'urgence

#### 26. **Problème technique** (Alerte)
- **Déclencheur** : Erreur système ou problème technique
- **Destinataire** : Administrateurs
- **Objectif** : Alerter des problèmes techniques
- **Contenu** :
  - Description du problème
  - Impact sur les utilisateurs
  - Actions de résolution
  - Statut de résolution

---

## 📊 **MÉTRIQUES & SUIVI**

### Templates par Priorité
- **Critique** : 6 templates (urgences, alertes)
- **Haute** : 8 templates (authentification, confirmations importantes)
- **Normale** : 12 templates (notifications, rappels)

### Templates par Fréquence
- **Fréquents** : 10 templates (notifications, confirmations)
- **Occasionnels** : 12 templates (rapports, rappels)
- **Rares** : 4 templates (urgences, problèmes techniques)

### Personnalisation Requise
- **Nom de l'utilisateur** : Tous les templates
- **Nom de l'équipe** : Templates gestionnaire
- **Détails de l'intervention** : Templates intervention
- **Informations du bien** : Templates locataire/prestataire

---

## 🔧 **TECHNICAL SPECS**

### Variables Dynamiques
- `{{user_name}}` - Nom de l'utilisateur
- `{{team_name}}` - Nom de l'équipe
- `{{intervention_title}}` - Titre de l'intervention
- `{{intervention_reference}}` - Référence de l'intervention
- `{{property_address}}` - Adresse du bien
- `{{deadline}}` - Date limite
- `{{magic_link}}` - Lien d'accès direct
- `{{support_email}}` - Email de support

### Responsive Design
- **Mobile First** : Optimisation pour mobile
- **Breakpoints** : 320px, 768px, 1024px
- **Images** : Optimisées et responsive
- **Boutons** : Taille minimum 44px pour le touch

### Accessibilité
- **Contraste** : Ratio minimum 4.5:1
- **Alt text** : Toutes les images
- **Structure** : Headings hiérarchisés
- **Focus** : Navigation clavier

---

## 📝 **NOTES POUR LE DESIGNER**

1. **Cohérence** : Maintenir la cohérence visuelle avec l'application web
2. **Lisibilité** : Privilégier la lisibilité sur tous les appareils
3. **Action** : Rendre les boutons d'action très visibles
4. **Urgence** : Utiliser des couleurs d'alerte pour les emails urgents
5. **Personnalisation** : Adapter le ton selon le rôle de l'utilisateur
6. **Testing** : Tester sur différents clients email (Gmail, Outlook, Apple Mail)

---

*Document créé le 15 janvier 2025 - Version 1.0*
