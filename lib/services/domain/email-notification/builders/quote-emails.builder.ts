/**
 * 📧 Quote Email Builders
 *
 * Builds emails for quote-related notifications:
 * - Quote request (to provider)
 * - Quote submitted (to manager)
 * - Quote approved (to provider)
 * - Quote rejected (to provider)
 *
 * @module email-notification/builders/quote-emails
 */

import QuoteRequestEmail from '@/emails/templates/quotes/quote-request'
import QuoteSubmittedEmail from '@/emails/templates/quotes/quote-submitted'
import QuoteApprovedEmail from '@/emails/templates/quotes/quote-approved'
import QuoteRejectedEmail from '@/emails/templates/quotes/quote-rejected'
import type {
  QuoteRequestEmailProps,
  QuoteSubmittedEmailProps,
  QuoteApprovedEmailProps,
  QuoteRejectedEmailProps
} from '@/emails/utils/types'
import { EmailReplyService } from '../../email-reply.service'
import { DEFAULT_TVA_RATE } from '../constants'
import type { BuiltEmail } from '../types'
import type { Intervention, User } from '../../../core/service-types'

// ══════════════════════════════════════════════════════════════
// Quote Request
// ══════════════════════════════════════════════════════════════

export interface QuoteRequestBuildContext {
  quote: { id: string; reference?: string | null }
  intervention: Intervention
  property: { address: string }
  manager: User
  provider: User & { email: string }
}

/**
 * Build a quote request email for a provider
 */
export async function buildQuoteRequestEmail(
  context: QuoteRequestBuildContext
): Promise<BuiltEmail> {
  const { quote, intervention, property, manager, provider } = context

  const emailProps: QuoteRequestEmailProps = {
    firstName: provider.first_name || 'Prestataire',
    quoteRef: quote.reference || 'DEV-???',
    interventionRef: intervention.reference ?? 'REF-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description,
    propertyAddress: property.address,
    quoteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/prestataire/interventions/${intervention.id}/devis/${quote.id}`,
    managerName: `${manager.first_name} ${manager.last_name}`
  }

  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: provider.email,
    subject: `Demande de devis pour intervention ${intervention.reference || ''}`,
    react: QuoteRequestEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'quote_request' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}

// ══════════════════════════════════════════════════════════════
// Quote Submitted
// ══════════════════════════════════════════════════════════════

export interface QuoteSubmittedBuildContext {
  quote: { id: string; reference?: string | null; amount?: number | null }
  intervention: Intervention
  property: { address: string }
  manager: User & { email: string }
  provider: User
}

/**
 * Build a quote submitted email for a manager
 */
export async function buildQuoteSubmittedEmail(
  context: QuoteSubmittedBuildContext
): Promise<BuiltEmail> {
  const { quote, intervention, property, manager, provider } = context

  const providerName = `${provider.first_name || ''} ${provider.last_name || ''}`.trim() ||
    (provider as any).company_name || 'Prestataire'

  const emailProps: QuoteSubmittedEmailProps = {
    firstName: manager.first_name || 'Gestionnaire',
    quoteRef: quote.reference || `DEV-${quote.id?.slice(0, 8)}`,
    interventionRef: intervention.reference || 'REF-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || '',
    propertyAddress: property.address,
    quoteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/gestionnaire/interventions/${intervention.id}`,
    providerName,
    providerCompany: (provider as any).company_name,
    totalHT: quote.amount || 0,
    totalTTC: quote.amount ? quote.amount * (1 + DEFAULT_TVA_RATE) : 0,
    submittedAt: new Date(),
    hasPdfAttachment: false
  }

  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: manager.email,
    subject: `📋 Nouveau devis recu - ${intervention.reference || intervention.title}`,
    react: QuoteSubmittedEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'quote_submitted' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}

// ══════════════════════════════════════════════════════════════
// Quote Approved
// ══════════════════════════════════════════════════════════════

export interface QuoteApprovedBuildContext {
  quote: { id: string; reference?: string | null; amount?: number | null }
  intervention: Intervention
  property: { address: string }
  manager: User
  provider: User & { email: string }
  approvalNotes?: string
}

/**
 * Build a quote approved email for a provider
 */
export async function buildQuoteApprovedEmail(
  context: QuoteApprovedBuildContext
): Promise<BuiltEmail> {
  const { quote, intervention, property, manager, provider, approvalNotes } = context

  const managerName = `${manager.first_name || ''} ${manager.last_name || ''}`.trim() || 'Gestionnaire'

  const emailProps: QuoteApprovedEmailProps = {
    firstName: provider.first_name || 'Prestataire',
    quoteRef: quote.reference || `DEV-${quote.id?.slice(0, 8)}`,
    interventionRef: intervention.reference || 'REF-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || '',
    propertyAddress: property.address,
    quoteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/prestataire/interventions/${intervention.id}`,
    managerName,
    approvedAmount: quote.amount || 0,
    approvedAt: new Date(),
    nextSteps: approvalNotes
  }

  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: provider.email,
    subject: `✅ Devis approuve - ${intervention.reference || intervention.title}`,
    react: QuoteApprovedEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'quote_approved' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}

// ══════════════════════════════════════════════════════════════
// Quote Rejected
// ══════════════════════════════════════════════════════════════

export interface QuoteRejectedBuildContext {
  quote: { id: string; reference?: string | null }
  intervention: Intervention
  property: { address: string }
  manager: User
  provider: User & { email: string }
  rejectionReason?: string
  canResubmit?: boolean
}

/**
 * Build a quote rejected email for a provider
 */
export async function buildQuoteRejectedEmail(
  context: QuoteRejectedBuildContext
): Promise<BuiltEmail> {
  const { quote, intervention, property, manager, provider, rejectionReason, canResubmit } = context

  const managerName = `${manager.first_name || ''} ${manager.last_name || ''}`.trim() || 'Gestionnaire'

  const emailProps: QuoteRejectedEmailProps = {
    firstName: provider.first_name || 'Prestataire',
    quoteRef: quote.reference || `DEV-${quote.id?.slice(0, 8)}`,
    interventionRef: intervention.reference || 'REF-???',
    interventionType: intervention.type || 'Intervention',
    description: intervention.description || '',
    propertyAddress: property.address,
    quoteUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/prestataire/interventions/${intervention.id}`,
    managerName,
    rejectionReason: rejectionReason || 'Aucune raison specifiee',
    rejectedAt: new Date(),
    canResubmit: canResubmit ?? true
  }

  const replyTo = EmailReplyService.generateInterventionReplyTo(intervention.id)

  return {
    to: provider.email,
    subject: `❌ Devis refuse - ${intervention.reference || intervention.title}`,
    react: QuoteRejectedEmail(emailProps),
    replyTo,
    tags: [
      { name: 'type', value: 'quote_rejected' },
      { name: 'intervention_id', value: intervention.id },
      { name: 'reply_enabled', value: 'true' }
    ]
  }
}
