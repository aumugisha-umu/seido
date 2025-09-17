-- Migration pour supprimer les champs loyer et dépôt de garantie des lots
-- Date: 2025-09-11 12:15:00

-- =============================================================================
-- 1. SUPPRIMER LA VUE QUI DÉPEND DES COLONNES
-- =============================================================================

-- Supprimer la vue lots_with_contacts car elle utilise SELECT l.* 
-- qui inclut rent_amount et deposit_amount
DROP VIEW IF EXISTS lots_with_contacts;

-- =============================================================================
-- 2. SUPPRIMER LES COLONNES DE LA TABLE LOTS
-- =============================================================================

-- Supprimer les colonnes rent_amount et deposit_amount de la table lots
ALTER TABLE lots 
DROP COLUMN IF EXISTS rent_amount,
DROP COLUMN IF EXISTS deposit_amount;

-- =============================================================================
-- 3. RECRÉER LA VUE SANS LES COLONNES SUPPRIMÉES
-- =============================================================================

-- Recréer la vue lots_with_contacts avec les colonnes explicites (sans rent_amount/deposit_amount)
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
