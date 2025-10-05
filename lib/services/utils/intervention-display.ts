/**
 * Intervention Display Utilities
 * i18n support for intervention status, priority, and labels
 */

import {
  type InterventionStatus,
  STATUS_LABELS_FR,
  STATUS_MAPPING
} from '../core/service-types'

/**
 * Get localized status label
 * @param status - Intervention status (English)
 * @param locale - Language locale (default: 'fr')
 * @returns Localized status label
 */
export const getStatusLabel = (
  status: InterventionStatus,
  locale: 'fr' | 'en' = 'fr'
): string => {
  if (locale === 'fr') {
    return STATUS_LABELS_FR[status] || status
  }

  // Future: Add English labels
  // if (locale === 'en') return STATUS_LABELS_EN[status]

  return status
}

/**
 * Get status color for UI display
 * @param status - Intervention status
 * @returns Tailwind color class name (without prefix)
 */
export const getStatusColor = (status: InterventionStatus): string => {
  const colorMap: Record<InterventionStatus, string> = {
    pending: 'yellow',
    rejected: 'red',
    approved: 'green',
    quote_requested: 'blue',
    scheduling: 'indigo',
    scheduled: 'purple',
    in_progress: 'orange',
    provider_completed: 'teal',
    tenant_validated: 'cyan',
    completed: 'emerald',
    cancelled: 'gray'
  }
  return colorMap[status] || 'gray'
}

/**
 * Get status badge variant
 * @param status - Intervention status
 * @returns Badge variant for UI components
 */
export const getStatusBadgeVariant = (status: InterventionStatus):
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' => {
  const variantMap: Record<InterventionStatus, any> = {
    pending: 'warning',
    rejected: 'destructive',
    approved: 'success',
    quote_requested: 'default',
    scheduling: 'secondary',
    scheduled: 'secondary',
    in_progress: 'default',
    provider_completed: 'secondary',
    tenant_validated: 'success',
    completed: 'success',
    cancelled: 'outline'
  }
  return variantMap[status] || 'default'
}

/**
 * Migrate legacy French status to new English status
 * @param legacyStatus - French status from legacy database
 * @returns English status for new architecture
 */
export const migrateLegacyStatus = (
  legacyStatus: string
): InterventionStatus => {
  const mapped = STATUS_MAPPING[legacyStatus as keyof typeof STATUS_MAPPING]
  return mapped || 'pending'
}

/**
 * Priority labels in French
 */
export const PRIORITY_LABELS_FR: Record<string, string> = {
  low: "Basse",
  medium: "Normale",
  high: "Haute",
  urgent: "Urgente"
}

/**
 * Get priority label
 * @param priority - Intervention priority
 * @param locale - Language locale
 * @returns Localized priority label
 */
export const getPriorityLabel = (
  priority: 'low' | 'medium' | 'high' | 'urgent',
  locale: 'fr' | 'en' = 'fr'
): string => {
  if (locale === 'fr') {
    return PRIORITY_LABELS_FR[priority] || priority
  }
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

/**
 * Get priority color
 * @param priority - Intervention priority
 * @returns Tailwind color class name
 */
export const getPriorityColor = (
  priority: 'low' | 'medium' | 'high' | 'urgent'
): string => {
  const colorMap = {
    low: 'green',
    medium: 'blue',
    high: 'orange',
    urgent: 'red'
  }
  return colorMap[priority] || 'gray'
}

/**
 * Check if status transition is valid
 * @param currentStatus - Current status
 * @param nextStatus - Target status
 * @returns True if transition is allowed
 */
export const isValidStatusTransition = (
  currentStatus: InterventionStatus,
  nextStatus: InterventionStatus
): boolean => {
  const validTransitions: Record<InterventionStatus, InterventionStatus[]> = {
    pending: ['approved', 'rejected', 'cancelled'],
    rejected: [],
    approved: ['quote_requested', 'scheduling', 'cancelled'],
    quote_requested: ['scheduling', 'cancelled'],
    scheduling: ['scheduled', 'cancelled'],
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['provider_completed', 'cancelled'],
    provider_completed: ['tenant_validated', 'cancelled'],
    tenant_validated: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  }

  return validTransitions[currentStatus]?.includes(nextStatus) || false
}

/**
 * Get status description for help text
 * @param status - Intervention status
 * @param locale - Language locale
 * @returns Status description
 */
export const getStatusDescription = (
  status: InterventionStatus,
  locale: 'fr' | 'en' = 'fr'
): string => {
  const descriptionsFR: Record<InterventionStatus, string> = {
    pending: "En attente de validation par le gestionnaire",
    rejected: "Demande rejetée par le gestionnaire",
    approved: "Approuvée et en attente de devis ou planification",
    quote_requested: "Devis demandé au prestataire",
    scheduling: "Recherche d'un créneau de disponibilité",
    scheduled: "Intervention planifiée à une date précise",
    in_progress: "Travaux en cours par le prestataire",
    provider_completed: "Travaux terminés, en attente de validation locataire",
    tenant_validated: "Validée par le locataire, en attente de clôture gestionnaire",
    completed: "Intervention terminée et clôturée",
    cancelled: "Intervention annulée"
  }

  if (locale === 'fr') {
    return descriptionsFR[status] || ""
  }

  return status.replace(/_/g, ' ')
}
