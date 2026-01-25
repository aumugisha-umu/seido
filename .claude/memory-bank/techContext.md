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

## Fichiers Clés

| Usage | Chemin |
|-------|--------|
| Types DB (source de vérité) | `lib/database.types.ts` |
| Index des services | `lib/services/index.ts` |
| Contexte auth server | `lib/server-context.ts` |
| Variables CSS | `app/globals.css` |
| Clients Supabase | `lib/services/core/supabase-client.ts` |
| Repository de base | `lib/services/core/base-repository.ts` |
| Notification actions | `app/actions/notification-actions.ts` |
| Realtime context | `contexts/realtime-context.tsx` |

## Commandes

```bash
# Développement
npm run dev              # Serveur de dev

# Validation (UTILISER EN PRIORITÉ)
npm run lint             # ESLint
npx tsc --noEmit [file]  # Validation TypeScript ciblée

# ⚠️ INTERDIT sans demande explicite
npm run build            # Build production

# Testing
npm test                 # Tous les tests
npx playwright test      # Tests E2E

# Database
npm run supabase:types   # Régénérer lib/database.types.ts
npm run supabase:migrate # Créer nouvelle migration
```

## Structure des Dossiers

```
app/[role]/          # Routes par rôle (admin, gestionnaire, prestataire, locataire)
components/          # 369 composants
hooks/               # 58 custom hooks
lib/services/        # Architecture Repository Pattern
  core/              # Clients Supabase, base repository, error handler
  repositories/      # 21 repositories (accès données)
  domain/            # 31 services (logique métier)
    email-notification/  # Module refactoré (15 fichiers)
tests/               # Infrastructure E2E
docs/                # 226 fichiers markdown
supabase/migrations/ # 131 migrations SQL
```

### Module email-notification (Refactoré 2026-01)

Structure modulaire avec facade backward-compatible :

```
lib/services/domain/
├── email-notification.service.ts   ← Facade (re-export) 32 lignes
├── email-notification.factory.ts   ← Factory webpack-safe 54 lignes
└── email-notification/
    ├── index.ts                    ← Re-exports 41 lignes
    ├── types.ts                    ← Interfaces 242 lignes
    ├── constants.ts                ← Config 41 lignes
    ├── helpers.ts                  ← Utilitaires 157 lignes
    ├── action-link-generators.ts   ← Magic links 148 lignes
    ├── data-enricher.ts            ← Data fetching 356 lignes
    ├── email-sender.ts             ← Batch sending 278 lignes
    ├── email-notification.service.ts ← Orchestrateur 547 lignes
    └── builders/                   ← 7 builders (~774 lignes)
        ├── intervention-created.builder.ts
        ├── intervention-scheduled.builder.ts
        ├── time-slots-proposed.builder.ts
        ├── intervention-completed.builder.ts
        ├── intervention-status-changed.builder.ts
        └── quote-emails.builder.ts (4 quote builders)
```

**Total : 2,616 lignes** réparties en 15 fichiers (<500 lignes chacun)

## Base de Données

### Tables Principales (40 total)

| Phase | Tables |
|-------|--------|
| 1 | users, teams, team_members, companies, user_invitations, company_members |
| 2 | buildings, lots, building_contacts, lot_contacts, property_documents |
| 3 | interventions, intervention_*, conversation_*, notifications, activity_logs, **email_links**, **push_subscriptions** |
| 4 | contracts, contract_contacts, contract_documents, import_jobs |
| 5 | intervention_types, intervention_type_categories |

### Enums PostgreSQL (39 total)

Enums principaux utilisés dans le schéma :
- `user_role` (4 valeurs)
- `intervention_status` (11 valeurs)
- `quote_status`, `priority_type`, `contact_type`, etc.

### Fonctions PostgreSQL (77 total)

**32 fonctions RLS** (vérification permissions) + **45 fonctions utilitaires** (triggers, helpers)

```sql
-- Vérification de rôle (RLS)
is_admin()
is_gestionnaire()

-- Vérification d'appartenance équipe (RLS)
is_team_manager(team_id)

-- Récupération team_id par relation (RLS)
get_building_team_id(building_id)
get_lot_team_id(lot_id)

-- Vérification tenant (RLS)
is_tenant_of_lot(lot_id)

-- Vérification accès ressource (RLS)
can_view_building(building_id)
can_view_lot(lot_id)

-- Utilisateur courant (RLS)
get_current_user_id()

-- Intervention (RLS)
is_assigned_to_intervention(intervention_id)
```

**Fonctions utilitaires notables** :
- `tr_*` - Triggers pour dénormalisation team_id
- `sync_*` - Synchronisation données entre tables
- `update_*_at` - Mise à jour timestamps

### Vues PostgreSQL (6 total)

Toujours utiliser les vues pour filtrer automatiquement `deleted_at` :

```typescript
// ✅ CORRECT - Vue filtre automatiquement
supabase.from('interventions_active').select('*')
supabase.from('buildings_active').select('*')
supabase.from('lots_active').select('*')
supabase.from('contracts_active').select('*')
supabase.from('activity_logs_with_user').select('*')  // Vue jointure
```

### Tables avec team_id Dénormalisé

Ces 4 tables ont un trigger qui synchronise automatiquement `team_id`.
Ne PAS fournir manuellement :
- `conversation_messages`
- `building_contacts`
- `lot_contacts`
- `intervention_time_slots`

### Enums Principaux

```typescript
type InterventionStatus =
  | 'demande'
  | 'rejetee'
  | 'approuvee'
  | 'demande_de_devis'
  | 'planification'
  | 'planifiee'
  | 'en_cours'
  | 'cloturee_par_prestataire'
  | 'cloturee_par_locataire'
  | 'cloturee_par_gestionnaire'
  | 'annulee'

type UserRole = 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
```

## Variables d'Environnement Requises

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | URL Supabase |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Clé publique Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Clé service (server-side) |
| RESEND_API_KEY | API Resend pour emails |
| **NEXT_PUBLIC_VAPID_PUBLIC_KEY** | Clé publique VAPID (push notifications) |
| **VAPID_PRIVATE_KEY** | Clé privée VAPID (push notifications) |
| **VAPID_SUBJECT** | Email contact VAPID (mailto:support@...) |
| **RESEND_WEBHOOK_SECRET** | Secret webhook Resend (Svix) |
| **EMAIL_REPLY_SIGNING_SECRET** | Secret HMAC reply-to |

---
*Dernière mise à jour: 2026-01-25*
*Régénérer types: npm run supabase:types*
