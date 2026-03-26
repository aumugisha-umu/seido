-- ============================================================================
-- MIGRATION: Operations Phase 1 — Reminders + Recurrence System
-- Date: 2026-03-19
-- Description: Tables for reminders (rappels) and RRULE-based recurrence engine
-- Design: docs/plans/2026-03-19-operations-unified-tasks-design.md
-- ============================================================================

-- ============================================================================
-- SECTION 1: RECURRENCE TABLES (created first — referenced by reminders)
-- ============================================================================

-- Table: recurrence rules (RRULE RFC 5545)
CREATE TABLE recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- RRULE RFC 5545
  rrule TEXT NOT NULL,
  dtstart TIMESTAMPTZ NOT NULL,

  -- Source entity (polymorphe — extensible for interventions in Phase 2)
  source_type TEXT NOT NULL,
  source_template JSONB NOT NULL,

  -- Config
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_days_before INTEGER NOT NULL DEFAULT 14,
  auto_create BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurrence_rules
  ADD CONSTRAINT recurrence_rules_valid_source_type
  CHECK (source_type IN ('intervention', 'reminder'));

-- Table: recurrence occurrences (individual generated instances)
CREATE TABLE recurrence_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES recurrence_rules(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Instance
  occurrence_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  -- Link to generated entity (filled after confirmation/auto-create)
  generated_entity_type TEXT,
  generated_entity_id UUID,

  -- Metadata
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurrence_occurrences
  ADD CONSTRAINT recurrence_occurrences_valid_status
  CHECK (status IN ('pending', 'notified', 'confirmed', 'skipped', 'overdue'));

ALTER TABLE recurrence_occurrences
  ADD CONSTRAINT recurrence_occurrences_valid_entity_type
  CHECK (generated_entity_type IS NULL OR generated_entity_type IN ('intervention', 'reminder'));

-- ============================================================================
-- SECTION 2: REMINDERS TABLE
-- ============================================================================

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normale',
  status TEXT NOT NULL DEFAULT 'en_attente',

  -- Entity links (optional, max 1)
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES users(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES supplier_contracts(id) ON DELETE SET NULL,

  -- Schedule
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Assignment (gestionnaire only)
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Recurrence (links to RRULE system)
  recurrence_rule_id UUID REFERENCES recurrence_rules(id) ON DELETE SET NULL,
  parent_occurrence_id UUID REFERENCES recurrence_occurrences(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Constraints
ALTER TABLE reminders
  ADD CONSTRAINT reminders_valid_priority
  CHECK (priority IN ('basse', 'normale', 'haute'));

ALTER TABLE reminders
  ADD CONSTRAINT reminders_valid_status
  CHECK (status IN ('en_attente', 'en_cours', 'termine', 'annule'));

ALTER TABLE reminders
  ADD CONSTRAINT reminders_single_entity
  CHECK (num_nonnulls(building_id, lot_id, contact_id, contract_id) <= 1);

-- ============================================================================
-- SECTION 3: INDEXES
-- ============================================================================

-- Reminders
CREATE INDEX idx_reminders_team_id
  ON reminders(team_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_reminders_due_date
  ON reminders(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;

CREATE INDEX idx_reminders_assigned_to
  ON reminders(assigned_to) WHERE deleted_at IS NULL AND assigned_to IS NOT NULL;

CREATE INDEX idx_reminders_status
  ON reminders(team_id, status) WHERE deleted_at IS NULL;

CREATE INDEX idx_reminders_recurrence_rule
  ON reminders(recurrence_rule_id) WHERE recurrence_rule_id IS NOT NULL;

-- Recurrence rules
CREATE INDEX idx_recurrence_rules_team_active
  ON recurrence_rules(team_id) WHERE is_active = true;

CREATE INDEX idx_recurrence_rules_source
  ON recurrence_rules(source_type, is_active) WHERE is_active = true;

-- Recurrence occurrences
CREATE INDEX idx_recurrence_occurrences_rule
  ON recurrence_occurrences(rule_id);

CREATE INDEX idx_recurrence_occurrences_pending
  ON recurrence_occurrences(occurrence_date, status) WHERE status = 'pending';

CREATE INDEX idx_recurrence_occurrences_team
  ON recurrence_occurrences(team_id);

-- ============================================================================
-- SECTION 4: TRIGGERS (updated_at)
-- ============================================================================

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER recurrence_rules_updated_at
  BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 5: RLS POLICIES
-- ============================================================================

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_occurrences ENABLE ROW LEVEL SECURITY;

-- ----- reminders -----

CREATE POLICY reminders_select ON reminders
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
    )
  );

CREATE POLICY reminders_insert ON reminders
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
  );

CREATE POLICY reminders_update ON reminders
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND (is_admin() OR is_team_manager(team_id))
  )
  WITH CHECK (
    is_admin() OR is_team_manager(team_id)
  );

CREATE POLICY reminders_delete ON reminders
  FOR DELETE TO authenticated
  USING (
    is_admin() OR is_team_manager(team_id)
  );

-- ----- recurrence_rules -----

CREATE POLICY recurrence_rules_select ON recurrence_rules
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
  );

CREATE POLICY recurrence_rules_insert ON recurrence_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
  );

CREATE POLICY recurrence_rules_update ON recurrence_rules
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_team_manager(team_id))
  WITH CHECK (is_admin() OR is_team_manager(team_id));

CREATE POLICY recurrence_rules_delete ON recurrence_rules
  FOR DELETE TO authenticated
  USING (is_admin() OR is_team_manager(team_id));

-- ----- recurrence_occurrences -----

CREATE POLICY recurrence_occurrences_select ON recurrence_occurrences
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
  );

CREATE POLICY recurrence_occurrences_insert ON recurrence_occurrences
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (is_gestionnaire() AND user_belongs_to_team_v2(team_id))
  );

CREATE POLICY recurrence_occurrences_update ON recurrence_occurrences
  FOR UPDATE TO authenticated
  USING (is_admin() OR is_team_manager(team_id))
  WITH CHECK (is_admin() OR is_team_manager(team_id));

-- ============================================================================
-- SECTION 6: RPC — Batch recurrence scan (SECURITY DEFINER for cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION scan_pending_recurrences(look_ahead_days INTEGER DEFAULT 14)
RETURNS TABLE (
  rule_id UUID,
  team_id UUID,
  source_type TEXT,
  source_template JSONB,
  occurrence_id UUID,
  occurrence_date TIMESTAMPTZ,
  notify_days_before INTEGER,
  auto_create BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS rule_id,
    r.team_id,
    r.source_type,
    r.source_template,
    o.id AS occurrence_id,
    o.occurrence_date,
    r.notify_days_before,
    r.auto_create
  FROM recurrence_rules r
  INNER JOIN recurrence_occurrences o ON o.rule_id = r.id
  WHERE r.is_active = true
    AND o.status = 'pending'
    AND o.occurrence_date <= now() + (look_ahead_days || ' days')::interval
  ORDER BY o.occurrence_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION scan_pending_recurrences TO authenticated;

COMMENT ON FUNCTION scan_pending_recurrences IS
  'Batch scan of pending recurrence occurrences within look-ahead window. Used by Vercel Cron. SECURITY DEFINER to bypass RLS for cross-team scan.';

-- ============================================================================
-- SECTION 7: GRANTS
-- ============================================================================

GRANT ALL ON reminders TO authenticated;
GRANT ALL ON recurrence_rules TO authenticated;
GRANT ALL ON recurrence_occurrences TO authenticated;
