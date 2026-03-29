-- Migration: Twilio BSP → Meta WhatsApp Cloud API
-- Adds meta_phone_number_id, renames twilio_whatsapp_number → whatsapp_number
-- Keeps twilio_account_sid nullable (no data loss)

-- ============================================================================
-- 1. Add Meta phone number ID column
-- ============================================================================
ALTER TABLE ai_phone_numbers
  ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT;

COMMENT ON COLUMN ai_phone_numbers.meta_phone_number_id
  IS 'Meta WhatsApp Cloud API phone number ID (per-team, used for Graph API calls)';

-- ============================================================================
-- 2. Rename Twilio column to generic name (E.164 display number)
-- ============================================================================
ALTER TABLE ai_phone_numbers
  RENAME COLUMN twilio_whatsapp_number TO whatsapp_number;

COMMENT ON COLUMN ai_phone_numbers.whatsapp_number
  IS 'WhatsApp number in E.164 format (e.g. +32470123456) — display only';

-- ============================================================================
-- 3. Migrate existing data: copy whatsapp_number value context if needed
-- (twilio_account_sid stays as-is, will be null for new Meta-based teams)
-- ============================================================================
-- No data migration needed — existing dev data can be re-provisioned
