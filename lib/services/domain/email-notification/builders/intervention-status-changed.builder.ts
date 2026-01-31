/**
 * 📧 Intervention Status Changed Email Builder
 *
 * Builds emails for status change notifications.
 * Uses dedicated templates for approval/rejection, generic for other changes.
 *
 * @module email-notification/builders/intervention-status-changed
 */

import InterventionCompletedEmail from '@/emails/templates/interventions/intervention-completed'
import InterventionApprovedEmail from '@/emails/templates/interventions/intervention-approved'
import InterventionRejectedEmail from '@/emails/templates/interventions/intervention-rejected'
import type {
  InterventionCompletedEmailProps,
  InterventionApprovedEmailProps,
  InterventionRejectedEmailProps
} from '@/emails/utils/types'
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
    actorName?: string
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

  // Generate reply-to address
  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  // Common tags
  const tags = [
    { name: 'type', value: 'intervention_status_changed' },
    { name: 'intervention_id', value: intervention.id },
    { name: 'user_role', value: recipientRole },
    { name: 'new_status', value: statusChange.newStatus },
    { name: 'reply_enabled', value: 'true' }
  ]

  // Manager name fallback
  const managerName = statusChange.actorName || 'Votre gestionnaire'

  // ─────────────────────────────────────────────────────────────
  // APPROVED: Use dedicated approval template
  // ─────────────────────────────────────────────────────────────
  if (statusChange.newStatus === 'approuvee') {
    const approvedProps: InterventionApprovedEmailProps = {
      firstName: recipient.first_name || 'Bonjour',
      interventionRef: intervention.reference || `INT-${intervention.id.slice(0, 8)}`,
      interventionType: intervention.type || 'Intervention',
      description: intervention.description || 'Aucune description fournie',
      propertyAddress,
      lotReference,
      interventionUrl: magicLinkUrl,
      managerName,
      approvedAt: new Date(),
      nextSteps: undefined
    }

    return {
      to: recipient.email,
      subject: `✅ Intervention approuvée - ${intervention.reference || intervention.title}`,
      react: InterventionApprovedEmail(approvedProps),
      replyTo,
      tags
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REJECTED: Use dedicated rejection template
  // ─────────────────────────────────────────────────────────────
  if (statusChange.newStatus === 'rejetee') {
    const rejectedProps: InterventionRejectedEmailProps = {
      firstName: recipient.first_name || 'Bonjour',
      interventionRef: intervention.reference || `INT-${intervention.id.slice(0, 8)}`,
      interventionType: intervention.type || 'Intervention',
      description: intervention.description || 'Aucune description fournie',
      propertyAddress,
      lotReference,
      interventionUrl: magicLinkUrl,
      managerName,
      rejectionReason: statusChange.reason || 'Aucun motif spécifié',
      rejectedAt: new Date()
    }

    return {
      to: recipient.email,
      subject: `❌ Demande d'intervention refusée - ${intervention.reference || intervention.title}`,
      react: InterventionRejectedEmail(rejectedProps),
      replyTo,
      tags
    }
  }

  // ─────────────────────────────────────────────────────────────
  // OTHER STATUS CHANGES: Use generic completed template
  // ─────────────────────────────────────────────────────────────
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

  const subject = `📋 Mise à jour - ${intervention.reference || intervention.title} (${newStatusLabel})`

  return {
    to: recipient.email,
    subject,
    react: InterventionCompletedEmail(emailProps),
    replyTo,
    tags
  }
}
