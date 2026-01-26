-- Migration: 20260113100002_fix_email_conv_rls_v3.sql
-- Description: Fix RLS pour conversations email - ajouter created_by check manquant
-- Problème: La politique INSERT ne vérifiait pas created_by = get_current_user_id()
-- Solution: Reproduire le pattern exact utilisé pour les interventions

-- 1. Recréer la politique INSERT avec la vérification created_by
DROP POLICY IF EXISTS threads_insert ON conversation_threads;

CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT
  WITH CHECK (
    -- OBLIGATOIRE: L'utilisateur doit être le créateur (empêche usurpation d'identité)
    created_by = get_current_user_id()
    AND (
      -- Cas 1: Thread lié à une intervention
      (
        intervention_id IS NOT NULL
        AND email_id IS NULL
        AND is_manager_of_intervention_team(intervention_id)
      )
      OR
      -- Cas 2: Thread lié à un email
      (
        intervention_id IS NULL
        AND email_id IS NOT NULL
        AND is_team_manager(team_id)
      )
    )
  );

COMMENT ON POLICY threads_insert ON conversation_threads IS
  'INSERT autorisé si: (1) created_by = utilisateur courant, ET (2) manager de l''équipe intervention OU manager de l''équipe email';
