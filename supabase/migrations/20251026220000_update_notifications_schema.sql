-- Migration: Ajouter is_personal et supprimer priority
-- Description: Simplification du modèle notifications - distinction personal/team sans gestion de priorité

-- Ajouter la colonne is_personal
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_personal boolean DEFAULT false NOT NULL;

-- Supprimer la colonne priority si elle existe
ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS priority CASCADE;

-- Supprimer l'enum notification_priority (plus utilisé)
DROP TYPE IF EXISTS notification_priority CASCADE;

-- Index pour optimiser les requêtes personal/team
CREATE INDEX IF NOT EXISTS idx_notifications_personal
  ON public.notifications(is_personal, user_id, read, created_at DESC);

-- Mettre is_personal = true pour les notifications existantes de type 'assignment'
-- (car les assignments sont par nature des notifications personnelles)
UPDATE public.notifications
SET is_personal = true
WHERE type = 'assignment';

-- Commentaire documentation
COMMENT ON COLUMN public.notifications.is_personal IS
  'true = notification personnelle (gestionnaire directement assigné/responsable), false = notification équipe (information générale pour tous les membres)';
