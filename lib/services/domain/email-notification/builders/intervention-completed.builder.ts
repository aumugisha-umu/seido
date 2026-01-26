/**
 * 📧 Intervention Completed Email Builder
 *
 * Builds emails for completed interventions.
 * Tenants receive validation request, managers receive notification.
 *
 * @module email-notification/builders/intervention-completed
 */

import InterventionCompletedEmail from '@/emails/templates/interventions/intervention-completed'
import type { InterventionCompletedEmailProps } from '@/emails/utils/types'
import { EmailReplyService } from '../../email-reply.service'
import { generateValidationActionLinks } from '../action-link-generators'
import { isInteractiveEmailsEnabled } from '../helpers'
import type { EnrichedInterventionData, RecipientWithEmail, BuiltEmail } from '../types'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface InterventionCompletedBuildContext {
  enrichedData: EnrichedInterventionData
  recipient: RecipientWithEmail
  magicLinkUrl: string
  recipientRole: 'locataire' | 'gestionnaire'
}

// ══════════════════════════════════════════════════════════════
// Builder
// ══════════════════════════════════════════════════════════════

/**
 * Build an intervention completed email for a recipient
 *
 * @param context - Build context with enriched data and recipient
 * @returns Built email ready for sending
 */
export async function buildInterventionCompletedEmail(
  context: InterventionCompletedBuildContext
): Promise<BuiltEmail> {
  const { enrichedData, recipient, magicLinkUrl, recipientRole } = context
  const { intervention, propertyAddress, lotReference, hasDocuments, providerInfo } = enrichedData

  // Generate validate/contest action links for tenants if interactive emails enabled
  let validateUrl: string | undefined
  let contestUrl: string | undefined
  const canUseInteractive = isInteractiveEmailsEnabled()

  if (canUseInteractive && recipientRole === 'locataire' && recipient.email) {
    try {
      const validationLinks = await generateValidationActionLinks(
        recipient.email,
        intervention.id
      )
      validateUrl = validationLinks.validateUrl
      contestUrl = validationLinks.contestUrl
    } catch {
      // Fallback to non-interactive on error
    }
  }

  const emailProps: InterventionCompletedEmailProps = {
    firstName: recipient.first_name || 'Bonjour',
    interventionRef: intervention.reference || 'INT-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || '',
    propertyAddress,
    lotReference,
    interventionUrl: magicLinkUrl,
    providerName: providerInfo?.name || 'Prestataire',
    completedAt: new Date(),
    hasDocuments,
    recipientRole,
    enableInteractiveButtons: !!(validateUrl || contestUrl),
    validateUrl,
    contestUrl
  }

  const subject = recipientRole === 'locataire'
    ? `✅ Intervention terminee - Validation requise - ${intervention.reference || intervention.title}`
    : `✅ Intervention terminee par le prestataire - ${intervention.reference || intervention.title}`

  // Generate reply-to address
  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: recipient.email,
    subject,
    react: InterventionCompletedEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'intervention_completed' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'user_role', value: recipientRole },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}
