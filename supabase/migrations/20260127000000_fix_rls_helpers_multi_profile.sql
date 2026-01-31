-- ============================================================================
-- Fix Multi-Profile RLS Helper Functions
-- ============================================================================
-- Problem: SELECT INTO only stores ONE row, ignoring other profiles for
--          users who belong to multiple teams (e.g., prestataire in team A
--          AND gestionnaire in team B)
--
-- Solution: Loop through ALL profiles and UNION the results using RETURN QUERY
--
-- Affected functions:
--   - get_accessible_intervention_ids()
--   - get_accessible_building_ids()
--   - get_accessible_lot_ids()
--
-- Impact: Prestataires multi-équipe verront leurs interventions de TOUTES
--         leurs équipes, pas seulement la première trouvée
-- ============================================================================

-- ============================================================================
-- Step 1: Fix get_accessible_intervention_ids()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_intervention_ids()
RETURNS TABLE(intervention_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  is_admin BOOLEAN := FALSE;
BEGIN
  -- ✅ MULTI-PROFIL: Boucler sur TOUS les profils de cet auth_user
  -- Chaque profil peut avoir un rôle et une équipe différents
  FOR user_record IN
    SELECT u.id, u.role::text AS role, u.team_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Admin: voit TOUTES les interventions (si au moins un profil admin)
    IF user_record.role = 'admin' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      WHERE i.deleted_at IS NULL;
      -- Admin voit tout, on peut arrêter ici
      RETURN;
    END IF;

    -- Gestionnaire: interventions de son équipe (via building.team_id)
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.lots l ON i.lot_id = l.id
      INNER JOIN public.buildings b ON l.building_id = b.id
      WHERE b.team_id = user_record.team_id
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
    END IF;

    -- Prestataire: interventions assignées à CE profil spécifique (user_record.id)
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT ia.intervention_id
      FROM public.intervention_assignments ia
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire';
    END IF;

    -- Locataire: interventions de ses lots
    IF user_record.role = 'locataire' THEN
      RETURN QUERY
      SELECT DISTINCT i.id
      FROM public.interventions i
      INNER JOIN public.lot_contacts lc ON lc.lot_id = i.lot_id
      WHERE lc.user_id = user_record.id
        AND i.deleted_at IS NULL;
    END IF;
  END LOOP;

  -- Les résultats ont déjà été renvoyés par RETURN QUERY
  -- RETURN QUERY accumule les résultats, RETURN final termine la fonction
  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_intervention_ids IS
  'Returns intervention IDs accessible by current user based on ALL their profiles/roles - SECURITY DEFINER bypasses RLS. Fixed Jan 2026: loops through all profiles instead of SELECT INTO.';

-- ============================================================================
-- Step 2: Fix get_accessible_building_ids()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_building_ids()
RETURNS TABLE(building_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- ✅ MULTI-PROFIL: Boucler sur TOUS les profils de cet auth_user
  FOR user_record IN
    SELECT u.id, u.role::text AS role, u.team_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Admin: tous les bâtiments
    IF user_record.role = 'admin' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      WHERE b.deleted_at IS NULL;
      RETURN;
    END IF;

    -- Gestionnaire: bâtiments de son équipe
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      WHERE b.team_id = user_record.team_id
        AND b.deleted_at IS NULL;
    END IF;

    -- Prestataire: bâtiments avec interventions assignées à CE profil
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      INNER JOIN public.lots l ON l.building_id = b.id
      INNER JOIN public.interventions i ON i.lot_id = l.id
      INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
    END IF;

    -- Locataire: bâtiments contenant ses lots
    IF user_record.role = 'locataire' THEN
      RETURN QUERY
      SELECT DISTINCT b.id
      FROM public.buildings b
      INNER JOIN public.lots l ON l.building_id = b.id
      INNER JOIN public.lot_contacts lc ON lc.lot_id = l.id
      WHERE lc.user_id = user_record.id
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_building_ids IS
  'Returns building IDs accessible by current user based on ALL their profiles/roles - SECURITY DEFINER bypasses RLS. Fixed Jan 2026: loops through all profiles instead of SELECT INTO.';

-- ============================================================================
-- Step 3: Fix get_accessible_lot_ids()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_accessible_lot_ids()
RETURNS TABLE(lot_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- ✅ MULTI-PROFIL: Boucler sur TOUS les profils de cet auth_user
  FOR user_record IN
    SELECT u.id, u.role::text AS role, u.team_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Admin: tous les lots
    IF user_record.role = 'admin' THEN
      RETURN QUERY
      SELECT DISTINCT l.id
      FROM public.lots l
      WHERE l.deleted_at IS NULL;
      RETURN;
    END IF;

    -- Gestionnaire: lots de son équipe (via building team_id)
    IF user_record.role = 'gestionnaire' THEN
      RETURN QUERY
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.buildings b ON l.building_id = b.id
      WHERE b.team_id = user_record.team_id
        AND l.deleted_at IS NULL
        AND b.deleted_at IS NULL;
    END IF;

    -- Prestataire: lots avec interventions assignées à CE profil
    IF user_record.role = 'prestataire' THEN
      RETURN QUERY
      SELECT DISTINCT l.id
      FROM public.lots l
      INNER JOIN public.interventions i ON i.lot_id = l.id
      INNER JOIN public.intervention_assignments ia ON ia.intervention_id = i.id
      WHERE ia.user_id = user_record.id
        AND ia.role = 'prestataire'
        AND i.deleted_at IS NULL
        AND l.deleted_at IS NULL;
    END IF;

    -- Locataire: ses lots assignés
    IF user_record.role = 'locataire' THEN
      RETURN QUERY
      SELECT DISTINCT lc.lot_id
      FROM public.lot_contacts lc
      INNER JOIN public.lots l ON l.id = lc.lot_id
      WHERE lc.user_id = user_record.id
        AND l.deleted_at IS NULL;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION get_accessible_lot_ids IS
  'Returns lot IDs accessible by current user based on ALL their profiles/roles - SECURITY DEFINER bypasses RLS. Fixed Jan 2026: loops through all profiles instead of SELECT INTO.';

-- ============================================================================
-- Summary
-- ============================================================================
-- Cette migration corrige le bug "SELECT INTO" qui ne prenait qu'UN seul profil
-- pour les utilisateurs multi-équipe.
--
-- AVANT:
--   SELECT u.id, u.role INTO current_user_id, current_user_role
--   → Seul LE PREMIER profil était considéré (ordre non déterministe)
--   → Un prestataire multi-équipe ne voyait que les interventions d'UNE équipe
--
-- APRÈS:
--   FOR user_record IN SELECT ... LOOP
--     RETURN QUERY ...  -- Accumule les résultats de chaque profil
--   END LOOP;
--   → TOUS les profils sont parcourus
--   → Le prestataire voit ses interventions de TOUTES ses équipes
--
-- Note: Les policies RLS n'ont pas besoin d'être modifiées car elles utilisent
-- déjà: id IN (SELECT get_accessible_*_ids())
-- Le fix est entièrement dans les fonctions helper.
-- ============================================================================
