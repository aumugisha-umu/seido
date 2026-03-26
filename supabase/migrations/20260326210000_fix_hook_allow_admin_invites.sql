-- =============================================================================
-- Fix: Allow admin invite flows to bypass invite-only hook
-- =============================================================================
-- Problem: generateLink({type:'invite'}) triggers before-user-created hook,
-- but user_invitations record is inserted AFTER generateLink succeeds.
-- This creates a chicken-and-egg: hook blocks the invite that would create
-- the invitation record.
--
-- Fix: Also allow when user_metadata contains password_set = 'false'.
-- Only server-side admin invite actions set this field.
-- Regular email signups and OAuth logins never set password_set in metadata.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hook_block_uninvited_signups(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_email text;
  is_invited boolean;
  is_admin_invite boolean;
BEGIN
  -- Extract email from the event payload
  user_email := event->'user'->>'email';

  -- If no email, block (safety)
  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Email requis pour l''inscription.',
        'http_code', 403
      )
    );
  END IF;

  -- Check if this is an admin invite (server-side only).
  -- Admin invite actions set password_set = false in user_metadata.
  -- Regular signups (email form, OAuth/Google) never set this field.
  is_admin_invite := (event->'user'->'user_metadata'->>'password_set') = 'false';

  IF is_admin_invite THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Check if this email was invited
  SELECT EXISTS(
    SELECT 1
    FROM public.user_invitations
    WHERE LOWER(email) = LOWER(user_email)
    LIMIT 1
  ) INTO is_invited;

  IF NOT is_invited THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'L''acces a SEIDO se fait sur invitation uniquement. Demandez votre acces sur seido-app.com.',
        'http_code', 403
      )
    );
  END IF;

  -- Invited user — allow signup
  RETURN '{}'::jsonb;
END;
$$;

COMMENT ON FUNCTION public.hook_block_uninvited_signups IS
  'Auth hook: blocks signups (email/OAuth) for non-invited users. Admin invites (password_set=false in metadata) and pre-existing user_invitations bypass this hook.';
