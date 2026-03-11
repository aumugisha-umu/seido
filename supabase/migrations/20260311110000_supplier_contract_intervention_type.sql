-- ============================================================================
-- MIGRATION: Intervention type for supplier contract notice reminders
-- Date: 2026-03-11
-- ============================================================================

-- Add new category: Contrats fournisseurs
INSERT INTO intervention_type_categories (code, label_fr, description_fr, sort_order) VALUES
  ('contrat_fournisseur', 'Contrats fournisseurs', 'Rappels et gestion des contrats fournisseurs (copropriete, syndic)', 4)
ON CONFLICT (code) DO NOTHING;

-- Add intervention type: Rappel preavis fournisseur
INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('rappel_preavis_fournisseur',
   (SELECT id FROM intervention_type_categories WHERE code = 'contrat_fournisseur'),
   'Rappel preavis fournisseur',
   'Rappel avant la date de preavis d''un contrat fournisseur',
   'BellRing',
   'bg-amber-500',
   1)
ON CONFLICT (code) DO NOTHING;
