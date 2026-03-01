-- Migration: 20260228100000_add_rappel_loyer_type.sql
-- Description: Add rappel_loyer intervention type for monthly rent payment reminders

INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('rappel_loyer', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Rappel de loyer', 'Rappel mensuel de paiement du loyer', 'Banknote', 'bg-emerald-600', 10)
ON CONFLICT (code) DO NOTHING;
