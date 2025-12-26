-- ============================================================================
-- Migration: Vues _active pour données non-supprimées
-- Date: 2025-12-26
-- Description: Crée des vues automatiquement filtrées sur deleted_at IS NULL
--              pour simplifier les requêtes et éviter les oublis
-- Impact: Code plus propre, moins de risque d'afficher des données supprimées
-- ============================================================================

-- ============================================================================
-- VUES POUR DONNÉES ACTIVES (Tables Principales)
-- Note: Ces vues héritent automatiquement des politiques RLS des tables source
-- ============================================================================

-- 1. interventions_active
-- Table la plus utilisée - toutes les interventions non supprimées
DROP VIEW IF EXISTS interventions_active;
CREATE VIEW interventions_active AS
SELECT * FROM interventions WHERE deleted_at IS NULL;

COMMENT ON VIEW interventions_active IS
'Vue sur interventions actives (non soft-deleted). Hérite automatiquement des politiques RLS de la table interventions.';

-- 2. buildings_active
-- Immeubles actifs pour les requêtes dashboard et listes
DROP VIEW IF EXISTS buildings_active;
CREATE VIEW buildings_active AS
SELECT * FROM buildings WHERE deleted_at IS NULL;

COMMENT ON VIEW buildings_active IS
'Vue sur immeubles actifs (non soft-deleted). Hérite automatiquement des politiques RLS de la table buildings.';

-- 3. lots_active
-- Lots actifs - inclut les standalone et ceux liés à un immeuble
DROP VIEW IF EXISTS lots_active;
CREATE VIEW lots_active AS
SELECT * FROM lots WHERE deleted_at IS NULL;

COMMENT ON VIEW lots_active IS
'Vue sur lots actifs (non soft-deleted). Inclut lots standalone et nested. Hérite des politiques RLS de la table lots.';

-- 4. contracts_active
-- Contrats actifs pour la gestion locative
DROP VIEW IF EXISTS contracts_active;
CREATE VIEW contracts_active AS
SELECT * FROM contracts WHERE deleted_at IS NULL;

COMMENT ON VIEW contracts_active IS
'Vue sur contrats actifs (non soft-deleted). Hérite automatiquement des politiques RLS de la table contracts.';

-- ============================================================================
-- GRANTS pour accès via Supabase
-- Les vues héritent des permissions RLS, mais on s'assure de l'accès
-- ============================================================================

GRANT SELECT ON interventions_active TO authenticated;
GRANT SELECT ON buildings_active TO authenticated;
GRANT SELECT ON lots_active TO authenticated;
GRANT SELECT ON contracts_active TO authenticated;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

-- Note: Pour utiliser ces vues dans le code TypeScript, vous pouvez les
-- requêter directement via Supabase :
--
-- const { data } = await supabase
--   .from('interventions_active')
--   .select('*')
--
-- Cependant, les types ne seront pas générés automatiquement pour les vues.
-- Vous pouvez continuer à utiliser les tables avec le filtre deleted_at IS NULL
-- si vous avez besoin des types stricts.
