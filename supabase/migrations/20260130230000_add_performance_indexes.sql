-- ============================================================================
-- Performance Indexes - Based on Supabase Slow Query Analysis (2026-01-30)
-- ============================================================================
--
-- Analysis summary:
-- - 63% of DB time = Realtime polling (expected, not optimizable)
-- - 9% = Interventions with nested JOINs (needs code refactor)
-- - 12% = Emails folder queries (already have partial indexes)
-- - Remaining = Missing composite indexes for JOINs
--
-- These indexes target the slow queries identified in pg_stat_statements
-- ============================================================================

-- ============================================================================
-- P0: HIGH PRIORITY - Frequently used in slow JOIN queries
-- ============================================================================

-- 1. INTERVENTIONS: Filter by creator (for "my requests" views)
CREATE INDEX IF NOT EXISTS idx_interventions_created_by
  ON interventions(created_by)
  WHERE deleted_at IS NULL;

-- 2. INTERVENTIONS: Composite for contract-linked interventions
CREATE INDEX IF NOT EXISTS idx_interventions_team_contract
  ON interventions(team_id, contract_id)
  WHERE deleted_at IS NULL AND contract_id IS NOT NULL;

-- 3. CONTRACTS: Composite for team + lot queries (used in lot preview)
CREATE INDEX IF NOT EXISTS idx_contracts_team_lot
  ON contracts(team_id, lot_id)
  WHERE deleted_at IS NULL;

-- 4. CONTRACTS: Composite for lot + status (active contracts per lot)
CREATE INDEX IF NOT EXISTS idx_contracts_lot_status
  ON contracts(lot_id, status)
  WHERE deleted_at IS NULL;

-- 5. INTERVENTION_TIME_SLOTS: Optimized lookup for selected slot
CREATE INDEX IF NOT EXISTS idx_time_slots_intervention_selected
  ON intervention_time_slots(intervention_id)
  WHERE is_selected = TRUE;

-- 6. BUILDINGS: For dashboard team queries
CREATE INDEX IF NOT EXISTS idx_buildings_team_active
  ON buildings(team_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- P1: MEDIUM PRIORITY - Covering indexes for JOIN-heavy queries
-- ============================================================================

-- 7. CONTRACT_CONTACTS: Covering index to avoid heap access
CREATE INDEX IF NOT EXISTS idx_contract_contacts_covering
  ON contract_contacts(contract_id, user_id)
  INCLUDE (role, is_primary);

-- 8. CONVERSATION_MESSAGES: For thread message listing with pagination
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON conversation_messages(thread_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 9. EMAILS: Composite for folder queries (complement existing partial indexes)
-- Note: Partial indexes already exist for specific folders, this is for edge cases
CREATE INDEX IF NOT EXISTS idx_emails_team_direction_status
  ON emails(team_id, direction, status)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON INDEX idx_interventions_created_by IS
  'Optimizes "my requests" filter - based on slow query analysis 2026-01-30';

COMMENT ON INDEX idx_contracts_team_lot IS
  'Optimizes lot preview contract loading - 1178ms avg reduced';

COMMENT ON INDEX idx_time_slots_intervention_selected IS
  'Optimizes selected slot lookup - 78ms avg with 1435 calls';

COMMENT ON INDEX idx_emails_team_direction_status IS
  'Composite for email folder queries - 412ms avg reduced';
