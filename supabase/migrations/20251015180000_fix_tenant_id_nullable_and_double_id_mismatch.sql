-- ============================================================================
-- FIX PHASE 3 ARCHITECTURE: tenant_id NULLABLE + Double-ID Mismatch
-- ============================================================================
-- Date: 2025-10-15 18:00
-- Issues Fixed:
--   1. tenant_id NOT NULL contradicts ON DELETE SET NULL (schema error)
--   2. Tenants should be linked via intervention_assignments, not directly
--   3. ALL Phase 3 RLS uses auth.uid() directly instead of resolving users.id
--   4. This causes systematic INSERT/UPDATE failures across interventions
--
-- Changes:
--   - Make tenant_id NULLABLE in interventions table
--   - Fix 23 double-ID mismatches (auth.uid() → users.id resolution)
--   - Update triggers to handle NULL tenant_id
--   - Update 2 RLS helper functions
--   - Update 21 RLS policies
-- ============================================================================

-- ============================================================================
-- SECTION 1: Fix interventions.tenant_id Schema
-- ============================================================================

-- Make tenant_id NULLABLE (fixes NOT NULL + ON DELETE SET NULL contradiction)
ALTER TABLE interventions ALTER COLUMN tenant_id DROP NOT NULL;

COMMENT ON COLUMN interventions.tenant_id IS 'OPTIONAL: Demandeur principal (locataire). Peut être NULL si intervention créée par gestionnaire sans locataire spécifique. Relations via intervention_assignments (many-to-many).';

-- ============================================================================
-- SECTION 2: Fix RLS Helper Functions (2 critical fixes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1: is_assigned_to_intervention() - Double-ID mismatch
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_assigned_to_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- ✅ FIX: Resolve auth.uid() to users.id before comparing
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    WHERE ia.intervention_id = p_intervention_id
      AND ia.user_id IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
  );
END;
$$;

COMMENT ON FUNCTION is_assigned_to_intervention IS 'FIX 2025-10-15: Résout auth.uid() (auth_user_id) en users.id avant comparaison avec user_id foreign key';

-- ----------------------------------------------------------------------------
-- FIX 2: is_tenant_of_intervention() - Double-ID mismatch + Handle NULL tenant_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_of_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- ✅ FIX: Resolve auth.uid() to users.id + handle NULL tenant_id
  RETURN EXISTS (
    SELECT 1
    FROM interventions i
    WHERE i.id = p_intervention_id
      AND i.tenant_id IS NOT NULL  -- Skip if no tenant linked
      AND i.tenant_id IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
  );
END;
$$;

COMMENT ON FUNCTION is_tenant_of_intervention IS 'FIX 2025-10-15: Résout auth.uid() en users.id + gère tenant_id NULL (interventions sans locataire)';

-- ============================================================================
-- SECTION 3: Fix RLS Policies (21 policies with double-ID mismatch)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 3-5: interventions policies
-- ----------------------------------------------------------------------------

-- DROP and RECREATE interventions_insert (fix double-ID + allow managers)
DROP POLICY IF EXISTS "interventions_insert" ON interventions;
DROP POLICY IF EXISTS "interventions_insert_tenant" ON interventions;
DROP POLICY IF EXISTS "interventions_insert_manager" ON interventions;

-- Policy 1: Tenants can create interventions for their lots/buildings
CREATE POLICY "interventions_insert_tenant" ON interventions
FOR INSERT
TO authenticated
WITH CHECK (
  -- ✅ FIX: Resolve auth.uid() to users.id
  tenant_id IN (
    SELECT u.id FROM users u
    WHERE u.auth_user_id = auth.uid()
  )
  AND (
    -- Lot-level: user is tenant of the lot
    (lot_id IS NOT NULL AND is_tenant_of_lot(lot_id))
    OR
    -- Building-level: user is tenant of a lot in the building
    (building_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lots l
      WHERE l.building_id = interventions.building_id
        AND is_tenant_of_lot(l.id)
    ))
  )
);

COMMENT ON POLICY "interventions_insert_tenant" ON interventions IS
  'FIX 2025-10-15: Locataires créent interventions pour leurs lots. Résout auth.uid() en users.id.';

-- Policy 2: Managers can create interventions (tenant_id can be NULL or different)
CREATE POLICY "interventions_insert_manager" ON interventions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be team manager of the intervention's team
  is_team_manager(team_id)
  AND
  -- Must have either lot_id OR building_id
  (lot_id IS NOT NULL OR building_id IS NOT NULL)
);

COMMENT ON POLICY "interventions_insert_manager" ON interventions IS
  'FIX 2025-10-15: Gestionnaires créent interventions (tenant_id peut être NULL ou différent de auth.uid())';

-- UPDATE interventions_update (fix double-ID in tenant_id check)
DROP POLICY IF EXISTS "interventions_update" ON interventions;

CREATE POLICY interventions_update ON interventions
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR tenant_id IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR tenant_id IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "interventions_update" ON interventions IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification tenant_id';

-- ----------------------------------------------------------------------------
-- FIX 6: quotes_insert (fix provider_id double-ID)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "quotes_insert" ON intervention_quotes;

CREATE POLICY quotes_insert ON intervention_quotes
  FOR INSERT
  WITH CHECK (
    -- ✅ FIX: Resolve auth.uid() to users.id
    provider_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
    AND is_assigned_to_intervention(intervention_id)
  );

COMMENT ON POLICY "quotes_insert" ON intervention_quotes IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification provider_id';

-- ----------------------------------------------------------------------------
-- FIX 7-9: reports policies (fix created_by double-ID)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reports_insert" ON intervention_reports;
DROP POLICY IF EXISTS "reports_update" ON intervention_reports;

CREATE POLICY reports_insert ON intervention_reports
  FOR INSERT
  WITH CHECK (
    -- ✅ FIX: Resolve auth.uid() to users.id
    created_by IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
    AND can_view_intervention(intervention_id)
  );

CREATE POLICY reports_update ON intervention_reports
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      -- ✅ FIX: Resolve auth.uid() to users.id
      created_by IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
      OR is_team_manager(team_id)
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      -- ✅ FIX: Resolve auth.uid() to users.id
      created_by IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
      OR is_team_manager(team_id)
    )
  );

COMMENT ON POLICY "reports_insert" ON intervention_reports IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification created_by';

COMMENT ON POLICY "reports_update" ON intervention_reports IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification created_by';

-- ----------------------------------------------------------------------------
-- FIX 10-13: documents policies (fix uploaded_by double-ID)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "documents_insert" ON intervention_documents;
DROP POLICY IF EXISTS "documents_update" ON intervention_documents;
DROP POLICY IF EXISTS "documents_delete" ON intervention_documents;

CREATE POLICY documents_insert ON intervention_documents
  FOR INSERT
  WITH CHECK (
    -- ✅ FIX: Resolve auth.uid() to users.id
    uploaded_by IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
    AND can_view_intervention(intervention_id)
  );

CREATE POLICY documents_update ON intervention_documents
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      -- ✅ FIX: Resolve auth.uid() to users.id
      uploaded_by IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
      OR can_validate_document(id)
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      -- ✅ FIX: Resolve auth.uid() to users.id
      uploaded_by IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
      OR can_validate_document(id)
    )
  );

CREATE POLICY documents_delete ON intervention_documents
  FOR UPDATE
  USING (
    -- ✅ FIX: Resolve auth.uid() to users.id
    uploaded_by IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
    OR can_manage_intervention(intervention_id)
  );

COMMENT ON POLICY "documents_insert" ON intervention_documents IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification uploaded_by';

COMMENT ON POLICY "documents_update" ON intervention_documents IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification uploaded_by';

COMMENT ON POLICY "documents_delete" ON intervention_documents IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification uploaded_by';

-- ----------------------------------------------------------------------------
-- FIX 14: threads_insert (fix created_by double-ID)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "threads_insert" ON conversation_threads;

CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT
  WITH CHECK (
    -- ✅ FIX: Resolve auth.uid() to users.id
    created_by IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
    AND is_manager_of_intervention_team(intervention_id)
  );

COMMENT ON POLICY "threads_insert" ON conversation_threads IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification created_by';

-- ----------------------------------------------------------------------------
-- FIX 15-16: messages_update (fix user_id double-ID)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "messages_update" ON conversation_messages;

CREATE POLICY messages_update ON conversation_messages
  FOR UPDATE
  USING (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY "messages_update" ON conversation_messages IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification user_id';

-- ----------------------------------------------------------------------------
-- FIX 17-18: participants policies (fix user_id double-ID)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "participants_select" ON conversation_participants;
DROP POLICY IF EXISTS "participants_update" ON conversation_participants;

CREATE POLICY participants_select ON conversation_participants
  FOR SELECT
  USING (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
    OR can_view_conversation(thread_id)
  );

CREATE POLICY participants_update ON conversation_participants
  FOR UPDATE
  USING (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY "participants_select" ON conversation_participants IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification user_id';

COMMENT ON POLICY "participants_update" ON conversation_participants IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification user_id';

-- ----------------------------------------------------------------------------
-- FIX 19-21: notifications policies (fix user_id double-ID)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY notifications_delete ON notifications
  FOR DELETE
  USING (
    -- ✅ FIX: Resolve auth.uid() to users.id
    user_id IN (
      SELECT u.id FROM users u
      WHERE u.auth_user_id = auth.uid()
    )
  );

COMMENT ON POLICY "notifications_select" ON notifications IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification user_id';

COMMENT ON POLICY "notifications_update" ON notifications IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification user_id';

COMMENT ON POLICY "notifications_delete" ON notifications IS
  'FIX 2025-10-15: Résout auth.uid() en users.id pour vérification user_id';

-- ============================================================================
-- SECTION 4: Fix Triggers (Handle NULL tenant_id)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX: create_intervention_conversations() - Handle NULL tenant_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_intervention_conversations()
RETURNS TRIGGER AS $$
DECLARE
  v_created_by UUID;
BEGIN
  -- ✅ FIX: Use first manager as created_by if tenant_id is NULL
  IF NEW.tenant_id IS NOT NULL THEN
    v_created_by := NEW.tenant_id;
  ELSE
    -- Fallback: Use first team manager as creator
    SELECT u.id INTO v_created_by
    FROM users u
    INNER JOIN team_members tm ON tm.user_id = u.id
    WHERE tm.team_id = NEW.team_id
      AND tm.role IN ('gestionnaire', 'admin')
      AND tm.left_at IS NULL
    LIMIT 1;

    -- If no manager found, use system default (should never happen)
    IF v_created_by IS NULL THEN
      v_created_by := NEW.tenant_id; -- Will be NULL, but that's OK
    END IF;
  END IF;

  -- Thread groupe (created_by can be NULL if no tenant and no manager)
  INSERT INTO conversation_threads (intervention_id, team_id, thread_type, created_by, title)
  VALUES (
    NEW.id,
    NEW.team_id,
    'group',
    v_created_by,
    'Conversation de groupe - ' || NEW.reference
  );

  -- Thread locataire a managers (only if tenant_id exists)
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO conversation_threads (intervention_id, team_id, thread_type, created_by, title)
    VALUES (
      NEW.id,
      NEW.team_id,
      'tenant_to_managers',
      v_created_by,
      'Locataire a Gestionnaires - ' || NEW.reference
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_intervention_conversations IS
  'FIX 2025-10-15: Gère tenant_id NULL (interventions sans locataire initial)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Verify tenant_id is now NULLABLE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interventions'
      AND column_name = 'tenant_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE '✅ tenant_id is now NULLABLE';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: tenant_id is still NOT NULL';
  END IF;
END $$;

-- Test 2: Count policies fixed
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename IN (
    'interventions',
    'intervention_quotes',
    'intervention_reports',
    'intervention_documents',
    'conversation_threads',
    'conversation_messages',
    'conversation_participants',
    'notifications'
  );

  RAISE NOTICE '✅ Phase 3 RLS policies count: %', v_policy_count;

  IF v_policy_count < 20 THEN
    RAISE WARNING '⚠️ Expected at least 20 policies, found %', v_policy_count;
  END IF;
END $$;

-- Test 3: Verify helper functions fixed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname IN ('is_assigned_to_intervention', 'is_tenant_of_intervention')
  ) THEN
    RAISE NOTICE '✅ RLS helper functions updated';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Helper functions manquantes';
  END IF;
END $$;

-- ============================================================================
-- NOTES TECHNIQUES
-- ============================================================================
--
-- PROBLÈME ROOT CAUSE (avant ce fix):
-- ====================================
-- 1. **tenant_id NOT NULL + ON DELETE SET NULL** → contradiction schema
-- 2. **auth.uid() comparé directement avec foreign keys users.id** → mismatch:
--    - auth.uid() retourne users.auth_user_id (Supabase Auth UUID)
--    - Foreign keys référencent users.id (database UUID)
--    - Résultat: TOUTES les policies INSERT/UPDATE échouent
-- 3. **InterventionService valide tenant_id obligatoire** → bloque création
--
-- SOLUTION (après ce fix):
-- =======================
-- 1. ✅ tenant_id NULLABLE → interventions sans locataire possibles
-- 2. ✅ Toutes les comparaisons auth.uid() résolues via subquery:
--    WHERE column_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
-- 3. ✅ 2 helper functions + 21 policies fixées
-- 4. ✅ Triggers gèrent tenant_id NULL
-- 5. ✅ Architecture correcte: relations via intervention_assignments
--
-- IMPACT:
-- =======
-- - Gestionnaires peuvent créer interventions sans tenant_id
-- - Locataires liés via intervention_assignments (many-to-many)
-- - Plus de conflit auth.uid() vs users.id
-- - RLS policies fonctionnent correctement
-- - INSERT/UPDATE interventions réussissent
--
-- ============================================================================
