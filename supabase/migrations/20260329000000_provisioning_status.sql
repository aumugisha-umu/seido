-- Migration: Auto-provisioning status tracking
-- Adds provisioning lifecycle columns to ai_phone_numbers

ALTER TABLE ai_phone_numbers
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT valid_provisioning_status CHECK (
      provisioning_status IN ('pending', 'purchasing', 'registering', 'pending_verification', 'active', 'failed')
    ),
  ADD COLUMN IF NOT EXISTS twilio_number_sid TEXT,
  ADD COLUMN IF NOT EXISTS provisioning_error TEXT;

COMMENT ON COLUMN ai_phone_numbers.provisioning_status IS 'Lifecycle: pending → purchasing → registering → pending_verification → active | failed';
COMMENT ON COLUMN ai_phone_numbers.twilio_number_sid IS 'Twilio IncomingPhoneNumber SID — used for releasing the number on deprovision';
COMMENT ON COLUMN ai_phone_numbers.provisioning_error IS 'Human-readable error message when provisioning_status = failed';

-- Index for polling queries
CREATE INDEX IF NOT EXISTS idx_ai_phone_provisioning_status
  ON ai_phone_numbers (team_id, provisioning_status)
  WHERE provisioning_status NOT IN ('active', 'failed');
