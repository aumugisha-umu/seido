---
paths:
  - "supabase/migrations/**"
  - "lib/database.types.ts"
  - "lib/services/repositories/**"
---

# Règles Database - SEIDO

> Ces règles s'appliquent quand tu modifies le schéma ou les repositories.

## Avant Toute Migration

1. **Vérifier** le schéma actuel dans `lib/database.types.ts`
2. **Nommer** la migration : `YYYYMMDDHHMMSS_description.sql`
3. **Toujours** ajouter RLS policies pour nouvelles tables
4. **Régénérer** les types après : `npm run supabase:types`
5. **Mettre à jour** `.claude/memory-bank/techContext.md`

## Fonctions RLS Disponibles

| Fonction | Usage |
|----------|-------|
| `is_admin()` | Check rôle admin |
| `is_gestionnaire()` | Check rôle gestionnaire |
| `is_team_manager(team_id)` | Check membre équipe |
| `get_building_team_id(building_id)` | Récupère team_id via building |
| `get_lot_team_id(lot_id)` | Récupère team_id via lot |
| `is_tenant_of_lot(lot_id)` | Vérifie si locataire du lot |
| `can_view_building(building_id)` | Permission sur building |
| `can_view_lot(lot_id)` | Permission sur lot |
| `get_current_user_id()` | UUID user courant |
| `is_assigned_to_intervention(intervention_id)` | Affectation intervention |

## Isolation Multi-Tenant

⚠️ **TOUTES** les queries multi-tenant DOIVENT filtrer par `team_id`.

```sql
-- ✅ CORRECT
CREATE POLICY "select_own_team" ON my_table
  FOR SELECT USING (is_team_manager(team_id));

-- ❌ INTERDIT - Pas d'isolation
CREATE POLICY "select_all" ON my_table
  FOR SELECT USING (true);
```

## Tables avec team_id Dénormalisé

Ces 4 tables ont un trigger qui synchronise automatiquement `team_id`.
Ne PAS fournir manuellement lors de l'INSERT :

- `conversation_messages` (via thread → intervention)
- `building_contacts` (via building)
- `lot_contacts` (via lot → building)
- `intervention_time_slots` (via intervention)

## Vues _active (Soft Delete)

Toujours utiliser les vues pour les données non-supprimées :

```typescript
// ✅ CORRECT
supabase.from('interventions_active').select('*')
supabase.from('buildings_active').select('*')
supabase.from('lots_active').select('*')
supabase.from('contracts_active').select('*')

// ❌ Risque d'inclure données supprimées
supabase.from('interventions').select('*')
```

## Conventions de Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Tables | snake_case pluriel | `intervention_quotes` |
| Colonnes | snake_case | `created_at`, `team_id` |
| Primary keys | `id` UUID | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign keys | `{table}_id` | `intervention_id`, `user_id` |
| Indexes | `idx_{table}_{columns}` | `idx_interventions_team_status` |
| Policies | `{table}_{operation}_{description}` | `interventions_select_team` |
| Triggers | `tr_{table}_{action}` | `tr_conversation_messages_team_id` |

## Template Migration

```sql
-- YYYYMMDDHHMMSS_description.sql

-- 1. Création de table
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Index
CREATE INDEX idx_my_table_team ON my_table(team_id);

-- 3. RLS Policies (OBLIGATOIRE)
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "my_table_select_team" ON my_table
  FOR SELECT USING (is_team_manager(team_id));

CREATE POLICY "my_table_insert_team" ON my_table
  FOR INSERT WITH CHECK (is_team_manager(team_id));

CREATE POLICY "my_table_update_team" ON my_table
  FOR UPDATE USING (is_team_manager(team_id));

CREATE POLICY "my_table_delete_team" ON my_table
  FOR DELETE USING (is_team_manager(team_id));

-- 4. Admin bypass
CREATE POLICY "my_table_admin_all" ON my_table
  FOR ALL USING (is_admin());
```

## Commandes

```bash
# Régénérer les types TypeScript
npm run supabase:types

# Créer une nouvelle migration
npm run supabase:migrate

# Appliquer les migrations
npx supabase db push
```

---

## Skills pour Database

| Action | Skill | Quand |
|--------|-------|-------|
| Nouvelle migration | `sp-verification-before-completion` | APRES creation |
| Bug RLS | `sp-systematic-debugging` | AVANT fix |
| Schema complexe | `sp-writing-plans` | AVANT implementation |
| Nouveau trigger | `sp-test-driven-development` | AVANT code |

### Red Flags Database

| Pensee | Skill |
|--------|-------|
| "Permission denied..." | `sp-systematic-debugging` |
| "Nouvelle table/colonne..." | `sp-verification-before-completion` |
| "Refactoring schema..." | `sp-writing-plans` |
| "Bug RLS..." | `sp-systematic-debugging` |
