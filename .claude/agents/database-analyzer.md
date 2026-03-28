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

## AGENTS.md Key Learnings for Database

Always check AGENTS.md before schema changes. Key DB learnings include:
- **RLS source of truth**: `team_members` NOT `users.team_id`
- **Storage RLS**: Use `get_my_profile_ids()` not `auth.uid()` when joining team_members
- **PostgREST FK disambiguation**: Use `!fk_constraint_name` hint for multiple FK paths
- **Two role systems**: `users.role` (global) vs `team_members.role` (team-specific)
- Learning numbers change; grep AGENTS.md for your specific domain

---

## Skills Integration

| Situation | Skill |
|-----------|-------|
| Analyse schema | (pas de skill requis - mission principale) |
| Bug RLS detecte | `sp-systematic-debugging` |
| Nouvelle migration | `sp-verification-before-completion` |
| Refactoring schema | `sp-writing-plans` |

### Workflow Database Analyzer

```
[Analyse demandee] → Audit complet (RLS, triggers, vues)
    ↓
[Si drift detecte] → Documenter + sp-writing-plans si complexe
    ↓
sp-verification-before-completion → Avant toute migration
```

---

## Example Output

### Analysis report format:

```markdown
## Database Analysis Report — 2026-03-28

### Metrics
- Tables: 56 | Enums: 12 | Migrations: 202 | RLS functions: 10

### RLS Audit
| Table | INSERT | SELECT | UPDATE | DELETE | Issue |
|-------|--------|--------|--------|--------|-------|
| buildings | is_team_manager | can_view_building | is_team_manager | is_team_manager | OK |
| lots | is_team_manager | can_view_lot | is_team_manager | - | Missing DELETE policy |

### Denormalization Triggers
| Table | Trigger | Source | Status |
|-------|---------|--------|--------|
| conversation_messages | tr_conversation_messages_team_id | thread -> intervention | OK |

### Drifts
| Item | Issue | Severity |
|------|-------|----------|
| lots DELETE policy | Missing — soft delete only via app | Medium |
```

### When asked to write a migration:

```sql
-- Migration: 20260328120000_add_feature_table.sql

-- 1. Create table
CREATE TABLE IF NOT EXISTS feature_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Indexes (always on FK + team_id)
CREATE INDEX idx_feature_items_team_id ON feature_items(team_id);

-- 3. Active view
CREATE OR REPLACE VIEW feature_items_active AS
  SELECT * FROM feature_items WHERE deleted_at IS NULL;

-- 4. RLS
ALTER TABLE feature_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_isolation" ON feature_items
  FOR ALL TO authenticated
  USING (is_team_manager(team_id))
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "admin_bypass" ON feature_items
  FOR ALL TO authenticated
  USING (is_admin());

-- 5. Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON feature_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### What NOT to produce:
- Table without RLS policies
- Missing index on `team_id` or foreign keys
- Missing `_active` view for soft-deletable tables
- Using `users.team_id` in RLS (use `team_members` via `is_team_manager()`)
- `FOR ALL` policy when different actions need different checks
- Missing `updated_at` trigger
