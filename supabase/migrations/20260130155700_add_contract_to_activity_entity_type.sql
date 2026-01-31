-- Migration: Add "contract" to activity_entity_type enum
-- Required for tracking contract activity logs

-- Add contract value to enum (IF NOT EXISTS prevents error if already present)
ALTER TYPE activity_entity_type ADD VALUE IF NOT EXISTS 'contract';

-- Verify the enum now includes contract
COMMENT ON TYPE activity_entity_type IS
'Entity types that can have activity logs. Includes: user, team, building, lot, intervention, document, contact, notification, message, quote, report, import, contract';
