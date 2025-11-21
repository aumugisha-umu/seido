-- ============================================================================
-- MIGRATION: Support contacts société avec TVA et adresse complète
-- Date: 2025-11-04
-- Description:
--   - Ajoute les champs pour structurer l'adresse des sociétés (street, street_number)
--   - Ajoute is_company sur users pour distinguer personne physique vs société
--   - Renomme registration_number en vat_number pour clarté
--   - Crée table company_members pour relation many-to-many (users ↔ companies)
--   - Ajoute is_active sur companies
-- ============================================================================

-- 1. Ajouter les champs manquants sur companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS street VARCHAR(255),
  ADD COLUMN IF NOT EXISTS street_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Renommer registration_number en vat_number pour clarté (optionnel mais recommandé)
-- Si ce champ est utilisé ailleurs, cette étape pourrait causer des breaking changes
-- Dans ce cas, vous pouvez commenter cette ligne et utiliser registration_number comme vat_number
ALTER TABLE companies
  RENAME COLUMN registration_number TO vat_number;

-- 3. Ajouter is_company sur users pour distinguer les types de contacts
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_company BOOLEAN DEFAULT FALSE;

-- 4. Créer table de jonction pour relation many-to-many (users ↔ companies)
-- Cette table permettra à un user d'être lié à plusieurs companies et vice-versa
CREATE TABLE IF NOT EXISTS company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',  -- Rôle dans la société (admin, comptable, commercial, etc.)
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, user_id, team_id)  -- Un user ne peut être membre qu'une fois de la même société dans une équipe
);

-- 5. Ajouter les index pour performance
CREATE INDEX IF NOT EXISTS idx_companies_vat_number ON companies(vat_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_companies_team_id_active ON companies(team_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_company ON users(is_company) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_company_members_company_id ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_team_id ON company_members(team_id);

-- 6. Ajouter les commentaires pour documentation
COMMENT ON COLUMN companies.vat_number IS 'Numéro de TVA de la société (anciennement registration_number)';
COMMENT ON COLUMN companies.street IS 'Nom de la rue de la société';
COMMENT ON COLUMN companies.street_number IS 'Numéro dans la rue';
COMMENT ON COLUMN companies.is_active IS 'Statut actif de la société';
COMMENT ON COLUMN users.is_company IS 'TRUE si ce contact représente une société, FALSE pour personne physique';
COMMENT ON TABLE company_members IS 'Relation many-to-many entre users et companies (plusieurs contacts peuvent appartenir à une société)';

-- 7. Ajouter les politiques RLS pour company_members
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Policy: Les membres d'une équipe peuvent voir les relations company_members de leur équipe
CREATE POLICY "company_members_select" ON company_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = company_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.left_at IS NULL
    )
  );

-- Policy: Les gestionnaires et admins peuvent créer des relations company_members
CREATE POLICY "company_members_insert" ON company_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = company_members.team_id
        AND tm.user_id = auth.uid()
        AND u.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  );

-- Policy: Les gestionnaires et admins peuvent modifier des relations company_members
CREATE POLICY "company_members_update" ON company_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = company_members.team_id
        AND tm.user_id = auth.uid()
        AND u.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  );

-- Policy: Les gestionnaires et admins peuvent supprimer des relations company_members
CREATE POLICY "company_members_delete" ON company_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = company_members.team_id
        AND tm.user_id = auth.uid()
        AND u.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  );

-- 8. Migrer les données existantes : marquer les contacts avec company comme sociétés
-- Les users qui ont un company_id sont probablement des contacts de société
UPDATE users
SET is_company = TRUE
WHERE company_id IS NOT NULL
  AND deleted_at IS NULL;

-- 9. Créer une fonction pour mettre à jour automatiquement updated_at sur company_members
CREATE OR REPLACE FUNCTION update_company_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_members_updated_at
  BEFORE UPDATE ON company_members
  FOR EACH ROW
  EXECUTE FUNCTION update_company_members_updated_at();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
