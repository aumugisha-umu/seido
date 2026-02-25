-- Add Belgian-specific document types to property_document_type enum
-- These cover mandatory and optional documents for lots and buildings
-- in Belgian residential rental properties (Wallonia, Brussels, Flanders)

ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'certificat_peb';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'conformite_electrique';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'conformite_gaz';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'detecteurs_fumee';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'entretien_chaudiere';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'controle_ascenseur';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'citerne_mazout';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'inventaire_amiante';
ALTER TYPE property_document_type ADD VALUE IF NOT EXISTS 'audit_energetique';
