-- Migration: 20251122000000_create_email_integration_tables.sql



-- 1. Table team_email_connections
CREATE TABLE team_email_connections (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Informations générales
  provider VARCHAR(50) NOT NULL, -- 'gmail' | 'outlook' | 'yahoo' | 'ovh' | 'custom'
  email_address VARCHAR(255) NOT NULL,

  -- Configuration IMAP (Réception)
  imap_host VARCHAR(255) NOT NULL,
  imap_port INT NOT NULL DEFAULT 993,
  imap_use_ssl BOOLEAN DEFAULT TRUE,
  imap_username VARCHAR(255) NOT NULL,
  imap_password_encrypted TEXT NOT NULL, -- AES-256 encrypted

  -- Configuration SMTP (Envoi)
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_use_tls BOOLEAN DEFAULT TRUE,
  smtp_username VARCHAR(255) NOT NULL,
  smtp_password_encrypted TEXT NOT NULL, -- AES-256 encrypted

  -- État de synchronisation
  last_uid BIGINT DEFAULT 0, -- Dernier UID IMAP récupéré
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_error TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT unique_email_per_team UNIQUE (team_id, email_address)
);

-- Index pour performances
CREATE INDEX idx_team_email_connections_team_id ON team_email_connections(team_id);
CREATE INDEX idx_team_email_connections_is_active ON team_email_connections(is_active) WHERE is_active = TRUE;

-- Trigger pour updated_at
CREATE TRIGGER update_team_email_connections_updated_at
  BEFORE UPDATE ON team_email_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE team_email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their email connections"
  ON team_email_connections FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can insert email connections"
  ON team_email_connections FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "Team managers can update their email connections"
  ON team_email_connections FOR UPDATE
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can delete their email connections"
  ON team_email_connections FOR DELETE
  USING (is_team_manager(team_id));


-- 2. Table emails
CREATE TYPE email_direction AS ENUM ('received', 'sent');
CREATE TYPE email_status AS ENUM ('unread', 'read', 'archived', 'deleted');

CREATE TABLE emails (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email_connection_id UUID REFERENCES team_email_connections(id) ON DELETE SET NULL,

  -- Métadonnées email
  direction email_direction NOT NULL,
  status email_status DEFAULT 'unread',
  deleted_at TIMESTAMPTZ, -- Soft delete

  -- En-têtes RFC 2822
  message_id VARCHAR(500), -- Message-ID header
  in_reply_to UUID REFERENCES emails(id), -- Thread parent
  "references" TEXT, -- References header (threading)

  -- Expéditeur / Destinataires
  from_address VARCHAR(500) NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],

  -- Contenu
  subject VARCHAR(1000) NOT NULL,
  body_text TEXT,
  body_html TEXT,

  -- Relations SEIDO
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,

  -- Dates
  received_at TIMESTAMPTZ, -- Pour emails reçus
  sent_at TIMESTAMPTZ, -- Pour emails envoyés
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Recherche plein texte (français)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(from_address, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(body_text, '')), 'C')
  ) STORED
);

-- Index pour performances
CREATE INDEX idx_emails_team_id ON emails(team_id);
CREATE INDEX idx_emails_direction ON emails(direction);
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_in_reply_to ON emails(in_reply_to) WHERE in_reply_to IS NOT NULL;
CREATE INDEX idx_emails_building_id ON emails(building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_emails_lot_id ON emails(lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX idx_emails_intervention_id ON emails(intervention_id) WHERE intervention_id IS NOT NULL;
CREATE INDEX idx_emails_deleted_at ON emails(deleted_at) WHERE deleted_at IS NULL;

-- Index de recherche plein texte
CREATE INDEX idx_emails_search_vector ON emails USING GIN(search_vector);

-- RLS Policies
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their emails"
  ON emails FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can insert emails"
  ON emails FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "Team managers can update their emails"
  ON emails FOR UPDATE
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can delete their emails"
  ON emails FOR DELETE
  USING (is_team_manager(team_id));


-- 3. Table email_attachments
CREATE TABLE email_attachments (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,

  -- Métadonnées fichier
  filename VARCHAR(500) NOT NULL,
  content_type VARCHAR(200),
  size_bytes INT NOT NULL,

  -- Stockage Supabase
  storage_path TEXT NOT NULL, -- Chemin dans le bucket 'email-attachments'

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);

-- RLS Policies (hérite de la table emails)
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view attachments of their emails"
  ON email_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = email_attachments.email_id
        AND is_team_manager(emails.team_id)
    )
  );


-- 4. Table email_blacklist
CREATE TABLE email_blacklist (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Expéditeur blacklisté
  sender_email VARCHAR(500) NOT NULL,  -- Email exact à bloquer
  sender_domain VARCHAR(255),          -- Domaine à bloquer (optionnel, pour bloquer @example.com)

  -- Métadonnées
  reason TEXT,                         -- Raison du blocage (optionnel)
  blocked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Qui a bloqué
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT unique_blacklist_per_team UNIQUE (team_id, sender_email)
);

-- Index pour performances
CREATE INDEX idx_email_blacklist_team_id ON email_blacklist(team_id);
CREATE INDEX idx_email_blacklist_sender_email ON email_blacklist(sender_email);
CREATE INDEX idx_email_blacklist_sender_domain ON email_blacklist(sender_domain) WHERE sender_domain IS NOT NULL;

-- RLS Policies
ALTER TABLE email_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their blacklist"
  ON email_blacklist FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can insert blacklist entries"
  ON email_blacklist FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "Team managers can delete blacklist entries"
  ON email_blacklist FOR DELETE
  USING (is_team_manager(team_id));

-- Fonction pour vérifier si un expéditeur est blacklisté
CREATE OR REPLACE FUNCTION is_sender_blacklisted(
  p_team_id UUID,
  p_sender_email VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_sender_domain VARCHAR;
BEGIN
  -- Extraire le domaine de l'email (tout après @)
  v_sender_domain := SUBSTRING(p_sender_email FROM '@(.*)$');

  -- Vérifier si l'email exact est blacklisté
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE team_id = p_team_id
      AND sender_email = p_sender_email
  ) THEN
    RETURN TRUE;
  END IF;

  -- Vérifier si le domaine est blacklisté
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE team_id = p_team_id
      AND sender_domain = v_sender_domain
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
