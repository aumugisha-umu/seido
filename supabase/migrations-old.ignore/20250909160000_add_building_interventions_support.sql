-- =============================================================================
-- SUPPORT DES INTERVENTIONS AU NIVEAU BÂTIMENT
-- =============================================================================
-- Cette migration permet aux interventions d'être liées soit à un lot spécifique,
-- soit à un bâtiment entier, résolvant la problématique des interventions 
-- bâtiment-wide qui étaient incorrectement assignées au premier lot.
-- =============================================================================

-- =============================================================================
-- 1. MODIFICATION DE LA TABLE INTERVENTIONS
-- =============================================================================

-- Rendre lot_id nullable pour permettre les interventions au niveau bâtiment
ALTER TABLE interventions 
ALTER COLUMN lot_id DROP NOT NULL;

-- Ajouter une colonne building_id pour les interventions au niveau bâtiment
ALTER TABLE interventions 
ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE CASCADE;

-- =============================================================================
-- 2. CONTRAINTES ET INDEX
-- =============================================================================

-- Ajouter une contrainte pour s'assurer qu'une intervention est liée soit à un lot, soit à un bâtiment
-- (mais pas aux deux, et pas à aucun des deux)
ALTER TABLE interventions 
ADD CONSTRAINT check_intervention_location 
CHECK (
    (lot_id IS NOT NULL AND building_id IS NULL) OR 
    (lot_id IS NULL AND building_id IS NOT NULL)
);

-- Ajouter un index sur building_id pour les performances
CREATE INDEX idx_interventions_building ON interventions(building_id);

-- =============================================================================
-- 3. FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction pour obtenir le bâtiment d'une intervention (soit direct, soit via le lot)
CREATE OR REPLACE FUNCTION get_intervention_building_id(intervention_uuid UUID)
RETURNS UUID AS $$
DECLARE
    building_uuid UUID;
BEGIN
    SELECT 
        CASE 
            WHEN i.building_id IS NOT NULL THEN i.building_id
            WHEN i.lot_id IS NOT NULL THEN l.building_id
            ELSE NULL
        END
    INTO building_uuid
    FROM interventions i
    LEFT JOIN lots l ON i.lot_id = l.id
    WHERE i.id = intervention_uuid;
    
    RETURN building_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si une intervention concerne un bâtiment entier ou un lot spécifique
CREATE OR REPLACE FUNCTION is_building_wide_intervention(intervention_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_building_wide BOOLEAN;
BEGIN
    SELECT (building_id IS NOT NULL AND lot_id IS NULL)
    INTO is_building_wide
    FROM interventions
    WHERE id = intervention_uuid;
    
    RETURN COALESCE(is_building_wide, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 4. MIGRATION DES DONNÉES EXISTANTES (Si nécessaire)
-- =============================================================================

-- Les interventions existantes restent inchangées (elles ont déjà un lot_id)
-- Aucune migration de données n'est nécessaire

-- =============================================================================
-- 5. MISE À JOUR DES TRIGGERS ET FONCTIONS
-- =============================================================================

-- Mettre à jour la fonction de génération de référence si elle dépend de lot_id
-- (Dans notre cas, elle ne dépend pas du lot_id, donc pas de modification nécessaire)

-- =============================================================================
-- 6. VALIDATION ET COMMENTAIRES
-- =============================================================================

DO $$
BEGIN
    -- Vérifier que la contrainte est bien ajoutée
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_intervention_location' 
        AND table_name = 'interventions'
    ) THEN
        RAISE NOTICE '✅ Contrainte check_intervention_location ajoutée avec succès';
    END IF;
    
    -- Vérifier que la colonne building_id est ajoutée
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interventions' 
        AND column_name = 'building_id'
    ) THEN
        RAISE NOTICE '✅ Colonne building_id ajoutée à la table interventions';
    END IF;
    
    -- Vérifier que lot_id est maintenant nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'interventions' 
        AND column_name = 'lot_id' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✅ Colonne lot_id rendue nullable';
    END IF;
    
    RAISE NOTICE '=== SUPPORT DES INTERVENTIONS BÂTIMENT AJOUTÉ AVEC SUCCÈS ===';
    RAISE NOTICE 'Les interventions peuvent maintenant être:';
    RAISE NOTICE '  - Liées à un lot spécifique (lot_id NOT NULL, building_id NULL)';
    RAISE NOTICE '  - Liées à un bâtiment entier (building_id NOT NULL, lot_id NULL)';
END $$;
