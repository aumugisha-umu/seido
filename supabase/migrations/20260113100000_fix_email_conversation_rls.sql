-- Migration: 20260113100000_fix_email_conversation_rls.sql
-- Description: Corriger les politiques RLS pour supporter les conversations email
-- Le problème: la politique INSERT vérifie intervention_id qui est NULL pour les emails

-- 1. Créer une fonction helper pour vérifier si l'utilisateur peut créer une conversation email
CREATE OR REPLACE FUNCTION can_create_email_conversation(p_email_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_db_id UUID;
BEGIN
  -- Récupérer l'ID utilisateur DB depuis auth.uid()
  SELECT id INTO v_user_db_id
  FROM users
  WHERE auth_user_id = auth.uid();

  IF v_user_db_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Vérifier que l'utilisateur est gestionnaire de l'équipe
  RETURN is_team_manager(p_team_id);
END;
$$;

-- 2. Mettre à jour la politique INSERT pour supporter les deux cas
DROP POLICY IF EXISTS threads_insert ON conversation_threads;

CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT
  WITH CHECK (
    -- Cas 1: Conversation liée à une intervention
    (
      intervention_id IS NOT NULL
      AND email_id IS NULL
      AND is_manager_of_intervention_team(intervention_id)
    )
    OR
    -- Cas 2: Conversation liée à un email
    (
      intervention_id IS NULL
      AND email_id IS NOT NULL
      AND can_create_email_conversation(email_id, team_id)
    )
  );

-- 3. Mettre à jour la politique DELETE pour supporter les emails
DROP POLICY IF EXISTS threads_delete ON conversation_threads;

CREATE POLICY threads_delete ON conversation_threads
  FOR DELETE
  USING (
    -- Cas intervention
    (intervention_id IS NOT NULL AND is_manager_of_intervention_team(intervention_id))
    OR
    -- Cas email
    (email_id IS NOT NULL AND is_team_manager(team_id))
  );

-- 4. Commenter les nouvelles fonctions
COMMENT ON FUNCTION can_create_email_conversation(UUID, UUID) IS
  'Vérifie si l''utilisateur courant peut créer une conversation email pour l''équipe donnée';
