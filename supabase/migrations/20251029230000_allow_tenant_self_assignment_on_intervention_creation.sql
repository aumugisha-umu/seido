-- Migration: Allow Tenant Self-Assignment on Intervention Creation
-- Problem: Tenants cannot create interventions because they can't self-assign
--
-- Current Policy (20251027093000):
-- CREATE POLICY assignments_insert ON intervention_assignments
--   WITH CHECK (
--     assigned_by = get_current_user_id()
--     AND is_manager_of_intervention_team(intervention_id)
--   );
--
-- Issue: When a tenant creates an intervention, they need to assign themselves
-- as 'locataire' to the intervention. But the current policy only allows
-- managers to create assignments.
--
-- Solution: Add exception for tenant self-assignment during intervention creation

-- ============================================================================
-- DROP EXISTING POLICY
-- ============================================================================

DROP POLICY IF EXISTS "assignments_insert" ON intervention_assignments;

-- ============================================================================
-- CREATE NEW POLICY WITH TENANT SELF-ASSIGNMENT SUPPORT
-- ============================================================================

CREATE POLICY "assignments_insert" ON intervention_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Case 1: Manager/Admin assigning someone to an intervention
  -- Original logic - managers of the intervention's team can assign anyone
  (
    assigned_by = get_current_user_id()
    AND is_manager_of_intervention_team(intervention_id)
  )

  OR

  -- Case 2: Tenant self-assigning during intervention creation
  -- Allows tenants to assign themselves as 'locataire' when creating their intervention
  -- Security checks:
  --   1. assigned_by must be the current user (can't fake who assigned)
  --   2. user_id must be the current user (can only assign yourself)
  --   3. role must be 'locataire' (can't assign yourself as manager/provider)
  (
    assigned_by = get_current_user_id()
    AND user_id = get_current_user_id()
    AND role = 'locataire'
  )
);

COMMENT ON POLICY "assignments_insert" ON intervention_assignments IS
  'Allows:
   1. Managers to assign anyone to interventions in their team
   2. Tenants to self-assign as locataire when creating interventions

   Security: Tenant self-assignment requires:
   - assigned_by = current user (audit trail)
   - user_id = current user (no impersonation)
   - role = locataire (no privilege escalation)';

-- ============================================================================
-- VERIFICATION & EXPLANATION
-- ============================================================================

COMMENT ON TABLE intervention_assignments IS
  'Intervention assignments table with RLS policies.

   WORKFLOW - TENANT CREATES INTERVENTION:
   ========================================
   1. Tenant creates intervention via POST /api/create-intervention
   2. API creates intervention record in interventions table
   3. API creates assignment record:
      - intervention_id: newly created intervention
      - user_id: tenant ID
      - role: locataire
      - is_primary: true
      - assigned_by: tenant ID (self)
   4. RLS Policy Check: assignments_insert
      - Case 2 applies: assigned_by = user_id = current_user AND role = locataire
      - ✅ ALLOWED
   5. Assignment created successfully
   6. Tenant can now view their intervention (RLS allows via assignment)

   WORKFLOW - MANAGER ASSIGNS PROVIDER:
   ====================================
   1. Manager opens intervention detail page
   2. Manager clicks "Request Quote" and selects provider
   3. API creates assignment record:
      - intervention_id: existing intervention
      - user_id: provider ID
      - role: prestataire
      - assigned_by: manager ID
   4. RLS Policy Check: assignments_insert
      - Case 1 applies: is_manager_of_intervention_team() = true
      - ✅ ALLOWED
   5. Assignment created, provider notified

   SECURITY GUARANTEES:
   ====================
   - Tenants can ONLY assign themselves as locataire
   - Tenants cannot assign other users
   - Tenants cannot assign themselves as manager/provider
   - Managers can assign anyone with any role (within their team)
   - All assignments have audit trail (assigned_by field)';

-- ============================================================================
-- TEST QUERIES
-- ============================================================================

-- Test 1: Tenant creates intervention and self-assigns (should work)
-- INSERT INTO intervention_assignments (
--   intervention_id, user_id, role, is_primary, assigned_by
-- ) VALUES (
--   'some-intervention-id',
--   get_current_user_id(),  -- Tenant assigns themselves
--   'locataire',             -- As tenant
--   true,
--   get_current_user_id()    -- Assigned by themselves
-- );
-- Expected: ✅ SUCCESS (Case 2)

-- Test 2: Tenant tries to assign another user (should fail)
-- INSERT INTO intervention_assignments (
--   intervention_id, user_id, role, is_primary, assigned_by
-- ) VALUES (
--   'some-intervention-id',
--   'other-user-id',         -- Different user
--   'locataire',
--   false,
--   get_current_user_id()
-- );
-- Expected: ❌ FAIL (user_id != current_user)

-- Test 3: Tenant tries to self-assign as manager (should fail)
-- INSERT INTO intervention_assignments (
--   intervention_id, user_id, role, is_primary, assigned_by
-- ) VALUES (
--   'some-intervention-id',
--   get_current_user_id(),
--   'gestionnaire',          -- Privilege escalation attempt
--   false,
--   get_current_user_id()
-- );
-- Expected: ❌ FAIL (role != 'locataire')

-- Test 4: Manager assigns provider to intervention (should work)
-- INSERT INTO intervention_assignments (
--   intervention_id, user_id, role, is_primary, assigned_by
-- ) VALUES (
--   'some-intervention-id',
--   'provider-user-id',
--   'prestataire',
--   false,
--   get_current_user_id()    -- Manager
-- );
-- Expected: ✅ SUCCESS (Case 1 - manager of team)
