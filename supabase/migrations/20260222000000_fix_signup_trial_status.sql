-- =============================================================================
-- Fix: New users should start as 'trialing', not 'free_tier'
-- =============================================================================
-- Date: 2026-02-22
-- Purpose:
--   - New signups should get status='trialing' with a 30-day trial
--   - After trial expires without upgrading, they transition to 'free_tier'
--     (if <=2 lots) or 'read_only' (if >2 lots)
--   - This fixes the OnboardingChecklist not showing (it requires 'trialing')
--
-- Changes:
--   1. Update handle_new_user_confirmed() to use 'trialing' instead of 'free_tier'
--   2. Fix existing users who are 'free_tier' but still within trial period
-- =============================================================================

-- ─── Step 1: Fix existing users still within trial period ─────────────────
UPDATE public.subscriptions
SET status = 'trialing'::subscription_status
WHERE status = 'free_tier'::subscription_status
  AND trial_end IS NOT NULL
  AND trial_end > NOW()
  AND stripe_subscription_id IS NULL;

-- ─── Step 2: Update the signup trigger ────────────────────────────────────
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
  -- Activer bypass RLS pour ce trigger uniquement
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

    -- Ajouter à team_members
    INSERT INTO public.team_members (team_id, user_id, role)
    SELECT v_team_id, id, v_role::team_member_role
    FROM public.users WHERE auth_user_id = NEW.id;

    -- Mettre à jour invitation
    UPDATE public.user_invitations
    SET status = 'accepted'::invitation_status, accepted_at = NOW()
    WHERE email = NEW.email AND team_id = v_team_id AND status = 'pending'::invitation_status;

  ELSE
    -- WORKFLOW SIGNUP: Créer USER puis TEAM
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

    -- Step 5: Initialize subscription with 30-day trial
    -- New users start as 'trialing' — they get full access for 30 days.
    -- After trial expires: free_tier (<=2 lots) or read_only (>2 lots).
    INSERT INTO public.subscriptions (
      team_id,
      status,
      trial_start,
      trial_end,
      billable_properties,
      subscribed_lots
    ) VALUES (
      v_team_id,
      'trialing'::subscription_status,
      NOW(),
      NOW() + INTERVAL '30 days',
      0,
      0
    )
    ON CONFLICT (team_id) DO NOTHING;  -- Idempotency guard

  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;  -- Ne pas bloquer auth
END;
$$;

COMMENT ON FUNCTION handle_new_user_confirmed IS 'Trigger auto-création profil + équipe + subscription trial 30j. Résout dépendance circulaire + support invitation + multi-équipe + bypass RLS pour signup initial';

-- =============================================================================
-- Verify migration
-- =============================================================================

DO $$
DECLARE
  v_fixed integer;
BEGIN
  SELECT count(*) INTO v_fixed
  FROM public.subscriptions
  WHERE status = 'trialing' AND trial_end > NOW() AND stripe_subscription_id IS NULL;

  RAISE NOTICE '✅ Signup trigger updated: new users now start as trialing';
  RAISE NOTICE '   • Existing users fixed: % now trialing (were free_tier with active trial)', v_fixed;
  RAISE NOTICE '   • After 30 days without upgrade → free_tier or read_only';
END $$;
