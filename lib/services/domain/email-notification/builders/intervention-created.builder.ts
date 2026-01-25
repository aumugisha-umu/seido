/**
 * 📧 Intervention Created Email Builder
 *
 * Builds emails for new interventions.
 * Handles different templates for different recipient roles.
 *
 * @module email-notification/builders/intervention-created
 */

import * as React from 'react'
import InterventionCreatedEmail from '@/emails/templates/interventions/intervention-created'
import InterventionAssignedPrestataireEmail from '@/emails/templates/interventions/intervention-assigned-prestataire'
import InterventionAssignedLocataireEmail from '@/emails/templates/interventions/intervention-assigned-locataire'
import type {
  InterventionCreatedEmailProps,
  InterventionAssignedPrestataireEmailProps,
  InterventionAssignedLocataireEmailProps,
  EmailTimeSlotWithActions
} from '@/emails/utils/types'
import { EmailReplyService } from '../../email-reply.service'
import { generateSlotActionLinks } from '../action-link-generators'
import { isInteractiveEmailsEnabled, formatUserName, formatPropertyAddress } from '../helpers'
import { URGENCY_MAP } from '../types'
import type { EnrichedInterventionData, RecipientWithEmail, BuiltEmail } from '../types'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface InterventionCreatedBuildContext {
  enrichedData: EnrichedInterventionData
  recipient: RecipientWithEmail
  magicLinkUrl: string
  creatorName: string
}

// ══════════════════════════════════════════════════════════════
// Builder
// ══════════════════════════════════════════════════════════════

/**
 * Build an intervention created email for a recipient
 *
 * @param context - Build context with enriched data and recipient
 * @returns Built email ready for sending
 */
export async function buildInterventionCreatedEmail(
  context: InterventionCreatedBuildContext
): Promise<BuiltEmail> {
  const { enrichedData, recipient, magicLinkUrl, creatorName } = context
  const { intervention, building, lot, timeSlots, timeSlotsWithIds, quoteInfo, attachments } = enrichedData

  // Common base props
  const baseProps = {
    firstName: recipient.first_name || recipient.email.split('@')[0],
    interventionRef: intervention.reference || 'N/A',
    title: intervention.title || undefined,
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || intervention.title || '',
    propertyAddress: formatPropertyAddress(building, lot),
    lotReference: lot?.reference || undefined,
    interventionUrl: magicLinkUrl,
    urgency: URGENCY_MAP[intervention.urgency || 'normale'] || 'moyenne',
    createdAt: new Date(intervention.created_at)
  }

  // Check if interactive emails are enabled
  const canUseInteractive = isInteractiveEmailsEnabled() && timeSlotsWithIds.length > 0

  // Build email based on recipient role
  let emailContent: React.ReactElement
  let subject: string

  switch (recipient.role) {
    case 'prestataire': {
      // Template for provider: "You have been assigned to an intervention"
      let slotActions: EmailTimeSlotWithActions[] | undefined

      if (canUseInteractive) {
        slotActions = await generateSlotActionLinks(
          recipient.email,
          intervention.id,
          'prestataire',
          timeSlotsWithIds
        )
      }

      const prestataireProps: InterventionAssignedPrestataireEmailProps = {
        ...baseProps,
        managerName: creatorName,
        timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
        quoteInfo: quoteInfo,
        attachments: attachments.length > 0 ? attachments : undefined,
        enableInteractiveButtons: !!slotActions?.length,
        slotActions
      }

      emailContent = InterventionAssignedPrestataireEmail(prestataireProps)
      subject = `🔧 Nouvelle mission ${baseProps.interventionRef} - ${baseProps.interventionType}`
      break
    }

    case 'locataire': {
      // Template for tenant: "An intervention is planned for your unit"
      let slotActions: EmailTimeSlotWithActions[] | undefined

      // FIX: Ne générer les action links que si la confirmation est explicitement requise
      // Si requires_participant_confirmation est false ou null, pas de boutons d'action
      // Cela évite d'envoyer des emails interactifs pour les interventions "date fixe" sans confirmation
      const requiresConfirmation = intervention.requires_participant_confirmation === true

      if (canUseInteractive && requiresConfirmation) {
        slotActions = await generateSlotActionLinks(
          recipient.email,
          intervention.id,
          'locataire',
          timeSlotsWithIds
        )
      }

      const locataireProps: InterventionAssignedLocataireEmailProps = {
        ...baseProps,
        managerName: creatorName,
        timeSlots: timeSlots.length > 0 ? timeSlots : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        enableInteractiveButtons: !!slotActions?.length,
        slotActions
      }

      emailContent = InterventionAssignedLocataireEmail(locataireProps)
      subject = `🏠 Intervention prevue ${baseProps.interventionRef} - ${baseProps.interventionType}`
      break
    }

    case 'gestionnaire':
    default: {
      // Template for manager: "New intervention request"
      const gestionnaireProps: InterventionCreatedEmailProps = {
        ...baseProps,
        tenantName: creatorName,
        attachments: attachments.length > 0 ? attachments : undefined
      }

      emailContent = InterventionCreatedEmail(gestionnaireProps)
      subject = `📋 Nouvelle intervention ${baseProps.interventionRef} - ${baseProps.interventionType}`
      break
    }
  }

  // Generate reply-to address
  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: recipient.email,
    subject,
    react: emailContent,
    replyTo,
    tags: [
      { name: 'type', value: 'intervention_created' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'user_role', value: recipient.role },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}
