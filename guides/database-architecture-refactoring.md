# Plan de Refactoring - Architecture Base de Données SEIDO

> 📅 **Date de création**: 13 septembre 2025  
> 🎯 **Objectif**: Simplifier l'architecture en éliminant la duplication users/contacts  
> 🔒 **Impact**: Modification importante de la structure de données  

## 🔍 Analyse du Problème Actuel

### Problèmes Identifiés

1. **Duplication users/contacts**
   - Les locataires existent dans `users` ET dans `contacts`
   - Les gestionnaires peuvent être dans les deux tables
   - Source de confusion et d'incohérence des données

2. **Relations redondantes**
   - `buildings.manager_id` + `building_contacts` 
   - `lots.tenant_id` + `lot_contacts`
   - Double gestion des mêmes relations

3. **Complexité inutile**
   - Deux systèmes de gestion des contacts
   - Code d'application plus complexe
   - Plus de risques d'erreurs

### Architecture Actuelle

```
users (auth + profil)
├── id, email, name, role
├── Relations directes: buildings.manager_id, lots.tenant_id
└── Duplication avec contacts

contacts (prestataires + contacts externes)
├── id, email, name, company, speciality
├── Relations via: building_contacts, lot_contacts
└── Duplication avec users

auth.users (Supabase Auth)
├── Système d'authentification
└── Non connecté aux relations métier
```

## 🎯 Architecture Cible Proposée

### Principe Simplifié

```
auth.users (Supabase Auth)
├── id, email, first_name, last_name, role (via metadata)
├── Authentification + données de base
└── Invitations en attente

users (Profils utilisateurs authentifiés) 
├── id (référence auth.users.id), phone, address, company, notes
├── Relations UNIQUEMENT via tables de liaison
├── Plus de manager_id ou tenant_id direct
└── Un seul système de contacts (fusion contacts→users)

Tables de liaison (Gestion des relations)
├── building_contacts (tous les contacts liés aux bâtiments)
├── lot_contacts (tous les contacts liés aux lots) 
├── intervention_contacts (tous les contacts liés aux interventions)
└── Types de relations: gestionnaire, locataire, prestataire, syndic, etc.
```

## 📋 Plan d'Action Détaillé

### Phase 1: Reset + Nouvelles Migrations (2-3h) ✅ **TERMINÉE**
- [x] **1.1** ✅ Script d'audit corrigé (erreur UNION types résolue)
- [x] **1.2** ✅ **Migration initiale propre créée** `supabase/migrations/20250913000000_initialize_clean_schema.sql`
  - ✅ Table `contacts` supprimée - Architecture unifiée `users`
  - ✅ Colonnes directes supprimées: `manager_id`, `tenant_id`, `assigned_contact_id`
  - ✅ Architecture 100% via tables de liaison (`building_contacts`, `lot_contacts`, `intervention_contacts`)
  - ✅ Table `users` adaptée pour tous les contacts (+ phone, address, company, speciality)
  - ✅ Support `auth.users` avec metadata (first_name, last_name, role)
  - ✅ Intégration complète: équipes, documents, notifications, invitations, logs
- [x] **1.3** ✅ **Reset base de données staging réussi**
- [x] **1.4** ✅ **Migration appliquée avec succès** - Architecture simplifiée opérationnelle

### Phase 2: Adaptation Code Application (6-8h) 🔄 **EN COURS**
- [x] **2.1** ✅ **Modifier `database-service.ts`** - Nouvelles requêtes adaptées
  - ✅ `contactService` adapté → utilise table `users`
  - ✅ `buildingService.getAll()` adapté → via `building_contacts`
  - ✅ `interventionService` adapté → via `intervention_contacts`
  - ✅ `getLotContacts()` adapté → via `lot_contacts` + `users`
- [x] **2.2** ✅ **Composants UI adaptés**
  - ✅ `lot-contacts-list.tsx` → adapté pour nouvelle architecture
  - ✅ Build passe avec succès
- [x] **2.3** ✅ **APIs adaptées**
  - ✅ `/api/create-contact` → adapté pour table `users`
  - ⏸️ Logique d'invitation - peut être adaptée plus tard si besoin
- [ ] **2.4** Adapter système d'authentification (metadata auth.users)
  - [ ] Modifier `use-auth.tsx` pour metadata
  - [ ] Adapter inscription/connexion
- [ ] **2.5** Mettre à jour hooks et services de notification

### Phase 3: Tests et Validation (2-3h)
- [ ] **3.1** Tests fonctionnels complets après migration
  - Inscription/connexion utilisateurs avec metadata
  - Création bâtiments et assignation via `building_contacts`
  - Création lots et assignation via `lot_contacts`  
  - Création interventions et assignation via `intervention_contacts`
- [ ] **3.2** Recréation des comptes de test
  - Admin, gestionnaires, locataires, prestataires
  - Vérification metadata `auth.users` (first_name, last_name, role)
  - Test système d'équipes et invitations
- [ ] **3.3** Validation flux critiques
  - Notifications avec nouvelles relations
  - Documents d'intervention
  - Logs d'activité

---

## 🚀 **Statut Actuel - Migration Créée !**

✅ **Phase 1 terminée** - Migration initiale propre créée avec architecture simplifiée

## 📋 **Prochaines Étapes Immédiates**

### 🔧 **Pour toi maintenant:**
1. **Nettoyer les anciennes migrations** (optionnel)
   ```bash
   # Déplacer dans migrations-old/ si tu veux les garder
   mkdir -p supabase/migrations-old
   mv supabase/migrations/202509* supabase/migrations-old/
   # Mais garder la nouvelle: 20250913000000_initialize_clean_schema.sql
   ```

2. **Reset la base de données staging**
   ```bash
   npx supabase db reset
   ```

3. **Tester la nouvelle migration**
   - Vérifier que toutes les tables sont créées
   - Tester l'utilisateur admin par défaut
   - Vérifier les fonctions et triggers

### 🛠️ **Ensuite on attaquera ensemble:**
- **Phase 2** - Adaptation du code application (database-service.ts, composants, APIs)
- **Phase 3** - Tests et validation complète
- **Création** des nouveaux comptes de test

---

## 💡 **Architecture Finale**

**Ce qui change dans le code:**
- ❌ Plus de `contactService` → tout via `userService`
- ❌ Plus de requêtes directes `manager_id`, `tenant_id`
- ✅ Toutes les relations via `building_contacts`, `lot_contacts`, `intervention_contacts`
- ✅ Métadata dans `auth.users` (first_name, last_name, role)

**Prêt pour la suite ?** 🎯

## 🛠️ Détails Techniques

### Migration des Utilisateurs

```sql
-- Étape 1: Identifier les utilisateurs à migrer de contacts vers users
SELECT c.* FROM contacts c
WHERE c.contact_type IN ('gestionnaire', 'locataire')
AND NOT EXISTS (SELECT 1 FROM users u WHERE u.email = c.email);

-- Étape 2: Migrer vers users
INSERT INTO users (email, name, first_name, last_name, phone, role)
SELECT email, name, first_name, last_name, phone, 
       CASE contact_type 
         WHEN 'gestionnaire' THEN 'gestionnaire'::user_role
         WHEN 'locataire' THEN 'locataire'::user_role
         ELSE 'prestataire'::user_role
       END
FROM contacts 
WHERE contact_type IN ('gestionnaire', 'locataire');
```

### Nouvelle Logique de Relations

```sql
-- Au lieu de: buildings.manager_id
SELECT b.*, u.name as manager_name 
FROM buildings b
JOIN building_contacts bc ON b.id = bc.building_id
JOIN users u ON bc.contact_id = u.id
WHERE bc.contact_type = 'gestionnaire' AND bc.is_primary = true;

-- Au lieu de: lots.tenant_id  
SELECT l.*, u.name as tenant_name
FROM lots l
JOIN lot_contacts lc ON l.id = lc.lot_id
JOIN users u ON lc.contact_id = u.id
WHERE lc.contact_type = 'locataire' AND lc.is_primary = true;
```

## ⚠️ Risques et Précautions

### Risques Identifiés
1. **Perte de données** lors de la fusion
2. **Rupture temporaire** des fonctionnalités
3. **Conflits d'emails** entre tables
4. **Performance dégradée** pendant la migration

### Mesures de Mitigation
1. **Sauvegarde complète** avant chaque étape
2. **Migration par étapes** avec tests intermédiaires
3. **Rollback plan** pour chaque phase
4. **Tests en mode maintenance**

## 🔍 Impact sur le Code Existant

### Fichiers à Modifier - Database Service
```typescript
// lib/database-service.ts - Lignes critiques identifiées:
// - Line 210: manager:manager_id(name, email, phone)
// - Line 248: tenant:tenant_id(name, email)
// - Line 455: tenant:tenant_id(name, email, phone)
// - Toutes les requêtes contacts table (lignes 1182-1945)
```

### Composants UI à Adapter
```typescript
// components/lot-contacts-list.tsx
// - Utilise contactService.getLotContacts()
// - Logic de création/modification de contacts

// app/gestionnaire/contacts/*.tsx  
// - Pages complètes de gestion contacts
// - CRUD operations sur table contacts
```

### APIs à Modifier
```typescript
// app/api/create-contact/route.ts
// - Création de contacts via API
// - Utilise table contacts directement

// Autres APIs intervention qui référencent contacts
```

## 🔄 Compatibilité Temporaire

### Étape 1: Fonctions de Transition (Views temporaires)
```sql
-- View temporaire pour simuler table contacts 
CREATE OR REPLACE VIEW contacts_view AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.first_name,
  u.last_name, 
  u.phone,
  NULL as company,
  CASE u.role
    WHEN 'gestionnaire' THEN 'gestionnaire'::contact_type
    WHEN 'locataire' THEN 'locataire'::contact_type 
    WHEN 'prestataire' THEN 'prestataire'::contact_type
    ELSE 'autre'::contact_type
  END as contact_type,
  NULL as speciality,
  NULL as address,
  NULL as notes,
  true as is_active,
  NULL as team_id,
  u.created_at,
  u.updated_at
FROM users u;

-- Wrapper functions pour compatibilité
CREATE OR REPLACE FUNCTION get_lot_tenant_id(lot_id UUID)
RETURNS UUID AS $$
  SELECT lc.contact_id 
  FROM lot_contacts lc 
  WHERE lc.lot_id = $1 
  AND lc.contact_type = 'locataire' 
  AND lc.is_primary = true
  AND (lc.end_date IS NULL OR lc.end_date > CURRENT_DATE)
  LIMIT 1;
$$ LANGUAGE sql;

-- Wrapper pour building manager
CREATE OR REPLACE FUNCTION get_building_manager_id(building_id UUID)
RETURNS UUID AS $$
  SELECT bc.contact_id 
  FROM building_contacts bc 
  WHERE bc.building_id = $1 
  AND bc.contact_type = 'gestionnaire' 
  AND bc.is_primary = true
  LIMIT 1;
$$ LANGUAGE sql;
```

### Étape 2: Adaptation Progressive du Code
```typescript
// Wrapper functions dans database-service.ts
const buildingService = {
  async getAll() {
    // AVANT: SELECT manager:manager_id(name, email, phone)
    // APRÈS: SELECT manager:building_contacts!inner(contact:users(*))
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        manager:building_contacts!inner(
          contact:users(id, name, email, phone)
        ),
        lots(id, reference, is_occupied, 
          tenant:lot_contacts!inner(
            contact:users(id, name, email)
          )
        )
      `)
      .eq('building_contacts.contact_type', 'gestionnaire')
      .eq('building_contacts.is_primary', true)
  }
}
```

## 📊 Métriques de Succès

### Avant Refactoring
- [ ] Nombre d'enregistrements dans `users`
- [ ] Nombre d'enregistrements dans `contacts` 
- [ ] Duplicatas détectés
- [ ] Relations directes (manager_id, tenant_id)

### Après Refactoring
- [ ] Table `contacts` supprimée
- [ ] Toutes les relations via tables de liaison
- [ ] Aucun duplicata
- [ ] Performance maintenue ou améliorée

## 🎯 Résultats Attendus

### Avantages
✅ **Architecture simplifiée** - Un seul système de contacts  
✅ **Élimination des duplicatas** - Source unique de vérité  
✅ **Relations cohérentes** - Toutes via tables de liaison  
✅ **Code plus maintenable** - Moins de complexité  
✅ **Évolutivité améliorée** - Ajout facile de nouveaux types de contacts  

### Bénéfices Long Terme
- Maintenance réduite
- Moins de bugs potentiels
- Évolutions plus rapides
- Onboarding développeur facilité

---

## 💡 Recommandation Finale

### ✅ **OUI, cette refactorisation est recommandée**

**Pourquoi ?**
1. **Élimination de la complexité** - Un seul système de contacts au lieu de deux
2. **Cohérence architecturale** - Toutes les relations via tables de liaison
3. **Maintenabilité** - Code plus simple à comprendre et maintenir
4. **Évolutivité** - Plus facile d'ajouter de nouveaux types de relations
5. **Élimination des bugs** - Moins de sources de données incohérentes

**Estimation globale: 18-24h de travail sur 3-4 jours**

### ⚡ Plan d'Exécution Recommandé

**🎯 Quand ?** Après avoir terminé les features critiques en cours

**👥 Qui ?** Développeur principal + temps pour tests utilisateur

**🔄 Comment ?** 
1. **Jour 1** - Phases 1-2 (Analyse + Migration données)
2. **Jour 2** - Phase 3 (Adaptation code application) 
3. **Jour 3** - Phases 4-5 (Refactoring schéma + Tests)
4. **Jour 4** - Phase 6 (Déploiement + suivi)

## 🚀 Prochaines Étapes Immédiates

1. **Valider** que cette approche convient à l'équipe
2. **Planifier** la fenêtre de maintenance
3. **Commencer Phase 1** - Audit des données existantes
4. **Tester** les scripts de migration sur un environnement de dev

## 📝 Suivi d'Exécution

| Phase | État | Date Début | Date Fin | Durée Estimée | Notes |
|-------|------|------------|----------|---------------|--------|
| Préparation | 🔄 En cours | 13/09/2025 | - | 2-3h | Analyse en cours |
| Migration | ⏸️ En attente | - | - | 4-6h | - |
| Adaptation Code | ⏸️ En attente | - | - | 8-10h | - |
| Refactoring | ⏸️ En attente | - | - | 2-3h | - |
| Tests | ⏸️ En attente | - | - | 3-4h | - |
| Déploiement | ⏸️ En attente | - | - | 1-2h | - |

---

## 📞 **Question pour la suite ?**

**Es-tu prêt à commencer la Phase 1 (Audit des données) ?** 

Si oui, je peux préparer les scripts d'analyse pour identifier précisément :
- Les duplicatas entre users/contacts  
- Les relations manager_id/tenant_id à migrer
- Les potentiels conflits de données

**Ou préfères-tu d'abord valider cette approche avec ton équipe ?**

