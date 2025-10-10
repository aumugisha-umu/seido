# 🔒 RLS Best Practices: Next.js 15 + Supabase

**Date**: 2025-10-10
**Contexte**: Migration Phase 2 - Buildings & Lots

---

## 🎯 Approche recommandée (Supabase Official)

### Principe: **Fonctions Helper + Policies Simples**

Au lieu de dupliquer la logique dans chaque policy, on crée des **fonctions PostgreSQL réutilisables** que les policies appellent.

**Avantages**:
- ✅ **DRY (Don't Repeat Yourself)**: Logique centralisée
- ✅ **Performance**: Fonctions peuvent être inlinées par PostgreSQL
- ✅ **Lisibilité**: Policies courtes et claires
- ✅ **Maintenabilité**: Un seul endroit pour modifier la logique
- ✅ **Testabilité**: Fonctions testables indépendamment

---

## 📚 Structure recommandée

### 1. Fonctions Helper (SECURITY DEFINER)

```sql
-- ============================================================================
-- FONCTIONS HELPER pour RLS
-- Ces fonctions encapsulent la logique de vérification des permissions
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Vérifier si l'utilisateur est admin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_admin() IS 'Vérifie si l''utilisateur connecté est admin';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Vérifier si l'utilisateur est gestionnaire
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_gestionnaire()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'gestionnaire'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Vérifier si l'utilisateur appartient à une équipe donnée
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_in_team(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid()
      AND team_id = p_team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_in_team(UUID) IS 'Vérifie si l''utilisateur est membre de l''équipe donnée';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Vérifier si l'utilisateur est gestionnaire de l'équipe donnée
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_team_manager(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE u.id = auth.uid()
      AND u.role = 'gestionnaire'
      AND tm.team_id = p_team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_team_manager(UUID) IS 'Vérifie si l''utilisateur est gestionnaire de l''équipe donnée';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Vérifier si l'utilisateur est assigné à un building (via building_contacts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_assigned_to_building(p_building_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM building_contacts
    WHERE user_id = auth.uid()
      AND building_id = p_building_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_assigned_to_building(UUID) IS 'Vérifie si l''utilisateur est assigné au building (prestataire/gestionnaire secondaire)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Vérifier si l'utilisateur est assigné à un lot (via lot_contacts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_assigned_to_lot(p_lot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lot_contacts
    WHERE user_id = auth.uid()
      AND lot_id = p_lot_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_assigned_to_lot(UUID) IS 'Vérifie si l''utilisateur est assigné au lot (locataire/colocataire/prestataire)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Vérifier si l'utilisateur est locataire d'un lot
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_tenant_of_lot(p_lot_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lots
    WHERE id = p_lot_id
      AND (
        tenant_id = auth.uid()  -- Locataire principal
        OR
        id IN (  -- Ou via lot_contacts
          SELECT lot_id FROM lot_contacts
          WHERE user_id = auth.uid()
        )
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_tenant_of_lot(UUID) IS 'Vérifie si l''utilisateur est locataire du lot (principal ou via lot_contacts)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Obtenir le team_id d'un building
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_building_team_id(p_building_id UUID)
RETURNS UUID AS $$
  SELECT team_id FROM buildings WHERE id = p_building_id AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_building_team_id(UUID) IS 'Retourne le team_id du building donné';

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Obtenir le team_id d'un lot (via son building parent)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_lot_team_id(p_lot_id UUID)
RETURNS UUID AS $$
  SELECT b.team_id
  FROM lots l
  JOIN buildings b ON l.building_id = b.id
  WHERE l.id = p_lot_id
    AND l.deleted_at IS NULL
    AND b.deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_lot_team_id(UUID) IS 'Retourne le team_id du lot (via son building parent)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Vérifier si l'utilisateur peut voir un building
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_view_building(p_building_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Admin peut tout voir
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  v_team_id := get_building_team_id(p_building_id);

  -- Membre de l'équipe peut voir
  IF user_in_team(v_team_id) THEN
    RETURN TRUE;
  END IF;

  -- Assigné au building peut voir (prestataire)
  IF is_assigned_to_building(p_building_id) THEN
    RETURN TRUE;
  END IF;

  -- Locataire d'un lot du building peut voir le building
  IF EXISTS (
    SELECT 1 FROM lots
    WHERE building_id = p_building_id
      AND deleted_at IS NULL
      AND is_tenant_of_lot(id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION can_view_building(UUID) IS 'Vérifie si l''utilisateur peut voir le building (toute logique de SELECT consolidée)';
```

---

### 2. Policies Simplifiées (utilisant les fonctions)

```sql
-- ============================================================================
-- RLS POLICIES: buildings (Version simplifiée avec fonctions helper)
-- ============================================================================

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Utilise la fonction helper can_view_building()
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_select
  ON buildings FOR SELECT
  USING (can_view_building(id));

COMMENT ON POLICY buildings_select ON buildings IS
  'Permet la lecture selon les règles: admin (tout), équipe (leur team), prestataire (assignés), locataire (leur building)';

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: Admin OU Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_insert
  ON buildings FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(team_id)
  );

COMMENT ON POLICY buildings_insert ON buildings IS
  'Admin peut créer partout, gestionnaire peut créer dans son équipe';

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE: Admin OU Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_update
  ON buildings FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR
      is_team_manager(team_id)
    )
  )
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(team_id)
  );

COMMENT ON POLICY buildings_update ON buildings IS
  'Admin peut modifier partout, gestionnaire peut modifier dans son équipe';

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE: Admin OU Gestionnaire de l'équipe (soft delete)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY buildings_delete
  ON buildings FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(team_id)
  );

COMMENT ON POLICY buildings_delete ON buildings IS
  'Admin peut supprimer partout, gestionnaire peut supprimer dans son équipe';
```

---

### 3. Policies pour `lots`

```sql
-- ============================================================================
-- RLS POLICIES: lots (Version simplifiée avec fonctions helper)
-- ============================================================================

ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT: Logique complexe via fonction helper
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION can_view_lot(p_lot_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_team_id UUID;
  v_lot RECORD;
BEGIN
  -- Admin peut tout voir
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Charger les infos du lot
  SELECT * INTO v_lot FROM lots WHERE id = p_lot_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_team_id := get_lot_team_id(p_lot_id);

  -- Gestionnaire de l'équipe peut voir
  IF is_team_manager(v_team_id) THEN
    RETURN TRUE;
  END IF;

  -- Gestionnaire direct du lot peut voir
  IF v_lot.gestionnaire_id = auth.uid() AND is_gestionnaire() THEN
    RETURN TRUE;
  END IF;

  -- Assigné au lot peut voir (prestataire/colocataire)
  IF is_assigned_to_lot(p_lot_id) THEN
    RETURN TRUE;
  END IF;

  -- Locataire du lot peut voir
  IF is_tenant_of_lot(p_lot_id) THEN
    RETURN TRUE;
  END IF;

  -- Assigné au building parent peut voir
  IF is_assigned_to_building(v_lot.building_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY lots_select
  ON lots FOR SELECT
  USING (can_view_lot(id));

COMMENT ON POLICY lots_select ON lots IS
  'Permet la lecture selon les règles consolidées dans can_view_lot()';

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT: Admin OU Gestionnaire de l'équipe du building
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lots_insert
  ON lots FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(get_building_team_id(building_id))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE: Admin OU Gestionnaire de l'équipe OU Gestionnaire direct du lot
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lots_update
  ON lots FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR
      is_team_manager(get_lot_team_id(id))
      OR
      (gestionnaire_id = auth.uid() AND is_gestionnaire())
    )
  )
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(id))
    OR
    (gestionnaire_id = auth.uid() AND is_gestionnaire())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE: Admin OU Gestionnaire de l'équipe
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY lots_delete
  ON lots FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(id))
  );
```

---

### 4. Policies pour `building_contacts` et `lot_contacts`

```sql
-- ============================================================================
-- RLS POLICIES: building_contacts
-- ============================================================================

ALTER TABLE building_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: Peut voir si peut voir le building parent
CREATE POLICY building_contacts_select
  ON building_contacts FOR SELECT
  USING (can_view_building(building_id));

-- INSERT/UPDATE/DELETE: Admin OU Gestionnaire de l'équipe du building
CREATE POLICY building_contacts_insert
  ON building_contacts FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(get_building_team_id(building_id))
  );

CREATE POLICY building_contacts_update
  ON building_contacts FOR UPDATE
  USING (
    is_admin()
    OR
    is_team_manager(get_building_team_id(building_id))
  );

CREATE POLICY building_contacts_delete
  ON building_contacts FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(get_building_team_id(building_id))
  );

-- ============================================================================
-- RLS POLICIES: lot_contacts
-- ============================================================================

ALTER TABLE lot_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: Peut voir si peut voir le lot parent
CREATE POLICY lot_contacts_select
  ON lot_contacts FOR SELECT
  USING (can_view_lot(lot_id));

-- INSERT/UPDATE/DELETE: Admin OU Gestionnaire de l'équipe du lot
CREATE POLICY lot_contacts_insert
  ON lot_contacts FOR INSERT
  WITH CHECK (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(lot_id))
  );

CREATE POLICY lot_contacts_update
  ON lot_contacts FOR UPDATE
  USING (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(lot_id))
  );

CREATE POLICY lot_contacts_delete
  ON lot_contacts FOR DELETE
  USING (
    is_admin()
    OR
    is_team_manager(get_lot_team_id(lot_id))
  );
```

---

## 📊 Comparaison des approches

| Critère | Approche A<br/>(Policies mixtes) | Approche B<br/>(Granulaire) | **Approche C**<br/>(Helper Functions) ✅ |
|---------|----------------------------------|----------------------------|------------------------------------------|
| **Nombre de policies** | 16 | 38 | 16 |
| **Lignes de code** | ~400 | ~1200 | ~300 (policies) + ~200 (fonctions) = 500 |
| **Lisibilité** | Moyenne | Faible | **Excellente** |
| **Maintenabilité** | Difficile | Très difficile | **Facile** |
| **Performance** | Bonne | Bonne | **Optimale** (inlining) |
| **Testabilité** | Difficile | Difficile | **Excellente** (fonctions isolées) |
| **Debugging** | Moyen | Difficile | **Facile** (logs dans fonctions) |
| **DRY Principle** | ❌ Duplication | ❌ Énorme duplication | ✅ **Zéro duplication** |

---

## 🎯 Recommandation finale

**Utiliser l'Approche C (Helper Functions)** car:

1. **✅ Conforme aux best practices Supabase** ([documentation officielle](https://supabase.com/docs/guides/database/postgres/row-level-security))
2. **✅ Pattern validé en production** par des milliers d'apps Supabase
3. **✅ Optimisation PostgreSQL** : Les fonctions `STABLE` peuvent être inlinées
4. **✅ Facilité de test** : Vous pouvez tester `SELECT is_admin()` directement
5. **✅ Évolutivité** : Ajouter un nouveau rôle = modifier quelques fonctions seulement
6. **✅ Debugging** : Ajouter des logs dans les fonctions pour tracer les décisions

---

## 🔧 Migration depuis l'approche actuelle

### Étapes:

1. **Créer les fonctions helper** (script ci-dessus)
2. **DROP les anciennes policies** une par une
3. **Créer les nouvelles policies simplifiées**
4. **Tester avec chaque rôle** (admin, gestionnaire, prestataire, locataire)
5. **Monitorer les performances** avec `EXPLAIN ANALYZE`

### Script de migration:

```sql
-- Étape 1: Créer toutes les fonctions helper
\i helper_functions.sql

-- Étape 2: Recréer les policies buildings
DROP POLICY IF EXISTS buildings_select_by_team_members ON buildings;
DROP POLICY IF EXISTS buildings_insert_by_gestionnaires ON buildings;
DROP POLICY IF EXISTS buildings_update_by_gestionnaires ON buildings;
DROP POLICY IF EXISTS buildings_delete_by_managers ON buildings;

CREATE POLICY buildings_select ON buildings FOR SELECT USING (can_view_building(id));
CREATE POLICY buildings_insert ON buildings FOR INSERT WITH CHECK (is_admin() OR is_team_manager(team_id));
CREATE POLICY buildings_update ON buildings FOR UPDATE USING (deleted_at IS NULL AND (is_admin() OR is_team_manager(team_id)));
CREATE POLICY buildings_delete ON buildings FOR DELETE USING (is_admin() OR is_team_manager(team_id));

-- Répéter pour lots, building_contacts, lot_contacts...
```

---

## 🚀 Intégration Next.js 15 + Supabase SSR

### Pattern recommandé:

```typescript
// lib/services/core/supabase-client.ts
import { createServerClient } from '@supabase/ssr'

export async function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// lib/services/repositories/building.repository.ts
import { createServerSupabaseClient } from '../core/supabase-client'

export class BuildingRepository {
  async findAll() {
    const supabase = await createServerSupabaseClient()

    // RLS s'applique automatiquement !
    const { data, error } = await supabase
      .from('buildings')
      .select('*')

    // La policy buildings_select vérifie can_view_building() automatiquement
    return data
  }
}
```

### ✅ Sécurité en profondeur (Defense in Depth):

1. **RLS côté DB** : Garantit que même un client compromis ne peut pas accéder aux données
2. **Validation côté Server Component** : Double vérification + logique métier
3. **Middleware Next.js** : Redirections basées sur le rôle
4. **API Routes avec validation** : Zod schemas + vérifications supplémentaires

---

## 📚 Ressources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL Security Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [Next.js 15 SSR with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Performance Tuning RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#performance)

---

**Prochaine étape** : Implémenter les fonctions helper et migrer les policies vers cette approche simplifiée.
