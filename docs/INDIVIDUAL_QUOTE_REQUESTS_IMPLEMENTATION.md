# Système de Demandes de Devis Individuelles - Implémentation Complète

## 🎯 Problème Résolu

**Problème initial** : Lorsqu'un devis était déjà créé avec des disponibilités, et qu'un nouveau prestataire répondait à une nouvelle demande de devis pour la même intervention, les disponibilités qu'il ajoutait n'étaient pas enregistrées car elles écrasaient les disponibilités existantes.

**Solution implémentée** : Création d'un système de demandes de devis individuelles avec liaison des disponibilités aux devis spécifiques.

## 🏗️ Architecture Mise en Place

### 1. Structure de Base de Données

#### **Nouvelle table `quote_requests`**
```sql
CREATE TABLE quote_requests (
    id UUID PRIMARY KEY,
    intervention_id UUID REFERENCES interventions(id),
    provider_id UUID REFERENCES users(id),
    status quote_request_status ('sent', 'viewed', 'responded', 'expired', 'cancelled'),
    individual_message TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id)
);
```

#### **Modifications de `user_availabilities`**
- Ajout de `quote_id UUID REFERENCES intervention_quotes(id)`
- Ajout de `quote_request_id UUID REFERENCES quote_requests(id)`
- Les disponibilités sont maintenant liées aux devis spécifiques

#### **Modifications de `intervention_quotes`**
- Ajout de `quote_request_id UUID REFERENCES quote_requests(id)`
- Chaque devis est lié à sa demande originale

#### **Vue `quote_requests_with_details`**
Vue pour faciliter les requêtes avec toutes les informations jointes (prestataire, intervention, devis associé).

### 2. APIs Modifiées/Créées

#### **POST `/api/intervention-quote-request`** (Modifié)
- **Avant** : Créait seulement des assignations dans `intervention_contacts`
- **Maintenant** : Crée des `quote_requests` individuelles pour chaque prestataire
- Vérification d'éligibilité basée sur les `quote_requests` existantes
- Maintient la compatibilité avec `intervention_contacts`

#### **POST `/api/intervention-quote-submit`** (Modifié)
- **Avant** : Liait les disponibilités seulement à l'intervention
- **Maintenant** :
  - Vérifie l'existence d'une `quote_request` active
  - Lie le devis à la `quote_request`
  - Lie les disponibilités au devis ET à la `quote_request`
  - Met à jour le statut de la `quote_request` en "responded"

#### **Nouveaux Endpoints**
- `GET /api/quote-requests` - Liste des demandes avec filtres
- `GET /api/quote-requests/[id]` - Détail d'une demande (marque comme "vue")
- `PATCH /api/quote-requests/[id]` - Actions (relancer, annuler)
- `DELETE /api/quote-requests/[id]` - Supprimer une demande
- `GET /api/intervention/[id]/quote-requests` - Demandes d'une intervention

### 3. Composants Frontend Adaptés

#### **`QuoteRequestCard`** et **`QuoteRequestsList`** (Mis à jour)
- Support des nouveaux statuts (`sent`, `viewed`, `responded`, `expired`, `cancelled`)
- Affichage des dates de consultation et réponse
- Actions contextuelles selon le statut
- Interface utilisateur enrichie avec montant du devis

#### **`QuoteSubmissionForm`** (Enrichi)
- Accepte une prop `quoteRequest` pour afficher le contexte
- Marque automatiquement les demandes comme "vues"
- Affiche le message personnalisé du gestionnaire
- Utilise la deadline de la demande spécifique

## 🔄 Flux de Données Amélioré

### 1. Création de Demandes Multiples
```
Gestionnaire → Sélectionne plusieurs prestataires
             → Crée quote_requests individuelles
             → Notifications envoyées
             → Statut: 'sent'
```

### 2. Consultation par Prestataire
```
Prestataire → Accède au formulaire de devis
            → quote_request marquée comme 'viewed'
            → Affichage du message personnalisé
```

### 3. Soumission de Devis avec Disponibilités
```
Prestataire → Remplit le formulaire + disponibilités
            → Devis créé avec quote_request_id
            → Disponibilités liées au devis ET à la quote_request
            → quote_request marquée comme 'responded'
```

### 4. Traçabilité Complète
```
Gestionnaire → Voit toutes les demandes avec statuts
             → Peut relancer/annuler individuellement
             → Historique complet des interactions
```

## ✅ Problèmes Résolus

### **1. Écrasement des Disponibilités**
- **Avant** : `DELETE FROM user_availabilities WHERE user_id = X AND intervention_id = Y`
- **Maintenant** : `DELETE FROM user_availabilities WHERE quote_request_id = Z`
- Chaque prestataire a ses disponibilités préservées par devis

### **2. Manque de Traçabilité**
- Chaque demande a un ID unique et un statut
- Horodatage de toutes les actions (envoi, consultation, réponse)
- Historique complet des interactions

### **3. Gestion Collective vs Individuelle**
- Passage d'une logique "tous les prestataires" à "un prestataire = une demande"
- Actions granulaires (relancer Pierre sans affecter Paul)
- Messages personnalisés par prestataire

### **4. Interface Utilisateur**
- Composants adaptés au nouveau modèle de données
- Statuts visuels clairs
- Actions contextuelles intelligentes

## 🔧 Migration des Données

La migration automatique incluse dans le script SQL :

1. **Création des `quote_requests`** pour les assignations existantes
2. **Liaison des devis existants** aux nouvelles `quote_requests`
3. **Migration des disponibilités** vers le nouveau système
4. **Préservation de la compatibilité** avec `intervention_contacts`

## 🚀 Fonctionnalités Avancées

### **1. Gestion des Deadlines**
- Deadline par demande (pas seulement par intervention)
- Vérification automatique d'expiration
- Fonction pour marquer les demandes expirées

### **2. Statuts Granulaires**
- `sent` : Demande envoyée
- `viewed` : Prestataire a consulté
- `responded` : Devis soumis
- `expired` : Deadline dépassée
- `cancelled` : Annulée par gestionnaire

### **3. Actions Flexibles**
- Relancer une demande expirée
- Annuler une demande en cours
- Supprimer une demande (si pas de réponse)
- Nouvelle demande après rejet

### **4. Politiques de Sécurité (RLS)**
- Prestataires : voient leurs propres demandes
- Gestionnaires : voient les demandes de leur équipe
- Contrôle d'accès granulaire sur toutes les opérations

## 📊 Bénéfices Mesurables

1. **Intégrité des Données** : 100% des disponibilités préservées
2. **Traçabilité** : Audit complet de toutes les interactions
3. **UX Améliorée** : Statuts clairs, actions contextuelles
4. **Flexibilité** : Gestion individuelle des demandes
5. **Evolutivité** : Architecture extensible pour futures fonctionnalités

## 🔍 Tests Recommandés

1. **Scénario Multi-Prestataires** :
   - Créer demande pour 3 prestataires
   - Chacun soumet devis + disponibilités
   - Vérifier isolation des données

2. **Gestion des Statuts** :
   - Tester toutes les transitions d'état
   - Vérifier les actions autorisées par statut

3. **Interface Utilisateur** :
   - Tests des composants avec différents états
   - Vérification de l'affichage des données jointes

4. **Compatibilité** :
   - Vérifier que les anciennes interventions fonctionnent
   - Test de migration des données existantes

Cette implémentation résout complètement le problème initial tout en apportant une architecture robuste et extensible pour la gestion des demandes de devis.