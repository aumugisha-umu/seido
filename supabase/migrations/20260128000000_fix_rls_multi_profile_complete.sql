-- ============================================================================
-- MIGRATION: Complete Multi-Profile RLS Refactoring
-- ============================================================================
-- Date: 2026-01-28
-- Description: Comprehensive fix for multi-profile (multi-team) users
--
-- ARCHITECTURE: Single Source of Truth
-- ------------------------------------
-- Instead of patching each function/policy individually, we create ONE central
-- helper function that returns ALL profile IDs for the current auth user.
--
-- BEFORE (breaks with multi-profile):
--   user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
--
-- AFTER (always works):
--   user_id IN (SELECT get_my_profile_ids())
--
-- CHANGES:
--   1. New helper function: get_my_profile_ids()
--   2. Fixed functions with SELECT INTO: can_manager_update_user(), can_create_email_conversation()
--   3. Recreated policies with = (SELECT ...) pattern
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Central Helper Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_profile_ids()
RETURNS TABLE(profile_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL;
$$;

COMMENT ON FUNCTION get_my_profile_ids IS
  'Returns ALL users.id for current auth user (multi-profile support).
   Use: user_id IN (SELECT get_my_profile_ids())
   This is the SINGLE SOURCE OF TRUTH for multi-team users.';

-- ============================================================================
-- STEP 2: Fix can_manager_update_user() - FOR LOOP Pattern
-- ============================================================================
-- Problem: SELECT INTO only stores ONE row
-- Solution: Loop through all profiles, check if ANY has permission

CREATE OR REPLACE FUNCTION can_manager_update_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through ALL profiles of the current auth user
  FOR user_record IN
    SELECT u.id, u.role::text AS role
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Skip non-manager profiles
    IF user_record.role NOT IN ('gestionnaire', 'admin') THEN
      CONTINUE;
    END IF;

    -- Check if this profile shares a team with target user
    IF EXISTS (
      SELECT 1
      FROM public.team_members tm_target
      INNER JOIN public.team_members tm_manager ON tm_manager.team_id = tm_target.team_id
      WHERE tm_target.user_id = target_user_id
        AND tm_manager.user_id = user_record.id
        AND tm_target.left_at IS NULL
        AND tm_manager.left_at IS NULL
    ) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_manager_update_user IS
  'Checks if current user (any of their gestionnaire/admin profiles) can update target user.
   Fixed Jan 2026: loops through all profiles instead of SELECT INTO.';

-- ============================================================================
-- STEP 3: Fix can_create_email_conversation() - FOR LOOP Pattern
-- ============================================================================

CREATE OR REPLACE FUNCTION can_create_email_conversation(p_email_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through ALL profiles of the current auth user
  FOR user_record IN
    SELECT u.id, u.role::text AS role
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
  LOOP
    -- Skip non-manager profiles
    IF user_record.role NOT IN ('gestionnaire', 'admin') THEN
      CONTINUE;
    END IF;

    -- Check if this profile is an active member of the target team
    IF EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.user_id = user_record.id
        AND tm.team_id = p_team_id
        AND tm.left_at IS NULL
    ) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION can_create_email_conversation IS
  'Checks if current user can create email conversation for given team.
   Fixed Jan 2026: loops through all profiles instead of SELECT INTO.';

-- ============================================================================
-- STEP 4: Fix push_subscriptions Policies
-- ============================================================================
-- Original: user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
-- Fixed: user_id IN (SELECT get_my_profile_ids())

DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT get_my_profile_ids()));

DROP POLICY IF EXISTS "Users can create own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can create own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT get_my_profile_ids()));

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT get_my_profile_ids()))
  WITH CHECK (user_id IN (SELECT get_my_profile_ids()));

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT get_my_profile_ids()));

-- ============================================================================
-- STEP 5: Fix contract_contacts Policy
-- ============================================================================

DROP POLICY IF EXISTS contract_contacts_select ON contract_contacts;
CREATE POLICY contract_contacts_select ON contract_contacts
  FOR SELECT
  TO authenticated
  USING (
    -- Users can ALWAYS read their own contract_contacts entries (multi-profile)
    user_id IN (SELECT get_my_profile_ids())
    OR
    -- Managers can see contract_contacts via the contract access check
    can_view_contract(contract_id)
  );

COMMENT ON POLICY contract_contacts_select ON contract_contacts IS
  'Users can read their own entries (multi-profile) OR those of contracts they can view (managers)';

-- ============================================================================
-- STEP 6: Fix lot_contacts Policy for Tenants
-- ============================================================================
-- Note: The existing lot_contacts_select uses can_view_lot() which is already
-- multi-profile aware via the helper functions. But we add an explicit check
-- for users viewing their own lot_contacts entries.

-- Check if a more specific tenant policy exists and update it
DROP POLICY IF EXISTS lot_contacts_select_tenant ON lot_contacts;

-- The main lot_contacts_select policy already exists and uses can_view_lot()
-- which calls is_tenant_of_lot(). We need to update is_tenant_of_lot() to be multi-profile aware.

-- ============================================================================
-- STEP 7: Fix is_tenant_of_lot() for Multi-Profile
-- ============================================================================

CREATE OR REPLACE FUNCTION is_tenant_of_lot(lot_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM contracts c
    INNER JOIN contract_contacts cc ON cc.contract_id = c.id
    WHERE c.lot_id = lot_uuid
      AND c.status IN ('actif', 'a_venir')
      AND c.deleted_at IS NULL
      AND cc.role IN ('locataire', 'colocataire')
      -- Multi-profile: check ALL profiles of current auth user
      AND cc.user_id IN (SELECT get_my_profile_ids())
  );
$$;

COMMENT ON FUNCTION is_tenant_of_lot IS
  'Checks if current user (any of their profiles) is tenant of lot via active/upcoming contract.
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 8: Fix lots_select_locataire Policy
-- ============================================================================

DROP POLICY IF EXISTS lots_select_locataire ON lots;
CREATE POLICY lots_select_locataire ON lots
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT c.lot_id
      FROM contracts c
      INNER JOIN contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id IN (SELECT get_my_profile_ids())  -- Multi-profile
        AND c.deleted_at IS NULL
        AND c.status IN ('actif', 'a_venir')
        AND cc.role IN ('locataire', 'colocataire')
    )
  );

COMMENT ON POLICY lots_select_locataire ON lots IS
  'Tenants can view lots linked via active/upcoming contracts (multi-profile support)';

-- ============================================================================
-- STEP 9: Fix buildings_select_locataire Policy
-- ============================================================================

DROP POLICY IF EXISTS buildings_select_locataire ON buildings;
CREATE POLICY buildings_select_locataire ON buildings
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT l.building_id
      FROM lots l
      INNER JOIN contracts c ON c.lot_id = l.id
      INNER JOIN contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id IN (SELECT get_my_profile_ids())  -- Multi-profile
        AND l.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND c.status IN ('actif', 'a_venir')
        AND cc.role IN ('locataire', 'colocataire')
    )
  );

COMMENT ON POLICY buildings_select_locataire ON buildings IS
  'Tenants can view buildings containing their lots (multi-profile support)';

-- ============================================================================
-- STEP 10: Fix interventions_select_locataire Policy
-- ============================================================================

DROP POLICY IF EXISTS interventions_select_locataire ON interventions;
CREATE POLICY interventions_select_locataire ON interventions
  FOR SELECT
  TO authenticated
  USING (
    lot_id IN (
      SELECT c.lot_id
      FROM contracts c
      INNER JOIN contract_contacts cc ON cc.contract_id = c.id
      WHERE cc.user_id IN (SELECT get_my_profile_ids())  -- Multi-profile
        AND c.deleted_at IS NULL
        AND c.status IN ('actif', 'a_venir')
        AND cc.role IN ('locataire', 'colocataire')
    )
  );

COMMENT ON POLICY interventions_select_locataire ON interventions IS
  'Tenants can view interventions for lots linked via active/upcoming contracts (multi-profile)';

-- ============================================================================
-- STEP 11: Fix property_documents UPDATE Policy
-- ============================================================================

DROP POLICY IF EXISTS property_documents_update ON property_documents;
CREATE POLICY property_documents_update ON property_documents
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR is_team_manager(team_id)
      OR (uploaded_by IN (SELECT get_my_profile_ids()) AND is_gestionnaire())  -- Multi-profile
    )
  )
  WITH CHECK (
    is_admin()
    OR is_team_manager(team_id)
    OR (uploaded_by IN (SELECT get_my_profile_ids()) AND is_gestionnaire())  -- Multi-profile
  );

COMMENT ON POLICY property_documents_update ON property_documents IS
  'Admin, team manager, or document uploader (gestionnaire) can update (multi-profile)';

-- ============================================================================
-- STEP 12: Fix is_admin() and is_gestionnaire() for Multi-Profile
-- ============================================================================
-- These functions should return TRUE if ANY profile has the role

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'admin'
      AND u.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION is_admin IS
  'Returns TRUE if ANY profile of current auth user is admin';

CREATE OR REPLACE FUNCTION is_gestionnaire()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.role = 'gestionnaire'
      AND u.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION is_gestionnaire IS
  'Returns TRUE if ANY profile of current auth user is gestionnaire';

-- ============================================================================
-- STEP 13: Fix get_current_user_role() for Multi-Profile
-- ============================================================================
-- This function needs to return the "most privileged" role across all profiles
-- Priority: admin > gestionnaire > prestataire > locataire

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_has_admin BOOLEAN;
  v_has_gestionnaire BOOLEAN;
  v_has_prestataire BOOLEAN;
  v_has_locataire BOOLEAN;
BEGIN
  -- Check what roles this auth user has across all profiles
  SELECT
    bool_or(u.role = 'admin'),
    bool_or(u.role = 'gestionnaire'),
    bool_or(u.role = 'prestataire'),
    bool_or(u.role = 'locataire')
  INTO v_has_admin, v_has_gestionnaire, v_has_prestataire, v_has_locataire
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL;

  -- Return most privileged role
  IF v_has_admin THEN RETURN 'admin'::user_role; END IF;
  IF v_has_gestionnaire THEN RETURN 'gestionnaire'::user_role; END IF;
  IF v_has_prestataire THEN RETURN 'prestataire'::user_role; END IF;
  IF v_has_locataire THEN RETURN 'locataire'::user_role; END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_current_user_role IS
  'Returns the MOST PRIVILEGED role across all profiles of current auth user.
   Priority: admin > gestionnaire > prestataire > locataire.
   Fixed Jan 2026 for multi-profile support.';

-- ============================================================================
-- STEP 14: Fix user_belongs_to_team_v2() for Multi-Profile
-- ============================================================================

CREATE OR REPLACE FUNCTION user_belongs_to_team_v2(check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = check_team_id
      AND tm.left_at IS NULL
      -- Multi-profile: check ALL profiles of current auth user
      AND tm.user_id IN (SELECT get_my_profile_ids())
  );
$$;

COMMENT ON FUNCTION user_belongs_to_team_v2 IS
  'Checks if ANY profile of current auth user belongs to the team (active member).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- STEP 15: Fix get_user_teams_v2() for Multi-Profile
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_teams_v2()
RETURNS TABLE(team_id UUID)
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT DISTINCT tm.team_id
  FROM public.team_members tm
  WHERE tm.left_at IS NULL
    -- Multi-profile: get teams from ALL profiles
    AND tm.user_id IN (SELECT get_my_profile_ids());
$$;

COMMENT ON FUNCTION get_user_teams_v2 IS
  'Returns ALL teams the current auth user belongs to (across all profiles).
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration provides COMPLETE multi-profile support by:
--
-- 1. Creating get_my_profile_ids() as the SINGLE SOURCE OF TRUTH
--
-- 2. Converting SELECT INTO patterns to FOR LOOP in:
--    - can_manager_update_user()
--    - can_create_email_conversation()
--
-- 3. Replacing = (SELECT id FROM users WHERE auth_user_id = auth.uid())
--    with IN (SELECT get_my_profile_ids()) in:
--    - push_subscriptions (4 policies)
--    - contract_contacts (1 policy)
--    - lots_select_locataire (1 policy)
--    - buildings_select_locataire (1 policy)
--    - interventions_select_locataire (1 policy)
--    - property_documents_update (1 policy)
--
-- 4. Updating helper functions to be multi-profile aware:
--    - is_admin()
--    - is_gestionnaire()
--    - get_current_user_role()
--    - user_belongs_to_team_v2()
--    - get_user_teams_v2()
--    - is_tenant_of_lot()
--
-- TESTING:
-- 1. Single-profile user: Behavior identical to before
-- 2. Multi-profile same team: Sees data from both profiles
-- 3. Multi-profile different teams:
--    - Gestionnaire Team A -> sees buildings/lots Team A
--    - Prestataire Team B -> sees assigned interventions Team B
-- 4. Push subscriptions: Visible from all profiles
-- 5. Contracts/Lot contacts: Tenant sees contracts from all teams
-- ============================================================================

-- ============================================================================
-- STEP 16: Fix notifications_insert_authenticated Policy
-- ============================================================================
-- Bug: was using "SELECT role FROM users WHERE id = auth.uid()" and
--      "team_members.user_id = auth.uid()" - both are wrong comparisons

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
CREATE POLICY "notifications_insert_authenticated"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be gestionnaire or admin (any profile)
  get_current_user_role() IN ('gestionnaire', 'admin')

  AND

  -- Coherence check: user_id must be a team member
  (
    team_id IS NULL  -- Global personal notification
    OR
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = notifications.team_id
        AND tm.user_id = notifications.user_id
        AND tm.left_at IS NULL
    )
  )

  AND

  -- Creator must belong to the same team (if team_id specified)
  (
    team_id IS NULL
    OR
    user_belongs_to_team_v2(notifications.team_id)
  )
);

COMMENT ON POLICY "notifications_insert_authenticated" ON notifications IS
  'Allows gestionnaires and admins to create notifications for their team.
   Fixed Jan 2026: uses get_current_user_role() and user_belongs_to_team_v2() for multi-profile support.';

-- ============================================================================
-- STEP 18: Fix get_user_id_from_auth() for Multi-Profile
-- ============================================================================
-- This function returns ONLY the first profile (LIMIT 1)
-- We keep it for backward compatibility but add a comment warning

CREATE OR REPLACE FUNCTION get_user_id_from_auth()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- WARNING: For multi-profile users, this returns only ONE profile (most recently updated)
  -- For multi-profile aware code, use get_my_profile_ids() instead
  SELECT id FROM public.users
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  ORDER BY updated_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_id_from_auth IS
  'Returns ONE users.id for auth.uid() (most recently updated profile).
   WARNING: For multi-profile users, prefer get_my_profile_ids() for complete coverage.';

-- ============================================================================
-- STEP 19: Fix is_provider_of_intervention() for Multi-Profile
-- ============================================================================
-- Bug: was comparing user_id = auth.uid() but user_id references users.id, not auth.uid()

CREATE OR REPLACE FUNCTION is_provider_of_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.intervention_assignments ia
    WHERE ia.intervention_id = p_intervention_id
      AND ia.role = 'prestataire'
      -- Multi-profile: check ALL profiles of current auth user
      AND ia.user_id IN (SELECT get_my_profile_ids())
  );
$$;

COMMENT ON FUNCTION is_provider_of_intervention IS
  'Checks if ANY profile of current auth user is assigned as provider to intervention.
   Fixed Jan 2026: was comparing user_id = auth.uid() (wrong), now uses get_my_profile_ids().';

-- ============================================================================
-- STEP 20: Fix can_view_time_slot_for_provider() for Multi-Profile
-- ============================================================================

CREATE OR REPLACE FUNCTION can_view_time_slot_for_provider(p_slot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_intervention_id UUID;
  v_provider_id UUID;
BEGIN
  -- Get slot info
  SELECT
    ts.intervention_id,
    ts.provider_id
  INTO v_intervention_id, v_provider_id
  FROM public.intervention_time_slots ts
  WHERE ts.id = p_slot_id;

  -- If no slot found, deny
  IF v_intervention_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Managers can see all
  IF is_manager_of_intervention_team(v_intervention_id) THEN
    RETURN TRUE;
  END IF;

  -- If provider_id is NULL, visible to all participants
  IF v_provider_id IS NULL THEN
    RETURN can_view_intervention(v_intervention_id);
  END IF;

  -- If provider_id is set, check if ANY of user's profiles match
  -- Note: provider_id likely references users.id, not auth.uid()
  RETURN v_provider_id IN (SELECT get_my_profile_ids());
END;
$$;

COMMENT ON FUNCTION can_view_time_slot_for_provider IS
  'Checks if current user can view time slot based on assignment mode.
   Fixed Jan 2026: uses get_my_profile_ids() for multi-profile support.';

-- ============================================================================
-- Summary
-- ============================================================================

-- ============================================================================
-- STEP 21: Fix get_current_user_id() pour Multi-Profile
-- ============================================================================
-- Problème: SELECT INTO est non-déterministe pour multi-profil
-- Solution: ORDER BY + LIMIT 1 pour toujours retourner le même profil (le plus récent)
-- Note: Cette fonction est utilisée par des triggers qui loggent "l'auteur" d'une action.
--       Pour ces cas, on veut UN profil spécifique, pas tous.

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- MULTI-PROFIL: Retourne le profil le plus récemment mis à jour
  -- Comportement déterministe = toujours le même résultat pour le même auth.uid()
  -- C'est cohérent avec le comportement côté application (cookie selection par défaut)
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND deleted_at IS NULL
  ORDER BY updated_at DESC
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION get_current_user_id IS
  'Convertit auth.uid() en users.id. Pour multi-profil, retourne le profil le plus récent (updated_at DESC).
   ATTENTION: Pour vérifier si N''IMPORTE QUEL profil a accès, utiliser get_my_profile_ids() à la place.
   Usage approprié: triggers de log (identifier l''auteur d''une action).
   Usage inapproprié: RLS policies (utiliser IN (SELECT get_my_profile_ids()) pour multi-profil).';

-- ============================================================================
-- STEP 22: Fix is_assigned_to_intervention() pour Multi-Profile
-- ============================================================================
-- Problème: La fonction originale utilise get_current_user_id() = UN seul profil
-- Cas d'usage: Un prestataire avec 2 profils (équipe A et B)
-- Comportement souhaité: Voir les interventions assignées à N'IMPORTE QUEL de ses profils

CREATE OR REPLACE FUNCTION is_assigned_to_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.intervention_assignments ia
    WHERE ia.intervention_id = p_intervention_id
      -- MULTI-PROFIL: Vérifie TOUS les profils de l'auth user
      AND ia.user_id IN (SELECT get_my_profile_ids())
  );
$$;

COMMENT ON FUNCTION is_assigned_to_intervention IS
  'Vérifie si N''IMPORTE QUEL profil de l''utilisateur courant est assigné à l''intervention.
   Fixed Jan 2026: utilise get_my_profile_ids() au lieu de get_current_user_id() pour multi-profil.
   Impact: Prestataire multi-équipe voit maintenant ses interventions de TOUTES ses équipes.';

-- ============================================================================
-- STEP 23: Fix is_tenant_of_intervention() pour Multi-Profile
-- ============================================================================
-- Problème: La fonction originale utilise get_current_user_id() = UN seul profil
-- Cas d'usage: Un locataire avec 2 profils (appartement A et B dans équipes différentes)
-- Comportement souhaité: Voir les interventions de N'IMPORTE QUEL de ses profils locataire

CREATE OR REPLACE FUNCTION is_tenant_of_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.intervention_assignments ia
    WHERE ia.intervention_id = p_intervention_id
      AND ia.role = 'locataire'
      -- MULTI-PROFIL: Vérifie TOUS les profils de l'auth user
      AND ia.user_id IN (SELECT get_my_profile_ids())
  );
$$;

COMMENT ON FUNCTION is_tenant_of_intervention IS
  'Vérifie si N''IMPORTE QUEL profil de l''utilisateur courant est assigné comme locataire à l''intervention.
   Fixed Jan 2026: utilise get_my_profile_ids() au lieu de get_current_user_id() pour multi-profil.
   Impact: Locataire multi-équipe voit maintenant ses interventions de TOUS ses logements.';

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'MIGRATION: Complete Multi-Profile RLS Refactoring COMPLETED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW FUNCTION: get_my_profile_ids()';
  RAISE NOTICE '  - Single source of truth for multi-profile support';
  RAISE NOTICE '  - Usage: user_id IN (SELECT get_my_profile_ids())';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED FUNCTIONS (FOR LOOP pattern):';
  RAISE NOTICE '  - can_manager_update_user()';
  RAISE NOTICE '  - can_create_email_conversation()';
  RAISE NOTICE '';
  RAISE NOTICE 'FIXED FUNCTIONS (get_my_profile_ids pattern) - STEP 21-23:';
  RAISE NOTICE '  - get_current_user_id() - ORDER BY + LIMIT 1 for determinism';
  RAISE NOTICE '  - is_assigned_to_intervention() - multi-profile check';
  RAISE NOTICE '  - is_tenant_of_intervention() - multi-profile check';
  RAISE NOTICE '';
  RAISE NOTICE 'RECREATED POLICIES (multi-profile aware):';
  RAISE NOTICE '  - push_subscriptions: SELECT, INSERT, UPDATE, DELETE';
  RAISE NOTICE '  - contract_contacts: SELECT';
  RAISE NOTICE '  - lots: SELECT (locataire)';
  RAISE NOTICE '  - buildings: SELECT (locataire)';
  RAISE NOTICE '  - interventions: SELECT (locataire)';
  RAISE NOTICE '  - property_documents: UPDATE';
  RAISE NOTICE '';
  RAISE NOTICE 'UPDATED HELPER FUNCTIONS:';
  RAISE NOTICE '  - is_admin(), is_gestionnaire()';
  RAISE NOTICE '  - get_current_user_role()';
  RAISE NOTICE '  - user_belongs_to_team_v2(), get_user_teams_v2()';
  RAISE NOTICE '  - is_tenant_of_lot()';
  RAISE NOTICE '  - get_user_id_from_auth()';
  RAISE NOTICE '  - is_provider_of_intervention()';
  RAISE NOTICE '  - can_view_time_slot_for_provider()';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;
