-- ============================================================================
-- Migration: Fix interventions_update Policy - Allow Prestataires
-- ============================================================================
-- Date: 2025-10-20
-- Description:
--   - Adds helper function to check if user is assigned prestataire
--   - Updates interventions_update policy to allow prestataires to update
--   - Prestataires can update interventions they are assigned to
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper Function: Check if user is prestataire assigned to intervention
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_prestataire_of_intervention(intervention_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user's ID from the users table
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid();

  -- Check if user is assigned as prestataire to this intervention
  RETURN EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    WHERE ia.intervention_id = intervention_id_param
      AND ia.user_id = v_user_id
      AND ia.role = 'prestataire'
      AND ia.deleted_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION public.is_prestataire_of_intervention IS
'Vérifie si l''utilisateur courant est un prestataire assigné à l''intervention via intervention_assignments';

-- ----------------------------------------------------------------------------
-- Update Policy: interventions_update - Add prestataire support
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "interventions_update" ON public.interventions;

CREATE POLICY "interventions_update" ON public.interventions
  FOR UPDATE
  USING (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)           -- Gestionnaires de l'équipe
      OR is_tenant_of_intervention(id)      -- Locataire assigné
      OR is_prestataire_of_intervention(id) -- ✅ NOUVEAU: Prestataire assigné
    )
  )
  WITH CHECK (
    deleted_at IS NULL
    AND (
      can_manage_intervention(id)
      OR is_tenant_of_intervention(id)
      OR is_prestataire_of_intervention(id) -- ✅ NOUVEAU: Prestataire assigné
    )
  );

COMMENT ON POLICY "interventions_update" ON public.interventions IS
'✅ UPDATED: Gestionnaires d''équipe + locataire assigné + prestataire assigné peuvent modifier l''intervention';
