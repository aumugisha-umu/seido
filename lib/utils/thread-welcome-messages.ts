/**
 * Thread Welcome Messages Utility
 * Centralized welcome messages for conversation threads
 *
 * Used when creating conversation threads to explain their purpose to participants.
 */

import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

type ConversationThreadType = Database['public']['Enums']['conversation_thread_type']

/**
 * Static welcome messages for thread types (kept for backward compatibility)
 * @deprecated Use getThreadWelcomeMessage() for personalized messages
 */
export const THREAD_WELCOME_MESSAGES: Record<ConversationThreadType, string> = {
  group: '🎉 Bienvenue ! Cette conversation est visible par tous les participants de l\'intervention. Utilisez-la pour les échanges généraux.',
  tenants_group: '👥 Cette conversation regroupe tous les locataires de l\'intervention et les gestionnaires. Les prestataires n\'y ont pas accès.',
  providers_group: '👥 Cette conversation regroupe tous les prestataires de l\'intervention et les gestionnaires. Les locataires n\'y ont pas accès.',
  tenant_to_managers: '🔒 Cette conversation privée est réservée aux échanges entre le locataire et les gestionnaires. Les autres participants de l\'intervention n\'y ont pas accès.',
  provider_to_managers: '🔒 Cette conversation privée est réservée aux échanges entre le prestataire et les gestionnaires. Les autres participants de l\'intervention n\'y ont pas accès.'
}

/**
 * Get personalized welcome message for a thread type
 * @param threadType - The type of conversation thread
 * @param participantName - Optional name of the tenant/provider for personalized message
 * @returns The welcome message with participant name if provided
 */
export function getThreadWelcomeMessage(
  threadType: ConversationThreadType,
  participantName?: string
): string {
  switch (threadType) {
    case 'group':
      return '🎉 Bienvenue ! Cette conversation est visible par tous les participants de l\'intervention. Utilisez-la pour les échanges généraux.'

    case 'tenants_group':
      return '👥 Cette conversation regroupe tous les locataires de l\'intervention et les gestionnaires. Les prestataires n\'y ont pas accès.'

    case 'providers_group':
      return '👥 Cette conversation regroupe tous les prestataires de l\'intervention et les gestionnaires. Les locataires n\'y ont pas accès.'

    case 'tenant_to_managers':
      if (participantName) {
        return `🔒 Cette conversation privée est réservée aux échanges entre ${participantName} et les gestionnaires. Les autres participants n'y ont pas accès.`
      }
      return '🔒 Cette conversation privée est réservée aux échanges entre le locataire et les gestionnaires. Les autres participants n\'y ont pas accès.'

    case 'provider_to_managers':
      if (participantName) {
        return `🔒 Cette conversation privée est réservée aux échanges entre ${participantName} et les gestionnaires. Les autres participants n'y ont pas accès.`
      }
      return '🔒 Cette conversation privée est réservée aux échanges entre le prestataire et les gestionnaires. Les autres participants n\'y ont pas accès.'

    default:
      return ''
  }
}

/**
 * Send a welcome system message when a thread is created
 * This helps users understand the purpose of each conversation thread
 *
 * @param supabase - Supabase client (can be service role or user client)
 * @param threadId - The ID of the newly created thread
 * @param threadType - The type of thread:
 *   - group: General discussion (all participants)
 *   - tenants_group: All tenants + managers
 *   - providers_group: All providers + managers
 *   - tenant_to_managers: Individual tenant + managers (requires participantName)
 *   - provider_to_managers: Individual provider + managers (requires participantName)
 * @param createdByUserId - The ID of the user who created the thread (used as message author)
 * @param participantName - Name of the tenant/provider for individual thread messages
 */
export async function sendThreadWelcomeMessage(
  supabase: SupabaseClient<Database>,
  threadId: string,
  threadType: ConversationThreadType,
  createdByUserId: string,
  participantName?: string
): Promise<void> {
  try {
    const welcomeMessage = getThreadWelcomeMessage(threadType, participantName)
    if (!welcomeMessage) {
      logger.warn('⚠️ [THREAD-WELCOME] No welcome message configured for thread type:', threadType)
      return
    }

    const { error } = await supabase
      .from('conversation_messages')
      .insert({
        thread_id: threadId,
        user_id: createdByUserId,
        content: welcomeMessage,
        metadata: {
          source: 'system',
          action: 'thread_created',
          thread_type: threadType
        }
      })

    if (error) {
      logger.error({ error, threadId, threadType }, '⚠️ [THREAD-WELCOME] Failed to send welcome message')
      return
    }

    logger.info({ threadId, threadType, participantName }, '✅ [THREAD-WELCOME] Welcome message sent')
  } catch (error) {
    logger.error({ error, threadId, threadType }, '❌ [THREAD-WELCOME] Error sending welcome message')
    // Don't throw - this is non-critical
  }
}
