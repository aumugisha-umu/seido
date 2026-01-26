-- Migration: 20260125000000_add_revision_charges_type.sql
-- Description: Ajoute le type d'intervention 'revision_charges' manquant
-- Ce type est distinct de 'regularisation_charges':
--   - revision_charges: Indexation annuelle des charges selon l'IRL
--   - regularisation_charges: Décompte annuel charges réelles vs provision

-- ============================================================================
-- Ajouter le type revision_charges dans la catégorie BAIL
-- ============================================================================

INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('revision_charges',
   (SELECT id FROM intervention_type_categories WHERE code = 'bail'),
   'Révision des charges',
   'Indexation annuelle des charges selon l''IRL',
   'TrendingUp',
   'bg-emerald-600',
   5)  -- Position après revision_loyer (4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Réorganiser le sort_order pour les types suivants
-- ============================================================================

-- regularisation_charges passe de 5 à 6
UPDATE intervention_types
SET sort_order = 6
WHERE code = 'regularisation_charges';

-- resiliation_bail passe de 6 à 7
UPDATE intervention_types
SET sort_order = 7
WHERE code = 'resiliation_bail';

-- caution passe de 7 à 8
UPDATE intervention_types
SET sort_order = 8
WHERE code = 'caution';

-- assurance passe de 8 à 9
UPDATE intervention_types
SET sort_order = 9
WHERE code = 'assurance';

-- autre_administratif reste à 99 (fin de liste)

COMMENT ON COLUMN intervention_types.sort_order IS 'Ordre d''affichage dans la catégorie (99 = fin de liste)';
