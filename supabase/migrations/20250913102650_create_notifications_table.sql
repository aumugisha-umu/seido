-- Migration: Créer la table des notifications
-- Description: Table pour stocker les notifications des utilisateurs

-- Créer l'enum pour les types de notification
CREATE TYPE notification_type AS ENUM (
  'intervention',
  'payment',
  'document',
  'system',
  'team_invite',
  'assignment',
  'status_change',
  'reminder'
);

-- Créer l'enum pour les priorités
CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Créer la table notifications
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relations
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Contenu de la notification
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'normal',
  title text NOT NULL,
  message text NOT NULL,
  
  -- Statut
  read boolean DEFAULT false,
  archived boolean DEFAULT false,
  
  -- Données additionnelles
  metadata jsonb DEFAULT '{}',
  
  -- Références optionnelles aux entités liées
  related_entity_type text,
  related_entity_id uuid,
  
  -- Champs de traçabilité
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  
  -- Contraintes
  CONSTRAINT valid_related_entity CHECK (
    (related_entity_type IS NULL AND related_entity_id IS NULL) OR
    (related_entity_type IS NOT NULL AND related_entity_id IS NOT NULL)
  )
);

-- Index pour les performances
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_team_id ON public.notifications(team_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(read) WHERE read = false;
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_priority ON public.notifications(priority);
CREATE INDEX idx_notifications_related_entity ON public.notifications(related_entity_type, related_entity_id) WHERE related_entity_type IS NOT NULL;

-- Index composite pour les requêtes courantes
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC) WHERE read = false;
CREATE INDEX idx_notifications_team_unread ON public.notifications(team_id, read, created_at DESC) WHERE read = false;

-- Fonction pour marquer les notifications comme lues
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET 
    read = true,
    read_at = now()
  WHERE id = notification_id;
END;
$$;

-- Fonction pour marquer toutes les notifications d'un utilisateur comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET 
    read = true,
    read_at = now()
  WHERE user_id = p_user_id AND read = false;
END;
$$;

-- Fonction pour nettoyer les anciennes notifications archivées (optionnel)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Supprimer les notifications archivées de plus de 6 mois
  DELETE FROM public.notifications
  WHERE archived = true 
    AND created_at < now() - interval '6 months';
    
  -- Archiver automatiquement les notifications lues de plus de 3 mois
  UPDATE public.notifications
  SET archived = true
  WHERE read = true 
    AND archived = false
    AND created_at < now() - interval '3 months';
END;
$$;

-- Ajouter des commentaires pour la documentation
COMMENT ON TABLE public.notifications IS 'Table des notifications utilisateurs pour le système Seido';
COMMENT ON COLUMN public.notifications.metadata IS 'Données JSON additionnelles spécifiques au type de notification';
COMMENT ON COLUMN public.notifications.related_entity_type IS 'Type d''entité liée (intervention, lot, building, etc.)';
COMMENT ON COLUMN public.notifications.related_entity_id IS 'ID de l''entité liée';
COMMENT ON FUNCTION mark_notification_as_read IS 'Marque une notification comme lue avec timestamp';
COMMENT ON FUNCTION mark_all_notifications_as_read IS 'Marque toutes les notifications d''un utilisateur comme lues';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Nettoie les anciennes notifications archivées';
