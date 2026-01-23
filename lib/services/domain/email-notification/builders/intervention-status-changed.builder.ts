/**
 * 📧 Intervention Status Changed Email Builder
 *
 * Builds emails for status change notifications.
 * Uses the completed template as a base.
 *
 * @module email-notification/builders/intervention-status-changed
 */

import InterventionCompletedEmail from '@/emails/templates/interventions/intervention-completed'
import type { InterventionCompletedEmailProps } from '@/emails/utils/types'
import { EmailReplyService } from '../../email-reply.service'
import { STATUS_LABELS } from '../types'
import type { EnrichedInterventionData, RecipientWithEmail, BuiltEmail } from '../types'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface InterventionStatusChangedBuildContext {
  enrichedData: EnrichedInterventionData
  recipient: RecipientWithEmail
  magicLinkUrl: string
  recipientRole: 'locataire' | 'gestionnaire' | 'prestataire'
  statusChange: {
    oldStatus: string
    newStatus: string
    reason?: string
  }
}

// ══════════════════════════════════════════════════════════════
// Builder
// ══════════════════════════════════════════════════════════════

/**
 * Build an intervention status changed email for a recipient
 *
 * @param context - Build context with enriched data and recipient
 * @returns Built email ready for sending
 */
export async function buildInterventionStatusChangedEmail(
  context: InterventionStatusChangedBuildContext
): Promise<BuiltEmail> {
  const { enrichedData, recipient, magicLinkUrl, recipientRole, statusChange } = context
  const { intervention, propertyAddress, lotReference } = enrichedData

  // Map status to labels
  const newStatusLabel = STATUS_LABELS[statusChange.newStatus] || statusChange.newStatus
  const oldStatusLabel = STATUS_LABELS[statusChange.oldStatus] || statusChange.oldStatus

  // Build completion notes with status change info
  const completionNotes = statusChange.reason
    ? `Changement de statut: ${oldStatusLabel} → ${newStatusLabel}\nMotif: ${statusChange.reason}`
    : `Changement de statut: ${oldStatusLabel} → ${newStatusLabel}`

  const emailProps: InterventionCompletedEmailProps = {
    firstName: recipient.first_name || 'Bonjour',
    interventionRef: intervention.reference || 'INT-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || '',
    propertyAddress,
    lotReference,
    interventionUrl: magicLinkUrl,
    providerName: '',
    completedAt: new Date(),
    completionNotes,
    hasDocuments: false,
    recipientRole: recipientRole === 'prestataire' ? 'gestionnaire' : recipientRole
  }

  const subject = `📋 Mise a jour - ${intervention.reference || intervention.title} (${newStatusLabel})`

  // Generate reply-to address
  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: recipient.email,
    subject,
    react: InterventionCompletedEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'intervention_status_changed' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'user_role', value: recipientRole },
      { name: 'new_status', value: statusChange.newStatus },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}
