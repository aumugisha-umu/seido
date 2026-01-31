/**
 * 📧 Email Notification Types
 *
 * Shared interfaces for the email notification module.
 * This file contains all type definitions used across the email notification system.
 *
 * @module email-notification/types
 */

import type { Database } from '@/lib/database.types'
import type { UserRole } from '@/lib/auth'
import type {
  EmailTimeSlot,
  EmailTimeSlotWithActions,
  EmailQuoteInfo,
  EmailAttachment
} from '@/emails/utils/types'
import type { Intervention, User } from '../../core/service-types'

// ══════════════════════════════════════════════════════════════
// Database Types
// ══════════════════════════════════════════════════════════════

export type NotificationType = Database['public']['Enums']['notification_type']
export type InterventionStatus = Database['public']['Enums']['intervention_status']

// ══════════════════════════════════════════════════════════════
// Result Types
// ══════════════════════════════════════════════════════════════

/**
 * Result of sending an email to a single recipient
 */
export interface EmailRecipientResult {
  userId: string
  email: string
  success: boolean
  emailId?: string
  error?: string
}

/**
 * Result of batch email sending
 */
export interface EmailBatchResult {
  success: boolean
  sentCount: number
  failedCount: number
  results: EmailRecipientResult[]
}

// ══════════════════════════════════════════════════════════════
// Options Types
// ══════════════════════════════════════════════════════════════

/**
 * Options for sendInterventionEmails - unified function
 *
 * Allows controlling which users receive emails based on context.
 *
 * @example
 * ```typescript
 * // Creation: everyone except the creator
 * await emailService.sendInterventionEmails({
 *   interventionId,
 *   eventType: 'created',
 *   excludeUserId: creatorId
 * })
 *
 * // Approval: only tenant + assigned providers
 * await emailService.sendInterventionEmails({
 *   interventionId,
 *   eventType: 'approved',
 *   excludeUserId: managerId,
 *   excludeRoles: ['gestionnaire'],
 *   excludeNonPersonal: true
 * })
 * ```
 */
export interface InterventionEmailOptions {
  /** Intervention ID */
  interventionId: string

  /** Triggering event type */
  eventType: 'created' | 'approved' | 'rejected' | 'scheduled' | 'time_slots_proposed' | 'status_changed' | 'completed'

  /** User ID to exclude (usually the creator/actor) */
  excludeUserId?: string | null

  /** Roles to completely exclude from recipients */
  excludeRoles?: UserRole[]

  /** If defined, ONLY these roles will receive notifications */
  onlyRoles?: UserRole[]

  /** If true, exclude team members not directly assigned */
  excludeNonPersonal?: boolean

  /** Context for status change */
  statusChange?: {
    oldStatus: string
    newStatus: string
    reason?: string
    /** Name of the person who made the status change (e.g., manager name) */
    actorName?: string
  }

  /** Context for proposed time slots (time_slots_proposed) */
  schedulingContext?: {
    planningType: 'direct' | 'propose' | 'organize'
    managerName: string
    proposedSlots?: Array<{
      id?: string  // Slot ID for interactive buttons (optional for backward compatibility)
      date: string
      startTime: string
      endTime: string
    }>
  }
}

/**
 * Filter options for determining recipients
 */
export interface RecipientFilterOptions {
  excludeUserId?: string | null
  excludeRoles?: UserRole[]
  onlyRoles?: UserRole[]
  excludeNonPersonal?: boolean
}

// ══════════════════════════════════════════════════════════════
// Data Types
// ══════════════════════════════════════════════════════════════

/**
 * Enriched intervention data with all related entities
 */
export interface EnrichedInterventionData {
  intervention: Intervention
  building?: {
    id: string
    address: string
    city: string
    postal_code?: string
    country?: string
  } | null
  lot?: {
    id: string
    reference?: string | null
    building_id?: string | null
    postal_code?: string | null
    city?: string | null
    country?: string | null
  } | null
  propertyAddress: string
  lotReference?: string
  creator?: User | null
  timeSlots: EmailTimeSlot[]
  timeSlotsWithIds: Array<{
    id: string
    date: Date
    startTime: string
    endTime: string
  }>
  quoteInfo?: EmailQuoteInfo
  attachments: EmailAttachment[]
  hasDocuments: boolean
  confirmedSlot?: {
    date: Date
    startTime: string
    endTime: string
  }
  providerInfo?: {
    name: string
    company: string
    phone: string
  }
}

/**
 * Recipient with user details for email sending
 */
export interface RecipientWithEmail {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  name?: string | null
  role: UserRole
  company_name?: string | null
  phone?: string | null
}

/**
 * Context for building an email
 */
export interface EmailBuildContext {
  intervention: Intervention
  enrichedData: EnrichedInterventionData
  recipient: RecipientWithEmail
  magicLinkUrl: string
  filterOptions: RecipientFilterOptions
}

/**
 * Built email ready for sending
 */
export interface BuiltEmail {
  to: string
  subject: string
  react: React.ReactElement
  replyTo?: string
  tags: Array<{ name: string; value: string }>
}

// ══════════════════════════════════════════════════════════════
// Status Labels
// ══════════════════════════════════════════════════════════════

/**
 * French labels for intervention statuses
 */
export const STATUS_LABELS: Record<string, string> = {
  'demande': 'Demande',
  'rejetee': 'Rejetee',
  'approuvee': 'Approuvee',
  'demande_de_devis': 'Estimation demandee',
  'planification': 'En planification',
  'planifiee': 'Planifiee',
  'cloturee_par_prestataire': 'Terminee (prestataire)',
  'cloturee_par_locataire': 'Validee (locataire)',
  'cloturee_par_gestionnaire': 'Finalisee',
  'annulee': 'Annulee'
}

/**
 * Urgency mapping from database to email template
 */
export const URGENCY_MAP: Record<string, 'faible' | 'moyenne' | 'haute' | 'critique'> = {
  'basse': 'faible',
  'normale': 'moyenne',
  'haute': 'haute',
  'urgente': 'critique'
}
