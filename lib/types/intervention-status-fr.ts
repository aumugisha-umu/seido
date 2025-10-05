/**
 * Intervention Status Types (French)
 *
 * Ces types définissent les statuts d'intervention utilisés côté frontend.
 * Les valeurs sont en français pour l'interface utilisateur, mais sont
 * automatiquement converties en anglais lors de la communication avec la base de données.
 */

/**
 * Type strict pour les statuts d'intervention en français (11 statuts uniquement)
 *
 * Mapping avec la base de données (anglais) :
 * - demande                        → pending
 * - rejetee                        → rejected
 * - approuvee                      → approved
 * - demande_de_devis               → quote_requested
 * - planification                  → scheduling
 * - planifiee                      → scheduled
 * - en_cours                       → in_progress
 * - cloturee_par_prestataire       → provider_completed
 * - cloturee_par_locataire         → tenant_validated
 * - cloturee_par_gestionnaire      → completed
 * - annulee                        → cancelled
 */
export type InterventionStatusFR =
  | 'demande'                        // Initial request from tenant
  | 'rejetee'                        // Rejected by manager
  | 'approuvee'                      // Approved by manager
  | 'demande_de_devis'               // Quote requested from provider
  | 'planification'                  // Finding available time slot
  | 'planifiee'                      // Time slot confirmed
  | 'en_cours'                       // Work in progress
  | 'cloturee_par_prestataire'       // Provider finished work
  | 'cloturee_par_locataire'         // Tenant validated work
  | 'cloturee_par_gestionnaire'      // Manager finalized intervention
  | 'annulee'                        // Cancelled

/**
 * Constante des statuts français pour validation runtime
 */
export const INTERVENTION_STATUSES_FR: readonly InterventionStatusFR[] = [
  'demande',
  'rejetee',
  'approuvee',
  'demande_de_devis',
  'planification',
  'planifiee',
  'en_cours',
  'cloturee_par_prestataire',
  'cloturee_par_locataire',
  'cloturee_par_gestionnaire',
  'annulee'
] as const

/**
 * Vérifie si une valeur est un statut d'intervention valide
 */
export function isValidInterventionStatus(value: unknown): value is InterventionStatusFR {
  return typeof value === 'string' && INTERVENTION_STATUSES_FR.includes(value as InterventionStatusFR)
}

/**
 * Groupes de statuts pour les filtres UI
 */
export const STATUS_GROUPS = {
  demandes: ['demande', 'approuvee'] as const,
  en_cours: ['demande_de_devis', 'planification', 'planifiee', 'en_cours', 'cloturee_par_prestataire'] as const,
  cloturees: ['cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee', 'rejetee'] as const,
  toutes: INTERVENTION_STATUSES_FR
} as const

export type StatusGroup = keyof typeof STATUS_GROUPS
