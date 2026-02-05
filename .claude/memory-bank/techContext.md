# SEIDO Technical Context

## Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js | 15.2.6 |
| React | React | 19 |
| Language | TypeScript | 5 (strict) |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui | 50+ composants |
| Icons | Lucide React | - |
| Backend | Supabase | PostgreSQL + RLS |
| Auth | @supabase/ssr | SSR cookies |
| Forms | React Hook Form + Zod | - |
| State | React Context | 3 contexts |
| Caching | Redis + LRU | - |
| Testing | Vitest + Playwright | - |
| Email | Resend + React Email | 18 templates |

## Fichiers Cles

| Usage | Chemin |
|-------|--------|
| Types DB (source de verite) | `lib/database.types.ts` |
| Index des services | `lib/services/index.ts` |
| Contexte auth server | `lib/server-context.ts` |
| Variables CSS | `app/globals.css` |
| Clients Supabase | `lib/services/core/supabase-client.ts` |
| Repository de base | `lib/services/core/base-repository.ts` |
| Notification actions | `app/actions/notification-actions.ts` |
| Realtime context | `contexts/realtime-context.tsx` |

## Commandes

```bash
# Developpement
npm run dev              # Serveur de dev

# Validation (UTILISER EN PRIORITE)
npm run lint             # ESLint
npx tsc --noEmit [file]  # Validation TypeScript ciblee

# INTERDIT sans demande explicite
npm run build            # Build production

# Testing
npm test                 # Tous les tests
npx playwright test      # Tests E2E

# Database
npm run supabase:types   # Regenerer lib/database.types.ts
npm run supabase:migrate # Creer nouvelle migration (avec timestamp correct)
```

## Structure des Dossiers

```
app/[role]/          # Routes par role (admin, gestionnaire, prestataire, locataire)
  - 87 pages total (reparties en 5+ route groups)
components/          # 230+ composants reutilisables (22 directories)
hooks/               # 61 custom hooks
lib/services/        # Architecture Repository Pattern
  core/              # Clients Supabase (4 types), base repository, error handler
  repositories/      # 22 repositories (acces donnees)
  domain/            # 32 services (logique metier)
    email-notification/  # Module refactore (15 fichiers)
app/actions/         # 17 server action files
app/api/             # 113 API routes (10 domaines)
tests/               # Infrastructure E2E
docs/                # 226 fichiers markdown
supabase/migrations/ # 155 migrations SQL (mis a jour 2026-02-03)
```

### Module email-notification (Refactore 2026-01)

Structure modulaire avec facade backward-compatible :

```
lib/services/domain/
-- email-notification.service.ts   <- Facade (re-export) 32 lignes
-- email-notification.factory.ts   <- Factory webpack-safe 54 lignes
+-- email-notification/
    -- index.ts                    <- Re-exports 41 lignes
    -- types.ts                    <- Interfaces 242 lignes
    -- constants.ts                <- Config 41 lignes
    -- helpers.ts                  <- Utilitaires 157 lignes
    -- action-link-generators.ts   <- Magic links 148 lignes
    -- data-enricher.ts            <- Data fetching 356 lignes
    -- email-sender.ts             <- Batch sending 278 lignes
    -- email-notification.service.ts <- Orchestrateur 547 lignes
    +-- builders/                   <- 7 builders (~774 lignes)
        -- intervention-created.builder.ts
        -- intervention-scheduled.builder.ts
        -- time-slots-proposed.builder.ts
        -- intervention-completed.builder.ts
        -- intervention-status-changed.builder.ts
        +-- quote-emails.builder.ts (4 quote builders)
```

**Total : 2,616 lignes** reparties en 15 fichiers (<500 lignes chacun)

## Base de Donnees

### Tables Principales (44 total - mis a jour 2026-02-03)

| Phase | Tables |
|-------|--------|
| 1 | users, teams, team_members, companies, user_invitations, company_members |
| 2 | buildings, lots, building_contacts, lot_contacts, property_documents, **addresses** |
| 3 | interventions, intervention_*, conversation_*, notifications, activity_logs, email_links, push_subscriptions |
| 4 | contracts, contract_contacts, contract_documents, import_jobs |
| 5 | intervention_types, intervention_type_categories |
| 6 | intervention_quotes, quote_attachments, quote_documents |

### Table addresses (NOUVEAU 2026-01-29)

Table centralisee pour toutes les adresses avec support Google Maps :

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Address fields (normalized)
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country country NOT NULL DEFAULT 'belgique',

  -- Google Maps geocoding data
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,
  formatted_address TEXT,

  -- Multi-tenant isolation
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);
```

**Relations FK:**
- `buildings.address_id` → `addresses.id`
- `lots.address_id` → `addresses.id`
- `companies.address_id` → `addresses.id`

### Enums PostgreSQL (39 total)

Enums principaux utilises dans le schema :
- `user_role` (4 valeurs)
- `intervention_status` (**9 valeurs** - mis a jour 2026-01-26)
- `quote_status`, `priority_type`, `contact_type`, etc.

### Fonctions PostgreSQL (79 total - mis a jour 2026-01-29)

**32 fonctions RLS** (verification permissions) + **47 fonctions utilitaires** (triggers, helpers)

```sql
-- Verification de role (RLS)
is_admin()
is_gestionnaire()

-- Verification d'appartenance equipe (RLS)
is_team_manager(team_id)

-- Multi-profil (RLS) - NOUVEAU 2026-01-28
get_my_profile_ids()  -- Retourne TOUS les profile IDs de l'auth user

-- Recuperation team_id par relation (RLS)
get_building_team_id(building_id)
get_lot_team_id(lot_id)

-- Verification tenant (RLS)
is_tenant_of_lot(lot_id)

-- Verification acces ressource (RLS)
can_view_building(building_id)
can_view_lot(lot_id)

-- Utilisateur courant (RLS)
get_current_user_id()

-- Intervention (RLS)
is_assigned_to_intervention(intervention_id)

-- Conversations (RLS) - MIS A JOUR 2026-01-29
can_view_conversation(thread_id)  -- Supporte multi-profil
```

**Fonctions utilitaires notables** :
- `tr_*` - Triggers pour denormalisation team_id
- `sync_*` - Synchronisation donnees entre tables
- `update_*_at` - Mise a jour timestamps
- `add_team_managers_to_thread()` - Auto-ajout managers aux threads (NOUVEAU)
- `add_assignment_to_conversation_participants()` - Auto-ajout participants (MIS A JOUR)

### Triggers Conversation (NOUVEAU 2026-01-29)

| Trigger | Table | Event | Fonction |
|---------|-------|-------|----------|
| `thread_add_managers` | `conversation_threads` | AFTER INSERT | `add_team_managers_to_thread()` |
| `add_assignment_participants` | `intervention_assignments` | AFTER INSERT | `add_assignment_to_conversation_participants()` |

**Ordre critique pour creation intervention:**
1. INSERT intervention
2. INSERT conversation_threads (trigger `thread_add_managers` ajoute gestionnaires)
3. INSERT intervention_assignments (trigger ajoute locataires/prestataires aux threads existants)
4. INSERT intervention_time_slots

### Vues PostgreSQL (6 total)

Toujours utiliser les vues pour filtrer automatiquement `deleted_at` :

```typescript
// CORRECT - Vue filtre automatiquement
supabase.from('interventions_active').select('*')
supabase.from('buildings_active').select('*')
supabase.from('lots_active').select('*')
supabase.from('contracts_active').select('*')
supabase.from('activity_logs_with_user').select('*')  // Vue jointure
```

### Tables avec team_id Denormalise

Ces 4 tables ont un trigger qui synchronise automatiquement `team_id`.
Ne PAS fournir manuellement :
- `conversation_messages`
- `building_contacts`
- `lot_contacts`
- `intervention_time_slots`

### Enums Principaux (Mis a jour 2026-01-26)

```typescript
// IMPORTANT: demande_de_devis a ete SUPPRIME le 2026-01-26
// Les devis sont geres via requires_quote + intervention_quotes
type InterventionStatus =
  | 'demande'
  | 'rejetee'
  | 'approuvee'
  // | 'demande_de_devis'  // SUPPRIME - utiliser requires_quote + intervention_quotes
  | 'planification'
  | 'planifiee'
  // | 'en_cours'          // SUPPRIME precedemment
  | 'cloturee_par_prestataire'
  | 'cloturee_par_locataire'
  | 'cloturee_par_gestionnaire'
  | 'annulee'

type UserRole = 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'

// Statuts des devis (table intervention_quotes)
type QuoteStatus = 'pending' | 'sent' | 'accepted' | 'rejected'

// Thread types (conversations) - Mis a jour 2026-02-01
type ConversationThreadType =
  | 'group'                // Tous les participants
  | 'tenants_group'        // Tous locataires + managers (NEW 2026-02-01)
  | 'providers_group'      // Tous prestataires + managers (NEW 2026-02-01)
  | 'tenant_to_managers'   // Un locataire specifique + managers
  | 'provider_to_managers' // Un prestataire specifique + managers
```

### Migration 2026-01-26: Suppression demande_de_devis

Fichier: `supabase/migrations/20260126120000_remove_demande_de_devis_status.sql`

**Changements:**
1. Interventions en `demande_de_devis` migrees vers `planification`
2. Enum `intervention_status` recree sans `demande_de_devis`
3. Triggers `log_status_change` et `validate_status_transition` recrees

**Nouveau pattern devis:**
- `interventions.requires_quote: boolean` - indique si un devis est requis
- `intervention_quotes` table - gere le cycle de vie des devis
- Le statut intervention reste `planification` pendant la gestion des devis

### Migrations Recentes (2026-02-01)

| Migration | Description |
|-----------|-------------|
| `20260131000000_remove_collocation_category.sql` | Suppression 'collocation' de lot_category enum |
| `20260201153246_add_individual_conversation_threads.sql` | Threads individuels par participant (NEW) |
| `20260130230000_add_performance_indexes.sql` | Index de performance |
| `20260130155700_add_contract_to_activity_entity_type.sql` | Support contrats dans activity_logs |
| `20260129220000_add_is_internal_to_comments.sql` | Commentaires internes |
| `20260129210000_fix_recreate_interventions_active_view.sql` | Fix vue interventions_active |
| `20260129200006_conversation_email_notifications.sql` | Notifications email conversations |

### Thread Types (Mis a jour 2026-02-01)

```typescript
type ConversationThreadType =
  | 'group'                // Tous les participants
  | 'tenants_group'        // Tous locataires + managers (NEW)
  | 'providers_group'      // Tous prestataires + managers (NEW)
  | 'tenant_to_managers'   // Un locataire specifique + managers
  | 'provider_to_managers' // Un prestataire specifique + managers
```

## Variables d'Environnement Requises

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | URL Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Cle publique Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Cle service (server-side) |
| RESEND_API_KEY | API Resend pour emails |
| **NEXT_PUBLIC_VAPID_PUBLIC_KEY** | Cle publique VAPID (push notifications) |
| **VAPID_PRIVATE_KEY** | Cle privee VAPID (push notifications) |
| **VAPID_SUBJECT** | Email contact VAPID (mailto:support@...) |
| **RESEND_WEBHOOK_SECRET** | Secret webhook Resend (Svix) |
| **EMAIL_REPLY_SIGNING_SECRET** | Secret HMAC reply-to |
| **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** | API Key Google Maps (a venir) |

---
*Derniere mise a jour: 2026-02-03 18:30*
*Analyse approfondie: 44 tables, 113 routes, 61 hooks, 87 pages, 155 migrations*
*Regenerer types: npm run supabase:types*
