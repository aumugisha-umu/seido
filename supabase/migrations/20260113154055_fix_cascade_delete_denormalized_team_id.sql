-- Migration: Fix CASCADE DELETE on denormalized team_id columns
-- Purpose: Ensure all tables with team_id properly cascade when team is deleted
--
-- Tables affected (from 20251226000001_denormalize_team_id.sql):
-- - conversation_messages
-- - building_contacts
-- - lot_contacts
-- - intervention_time_slots

-- ============================================================================
-- FIX: building_contacts.team_id
-- ============================================================================
ALTER TABLE building_contacts
DROP CONSTRAINT IF EXISTS building_contacts_team_id_fkey;

ALTER TABLE building_contacts
ADD CONSTRAINT building_contacts_team_id_fkey
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================================
-- FIX: lot_contacts.team_id
-- ============================================================================
ALTER TABLE lot_contacts
DROP CONSTRAINT IF EXISTS lot_contacts_team_id_fkey;

ALTER TABLE lot_contacts
ADD CONSTRAINT lot_contacts_team_id_fkey
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================================
-- FIX: conversation_messages.team_id
-- ============================================================================
ALTER TABLE conversation_messages
DROP CONSTRAINT IF EXISTS conversation_messages_team_id_fkey;

ALTER TABLE conversation_messages
ADD CONSTRAINT conversation_messages_team_id_fkey
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================================
-- FIX: intervention_time_slots.team_id
-- ============================================================================
ALTER TABLE intervention_time_slots
DROP CONSTRAINT IF EXISTS intervention_time_slots_team_id_fkey;

ALTER TABLE intervention_time_slots
ADD CONSTRAINT intervention_time_slots_team_id_fkey
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
COMMENT ON CONSTRAINT building_contacts_team_id_fkey ON building_contacts IS
  'Cascade delete when team is deleted (denormalized team_id for RLS optimization)';

COMMENT ON CONSTRAINT lot_contacts_team_id_fkey ON lot_contacts IS
  'Cascade delete when team is deleted (denormalized team_id for RLS optimization)';

COMMENT ON CONSTRAINT conversation_messages_team_id_fkey ON conversation_messages IS
  'Cascade delete when team is deleted (denormalized team_id for RLS optimization)';

COMMENT ON CONSTRAINT intervention_time_slots_team_id_fkey ON intervention_time_slots IS
  'Cascade delete when team is deleted (denormalized team_id for RLS optimization)';
