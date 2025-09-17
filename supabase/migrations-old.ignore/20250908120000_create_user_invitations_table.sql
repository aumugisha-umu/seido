-- =============================================================================
-- TABLE USER_INVITATIONS - SUIVI DES INVITATIONS UTILISATEURS
-- =============================================================================
-- Cette migration crée une table pour suivre précisément le statut des invitations

-- Enum pour les statuts d'invitation
CREATE TYPE invitation_status AS ENUM (
    'pending',    -- En attente, email envoyé
    'accepted',   -- Acceptée, utilisateur connecté
    'expired',    -- Expirée
    'cancelled'   -- Annulée
);

-- Table des invitations utilisateurs
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Références
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Informations d'invitation
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status invitation_status NOT NULL DEFAULT 'pending',
    
    -- Métadonnées
    magic_link_token TEXT, -- Token pour identifier le magic link
    
    -- Dates importantes
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'), -- Expire après 7 jours
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(user_id, contact_id), -- Un utilisateur ne peut avoir qu'une invitation par contact
    UNIQUE(email, team_id, status) DEFERRABLE INITIALLY DEFERRED -- Un email ne peut avoir qu'une invitation pending par équipe
);

-- Index pour les performances
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_team ON user_invitations(team_id, status);
CREATE INDEX idx_user_invitations_email ON user_invitations(email, status);
CREATE INDEX idx_user_invitations_user ON user_invitations(user_id);
CREATE INDEX idx_user_invitations_contact ON user_invitations(contact_id);
CREATE INDEX idx_user_invitations_expires ON user_invitations(expires_at) WHERE status = 'pending';

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour updated_at
CREATE TRIGGER update_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_invitations_updated_at();

-- Fonction pour marquer les invitations comme expirées
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE user_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ language 'plpgsql';

-- Commentaires pour documentation
COMMENT ON TABLE user_invitations IS 'Suivi des invitations utilisateurs avec statuts précis';
COMMENT ON COLUMN user_invitations.magic_link_token IS 'Token pour identifier le magic link utilisé';
COMMENT ON COLUMN user_invitations.expires_at IS 'Date d''expiration de l''invitation (7 jours par défaut)';
COMMENT ON FUNCTION expire_old_invitations() IS 'Marque les invitations en attente comme expirées après leur date d''expiration';
