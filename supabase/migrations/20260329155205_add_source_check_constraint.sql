-- 1. Widen identified_via CHECK to include cross-channel sources
-- The original constraint only allowed WhatsApp/SMS identification methods.
-- Voice callers who later message via WhatsApp have source='voice_call'.
ALTER TABLE ai_whatsapp_sessions
  DROP CONSTRAINT IF EXISTS valid_identified_via;

ALTER TABLE ai_whatsapp_sessions
  ADD CONSTRAINT valid_identified_via CHECK (
    identified_via IN (
      'phone_match', 'address_match', 'agency_match',
      'disambiguation', 'orphan',
      'voice_call', 'team_selection', 'auto'
    )
  );

-- 2. Enforce valid AI source values on interventions.source
-- NULL is allowed (most interventions are human-created)
ALTER TABLE interventions
  ADD CONSTRAINT interventions_source_valid
  CHECK (source IS NULL OR source IN ('whatsapp_ai', 'sms_ai', 'phone_ai'));

-- 3. Fix ai_phone_calls.channel values and replace constraint
-- Drop existing constraint first (it doesn't include 'whatsapp' and 'sms')
ALTER TABLE ai_phone_calls
  DROP CONSTRAINT IF EXISTS valid_channel;

-- Migrate legacy values
UPDATE ai_phone_calls SET channel = 'whatsapp' WHERE channel = 'whatsapp_text';

-- Add new constraint with all valid channel values
ALTER TABLE ai_phone_calls
  ADD CONSTRAINT valid_channel
  CHECK (channel IN ('phone', 'whatsapp', 'sms'));
