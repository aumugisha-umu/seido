import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import * as elevenlabs from './elevenlabs-agent.service'

// ============================================================================
// Types
// ============================================================================

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
    public readonly phase: 'purchase' | 'database',
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ProvisioningError'
  }
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

  const { data, error } = await supabase
    .from('ai_phone_numbers')
    .upsert(
      {
        team_id: teamId,
        phone_number: phoneNumber,
        elevenlabs_agent_id: agentId,
        elevenlabs_phone_number_id: phoneId,
        is_active: true,
        whatsapp_enabled: true,
        whatsapp_number: whatsappNumber ?? null,
        meta_phone_number_id: null,
        provisioning_status: 'active' as ProvisioningStatus,
      },
      { onConflict: 'team_id' }
    )
    .select('id')
    .single()

  if (error || !data) {
    throw new ProvisioningError(
      `Failed to insert AI phone config: ${error?.message ?? 'no data returned'}`,
      'database'
    )
  }

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
// Flow: Buy Twilio number with SMS webhook → set active
// WhatsApp Sender approval happens via Twilio Console (async, out of band)
// ============================================================================

const provisionAuto = async (
  teamId: string,
  _teamName: string,
  customInstructions?: string | null
): Promise<ProvisioningResult> => {
  const supabase = createServiceRoleSupabaseClient()

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
      '[PROVISIONING] Already in progress or complete — skipping'
    )
    return {
      phoneNumber: existing.phone_number,
      elevenlabsAgentId: null,
      elevenlabsPhoneNumberId: null,
      aiPhoneNumberId: existing.id,
      provisioningStatus: existing.provisioning_status as ProvisioningStatus,
    }
  }

  // ─── Create or update DB record ───────────────────────────────
  const { data: record, error: dbError } = await supabase
    .from('ai_phone_numbers')
    .upsert(
      {
        team_id: teamId,
        phone_number: '',
        is_active: true,
        whatsapp_enabled: true,
        custom_instructions: customInstructions ?? null,
        provisioning_status: 'purchasing' as ProvisioningStatus,
        provisioning_error: null,
      },
      { onConflict: 'team_id' }
    )
    .select('id')
    .single()

  if (dbError || !record) {
    throw new ProvisioningError(`DB insert failed: ${dbError?.message ?? 'no data'}`, 'database')
  }

  const recordId = record.id

  const setStatus = async (status: ProvisioningStatus, error?: string) => {
    await supabase
      .from('ai_phone_numbers')
      .update({
        provisioning_status: status,
        provisioning_error: error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)
  }

  try {
    // ─── Step 1: Buy Twilio number ────────────────────────────────
    const { searchAvailableNumbers, purchaseNumber } = await import('./twilio-number.service')

    const available = await searchAvailableNumbers('BE', 1)
    if (available.length === 0) {
      await setStatus('failed', 'Aucun numero disponible en Belgique')
      throw new ProvisioningError('No numbers available', 'purchase')
    }

    const purchased = await purchaseNumber(available[0].phoneNumber)

    // ─── Step 2: Update DB record → active ────────────────────────
    await supabase
      .from('ai_phone_numbers')
      .update({
        phone_number: purchased.phoneNumber,
        whatsapp_number: purchased.phoneNumber,
        twilio_number_sid: purchased.sid,
        provisioning_status: 'active' as ProvisioningStatus,
        provisioning_error: null,
      })
      .eq('id', recordId)

    logger.info(
      { teamId, phoneNumber: purchased.phoneNumber },
      '[PROVISIONING] Number purchased and activated'
    )

    return {
      phoneNumber: purchased.phoneNumber,
      elevenlabsAgentId: null,
      elevenlabsPhoneNumberId: null,
      aiPhoneNumberId: recordId,
      provisioningStatus: 'active',
    }

  } catch (error) {
    if (!(error instanceof ProvisioningError)) {
      await setStatus('failed', error instanceof Error ? error.message : 'Erreur inattendue')
    }
    throw error
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Provisions a complete AI assistant setup for a team.
 * Manual mode: instant (env vars). Auto mode: buy Twilio number → active.
 */
export const provision = async (
  teamId: string,
  teamName: string,
  customInstructions?: string | null
): Promise<ProvisioningResult> => {
  const mode = process.env.AI_WHATSAPP_PROVISIONING ?? 'manual'

  logger.info({ teamId, teamName, mode }, '🚀 [PROVISIONING] Starting')

  if (mode === 'manual') {
    return provisionManual(teamId)
  }

  return provisionAuto(teamId, teamName, customInstructions)
}

/**
 * Deprovisions a team's AI assistant setup.
 * Releases Twilio number + ElevenLabs resources + soft-deletes DB.
 */
export const deprovision = async (teamId: string): Promise<void> => {
  const supabase = createServiceRoleSupabaseClient()
  const mode = process.env.AI_WHATSAPP_PROVISIONING ?? 'manual'

  const { data: config } = await supabase
    .from('ai_phone_numbers')
    .select('*')
    .eq('team_id', teamId)
    .single()

  if (!config) {
    logger.warn({ teamId }, '⚠️ [DEPROVISION] No AI phone config found')
    return
  }

  if (mode === 'auto') {
    // Release Twilio number
    if (config.twilio_number_sid) {
      try {
        const { releaseNumber } = await import('./twilio-number.service')
        await releaseNumber(config.twilio_number_sid)
      } catch (err) {
        logger.error({ err }, '⚠️ [DEPROVISION] Failed to release Twilio number')
      }
    }

    // Delete ElevenLabs phone number
    if (config.elevenlabs_phone_number_id) {
      try {
        await elevenlabs.deletePhoneNumber(config.elevenlabs_phone_number_id)
      } catch (err) {
        logger.error({ err }, '⚠️ [DEPROVISION] Failed to delete ElevenLabs number')
      }
    }

    // Delete ElevenLabs agent
    if (config.elevenlabs_agent_id) {
      try {
        await elevenlabs.deleteAgent(config.elevenlabs_agent_id)
      } catch (err) {
        logger.error({ err }, '⚠️ [DEPROVISION] Failed to delete ElevenLabs agent')
      }
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
    .eq('team_id', teamId)

  logger.info({ teamId, mode }, '✅ [DEPROVISION] Complete')
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
    .single()

  if (mode === 'auto' && config?.elevenlabs_agent_id) {
    await elevenlabs.updateAgent(config.elevenlabs_agent_id, teamName, customInstructions)
  }

  logger.info({ teamId, mode }, '✅ [PROVISIONING] Custom instructions updated')
}
