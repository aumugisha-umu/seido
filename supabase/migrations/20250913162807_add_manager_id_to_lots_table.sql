-- Migration: Ajouter le champ manager_id à la table lots pour le gestionnaire principal
-- Description: Système hybride comme les buildings - manager_id + lot_contacts pour multi-gestionnaires
-- Note: team_id existe déjà dans la table lots, on ajoute seulement manager_id

-- 1. Ajouter le champ manager_id à la table lots (gestionnaire principal)
ALTER TABLE lots 
ADD COLUMN manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Créer un index pour les performances
CREATE INDEX idx_lots_manager ON lots(manager_id);

-- 3. Commentaire pour documenter le champ
COMMENT ON COLUMN lots.manager_id IS 'ID du gestionnaire principal de ce lot (comme buildings.manager_id). Les gestionnaires additionnels sont dans lot_contacts.';

-- 4. Optionnellement, promouvoir un gestionnaire primaire de lot_contacts vers manager_id
UPDATE lots 
SET manager_id = (
  SELECT lc.contact_id 
  FROM lot_contacts lc 
  WHERE lc.lot_id = lots.id 
    AND lc.contact_type = 'gestionnaire' 
    AND lc.is_primary = true
    AND lc.end_date IS NULL
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM lot_contacts lc 
  WHERE lc.lot_id = lots.id 
    AND lc.contact_type = 'gestionnaire' 
    AND lc.is_primary = true
    AND lc.end_date IS NULL
);

-- 5. Log de migration
DO $$
DECLARE
  updated_lots_manager_count INTEGER;
  total_lots_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_lots_count FROM lots;
  SELECT COUNT(*) INTO updated_lots_manager_count FROM lots WHERE manager_id IS NOT NULL;
  
  RAISE NOTICE 'Migration terminée:';
  RAISE NOTICE '  - % lots au total dans la base', total_lots_count;
  RAISE NOTICE '  - % lots ont maintenant un manager_id assigné', updated_lots_manager_count;
  RAISE NOTICE 'Les gestionnaires additionnels restent dans lot_contacts avec contact_type = ''gestionnaire''';
  RAISE NOTICE 'Le champ team_id existait déjà et n''a pas été modifié';
END $$;
