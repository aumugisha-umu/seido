# Plan de Migration : Assignation des Contacts par Role/Provider_Type

## 📋 CONTEXTE

**Objectif :** Remplacer l'utilisation du champ `contact_type` (enum) dans les tables `building_contacts` et `lot_contacts` par une logique basée sur les champs `role` et `provider_category` de la table `users`.

**Architecture actuelle :**
- Tables `building_contacts` et `lot_contacts` utilisent `contact_type` (enum)
- Table `users` contient déjà `role` (user_role) et `provider_category` (provider_category)
- Frontend utilise un mapping avec des types comme `tenant`, `provider`, etc.

## 🎯 PLAN D'EXÉCUTION ÉTAPE PAR ÉTAPE

### 🗄️ PHASE 1 : SCHÉMA DE BASE DE DONNÉES

#### Étape 1.1 : Modification du schéma initial
- [ ] **Fichier** : `supabase/migrations/20250913000000_initialize_clean_schema.sql`
- [ ] Supprimer l'enum `contact_type` (lignes 67-77)
- [ ] Modifier la table `building_contacts` (lignes 252-267) :
  - Supprimer le champ `contact_type contact_type NOT NULL`
  - Supprimer le champ `notes` (inutile)
  - Garder : `building_id`, `user_id`, `is_primary`, `start_date`, `end_date`, `created_at`, `updated_at`
  - Contrainte unique : `UNIQUE(building_id, user_id)` (un user ne peut être ajouté qu'une fois par building)
  - **Contrainte métier** : Trigger de validation `validate_building_contact_trigger` (les locataires ne peuvent être assignés qu'aux lots)
- [ ] Modifier la table `lot_contacts` (lignes 302-317) :
  - Supprimer le champ `contact_type contact_type NOT NULL`
  - Supprimer le champ `notes` (inutile)
  - Garder : `lot_id`, `user_id`, `is_primary`, `start_date`, `end_date`, `created_at`, `updated_at`
  - Contrainte unique : `UNIQUE(lot_id, user_id)` (un user ne peut être ajouté qu'une fois par lot)


### 🔧 PHASE 2 : SERVICES DE BASE DE DONNÉES

#### Étape 2.1 : Modification des types TypeScript
- [ ] **Fichier** : `lib/database.types.ts`
- [ ] Regénérer les types automatiquement après modification du schéma
- [ ] Vérifier que les types pour `building_contacts` et `lot_contacts` n'incluent plus `contact_type`

#### Étape 2.2 : Refactoring du service principal
- [ ] **Fichier** : `lib/database-service.ts`
- [ ] **Fonction** : `mapContactTypeToDatabase()` (lignes 3253-3281)
  - Supprimer cette fonction complètement
- [ ] **Service** : `contactService.getLotContacts()` (lignes 1462-1533)
  - Modifier la requête pour ne plus utiliser `contact_type`
  - Implémenter la logique de filtrage basée sur `user.role` et `user.provider_category`
  - Ajouter le filtrage temporel : `.or('end_date.is.null,end_date.gt.now()')` pour les assignations actives
- [ ] **Service** : `contactService.addContactToLot()` 
  - Modifier pour ne plus utiliser `contact_type` comme paramètre
- [ ] **Service** : `buildingService.getAll()` (lignes 227-261)
  - Modifier les requêtes qui filtrent sur `contact_type === 'gestionnaire'`
  - Remplacer par `user.role === 'gestionnaire'`

#### Étape 2.3 : Services de stats et dashboards
- [ ] **Fichier** : `lib/database-service.ts`
- [ ] **Service** : `statsService.getManagerStats()` (lignes 2511-2703)
  - Modifier les requêtes qui utilisent `contact_type === 'locataire'` (ligne 2598)
  - Remplacer par `user.role === 'locataire'`

#### Étape 2.4 : Service tenant
- [ ] **Service** : `tenantService.getTenantData()` (lignes 3286-3335)
  - Modifier `.eq('contact_type', 'locataire')` (ligne 3311)
  - Remplacer par une jointure qui filtre sur `user.role === 'locataire'`

#### Étape 2.5 : Service composite
- [ ] **Service** : `compositeService.createCompleteProperty()` (lignes 3587-3795)
  - Modifier la logique d'assignation qui utilise `mapContactTypeToDatabase()` (ligne 3750)
  - Remplacer par une logique qui détermine le rôle à partir des données utilisateur

### 🏗️ PHASE 3 : LOGIQUE D'ASSIGNATION

#### Étape 3.1 : Nouvelle fonction de détermination de rôle
- [ ] **Fichier** : `lib/database-service.ts`
- [ ] Créer une nouvelle fonction `determineUserAssignmentContext(userId: string)` qui :
  - Récupère les informations de l'utilisateur (`role`, `provider_category`)
  - Retourne le contexte d'assignation approprié
  - Gère la logique métier pour les types combinés (ex: prestataire + spécialité)

#### Étape 3.2 : Nouvelle fonction de filtrage
- [ ] Créer une fonction `filterUsersByAssignmentType(users: User[], assignmentType: string)` qui :
  - Filtre les utilisateurs selon le type d'assignation demandé
  - Mapping : `tenant` → `role = 'locataire'`
  - Mapping : `provider` → `role = 'prestataire'` 
  - Mapping : `syndic` → `provider_category = 'syndic'`
  - Mapping : `notary` → `provider_category = 'notaire'`
  - Mapping : `insurance` → `provider_category = 'assurance'`
  - Mapping : `other` → `provider_category = 'autre'`

#### Étape 3.3 : Fonction de validation contextuelle
- [ ] Créer une fonction `validateAssignment(user: User, context: 'building' | 'lot')` qui :
  - Valide qu'un utilisateur peut être assigné dans le contexte donné
  - **Règle importante** : Bloque l'assignation de locataires au niveau building

### 🖥️ PHASE 4 : INTERFACES FRONTEND

#### Étape 4.1 : Composant ContactSelector
- [ ] **Fichier** : `components/contact-selector.tsx`
- [ ] **Fonction** : `openContactModal()` (lignes 100-141)
  - Modifier la logique de filtrage des contacts
  - Remplacer les filtres basés sur `contact_type` par la nouvelle logique
- [ ] **Fonction** : `handleAddExistingContact()` (lignes 147-161)
  - Supprimer l'affectation de `type: selectedContactType` (ligne 153)
  - La logique de type sera déterminée à partir des données utilisateur

#### Étape 4.2 : ContactFormModal
- [ ] **Fichier** : `components/contact-form-modal.tsx`
- [ ] **Constantes** : `contactTypes` (lignes 50-59)
  - Adapter pour utiliser les valeurs correspondant aux enums `user_role` et `provider_category`
- [ ] **Fonction** : Logique de création de contact
  - S'assurer que les bons champs `role` et `provider_category` sont définis lors de la création

#### Étape 4.3 : Pages de gestion des contacts
- [ ] **Fichier** : `app/gestionnaire/contacts/page.tsx`
- [ ] **Fichier** : `app/gestionnaire/contacts/[id]/modifier/page.tsx`
- [ ] **Constantes** : `contactTypes` dans chaque fichier
  - Adapter pour correspondre aux nouvelles valeurs d'enum
- [ ] Modifier les filtres et affichages qui utilisent l'ancien `contact_type`

### 📄 PHASE 5 : PAGES DE CRÉATION

#### Étape 5.1 : Création d'immeubles
- [ ] **Fichier** : `app/gestionnaire/biens/immeubles/nouveau/page.tsx`
- [ ] **Constantes** : `contactTypes` (lignes 82-89)
  - Garder les clés frontend (`tenant`, `provider`, etc.) pour l'UI
- [ ] **Fonction** : `openGlobalContactModal()` et `openContactModal()` (lignes 443-767)
  - Modifier les filtres qui utilisent `contact.contact_type`
  - Remplacer par des filtres basés sur `contact.role` et `contact.provider_category`
- [ ] **Fonction** : `handleFinish()` (lignes 578-695)
  - Modifier la préparation des `lotContactAssignmentsData`
  - Supprimer l'utilisation de `contactType` dans les assignations

#### Étape 5.2 : Création de lots
- [ ] **Fichier** : `app/gestionnaire/biens/lots/nouveau/page.tsx`
- [ ] Adapter toute la logique d'assignation de contacts similaire aux immeubles

### 📱 PHASE 6 : COMPOSANTS SPÉCIALISÉS

#### Étape 6.1 : Composants UI
- [ ] **Fichier** : `components/ui/contact-selector.tsx`
- [ ] Adapter la logique si elle existe

#### Étape 6.2 : Autres composants utilisant les contacts
- [ ] Rechercher tous les composants qui utilisent `contact_type` ou les mappings
- [ ] Adapter en conséquence

### 🔌 PHASE 7 : API ET HOOKS

#### Étape 7.1 : Routes API
- [ ] **Fichier** : `app/api/create-contact/route.ts`
- [ ] Vérifier et adapter la logique de création de contacts
- [ ] **Fichier** : `app/api/create-manager-intervention/route.ts` (lignes 362-387)
- [ ] Adapter les assignations qui utilisent `role: 'prestataire'`

#### Étape 7.2 : Hooks de données
- [ ] Rechercher les hooks qui utilisent des filtres basés sur `contact_type`
- [ ] Adapter en conséquence

### 🧪 PHASE 8 : TESTS ET VALIDATION

#### Étape 8.1 : Tests fonctionnels
- [ ] Tester la création d'immeubles avec assignation de contacts
- [ ] Tester la création de lots avec assignation de contacts
- [ ] Tester l'affichage des contacts assignés dans les dashboards
- [ ] Tester les filtres de contacts par type

#### Étape 8.2 : Tests de migration
- [ ] Créer des données test avec l'ancien système
- [ ] Vérifier que la migration ne casse rien
- [ ] Tester les performances des nouvelles requêtes

## 🎭 NOUVELLE LOGIQUE D'ASSIGNATION

### Mapping Frontend → Database
```typescript
// Ancienne logique (à supprimer)
const oldMapping = {
  'tenant': 'locataire',        // contact_type enum
  'provider': 'prestataire',    // contact_type enum
  'syndic': 'syndic',           // contact_type enum
  'notary': 'notaire',          // contact_type enum
  'insurance': 'assurance',     // contact_type enum
  'other': 'autre'              // contact_type enum
}

// Nouvelle logique (à implémenter)
// Plus de mapping static - détermination dynamique basée sur user.role + user.provider_category
const determineAssignmentType = (user: User): string => {
  if (user.role === 'locataire') return 'tenant'
  if (user.role === 'gestionnaire') return 'manager'
  if (user.role === 'prestataire') {
    switch (user.provider_category) {
      case 'syndic': return 'syndic'
      case 'notaire': return 'notary'
      case 'assurance': return 'insurance'
      case 'proprietaire': return 'owner'
      case 'autre': return 'other'
      default: return 'provider' // prestataire générique
    }
  }
  return 'other'
}
```

### Nouvelles fonctions de service
```typescript
// À créer dans database-service.ts
export const determineAssignmentType = (user: User): string => {
  if (user.role === 'locataire') return 'tenant'
  if (user.role === 'gestionnaire') return 'manager'
  if (user.role === 'prestataire') {
    if (user.provider_category === 'syndic') return 'syndic'
    if (user.provider_category === 'notaire') return 'notary'
    if (user.provider_category === 'assurance') return 'insurance'
    if (user.provider_category === 'proprietaire') return 'owner'
    if (user.provider_category === 'autre') return 'other'
    return 'provider' // prestataire générique
  }
  return 'other'
}

export const filterUsersByRole = (users: User[], requestedType: string): User[] => {
  return users.filter(user => determineAssignmentType(user) === requestedType)
}

// Fonction pour valider l'assignation selon le contexte
export const validateAssignment = (user: User, context: 'building' | 'lot'): boolean => {
  // Les locataires ne peuvent être assignés qu'aux lots, jamais aux buildings
  if (user.role === 'locataire' && context === 'building') {
    return false
  }
  return true
}
```

## ⚠️ POINTS D'ATTENTION

1. **Contraintes uniques** : Un utilisateur ne peut être ajouté qu'une seule fois par building/lot, mais plusieurs utilisateurs avec des rôles différents peuvent être sur le même building/lot
2. **Contrainte métier importante** : Les locataires ne peuvent être assignés qu'aux **lots**, jamais aux **buildings** (un locataire occupe un lot spécifique, pas tout l'immeuble)
3. **Performance** : Les nouvelles requêtes avec jointures pourraient être plus lentes
4. **Rétrocompatibilité** : Cette migration nécessite une réinitialisation complète de la DB
5. **Validation** : S'assurer que tous les cas d'usage sont couverts par la nouvelle logique

## 🔍 FICHIERS À SURVEILLER

**Critiques (modification obligatoire) :**
- `supabase/migrations/20250913000000_initialize_clean_schema.sql`
- `lib/database-service.ts`
- `app/gestionnaire/biens/immeubles/nouveau/page.tsx`
- `app/gestionnaire/biens/lots/nouveau/page.tsx`
- `components/contact-selector.tsx`
- `components/contact-form-modal.tsx`

**Secondaires (vérification/adaptation) :**
- `app/gestionnaire/contacts/page.tsx`
- `app/gestionnaire/contacts/[id]/modifier/page.tsx`
- `lib/database.types.ts` (regénération auto)
- Tous les hooks utilisant des contacts
- Routes API manipulant des contacts

## 📈 VALIDATION FINALE

**Tests d'assignation par contexte :**
- [ ] **IMMEUBLE** : Assignation gestionnaire ✅, prestataire ✅, syndic ✅, assurance ✅
- [ ] **IMMEUBLE** : Blocage assignation locataire ❌ (contrainte CHECK)
- [ ] **LOT** : Assignation locataire ✅, gestionnaire ✅, prestataire ✅, syndic ✅, assurance ✅

**Tests fonctionnels généraux :**
- [ ] Création d'immeubles fonctionne
- [ ] Création de lots fonctionne  
- [ ] Assignation de contacts fonctionne
- [ ] Affichage des contacts assignés fonctionne
- [ ] Filtrage par type de contact fonctionne
- [ ] Dashboard avec statistiques fonctionne
- [ ] Logique métier préservée

---
*Ce plan sera mis à jour au fur et à mesure de l'avancement des travaux.*
