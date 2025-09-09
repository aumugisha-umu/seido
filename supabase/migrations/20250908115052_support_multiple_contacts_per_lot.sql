-- =============================================================================
-- SUPPORT POUR PLUSIEURS CONTACTS PAR LOT
-- =============================================================================
-- Cette migration restructure le système pour permettre d'associer plusieurs
-- contacts de différents types (locataires, propriétaires, syndics, etc.) à un lot

-- =============================================================================
-- 1. CRÉER LA TABLE DE LIAISON LOT_CONTACTS
-- =============================================================================

-- Table de liaison pour supporter plusieurs contacts par lot
CREATE TABLE IF NOT EXISTS lot_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    contact_type contact_type NOT NULL, -- Utilise l'enum existant (locataire, propriétaire, syndic, etc.)
    is_primary BOOLEAN DEFAULT FALSE, -- Permet de désigner un contact principal par type
    start_date DATE, -- Date de début de relation
    end_date DATE, -- Date de fin de relation (NULL = relation active)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(lot_id, contact_id, contact_type), -- Un contact ne peut pas avoir le même type deux fois pour le même lot
    CHECK(start_date IS NULL OR end_date IS NULL OR end_date > start_date)
);

-- Index pour les performances
CREATE INDEX idx_lot_contacts_lot ON lot_contacts(lot_id);
CREATE INDEX idx_lot_contacts_contact ON lot_contacts(contact_id);
CREATE INDEX idx_lot_contacts_type ON lot_contacts(lot_id, contact_type);
CREATE INDEX idx_lot_contacts_active ON lot_contacts(lot_id, contact_type) WHERE end_date IS NULL;

-- =============================================================================
-- 2. MIGRER LES DONNÉES EXISTANTES
-- =============================================================================

-- Migrer tous les tenant_id existants vers la nouvelle table lot_contacts
-- D'abord, créer les contacts manquants pour les locataires qui n'existent pas encore dans la table contacts
INSERT INTO contacts (id, name, email, contact_type, is_active, created_at)
SELECT 
    u.id,
    u.name,
    u.email,
    'locataire'::contact_type,
    TRUE,
    u.created_at
FROM users u
INNER JOIN lots l ON u.id = l.tenant_id
WHERE l.tenant_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Ensuite, migrer les relations lot-tenant vers lot_contacts
INSERT INTO lot_contacts (lot_id, contact_id, contact_type, is_primary, start_date, created_at)
SELECT 
    l.id as lot_id,
    l.tenant_id as contact_id,
    'locataire'::contact_type,
    TRUE as is_primary, -- Le locataire existant devient le locataire principal
    CURRENT_DATE as start_date,
    l.created_at
FROM lots l
WHERE l.tenant_id IS NOT NULL
ON CONFLICT (lot_id, contact_id, contact_type) DO NOTHING; -- Éviter les doublons

-- =============================================================================
-- 3. FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction pour compter les contacts actifs d'un lot par type
CREATE OR REPLACE FUNCTION count_lot_contacts_by_type(lot_uuid UUID, contact_type_param contact_type)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM lot_contacts 
        WHERE lot_id = lot_uuid 
        AND contact_type = contact_type_param
        AND (end_date IS NULL OR end_date > CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour compter les locataires actifs d'un lot (compatibilité)
CREATE OR REPLACE FUNCTION count_active_tenants(lot_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN count_lot_contacts_by_type(lot_uuid, 'locataire'::contact_type);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le contact principal d'un lot par type
CREATE OR REPLACE FUNCTION get_primary_contact_by_type(lot_uuid UUID, contact_type_param contact_type)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT contact_id
        FROM lot_contacts 
        WHERE lot_id = lot_uuid 
        AND contact_type = contact_type_param
        AND is_primary = TRUE
        AND (end_date IS NULL OR end_date > CURRENT_DATE)
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le locataire principal d'un lot (compatibilité)
CREATE OR REPLACE FUNCTION get_primary_tenant(lot_uuid UUID)
RETURNS UUID AS $$
BEGIN
    RETURN get_primary_contact_by_type(lot_uuid, 'locataire'::contact_type);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. NOUVEAUX TRIGGERS POUR SYNCHRONISATION AUTOMATIQUE
-- =============================================================================

-- Supprimer les anciens triggers
DROP TRIGGER IF EXISTS trigger_sync_lot_occupancy ON lots;
DROP TRIGGER IF EXISTS trigger_set_initial_occupancy ON lots;

-- Fonction trigger pour maintenir is_occupied basé sur lot_contacts (locataires)
CREATE OR REPLACE FUNCTION sync_lot_occupancy_multi_contact()
RETURNS TRIGGER AS $$
DECLARE
    lot_uuid UUID;
    active_tenants_count INTEGER;
    should_process BOOLEAN := FALSE;
BEGIN
    -- Déterminer le lot_id selon l'opération
    IF TG_OP = 'DELETE' THEN
        lot_uuid = OLD.lot_id;
        -- Traiter seulement si c'est un locataire
        should_process = (OLD.contact_type = 'locataire');
    ELSE
        lot_uuid = NEW.lot_id;
        -- Traiter seulement si c'est un locataire
        should_process = (NEW.contact_type = 'locataire');
    END IF;

    -- Ne traiter que les changements de locataires
    IF should_process THEN
        -- Compter les locataires actifs pour ce lot
        SELECT count_active_tenants(lot_uuid) INTO active_tenants_count;

        -- Mettre à jour is_occupied dans la table lots (basé uniquement sur les locataires)
        UPDATE lots 
        SET is_occupied = (active_tenants_count > 0),
            updated_at = NOW()
        WHERE id = lot_uuid;

        -- Log pour debug
        IF active_tenants_count > 0 THEN
            RAISE NOTICE 'Lot % marqué comme occupé (% locataire(s) actif(s))', lot_uuid, active_tenants_count;
        ELSE
            RAISE NOTICE 'Lot % marqué comme vacant (aucun locataire actif)', lot_uuid;
        END IF;
    END IF;

    -- Retourner selon l'opération
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table lot_contacts
CREATE TRIGGER trigger_sync_occupancy_on_contact_change
    AFTER INSERT OR UPDATE OR DELETE ON lot_contacts
    FOR EACH ROW
    EXECUTE FUNCTION sync_lot_occupancy_multi_contact();

-- =============================================================================
-- 5. METTRE À JOUR is_occupied POUR TOUS LES LOTS EXISTANTS
-- =============================================================================

-- Recalculer is_occupied pour tous les lots basé sur lot_contacts (locataires)
UPDATE lots 
SET is_occupied = (
    SELECT count_active_tenants(lots.id) > 0
),
updated_at = NOW();

-- =============================================================================
-- 6. VIEWS POUR SIMPLIFIER LES REQUÊTES
-- =============================================================================

-- Vue pour obtenir les lots avec leurs contacts par type
CREATE OR REPLACE VIEW lots_with_contacts AS
SELECT 
    l.*,
    COALESCE(contact_counts.active_tenants, 0) as active_tenants_count,
    COALESCE(contact_counts.total_tenants, 0) as total_tenants_count,
    COALESCE(contact_counts.active_syndics, 0) as active_syndics_count,
    COALESCE(contact_counts.active_prestataires, 0) as active_prestataires_count,
    COALESCE(contact_counts.active_contacts_total, 0) as active_contacts_total,
    primary_tenant.contact_id as primary_tenant_id,
    primary_tenant_contact.name as primary_tenant_name,
    primary_tenant_contact.email as primary_tenant_email,
    primary_tenant_contact.phone as primary_tenant_phone
FROM lots l
LEFT JOIN (
    SELECT 
        lot_id,
        COUNT(*) FILTER (WHERE contact_type = 'locataire' AND (end_date IS NULL OR end_date > CURRENT_DATE)) as active_tenants,
        COUNT(*) FILTER (WHERE contact_type = 'locataire') as total_tenants,
        COUNT(*) FILTER (WHERE contact_type = 'syndic' AND (end_date IS NULL OR end_date > CURRENT_DATE)) as active_syndics,
        COUNT(*) FILTER (WHERE contact_type = 'prestataire' AND (end_date IS NULL OR end_date > CURRENT_DATE)) as active_prestataires,
        COUNT(*) FILTER (WHERE end_date IS NULL OR end_date > CURRENT_DATE) as active_contacts_total
    FROM lot_contacts
    GROUP BY lot_id
) contact_counts ON l.id = contact_counts.lot_id
LEFT JOIN lot_contacts primary_tenant ON l.id = primary_tenant.lot_id 
    AND primary_tenant.contact_type = 'locataire'
    AND primary_tenant.is_primary = TRUE
    AND (primary_tenant.end_date IS NULL OR primary_tenant.end_date > CURRENT_DATE)
LEFT JOIN contacts primary_tenant_contact ON primary_tenant.contact_id = primary_tenant_contact.id;

-- =============================================================================
-- 7. VÉRIFICATION ET VALIDATION
-- =============================================================================

DO $$
DECLARE
    lots_count INTEGER;
    occupied_count INTEGER;
    vacant_count INTEGER;
    total_contacts INTEGER;
    tenant_contacts INTEGER;
    owner_contacts INTEGER;
    syndic_contacts INTEGER;
    migrated_tenants INTEGER;
BEGIN
    -- Compter les statistiques
    SELECT COUNT(*) INTO lots_count FROM lots;
    SELECT COUNT(*) INTO occupied_count FROM lots WHERE is_occupied = TRUE;
    SELECT COUNT(*) INTO vacant_count FROM lots WHERE is_occupied = FALSE;
    SELECT COUNT(*) INTO total_contacts FROM lot_contacts;
    SELECT COUNT(*) INTO tenant_contacts FROM lot_contacts WHERE contact_type = 'locataire';
    SELECT COUNT(*) INTO owner_contacts FROM lot_contacts WHERE contact_type = 'prestataire';
    SELECT COUNT(*) INTO syndic_contacts FROM lot_contacts WHERE contact_type = 'syndic';
    SELECT COUNT(*) INTO migrated_tenants FROM lot_contacts WHERE contact_type = 'locataire' AND start_date = CURRENT_DATE;

    RAISE NOTICE '📊 MIGRATION VERS SYSTÈME MULTI-CONTACTS:';
    RAISE NOTICE '   - Total des lots: %', lots_count;
    RAISE NOTICE '   - Lots occupés: %', occupied_count;
    RAISE NOTICE '   - Lots vacants: %', vacant_count;
    RAISE NOTICE '   - Total relations contacts: %', total_contacts;
    RAISE NOTICE '   - Relations locataires: %', tenant_contacts;
    RAISE NOTICE '   - Relations prestataires: %', owner_contacts;
    RAISE NOTICE '   - Relations syndics: %', syndic_contacts;
    RAISE NOTICE '   - Locataires migrés aujourd''hui: %', migrated_tenants;
    
    -- Vérifier la cohérence
    IF occupied_count + vacant_count = lots_count THEN
        RAISE NOTICE '✅ Cohérence des statuts d''occupation: OK';
    ELSE
        RAISE WARNING '⚠️  Incohérence détectée dans les statuts d''occupation!';
    END IF;
END $$;

-- =============================================================================
-- 8. COMPATIBILITÉ DESCENDANTE
-- =============================================================================

-- Créer un trigger pour maintenir tenant_id synchronisé avec le locataire principal
-- (pour la compatibilité avec l'ancien code)
CREATE OR REPLACE FUNCTION sync_primary_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
    lot_uuid UUID;
    primary_tenant_uuid UUID;
BEGIN
    -- Déterminer le lot_id
    IF TG_OP = 'DELETE' THEN
        lot_uuid = OLD.lot_id;
    ELSE
        lot_uuid = NEW.lot_id;
    END IF;

    -- Obtenir le locataire principal actuel (seulement pour les contacts de type locataire)
    IF (TG_OP = 'DELETE' AND OLD.contact_type = 'locataire') OR 
       (TG_OP != 'DELETE' AND NEW.contact_type = 'locataire') THEN
        
        SELECT get_primary_tenant(lot_uuid) INTO primary_tenant_uuid;

        -- Mettre à jour tenant_id dans la table lots
        UPDATE lots 
        SET tenant_id = primary_tenant_uuid,
            updated_at = NOW()
        WHERE id = lot_uuid;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour maintenir la compatibilité
CREATE TRIGGER trigger_sync_primary_tenant_id
    AFTER INSERT OR UPDATE OR DELETE ON lot_contacts
    FOR EACH ROW
    EXECUTE FUNCTION sync_primary_tenant_id();

-- =============================================================================
-- 9. FONCTIONS DE SERVICE POUR L'APPLICATION
-- =============================================================================

-- Fonction pour ajouter un contact à un lot
CREATE OR REPLACE FUNCTION add_contact_to_lot(
    p_lot_id UUID,
    p_contact_id UUID,
    p_contact_type contact_type,
    p_is_primary BOOLEAN DEFAULT FALSE,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    -- Si c'est un contact principal, retirer le statut principal des autres contacts du même type
    IF p_is_primary THEN
        UPDATE lot_contacts 
        SET is_primary = FALSE
        WHERE lot_id = p_lot_id 
        AND contact_type = p_contact_type 
        AND is_primary = TRUE;
    END IF;

    -- Insérer le nouveau contact
    INSERT INTO lot_contacts (lot_id, contact_id, contact_type, is_primary, start_date, notes)
    VALUES (p_lot_id, p_contact_id, p_contact_type, p_is_primary, p_start_date, p_notes)
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour retirer un contact d'un lot
CREATE OR REPLACE FUNCTION remove_contact_from_lot(
    p_lot_id UUID,
    p_contact_id UUID,
    p_contact_type contact_type,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE lot_contacts
    SET end_date = p_end_date
    WHERE lot_id = p_lot_id 
    AND contact_id = p_contact_id 
    AND contact_type = p_contact_type
    AND (end_date IS NULL OR end_date > CURRENT_DATE);

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VALIDATION FINALE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SYSTÈME MULTI-CONTACTS ACTIVÉ AVEC SUCCÈS ===';
    RAISE NOTICE 'Utilisez la table lot_contacts pour gérer tous les types de contacts';
    RAISE NOTICE 'Filtrez par contact_type = ''locataire'' pour les locataires';
    RAISE NOTICE 'La colonne tenant_id reste synchronisée pour compatibilité (locataire principal)';
    RAISE NOTICE 'La vue lots_with_contacts simplifie les requêtes complexes';
    RAISE NOTICE 'Fonctions disponibles: add_contact_to_lot(), remove_contact_from_lot()';
END $$;
