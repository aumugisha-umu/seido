-- Migration: WhatsApp AI Agent — sessions table + ai_phone_numbers extension

-- ============================================================================
-- 1. Extend ai_phone_numbers for WhatsApp support
-- ============================================================================
ALTER TABLE ai_phone_numbers
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS twilio_whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT;

COMMENT ON COLUMN ai_phone_numbers.whatsapp_enabled IS 'Whether WhatsApp AI agent is active for this team';
COMMENT ON COLUMN ai_phone_numbers.twilio_whatsapp_number IS 'Twilio WhatsApp number in E.164 format (e.g. +32470123456)';

-- ============================================================================
-- 2. Update interventions.source comment to include whatsapp_ai
-- ============================================================================
COMMENT ON COLUMN interventions.source IS 'Origin: web, phone_ai, whatsapp_ai, email, import';

-- ============================================================================
-- 3. Table: ai_whatsapp_sessions (conversation state)
-- ============================================================================
CREATE TABLE ai_whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES ai_phone_numbers(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CONSTRAINT valid_session_status CHECK (status IN ('active', 'completed', 'expired', 'failed')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  identified_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
  language TEXT NOT NULL DEFAULT 'fr'
    CONSTRAINT valid_wa_language CHECK (language IN ('fr', 'nl', 'en')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_whatsapp_sessions IS 'WhatsApp AI conversation sessions — tracks state between async messages';

-- ============================================================================
-- 4. Indexes
-- ============================================================================
CREATE INDEX idx_wa_sessions_active_contact
  ON ai_whatsapp_sessions (team_id, contact_phone)
  WHERE status = 'active';

CREATE INDEX idx_wa_sessions_last_message
  ON ai_whatsapp_sessions (last_message_at)
  WHERE status = 'active';

CREATE INDEX idx_wa_sessions_team_created
  ON ai_whatsapp_sessions (team_id, created_at DESC);

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================
ALTER TABLE ai_whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_sessions_select_team" ON ai_whatsapp_sessions
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND tm.role IN ('admin', 'gestionnaire')
        AND tm.left_at IS NULL
    )
  );

-- ============================================================================
-- 6. Trigger: updated_at (reuse existing function)
-- ============================================================================
CREATE TRIGGER trg_wa_sessions_updated_at
  BEFORE UPDATE ON ai_whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION update_ai_phone_updated_at();
