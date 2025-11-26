/**
 * Intervention Display Utilities
 * i18n support for intervention status, priority, and labels
 */

import {
  type InterventionStatus,
  STATUS_LABELS_FR
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
  // Note: 'en_cours' is DEPRECATED but kept for backward compatibility
  const colorMap: Record<InterventionStatus, string> = {
    demande: 'yellow',
    rejetee: 'red',
    approuvee: 'green',
    demande_de_devis: 'blue',
    planification: 'indigo',
    planifiee: 'purple',
    en_cours: 'orange', // DEPRECATED
    cloturee_par_prestataire: 'teal',
    cloturee_par_locataire: 'cyan',
    cloturee_par_gestionnaire: 'emerald',
    annulee: 'gray'
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
  // Note: 'en_cours' is DEPRECATED but kept for backward compatibility
  const variantMap: Record<InterventionStatus, any> = {
    demande: 'warning',
    rejetee: 'destructive',
    approuvee: 'success',
    demande_de_devis: 'default',
    planification: 'secondary',
    planifiee: 'secondary',
    en_cours: 'default', // DEPRECATED
    cloturee_par_prestataire: 'secondary',
    cloturee_par_locataire: 'success',
    cloturee_par_gestionnaire: 'success',
    annulee: 'outline'
  }
  return variantMap[status] || 'default'
}

/**
 * Validate if string is a valid intervention status
 * @param status - Status string to validate
 * @returns True if status is valid
 */
export const isValidStatus = (status: string): status is InterventionStatus => {
  // Note: 'en_cours' is DEPRECATED but kept for backward compatibility
  const validStatuses: InterventionStatus[] = [
    'demande', 'rejetee', 'approuvee', 'demande_de_devis',
    'planification', 'planifiee', 'en_cours', // DEPRECATED
    'cloturee_par_prestataire', 'cloturee_par_locataire',
    'cloturee_par_gestionnaire', 'annulee'
  ]
  return validStatuses.includes(status as InterventionStatus)
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
  // Note: 'en_cours' is DEPRECATED - interventions go directly from 'planifiee' to 'cloturee_par_*'
  const validTransitions: Record<InterventionStatus, InterventionStatus[]> = {
    demande: ['approuvee', 'rejetee', 'annulee'],
    rejetee: [],
    approuvee: ['demande_de_devis', 'planification', 'annulee'],
    demande_de_devis: ['planification', 'annulee'],
    planification: ['planifiee', 'annulee'],
    planifiee: ['cloturee_par_prestataire', 'cloturee_par_gestionnaire', 'annulee'], // Direct to closure
    en_cours: ['cloturee_par_prestataire', 'annulee'], // DEPRECATED - kept for backward compatibility
    cloturee_par_prestataire: ['cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee'],
    cloturee_par_locataire: ['cloturee_par_gestionnaire', 'annulee'],
    cloturee_par_gestionnaire: [],
    annulee: []
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
  // Note: 'en_cours' is DEPRECATED but kept for backward compatibility
  const descriptionsFR: Record<InterventionStatus, string> = {
    demande: "En attente de validation par le gestionnaire",
    rejetee: "Demande rejetée par le gestionnaire",
    approuvee: "Approuvée et en attente de devis ou planification",
    demande_de_devis: "Devis demandé au prestataire",
    planification: "Recherche d'un créneau de disponibilité",
    planifiee: "Intervention planifiée à une date précise",
    en_cours: "Travaux en cours par le prestataire", // DEPRECATED
    cloturee_par_prestataire: "Travaux terminés, en attente de validation locataire",
    cloturee_par_locataire: "Validée par le locataire, en attente de clôture gestionnaire",
    cloturee_par_gestionnaire: "Intervention terminée et clôturée",
    annulee: "Intervention annulée"
  }

  if (locale === 'fr') {
    return descriptionsFR[status] || ""
  }

  return status.replace(/_/g, ' ')
}
