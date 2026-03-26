-- =============================================================================
-- Before User Created Hook — Invite-Only Gate
-- =============================================================================
-- Blocks new user creation (signup/OAuth) unless the email exists in
-- user_invitations. Admin API calls (generateLink, createUser) bypass
-- auth hooks, so admin invites are not affected.
--
-- After creating this function, enable it in Supabase Dashboard:
-- Authentication > Hooks > Before User Created > Select this function
-- =============================================================================

CREATE OR REPLACE FUNCTION public.hook_block_uninvited_signups(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_email text;
  is_invited boolean;
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

-- Grant execute to supabase_auth_admin (required for auth hooks)
GRANT EXECUTE ON FUNCTION public.hook_block_uninvited_signups TO supabase_auth_admin;

-- Revoke from all other roles (security)
REVOKE EXECUTE ON FUNCTION public.hook_block_uninvited_signups FROM authenticated, anon, public;

COMMENT ON FUNCTION public.hook_block_uninvited_signups IS
  'Auth hook: blocks signups (email/OAuth) for non-invited users. Admin API calls bypass this hook.';
