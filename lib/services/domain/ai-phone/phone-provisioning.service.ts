import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import * as elevenlabs from './elevenlabs-agent.service'

// ============================================================================
// Types
// ============================================================================

// 'purchasing' kept for backward compat with existing DB records + client polling
export type ProvisioningStatus = 'pending' | 'purchasing' | 'active' | 'failed'

export interface ProvisioningResult {
  phoneNumber: string
  elevenlabsAgentId: string | null
  elevenlabsPhoneNumberId: string | null
  aiPhoneNumberId: string
  provisioningStatus: ProvisioningStatus
}

export class ProvisioningError extends Error {
  constructor(
    message: string,
    public readonly phase: 'database',
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ProvisioningError'
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Select-then-insert-or-update pattern.
 * Required because the UNIQUE constraint on ai_phone_numbers.team_id was dropped
 * (multiple records per team are now possible). onConflict: 'team_id' no longer works.
 */
const upsertByTeamId = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string,
  payload: Record<string, unknown>
): Promise<{ id: string }> => {
  const { data: existing } = await supabase
    .from('ai_phone_numbers')
    .select('id')
    .eq('team_id', teamId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('ai_phone_numbers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error || !data) {
      throw new ProvisioningError(
        `Failed to update AI phone config: ${error?.message ?? 'no data returned'}`,
        'database'
      )
    }
    return data
  }

  const { data, error } = await supabase
    .from('ai_phone_numbers')
    .insert({ team_id: teamId, ...payload })
    .select('id')
    .single()

  if (error || !data) {
    throw new ProvisioningError(
      `Failed to insert AI phone config: ${error?.message ?? 'no data returned'}`,
      'database'
    )
  }
  return data
}

// ============================================================================
// Manual provisioning (dev mode — uses env vars, no external API calls)
// ============================================================================

const provisionManual = async (teamId: string): Promise<ProvisioningResult> => {
  const whatsappNumber = process.env.DEV_WHATSAPP_PHONE_NUMBER
  const phoneNumber = process.env.DEV_PHONE_NUMBER ?? whatsappNumber ?? ''
  const agentId = process.env.DEV_ELEVENLABS_AGENT_ID ?? null
  const phoneId = process.env.DEV_ELEVENLABS_PHONE_ID ?? null

  const supabase = createServiceRoleSupabaseClient()

  const data = await upsertByTeamId(supabase, teamId, {
    phone_number: phoneNumber,
    elevenlabs_agent_id: agentId,
    elevenlabs_phone_number_id: phoneId,
    is_active: true,
    whatsapp_enabled: true,
    whatsapp_number: whatsappNumber ?? null,
    meta_phone_number_id: null,
    provisioning_status: 'active' as ProvisioningStatus,
  })

  logger.info(
    { teamId, phoneNumber, whatsappNumber, mode: 'manual' },
    '[PROVISIONING] Manual provisioning complete'
  )

  return {
    phoneNumber,
    elevenlabsAgentId: agentId,
    elevenlabsPhoneNumberId: phoneId,
    aiPhoneNumberId: data.id,
    provisioningStatus: 'active',
  }
}

// ============================================================================
// Auto provisioning (production)
// Flow: Activate shared WhatsApp number for team → set active immediately
// No per-team number purchase — all teams share SEIDO_WHATSAPP_NUMBER
// ============================================================================

const provisionAuto = async (
  teamId: string,
  _teamName: string,
  customInstructions?: string | null
): Promise<ProvisioningResult> => {
  const supabase = createServiceRoleSupabaseClient()
  const sharedNumber = process.env.SEIDO_WHATSAPP_NUMBER ?? ''

  if (!sharedNumber) {
    throw new ProvisioningError('SEIDO_WHATSAPP_NUMBER env var is not set', 'database')
  }

  // ─── Idempotence guard ────────────────────────────────────────
  const { data: existing } = await supabase
    .from('ai_phone_numbers')
    .select('id, phone_number, provisioning_status')
    .eq('team_id', teamId)
    .limit(1)
    .maybeSingle()

  if (existing && existing.provisioning_status !== 'pending' && existing.provisioning_status !== 'failed') {
    logger.info(
      { teamId, status: existing.provisioning_status },
      '[PROVISIONING] Already active or in progress — skipping'
    )
    return {
      phoneNumber: existing.phone_number,
      elevenlabsAgentId: null,
      elevenlabsPhoneNumberId: null,
      aiPhoneNumberId: existing.id,
      provisioningStatus: existing.provisioning_status as ProvisioningStatus,
    }
  }

  // ─── Create or update DB record → active immediately ──────────
  const data = await upsertByTeamId(supabase, teamId, {
    phone_number: sharedNumber,
    whatsapp_number: sharedNumber,
    is_active: true,
    whatsapp_enabled: true,
    custom_instructions: customInstructions ?? null,
    provisioning_status: 'active' as ProvisioningStatus,
    provisioning_error: null,
  })

  logger.info(
    { teamId, sharedNumber },
    '[PROVISIONING] Shared WhatsApp number activated for team'
  )

  return {
    phoneNumber: sharedNumber,
    elevenlabsAgentId: null,
    elevenlabsPhoneNumberId: null,
    aiPhoneNumberId: data.id,
    provisioningStatus: 'active',
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Provisions a complete AI assistant setup for a team.
 * Manual mode: instant (env vars). Auto mode: activate shared WhatsApp number.
 */
export const provision = async (
  teamId: string,
  teamName: string,
  customInstructions?: string | null
): Promise<ProvisioningResult> => {
  const mode = process.env.AI_WHATSAPP_PROVISIONING ?? 'manual'

  logger.info({ teamId, teamName, mode }, '[PROVISIONING] Starting')

  if (mode === 'manual') {
    return provisionManual(teamId)
  }

  return provisionAuto(teamId, teamName, customInstructions)
}

/**
 * Deprovisions a team's AI assistant setup.
 * Deactivates the shared number for this team + cleans up ElevenLabs resources.
 * Note: shared WhatsApp number is NOT released (used by all teams).
 */
export const deprovision = async (teamId: string): Promise<void> => {
  const supabase = createServiceRoleSupabaseClient()

  const { data: config } = await supabase
    .from('ai_phone_numbers')
    .select('id, elevenlabs_agent_id, elevenlabs_phone_number_id')
    .eq('team_id', teamId)
    .limit(1)
    .maybeSingle()

  if (!config) {
    logger.warn({ teamId }, '[DEPROVISION] No AI phone config found')
    return
  }

  // Clean up ElevenLabs resources if any
  if (config.elevenlabs_phone_number_id) {
    try {
      await elevenlabs.deletePhoneNumber(config.elevenlabs_phone_number_id)
    } catch (err) {
      logger.error({ err }, '[DEPROVISION] Failed to delete ElevenLabs number')
    }
  }

  if (config.elevenlabs_agent_id) {
    try {
      await elevenlabs.deleteAgent(config.elevenlabs_agent_id)
    } catch (err) {
      logger.error({ err }, '[DEPROVISION] Failed to delete ElevenLabs agent')
    }
  }

  // Deactivate in DB (soft delete)
  await supabase
    .from('ai_phone_numbers')
    .update({
      is_active: false,
      provisioning_status: 'pending' as ProvisioningStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', config.id)

  logger.info({ teamId }, '[DEPROVISION] Complete')
}

/**
 * Updates a team's custom instructions (DB + ElevenLabs agent if in auto mode).
 */
export const updateCustomInstructions = async (
  teamId: string,
  teamName: string,
  customInstructions: string
): Promise<void> => {
  const supabase = createServiceRoleSupabaseClient()
  const mode = process.env.AI_WHATSAPP_PROVISIONING ?? 'manual'

  const { data: config } = await supabase
    .from('ai_phone_numbers')
    .update({ custom_instructions: customInstructions, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .select('elevenlabs_agent_id')
    .limit(1)
    .maybeSingle()

  if (mode === 'auto' && config?.elevenlabs_agent_id) {
    await elevenlabs.updateAgent(config.elevenlabs_agent_id, teamName, customInstructions)
  }

  logger.info({ teamId, mode }, '[PROVISIONING] Custom instructions updated')
}
