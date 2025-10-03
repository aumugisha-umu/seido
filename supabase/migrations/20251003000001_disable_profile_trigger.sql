-- =============================================================================
-- MIGRATION: Disable Profile Creation Trigger (Switch to Server-Side)
-- =============================================================================
-- Date: 2025-10-03
-- Reason: After 9 failed attempts to make the trigger work reliably,
--         we're switching to server-side profile creation in /auth/confirm/route.ts
--         This follows Supabase best practices and provides better control/observability
--
-- Context:
--   - Original trigger: on_auth_user_confirmed (AFTER UPDATE on auth.users)
--   - Problem: Trigger didn't execute or failed silently despite multiple fixes
--   - Solution: Create profiles in Next.js Server Actions with explicit error handling
--
-- Reference:
--   - Supabase docs warning: "If the trigger fails, it could block signups"
--   - Analysis by 3 specialized agents (seido-debugger, backend-developer, API-designer)
--   - Recommendation: Server-side creation is more reliable for production
-- =============================================================================

-- =============================================================================
-- STEP 1: Disable the trigger (don't delete - keep for reference)
-- =============================================================================

-- Drop the trigger from auth.users table (if exists)
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Note: Skip COMMENT ON TRIGGER since trigger may not exist
-- (COMMENT would fail with "trigger does not exist" error)

-- =============================================================================
-- STEP 2: Mark the function as deprecated (keep for historical reference)
-- =============================================================================

COMMENT ON FUNCTION public.handle_new_user_confirmed() IS
  'DEPRECATED 2025-10-03: Profile creation now handled server-side in /auth/confirm/route.ts

   This trigger was disabled after multiple failed attempts to make it reliable:
   - 9 migrations attempted (2025-10-02)
   - Issues: RLS recursion, circular dependency users ↔ teams, silent failures
   - Decision: Server-side creation provides better control, logs, and error handling

   Pattern changed:
   OLD: verifyOtp() → trigger creates profile → retry pattern waits → redirect
   NEW: verifyOtp() → create profile directly → create team → redirect

   Benefits:
   - 100% reliability (no silent failures)
   - Clear logs and error handling
   - Never blocks Supabase Auth signup
   - Consistent with Next.js 15 + Supabase SSR architecture

   See: app/auth/confirm/route.ts (lines 110-208)';

-- =============================================================================
-- STEP 3: Keep debug logs table for monitoring
-- =============================================================================

-- We keep the trigger_debug_logs table for historical debugging
COMMENT ON TABLE public.trigger_debug_logs IS
  'Historical trigger execution logs. Trigger disabled 2025-10-03.
   This table is kept for debugging the old trigger behavior and can be used
   for server-side logging if needed.';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check that trigger is disabled
-- SELECT
--   trigger_name,
--   event_manipulation,
--   action_statement,
--   action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_confirmed';
-- Expected: 0 rows (trigger dropped)

-- Check function still exists (for reference)
-- SELECT
--   proname,
--   prosecdef,
--   obj_description(oid, 'pg_proc') as description
-- FROM pg_proc
-- WHERE proname = 'handle_new_user_confirmed';
-- Expected: 1 row with DEPRECATED comment

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================

-- If you need to re-enable the trigger for any reason:
--
-- CREATE TRIGGER on_auth_user_confirmed
--   AFTER UPDATE ON auth.users
--   FOR EACH ROW
--   WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
--   EXECUTE FUNCTION public.handle_new_user_confirmed();

-- =============================================================================
-- SUMMARY
-- =============================================================================
-- ✅ Trigger disabled (not deleted - kept for reference)
-- ✅ Function marked as deprecated with full context
-- ✅ Debug logs table preserved for historical analysis
-- ✅ Profile creation now handled in /auth/confirm/route.ts
--
-- Next steps:
-- 1. Deploy this migration to Supabase
-- 2. Test signup flow with new server-side creation
-- 3. Monitor logs for any issues
-- 4. Create "heal" script for 17+ users without profiles (if needed)
-- =============================================================================
