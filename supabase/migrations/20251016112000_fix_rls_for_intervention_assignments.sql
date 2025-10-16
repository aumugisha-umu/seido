-- ============================================================================
-- FIX RLS POLICIES & HELPERS FOR INTERVENTION_ASSIGNMENTS
-- ============================================================================
-- Date: 2025-10-16
-- Description: Update RLS helper functions and policies to use intervention_assignments
--              instead of deprecated tenant_id column
-- Reason: tenant_id was removed from interventions table, but RLS still references it
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Update is_tenant_of_intervention() to use intervention_assignments
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_tenant_of_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user is assigned as 'locataire' via intervention_assignments
  RETURN EXISTS (
    SELECT 1
    FROM intervention_assignments
    WHERE intervention_id = p_intervention_id
      AND user_id = auth.uid()
      AND role = 'locataire'
  );
END;
$$;

COMMENT ON FUNCTION is_tenant_of_intervention IS 'UPDATED: Verifie si auth.uid() est assigne comme locataire via intervention_assignments (tenant_id removed)';

-- ----------------------------------------------------------------------------
-- 2. Update interventions INSERT policy to work with intervention_assignments
-- ----------------------------------------------------------------------------

-- Drop old policy
DROP POLICY IF EXISTS interventions_insert ON interventions;

-- Create new policy WITHOUT tenant_id check
-- Note: tenant_id assignment will be done AFTER intervention creation via intervention_assignments
CREATE POLICY interventions_insert ON interventions
  FOR INSERT
  WITH CHECK (
    -- Allow managers to create interventions for their team
    (
      is_team_manager(team_id)
    )
    OR
    -- Allow tenants to create interventions for lots they occupy
    (
      (lot_id IS NOT NULL AND is_tenant_of_lot(lot_id))
      OR
      -- Building-level: locataire d'un lot du building
      (building_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM lots l
        WHERE l.building_id = interventions.building_id
          AND is_tenant_of_lot(l.id)
      ))
    )
  );

COMMENT ON POLICY interventions_insert ON interventions IS 'UPDATED: Allow managers OR tenants to create. Tenant assignments done AFTER creation via intervention_assignments';

-- ----------------------------------------------------------------------------
-- 3. Update intervention UPDATE policy to remove tenant_id reference
-- ----------------------------------------------------------------------------

-- Drop old policy
DROP POLICY IF EXISTS interventions_update ON interventions;

-- Create new policy without tenant_id
CREATE POLICY interventions_update ON interventions
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)  -- Now uses intervention_assignments
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)  -- Now uses intervention_assignments
    )
  );

COMMENT ON POLICY interventions_update ON interventions IS 'UPDATED: Managers OR assigned tenants (via intervention_assignments) can update';

-- ----------------------------------------------------------------------------
-- 4. Update trigger for auto-creating conversation threads
-- ----------------------------------------------------------------------------

-- Drop old trigger and function
DROP TRIGGER IF EXISTS interventions_create_conversations ON interventions;
DROP FUNCTION IF EXISTS create_intervention_conversations();

-- Create updated function that handles missing tenant_id
CREATE OR REPLACE FUNCTION create_intervention_conversations()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Determine creator: use team's first manager as fallback if no tenant assigned yet
  SELECT COALESCE(
    (SELECT user_id FROM intervention_assignments
     WHERE intervention_id = NEW.id AND role = 'locataire'
     LIMIT 1),
    (SELECT user_id FROM team_members
     WHERE team_id = NEW.team_id AND role = 'gestionnaire'
     LIMIT 1)
  ) INTO v_creator_id;

  -- Skip if no valid creator found
  IF v_creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Thread groupe
  INSERT INTO conversation_threads (intervention_id, team_id, thread_type, created_by, title)
  VALUES (
    NEW.id,
    NEW.team_id,
    'group',
    v_creator_id,
    'Conversation de groupe - ' || NEW.reference
  ) ON CONFLICT DO NOTHING;

  -- Thread locataire a managers
  INSERT INTO conversation_threads (intervention_id, team_id, thread_type, created_by, title)
  VALUES (
    NEW.id,
    NEW.team_id,
    'tenant_to_managers',
    v_creator_id,
    'Locataire a Gestionnaires - ' || NEW.reference
  ) ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_intervention_conversations IS 'UPDATED: Create conversation threads with tenant from intervention_assignments or fallback to manager';

-- Recreate trigger
CREATE TRIGGER interventions_create_conversations
  AFTER INSERT ON interventions
  FOR EACH ROW
  EXECUTE FUNCTION create_intervention_conversations();

-- ============================================================================
-- END OF FIX
-- ============================================================================
