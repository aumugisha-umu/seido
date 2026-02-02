'use server'

/**
 * 🔔 Conversation Notification Actions
 *
 * Server Actions for sending conversation-related notifications.
 * These are server-only and can safely import Node.js modules like
 * web-push (for push notifications) and fs (for email service).
 *
 * @module conversation-notification-actions
 */

import { logger } from '@/lib/logger'
import { createServerSupabaseClient } from '@/lib/services'
import { sendPushNotificationToUsers } from '@/lib/send-push-notification'
import { createEmailService } from '@/lib/services/domain/email.service'
import { buildNewMessageEmail } from '@/lib/services/domain/email-notification/builders/new-message.builder'
import { formatUserName, formatFullPropertyAddress, delay } from '@/lib/services/domain/email-notification/helpers'
import type { ConversationThreadType } from '@/lib/services/domain/email-reply.service'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

interface MessageNotificationInput {
  messageId: string
  messageContent: string
  messageCreatedAt: string
  messageUserId: string
  threadId: string
  teamId: string
  interventionId: string
}

// ══════════════════════════════════════════════════════════════
// Send Push & Email Notifications for New Message
// ══════════════════════════════════════════════════════════════

/**
 * Send push and email notifications for a new conversation message.
 * This is called after the in-app notification is created in the service.
 *
 * Features:
 * - Push notifications to all participants (except sender)
 * - Email notifications with throttling (max 1 per 5 min per thread)
 * - Includes team managers (transparency)
 *
 * @param input - Message and context information
 */
export async function sendConversationNotifications(
  input: MessageNotificationInput
): Promise<{ success: boolean; pushSent: number; emailsSent: number }> {
  const { messageId, messageContent, messageCreatedAt, messageUserId, threadId, teamId, interventionId } = input

  logger.info(
    { messageId, threadId, interventionId },
    '🔔 [CONV-NOTIF] Starting push and email notifications'
  )

  try {
    const supabase = await createServerSupabaseClient()

    // ════════════════════════════════════════════════════════════
    // 1. Get thread details and participants
    // ════════════════════════════════════════════════════════════
    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select(`
        id,
        thread_type,
        intervention_id,
        last_email_notification_at,
        participants:conversation_participants(user_id)
      `)
      .eq('id', threadId)
      .single()

    if (threadError || !thread) {
      logger.warn({ threadId, error: threadError }, '⚠️ [CONV-NOTIF] Thread not found')
      return { success: false, pushSent: 0, emailsSent: 0 }
    }

    // Get all participant IDs except sender
    const participantIds = (thread.participants || [])
      .map((p: { user_id: string }) => p.user_id)
      .filter((id: string) => id !== messageUserId)

    // ════════════════════════════════════════════════════════════
    // 2. Add team managers (transparency)
    // ✅ FIX 2026-02-01: Only include managers with auth accounts
    // ════════════════════════════════════════════════════════════
    const { data: managers } = await supabase
      .from('users')
      .select('id')
      .eq('team_id', teamId)
      .in('role', ['gestionnaire', 'admin'])
      .not('auth_user_id', 'is', null)  // Only invited managers with accounts

    const managerIds = (managers || []).map(m => m.id)
    const recipientIds = [...new Set([...participantIds, ...managerIds])]
      .filter(id => id !== messageUserId)

    if (recipientIds.length === 0) {
      logger.info({ messageId }, '📭 [CONV-NOTIF] No recipients to notify')
      return { success: true, pushSent: 0, emailsSent: 0 }
    }

    // ════════════════════════════════════════════════════════════
    // 3. Get sender info
    // ════════════════════════════════════════════════════════════
    const { data: sender } = await supabase
      .from('users')
      .select('id, name, first_name, last_name, role')
      .eq('id', messageUserId)
      .single()

    const senderName = formatUserName(sender, 'Un participant')

    // ════════════════════════════════════════════════════════════
    // 4. PUSH NOTIFICATIONS
    // ════════════════════════════════════════════════════════════
    let pushSent = 0
    try {
      const result = await sendPushNotificationToUsers(recipientIds, {
        title: `💬 ${senderName}`,
        message: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
        url: `/interventions/${interventionId}?tab=conversations`,
        type: 'new_message'
      })
      pushSent = result.success
      logger.info({ pushSent, failed: result.failed }, '✅ [CONV-NOTIF] Push notifications sent')
    } catch (pushError) {
      logger.warn({ error: pushError }, '⚠️ [CONV-NOTIF] Push notification failed (non-blocking)')
    }

    // ════════════════════════════════════════════════════════════
    // 5. EMAIL NOTIFICATIONS (with throttling)
    // ════════════════════════════════════════════════════════════
    let emailsSent = 0

    // Check throttling (max 1 email per 5 min per thread)
    const shouldSendEmail = checkEmailThrottling(thread.last_email_notification_at)

    if (!shouldSendEmail) {
      logger.info({ threadId }, '📧 [CONV-NOTIF] Email throttled (< 5 min since last)')
    } else {
      emailsSent = await sendEmailNotifications({
        recipientIds,
        sender,
        messageId,
        messageContent,
        messageCreatedAt,
        messageUserId,
        threadId,
        threadType: thread.thread_type as ConversationThreadType,
        interventionId,
        teamId,
        supabase
      })

      // Update throttle timestamp
      await supabase
        .from('conversation_threads')
        .update({ last_email_notification_at: new Date().toISOString() })
        .eq('id', threadId)
    }

    logger.info(
      { messageId, pushSent, emailsSent, recipientCount: recipientIds.length },
      '✅ [CONV-NOTIF] Notifications completed'
    )

    return { success: true, pushSent, emailsSent }

  } catch (error) {
    logger.error({ error, messageId }, '❌ [CONV-NOTIF] Notification sending failed')
    return { success: false, pushSent: 0, emailsSent: 0 }
  }
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

function checkEmailThrottling(lastEmailNotificationAt: string | null): boolean {
  if (!lastEmailNotificationAt) return true

  const lastSent = new Date(lastEmailNotificationAt)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  return lastSent < fiveMinutesAgo
}

interface SendEmailParams {
  recipientIds: string[]
  sender: { id: string; name: string | null; first_name: string | null; last_name: string | null; role: string } | null
  messageId: string
  messageContent: string
  messageCreatedAt: string
  messageUserId: string
  threadId: string
  threadType: ConversationThreadType
  interventionId: string
  teamId: string
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
}

async function sendEmailNotifications(params: SendEmailParams): Promise<number> {
  const {
    recipientIds,
    sender,
    messageId,
    messageContent,
    messageCreatedAt,
    messageUserId,
    threadId,
    threadType,
    interventionId,
    teamId,
    supabase
  } = params

  // Get recipients with email
  const { data: recipients } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .in('id', recipientIds)

  if (!recipients || recipients.length === 0) return 0

  // Get intervention details
  const { data: intervention } = await supabase
    .from('interventions')
    .select('id, title, reference, building_id')
    .eq('id', interventionId)
    .single()

  if (!intervention) return 0

  // Get property address
  let propertyAddress: string | undefined
  if (intervention.building_id) {
    const { data: building } = await supabase
      .from('buildings')
      .select('address_record:address_id(*)')
      .eq('id', intervention.building_id)
      .single()
    if (building?.address_record) {
      propertyAddress = formatFullPropertyAddress(building.address_record)
    }
  }

  // Build emails
  const emailPromises = recipients.map(async (recipient) => {
    return buildNewMessageEmail({
      recipient: {
        id: recipient.id,
        email: recipient.email,
        first_name: recipient.first_name,
        role: recipient.role as 'locataire' | 'prestataire' | 'gestionnaire'
      },
      sender: {
        id: sender?.id || messageUserId,
        name: formatUserName(sender, 'Un participant'),
        first_name: sender?.first_name,
        last_name: sender?.last_name,
        role: sender?.role as 'locataire' | 'prestataire' | 'gestionnaire' | undefined
      },
      message: {
        id: messageId,
        content: messageContent,
        created_at: messageCreatedAt
      },
      intervention: {
        id: intervention.id,
        reference: intervention.reference,
        title: intervention.title
      },
      thread: {
        id: threadId,
        thread_type: threadType
      },
      propertyAddress,
      teamId
    })
  })

  const builtEmails = (await Promise.all(emailPromises)).filter(Boolean)

  if (builtEmails.length === 0) return 0

  // Send emails
  const emailService = createEmailService()
  if (!emailService.isConfigured()) {
    logger.warn({}, '⚠️ [CONV-NOTIF] Email service not configured')
    return 0
  }

  let sentCount = 0

  for (const email of builtEmails) {
    if (sentCount > 0) {
      await delay(500) // Rate limit: 2 req/s
    }

    try {
      const result = await emailService.send(email)
      if (result.success) sentCount++
    } catch {
      // Non-blocking: continue with next
    }
  }

  return sentCount
}
