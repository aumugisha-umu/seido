-- Migration: 20260328230000_add_whatsapp_intervention_type.sql
-- Description: Add "whatsapp" category + "demande_whatsapp" type for AI WhatsApp agent interventions
-- These can later be reclassified into proper intervention types by the gestionnaire

-- Category: WhatsApp (messages entrants via IA)
INSERT INTO intervention_type_categories (code, label_fr, description_fr, sort_order) VALUES
  ('whatsapp', 'WhatsApp', 'Messages recus via l''assistant WhatsApp IA', 4)
ON CONFLICT (code) DO NOTHING;

-- Type: Demande WhatsApp (default for AI-created interventions)
INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('demande_whatsapp', (SELECT id FROM intervention_type_categories WHERE code = 'whatsapp'), 'Demande WhatsApp', 'Demande recue via WhatsApp — a classifier', 'MessageCircle', 'bg-green-500', 1)
ON CONFLICT (code) DO NOTHING;
