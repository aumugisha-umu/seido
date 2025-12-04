-- Migration: Ajouter un champ de description personnalisée pour le rôle "autre"
-- Date: 2025-12-04
-- Description: Permet aux utilisateurs de préciser le type de contact quand ils choisissent "autre"

-- Ajouter le champ custom_role_description à la table users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS custom_role_description VARCHAR(100) DEFAULT NULL;

-- Commentaire pour la documentation
COMMENT ON COLUMN users.custom_role_description IS
  'Description personnalisée du rôle quand provider_category = autre (ex: "Architecte", "Notaire", "Assureur")';
