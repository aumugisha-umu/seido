-- ============================================================================
-- MIGRATION: Fix contract_contacts RLS for tenant self-access
-- ============================================================================
-- Date: 2025-12-11
-- Description: Fixes the circular RLS dependency where tenants cannot read
--              their own contract_contacts entries because the policy uses
--              can_view_contract() which depends on is_tenant_of_lot() which
--              needs to read contract_contacts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DROP and recreate contract_contacts_select policy
-- ----------------------------------------------------------------------------
-- The issue: contract_contacts_select uses can_view_contract(contract_id)
-- But can_view_contract calls is_tenant_of_lot(lot_id)
-- And is_tenant_of_lot needs to read contract_contacts - circular!
--
-- Solution: Allow users to always read their own contract_contacts entries
-- plus the original can_view_contract check for managers.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS contract_contacts_select ON contract_contacts;

CREATE POLICY contract_contacts_select ON contract_contacts
  FOR SELECT
  TO authenticated
  USING (
    -- Users can ALWAYS read their own contract_contacts entries
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR
    -- Managers can see contract_contacts via the contract access check
    can_view_contract(contract_id)
  );

COMMENT ON POLICY contract_contacts_select ON contract_contacts IS 
  'Users can read their own entries OR those of contracts they can view (managers)';

-- ============================================================================
-- END MIGRATION
-- ============================================================================
