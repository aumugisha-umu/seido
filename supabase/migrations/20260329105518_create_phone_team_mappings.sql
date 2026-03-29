-- ============================================================================
-- phone_team_mappings: Persistent routing cache for WhatsApp/SMS/Voice
-- ============================================================================
-- Maps phone numbers to teams. After first contact, returning callers are
-- auto-routed without re-identification. All channels (WhatsApp, SMS, voice)
-- share the same mapping.

CREATE TABLE phone_team_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_role TEXT,
  source TEXT NOT NULL DEFAULT 'auto',
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_phone_team UNIQUE (contact_phone, team_id),
  CONSTRAINT valid_source CHECK (source IN ('phone_match', 'address_match', 'agency_match', 'voice_call', 'manual', 'orphan', 'auto')),
  CONSTRAINT valid_user_role CHECK (user_role IS NULL OR user_role IN ('locataire', 'prestataire', 'proprietaire', 'gestionnaire', 'admin'))
);

-- Primary lookup: by phone number (routing hot path)
CREATE INDEX idx_phone_team_mappings_phone ON phone_team_mappings(contact_phone);

-- Admin UI: mappings per team
CREATE INDEX idx_phone_team_mappings_team ON phone_team_mappings(team_id);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE phone_team_mappings ENABLE ROW LEVEL SECURITY;

-- Gestionnaire/admin can view their team's mappings
CREATE POLICY "phone_team_mappings_select_team" ON phone_team_mappings
  FOR SELECT TO authenticated
  USING (is_team_manager(team_id));

-- Service role handles all writes (webhooks run as service role)
-- No INSERT/UPDATE/DELETE policies for authenticated — only service role writes

-- ============================================================================
-- Backfill from existing data
-- ============================================================================

-- Backfill from completed WhatsApp/SMS sessions
INSERT INTO phone_team_mappings (contact_phone, team_id, user_id, source, created_at, last_used_at)
SELECT DISTINCT ON (s.contact_phone, s.team_id)
  s.contact_phone,
  s.team_id,
  s.identified_user_id,
  COALESCE(s.identified_via, 'auto'),
  s.created_at,
  s.last_message_at
FROM ai_whatsapp_sessions s
WHERE s.team_id IS NOT NULL
  AND s.status = 'completed'
  AND s.contact_phone IS NOT NULL
ORDER BY s.contact_phone, s.team_id, s.last_message_at DESC
ON CONFLICT (contact_phone, team_id) DO NOTHING;

-- Backfill from completed voice calls
INSERT INTO phone_team_mappings (contact_phone, team_id, user_id, source, created_at, last_used_at)
SELECT DISTINCT ON (c.caller_phone, c.team_id)
  c.caller_phone,
  c.team_id,
  c.identified_user_id,
  'voice_call',
  c.created_at,
  c.created_at
FROM ai_phone_calls c
WHERE c.team_id IS NOT NULL
  AND c.caller_phone IS NOT NULL
ORDER BY c.caller_phone, c.team_id, c.created_at DESC
ON CONFLICT (contact_phone, team_id) DO NOTHING;
