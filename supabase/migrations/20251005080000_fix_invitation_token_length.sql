-- =============================================================================
-- MIGRATION: Fix user_invitations.invitation_code length for Supabase hashed_token
-- =============================================================================
-- Date: 2025-10-05 08:00:00
-- Purpose:
--   1. Rename invitation_code → invitation_token (better naming)
--   2. Increase VARCHAR(50) → VARCHAR(255) to store Supabase hashed_token
--   3. Add index for token-based validation in callback
--
-- Context:
--   - Supabase generateLink() returns hashed_token (64+ chars)
--   - Current VARCHAR(50) causes "value too long" error
--   - invitation_token used for pre-session validation in /auth/callback
--   - auth_user_id retrieved via JOIN with users table (no duplication)
-- =============================================================================

-- Renommer invitation_code en invitation_token pour clarté
ALTER TABLE user_invitations
  RENAME COLUMN invitation_code TO invitation_token;

-- Agrandir pour stocker le hashed_token complet de Supabase
ALTER TABLE user_invitations
  ALTER COLUMN invitation_token TYPE VARCHAR(255);

-- Rendre nullable (invitations existantes n'ont pas de token valide)
ALTER TABLE user_invitations
  ALTER COLUMN invitation_token DROP NOT NULL;

-- Ajouter index pour recherche par token (validation callback)
CREATE INDEX IF NOT EXISTS idx_user_invitations_token
  ON user_invitations(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- Index sur user_id déjà existant (FK standard)
-- Utilisé pour jointure vers users.auth_user_id

-- Commentaire pour documentation
COMMENT ON COLUMN user_invitations.invitation_token IS
  'Hashed token from Supabase generateLink() - used for pre-session validation in callback. To get auth_user_id for revocation, join with users table via user_id.';

-- Log de migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: user_invitations.invitation_token now VARCHAR(255)';
  RAISE NOTICE '📊 Index added: idx_user_invitations_token for fast token lookup';
  RAISE NOTICE '🔗 To get auth_user_id: JOIN user_invitations.user_id → users.auth_user_id';
END $$;
