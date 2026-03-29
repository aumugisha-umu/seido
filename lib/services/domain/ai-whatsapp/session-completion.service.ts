import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { createInterventionFromSession } from './intervention-creator.service'
import { createOrUpdateMapping, appendConversationSummary } from './phone-mapping.service'
import type { SessionExtractedData, ConversationMessage } from './types'

// ============================================================================
// Shared session completion — used by both explicit close and cron timeout
// ============================================================================

export interface CompletableSession {
  id: string
  team_id: string
  contact_phone: string
  identified_user_id: string | null
  identified_via: string | null
  language: string
  channel: string
  messages: ConversationMessage[]
  extracted_data: SessionExtractedData
}

/**
 * Complete a session: create intervention (if data sufficient) + enrich mapping + append history.
 * Called from both conversation engine (explicit "terminer") and close-ai-sessions cron.
 */
export const completeSession = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  session: CompletableSession,
): Promise<void> => {
  const extractedData = session.extracted_data ?? {}
  const logPrefix = session.channel === 'sms' ? '[SMS-COMPLETE]' : '[WA-COMPLETE]'

  // ─── 1. Create intervention (only if we have enough data) ─────
  if (extractedData.problem_description) {
    try {
      await createInterventionFromSession({
        sessionId: session.id,
        teamId: session.team_id,
        extractedData,
        messages: session.messages ?? [],
        contactPhone: session.contact_phone,
        identifiedUserId: session.identified_user_id,
        language: session.language,
        channel: session.channel,
      })
    } catch (err) {
      logger.error({ err, sessionId: session.id }, `${logPrefix} Failed to create intervention`)
    }
  }

  // ─── 2. Enrich mapping (set user_id if session identified a user) ──
  if (session.identified_user_id) {
    try {
      await createOrUpdateMapping(supabase, {
        contactPhone: session.contact_phone,
        teamId: session.team_id,
        userId: session.identified_user_id,
        source: session.identified_via ?? 'auto',
      })
    } catch (err) {
      logger.warn({ err }, `${logPrefix} Mapping enrichment failed`)
    }
  }

  // ─── 3. Append conversation summary to mapping history ──────────
  try {
    await appendConversationSummary(supabase, session.contact_phone, session.team_id, {
      date: new Date().toISOString().slice(0, 10),
      channel: session.channel,
      problem: extractedData.problem_description ?? 'Demande non categorisee',
      address: extractedData.address,
      urgency: extractedData.urgency,
      caller_name: extractedData.caller_name,
    })
    logger.info(
      { phone: session.contact_phone, teamId: session.team_id, problem: extractedData.problem_description },
      `${logPrefix} Conversation summary appended`,
    )
  } catch (err) {
    logger.warn({ err }, `${logPrefix} Append conversation history failed`)
  }
}
