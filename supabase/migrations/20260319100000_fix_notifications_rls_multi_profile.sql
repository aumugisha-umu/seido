-- ============================================================================
-- Migration: Fix notifications RLS for multi-profile support
-- Date: 2026-03-19
-- Description: Updates SELECT, UPDATE, DELETE policies on notifications table
--              to use get_my_profile_ids() instead of get_current_user_id()
--
-- CONTEXT:
-- - get_current_user_id() returns a single UUID (ORDER BY updated_at DESC LIMIT 1)
-- - For multi-team users, notifications created for Team B profile are invisible
--   when get_current_user_id() returns their Team A profile
-- - get_my_profile_ids() returns ALL profile UUIDs for the current auth user
-- - push_subscriptions was already fixed in migration 20260128000000
-- - This migration aligns notifications with the same pattern
--
-- PATTERN CHANGE:
--   BEFORE: user_id = get_current_user_id()
--   AFTER:  user_id IN (SELECT get_my_profile_ids())
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix notifications SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT get_my_profile_ids()));

COMMENT ON POLICY "notifications_select" ON notifications IS
  'Multi-profile aware: users see notifications for ALL their profiles across teams.';

-- ============================================================================
-- STEP 2: Fix notifications UPDATE policy
-- ============================================================================

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT get_my_profile_ids()))
  WITH CHECK (user_id IN (SELECT get_my_profile_ids()));

COMMENT ON POLICY "notifications_update" ON notifications IS
  'Multi-profile aware: users can mark read/archive notifications for ALL their profiles.';

-- ============================================================================
-- STEP 3: Fix notifications DELETE policy
-- ============================================================================

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT get_my_profile_ids()));

COMMENT ON POLICY "notifications_delete" ON notifications IS
  'Multi-profile aware: users can delete notifications for ALL their profiles.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ [MIGRATION] notifications RLS policies updated for multi-profile support';
  RAISE NOTICE '  - notifications_select: user_id IN (SELECT get_my_profile_ids())';
  RAISE NOTICE '  - notifications_update: user_id IN (SELECT get_my_profile_ids())';
  RAISE NOTICE '  - notifications_delete: user_id IN (SELECT get_my_profile_ids())';
  RAISE NOTICE '  - notifications_insert_authenticated: unchanged (already fixed in 20260128)';
END $$;
