-- =====================================================
-- Migration: Add RLS INSERT policy for authenticated users
-- Date: 2025-11-22
-- Description: Permet aux gestionnaires et admins d'insérer des notifications
--              via Server Actions tout en maintenant la sécurité RLS
-- =====================================================

-- 1. Policy INSERT pour gestionnaires et admins
-- =====================================================
-- Permet aux gestionnaires et admins de créer des notifications
-- pour leur équipe ou personnelles
CREATE POLICY "notifications_insert_authenticated"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- L'utilisateur doit être gestionnaire ou admin
  (
    SELECT role FROM users WHERE id = auth.uid()
  ) IN ('gestionnaire', 'admin')

  AND

  -- Vérification de cohérence: l'user_id doit correspondre à un membre de la team
  (
    team_id IS NULL  -- Notification personnelle globale
    OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = notifications.team_id
      AND team_members.user_id = notifications.user_id
    )
  )

  AND

  -- Le créateur doit appartenir à la même équipe (si team_id spécifié)
  (
    team_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = notifications.team_id
      AND team_members.user_id = auth.uid()
    )
  )
);

-- 2. Commentaire explicatif
-- =====================================================
COMMENT ON POLICY "notifications_insert_authenticated" ON notifications IS
'Permet aux gestionnaires et admins de créer des notifications pour leur équipe.
Vérifie que le créateur et le destinataire appartiennent à la même équipe.
Les notifications personnelles globales (team_id NULL) sont autorisées.';

-- 3. Vérification des policies existantes
-- =====================================================
-- Les policies SELECT, UPDATE, DELETE restent inchangées:
-- - notifications_select: Utilisateurs voient leurs propres notifications
-- - notifications_update: Utilisateurs peuvent marquer comme lu
-- - notifications_delete: Utilisateurs peuvent archiver leurs notifications
-- - notifications_service_role: Service role peut tout faire (jobs background)

-- 4. Index de performance (si pas déjà présents)
-- =====================================================
-- Index pour optimiser les requêtes fréquentes des Server Actions
CREATE INDEX IF NOT EXISTS idx_notifications_team_user
ON notifications(team_id, user_id)
WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
ON notifications(created_at DESC)
WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_notifications_type_team
ON notifications(type, team_id)
WHERE archived = false AND read = false;

-- 5. Statistiques pour le query planner
-- =====================================================
ANALYZE notifications;
