-- Migration: AI Phone Assistant Schema
-- Tables: ai_phone_numbers, ai_phone_calls, ai_phone_usage
-- Modifications: interventions.source, intervention_document_type enum extension
-- RLS: Team managers can read calls; admin-only for config/billing; all writes via service_role

-- ============================================================================
-- 1. Extend intervention_document_type enum
-- ============================================================================
ALTER TYPE intervention_document_type ADD VALUE IF NOT EXISTS 'rapport_appel_ia';

-- ============================================================================
-- 2. Add source column to interventions
-- ============================================================================
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
COMMENT ON COLUMN interventions.source IS 'Origin of the intervention: web, phone_ai, email, import';

-- ============================================================================
-- 3. Table: ai_phone_numbers (1 per team — phone config + agent mapping)
-- ============================================================================
CREATE TABLE ai_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  telnyx_connection_id TEXT,
  telnyx_phone_number_id TEXT,
  elevenlabs_agent_id TEXT,
  elevenlabs_phone_number_id TEXT,
  ai_tier TEXT NOT NULL DEFAULT 'solo'
    CONSTRAINT valid_ai_tier CHECK (ai_tier IN ('solo', 'equipe', 'agence')),
  auto_topup BOOLEAN NOT NULL DEFAULT false,
  custom_instructions TEXT
    CONSTRAINT max_custom_instructions CHECK (char_length(custom_instructions) <= 500),
  stripe_subscription_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_phone_numbers_team UNIQUE (team_id)
);

COMMENT ON TABLE ai_phone_numbers IS 'AI phone assistant config per team — maps Telnyx number to ElevenLabs agent';

-- ============================================================================
-- 4. Table: ai_phone_calls (conversation log)
-- ============================================================================
CREATE TABLE ai_phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number_id UUID REFERENCES ai_phone_numbers(id) ON DELETE CASCADE,
  elevenlabs_conversation_id TEXT NOT NULL,
  caller_phone TEXT,
  channel TEXT NOT NULL DEFAULT 'phone'
    CONSTRAINT valid_channel CHECK (channel IN ('phone', 'whatsapp_text', 'whatsapp_voice', 'whatsapp_call')),
  duration_seconds INTEGER,
  identified_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
  transcript TEXT,
  structured_summary JSONB,
  language TEXT NOT NULL DEFAULT 'fr'
    CONSTRAINT valid_language CHECK (language IN ('fr', 'nl', 'en')),
  call_status TEXT NOT NULL DEFAULT 'completed'
    CONSTRAINT valid_call_status CHECK (call_status IN ('completed', 'failed', 'abandoned', 'transferred')),
  pdf_document_id UUID REFERENCES intervention_documents(id) ON DELETE SET NULL,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_elevenlabs_conversation UNIQUE (elevenlabs_conversation_id)
);

COMMENT ON TABLE ai_phone_calls IS 'Log of all AI phone/WhatsApp conversations with transcripts and structured summaries';

-- ============================================================================
-- 5. Table: ai_phone_usage (monthly billing tracking)
-- ============================================================================
CREATE TABLE ai_phone_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  minutes_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
  calls_count INTEGER NOT NULL DEFAULT 0,
  overage_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_usage_team_month UNIQUE (team_id, month)
);

COMMENT ON TABLE ai_phone_usage IS 'Monthly usage tracking per team for AI phone minutes billing';

-- ============================================================================
-- 6. Triggers: updated_at auto-update
-- ============================================================================
CREATE OR REPLACE FUNCTION update_ai_phone_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_phone_numbers_updated_at
  BEFORE UPDATE ON ai_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION update_ai_phone_updated_at();

CREATE TRIGGER trg_ai_phone_usage_updated_at
  BEFORE UPDATE ON ai_phone_usage
  FOR EACH ROW EXECUTE FUNCTION update_ai_phone_updated_at();

-- ============================================================================
-- 7. RLS Policies
-- ============================================================================

-- ai_phone_numbers: admin-only SELECT (config/billing data)
ALTER TABLE ai_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view AI phone config"
ON ai_phone_numbers FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND tm.role IN ('admin', 'gestionnaire')
      AND tm.left_at IS NULL
  )
);
-- No INSERT/UPDATE/DELETE for authenticated — all writes via service_role

-- ai_phone_calls: team managers can read call logs
ALTER TABLE ai_phone_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team managers can view AI call logs"
ON ai_phone_calls FOR SELECT
TO authenticated
USING (
  is_team_manager(team_id)
);
-- No INSERT/UPDATE/DELETE for authenticated — all writes via service_role (webhook)

-- ai_phone_usage: admin-only SELECT (billing data)
ALTER TABLE ai_phone_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view AI usage"
ON ai_phone_usage FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND tm.role IN ('admin', 'gestionnaire')
      AND tm.left_at IS NULL
  )
);
-- No INSERT/UPDATE/DELETE for authenticated — all writes via service_role

-- ============================================================================
-- 8. Performance Indexes
-- ============================================================================
CREATE INDEX idx_ai_phone_calls_team_created
  ON ai_phone_calls (team_id, created_at DESC);

CREATE INDEX idx_ai_phone_calls_intervention
  ON ai_phone_calls (intervention_id)
  WHERE intervention_id IS NOT NULL;

CREATE INDEX idx_ai_phone_calls_conversation_id
  ON ai_phone_calls (elevenlabs_conversation_id);

CREATE INDEX idx_ai_phone_usage_team_month
  ON ai_phone_usage (team_id, month DESC);

CREATE INDEX idx_interventions_source
  ON interventions (source)
  WHERE source != 'web';
