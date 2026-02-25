-- ============================================================================
-- Migration: Fix SECURITY DEFINER views → SECURITY INVOKER
-- Date: 2026-02-11
-- Description: Convert 5 views flagged by Supabase linter from SECURITY DEFINER
--              to SECURITY INVOKER so they enforce RLS of the querying user,
--              not the view creator.
-- Impact: Views now respect row-level security policies of the calling user.
--         No functional change for properly-authorized queries.
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- ============================================================================

-- 1. contracts_active
ALTER VIEW public.contracts_active SET (security_invoker = on);

-- 2. lots_active
ALTER VIEW public.lots_active SET (security_invoker = on);

-- 3. buildings_active
ALTER VIEW public.buildings_active SET (security_invoker = on);

-- 4. lots_with_contacts
ALTER VIEW public.lots_with_contacts SET (security_invoker = on);

-- 5. activity_logs_with_user
ALTER VIEW public.activity_logs_with_user SET (security_invoker = on);
