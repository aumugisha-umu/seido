-- ============================================================================
-- FIX RLS POLICY intervention_assignments INSERT - Allow Tenants
-- ============================================================================
-- Date: 2025-10-24 17:22
-- Description: Fix RLS policy to allow tenants to self-assign
--              when creating an intervention on their lot
--
-- Problem: Current policy only checks i.created_at IS NOT NULL
--          which is always true and does NOT verify that the tenant
--          is actually linked to the intervention's lot
--
-- Solution: Verify that tenant is in lot_contacts for the intervention's lot
--
-- Architecture:
--   - Tenant -> lot (via lot_contacts) - Only valid link
--   - Manager -> team (via team_members) - Already OK
--   - Building interventions = common areas (no direct tenant link)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP old broken policy
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "assignments_insert" ON intervention_assignments;

-- ----------------------------------------------------------------------------
-- 2. CREATE new secure policy with lot_contacts verification
-- ----------------------------------------------------------------------------
CREATE POLICY "assignments_insert" ON intervention_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Authenticated user must match assigned_by
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.id = assigned_by
      AND (
        -- Case 1: Manager/admin of the intervention's team
        EXISTS (
          SELECT 1 FROM interventions i
          INNER JOIN team_members tm ON tm.team_id = i.team_id
          WHERE i.id = intervention_id
            AND tm.user_id = u.id
            AND tm.role IN ('gestionnaire', 'admin')
            AND tm.left_at IS NULL
        )
        OR
        -- Case 2: Tenant linked to the intervention's lot via lot_contacts
        EXISTS (
          SELECT 1 FROM interventions i
          INNER JOIN lot_contacts lc ON lc.lot_id = i.lot_id
          WHERE i.id = intervention_id
            AND i.lot_id IS NOT NULL
            AND lc.user_id = u.id
        )
      )
  )
);

COMMENT ON POLICY "assignments_insert" ON intervention_assignments IS
  'RLS Fix 2025-10-24: Managers (via team_members) OR lot tenants (via lot_contacts) can create assignments';

-- ----------------------------------------------------------------------------
-- 3. Verify policy was created
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intervention_assignments'
      AND policyname = 'assignments_insert'
  ) THEN
    RAISE NOTICE 'Policy assignments_insert recreated successfully';
  ELSE
    RAISE EXCEPTION 'ERROR: Policy assignments_insert missing after migration';
  END IF;
END $$;

-- Display policy details
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'intervention_assignments' AND policyname = 'assignments_insert';

-- ============================================================================
-- TECHNICAL NOTES
-- ============================================================================
--
-- CHANGE FROM PREVIOUS VERSION (20251016235400):
-- -----------------------------------------------
--
-- BEFORE (BROKEN):
-- EXISTS (
--   SELECT 1 FROM interventions i
--   WHERE i.id = intervention_id
--     AND i.created_at IS NOT NULL  -- Always true, not secure!
-- )
--
-- AFTER (CORRECT):
-- EXISTS (
--   SELECT 1 FROM interventions i
--   INNER JOIN lot_contacts lc ON lc.lot_id = i.lot_id
--   WHERE i.id = intervention_id
--     AND i.lot_id IS NOT NULL
--     AND lc.user_id = u.id  -- Verifies real tenant <-> lot link
-- )
--
-- TEST SCENARIOS:
-- ---------------
-- 1. Manager creates intervention + assigns tenant -> OK (team_members)
-- 2. Tenant creates intervention on their lot + self-assigns -> OK (lot_contacts)
-- 3. Tenant tries to create assignment on another's lot -> BLOCKED
-- 4. Random user tries to create assignment -> BLOCKED
--
-- ============================================================================
