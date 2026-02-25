-- Fix: RLS visibility for building-level interventions (lot_id IS NULL)
-- 1. Gestionnaire: INNER JOIN lots fails when lot_id IS NULL → use i.team_id directly
-- 2. Locataire: lot_contacts + contracts both join on i.lot_id → invisible when NULL
--    → restore intervention_assignments branch (lost in migration 20260211170000)

CREATE OR REPLACE FUNCTION get_accessible_intervention_ids()
RETURNS TABLE(intervention_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT u.id, u.role::text AS role, u.team_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Admin: all interventions
    IF user_record.role = 'admin' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      WHERE i.deleted_at IS NULL;
      RETURN;
    END IF;

    -- Gestionnaire: interventions in their team (use direct team_id)
    -- Previously used INNER JOIN lots → buildings → team_id which broke
    -- when lot_id was NULL (building-only interventions)
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      WHERE i.team_id = user_record.team_id
        AND i.deleted_at IS NULL;
    END IF;

    -- Prestataire: assigned interventions
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT ia.intervention_id
      FROM public.intervention_assignments ia
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire';
    END IF;

    -- Locataire: interventions via lot_contacts + contracts + direct assignment
    IF user_record.role = 'locataire' THEN
      -- Via lot_contacts (legacy)
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.lot_contacts lc ON lc.lot_id = i.lot_id
      WHERE lc.user_id = user_record.id
        AND i.deleted_at IS NULL;
      -- Via contracts (current)
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.contracts c ON c.lot_id = i.lot_id
      INNER JOIN public.contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id = user_record.id
        AND cc.role IN ('locataire', 'colocataire')
        AND c.status IN ('actif', 'a_venir')
        AND c.deleted_at IS NULL
        AND i.deleted_at IS NULL;
      -- Via direct assignment (building-wide interventions where lot_id IS NULL)
      RETURN QUERY
      SELECT DISTINCT ia.intervention_id
      FROM public.intervention_assignments ia
      INNER JOIN public.interventions i ON i.id = ia.intervention_id
      WHERE ia.user_id = user_record.id
        AND ia.role = 'locataire'
        AND i.deleted_at IS NULL;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_intervention_ids IS
  'Returns intervention IDs accessible by current user based on ALL their profiles/roles.
   SECURITY DEFINER bypasses RLS. Gestionnaire uses direct team_id match.
   Locataire access via lot_contacts + contracts + intervention_assignments (building-wide).';
