/**
 * 📧 Time Slots Proposed Email Builder
 *
 * Builds emails for proposed time slots (not yet confirmed).
 *
 * @module email-notification/builders/time-slots-proposed
 */

import TimeSlotsProposedEmail from '@/emails/templates/interventions/time-slots-proposed'
import type { TimeSlotsProposedEmailProps, EmailTimeSlotWithActions } from '@/emails/utils/types'
import { EmailReplyService } from '../../email-reply.service'
import { generateSlotActionLinks } from '../action-link-generators'
import { isInteractiveEmailsEnabled } from '../helpers'
import type { EnrichedInterventionData, RecipientWithEmail, BuiltEmail } from '../types'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface TimeSlotsProposedBuildContext {
  enrichedData: EnrichedInterventionData
  recipient: RecipientWithEmail
  magicLinkUrl: string
  recipientRole: 'locataire' | 'prestataire'
  schedulingContext: {
    planningType: 'direct' | 'propose' | 'organize'
    managerName: string
  }
}

// ══════════════════════════════════════════════════════════════
// Builder
// ══════════════════════════════════════════════════════════════

/**
 * Build a time slots proposed email for a recipient
 *
 * @param context - Build context with enriched data and recipient
 * @returns Built email ready for sending
 */
export async function buildTimeSlotsProposedEmail(
  context: TimeSlotsProposedBuildContext
): Promise<BuiltEmail> {
  const { enrichedData, recipient, magicLinkUrl, recipientRole, schedulingContext } = context
  const { intervention, propertyAddress, lotReference, timeSlots, timeSlotsWithIds } = enrichedData

  // Check if interactive emails can be enabled
  const canUseInteractive = isInteractiveEmailsEnabled() && timeSlotsWithIds.length > 0

  // Generate interactive slot actions if enabled
  let slotActions: EmailTimeSlotWithActions[] | undefined

  if (canUseInteractive && recipient.email) {
    try {
      slotActions = await generateSlotActionLinks(
        recipient.email,
        intervention.id,
        recipientRole,
        timeSlotsWithIds
      )
    } catch {
      // Fallback to non-interactive on error
      slotActions = undefined
    }
  }

  const emailProps: TimeSlotsProposedEmailProps = {
    firstName: recipient.first_name || 'Bonjour',
    interventionRef: intervention.reference || 'INT-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || '',
    propertyAddress,
    lotReference,
    interventionUrl: magicLinkUrl,
    managerName: schedulingContext.managerName,
    planningType: schedulingContext.planningType,
    proposedSlots: timeSlots,
    recipientRole,
    enableInteractiveButtons: !!slotActions && slotActions.length > 0,
    slotActions
  }

  const subjectPrefix = schedulingContext.planningType === 'organize'
    ? '🤝 Planification autonome'
    : '📅 Creneaux proposes'

  // Generate reply-to address
  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: recipient.email,
    subject: `${subjectPrefix} - ${intervention.reference || intervention.title}`,
    react: TimeSlotsProposedEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'time_slots_proposed' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'user_role', value: recipientRole },
      { name: 'planning_type', value: schedulingContext.planningType },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}
