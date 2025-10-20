-- ============================================================================
-- SCRIPT DE RESET : Phase 2 Buildings & Lots
-- ============================================================================
-- Date: 2025-10-12
-- Usage: Copier-coller dans Supabase SQL Editor
-- Durée: ~5 minutes
--
-- Ce script supprime Phase 2 et la réinstalle avec les corrections RLS
-- ============================================================================

-- ============================================================================
-- PARTIE 1/2 : SUPPRESSION PHASE 2
-- ============================================================================

-- 1. Supprimer tables Phase 2 (ordre des dépendances)
DROP TABLE IF EXISTS property_documents CASCADE;
DROP TABLE IF EXISTS lot_contacts CASCADE;
DROP TABLE IF EXISTS building_contacts CASCADE;
DROP TABLE IF EXISTS lots CASCADE;
DROP TABLE IF EXISTS buildings CASCADE;

-- 2. Supprimer enums Phase 2
DROP TYPE IF EXISTS document_visibility_level CASCADE;
DROP TYPE IF EXISTS property_document_type CASCADE;
DROP TYPE IF EXISTS lot_category CASCADE;
DROP TYPE IF EXISTS country CASCADE;

-- 3. Supprimer triggers functions Phase 2
DROP FUNCTION IF EXISTS update_building_total_lots() CASCADE;
DROP FUNCTION IF EXISTS update_building_lots_count_from_lot_contacts() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 4. Supprimer fonctions helper RLS Phase 2
DROP FUNCTION IF EXISTS can_view_building(UUID) CASCADE;
DROP FUNCTION IF EXISTS can_view_lot(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_tenant_of_lot(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_lot_team_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_building_team_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS debug_check_building_insert(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_team_manager(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_gestionnaire() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Confirmation
SELECT '✅ Phase 2 supprimée avec succès - Prêt pour réinstallation' AS status;

-- ============================================================================
-- PARTIE 2/2 : RÉINSTALLATION PHASE 2 CORRIGÉE
-- ============================================================================
--
-- ⚠️ IMPORTANT :
-- Après avoir exécuté la PARTIE 1/2 ci-dessus, tu dois :
--
-- 1. Aller dans ton projet local
-- 2. Ouvrir : supabase/migrations/20251010000002_phase2_buildings_lots_documents.sql
-- 3. Copier TOUT le contenu (lignes 1 à 389)
-- 4. Coller dans Supabase SQL Editor
-- 5. Exécuter
--
-- ============================================================================
