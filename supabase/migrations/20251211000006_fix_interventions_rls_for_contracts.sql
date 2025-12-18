-- ============================================================================
-- MIGRATION: Fix Interventions RLS for Tenants (use contracts)
-- ============================================================================
-- The interventions_select_locataire policy was checking lot_contacts
-- which is deprecated. Now it checks contracts/contract_contacts.
-- ============================================================================

-- Drop the old policy
DROP POLICY IF EXISTS interventions_select_locataire ON interventions;

-- Create new policy using contracts
CREATE POLICY interventions_select_locataire ON interventions
  FOR SELECT
  TO authenticated
  USING (
    -- Intervention is for a lot the user is linked to via contract
    lot_id IN (
      SELECT c.lot_id
      FROM contracts c
      INNER JOIN contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND c.deleted_at IS NULL
        AND c.status IN ('actif', 'a_venir')
        AND cc.role IN ('locataire', 'colocataire')
    )
  );

COMMENT ON POLICY interventions_select_locataire ON interventions IS 
  'Locataires can view interventions for lots linked via active/upcoming contracts';
