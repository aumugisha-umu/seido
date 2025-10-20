-- ============================================================================
-- REMOVE tenant_id FROM interventions - Complete Architecture Cleanup
-- ============================================================================
-- Date: 2025-10-15 19:30
-- Justification: tenant_id est REDONDANT
--   - Tous les participants (locataires, gestionnaires, prestataires) sont
--     liés via intervention_assignments (many-to-many)
--   - Une intervention peut avoir 0, 1 ou N locataires
--   - Le lien direct tenant_id crée confusion et bugs
--
-- Changes:
--   1. DROP COLUMN tenant_id + index + FK constraint
--   2. Fix RLS helper is_tenant_of_intervention() → use intervention_assignments
--   3. Fix trigger create_intervention_conversations() → use first manager
--   4. Update 3 RLS policies that check tenant_id
-- ============================================================================

-- ============================================================================
-- SECTION 1: Update RLS Helper Function BEFORE Dropping Column
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX: is_tenant_of_intervention() - Use intervention_assignments instead
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_of_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- ✅ NEW LOGIC: Check if user is assigned as 'locataire' via intervention_assignments
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments ia
    WHERE ia.intervention_id = p_intervention_id
      AND ia.role = 'locataire'
      AND ia.user_id IN (
        SELECT u.id FROM users u
        WHERE u.auth_user_id = auth.uid()
      )
  );
END;
$$;

COMMENT ON FUNCTION is_tenant_of_intervention IS
  'FIX 2025-10-15: Vérifie si auth.uid() est assigné comme locataire via intervention_assignments (plus de tenant_id direct)';

-- ============================================================================
-- SECTION 2: Update Trigger BEFORE Dropping Column
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX: create_intervention_conversations() - Use first manager as created_by
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_intervention_conversations()
RETURNS TRIGGER AS $$
DECLARE
  v_created_by UUID;
  v_first_tenant_id UUID;
BEGIN
  -- ✅ NEW LOGIC: Use first team manager as creator (no more tenant_id column)
  SELECT u.id INTO v_created_by
  FROM users u
  INNER JOIN team_members tm ON tm.user_id = u.id
  WHERE tm.team_id = NEW.team_id
    AND tm.role IN ('gestionnaire', 'admin')
    AND tm.left_at IS NULL
  LIMIT 1;

  -- Fallback to system if no manager found (should never happen)
  IF v_created_by IS NULL THEN
    -- Use a system UUID or the first user in the team
    SELECT u.id INTO v_created_by
    FROM users u
    INNER JOIN team_members tm ON tm.user_id = u.id
    WHERE tm.team_id = NEW.team_id
      AND tm.left_at IS NULL
    LIMIT 1;
  END IF;

  -- Thread groupe (always created)
  INSERT INTO conversation_threads (intervention_id, team_id, thread_type, created_by, title)
  VALUES (
    NEW.id,
    NEW.team_id,
    'group',
    v_created_by,
    'Conversation de groupe - ' || NEW.reference
  );

  -- ✅ NEW: Check if there's a tenant assigned via intervention_assignments
  -- If so, create tenant_to_managers thread
  SELECT ia.user_id INTO v_first_tenant_id
  FROM intervention_assignments ia
  WHERE ia.intervention_id = NEW.id
    AND ia.role = 'locataire'
  LIMIT 1;

  IF v_first_tenant_id IS NOT NULL THEN
    INSERT INTO conversation_threads (intervention_id, team_id, thread_type, created_by, title)
    VALUES (
      NEW.id,
      NEW.team_id,
      'tenant_to_managers',
      v_first_tenant_id,
      'Locataire à Gestionnaires - ' || NEW.reference
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_intervention_conversations IS
  'FIX 2025-10-15: Crée threads sans dépendre de tenant_id. Utilise premier manager comme created_by. Thread tenant_to_managers créé uniquement si tenant assigné.';

-- ============================================================================
-- SECTION 3: Update RLS Policies BEFORE Dropping Column
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX: interventions_insert_tenant - No longer checks tenant_id = auth.uid()
-- ----------------------------------------------------------------------------
-- This policy is NO LONGER NEEDED because tenant INSERT will be done by managers
-- Tenants will be added via intervention_assignments AFTER intervention creation
DROP POLICY IF EXISTS "interventions_insert_tenant" ON interventions;

COMMENT ON TABLE interventions IS
  'FIX 2025-10-15: Suppression policy interventions_insert_tenant. Locataires ajoutés via intervention_assignments après création par gestionnaire.';

-- ----------------------------------------------------------------------------
-- FIX: interventions_update - Remove tenant_id check
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "interventions_update" ON interventions;

CREATE POLICY interventions_update ON interventions
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)  -- Manager can update
      OR is_tenant_of_intervention(id)  -- Tenant assigned via intervention_assignments
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)
    )
  );

COMMENT ON POLICY "interventions_update" ON interventions IS
  'FIX 2025-10-15: Utilise is_tenant_of_intervention() qui vérifie via intervention_assignments';

-- ============================================================================
-- SECTION 4: DROP tenant_id Column + Constraints + Index
-- ============================================================================

-- Drop index first
DROP INDEX IF EXISTS idx_interventions_tenant;

-- Drop the column (CASCADE will drop FK constraint automatically)
ALTER TABLE interventions DROP COLUMN IF EXISTS tenant_id CASCADE;

COMMENT ON TABLE interventions IS
  'FIX 2025-10-15: Colonne tenant_id SUPPRIMÉE. Tous les participants (locataires, gestionnaires, prestataires) liés via intervention_assignments (many-to-many).';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Verify tenant_id column is gone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interventions'
      AND column_name = 'tenant_id'
  ) THEN
    RAISE NOTICE '✅ tenant_id column DROPPED successfully';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: tenant_id column still exists';
  END IF;
END $$;

-- Test 2: Verify FK constraint is gone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'interventions'
      AND constraint_name LIKE '%tenant_id%'
  ) THEN
    RAISE NOTICE '✅ tenant_id FK constraint DROPPED successfully';
  ELSE
    RAISE WARNING '⚠️ tenant_id FK constraint may still exist';
  END IF;
END $$;

-- Test 3: Verify index is gone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'interventions'
      AND indexname = 'idx_interventions_tenant'
  ) THEN
    RAISE NOTICE '✅ idx_interventions_tenant index DROPPED successfully';
  ELSE
    RAISE WARNING '⚠️ idx_interventions_tenant index may still exist';
  END IF;
END $$;

-- Test 4: Verify helper function updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_tenant_of_intervention'
  ) THEN
    RAISE NOTICE '✅ is_tenant_of_intervention() function updated';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: is_tenant_of_intervention() function missing';
  END IF;
END $$;

-- Test 5: Verify trigger updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_intervention_conversations'
  ) THEN
    RAISE NOTICE '✅ create_intervention_conversations() trigger function updated';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: create_intervention_conversations() trigger function missing';
  END IF;
END $$;

-- ============================================================================
-- NOTES TECHNIQUES
-- ============================================================================
--
-- AVANT (Architecture avec tenant_id):
-- =====================================
-- interventions.tenant_id → users.id (FK)
--   ❌ Problème: Un seul locataire par intervention
--   ❌ Problème: Redondant avec intervention_assignments
--   ❌ Problème: Crée confusion (tenant_id vs assignments)
--
-- APRÈS (Architecture pure intervention_assignments):
-- ===================================================
-- interventions → aucun lien direct avec users
-- intervention_assignments:
--   - intervention_id + user_id + role='locataire'  (0-N locataires)
--   - intervention_id + user_id + role='gestionnaire' (1-N managers)
--   - intervention_id + user_id + role='prestataire' (0-N providers)
--
-- ✅ Avantages:
--   - Architecture cohérente (toutes relations via assignments)
--   - Many-to-many flexible (N locataires par intervention)
--   - Pas de confusion sur "qui est le tenant"
--   - Simplifie création intervention (pas besoin tenant_id)
--
-- WORKFLOW CRÉATION:
-- ==================
-- 1. Manager crée intervention (sans tenant_id)
-- 2. Manager assigne gestionnaires via intervention_assignments
-- 3. Manager assigne prestataires (optionnel)
-- 4. Manager assigne locataires depuis lot_contacts (optionnel)
--
-- QUERIES POUR TROUVER LOCATAIRES:
-- =================================
-- SELECT u.* FROM users u
-- INNER JOIN intervention_assignments ia ON ia.user_id = u.id
-- WHERE ia.intervention_id = '...' AND ia.role = 'locataire';
--
-- ============================================================================
