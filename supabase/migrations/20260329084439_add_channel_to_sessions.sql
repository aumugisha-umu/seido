-- Add channel to ai_whatsapp_sessions (supports SMS + WhatsApp)
ALTER TABLE ai_whatsapp_sessions
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp'
  CONSTRAINT valid_channel CHECK (channel IN ('whatsapp', 'sms'));

-- Index for channel-based queries
CREATE INDEX IF NOT EXISTS idx_wa_sessions_channel
  ON ai_whatsapp_sessions (channel)
  WHERE status = 'active';
