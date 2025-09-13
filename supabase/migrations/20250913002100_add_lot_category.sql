-- Migration pour ajouter la catégorisation des lots
-- Date: 2025-09-13 00:21:00

-- =============================================================================
-- 1. CRÉER L'ENUM POUR LES CATÉGORIES DE LOTS
-- =============================================================================

-- Créer le type enum pour les catégories de lots
DO $$ BEGIN
    CREATE TYPE lot_category AS ENUM (
        'appartement',
        'collocation',
        'maison',
        'garage',
        'local_commercial',
        'parking',
        'autre'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 2. SUPPRIMER LA VUE QUI DÉPEND DE LA TABLE LOTS
-- =============================================================================

-- Supprimer la vue lots_with_contacts temporairement
DROP VIEW IF EXISTS lots_with_contacts;

-- =============================================================================
-- 3. AJOUTER LA COLONNE CATEGORY À LA TABLE LOTS
-- =============================================================================

-- Ajouter la colonne category avec une valeur par défaut
ALTER TABLE lots 
ADD COLUMN IF NOT EXISTS category lot_category DEFAULT 'appartement';

-- =============================================================================
-- 4. RECRÉER LA VUE AVEC LA NOUVELLE COLONNE
-- =============================================================================

-- Recréer la vue lots_with_contacts avec la nouvelle colonne category
CREATE OR REPLACE VIEW lots_with_contacts AS
SELECT 
    l.id,
    l.building_id,
    l.reference,
    l.floor,
    l.apartment_number,
    l.surface_area,
    l.rooms,
    l.is_occupied,
    l.tenant_id,
    l.charges_amount,
    l.category,
    l.created_at,
    l.updated_at,
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
-- 5. CRÉER UN INDEX POUR LES PERFORMANCES
-- =============================================================================

-- Créer un index sur la colonne category pour optimiser les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_lots_category ON lots(category);

-- =============================================================================
-- 6. COMMENTAIRES ET DOCUMENTATION
-- =============================================================================

-- Commenter la colonne pour la documentation
COMMENT ON COLUMN lots.category IS 'Catégorie du lot: appartement, collocation, maison, garage, local_commercial, parking, autre';
COMMENT ON TYPE lot_category IS 'Type énuméré pour les catégories de lots disponibles dans l''application';
