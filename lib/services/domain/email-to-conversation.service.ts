/**
 * Email to Conversation Sync Service
 *
 * Synchronizes email replies to intervention conversations.
 * When a user replies to a SEIDO notification email, this service:
 * 1. Strips quoted content (previous messages in the thread)
 * 2. Converts HTML to plain text suitable for conversation display
 * 3. Creates a message in the intervention's "group" conversation thread
 *
 * @see lib/utils/email-quote-stripper.ts - Quote stripping utilities
 * @see app/api/webhooks/resend-inbound/route.ts - Webhook handler
 */

import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { stripEmailQuotes, stripTextEmailQuotes } from '@/lib/utils/email-quote-stripper'
import { logger } from '@/lib/logger'

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

/**
 * System user UUID for external email senders
 * Created in migration: 20260122210000_create_email_system_user.sql
 */
export const SYSTEM_EMAIL_USER_ID = '00000000-0000-0000-0000-000000000001'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface EmailToConversationInput {
  /** The intervention this email reply is about */
  interventionId: string

  /** Email content (HTML preferred, text as fallback) */
  emailContent: {
    html?: string
    text?: string
  }

  /** User ID if sender is a SEIDO user, null for external senders */
  senderUserId: string | null

  /** Email address of the sender (always stored for display) */
  senderEmail: string

  /** Full "From" field (e.g., "Jean Dupont <jean@example.com>") */
  senderName: string

  /** Reference to the email record for traceability */
  emailId: string

  /** Team ID for the conversation */
  teamId: string

  /**
   * Target thread type (optional)
   * - If specified, routes to the specific thread type
   * - If not specified, defaults to 'group' for backward compatibility
   *
   * Thread types:
   * - 'group': General conversation (all participants)
   * - 'tenant_to_managers': Private thread between tenant and managers
   * - 'provider_to_managers': Private thread between provider and managers
   */
  threadType?: 'group' | 'tenant_to_managers' | 'provider_to_managers'
}

export interface EmailToConversationResult {
  success: boolean
  messageId?: string
  threadId?: string
  error?: string
}

/**
 * Metadata structure stored in conversation_messages.metadata
 * for messages originating from email replies
 */
export interface EmailMessageMetadata {
  /** Identifies this message as coming from email */
  source: 'email'

  /** Reference to the original email record */
  email_id: string

  /** Email address of the original sender */
  sender_email: string

  /** Display name of the sender (extracted from From field) */
  sender_name: string

  /** True if sender is not a SEIDO user */
  is_external: boolean
}

// ══════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════

/**
 * Converts HTML content to plain text suitable for conversation display
 *
 * Handles common HTML elements:
 * - <br> and </p> → newlines
 * - <a href="...">text</a> → text (URL)
 * - Strips all other tags
 * - Decodes common HTML entities
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''

  return html
    // Convert <br> to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Convert </p> to double newlines (paragraph break)
    .replace(/<\/p>/gi, '\n\n')
    // Preserve links as text + URL
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Extracts the display name from an email "From" field
 *
 * @example
 * extractNameFromEmail('Jean Dupont <jean@example.com>') → 'Jean Dupont'
 * extractNameFromEmail('jean@example.com') → 'jean@example.com'
 * extractNameFromEmail('"Jean Dupont" <jean@example.com>') → 'Jean Dupont'
 */
export function extractNameFromEmail(from: string): string {
  if (!from) return 'Unknown'

  // Try to extract name before <email>
  const nameMatch = from.match(/^"?([^"<]+)"?\s*</)
  if (nameMatch && nameMatch[1].trim()) {
    return nameMatch[1].trim()
  }

  // Try to extract from quotes
  const quotedMatch = from.match(/"([^"]+)"/)
  if (quotedMatch && quotedMatch[1].trim()) {
    return quotedMatch[1].trim()
  }

  // Return the full string (likely just an email address)
  return from.trim()
}

// ══════════════════════════════════════════════════════════════
// Main Service Function
// ══════════════════════════════════════════════════════════════

/**
 * Synchronizes an email reply to the intervention's conversation thread
 *
 * Flow:
 * 1. Strip quoted content from the email (removes "On X wrote..." sections)
 * 2. Convert HTML to plain text (conversation messages are text-only)
 * 3. Find or skip if no "group" thread exists for the intervention
 * 4. Create a conversation message with email metadata
 *
 * Error handling:
 * - Non-blocking: Errors are logged but don't fail the webhook
 * - The webhook should always return 200 to avoid Resend retries
 *
 * @param input - Email content and sender information
 * @returns Result object with success status and optional message/thread IDs
 */
export async function syncEmailReplyToConversation(
  input: EmailToConversationInput
): Promise<EmailToConversationResult> {
  const logContext = {
    interventionId: input.interventionId,
    emailId: input.emailId,
    senderEmail: input.senderEmail,
    hasSenderId: !!input.senderUserId,
    threadType: input.threadType || 'group'
  }

  logger.info(logContext, '📧 [EMAIL-CONV] Starting email → conversation sync')

  try {
    const supabase = createServiceRoleSupabaseClient()

    // ═══════════════════════════════════════════════════════════
    // 1. Strip quoted content from email
    // ═══════════════════════════════════════════════════════════
    let cleanContent: string

    if (input.emailContent.html) {
      // Prefer HTML stripping (more accurate for Gmail, Outlook, etc.)
      const strippedHtml = stripEmailQuotes(input.emailContent.html)
      cleanContent = htmlToPlainText(strippedHtml.cleanHtml)

      logger.debug(
        {
          ...logContext,
          originalLength: input.emailContent.html.length,
          cleanLength: cleanContent.length,
          hasQuotedContent: strippedHtml.hasQuotedContent
        },
        '📧 [EMAIL-CONV] Quote stripping completed (HTML)'
      )
    } else if (input.emailContent.text) {
      // Fallback to text stripping
      const strippedText = stripTextEmailQuotes(input.emailContent.text)
      cleanContent = strippedText.cleanHtml.trim()

      logger.debug(
        {
          ...logContext,
          originalLength: input.emailContent.text.length,
          cleanLength: cleanContent.length,
          hasQuotedContent: strippedText.hasQuotedContent
        },
        '📧 [EMAIL-CONV] Quote stripping completed (text)'
      )
    } else {
      logger.warn(logContext, '⚠️ [EMAIL-CONV] No email content to sync')
      return { success: false, error: 'No email content provided' }
    }

    // Validate we have actual content after stripping
    if (!cleanContent || cleanContent.length < 2) {
      logger.info(
        logContext,
        '📧 [EMAIL-CONV] Email content is empty after quote stripping - skipping'
      )
      return { success: true, error: 'Empty content after quote stripping' }
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Find the target conversation thread for this intervention
    //    Uses threadType if specified, otherwise defaults to 'group'
    // ═══════════════════════════════════════════════════════════
    const targetThreadType = input.threadType || 'group'

    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('intervention_id', input.interventionId)
      .eq('thread_type', targetThreadType)
      .maybeSingle()

    if (threadError) {
      logger.error(
        { ...logContext, error: threadError, threadType: targetThreadType },
        '❌ [EMAIL-CONV] Error finding conversation thread'
      )
      return { success: false, error: `Thread query failed: ${threadError.message}` }
    }

    if (!thread) {
      // Target thread doesn't exist for this intervention
      // This can happen for:
      // - Older interventions created before the chat system
      // - Private threads that haven't been created yet
      logger.info(
        { ...logContext, threadType: targetThreadType },
        `📧 [EMAIL-CONV] No "${targetThreadType}" thread found for intervention - skipping conversation sync`
      )
      return { success: true, error: `No ${targetThreadType} thread exists for this intervention` }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Prepare message metadata
    // ═══════════════════════════════════════════════════════════
    const userId = input.senderUserId || SYSTEM_EMAIL_USER_ID

    const metadata: EmailMessageMetadata = {
      source: 'email',
      email_id: input.emailId,
      sender_email: input.senderEmail,
      sender_name: extractNameFromEmail(input.senderName),
      is_external: !input.senderUserId
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Create the conversation message
    // ═══════════════════════════════════════════════════════════
    const { data: message, error: messageError } = await supabase
      .from('conversation_messages')
      .insert({
        thread_id: thread.id,
        user_id: userId,
        content: cleanContent,
        metadata: metadata as unknown as Record<string, unknown>
      })
      .select('id')
      .single()

    if (messageError) {
      logger.error(
        { ...logContext, error: messageError, threadId: thread.id },
        '❌ [EMAIL-CONV] Failed to create conversation message'
      )
      return { success: false, error: `Message creation failed: ${messageError.message}` }
    }

    // ═══════════════════════════════════════════════════════════
    // 5. Update thread metadata (last_message_at, message_count)
    // ═══════════════════════════════════════════════════════════
    // TODO: race condition under concurrent syncs — message_count uses read-increment-write
    // which can lose updates. Use SQL `message_count + 1` via RPC when available.
    const { data: currentThread } = await supabase
      .from('conversation_threads')
      .select('message_count')
      .eq('id', thread.id)
      .single()

    const newCount = (currentThread?.message_count || 0) + 1

    const { error: updateError } = await supabase
      .from('conversation_threads')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', thread.id)

    if (updateError) {
      // Non-fatal: message was created, just metadata update failed
      logger.warn(
        { ...logContext, error: updateError },
        '⚠️ [EMAIL-CONV] Failed to update thread metadata'
      )
    }

    // ═══════════════════════════════════════════════════════════
    // 6. Add system user as participant if needed (for external senders)
    // ═══════════════════════════════════════════════════════════
    if (!input.senderUserId) {
      // Upsert to avoid duplicate key errors
      await supabase
        .from('conversation_participants')
        .upsert(
          { thread_id: thread.id, user_id: SYSTEM_EMAIL_USER_ID },
          { onConflict: 'thread_id,user_id' }
        )
    }

    logger.info(
      {
        ...logContext,
        messageId: message.id,
        threadId: thread.id,
        contentLength: cleanContent.length,
        isExternal: !input.senderUserId
      },
      '✅ [EMAIL-CONV] Email reply synced to conversation successfully'
    )

    return {
      success: true,
      messageId: message.id,
      threadId: thread.id
    }

  } catch (error) {
    logger.error(
      { ...logContext, error },
      '❌ [EMAIL-CONV] Unexpected error syncing email to conversation'
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
