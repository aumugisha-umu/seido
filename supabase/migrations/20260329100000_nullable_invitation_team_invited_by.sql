-- =============================================================================
-- Make team_id and invited_by nullable on user_invitations
-- =============================================================================
-- Context: Admin invite flow uses generateLink({type:'invite'}) which creates
-- an unconfirmed auth user. The handle_new_user_confirmed trigger only fires
-- on UPDATE of email_confirmed_at (not INSERT), so when an admin invites a
-- gestionnaire, no team/profile exists yet.
--
-- The user_invitations INSERT was silently failing because team_id and
-- invited_by are NOT NULL, but both are null at invite time.
--
-- Fix: Allow NULL for these columns. They get populated when the user confirms.
-- =============================================================================

-- Allow team_id to be NULL (team created when user confirms invitation)
ALTER TABLE public.user_invitations
  ALTER COLUMN team_id DROP NOT NULL;

-- Allow invited_by to be NULL (admin profile ID used instead when available)
ALTER TABLE public.user_invitations
  ALTER COLUMN invited_by DROP NOT NULL;

-- =============================================================================
-- Backfill: create missing user_invitations for already-invited auth users
-- =============================================================================
-- Auth users with invited_at set but no email_confirmed_at are pending invites.
-- If they have no user_invitations record, the INSERT failed due to the old
-- NOT NULL constraints. Create the missing records now.

INSERT INTO public.user_invitations (email, first_name, last_name, role, status, expires_at, invited_at)
SELECT
  au.email,
  au.raw_user_meta_data->>'first_name',
  au.raw_user_meta_data->>'last_name',
  COALESCE(au.raw_user_meta_data->>'role', 'gestionnaire')::user_role,
  CASE
    WHEN au.invited_at + INTERVAL '7 days' < NOW() THEN 'expired'::invitation_status
    ELSE 'pending'::invitation_status
  END,
  (au.invited_at + INTERVAL '7 days')::timestamptz,
  au.invited_at
FROM auth.users au
WHERE au.invited_at IS NOT NULL
  AND au.email_confirmed_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_invitations ui
    WHERE LOWER(ui.email) = LOWER(au.email)
  );
