-- Migration: 20260113100001_fix_email_conv_rls_v2.sql
-- Description: Fix RLS pour conversations email
-- Problème: La fonction can_create_email_conversation ne vérifie pas correctement les permissions

-- 1. Recréer la fonction avec logique simplifiée et robuste
CREATE OR REPLACE FUNCTION can_create_email_conversation(p_email_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_db_id UUID;
  v_user_role TEXT;
  v_is_team_member BOOLEAN;
BEGIN
  -- Récupérer l'ID utilisateur DB et son rôle depuis auth.uid()
  SELECT id, role::TEXT INTO v_user_db_id, v_user_role
  FROM users
  WHERE auth_user_id = auth.uid();

  IF v_user_db_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Vérifier si l'utilisateur est membre actif de l'équipe
  -- Note: On vérifie juste l'appartenance à l'équipe, pas le rôle spécifique dans team_members
  -- car les gestionnaires et admins ont accès par leur rôle utilisateur
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = v_user_db_id
      AND tm.team_id = p_team_id
      AND tm.left_at IS NULL
  ) INTO v_is_team_member;

  -- L'utilisateur doit être membre de l'équipe ET être gestionnaire ou admin
  RETURN v_is_team_member AND v_user_role IN ('gestionnaire', 'admin');
END;
$$;

COMMENT ON FUNCTION can_create_email_conversation(UUID, UUID) IS
  'Vérifie si l''utilisateur courant peut créer une conversation email pour l''équipe donnée. Vérifie le rôle utilisateur (users.role) et l''appartenance à l''équipe.';
