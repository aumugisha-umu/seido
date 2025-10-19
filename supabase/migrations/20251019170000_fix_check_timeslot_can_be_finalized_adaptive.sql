-- =====================================================================================
-- Migration: Fix check_timeslot_can_be_finalized() - Adaptive Validation Logic
-- Issue: Function always requires both tenant AND provider acceptance, even when
--        no tenants are assigned to the intervention
-- Solution: Make validation adaptive based on actually assigned roles
-- Date: 2025-10-19
-- =====================================================================================

-- =====================================================================================
-- PROBLEM EXPLANATION
-- =====================================================================================
--
-- Current function always returns TRUE only if:
--   has_tenant_acceptance AND has_provider_acceptance
--
-- This fails when:
-- - Intervention has NO tenants assigned (urgent repairs, maintenance, etc.)
-- - Gestionnaire + Prestataire have accepted
-- - But function expects tenant acceptance that will never come
--
-- New approach:
-- - Check which roles are ACTUALLY assigned to the intervention
-- - Only require acceptance from assigned roles
-- - If no tenants assigned → tenant acceptance not required
-- - If no providers assigned → provider acceptance not required
--
-- =====================================================================================

-- =====================================================================================
-- 1. DROP OLD FUNCTION
-- =====================================================================================

DROP FUNCTION IF EXISTS check_timeslot_can_be_finalized(UUID);

-- =====================================================================================
-- 2. CREATE NEW ADAPTIVE FUNCTION
-- =====================================================================================

CREATE OR REPLACE FUNCTION check_timeslot_can_be_finalized(slot_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  intervention_id_value UUID;
  has_assigned_tenants BOOLEAN;
  has_assigned_providers BOOLEAN;
  has_tenant_acceptance BOOLEAN;
  has_provider_acceptance BOOLEAN;
BEGIN
  -- Get intervention_id from the slot
  SELECT intervention_id INTO intervention_id_value
  FROM intervention_time_slots
  WHERE id = slot_id_param;

  IF intervention_id_value IS NULL THEN
    RAISE NOTICE 'Slot % not found', slot_id_param;
    RETURN FALSE;
  END IF;

  -- =====================================================================================
  -- STEP 1: Check which roles are ACTUALLY assigned to the intervention
  -- =====================================================================================

  -- Check if there are ANY tenants assigned to the intervention
  SELECT EXISTS(
    SELECT 1 FROM intervention_assignments
    WHERE intervention_id = intervention_id_value
      AND role = 'locataire'
  ) INTO has_assigned_tenants;

  -- Check if there are ANY providers assigned to the intervention
  SELECT EXISTS(
    SELECT 1 FROM intervention_assignments
    WHERE intervention_id = intervention_id_value
      AND role = 'prestataire'
  ) INTO has_assigned_providers;

  RAISE NOTICE 'Assigned roles check: tenants=%, providers=%', has_assigned_tenants, has_assigned_providers;

  -- =====================================================================================
  -- STEP 2: Validate tenant acceptance (ONLY if tenants are assigned)
  -- =====================================================================================

  IF has_assigned_tenants THEN
    -- Tenants are assigned → at least 1 must have accepted
    SELECT EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = slot_id_param
        AND user_role = 'locataire'
        AND response = 'accepted'
    ) INTO has_tenant_acceptance;

    IF NOT has_tenant_acceptance THEN
      RAISE NOTICE 'Validation failed: tenants assigned but none have accepted';
      RETURN FALSE;
    END IF;
  ELSE
    -- No tenants assigned → condition automatically satisfied
    has_tenant_acceptance := TRUE;
    RAISE NOTICE 'No tenants assigned, tenant acceptance not required';
  END IF;

  -- =====================================================================================
  -- STEP 3: Validate provider acceptance (ONLY if providers are assigned)
  -- =====================================================================================

  IF has_assigned_providers THEN
    -- Providers are assigned → at least 1 must have accepted
    SELECT EXISTS(
      SELECT 1 FROM time_slot_responses
      WHERE time_slot_id = slot_id_param
        AND user_role = 'prestataire'
        AND response = 'accepted'
    ) INTO has_provider_acceptance;

    IF NOT has_provider_acceptance THEN
      RAISE NOTICE 'Validation failed: providers assigned but none have accepted';
      RETURN FALSE;
    END IF;
  ELSE
    -- No providers assigned → condition automatically satisfied
    has_provider_acceptance := TRUE;
    RAISE NOTICE 'No providers assigned, provider acceptance not required';
  END IF;

  -- =====================================================================================
  -- STEP 4: Return TRUE if all applicable conditions are met
  -- =====================================================================================

  RAISE NOTICE 'Validation successful: tenant_check=%, provider_check=%', has_tenant_acceptance, has_provider_acceptance;
  RETURN has_tenant_acceptance AND has_provider_acceptance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_timeslot_can_be_finalized(UUID) IS
  'Adaptive validation: checks acceptance requirements based on actually assigned roles. If no tenants assigned, tenant acceptance not required. If no providers assigned, provider acceptance not required.';

-- =====================================================================================
-- 3. VALIDATION
-- =====================================================================================

-- Verify function exists with correct signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_timeslot_can_be_finalized'
    AND pronargs = 1
  ) THEN
    RAISE EXCEPTION 'Migration failed: check_timeslot_can_be_finalized() function not found';
  END IF;

  RAISE NOTICE '✅ Function check_timeslot_can_be_finalized() recreated with adaptive logic';
END $$;

-- =====================================================================================
-- 4. TEST SCENARIOS (for local testing)
-- =====================================================================================

-- Uncomment to test locally
/*
-- Scenario 1: Intervention with NO tenants (gestionnaire + prestataire only)
-- Expected: Should return TRUE if provider accepted (even without tenant)

-- Scenario 2: Intervention with tenants AND providers
-- Expected: Should return TRUE only if at least 1 tenant + 1 provider accepted

-- Scenario 3: Intervention with only tenants (rare, but possible)
-- Expected: Should return TRUE if at least 1 tenant accepted
*/

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
-- Summary:
-- ✅ Dropped old rigid validation function
-- ✅ Created new adaptive function that checks assigned roles
-- ✅ If no tenants assigned → tenant acceptance not required
-- ✅ If no providers assigned → provider acceptance not required
-- ✅ Added detailed RAISE NOTICE for debugging
-- ✅ Validated function exists
--
-- Impact:
-- - Interventions without tenants can now be auto-confirmed
-- - Validation adapts to the actual intervention context
-- - More flexible workflow for different intervention types
--
-- Use Cases:
-- - Urgent repairs (gestionnaire + prestataire only)
-- - Maintenance work (no tenant involvement)
-- - Standard interventions (tenant + provider + manager)
--
-- Next steps:
-- 1. Apply migration: npx supabase db push
-- 2. Test with intervention without tenants
-- 3. Verify logs show: "No tenants assigned, tenant acceptance not required"
-- =====================================================================================
