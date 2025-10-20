-- ============================================================================
-- Migration: Fix is_prestataire_of_intervention - Remove deleted_at Reference
-- ============================================================================
-- Date: 2025-10-20
-- Description:
--   - Corrects is_prestataire_of_intervention() function
--   - Removes reference to ia.deleted_at which doesn't exist
--   - intervention_assignments uses ON DELETE CASCADE, no soft deletes
-- ============================================================================

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
  -- No deleted_at check needed - table uses ON DELETE CASCADE
  RETURN EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    WHERE ia.intervention_id = intervention_id_param
      AND ia.user_id = v_user_id
      AND ia.role = 'prestataire'
  );
END;
$$;

COMMENT ON FUNCTION public.is_prestataire_of_intervention IS
'✅ CORRIGÉ: Vérifie si l''utilisateur courant est un prestataire assigné à l''intervention. Retrait de la référence à deleted_at qui n''existe pas.';
