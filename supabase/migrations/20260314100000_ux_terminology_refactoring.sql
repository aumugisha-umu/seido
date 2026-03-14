-- Migration: 20260314100000_ux_terminology_refactoring.sql
-- Description: UX terminology refactoring
--   1. Update intervention_type_categories labels (Bien→Interventions, Bail→Gestion locative, Locataire→Demandes)
--   2. Add "Rappel" category with 6 types
--   3. Expand provider_category enum with 5 new values

-- ============================================================================
-- STEP 1: Update intervention category labels
-- ============================================================================

UPDATE intervention_type_categories SET label_fr = 'Interventions', description_fr = 'Interventions techniques sur le patrimoine immobilier' WHERE code = 'bien';
UPDATE intervention_type_categories SET label_fr = 'Gestion locative', description_fr = 'Gestion des baux et démarches administratives' WHERE code = 'bail';
UPDATE intervention_type_categories SET label_fr = 'Demandes', description_fr = 'Demandes et communication avec les locataires' WHERE code = 'locataire';

-- ============================================================================
-- STEP 2: Add "Rappel" category
-- ============================================================================

INSERT INTO intervention_type_categories (code, label_fr, description_fr, sort_order)
VALUES ('rappel', 'Rappels', 'Rappels et échéances à suivre', 4)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 3: Add rappel types
-- ============================================================================

INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('rappel_renouvellement_bail', (SELECT id FROM intervention_type_categories WHERE code = 'rappel'), 'Renouvellement de bail', 'Rappel d''échéance de renouvellement', 'CalendarClock', 'bg-violet-500', 1),
  ('rappel_assurance', (SELECT id FROM intervention_type_categories WHERE code = 'rappel'), 'Échéance assurance', 'Rappel renouvellement assurance', 'ShieldAlert', 'bg-blue-500', 2),
  ('rappel_controle_periodique', (SELECT id FROM intervention_type_categories WHERE code = 'rappel'), 'Contrôle périodique', 'Vérifications obligatoires (chaudière, électricité...)', 'ClipboardCheck', 'bg-amber-500', 3),
  ('rappel_revision_loyer', (SELECT id FROM intervention_type_categories WHERE code = 'rappel'), 'Révision de loyer', 'Rappel de date de révision', 'TrendingUp', 'bg-green-500', 4),
  ('rappel_fin_preavis', (SELECT id FROM intervention_type_categories WHERE code = 'rappel'), 'Fin de préavis', 'Rappel d''échéance de préavis', 'Clock', 'bg-orange-500', 5),
  ('rappel_personnalise', (SELECT id FROM intervention_type_categories WHERE code = 'rappel'), 'Rappel personnalisé', 'Rappel libre défini par le gestionnaire', 'BellRing', 'bg-purple-500', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 4: Expand provider_category enum
-- ============================================================================

ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'artisan';
ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'services';
ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'energie';
ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'administration';
ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'juridique';
