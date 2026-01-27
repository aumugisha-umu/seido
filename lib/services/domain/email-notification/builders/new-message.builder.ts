/**
 * 📧 New Message Email Builder
 *
 * Builds emails for new messages in conversations.
 * Generates magic links for authentication and reply-to addresses for email responses.
 *
 * @module email-notification/builders/new-message
 */

import * as React from 'react'
import NewMessageEmail from '@/emails/templates/conversations/new-message'
import type { NewMessageEmailProps } from '@/emails/templates/conversations/new-message'
import { EmailReplyService, type ConversationThreadType } from '../../email-reply.service'
import { generateNotificationMagicLink } from '../../magic-link.service'
import { formatUserName } from '../helpers'
import { logger } from '@/lib/logger'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface NewMessageBuildContext {
  /** Recipient user info */
  recipient: {
    id: string
    email: string
    first_name?: string | null
    role: 'locataire' | 'prestataire' | 'gestionnaire'
  }
  /** Sender user info */
  sender: {
    id: string
    name: string
    first_name?: string | null
    last_name?: string | null
    role?: 'locataire' | 'prestataire' | 'gestionnaire'
  }
  /** Message content */
  message: {
    id: string
    content: string
    created_at: string
  }
  /** Intervention details */
  intervention: {
    id: string
    reference?: string | null
    title: string
  }
  /** Thread details */
  thread: {
    id: string
    thread_type: ConversationThreadType
  }
  /** Building/lot address (optional) */
  propertyAddress?: string
  /** Team ID for context */
  teamId: string
}

export interface BuiltNewMessageEmail {
  to: string
  subject: string
  react: React.ReactElement
  replyTo: string
  tags: Array<{ name: string; value: string }>
}

// ══════════════════════════════════════════════════════════════
// Builder
// ══════════════════════════════════════════════════════════════

/**
 * Build a new message notification email for a recipient
 *
 * @param context - Build context with message, sender, recipient, and intervention info
 * @returns Built email ready for sending, or null if magic link generation fails
 */
export async function buildNewMessageEmail(
  context: NewMessageBuildContext
): Promise<BuiltNewMessageEmail | null> {
  const { recipient, sender, message, intervention, thread, propertyAddress } = context

  // Generate magic link for conversation URL
  const redirectTo = getRedirectPath(recipient.role, intervention.id)
  const magicLinkUrl = await generateNotificationMagicLink({
    email: recipient.email,
    redirectTo,
  })

  if (!magicLinkUrl) {
    logger.warn(
      { recipientEmail: recipient.email, interventionId: intervention.id },
      '⚠️ [NEW-MESSAGE-BUILDER] Failed to generate magic link - skipping email'
    )
    return null
  }

  // Generate reply-to address for this thread type
  const replyTo = EmailReplyService.generateConversationReplyTo(
    intervention.id,
    thread.thread_type
  )

  // Format sender name
  const senderName = formatUserName(sender, 'Un participant')

  // Truncate message preview (150 chars)
  const messagePreview = message.content.length > 150
    ? message.content.substring(0, 147) + '...'
    : message.content

  // Build email props
  const emailProps: NewMessageEmailProps = {
    firstName: recipient.first_name || recipient.email.split('@')[0],
    sender: {
      name: senderName,
      role: sender.role,
    },
    messagePreview,
    intervention: {
      id: intervention.id,
      reference: intervention.reference,
      title: intervention.title,
      propertyAddress,
    },
    threadType: thread.thread_type,
    conversationUrl: magicLinkUrl,
    sentAt: new Date(message.created_at),
  }

  // Generate subject based on thread type
  const subject = generateSubject(senderName, intervention.reference, thread.thread_type)

  return {
    to: recipient.email,
    subject,
    react: NewMessageEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'new_message' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'thread_id', value: thread.id },
      { name: 'thread_type', value: thread.thread_type },
      { name: 'user_role', value: recipient.role },
      { name: 'reply_enabled', value: 'true' },
    ],
  }
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/**
 * Get redirect path based on user role
 */
function getRedirectPath(role: string, interventionId: string): string {
  switch (role) {
    case 'gestionnaire':
      return `/gestionnaire/interventions/${interventionId}?tab=conversations`
    case 'prestataire':
      return `/prestataire/interventions/${interventionId}?tab=conversations`
    case 'locataire':
      return `/locataire/interventions/${interventionId}?tab=conversations`
    default:
      return `/interventions/${interventionId}?tab=conversations`
  }
}

/**
 * Generate email subject based on context
 */
function generateSubject(
  senderName: string,
  interventionRef: string | null | undefined,
  threadType: ConversationThreadType
): string {
  const ref = interventionRef ? `[${interventionRef}] ` : ''

  if (threadType === 'tenant_to_managers' || threadType === 'provider_to_managers') {
    return `💬 ${ref}Message privé de ${senderName}`
  }

  return `💬 ${ref}Nouveau message de ${senderName}`
}
