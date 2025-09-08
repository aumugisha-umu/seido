-- =============================================================================
-- CORRECTION DU PROBLÈME DE SYNCHRONISATION is_occupied / tenant_id
-- =============================================================================
-- Cette migration corrige le problème où la colonne is_occupied n'est pas
-- automatiquement synchronisée avec la présence d'un tenant_id

-- =============================================================================
-- 1. CORRIGER LES DONNÉES EXISTANTES
-- =============================================================================

DO $$
BEGIN
    -- Mettre à jour is_occupied = TRUE pour tous les lots qui ont un tenant_id
    UPDATE lots 
    SET is_occupied = TRUE 
    WHERE tenant_id IS NOT NULL AND is_occupied = FALSE;

    -- Mettre à jour is_occupied = FALSE pour tous les lots qui n'ont pas de tenant_id
    UPDATE lots 
    SET is_occupied = FALSE 
    WHERE tenant_id IS NULL AND is_occupied = TRUE;

    RAISE NOTICE '✅ Données existantes synchronisées: is_occupied mis à jour selon tenant_id';
END $$;

-- =============================================================================
-- 2. CRÉER UN TRIGGER DE SYNCHRONISATION AUTOMATIQUE
-- =============================================================================

-- Fonction trigger pour maintenir la synchronisation
CREATE OR REPLACE FUNCTION sync_lot_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    -- Si on assigne un tenant_id, marquer comme occupé
    IF NEW.tenant_id IS NOT NULL AND OLD.tenant_id IS NULL THEN
        NEW.is_occupied = TRUE;
        RAISE NOTICE 'Lot % marqué comme occupé (tenant assigné)', NEW.reference;
    END IF;

    -- Si on retire un tenant_id, marquer comme vacant
    IF NEW.tenant_id IS NULL AND OLD.tenant_id IS NOT NULL THEN
        NEW.is_occupied = FALSE;
        RAISE NOTICE 'Lot % marqué comme vacant (tenant retiré)', NEW.reference;
    END IF;

    -- Si on change de tenant, s'assurer que is_occupied reste TRUE
    IF NEW.tenant_id IS NOT NULL AND OLD.tenant_id IS NOT NULL AND NEW.tenant_id != OLD.tenant_id THEN
        NEW.is_occupied = TRUE;
        RAISE NOTICE 'Lot % reste occupé (tenant changé)', NEW.reference;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_lot_occupancy ON lots;
CREATE TRIGGER trigger_sync_lot_occupancy
    BEFORE UPDATE OF tenant_id ON lots
    FOR EACH ROW
    EXECUTE FUNCTION sync_lot_occupancy();

-- =============================================================================
-- 3. TRIGGER POUR LES NOUVEAUX LOTS
-- =============================================================================

-- Fonction trigger pour les nouvelles insertions
CREATE OR REPLACE FUNCTION set_initial_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    -- Définir is_occupied selon la présence de tenant_id lors de l'insertion
    NEW.is_occupied = (NEW.tenant_id IS NOT NULL);
    
    IF NEW.tenant_id IS NOT NULL THEN
        RAISE NOTICE 'Nouveau lot % créé comme occupé', NEW.reference;
    ELSE
        RAISE NOTICE 'Nouveau lot % créé comme vacant', NEW.reference;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour les insertions
DROP TRIGGER IF EXISTS trigger_set_initial_occupancy ON lots;
CREATE TRIGGER trigger_set_initial_occupancy
    BEFORE INSERT ON lots
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_occupancy();

-- =============================================================================
-- 4. VÉRIFICATION
-- =============================================================================

DO $$
DECLARE
    lots_count INTEGER;
    occupied_count INTEGER;
    vacant_count INTEGER;
    inconsistent_count INTEGER;
BEGIN
    -- Compter les lots
    SELECT COUNT(*) INTO lots_count FROM lots;
    
    -- Compter les lots occupés
    SELECT COUNT(*) INTO occupied_count FROM lots WHERE is_occupied = TRUE;
    
    -- Compter les lots vacants
    SELECT COUNT(*) INTO vacant_count FROM lots WHERE is_occupied = FALSE;
    
    -- Vérifier les incohérences
    SELECT COUNT(*) INTO inconsistent_count 
    FROM lots 
    WHERE (tenant_id IS NOT NULL AND is_occupied = FALSE) 
       OR (tenant_id IS NULL AND is_occupied = TRUE);

    RAISE NOTICE '📊 ÉTAT APRÈS CORRECTION:';
    RAISE NOTICE '   - Total des lots: %', lots_count;
    RAISE NOTICE '   - Lots occupés: %', occupied_count;
    RAISE NOTICE '   - Lots vacants: %', vacant_count;
    RAISE NOTICE '   - Incohérences détectées: %', inconsistent_count;
    
    IF inconsistent_count > 0 THEN
        RAISE WARNING '⚠️  Des incohérences persistent! Vérification manuelle requise.';
    ELSE
        RAISE NOTICE '✅ Tous les lots sont maintenant cohérents!';
    END IF;
END $$;

-- =============================================================================
-- VALIDATION FINALE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== CORRECTION OCCUPANCY SYNCHRONISATION TERMINÉE ===';
    RAISE NOTICE 'Les triggers automatiques maintiendront désormais la cohérence';
    RAISE NOTICE 'entre is_occupied et tenant_id pour tous les lots.';
END $$;
