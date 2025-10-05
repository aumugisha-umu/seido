/**
 * Status Labels (French)
 *
 * Labels d'affichage en français pour les statuts d'intervention.
 * Utilisés dans l'interface utilisateur pour afficher des libellés
 * plus lisibles que les valeurs techniques.
 */

import type { InterventionStatusFR } from '@/lib/types/intervention-status-fr'

/**
 * Labels d'affichage français pour les statuts d'intervention
 */
export const STATUS_LABELS_FR: Record<InterventionStatusFR, string> = {
  demande: "Demande",
  rejetee: "Rejetée",
  approuvee: "Approuvée",
  demande_de_devis: "Devis demandé",
  planification: "Planification",
  planifiee: "Planifiée",
  en_cours: "En cours",
  cloturee_par_prestataire: "Clôturée par prestataire",
  cloturee_par_locataire: "Clôturée par locataire",
  cloturee_par_gestionnaire: "Terminée",
  annulee: "Annulée"
}

/**
 * Retourne le label d'affichage pour un statut donné
 *
 * @param status - Statut d'intervention en français
 * @returns Label d'affichage en français
 *
 * @example
 * getStatusLabel('demande') // returns 'Demande'
 * getStatusLabel('cloturee_par_prestataire') // returns 'Clôturée par prestataire'
 */
export function getStatusLabel(status: InterventionStatusFR | string): string {
  return STATUS_LABELS_FR[status as InterventionStatusFR] || status
}

/**
 * Couleurs associées aux statuts pour l'affichage UI
 */
export const STATUS_COLORS: Record<InterventionStatusFR, string> = {
  demande: 'yellow',
  rejetee: 'red',
  approuvee: 'green',
  demande_de_devis: 'blue',
  planification: 'indigo',
  planifiee: 'purple',
  en_cours: 'orange',
  cloturee_par_prestataire: 'teal',
  cloturee_par_locataire: 'cyan',
  cloturee_par_gestionnaire: 'emerald',
  annulee: 'gray'
}

/**
 * Retourne la couleur Tailwind associée à un statut
 *
 * @param status - Statut d'intervention en français
 * @returns Nom de couleur Tailwind (sans préfixe)
 *
 * @example
 * getStatusColor('demande') // returns 'yellow'
 * getStatusColor('en_cours') // returns 'orange'
 */
export function getStatusColor(status: InterventionStatusFR | string): string {
  return STATUS_COLORS[status as InterventionStatusFR] || 'gray'
}

/**
 * Variants de badge pour les statuts
 */
export const STATUS_BADGE_VARIANTS: Record<InterventionStatusFR, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  demande: 'warning',
  rejetee: 'destructive',
  approuvee: 'success',
  demande_de_devis: 'default',
  planification: 'secondary',
  planifiee: 'secondary',
  en_cours: 'default',
  cloturee_par_prestataire: 'secondary',
  cloturee_par_locataire: 'success',
  cloturee_par_gestionnaire: 'success',
  annulee: 'outline'
}

/**
 * Retourne le variant de badge approprié pour un statut
 *
 * @param status - Statut d'intervention en français
 * @returns Variant de badge pour composants UI
 */
export function getStatusBadgeVariant(status: InterventionStatusFR | string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' {
  return STATUS_BADGE_VARIANTS[status as InterventionStatusFR] || 'default'
}

/**
 * Descriptions détaillées des statuts (pour tooltips/aide)
 */
export const STATUS_DESCRIPTIONS: Record<InterventionStatusFR, string> = {
  demande: "Intervention demandée par le locataire, en attente de validation",
  rejetee: "Intervention rejetée par le gestionnaire",
  approuvee: "Intervention approuvée par le gestionnaire",
  demande_de_devis: "Devis demandé au prestataire",
  planification: "Recherche d'un créneau disponible",
  planifiee: "Créneau d'intervention confirmé",
  en_cours: "Intervention en cours de réalisation",
  cloturee_par_prestataire: "Travaux terminés par le prestataire, en attente de validation",
  cloturee_par_locataire: "Travaux validés par le locataire",
  cloturee_par_gestionnaire: "Intervention finalisée par le gestionnaire",
  annulee: "Intervention annulée"
}

/**
 * Retourne la description détaillée d'un statut
 *
 * @param status - Statut d'intervention en français
 * @returns Description détaillée du statut
 */
export function getStatusDescription(status: InterventionStatusFR | string): string {
  return STATUS_DESCRIPTIONS[status as InterventionStatusFR] || status
}
