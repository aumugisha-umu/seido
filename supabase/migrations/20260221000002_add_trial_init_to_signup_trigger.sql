-- =============================================================================
-- Add Trial Subscription Initialization to Signup Trigger
-- =============================================================================
-- Date: 2026-02-21
-- Purpose: After team creation in handle_new_user_confirmed(), automatically
--          create a subscription record with status=free_tier (new teams start
--          with 0 lots, so free_tier is correct; they'll upgrade to trialing
--          when they add >2 lots via the tr_lots_subscription_count trigger).
--
-- Why in the trigger:
--   - subscriptions table has RLS (SELECT only for authenticated)
--   - No INSERT policy for authenticated users
--   - Trigger runs as SECURITY DEFINER → bypasses RLS
--   - Atomic with team creation → zero race conditions
--
-- Stripe Customer: Created lazily on first checkout/billing access
--                  (via SubscriptionService.getOrCreateStripeCustomer)
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

    -- ✅ NEW Step 5: Initialize subscription (free_tier for new teams with 0 lots)
    -- New teams start with 0 lots → status = free_tier
    -- When they add >2 lots, tr_lots_subscription_count updates billable_properties
    -- and they'll need to upgrade (checked by SubscriptionService.canAddProperty)
    INSERT INTO public.subscriptions (
      team_id,
      status,
      trial_start,
      trial_end,
      billable_properties,
      subscribed_lots
    ) VALUES (
      v_team_id,
      'free_tier'::subscription_status,
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

COMMENT ON FUNCTION handle_new_user_confirmed IS 'Trigger auto-création profil + équipe + subscription initiale. Résout dépendance circulaire + support invitation + multi-équipe + bypass RLS pour signup initial';

-- =============================================================================
-- Verify migration
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Signup trigger updated with subscription initialization';
  RAISE NOTICE '   • New teams get free_tier subscription with 30-day trial window';
  RAISE NOTICE '   • Stripe customer created lazily on first checkout';
  RAISE NOTICE '   • ON CONFLICT (team_id) DO NOTHING for idempotency';
END $$;
