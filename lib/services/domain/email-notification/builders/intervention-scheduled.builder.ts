/**
 * 📧 Intervention Scheduled Email Builder
 *
 * Builds emails for scheduled interventions (confirmed time slot).
 *
 * @module email-notification/builders/intervention-scheduled
 */

import InterventionScheduledEmail from '@/emails/templates/interventions/intervention-scheduled'
import type { InterventionScheduledEmailProps } from '@/emails/utils/types'
import { EmailReplyService } from '../../email-reply.service'
import type { EnrichedInterventionData, RecipientWithEmail, BuiltEmail } from '../types'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface InterventionScheduledBuildContext {
  enrichedData: EnrichedInterventionData
  recipient: RecipientWithEmail
  magicLinkUrl: string
  recipientRole: 'locataire' | 'prestataire'
}

// ══════════════════════════════════════════════════════════════
// Builder
// ══════════════════════════════════════════════════════════════

/**
 * Build an intervention scheduled email for a recipient
 *
 * @param context - Build context with enriched data and recipient
 * @returns Built email ready for sending
 */
export async function buildInterventionScheduledEmail(
  context: InterventionScheduledBuildContext
): Promise<BuiltEmail> {
  const { enrichedData, recipient, magicLinkUrl, recipientRole } = context
  const { intervention, propertyAddress, lotReference, confirmedSlot, providerInfo } = enrichedData

  if (!confirmedSlot) {
    throw new Error('No confirmed slot available for scheduled email')
  }

  const emailProps: InterventionScheduledEmailProps = {
    firstName: recipient.first_name || 'Bonjour',
    interventionRef: intervention.reference || 'INT-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || '',
    propertyAddress,
    lotReference,
    interventionUrl: magicLinkUrl,
    providerName: providerInfo?.name || 'Prestataire',
    providerCompany: providerInfo?.company || undefined,
    providerPhone: providerInfo?.phone || undefined,
    scheduledDate: confirmedSlot.date,
    estimatedDuration: intervention.estimated_duration_minutes || undefined,
    recipientRole
  }

  // Generate reply-to address
  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: recipient.email,
    subject: `📅 RDV confirme - ${intervention.reference || intervention.title}`,
    react: InterventionScheduledEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'intervention_scheduled' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'user_role', value: recipientRole },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}
