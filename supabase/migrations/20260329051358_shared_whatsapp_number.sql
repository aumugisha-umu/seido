-- Migration: Shared WhatsApp Number
-- Allows multiple teams to share a single Seido WhatsApp number.
-- Adds identified_via tracking and nullable team_id for orphan sessions.

-- ============================================================================
-- 1. Drop UNIQUE constraint on ai_phone_numbers.team_id
--    Was: CONSTRAINT uq_ai_phone_numbers_team UNIQUE (team_id)
--    Now: multiple teams can reference the same phone number row
-- ============================================================================
ALTER TABLE ai_phone_numbers
  DROP CONSTRAINT uq_ai_phone_numbers_team;

-- ============================================================================
-- 2. Add identified_via to ai_whatsapp_sessions
--    Tracks how the contact was routed to a team
-- ============================================================================
ALTER TABLE ai_whatsapp_sessions
  ADD COLUMN IF NOT EXISTS identified_via TEXT DEFAULT 'phone_match'
    CONSTRAINT valid_identified_via CHECK (
      identified_via IN ('phone_match', 'address_match', 'agency_match', 'disambiguation', 'orphan')
    );

COMMENT ON COLUMN ai_whatsapp_sessions.identified_via
  IS 'How the contact was identified: phone_match, address_match, agency_match, disambiguation, orphan';

-- ============================================================================
-- 3. Make team_id nullable for orphan tickets (unknown contacts)
-- ============================================================================
ALTER TABLE ai_whatsapp_sessions
  ALTER COLUMN team_id DROP NOT NULL;

-- ============================================================================
-- 4. Update partial index to handle nullable team_id
--    Old index: (team_id, contact_phone) WHERE status = 'active'
--    New index: contact_phone first (lookup key), team_id second
-- ============================================================================
DROP INDEX IF EXISTS idx_wa_sessions_active_contact;

CREATE INDEX idx_wa_sessions_active_contact
  ON ai_whatsapp_sessions (contact_phone, team_id)
  WHERE status = 'active';

-- ============================================================================
-- 5. Update RLS policy to allow orphan session reads by admins
--    Orphan sessions (team_id IS NULL) visible to admins only
-- ============================================================================
DROP POLICY IF EXISTS "wa_sessions_select_team" ON ai_whatsapp_sessions;

CREATE POLICY "wa_sessions_select_team" ON ai_whatsapp_sessions
  FOR SELECT TO authenticated
  USING (
    -- Team-scoped sessions: visible to team managers
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND tm.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
    OR
    -- Orphan sessions: visible to admins only
    (team_id IS NULL AND is_admin())
  );
