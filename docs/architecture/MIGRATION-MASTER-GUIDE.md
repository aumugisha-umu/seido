# 🗺️ GUIDE MAÎTRE DE MIGRATION - SEIDO v2.0

**Date de création**: 2025-10-10
**Statut global**: 🟡 En cours (Phase 1 complétée)
**Dernière mise à jour**: 2025-10-10

---

## 📊 Vue d'Ensemble

Ce document sert de **guide central** pour la migration de l'architecture SEIDO vers la version 2.0. Il coordonne tous les aspects de la migration (backend, frontend, infrastructure) et maintient un suivi précis de l'avancement.

### 🎯 Objectifs de la Migration

1. **Backend**: Migrer vers une architecture PostgreSQL optimisée avec RLS strict
2. **Frontend**: Adopter l'architecture Server/Client Components de Next.js 15
3. **Performance**: Réduire les requêtes N+1 et optimiser les temps de chargement
4. **Sécurité**: Implémenter une isolation multi-tenant robuste via RLS
5. **Maintenabilité**: Architecture modulaire avec Repository + Service Pattern

---

## 📈 Progression Globale

```
Phase 1 (Section 1): ████████████████████ 100% ✅ COMPLÉTÉE
Phase 2 (Section 2): ░░░░░░░░░░░░░░░░░░░░   0% ❌ À FAIRE
Phase 3 (Section 3): ░░░░░░░░░░░░░░░░░░░░   0% ❌ À FAIRE
Frontend Migration:  ██████░░░░░░░░░░░░░░  30% ⏳ EN COURS
```

**Estimation globale**: ~35% complété

---

## 🗂️ Structure de la Documentation

### Documents Principaux

| Document | Rôle | Statut | À Mettre à Jour Quand |
|----------|------|--------|----------------------|
| **MIGRATION-MASTER-GUIDE.md** (ce fichier) | Guide central, roadmap complète | ⏳ En cours | À chaque étape majeure |
| `database-schema-optimal.md` | Schéma v2.0 complet (1900+ lignes) | ✅ À jour | Changements de schéma backend |
| `migration-section-1-users-teams-invitations-UPDATED.md` | Migration Section 1 détaillée | ✅ Complétée | Corrections Section 1 |
| `plan-migration-architecture-serverclient.md` | Migration Server/Client Components | ⏳ Phase 1 complétée | Changements frontend |
| `schema-comparaison-visuel.md` | Comparaison v1 vs v2 | ✅ Référence | Décisions architecturales |
| `seido-data-flow-architecture-analysis.md` | Analyse des flux de données | ✅ Référence | Changements de flux |
| `AUTH-ARCHITECTURE-REVIEW.md` | Revue système d'authentification | ✅ Référence | Changements auth |

---

## 🔄 ROADMAP COMPLÈTE

### ✅ PHASE 1: UTILISATEURS, ÉQUIPES, INVITATIONS (COMPLÉTÉE)

**Date de complétion**: 2025-10-10
**Migration**: `20251009000001_phase1_users_teams_companies_invitations.sql`

#### Backend ✅
- [x] **Schéma de base**
  - [x] Table `users` avec soft delete
  - [x] Table `teams` avec soft delete
  - [x] Table `companies` (gestionnaires)
  - [x] Table `team_members` avec `left_at`
  - [x] Table `invitations` avec expiration

- [x] **Relations**
  - [x] `users.company_id` → `companies.id`
  - [x] `team_members.user_id` → `users.id`
  - [x] `team_members.team_id` → `teams.id`
  - [x] `invitations.team_id` → `teams.id`
  - [x] `invitations.user_id` → `users.id` (nullable)

- [x] **RLS Policies** (15 policies créées)
  - [x] Policies `users` (4 policies)
  - [x] Policies `teams` (3 policies)
  - [x] Policies `companies` (3 policies)
  - [x] Policies `team_members` (3 policies)
  - [x] Policies `invitations` (2 policies)

- [x] **Fonctions utilitaires** (8 fonctions)
  - [x] `get_current_user_id()`
  - [x] `get_current_user_role()`
  - [x] `get_user_team_ids()`
  - [x] `is_team_member()`
  - [x] `is_team_admin()`
  - [x] `can_manage_team()`
  - [x] `can_view_team_data()`
  - [x] **`can_manager_update_user()`** ⭐ **AJOUTÉ (2025-10-10)**

- [x] **Triggers**
  - [x] `trg_users_updated_at`
  - [x] `trg_teams_updated_at`
  - [x] `trg_companies_updated_at`
  - [x] `trg_team_members_updated_at`
  - [x] `trg_invitations_updated_at`

- [x] **Indexes de performance** (19 indexes créés)

#### Frontend ✅
- [x] Components d'authentification (login, signup, callback)
- [x] Gestion des utilisateurs (CRUD)
- [x] Gestion des équipes (création, membres)
- [x] Système d'invitation (envoi, acceptation)
- [x] Templates emails d'invitation (5 templates)

#### 🐛 Corrections Appliquées (Session 2025-10-10)

**Problème 1: RLS Infinite Recursion lors de l'édition de contacts**
- **Erreur**: `code: '42P17', message: 'infinite recursion detected in policy for relation "users"'`
- **Cause**: Policy `users_update_by_team_managers` utilisait `INNER JOIN users` créant une boucle
- **Solution**: Fonction `can_manager_update_user()` SECURITY DEFINER
  - Fichier: `supabase/migrations/20251009000001_phase1_users_teams_companies_invitations.sql:396-430`
  - Policy simplifiée: lignes 688-695
  - Bypass RLS avec permissions superuser
  - Validation via `team_members` uniquement
- **Statut**: ✅ Résolu et testé

**Problème 2: Design des emails transactionnels**
- **Issue 1**: Logo trop grand et centré dans header
  - **Solution**: Logo repositionné top-left (100x32px), titre centré ligne 2 (32px)
  - **Fichier**: `emails/components/email-header.tsx`
- **Issue 2**: Bouton CTA basique sans style
  - **Solution**: Gradient background, box-shadow, border semi-transparent
  - **Fichier**: `emails/components/email-button.tsx`
- **Issue 3**: Espacement vertical sous le texte du bouton
  - **Solution**: Architecture table-based (standard email HTML)
  - **Technique**: `<td>` contient styles visuels, `<Button>` avec `display: block`
- **Statut**: ✅ Design finalisé et build réussi

---

### ⏳ PHASE 2: BIENS, LOTS, CONTACTS (EN COURS)

**Date de début prévue**: 2025-10-10
**Migration prévue**: `20251010000001_phase2_buildings_lots_contacts.sql`

#### Backend ❌ À FAIRE

##### 📋 Tables à Migrer

**1. Table `buildings` (Immeubles)**
- [ ] Créer table avec colonnes:
  - `id` (UUID, PK)
  - `team_id` (UUID, FK → teams.id) ⭐ NOUVEAU
  - `name` (TEXT)
  - `address` (TEXT)
  - `city` (TEXT)
  - `postal_code` (TEXT)
  - `country` (TEXT, default 'France')
  - `construction_year` (INTEGER, nullable)
  - `total_floors` (INTEGER, nullable)
  - `total_units` (INTEGER)
  - `manager_id` (UUID, FK → users.id)
  - `created_at`, `updated_at`, `deleted_at` (TIMESTAMPTZ)
- [ ] Contraintes:
  - `total_units > 0`
  - `total_floors >= 0`
- [ ] Index:
  - `idx_buildings_team_id`
  - `idx_buildings_manager_id`
  - `idx_buildings_deleted_at`
  - Composite: `(team_id, deleted_at)`

**2. Table `lots` (Unités/Appartements)**
- [ ] Créer table avec colonnes:
  - `id` (UUID, PK)
  - `building_id` (UUID, FK → buildings.id)
  - `lot_number` (TEXT)
  - `floor` (INTEGER, nullable)
  - `type` (TEXT: 'apartment', 'house', 'commercial', 'parking', 'storage')
  - `surface_area` (DECIMAL, m²)
  - `rooms` (INTEGER, nullable)
  - `tenant_id` (UUID, FK → users.id, nullable) ⭐ RELATION CRITIQUE
  - `created_at`, `updated_at`, `deleted_at` (TIMESTAMPTZ)
- [ ] Contraintes:
  - `surface_area > 0`
  - `rooms >= 0`
  - UNIQUE `(building_id, lot_number)` WHERE `deleted_at IS NULL`
- [ ] Index:
  - `idx_lots_building_id`
  - `idx_lots_tenant_id`
  - `idx_lots_deleted_at`
  - Composite: `(building_id, deleted_at)`

**3. Table `lot_contacts` (Association Lots ↔ Contacts)**
- [ ] Créer table avec colonnes:
  - `id` (UUID, PK)
  - `lot_id` (UUID, FK → lots.id)
  - `contact_id` (UUID, FK → users.id)
  - `role` (TEXT: 'owner', 'tenant', 'co_owner', 'contact')
  - `start_date` (DATE, nullable)
  - `end_date` (DATE, nullable)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- [ ] Contraintes:
  - `end_date IS NULL OR end_date >= start_date`
  - UNIQUE `(lot_id, contact_id, role)` WHERE `end_date IS NULL`
- [ ] Index:
  - `idx_lot_contacts_lot_id`
  - `idx_lot_contacts_contact_id`
  - Composite: `(lot_id, role, end_date)`

**4. Migration de données existantes**
- [ ] Script de migration des données v1 → v2
- [ ] Validation de l'intégrité référentielle
- [ ] Backup avant migration

##### 🔐 RLS Policies à Créer

**Policies `buildings`** (4 policies)
- [ ] `buildings_select_by_team` - SELECT pour membres de l'équipe
- [ ] `buildings_insert_by_managers` - INSERT pour gestionnaires/admins
- [ ] `buildings_update_by_managers` - UPDATE pour gestionnaires/admins
- [ ] `buildings_delete_soft_by_managers` - Soft delete pour gestionnaires/admins

**Policies `lots`** (4 policies)
- [ ] `lots_select_by_team` - SELECT pour membres de l'équipe + locataires du lot
- [ ] `lots_insert_by_managers` - INSERT pour gestionnaires/admins
- [ ] `lots_update_by_managers` - UPDATE pour gestionnaires/admins
- [ ] `lots_delete_soft_by_managers` - Soft delete pour gestionnaires/admins

**Policies `lot_contacts`** (4 policies)
- [ ] `lot_contacts_select_by_team` - SELECT pour membres de l'équipe + contacts liés
- [ ] `lot_contacts_insert_by_managers` - INSERT pour gestionnaires/admins
- [ ] `lot_contacts_update_by_managers` - UPDATE pour gestionnaires/admins
- [ ] `lot_contacts_delete_by_managers` - DELETE pour gestionnaires/admins

##### 🛠️ Fonctions Utilitaires à Créer

- [ ] `can_view_building(building_id UUID)` - Vérifier accès lecture immeuble
- [ ] `can_manage_building(building_id UUID)` - Vérifier accès gestion immeuble
- [ ] `can_view_lot(lot_id UUID)` - Vérifier accès lecture lot (inclut locataires)
- [ ] `can_manage_lot(lot_id UUID)` - Vérifier accès gestion lot
- [ ] `get_building_team_id(building_id UUID)` - Récupérer team_id d'un immeuble
- [ ] `is_lot_tenant(lot_id UUID)` - Vérifier si utilisateur est locataire du lot

##### ⚡ Triggers à Créer

- [ ] `trg_buildings_updated_at` - Auto-update `updated_at`
- [ ] `trg_lots_updated_at` - Auto-update `updated_at`
- [ ] `trg_lot_contacts_updated_at` - Auto-update `updated_at`
- [ ] `trg_sync_lot_tenant` - Synchroniser `lots.tenant_id` ↔ `lot_contacts` (role='tenant')

##### 📊 Indexes de Performance

**Buildings** (5 indexes)
- [ ] `idx_buildings_team_id`
- [ ] `idx_buildings_manager_id`
- [ ] `idx_buildings_deleted_at`
- [ ] `idx_buildings_team_deleted` (composite)
- [ ] `idx_buildings_city` (recherche)

**Lots** (6 indexes)
- [ ] `idx_lots_building_id`
- [ ] `idx_lots_tenant_id`
- [ ] `idx_lots_deleted_at`
- [ ] `idx_lots_building_deleted` (composite)
- [ ] `idx_lots_building_number` (unique constraint)
- [ ] `idx_lots_type` (filtrage)

**Lot Contacts** (4 indexes)
- [ ] `idx_lot_contacts_lot_id`
- [ ] `idx_lot_contacts_contact_id`
- [ ] `idx_lot_contacts_role`
- [ ] `idx_lot_contacts_lot_role_end` (composite)

#### Frontend ❌ À FAIRE

##### 🎨 Components à Créer/Migrer

**Gestionnaire Dashboard**
- [ ] `buildings-list.tsx` - Liste des immeubles avec filtres
- [ ] `building-card.tsx` - Carte immeuble (aperçu)
- [ ] `building-details.tsx` - Détails immeuble complet
- [ ] `building-form-modal.tsx` - Création/édition immeuble
- [ ] `lots-list.tsx` - Liste des lots (avec filtre par immeuble)
- [ ] `lot-card.tsx` - Carte lot (aperçu)
- [ ] `lot-details.tsx` - Détails lot complet
- [ ] `lot-form-modal.tsx` - Création/édition lot
- [ ] `lot-contact-assignment.tsx` - Associer contacts à un lot

**Locataire Dashboard**
- [ ] `my-lots.tsx` - Mes lots (locataire)
- [ ] `lot-info-card.tsx` - Info lot (vue locataire)

##### 🪝 Hooks à Créer/Migrer

**Data Fetching**
- [ ] `use-buildings-data.ts` - Fetch buildings avec pagination
- [ ] `use-building-details.ts` - Fetch détails immeuble
- [ ] `use-lots-data.ts` - Fetch lots avec filtres (building_id, tenant_id)
- [ ] `use-lot-details.ts` - Fetch détails lot
- [ ] `use-lot-contacts.ts` - Fetch contacts d'un lot

**Business Logic**
- [ ] `use-building-creation.ts` - Logique création immeuble
- [ ] `use-building-edition.ts` - Logique édition immeuble
- [ ] `use-lot-creation.ts` - Logique création lot
- [ ] `use-lot-edition.ts` - Logique édition lot
- [ ] `use-lot-tenant-assignment.ts` - Assigner locataire à lot

**Cache Management**
- [ ] Ajouter clés cache pour buildings/lots dans `use-cache-management.ts`

##### 🔌 API Routes à Créer/Migrer

**Buildings**
- [ ] `app/api/buildings/route.ts` - GET (list), POST (create)
- [ ] `app/api/buildings/[id]/route.ts` - GET (details), PATCH (update), DELETE (soft)
- [ ] `app/api/buildings/[id]/lots/route.ts` - GET lots d'un immeuble

**Lots**
- [ ] `app/api/lots/route.ts` - GET (list), POST (create)
- [ ] `app/api/lots/[id]/route.ts` - GET (details), PATCH (update), DELETE (soft)
- [ ] `app/api/lots/[id]/contacts/route.ts` - GET contacts d'un lot
- [ ] `app/api/lots/[id]/assign-tenant/route.ts` - POST assigner locataire

**Lot Contacts**
- [ ] `app/api/lot-contacts/route.ts` - POST (create association)
- [ ] `app/api/lot-contacts/[id]/route.ts` - PATCH (update), DELETE (remove)

##### 🏗️ Services & Repositories

**Repositories**
- [ ] `lib/services/repositories/building.repository.ts`
- [ ] `lib/services/repositories/lot.repository.ts`
- [ ] `lib/services/repositories/lot-contact.repository.ts`

**Services**
- [ ] `lib/services/domain/building.service.ts`
- [ ] `lib/services/domain/lot.service.ts`
- [ ] `lib/services/domain/lot-contact.service.ts`

---

### ❌ PHASE 3: INTERVENTIONS, DEVIS, DISPONIBILITÉS (À FAIRE)

**Date de début prévue**: TBD (après Phase 2)
**Migration prévue**: `20251011000001_phase3_interventions_quotes_availability.sql`

#### Backend ❌ À FAIRE

##### 📋 Tables à Migrer

**1. Table `interventions`**
- [ ] Créer table avec colonnes complètes (voir `database-schema-optimal.md:600-650`)
- [ ] Relations: `lot_id`, `requester_id`, `assigned_provider_id`, `validated_by_manager_id`
- [ ] Enum `intervention_status` (12 statuts en français)
- [ ] Enum `intervention_type` (5 types)
- [ ] Enum `urgency_level` (4 niveaux)
- [ ] Contraintes de workflow (statuts valides selon rôle)

**2. Table `quotes`**
- [ ] Créer table avec colonnes (voir `database-schema-optimal.md:700-750`)
- [ ] Relations: `intervention_id`, `provider_id`, `validated_by_id`
- [ ] Enum `quote_status` (6 statuts)
- [ ] Contraintes: `amount > 0`, `estimated_duration >= 0`

**3. Table `intervention_assignments`**
- [ ] Créer table (voir `database-schema-optimal.md:800-850`)
- [ ] Relations: `intervention_id`, `provider_id`
- [ ] Enum `assignment_response` (3 réponses: accepted, declined, pending)

**4. Table `availability_slots`**
- [ ] Créer table (voir `database-schema-optimal.md:900-950`)
- [ ] Relations: `provider_id`, `intervention_id` (nullable)
- [ ] Contraintes: `start_time < end_time`, pas de chevauchement

**5. Table `intervention_documents`**
- [ ] Créer table (voir `database-schema-optimal.md:1000-1050`)
- [ ] Relations: `intervention_id`, `uploaded_by_user_id`
- [ ] Storage: Intégration Supabase Storage

**6. Table `intervention_messages`**
- [ ] Créer table (voir `database-schema-optimal.md:1100-1150`)
- [ ] Relations: `intervention_id`, `sender_id`
- [ ] Support pièces jointes

##### 🔐 RLS Policies à Créer

**Interventions** (8 policies complexes)
- [ ] SELECT policies (multi-rôle: locataire, gestionnaire, prestataire)
- [ ] INSERT policies (locataire, gestionnaire)
- [ ] UPDATE policies (workflow-based, selon statut)
- [ ] DELETE policies (gestionnaire/admin uniquement)

**Quotes** (6 policies)
- [ ] SELECT policies (prestataire, gestionnaire)
- [ ] INSERT policies (prestataire)
- [ ] UPDATE policies (prestataire, gestionnaire selon statut)

**Documents/Messages** (4 policies chacun)
- [ ] SELECT policies (parties prenantes de l'intervention)
- [ ] INSERT policies (selon rôle)
- [ ] DELETE policies (owner ou admin)

##### 🛠️ Fonctions Utilitaires à Créer

- [ ] `can_view_intervention(intervention_id UUID)` - Multi-rôle
- [ ] `can_update_intervention(intervention_id UUID)` - Selon workflow
- [ ] `can_change_intervention_status(intervention_id UUID, new_status TEXT)` - Validation workflow
- [ ] `get_intervention_stakeholders(intervention_id UUID)` - Liste parties prenantes
- [ ] `is_provider_available(provider_id UUID, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ)` - Check disponibilité

##### ⚡ Triggers à Créer

- [ ] Auto-update `updated_at` (5 triggers)
- [ ] Notification triggers (8 triggers pour workflow)
- [ ] Cascade soft delete
- [ ] Validation workflow (prevent invalid transitions)

##### 📊 Indexes de Performance

- [ ] 30+ indexes (voir `database-schema-optimal.md:1500-1600`)
- [ ] Indexes composites pour requêtes complexes
- [ ] Indexes GIN pour recherche full-text (messages, documents)

#### Frontend ❌ À FAIRE

##### 🎨 Components à Migrer vers Server Components

- [ ] Intervention dashboards (4 rôles)
- [ ] Intervention workflow components (15+ composants)
- [ ] Quote management components (8 composants)
- [ ] Availability calendar (4 composants)
- [ ] Document upload/viewer (3 composants)
- [ ] Real-time messaging (5 composants)

##### 🪝 Hooks à Optimiser

- [ ] `use-intervention-*.ts` (7 hooks) - Migrer vers Server Actions
- [ ] `use-quote-*.ts` (3 hooks) - Migrer vers Server Actions
- [ ] `use-availability-management.ts` - Optimiser avec cache

##### 🔌 API Routes à Migrer

- [ ] 70+ API routes existantes → Server Actions where possible
- [ ] Keep API routes only for external integrations (webhooks, third-party)

---

## 🎯 FRONTEND: MIGRATION SERVER/CLIENT COMPONENTS

**Référence**: `plan-migration-architecture-serverclient.md`

### ✅ Phase 1: Infrastructure (COMPLÉTÉE)

- [x] Configuration TypeScript strict
- [x] Supabase SSR clients (Browser/Server)
- [x] Repository Pattern (8 repositories)
- [x] Service Layer (10 services)
- [x] Error boundaries
- [x] Loading states standardisés

### ⏳ Phase 2: Core Components (30% COMPLÉTÉ)

**Dashboards** (4 rôles)
- [x] `admin-dashboard.tsx` - Migré Server Component
- [x] `gestionnaire-dashboard.tsx` - Migré Server Component
- [ ] `prestataire-dashboard.tsx` - ❌ Client Component (à migrer)
- [ ] `locataire-dashboard.tsx` - ❌ Client Component (à migrer)

**Intervention Workflow**
- [ ] `intervention-card.tsx` - ❌ Client (25KB, à migrer)
- [ ] `intervention-actions.tsx` - ❌ Client (18KB, à migrer)
- [ ] Closure workflow (5 composants) - ⏳ Partiellement migré

**Data Fetching**
- [x] `use-cached-data.ts` - ✅ Optimisé avec TTL
- [ ] Migration vers `fetch()` avec cache dans Server Components - ⏳ 40%

### ❌ Phase 3: Advanced Features (À FAIRE)

- [ ] Real-time subscriptions (Supabase)
- [ ] Optimistic UI updates
- [ ] Streaming Server Components
- [ ] Parallel data fetching
- [ ] React Suspense boundaries

---

## 📋 CHECKLIST PHASE 2 (PRIORITÉ IMMÉDIATE)

### Backend (Jour 1-2)
- [ ] Créer `20251010000001_phase2_buildings_lots_contacts.sql`
- [ ] Définir tables `buildings`, `lots`, `lot_contacts`
- [ ] Créer 12 RLS policies
- [ ] Créer 6 fonctions utilitaires
- [ ] Créer 3 triggers
- [ ] Créer 15 indexes
- [ ] Tester policies avec `SELECT ... WHERE NOT can_view_building(...)`

### Repositories & Services (Jour 2-3)
- [ ] `building.repository.ts` + tests unitaires
- [ ] `lot.repository.ts` + tests unitaires
- [ ] `lot-contact.repository.ts` + tests unitaires
- [ ] `building.service.ts` + tests unitaires
- [ ] `lot.service.ts` + tests unitaires
- [ ] `lot-contact.service.ts` + tests unitaires

### API Routes (Jour 3-4)
- [ ] 8 API routes (buildings, lots, lot-contacts)
- [ ] Tests E2E pour chaque endpoint
- [ ] Documentation OpenAPI

### Frontend Components (Jour 4-5)
- [ ] 9 composants (buildings, lots) en Server Components
- [ ] 5 hooks (data fetching)
- [ ] 3 hooks (business logic)
- [ ] Tests E2E (Playwright)

### Migration de Données (Jour 5)
- [ ] Script de migration v1 → v2
- [ ] Backup base de données
- [ ] Exécution migration
- [ ] Validation intégrité
- [ ] Tests end-to-end complets

### Documentation (Jour 5)
- [ ] Mettre à jour ce guide (MIGRATION-MASTER-GUIDE.md)
- [ ] Mettre à jour `database-schema-optimal.md` (marquer Section 2 ✅)
- [ ] Mettre à jour `plan-migration-architecture-serverclient.md` (Phase 2 avancement)

---

## 🔄 Journal des Modifications

### 2025-10-10 (Session 2)

**Phase 1: Corrections post-déploiement**

1. **RLS Infinite Recursion Fix**
   - **Contexte**: Erreur lors de l'édition de contacts (users.update)
   - **Solution**: Fonction `can_manager_update_user()` SECURITY DEFINER
   - **Fichiers modifiés**:
     - `supabase/migrations/20251009000001_phase1_users_teams_companies_invitations.sql`
       - Lignes 396-430: Nouvelle fonction
       - Lignes 688-695: Policy simplifiée
       - Ligne 975: Documentation fonction
       - Ligne 1015: Statistiques (7→8 fonctions)
   - **Impact**: Résolution de l'erreur 42P17, édition contacts fonctionnelle

2. **Email Templates Redesign**
   - **Contexte**: Design des emails transactionnels à améliorer
   - **Changements**:
     - `emails/components/email-header.tsx`:
       - Logo repositionné top-left (100x32px)
       - Titre centré ligne 2 (32px, white)
       - Architecture table-based pour compatibilité email clients
     - `emails/components/email-button.tsx`:
       - Gradient background (135deg, #5b8def → #4a7ad9)
       - Box-shadow: `0 4px 14px rgba(91, 141, 239, 0.4)`
       - Border semi-transparent: `1px solid rgba(255, 255, 255, 0.2)`
       - Dimensions: padding 14px×28px, min-height 48px
       - Architecture table-based (TD contient styles, Button = block)
   - **Résultat**: Design professionnel, espace vertical éliminé
   - **Build**: ✅ `npm run build` réussi (84 pages, 0 erreurs)

3. **Documentation Update**
   - **Création**: `MIGRATION-MASTER-GUIDE.md` (ce fichier)
   - **Objectif**: Centraliser le suivi de migration (backend + frontend)
   - **Prochaines étapes**: Phase 2 (Buildings, Lots, Contacts)

---

## 📚 Ressources Clés

### Documentation Technique
- **Schema v2.0**: `database-schema-optimal.md` (1900+ lignes, référence complète)
- **Section 1 Details**: `migration-section-1-users-teams-invitations-UPDATED.md`
- **Comparaison v1/v2**: `schema-comparaison-visuel.md`
- **Data Flow**: `seido-data-flow-architecture-analysis.md`

### Migrations SQL
- **Phase 1**: `supabase/migrations/20251009000001_phase1_users_teams_companies_invitations.sql`
- **Phase 2** (à créer): `20251010000001_phase2_buildings_lots_contacts.sql`
- **Phase 3** (à créer): `20251011000001_phase3_interventions_quotes_availability.sql`

### Code Architecture
- **Repositories**: `lib/services/repositories/`
- **Services**: `lib/services/domain/`
- **Hooks**: `hooks/use-*.ts`
- **Components**: `components/` (Server/Client séparés)

### Tests
- **Unit Tests**: `lib/services/__tests__/`
- **E2E Tests**: `docs/refacto/Tests/`
- **Test Helpers**: `docs/refacto/Tests/helpers/`

---

## ✅ Critères de Complétion

Une phase est considérée **COMPLÉTÉE** lorsque:

1. ✅ **Backend**: Migration SQL déployée avec succès
2. ✅ **RLS**: Toutes les policies testées et validées
3. ✅ **Services**: Repositories + Services créés avec tests unitaires (>80% coverage)
4. ✅ **API**: Toutes les routes créées et testées (E2E)
5. ✅ **Frontend**: Components migrés en Server Components si applicable
6. ✅ **Hooks**: Hooks créés/optimisés avec cache management
7. ✅ **Tests E2E**: Suite complète avec 100% de succès (Playwright)
8. ✅ **Build**: `npm run build` réussi sans erreurs
9. ✅ **Documentation**: Tous les docs mis à jour
10. ✅ **Git**: Commit créé avec message détaillé

---

## 🚀 Commandes de Développement

### Backend
```bash
# Générer types TypeScript depuis Supabase
npm run supabase:types

# Créer nouvelle migration
npx supabase migration new phase2_buildings_lots

# Appliquer migrations
npx supabase db push
```

### Tests
```bash
# Unit tests
npm test lib/services/__tests__/

# E2E tests
npx playwright test

# E2E avec UI
npx playwright test --ui
```

### Build & Lint
```bash
# Build production
npm run build

# Lint
npm run lint
```

---

## 📞 Support & Questions

Pour toute question sur la migration:
1. Consulter `database-schema-optimal.md` pour le schéma complet
2. Consulter ce guide pour le roadmap
3. Consulter les docs spécifiques à chaque phase

---

**Dernière mise à jour**: 2025-10-10
**Prochaine étape**: Phase 2 - Buildings, Lots, Contacts
**Estimation Phase 2**: 5 jours (backend 2j, services 1j, API 1j, frontend 1j)
