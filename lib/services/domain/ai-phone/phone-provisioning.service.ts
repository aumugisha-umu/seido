import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import * as telnyx from './telnyx-phone.service'
import * as elevenlabs from './elevenlabs-agent.service'

// ============================================================================
// Types
// ============================================================================

export interface ProvisioningResult {
  phoneNumber: string
  telnyxPhoneNumberId: string
  elevenlabsAgentId: string
  elevenlabsPhoneNumberId: string
  aiPhoneNumberId: string
}

export class ProvisioningError extends Error {
  constructor(
    message: string,
    public readonly phase: 'telnyx' | 'elevenlabs_agent' | 'elevenlabs_number' | 'elevenlabs_assign' | 'database',
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ProvisioningError'
  }
}

// ============================================================================
// Manual provisioning (dev mode)
// ============================================================================

const provisionManual = async (teamId: string): Promise<ProvisioningResult> => {
  const phoneNumber = process.env.DEV_PHONE_NUMBER
  const agentId = process.env.DEV_ELEVENLABS_AGENT_ID
  const phoneId = process.env.DEV_ELEVENLABS_PHONE_ID

  if (!phoneNumber || !agentId || !phoneId) {
    throw new ProvisioningError(
      'DEV_PHONE_NUMBER, DEV_ELEVENLABS_AGENT_ID, and DEV_ELEVENLABS_PHONE_ID must be set in manual mode',
      'database'
    )
  }

  const supabase = createServiceRoleSupabaseClient()

  const { data, error } = await supabase
    .from('ai_phone_numbers')
    .upsert(
      {
        team_id: teamId,
        phone_number: phoneNumber,
        elevenlabs_agent_id: agentId,
        elevenlabs_phone_number_id: phoneId,
        telnyx_connection_id: process.env.TELNYX_SIP_CONNECTION_ID ?? null,
        is_active: true,
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
    { teamId, phoneNumber, mode: 'manual' },
    '✅ [PROVISIONING] Manual provisioning complete'
  )

  return {
    phoneNumber,
    telnyxPhoneNumberId: 'dev-manual',
    elevenlabsAgentId: agentId,
    elevenlabsPhoneNumberId: phoneId,
    aiPhoneNumberId: data.id,
  }
}

// ============================================================================
// Auto provisioning (production)
// ============================================================================

const provisionAuto = async (
  teamId: string,
  teamName: string,
  customInstructions?: string | null
): Promise<ProvisioningResult> => {
  let telnyxResult: Awaited<ReturnType<typeof telnyx.searchAndPurchase>> | null = null
  let agentResult: elevenlabs.ElevenLabsAgent | null = null
  let phoneResult: elevenlabs.ElevenLabsPhoneNumber | null = null

  try {
    // Step 1: Search + purchase Belgian number
    logger.info({ teamId, teamName }, '📞 [PROVISIONING] Step 1/4: Searching & purchasing number')
    telnyxResult = await telnyx.searchAndPurchase(teamId)

    // Step 2: Create ElevenLabs agent
    logger.info({ teamId }, '🤖 [PROVISIONING] Step 2/4: Creating ElevenLabs agent')
    agentResult = await elevenlabs.createAgent(teamName, customInstructions)

    // Step 3: Import number into ElevenLabs
    logger.info({ teamId }, '📱 [PROVISIONING] Step 3/4: Importing number into ElevenLabs')
    phoneResult = await elevenlabs.importPhoneNumber(
      telnyxResult.phoneNumber,
      `SEIDO - ${teamName}`
    )

    // Step 4: Assign agent to number (separate PATCH required)
    logger.info({ teamId }, '🔗 [PROVISIONING] Step 4/4: Assigning agent to number')
    await elevenlabs.assignAgentToNumber(phoneResult.phone_number_id, agentResult.agent_id)

    // Step 5: Save to database
    const supabase = createServiceRoleSupabaseClient()
    const { data, error } = await supabase
      .from('ai_phone_numbers')
      .upsert(
        {
          team_id: teamId,
          phone_number: telnyxResult.phoneNumber,
          telnyx_connection_id: process.env.TELNYX_SIP_CONNECTION_ID ?? null,
          telnyx_phone_number_id: telnyxResult.phoneNumberId,
          elevenlabs_agent_id: agentResult.agent_id,
          elevenlabs_phone_number_id: phoneResult.phone_number_id,
          custom_instructions: customInstructions ?? null,
          is_active: true,
        },
        { onConflict: 'team_id' }
      )
      .select('id')
      .single()

    if (error || !data) {
      throw new ProvisioningError(
        `DB insert failed: ${error?.message ?? 'no data'}`,
        'database'
      )
    }

    logger.info(
      { teamId, phoneNumber: telnyxResult.phoneNumber, agentId: agentResult.agent_id, mode: 'auto' },
      '✅ [PROVISIONING] Auto provisioning complete'
    )

    return {
      phoneNumber: telnyxResult.phoneNumber,
      telnyxPhoneNumberId: telnyxResult.phoneNumberId,
      elevenlabsAgentId: agentResult.agent_id,
      elevenlabsPhoneNumberId: phoneResult.phone_number_id,
      aiPhoneNumberId: data.id,
    }
  } catch (error) {
    // Rollback chain: reverse order of successful steps
    logger.error({ teamId, error }, '❌ [PROVISIONING] Failed — starting rollback')

    if (phoneResult) {
      try {
        await elevenlabs.deletePhoneNumber(phoneResult.phone_number_id)
        logger.info({ phoneNumberId: phoneResult.phone_number_id }, '🔄 [ROLLBACK] ElevenLabs number deleted')
      } catch (rollbackErr) {
        logger.error({ rollbackErr }, '⚠️ [ROLLBACK] Failed to delete ElevenLabs number')
      }
    }

    if (agentResult) {
      try {
        await elevenlabs.deleteAgent(agentResult.agent_id)
        logger.info({ agentId: agentResult.agent_id }, '🔄 [ROLLBACK] ElevenLabs agent deleted')
      } catch (rollbackErr) {
        logger.error({ rollbackErr }, '⚠️ [ROLLBACK] Failed to delete ElevenLabs agent')
      }
    }

    if (telnyxResult) {
      try {
        await telnyx.releaseNumber(telnyxResult.phoneNumberId)
        logger.info({ phoneNumberId: telnyxResult.phoneNumberId }, '🔄 [ROLLBACK] Telnyx number released')
      } catch (rollbackErr) {
        logger.error({ rollbackErr }, '⚠️ [ROLLBACK] Failed to release Telnyx number')
      }
    }

    if (error instanceof ProvisioningError) throw error
    throw new ProvisioningError(
      `Provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
      'telnyx',
      error instanceof Error ? error : undefined
    )
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Provisions a complete AI phone setup for a team.
 * Manual mode: uses DEV_* env vars, no external API calls.
 * Auto mode: full Telnyx + ElevenLabs provisioning with rollback.
 */
export const provision = async (
  teamId: string,
  teamName: string,
  customInstructions?: string | null
): Promise<ProvisioningResult> => {
  const mode = process.env.AI_PHONE_PROVISIONING ?? 'manual'

  logger.info({ teamId, teamName, mode }, '🚀 [PROVISIONING] Starting')

  if (mode === 'manual') {
    return provisionManual(teamId)
  }

  return provisionAuto(teamId, teamName, customInstructions)
}

/**
 * Deprovisions a team's AI phone setup.
 * Manual mode: soft-deletes DB record only.
 * Auto mode: deletes ElevenLabs resources + releases Telnyx number + soft-deletes DB.
 */
export const deprovision = async (teamId: string): Promise<void> => {
  const supabase = createServiceRoleSupabaseClient()
  const mode = process.env.AI_PHONE_PROVISIONING ?? 'manual'

  // Fetch current config
  const { data: config } = await supabase
    .from('ai_phone_numbers')
    .select('*')
    .eq('team_id', teamId)
    .limit(1)
    .single()

  if (!config) {
    logger.warn({ teamId }, '⚠️ [DEPROVISION] No AI phone config found')
    return
  }

  if (mode === 'auto') {
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

    // Release Telnyx number
    if (config.telnyx_phone_number_id) {
      try {
        await telnyx.releaseNumber(config.telnyx_phone_number_id)
      } catch (err) {
        logger.error({ err }, '⚠️ [DEPROVISION] Failed to release Telnyx number')
      }
    }
  }

  // Deactivate in DB (soft delete)
  await supabase
    .from('ai_phone_numbers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
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
  const mode = process.env.AI_PHONE_PROVISIONING ?? 'manual'

  // Update DB
  const { data: config } = await supabase
    .from('ai_phone_numbers')
    .update({ custom_instructions: customInstructions, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .select('elevenlabs_agent_id')
    .single()

  // Update ElevenLabs agent in production
  if (mode === 'auto' && config?.elevenlabs_agent_id) {
    await elevenlabs.updateAgent(config.elevenlabs_agent_id, teamName, customInstructions)
  }

  logger.info({ teamId, mode }, '✅ [PROVISIONING] Custom instructions updated')
}
