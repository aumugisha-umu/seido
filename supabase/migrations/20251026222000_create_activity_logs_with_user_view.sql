-- Migration: Créer la vue activity_logs_with_user
-- Description: Vue qui joint activity_logs avec users pour afficher les informations utilisateur

-- Créer la vue activity_logs_with_user
CREATE OR REPLACE VIEW activity_logs_with_user AS
SELECT
  al.id,
  al.team_id,
  al.user_id,
  al.action_type,
  al.entity_type,
  al.entity_id,
  al.entity_name,
  al.description,
  al.status,
  al.metadata,
  al.error_message,
  al.ip_address,
  al.user_agent,
  al.created_at,
  -- Informations utilisateur jointes
  u.name as user_name,
  u.email as user_email,
  u.avatar_url as user_avatar_url,
  u.role as user_role
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.id;

-- Ajouter un commentaire pour documenter la vue
COMMENT ON VIEW activity_logs_with_user IS
  'Vue qui joint activity_logs avec users pour afficher les informations utilisateur dans les logs d''activité';
