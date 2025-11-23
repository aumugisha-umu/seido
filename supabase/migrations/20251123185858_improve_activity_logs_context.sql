-- ============================================================================
-- Migration: Améliorer Activity Logs avec Contexte Enrichi
-- Date: 2025-11-23 18:58:58
-- ============================================================================
-- Objectif: Ajouter des relations directes et des champs d'affichage enrichis
-- pour rendre les activity logs plus compréhensibles et filtrables
--
-- Problème résolu:
-- - entity_name contient référence technique (INT-XXX) au lieu du titre
-- - Aucune relation directe vers intervention/building/lot
-- - Impossible de filtrer efficacement par patrimoine
-- - Affichage peu informatif dans le journal d'activité
--
-- Solution:
-- - Relations directes: intervention_id, building_id, lot_id
-- - Affichage enrichi: display_title, display_context
-- - Index pour filtrage performant
-- ============================================================================

-- ============================================================================
-- STEP 1: Ajouter colonnes pour relations directes
-- ============================================================================

ALTER TABLE activity_logs 
  ADD COLUMN intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
  ADD COLUMN building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  ADD COLUMN lot_id UUID REFERENCES lots(id) ON DELETE SET NULL;

COMMENT ON COLUMN activity_logs.intervention_id IS 
  'Lien direct vers l''intervention concernée (pour filtrage et affichage contextuel)';
COMMENT ON COLUMN activity_logs.building_id IS 
  'Lien direct vers le bâtiment concerné (pour filtrage par patrimoine)';
COMMENT ON COLUMN activity_logs.lot_id IS 
  'Lien direct vers le lot concerné (pour filtrage par patrimoine)';

-- ============================================================================
-- STEP 2: Ajouter colonnes pour affichage enrichi
-- ============================================================================

ALTER TABLE activity_logs
  ADD COLUMN display_title TEXT,
  ADD COLUMN display_context TEXT;

COMMENT ON COLUMN activity_logs.display_title IS 
  'Titre lisible pour affichage (ex: "Fuite d''eau" au lieu de "INT-251123-OM1F")';
COMMENT ON COLUMN activity_logs.display_context IS 
  'Contexte du patrimoine (ex: "Immeuble 1 - Lot Appartement 1")';

-- ============================================================================
-- STEP 3: Créer index pour filtrage performant
-- ============================================================================

CREATE INDEX idx_activity_logs_intervention 
  ON activity_logs(intervention_id, created_at DESC) 
  WHERE intervention_id IS NOT NULL;

CREATE INDEX idx_activity_logs_building 
  ON activity_logs(building_id, created_at DESC) 
  WHERE building_id IS NOT NULL;

CREATE INDEX idx_activity_logs_lot 
  ON activity_logs(lot_id, created_at DESC) 
  WHERE lot_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Mettre à jour la vue activity_logs_with_user si elle existe
-- ============================================================================

-- Drop et recréer la vue pour inclure les nouveaux champs
DROP VIEW IF EXISTS activity_logs_with_user;

CREATE VIEW activity_logs_with_user AS
SELECT 
  al.*,
  u.name AS user_name,
  u.email AS user_email,
  u.role AS user_role,
  u.avatar_url AS user_avatar_url
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.id;

COMMENT ON VIEW activity_logs_with_user IS 
  'Vue enrichie des activity logs avec informations utilisateur (mise à jour pour inclure nouveaux champs contextuels)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  -- Vérifier que les colonnes ont été ajoutées
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'activity_logs'
    AND column_name IN ('intervention_id', 'building_id', 'lot_id', 'display_title', 'display_context');
  
  IF v_column_count = 5 THEN
    RAISE NOTICE '✅ Les 5 nouvelles colonnes ont été ajoutées avec succès';
  ELSE
    RAISE EXCEPTION '❌ Erreur: seulement % colonnes sur 5 ont été ajoutées', v_column_count;
  END IF;
  
  -- Vérifier que les index ont été créés
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'activity_logs' 
      AND indexname = 'idx_activity_logs_intervention'
  ) THEN
    RAISE NOTICE '✅ Index idx_activity_logs_intervention créé';
  ELSE
    RAISE WARNING '⚠️ Index idx_activity_logs_intervention manquant';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'activity_logs' 
      AND indexname = 'idx_activity_logs_building'
  ) THEN
    RAISE NOTICE '✅ Index idx_activity_logs_building créé';
  ELSE
    RAISE WARNING '⚠️ Index idx_activity_logs_building manquant';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'activity_logs' 
      AND indexname = 'idx_activity_logs_lot'
  ) THEN
    RAISE NOTICE '✅ Index idx_activity_logs_lot créé';
  ELSE
    RAISE WARNING '⚠️ Index idx_activity_logs_lot manquant';
  END IF;
  
  -- Vérifier que la vue a été recréée
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'activity_logs_with_user'
  ) THEN
    RAISE NOTICE '✅ Vue activity_logs_with_user recréée avec succès';
  ELSE
    RAISE WARNING '⚠️ Vue activity_logs_with_user manquante';
  END IF;
END $$;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- Architecture améliorée:
--
-- AVANT:
-- - entity_name = "INT-251123-OM1F" (référence technique illisible)
-- - description = "Intervention créée : INT-251123-OM1F" (peu informatif)
-- - Pas de lien direct vers le patrimoine
-- - Filtrage inefficace
--
-- APRÈS:
-- - entity_name = "INT-251123-OM1F" (gardé pour compatibilité)
-- - display_title = "Fuite d'eau" (titre lisible)
-- - display_context = "Immeuble 1 - Lot Appartement 1" (contexte clair)
-- - description = "Intervention créée : Fuite d'eau" (compréhensible)
-- - intervention_id, building_id, lot_id (filtrage direct)
--
-- Bénéfices:
-- 1. ✅ Affichage lisible dans le journal d'activité
-- 2. ✅ Filtrage efficace par intervention ou patrimoine
-- 3. ✅ Affichage contextuel dans les pages de détail
-- 4. ✅ Cohérence avec le format des notifications
-- 5. ✅ Index performants pour les requêtes
-- 6. ✅ Rétrocompatibilité totale (entity_name conservé)
--
-- Prochaines étapes:
-- 1. Régénérer les types TypeScript: npx supabase gen types typescript
-- 2. Mettre à jour intervention-service.ts logActivity()
-- 3. Mettre à jour activity-log.tsx pour affichage
-- 4. Ajouter filtres dans page notifications
-- ============================================================================

