-- =============================================================================
-- MIGRATION: Add RLS Policies for lot_contacts Table
-- Date: 2025-10-07
-- Issue: Tenant dashboard shows "Aucune propriété trouvée" because lot_contacts
--        table has no RLS policies, blocking all authenticated queries
-- Root Cause: Table lot_contacts was created without RLS policies, preventing
--             tenants from viewing their own lot associations
-- =============================================================================

-- Step 1: Enable RLS on lot_contacts (if not already enabled)
ALTER TABLE lot_contacts ENABLE ROW LEVEL SECURITY;

-- Step 2: Policy - Users can view their own lot contacts
-- Allows: Tenants, owners, providers to see which lots they are linked to
-- Use case: Tenant dashboard loading lot information
CREATE POLICY "Users can view their own lot contacts"
  ON lot_contacts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );

-- Step 3: Policy - Team managers can view all lot contacts for their team's lots
-- Allows: Gestionnaires to see all tenant/owner/provider assignments for lots in their buildings
-- Use case: Manager viewing tenant list, contact management
CREATE POLICY "Team managers can view team lot contacts"
  ON lot_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lots l
      JOIN buildings b ON b.id = l.building_id
      JOIN users u ON u.team_id = b.team_id
      WHERE l.id = lot_contacts.lot_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- Step 4: Policy - Team managers can insert lot contacts for their team's lots
-- Allows: Gestionnaires to assign tenants/owners to lots in their buildings
-- Use case: Adding new tenant to a lot, assigning owner to property
CREATE POLICY "Team managers can insert team lot contacts"
  ON lot_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lots l
      JOIN buildings b ON b.id = l.building_id
      JOIN users u ON u.team_id = b.team_id
      WHERE l.id = lot_contacts.lot_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- Step 5: Policy - Team managers can update lot contacts for their team's lots
-- Allows: Gestionnaires to modify contact details (dates, primary flag)
-- Use case: Changing tenant move-in/move-out dates, updating primary contact
CREATE POLICY "Team managers can update team lot contacts"
  ON lot_contacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lots l
      JOIN buildings b ON b.id = l.building_id
      JOIN users u ON u.team_id = b.team_id
      WHERE l.id = lot_contacts.lot_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- Step 6: Policy - Team managers can delete lot contacts for their team's lots
-- Allows: Gestionnaires to remove tenant/owner assignments
-- Use case: Tenant moving out, removing old associations
CREATE POLICY "Team managers can delete team lot contacts"
  ON lot_contacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lots l
      JOIN buildings b ON b.id = l.building_id
      JOIN users u ON u.team_id = b.team_id
      WHERE l.id = lot_contacts.lot_id
      AND u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
    )
  );

-- =============================================================================
-- VALIDATION: Verify Policies Created
-- =============================================================================

DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  policy_names TEXT;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'lot_contacts';

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'lot_contacts';

  -- Get policy names
  SELECT string_agg(policyname, E'\n  - ') INTO policy_names
  FROM pg_policies
  WHERE tablename = 'lot_contacts';

  -- Output validation results
  RAISE NOTICE '✅ RLS enabled on lot_contacts: %', rls_enabled;
  RAISE NOTICE '✅ Number of policies on lot_contacts: %', policy_count;
  RAISE NOTICE '📋 Policy names:%', E'\n  - ' || COALESCE(policy_names, 'NONE');

  -- Verify expected number of policies
  IF policy_count = 5 THEN
    RAISE NOTICE '✅ SUCCESS: All 5 RLS policies created successfully';
  ELSE
    RAISE WARNING '⚠️ WARNING: Expected 5 policies, found %', policy_count;
  END IF;
END $$;
