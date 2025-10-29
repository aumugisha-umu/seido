-- Migration Part 2: Use Proprietaire Role
-- Date: 2025-10-29
-- Purpose:
--   1. Update constraints to support proprietaire role
--   2. Update RLS functions for proprietaire intervention access
--   3. Add RLS policies for proprietaire read-only property access

-- ============================================================================
-- STEP 1: Update intervention_assignments constraint
-- ============================================================================

-- Allow 'proprietaire' in intervention assignments (can be assigned like prestataires)
ALTER TABLE intervention_assignments DROP CONSTRAINT IF EXISTS valid_assignment_role;

ALTER TABLE intervention_assignments
  ADD CONSTRAINT valid_assignment_role
  CHECK (role IN ('gestionnaire', 'prestataire', 'locataire', 'proprietaire'));

COMMENT ON CONSTRAINT valid_assignment_role ON intervention_assignments IS
'Allowed roles for intervention assignments:
- gestionnaire: Manager assigned to intervention
- prestataire: Service provider assigned to intervention
- locataire: Tenant involved in intervention
- proprietaire: Property owner assigned to intervention';

-- ============================================================================
-- STEP 2: Update RLS function for prestataire/proprietaire intervention access
-- ============================================================================

-- Proprietaires can be assigned to interventions like prestataires
CREATE OR REPLACE FUNCTION public.is_prestataire_of_intervention(intervention_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    WHERE ia.intervention_id = intervention_id_param
      AND ia.user_id = v_user_id
      AND ia.role IN ('prestataire', 'proprietaire')  -- Proprietaires included
  );
END;
$$;

COMMENT ON FUNCTION public.is_prestataire_of_intervention(UUID) IS
'Check if current user is assigned as prestataire OR proprietaire to an intervention';

-- ============================================================================
-- STEP 3: Add RLS policies for proprietaire property access (READ-ONLY)
-- ============================================================================

-- Proprietaires can SELECT buildings they own
CREATE POLICY "proprietaire_buildings_select" ON buildings FOR SELECT
TO authenticated
USING (
  -- Proprietaire owns this building (linked via building_contacts)
  id IN (
    SELECT bc.building_id
    FROM building_contacts bc
    INNER JOIN users u ON u.id = bc.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'proprietaire'
  )
);

COMMENT ON POLICY "proprietaire_buildings_select" ON buildings IS
'Proprietaires can view buildings they own (via building_contacts)';

-- Proprietaires can SELECT lots they own
CREATE POLICY "proprietaire_lots_select" ON lots FOR SELECT
TO authenticated
USING (
  -- Proprietaire owns this lot directly (linked via lot_contacts)
  id IN (
    SELECT lc.lot_id
    FROM lot_contacts lc
    INNER JOIN users u ON u.id = lc.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'proprietaire'
  )
  OR
  -- Proprietaire owns the building containing this lot
  building_id IN (
    SELECT bc.building_id
    FROM building_contacts bc
    INNER JOIN users u ON u.id = bc.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'proprietaire'
  )
);

COMMENT ON POLICY "proprietaire_lots_select" ON lots IS
'Proprietaires can view lots they own directly OR lots in buildings they own';

-- ============================================================================
-- STEP 4: Verification Query (for testing after migration)
-- ============================================================================

-- To verify enum changes:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role') ORDER BY enumsortorder;
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'provider_category') ORDER BY enumsortorder;

-- To verify constraint:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'valid_assignment_role';
