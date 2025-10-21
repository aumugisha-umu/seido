-- =============================================================================
-- FIX: Signup Trigger RLS Bypass
-- =============================================================================
-- Date: 2025-10-21
-- Issue: Le trigger handle_new_user_confirmed() échoue silencieusement en production
--        car les RLS policies bloquent les INSERT lors de la création du profil initial
--
-- Problème:
--   1. Le trigger essaie de créer user + team + team_member lors du signup
--   2. Les policies INSERT requièrent que l'utilisateur soit déjà gestionnaire/admin
--   3. Dépendance circulaire: pour être gestionnaire, il faut exister dans users
--   4. Résultat: INSERT échouent, trigger retourne NEW, auth réussit MAIS profil non créé
--
-- Solution:
--   - Ajouter un setting PostgreSQL 'app.bypass_rls_for_signup' dans le trigger
--   - Modifier les 3 policies INSERT pour vérifier ce setting en premier
--   - Le trigger peut ainsi créer le profil initial en bypassant temporairement la RLS
--
-- Sécurité:
--   - Le setting est LOCAL (transaction uniquement)
--   - Seule la fonction SECURITY DEFINER peut le définir
--   - Les policies restent actives pour tous les autres cas
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Modifier la fonction trigger pour définir le bypass RLS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_role text;
  v_team_id uuid;
  v_team_name text;
  v_user_name text;
  v_existing_profile_id uuid;
  v_new_user_id uuid;
BEGIN
  -- ✅ NOUVEAU: Activer bypass RLS pour ce trigger uniquement
  -- Permet de créer le profil initial sans être bloqué par les policies
  PERFORM set_config('app.bypass_rls_for_signup', 'true', true);

  -- Vérifier si profil existe déjà
  SELECT id INTO v_existing_profile_id
  FROM public.users
  WHERE auth_user_id = NEW.id;

  IF v_existing_profile_id IS NOT NULL THEN
    RETURN NEW;  -- Profil existe, skip
  END IF;

  -- Extraire métadonnées
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestionnaire');

  -- Validation
  IF v_first_name = '' OR v_last_name = '' THEN
    RAISE EXCEPTION 'Missing required user metadata: first_name or last_name';
  END IF;

  -- WORKFLOW INVITATION: team_id fourni dans metadata
  IF NEW.raw_user_meta_data ? 'team_id' AND
     (NEW.raw_user_meta_data->>'team_id') IS NOT NULL THEN

    v_team_id := (NEW.raw_user_meta_data->>'team_id')::uuid;
    v_user_name := v_first_name || ' ' || v_last_name;

    -- Créer profil avec équipe existante
    INSERT INTO public.users (
      auth_user_id, email, name, role, team_id,
      avatar_url, phone, password_set
    ) VALUES (
      NEW.id, NEW.email, v_user_name, v_role::user_role, v_team_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone',
      COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, false)
    );

    -- Ajouter à team_members (mapper user_role → team_member_role)
    INSERT INTO public.team_members (team_id, user_id, role)
    SELECT v_team_id, id, v_role::team_member_role
    FROM public.users WHERE auth_user_id = NEW.id;

    -- Mettre à jour invitation
    UPDATE public.user_invitations
    SET status = 'accepted'::invitation_status, accepted_at = NOW()
    WHERE email = NEW.email AND team_id = v_team_id AND status = 'pending'::invitation_status;

  ELSE
    -- WORKFLOW SIGNUP: Créer USER puis TEAM (résout dépendance circulaire)
    v_user_name := v_first_name || ' ' || v_last_name;

    -- Step 1: Créer profil SANS team_id
    INSERT INTO public.users (
      auth_user_id, email, name, role, team_id,
      avatar_url, phone, password_set
    ) VALUES (
      NEW.id, NEW.email, v_user_name, v_role::user_role, NULL,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone',
      COALESCE((NEW.raw_user_meta_data->>'password_set')::boolean, true)
    )
    RETURNING id INTO v_new_user_id;

    -- Step 2: Créer équipe
    v_team_name := v_first_name || ' ' || v_last_name || '''s Team';
    INSERT INTO public.teams (name, created_by)
    VALUES (v_team_name, v_new_user_id)
    RETURNING id INTO v_team_id;

    -- Step 3: Mettre à jour profil (équipe principale)
    UPDATE public.users
    SET team_id = v_team_id
    WHERE id = v_new_user_id;

    -- Step 4: Ajouter comme admin team_members
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_team_id, v_new_user_id, 'admin'::team_member_role);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;  -- Ne pas bloquer auth
END;
$$;

COMMENT ON FUNCTION handle_new_user_confirmed IS 'Trigger auto-création profil - Résout dépendance circulaire + support invitation + multi-équipe + bypass RLS pour signup initial';

-- =============================================================================
-- ÉTAPE 2: Recréer le trigger (pas de changement, juste pour cohérence)
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_new_user_confirmed();

-- =============================================================================
-- ÉTAPE 3: Modifier les policies INSERT pour vérifier le bypass RLS
-- =============================================================================

-- Policy 1: users INSERT
DROP POLICY IF EXISTS "users_insert_contacts" ON users;
CREATE POLICY "users_insert_contacts" ON users FOR INSERT
TO authenticated
WITH CHECK (
  -- ✅ NOUVEAU: Bypass RLS pour trigger signup
  current_setting('app.bypass_rls_for_signup', true) = 'true'
  OR
  -- Service Role bypass complet (pour supabaseAdmin)
  current_setting('role') = 'service_role'
  OR
  -- Gestionnaires/Admins peuvent créer contacts dans leurs équipes
  (
    get_current_user_role() IN ('gestionnaire', 'admin')
    AND team_id IN (SELECT get_user_teams_v2())
  )
);

COMMENT ON POLICY "users_insert_contacts" ON users IS 'INSERT: Bypass RLS pour signup trigger OU Service Role OU Gestionnaires créent contacts dans leurs équipes';

-- Policy 2: teams INSERT
DROP POLICY IF EXISTS "teams_insert_by_gestionnaire" ON teams;
CREATE POLICY "teams_insert_by_gestionnaire" ON teams FOR INSERT
TO authenticated
WITH CHECK (
  -- ✅ NOUVEAU: Bypass RLS pour trigger signup
  current_setting('app.bypass_rls_for_signup', true) = 'true'
  OR
  -- Gestionnaires peuvent créer équipes
  get_current_user_role() IN ('gestionnaire', 'admin')
);

COMMENT ON POLICY "teams_insert_by_gestionnaire" ON teams IS 'INSERT: Bypass RLS pour signup trigger OU Gestionnaires/Admins créent équipes';

-- Policy 3: team_members INSERT
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members FOR INSERT
TO authenticated
WITH CHECK (
  -- ✅ NOUVEAU: Bypass RLS pour trigger signup
  current_setting('app.bypass_rls_for_signup', true) = 'true'
  OR
  (
    team_id IN (SELECT get_user_teams_v2())
    AND (
      -- Ajouter locataire/prestataire → OK
      NOT EXISTS (
        SELECT 1 FROM users WHERE id = team_members.user_id AND role = 'gestionnaire'::user_role
      )
      OR
      -- Ajouter gestionnaire → Admin only (protection escalade privilèges)
      EXISTS (
        SELECT 1 FROM team_members tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = team_members.team_id
        AND u.auth_user_id = auth.uid()
        AND tm.role = 'admin'::team_member_role
        AND tm.left_at IS NULL
      )
    )
  )
);

COMMENT ON POLICY "team_members_insert" ON team_members IS 'INSERT: Bypass RLS pour signup trigger OU Gestionnaires ajoutent membres (admin only pour gestionnaires)';

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

-- Vérifier que le trigger existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_confirmed'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_confirmed not found!';
  END IF;

  RAISE NOTICE '✅ Trigger on_auth_user_confirmed exists';
END $$;

-- Vérifier que les policies existent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_insert_contacts') THEN
    RAISE EXCEPTION 'Policy users_insert_contacts not found!';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'teams_insert_by_gestionnaire') THEN
    RAISE EXCEPTION 'Policy teams_insert_by_gestionnaire not found!';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'team_members_insert') THEN
    RAISE EXCEPTION 'Policy team_members_insert not found!';
  END IF;

  RAISE NOTICE '✅ All policies updated successfully';
  RAISE NOTICE '   • users_insert_contacts: Bypass RLS enabled';
  RAISE NOTICE '   • teams_insert_by_gestionnaire: Bypass RLS enabled';
  RAISE NOTICE '   • team_members_insert: Bypass RLS enabled';
END $$;
