/**
 * 📧 EmailNotificationService - Mapping notifications → emails
 *
 * Ce service orchestre l'envoi d'emails en fonction des notifications système.
 * Il fait le pont entre NotificationService et EmailService.
 *
 * Architecture:
 * - Reçoit les données de notification
 * - Sélectionne le template approprié
 * - Récupère les destinataires depuis la DB
 * - Envoie l'email via EmailService
 */

import { createEmailService } from './email.service'
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

// Import des templates
import {
  InterventionCreatedEmail,
  InterventionApprovedEmail,
  InterventionRejectedEmail,
  InterventionScheduledEmail,
  InterventionCompletedEmail,
} from '@/emails/templates/interventions'
import {
  QuoteRequestEmail,
  QuoteSubmittedEmail,
  QuoteApprovedEmail,
  QuoteRejectedEmail,
} from '@/emails/templates/quotes'

type Intervention = Database['public']['Tables']['interventions']['Row']
type Quote = Database['public']['Tables']['devis']['Row']
type User = Database['public']['Tables']['users']['Row']

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface InterventionEmailData {
  intervention: Intervention
  property: { address: string; lotReference?: string }
  manager?: User
  tenant?: User
  provider?: User
  rejectionReason?: string
  approvalNotes?: string
  scheduledDate?: Date
  estimatedDuration?: number
  completionNotes?: string
  hasDocuments?: boolean
}

export interface QuoteEmailData {
  quote: Quote
  intervention: Intervention
  property: { address: string }
  manager?: User
  provider?: User
  deadline?: Date
  additionalInfo?: string
  rejectionReason?: string
  approvalNotes?: string
  canResubmit?: boolean
}

// ══════════════════════════════════════════════════════════════
// EmailNotificationService Class
// ══════════════════════════════════════════════════════════════

export class EmailNotificationService {
  private emailService = createEmailService()

  // ─────────────────────────────────────────────────────────────
  // Interventions
  // ─────────────────────────────────────────────────────────────

  /**
   * Email: Nouvelle intervention créée → Gestionnaire
   */
  async sendInterventionCreated(data: InterventionEmailData): Promise<void> {
    const { intervention, property, manager, tenant } = data

    if (!manager?.email || !tenant) {
      logger.warn({ interventionId: intervention.id }, '⚠️ Missing manager or tenant email')
      return
    }

    const urgencyMap = {
      faible: 'faible' as const,
      moyenne: 'moyenne' as const,
      haute: 'haute' as const,
      critique: 'critique' as const,
    }

    await this.emailService.send({
      to: manager.email,
      subject: `🔔 Nouvelle intervention ${intervention.reference}`,
      react: InterventionCreatedEmail({
        firstName: manager.first_name || 'Gestionnaire',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        lotReference: property.lotReference,
        interventionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/gestionnaire/interventions/${intervention.id}`,
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        urgency: urgencyMap[intervention.urgency as keyof typeof urgencyMap] || 'moyenne',
        createdAt: new Date(intervention.created_at),
      }),
      tags: [
        { name: 'type', value: 'intervention-created' },
        { name: 'interventionId', value: intervention.id },
      ],
    })

    logger.info({ interventionId: intervention.id }, '📧 Intervention created email sent')
  }

  /**
   * Email: Intervention approuvée → Locataire
   */
  async sendInterventionApproved(data: InterventionEmailData): Promise<void> {
    const { intervention, property, manager, tenant, approvalNotes } = data

    if (!tenant?.email || !manager) {
      logger.warn({ interventionId: intervention.id }, '⚠️ Missing tenant or manager email')
      return
    }

    await this.emailService.send({
      to: tenant.email,
      subject: `✅ Votre intervention ${intervention.reference} est approuvée`,
      react: InterventionApprovedEmail({
        firstName: tenant.first_name || 'Locataire',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        lotReference: property.lotReference,
        interventionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/locataire/interventions/${intervention.id}`,
        managerName: `${manager.first_name} ${manager.last_name}`,
        approvedAt: new Date(),
        nextSteps: approvalNotes,
      }),
      tags: [
        { name: 'type', value: 'intervention-approved' },
        { name: 'interventionId', value: intervention.id },
      ],
    })

    logger.info({ interventionId: intervention.id }, '📧 Intervention approved email sent')
  }

  /**
   * Email: Intervention rejetée → Locataire
   */
  async sendInterventionRejected(data: InterventionEmailData): Promise<void> {
    const { intervention, property, manager, tenant, rejectionReason } = data

    if (!tenant?.email || !manager || !rejectionReason) {
      logger.warn({ interventionId: intervention.id }, '⚠️ Missing data for rejection email')
      return
    }

    await this.emailService.send({
      to: tenant.email,
      subject: `❌ Intervention ${intervention.reference} non retenue`,
      react: InterventionRejectedEmail({
        firstName: tenant.first_name || 'Locataire',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        lotReference: property.lotReference,
        interventionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/locataire/interventions/${intervention.id}`,
        managerName: `${manager.first_name} ${manager.last_name}`,
        rejectionReason,
        rejectedAt: new Date(),
      }),
      tags: [
        { name: 'type', value: 'intervention-rejected' },
        { name: 'interventionId', value: intervention.id },
      ],
    })

    logger.info({ interventionId: intervention.id }, '📧 Intervention rejected email sent')
  }

  /**
   * Email: Intervention planifiée → Locataire + Prestataire
   */
  async sendInterventionScheduled(data: InterventionEmailData): Promise<void> {
    const { intervention, property, tenant, provider, scheduledDate, estimatedDuration } = data

    if (!tenant?.email || !provider?.email || !scheduledDate) {
      logger.warn({ interventionId: intervention.id }, '⚠️ Missing data for scheduled email')
      return
    }

    // Email au locataire
    await this.emailService.send({
      to: tenant.email,
      subject: `📅 RDV confirmé - Intervention ${intervention.reference}`,
      react: InterventionScheduledEmail({
        firstName: tenant.first_name || 'Locataire',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        lotReference: property.lotReference,
        interventionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/locataire/interventions/${intervention.id}`,
        providerName: `${provider.first_name} ${provider.last_name}`,
        providerCompany: provider.company_name || undefined,
        providerPhone: provider.phone_number || undefined,
        scheduledDate,
        estimatedDuration,
        recipientRole: 'locataire',
      }),
      tags: [
        { name: 'type', value: 'intervention-scheduled-tenant' },
        { name: 'interventionId', value: intervention.id },
      ],
    })

    // Email au prestataire
    await this.emailService.send({
      to: provider.email,
      subject: `📅 RDV confirmé - Intervention ${intervention.reference}`,
      react: InterventionScheduledEmail({
        firstName: provider.first_name || 'Prestataire',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        lotReference: property.lotReference,
        interventionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/prestataire/interventions/${intervention.id}`,
        providerName: `${provider.first_name} ${provider.last_name}`,
        providerCompany: provider.company_name || undefined,
        providerPhone: provider.phone_number || undefined,
        scheduledDate,
        estimatedDuration,
        recipientRole: 'prestataire',
      }),
      tags: [
        { name: 'type', value: 'intervention-scheduled-provider' },
        { name: 'interventionId', value: intervention.id },
      ],
    })

    logger.info({ interventionId: intervention.id }, '📧 Intervention scheduled emails sent')
  }

  /**
   * Email: Intervention terminée → Locataire + Gestionnaire
   */
  async sendInterventionCompleted(data: InterventionEmailData): Promise<void> {
    const { intervention, property, tenant, manager, provider, completionNotes, hasDocuments } =
      data

    if (!tenant?.email || !manager?.email || !provider) {
      logger.warn({ interventionId: intervention.id }, '⚠️ Missing data for completion email')
      return
    }

    // Email au locataire
    await this.emailService.send({
      to: tenant.email,
      subject: `✅ Intervention ${intervention.reference} terminée`,
      react: InterventionCompletedEmail({
        firstName: tenant.first_name || 'Locataire',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        lotReference: property.lotReference,
        interventionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/locataire/interventions/${intervention.id}`,
        providerName: `${provider.first_name} ${provider.last_name}`,
        completedAt: new Date(),
        completionNotes,
        hasDocuments: hasDocuments || false,
        recipientRole: 'locataire',
      }),
      tags: [
        { name: 'type', value: 'intervention-completed-tenant' },
        { name: 'interventionId', value: intervention.id },
      ],
    })

    // Email au gestionnaire
    await this.emailService.send({
      to: manager.email,
      subject: `✅ Intervention ${intervention.reference} terminée`,
      react: InterventionCompletedEmail({
        firstName: manager.first_name || 'Gestionnaire',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        lotReference: property.lotReference,
        interventionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/gestionnaire/interventions/${intervention.id}`,
        providerName: `${provider.first_name} ${provider.last_name}`,
        completedAt: new Date(),
        completionNotes,
        hasDocuments: hasDocuments || false,
        recipientRole: 'gestionnaire',
      }),
      tags: [
        { name: 'type', value: 'intervention-completed-manager' },
        { name: 'interventionId', value: intervention.id },
      ],
    })

    logger.info({ interventionId: intervention.id }, '📧 Intervention completed emails sent')
  }

  // ─────────────────────────────────────────────────────────────
  // Devis
  // ─────────────────────────────────────────────────────────────

  /**
   * Email: Demande de devis → Prestataire
   */
  async sendQuoteRequest(data: QuoteEmailData): Promise<void> {
    const { quote, intervention, property, manager, provider, deadline, additionalInfo } = data

    if (!provider?.email || !manager) {
      logger.warn({ quoteId: quote.id }, '⚠️ Missing provider or manager email')
      return
    }

    await this.emailService.send({
      to: provider.email,
      subject: `📝 Nouvelle demande de devis ${quote.reference}`,
      react: QuoteRequestEmail({
        firstName: provider.first_name || 'Prestataire',
        quoteRef: quote.reference || '',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/prestataire/devis/${quote.id}`,
        managerName: `${manager.first_name} ${manager.last_name}`,
        deadline,
        additionalInfo,
      }),
      tags: [
        { name: 'type', value: 'quote-request' },
        { name: 'quoteId', value: quote.id },
      ],
    })

    logger.info({ quoteId: quote.id }, '📧 Quote request email sent')
  }

  /**
   * Email: Devis soumis → Gestionnaire
   */
  async sendQuoteSubmitted(data: QuoteEmailData): Promise<void> {
    const { quote, intervention, property, manager, provider } = data

    if (!manager?.email || !provider) {
      logger.warn({ quoteId: quote.id }, '⚠️ Missing manager or provider email')
      return
    }

    await this.emailService.send({
      to: manager.email,
      subject: `💰 Devis ${quote.reference} reçu`,
      react: QuoteSubmittedEmail({
        firstName: manager.first_name || 'Gestionnaire',
        quoteRef: quote.reference || '',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/gestionnaire/devis/${quote.id}`,
        providerName: `${provider.first_name} ${provider.last_name}`,
        providerCompany: provider.company_name || undefined,
        totalHT: quote.total_ht || 0,
        totalTTC: quote.total_ttc || 0,
        submittedAt: new Date(quote.submitted_at || quote.created_at),
        hasPdfAttachment: !!quote.pdf_url,
      }),
      tags: [
        { name: 'type', value: 'quote-submitted' },
        { name: 'quoteId', value: quote.id },
      ],
    })

    logger.info({ quoteId: quote.id }, '📧 Quote submitted email sent')
  }

  /**
   * Email: Devis approuvé → Prestataire
   */
  async sendQuoteApproved(data: QuoteEmailData): Promise<void> {
    const { quote, intervention, property, manager, provider, approvalNotes } = data

    if (!provider?.email || !manager) {
      logger.warn({ quoteId: quote.id }, '⚠️ Missing provider or manager email')
      return
    }

    await this.emailService.send({
      to: provider.email,
      subject: `✅ Devis ${quote.reference} approuvé`,
      react: QuoteApprovedEmail({
        firstName: provider.first_name || 'Prestataire',
        quoteRef: quote.reference || '',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/prestataire/interventions/${intervention.id}`,
        managerName: `${manager.first_name} ${manager.last_name}`,
        approvedAmount: quote.total_ttc || 0,
        approvedAt: new Date(),
        nextSteps: approvalNotes,
      }),
      tags: [
        { name: 'type', value: 'quote-approved' },
        { name: 'quoteId', value: quote.id },
      ],
    })

    logger.info({ quoteId: quote.id }, '📧 Quote approved email sent')
  }

  /**
   * Email: Devis rejeté → Prestataire
   */
  async sendQuoteRejected(data: QuoteEmailData): Promise<void> {
    const { quote, intervention, property, manager, provider, rejectionReason, canResubmit } = data

    if (!provider?.email || !manager || !rejectionReason) {
      logger.warn({ quoteId: quote.id }, '⚠️ Missing data for rejection email')
      return
    }

    await this.emailService.send({
      to: provider.email,
      subject: `❌ Devis ${quote.reference} non retenu`,
      react: QuoteRejectedEmail({
        firstName: provider.first_name || 'Prestataire',
        quoteRef: quote.reference || '',
        interventionRef: intervention.reference || '',
        interventionType: intervention.type || 'Non spécifié',
        description: intervention.description || '',
        propertyAddress: property.address,
        quoteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/prestataire/devis/${quote.id}`,
        managerName: `${manager.first_name} ${manager.last_name}`,
        rejectionReason,
        rejectedAt: new Date(),
        canResubmit: canResubmit || false,
      }),
      tags: [
        { name: 'type', value: 'quote-rejected' },
        { name: 'quoteId', value: quote.id },
      ],
    })

    logger.info({ quoteId: quote.id }, '📧 Quote rejected email sent')
  }
}

// ══════════════════════════════════════════════════════════════
// Factory Function
// ══════════════════════════════════════════════════════════════

/**
 * Crée une instance du EmailNotificationService
 */
export const createEmailNotificationService = (): EmailNotificationService => {
  return new EmailNotificationService()
}
