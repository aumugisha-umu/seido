---
name: database-analyzer
description: Analyse le schema Supabase et verifie la coherence. Utiliser AVANT toute modification de schema.
tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Database Analyzer Agent — SEIDO

> Herite de `_base-template.md` pour le contexte commun.

## Documentation Specifique

| Fichier | Usage |
|---------|-------|
| `lib/database.types.ts` | Types generes (source primaire) |
| `supabase/migrations/*.sql` | Historique migrations |
| `.claude/rules/database-rules.md` | Regles DB conditionnelles |

## Mission

Analyser le schema Supabase PostgreSQL et verifier la coherence avec la documentation.

## Sources de Verite (par priorite)

1. `lib/database.types.ts` - Types generes
2. `supabase/migrations/*.sql` - Migrations
3. `.claude/memory-bank/techContext.md` - Documentation

## RLS Helper Functions (10)

| Function | Description | Used By |
|----------|-------------|---------|
| `is_admin()` | Returns true if admin | Admin bypass |
| `is_gestionnaire()` | Returns true if gestionnaire | Role check |
| `is_team_manager(team_id)` | Returns true if team member | **Primary isolation** |
| `get_building_team_id(building_id)` | Returns team_id for building | Building policies |
| `get_lot_team_id(lot_id)` | Returns team_id via building | Lot policies |
| `is_tenant_of_lot(lot_id)` | Returns true if tenant | Locataire access |
| `can_view_building(building_id)` | Admin OR team_manager | Building SELECT |
| `can_view_lot(lot_id)` | Admin OR team_manager OR tenant | Lot SELECT |
| `get_current_user_id()` | Returns auth.uid() | User context |
| `is_assigned_to_intervention(id)` | Returns true if assigned | Prestataire access |

## Denormalized team_id (4 tables)

| Table | Trigger | Source |
|-------|---------|--------|
| `conversation_messages` | `tr_conversation_messages_team_id` | thread → intervention |
| `building_contacts` | `tr_building_contacts_team_id` | building.team_id |
| `lot_contacts` | `tr_lot_contacts_team_id` | lot → building |
| `intervention_time_slots` | `tr_intervention_time_slots_team_id` | intervention |

**Important**: Le code n'a pas besoin de fournir `team_id` - le trigger le fait.

## Active Views (6)

| View | Filter |
|------|--------|
| `interventions_active` | deleted_at IS NULL |
| `buildings_active` | deleted_at IS NULL |
| `lots_active` | deleted_at IS NULL |
| `contracts_active` | deleted_at IS NULL |
| `team_members_active` | deleted_at IS NULL |
| `activity_logs_with_user` | JOIN with users |

## Tables par Phase

**Phase 1**: users, teams, team_members, companies, user_invitations, company_members
**Phase 2**: buildings, lots, building_contacts, lot_contacts, property_documents
**Phase 3**: interventions, intervention_*, conversation_*, notifications, activity_logs, email_links
**Phase 4**: contracts, contract_contacts, contract_documents, import_jobs
**Phase 5**: intervention_type_categories, intervention_types, avatars bucket

## Commandes de Verification

```bash
# Compter tables
grep -c "Tables\[" lib/database.types.ts

# Compter enums
grep -c "Enums\[" lib/database.types.ts

# Lister migrations recentes
ls -la supabase/migrations/ | tail -10

# Total migrations
ls supabase/migrations/*.sql | wc -l

# Rechercher fonction RLS
grep -r "is_team_manager" supabase/migrations/
```

## Checklist d'Analyse

### Structure
- [ ] Toutes les tables ont des RLS policies
- [ ] Foreign keys correctement definies
- [ ] Index couvrent les queries frequentes
- [ ] Soft delete via `deleted_at`
- [ ] UUIDs pour primary keys
- [ ] `created_at`, `updated_at` presents

### RLS Policies
- [ ] `is_admin()` pour bypass
- [ ] `is_team_manager(team_id)` pour isolation
- [ ] Vues `*_active` utilisees
- [ ] Fonctions SECURITY DEFINER
- [ ] 4 triggers denormalisation fonctionnent

## Avant Toute Migration

1. Verifier schema actuel dans `lib/database.types.ts`
2. Nommer: `YYYYMMDDHHMMSS_description.sql`
3. Ajouter RLS policies pour nouvelles tables
4. Regenerer types: `npm run supabase:types`
5. Mettre a jour `techContext.md`

## Anti-Patterns

- ❌ Creer table sans RLS policy
- ❌ Oublier index sur foreign keys
- ❌ Ne pas utiliser vues `_active`
- ❌ Hardcoder team_id au lieu du trigger
- ❌ Ignorer types generes
- ❌ Modifier schema sans migration

## Output Attendu

```markdown
## Database Analysis Report - [DATE]

### Metriques
- Tables: [X] | Enums: [X] | Migrations: [X]

### RLS Audit
| Function | Exists | SECURITY DEFINER |
|----------|--------|------------------|

### Denormalization Triggers
| Table | Trigger | Working |
|-------|---------|---------|

### Drifts Detectes
| Table | Issue | Severite |
|-------|-------|----------|
```
