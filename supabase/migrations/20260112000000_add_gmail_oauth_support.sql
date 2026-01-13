-- Migration: 20260112000000_add_gmail_oauth_support.sql
-- Description: Ajoute le support OAuth pour les connexions Gmail
-- Date: 2026-01-12

-- ============================================================================
-- 1. Ajout de la colonne auth_method
-- ============================================================================

-- Méthode d'authentification: 'password' (IMAP/SMTP) ou 'oauth' (Gmail API)
ALTER TABLE team_email_connections
ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'password'
CHECK (auth_method IN ('password', 'oauth'));

-- ============================================================================
-- 2. Colonnes OAuth pour stockage des tokens
-- ============================================================================

-- Access token (chiffré AES-256-GCM)
ALTER TABLE team_email_connections
ADD COLUMN IF NOT EXISTS oauth_access_token TEXT;

-- Refresh token (chiffré AES-256-GCM) - nécessaire pour renouveler l'access token
ALTER TABLE team_email_connections
ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT;

-- Date d'expiration de l'access token
ALTER TABLE team_email_connections
ADD COLUMN IF NOT EXISTS oauth_token_expires_at TIMESTAMPTZ;

-- Scopes OAuth accordés (pour vérification)
ALTER TABLE team_email_connections
ADD COLUMN IF NOT EXISTS oauth_scope TEXT;

-- ============================================================================
-- 3. Modification des contraintes pour OAuth
-- ============================================================================

-- Pour OAuth, les colonnes IMAP/SMTP peuvent être nulles
-- On modifie les colonnes pour les rendre nullable
ALTER TABLE team_email_connections
ALTER COLUMN imap_host DROP NOT NULL,
ALTER COLUMN imap_username DROP NOT NULL,
ALTER COLUMN imap_password_encrypted DROP NOT NULL,
ALTER COLUMN smtp_host DROP NOT NULL,
ALTER COLUMN smtp_username DROP NOT NULL,
ALTER COLUMN smtp_password_encrypted DROP NOT NULL;

-- Ajout d'une contrainte CHECK pour s'assurer que les bonnes colonnes sont remplies
-- selon la méthode d'authentification
ALTER TABLE team_email_connections
ADD CONSTRAINT check_auth_method_credentials CHECK (
  (auth_method = 'password' AND imap_host IS NOT NULL AND imap_password_encrypted IS NOT NULL)
  OR
  (auth_method = 'oauth' AND oauth_refresh_token IS NOT NULL)
);

-- ============================================================================
-- 4. Index pour optimisation du refresh automatique
-- ============================================================================

-- Index partiel pour les connexions OAuth avec token expirant bientôt
CREATE INDEX IF NOT EXISTS idx_email_connections_oauth_expiry
ON team_email_connections(oauth_token_expires_at)
WHERE auth_method = 'oauth' AND oauth_token_expires_at IS NOT NULL;

-- ============================================================================
-- 5. Colonne sync_from_date (si non existante)
-- ============================================================================

-- Date à partir de laquelle synchroniser les emails
ALTER TABLE team_email_connections
ADD COLUMN IF NOT EXISTS sync_from_date DATE;

-- ============================================================================
-- 6. Commentaires pour documentation
-- ============================================================================

COMMENT ON COLUMN team_email_connections.auth_method IS
  'Méthode d''authentification: password (IMAP/SMTP classique) ou oauth (Google OAuth 2.0)';

COMMENT ON COLUMN team_email_connections.oauth_access_token IS
  'Access token OAuth chiffré avec AES-256-GCM. Format: iv:authTag:encryptedContent';

COMMENT ON COLUMN team_email_connections.oauth_refresh_token IS
  'Refresh token OAuth chiffré. Utilisé pour obtenir de nouveaux access tokens';

COMMENT ON COLUMN team_email_connections.oauth_token_expires_at IS
  'Date et heure d''expiration de l''access token. Typiquement 1h pour Google';

COMMENT ON COLUMN team_email_connections.oauth_scope IS
  'Scopes OAuth accordés par l''utilisateur (ex: gmail.readonly gmail.send)';

COMMENT ON COLUMN team_email_connections.sync_from_date IS
  'Date à partir de laquelle synchroniser les emails. Par défaut: 30 jours avant connexion';
