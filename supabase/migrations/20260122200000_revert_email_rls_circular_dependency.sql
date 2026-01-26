-- ============================================================================
-- EMERGENCY Migration: Revert Email RLS Circular Dependencies
-- Date: 2026-01-22
-- Description: REVERTS migration 20260121000000 which crashed the database
--              by creating RLS policies with 4-level JOINs per row.
--
-- Root Cause: The Jan 21 migration added 6 RLS policies with deep JOIN chains
-- that execute on EVERY ROW of emails/email_links/email_attachments tables.
-- This caused:
--   - 57014 statement timeout errors
--   - Circular RLS dependencies (email → email_links → interventions → back)
--   - Auth/PostgREST/Storage cascade failures
--
-- Solution: DROP all 6 problematic policies to restore pre-Jan 21 state.
-- The existing team-based email access policies will continue to work.
-- ============================================================================

-- ============================================================================
-- 1. DROP problematic policies on emails table
-- ============================================================================
DROP POLICY IF EXISTS "Assigned users can view emails linked to their interventions" ON emails;
DROP POLICY IF EXISTS "Tenants can view emails linked to their intervention requests" ON emails;

-- ============================================================================
-- 2. DROP problematic policies on email_links table
-- ============================================================================
DROP POLICY IF EXISTS "Assigned users can view email links for their interventions" ON email_links;
DROP POLICY IF EXISTS "Tenants can view email links for their intervention requests" ON email_links;

-- ============================================================================
-- 3. DROP problematic policies on email_attachments table
-- ============================================================================
DROP POLICY IF EXISTS "Assigned users can view attachments of linked intervention emails" ON email_attachments;
DROP POLICY IF EXISTS "Tenants can view attachments of linked intervention emails" ON email_attachments;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE policyname IN (
    'Assigned users can view emails linked to their interventions',
    'Tenants can view emails linked to their intervention requests',
    'Assigned users can view email links for their interventions',
    'Tenants can view email links for their intervention requests',
    'Assigned users can view attachments of linked intervention emails',
    'Tenants can view attachments of linked intervention emails'
  );

  IF v_policy_count = 0 THEN
    RAISE NOTICE '✅ EMERGENCY REVERT: All 6 problematic RLS policies removed';
    RAISE NOTICE '   Database should recover within 1-2 minutes';
  ELSE
    RAISE EXCEPTION '❌ ERROR: % problematic policies still exist', v_policy_count;
  END IF;
END $$;
