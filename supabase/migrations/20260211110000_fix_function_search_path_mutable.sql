-- Migration: Fix Supabase Security Linter Warnings
-- Issues addressed:
--   1. function_search_path_mutable (48 functions) — SET search_path = ''
--   2. rls_policy_always_true (1 policy on email_webhook_logs)
--
-- Why: SECURITY DEFINER functions with mutable search_path are vulnerable to
-- schema injection attacks. Setting search_path = '' forces fully-qualified
-- references, eliminating the attack vector.

-- ============================================================================
-- PART 1: Fix search_path for all 48 flagged functions
-- ============================================================================
-- Uses dynamic SQL to avoid hardcoding function signatures.
-- Queries pg_proc to get actual parameter types for each function.

DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      -- RLS Helper Functions (SECURITY DEFINER + STABLE)
      'is_team_member',
      'is_team_manager',
      'can_view_building',
      'can_view_lot',
      'is_manager_of_intervention_team',
      'can_view_intervention',
      'can_manage_intervention',
      'get_intervention_team_id',
      'can_send_message_in_thread',
      'can_validate_document',
      'can_manage_time_slot',
      'is_document_owner',
      'can_view_quote',
      'can_manage_quote',
      'can_view_report',
      'is_notification_recipient',
      'is_prestataire_of_intervention',
      'can_view_conversation',
      'can_view_conversation_thread',
      'check_timeslot_can_be_finalized',
      'is_sender_blacklisted',
      'get_team_id_from_storage_path',
      'get_contract_team_id',
      'can_view_contract',
      'can_manage_contract',
      'get_linked_interventions',
      'get_distinct_linked_entities',
      'is_time_slot_fully_validated',
      -- Trigger Functions
      'update_updated_at_column',
      'update_company_members_updated_at',
      'generate_intervention_reference',
      'set_intervention_team_id',
      'update_thread_message_count',
      'validate_intervention_status_transition',
      'soft_delete_intervention_cascade',
      'update_time_slot_response_updated_at',
      'check_single_selected_slot',
      'update_intervention_comments_updated_at',
      'update_import_jobs_updated_at',
      'update_building_lots_count_from_lot_contacts',
      'update_building_total_lots',
      'update_intervention_has_attachments',
      -- Business Logic Functions
      'expire_old_invitations',
      'revoke_contact_access',
      'log_intervention_status_change',
      'cleanup_old_webhook_logs',
      'sync_email_link_team_id',
      -- Other Functions
      'get_entity_activity_logs',
      'auto_set_time_slot_validation',
      'handle_internal_time_slot_rejection',
      'update_time_slot_validation_summary',
      'create_responses_for_new_timeslot'
    )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = %L',
      func_record.proname,
      func_record.args,
      ''
    );
    RAISE NOTICE 'Fixed search_path for: public.%(%)', func_record.proname, func_record.args;
  END LOOP;
END $$;

-- ============================================================================
-- PART 2: Fix RLS policy "always true" on email_webhook_logs
-- ============================================================================
-- The policy had WITH CHECK (true) without role restriction, which the linter
-- flags as "always true". Restricting to service_role makes it explicit.

DROP POLICY IF EXISTS "Service role can insert webhook logs" ON email_webhook_logs;
CREATE POLICY "Service role can insert webhook logs"
  ON email_webhook_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
