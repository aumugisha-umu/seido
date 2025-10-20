-- =====================================================================
-- Script de Nettoyage : Équipes Dupliquées lors du Signup
-- =====================================================================
-- Date: 2025-10-11
-- Issue: Duplication d'équipes créées lors du signup
-- Cause: Fichiers obsolètes (lib/auth-actions.ts, /api/signup-complete)
--        créaient des équipes AVANT le trigger DB
--
-- ATTENTION: Ce script supprime les équipes SANS created_by valide
-- Assurez-vous de faire un backup AVANT d'exécuter !
-- =====================================================================

BEGIN;

-- =====================================================================
-- ÉTAPE 1: Identifier les équipes problématiques
-- =====================================================================

SELECT
    id,
    name,
    created_by,
    created_at,
    CASE
        WHEN created_by IS NULL THEN '❌ created_by NULL (problématique)'
        ELSE '✅ created_by valide'
    END as status
FROM teams
WHERE name LIKE '%''s Team'  -- Format "Arthur Umugisha's Team"
ORDER BY name, created_at;

-- =====================================================================
-- ÉTAPE 2: Compter les doublons par utilisateur
-- =====================================================================

SELECT
    name,
    COUNT(*) as count,
    array_agg(id ORDER BY created_at) as team_ids,
    array_agg(created_by) as created_by_ids,
    array_agg(created_at ORDER BY created_at) as created_at_times
FROM teams
WHERE name LIKE '%''s Team'
GROUP BY name
HAVING COUNT(*) > 1;

-- =====================================================================
-- ÉTAPE 3: Supprimer les équipes avec created_by NULL (DRY RUN)
-- =====================================================================
-- Décommenter pour voir ce qui sera supprimé:

-- SELECT id, name, created_by, created_at
-- FROM teams
-- WHERE created_by IS NULL
-- AND name LIKE '%''s Team';

-- =====================================================================
-- ÉTAPE 4: Supprimer effectivement les équipes problématiques
-- =====================================================================
-- ⚠️ ATTENTION: Cette commande SUPPRIME les données
-- Décommenter UNIQUEMENT après avoir vérifié les étapes 1-3:

-- DELETE FROM teams
-- WHERE created_by IS NULL
-- AND name LIKE '%''s Team'
-- RETURNING id, name, created_at;

-- =====================================================================
-- ÉTAPE 5: Vérifier la suppression
-- =====================================================================

-- SELECT
--     name,
--     COUNT(*) as count,
--     array_agg(id ORDER BY created_at) as team_ids,
--     array_agg(created_by) as created_by_ids
-- FROM teams
-- WHERE name LIKE '%''s Team'
-- GROUP BY name;

ROLLBACK;  -- ✅ ROLLBACK par défaut pour sécurité

-- =====================================================================
-- POUR EXÉCUTER RÉELLEMENT:
-- =====================================================================
-- 1. Remplacer ROLLBACK par COMMIT
-- 2. Décommenter l'ÉTAPE 4 (DELETE FROM teams...)
-- 3. Exécuter le script dans Supabase SQL Editor
-- =====================================================================

-- =====================================================================
-- ALTERNATIVE: Supprimer manuellement via Supabase Dashboard
-- =====================================================================
-- 1. Aller dans Supabase Dashboard > Table Editor > teams
-- 2. Filtrer: created_by = NULL
-- 3. Supprimer les lignes avec created_by NULL uniquement
-- 4. Garder celles avec created_by valide (UUID)
-- =====================================================================
