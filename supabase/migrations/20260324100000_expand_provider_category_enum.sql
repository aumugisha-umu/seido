-- Add missing provider_category enum values to match UI form options
-- Current DB values: prestataire, autre, artisan, services, energie, administration, juridique
-- Missing from UI: assurance, notaire, syndic

ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'assurance';
ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'notaire';
ALTER TYPE provider_category ADD VALUE IF NOT EXISTS 'syndic';
