-- Migration: Add 'import' value to activity enums
-- Purpose: Support activity logging for bulk imports
--
-- This adds 'import' to both enums:
-- - activity_entity_type: to identify import operations as a distinct entity type
-- - activity_action_type: to distinguish bulk imports from individual creates

-- Add 'import' to activity_entity_type
ALTER TYPE activity_entity_type ADD VALUE IF NOT EXISTS 'import';

-- Add 'import' to activity_action_type
ALTER TYPE activity_action_type ADD VALUE IF NOT EXISTS 'import';

-- Documentation
COMMENT ON TYPE activity_entity_type IS 
  'Types d''entites auditees. Inclut ''import'' pour les imports Excel groupes.';

COMMENT ON TYPE activity_action_type IS 
  'Types d''actions auditees. Inclut ''import'' pour distinguer les imports bulk des creations individuelles.';
