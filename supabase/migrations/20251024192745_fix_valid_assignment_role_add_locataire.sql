-- ============================================================================
-- FIX CHECK CONSTRAINT valid_assignment_role - Add 'locataire'
-- ============================================================================
-- Date: 2025-10-24 19:27
-- Description: Fix critical bug where intervention_assignments CHECK constraint
--              only allowed 'gestionnaire' and 'prestataire', but ALL business
--              logic and RLS policies expect 'locataire' to be supported.
--
-- Problem: Table constraint was never updated after removing tenant_id column
--          (migration 20251015193000) which changed architecture to use
--          intervention_assignments for ALL participants including tenants.
--
-- Impact: Blocks tenant intervention creation with error 23514
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP old constraint that blocks 'locataire'
-- ----------------------------------------------------------------------------
ALTER TABLE intervention_assignments
  DROP CONSTRAINT IF EXISTS valid_assignment_role;

-- ----------------------------------------------------------------------------
-- 2. ADD new constraint with 'locataire' included
-- ----------------------------------------------------------------------------
ALTER TABLE intervention_assignments
  ADD CONSTRAINT valid_assignment_role
  CHECK (role IN ('gestionnaire', 'prestataire', 'locataire'));

-- ----------------------------------------------------------------------------
-- 3. Update column comment to reflect correct allowed values
-- ----------------------------------------------------------------------------
COMMENT ON COLUMN intervention_assignments.role IS
  'Role in intervention: gestionnaire (manager), prestataire (provider), or locataire (tenant)';

-- ----------------------------------------------------------------------------
-- 4. Verification
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  -- Get constraint definition
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'valid_assignment_role'
    AND conrelid = 'intervention_assignments'::regclass;

  -- Check if 'locataire' is included
  IF constraint_def LIKE '%locataire%' THEN
    RAISE NOTICE 'Constraint valid_assignment_role updated successfully - locataire is now allowed';
  ELSE
    RAISE EXCEPTION 'ERROR: Constraint does not include locataire!';
  END IF;
END $$;

-- Display current constraint
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'valid_assignment_role'
  AND conrelid = 'intervention_assignments'::regclass;

-- ============================================================================
-- TECHNICAL NOTES
-- ============================================================================
--
-- BEFORE (BROKEN):
-- CONSTRAINT valid_assignment_role CHECK (role IN ('gestionnaire', 'prestataire'))
--
-- AFTER (CORRECT):
-- CONSTRAINT valid_assignment_role CHECK (role IN ('gestionnaire', 'prestataire', 'locataire'))
--
-- WHY THIS WAS MISSED:
-- - Phase 3 (20251014134531) created intervention_assignments for managers/providers only
-- - Migration 20251015193000 removed tenant_id and updated RLS to use intervention_assignments
-- - RLS functions like is_tenant_of_intervention() check role='locataire'
-- - 10+ migrations reference locataire in intervention_assignments
-- - BUT: Nobody updated the table CHECK constraint!
--
-- EVIDENCE OF INTENT TO SUPPORT LOCATAIRE:
-- - 20251015193000: "Tous les participants (locataires, gestionnaires, prestataires) lies via intervention_assignments"
-- - 20251016112000: "Check if user is assigned as 'locataire' via intervention_assignments"
-- - 20251017160000: "Verifie via intervention_assignments avec role='locataire'"
-- - Multiple RLS policies query: WHERE role = 'locataire'
--
-- CONSEQUENCES OF BUG:
-- - Tenants could not create interventions (INSERT blocked by CHECK)
-- - RLS policies were correct but never triggered (INSERT failed before RLS)
-- - Service Role workaround was needed (bypasses CHECK constraint)
--
-- ============================================================================
