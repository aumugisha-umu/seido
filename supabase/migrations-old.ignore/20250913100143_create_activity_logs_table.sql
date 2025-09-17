-- Création de la table pour les logs d'activité de l'équipe
-- Cette table enregistre toutes les actions CRUD importantes dans l'application

-- Enum pour les types d'actions
CREATE TYPE activity_action_type AS ENUM (
  'create',           -- Création
  'update',           -- Modification
  'delete',           -- Suppression
  'assign',           -- Assignation
  'unassign',         -- Désassignation
  'approve',          -- Approbation
  'reject',           -- Rejet
  'complete',         -- Finalisation
  'cancel',           -- Annulation
  'upload',           -- Upload de document
  'download',         -- Téléchargement
  'invite',           -- Invitation
  'accept_invite',    -- Acceptation invitation
  'status_change',    -- Changement de statut
  'login',            -- Connexion
  'logout'            -- Déconnexion
);

-- Enum pour les types d'entités
CREATE TYPE activity_entity_type AS ENUM (
  'user',             -- Utilisateur
  'team',             -- Équipe
  'team_member',      -- Membre d'équipe
  'building',         -- Immeuble
  'lot',              -- Lot
  'contact',          -- Contact
  'intervention',     -- Intervention
  'document',         -- Document
  'invitation',       -- Invitation
  'session'           -- Session utilisateur
);

-- Enum pour le statut de l'activité
CREATE TYPE activity_status AS ENUM (
  'success',          -- Succès
  'failed',           -- Échec
  'in_progress',      -- En cours
  'cancelled'         -- Annulé
);

-- Table principale des logs d'activité
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Métadonnées de base
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Informations sur l'action
  action_type activity_action_type NOT NULL,
  entity_type activity_entity_type NOT NULL,
  entity_id UUID, -- Peut être NULL pour certaines actions (ex: login)
  entity_name TEXT, -- Nom/référence pour l'affichage (ex: "LOT-001", "INT-2025-001")
  
  -- Statut et description
  status activity_status NOT NULL DEFAULT 'success',
  description TEXT NOT NULL, -- Description lisible de l'action
  error_message TEXT, -- Message d'erreur si status = 'failed'
  
  -- Métadonnées additionnelles (JSON flexible)
  metadata JSONB DEFAULT '{}',
  
  -- Informations contextuelles
  ip_address INET, -- Adresse IP de l'utilisateur
  user_agent TEXT, -- User agent du navigateur
  
  -- Horodatage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX activity_logs_team_id_idx ON activity_logs(team_id);
CREATE INDEX activity_logs_user_id_idx ON activity_logs(user_id);
CREATE INDEX activity_logs_created_at_idx ON activity_logs(created_at DESC);
CREATE INDEX activity_logs_entity_idx ON activity_logs(entity_type, entity_id);
CREATE INDEX activity_logs_action_status_idx ON activity_logs(action_type, status);

-- Index composé pour les requêtes par équipe et date
CREATE INDEX activity_logs_team_date_idx ON activity_logs(team_id, created_at DESC);

-- Index pour les recherches par gestionnaire (actions personnelles)
CREATE INDEX activity_logs_user_team_date_idx ON activity_logs(user_id, team_id, created_at DESC);

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_activity_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour automatically update updated_at
CREATE TRIGGER activity_logs_update_trigger
    BEFORE UPDATE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_logs_updated_at();

-- Fonction helper pour créer un log d'activité
CREATE OR REPLACE FUNCTION log_activity(
  p_team_id UUID,
  p_user_id UUID,
  p_action_type activity_action_type,
  p_entity_type activity_entity_type,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_status activity_status DEFAULT 'success',
  p_metadata JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (
    team_id, user_id, action_type, entity_type, entity_id, entity_name,
    description, status, metadata, ip_address, user_agent
  ) VALUES (
    p_team_id, p_user_id, p_action_type, p_entity_type, p_entity_id, p_entity_name,
    p_description, p_status, p_metadata, p_ip_address, p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Commentaires pour documenter la table
COMMENT ON TABLE activity_logs IS 'Journal d''activité de l''équipe - enregistre toutes les actions CRUD importantes';
COMMENT ON COLUMN activity_logs.team_id IS 'Équipe concernée par l''activité';
COMMENT ON COLUMN activity_logs.user_id IS 'Utilisateur qui a effectué l''action';
COMMENT ON COLUMN activity_logs.action_type IS 'Type d''action effectuée';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type d''entité concernée par l''action';
COMMENT ON COLUMN activity_logs.entity_id IS 'ID de l''entité concernée (peut être NULL)';
COMMENT ON COLUMN activity_logs.entity_name IS 'Nom/référence de l''entité pour l''affichage';
COMMENT ON COLUMN activity_logs.description IS 'Description lisible de l''action pour l''utilisateur';
COMMENT ON COLUMN activity_logs.metadata IS 'Données additionnelles en JSON (changements, détails, etc.)';
COMMENT ON COLUMN activity_logs.ip_address IS 'Adresse IP de l''utilisateur (optionnel)';
COMMENT ON COLUMN activity_logs.user_agent IS 'User agent du navigateur (optionnel)';

-- Vue pour faciliter les requêtes avec informations utilisateur
CREATE VIEW activity_logs_with_user AS
SELECT 
  al.*,
  u.name as user_name,
  u.email as user_email,
  u.role as user_role,
  t.name as team_name
FROM activity_logs al
JOIN users u ON al.user_id = u.id
JOIN teams t ON al.team_id = t.id;

-- Politique de nettoyage automatique (garder 6 mois de logs)
-- Cette fonction peut être appelée par un cron job
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM activity_logs 
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Quelques exemples de logs pour tester
-- Ces données seront ajoutées automatiquement par l'application
INSERT INTO activity_logs (team_id, user_id, action_type, entity_type, entity_name, description, metadata) 
SELECT 
  t.id as team_id,
  u.id as user_id,
  'create' as action_type,
  'team' as entity_type,
  t.name as entity_name,
  'Création de l''équipe ' || t.name as description,
  '{"initial_setup": true}' as metadata
FROM teams t
JOIN users u ON t.created_by = u.id
LIMIT 3;
