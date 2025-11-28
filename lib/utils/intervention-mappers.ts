/**
 * Intervention Mappers - Centralized mapping functions
 *
 * Ce fichier centralise TOUS les mappings d'interventions pour éviter la duplication.
 * Utilisé par: API routes, hooks, composants
 *
 * @file lib/utils/intervention-mappers.ts
 * @created 2025-11-27
 */

import type { Database } from '@/lib/database.types'

// ============================================================================
// Types Database (enums Supabase)
// ============================================================================

export type InterventionType = Database['public']['Enums']['intervention_type']
export type InterventionUrgency = Database['public']['Enums']['intervention_urgency']
export type InterventionStatus = Database['public']['Enums']['intervention_status']

// ============================================================================
// Constants: Mapping Objects
// ============================================================================

/**
 * Frontend type → Database enum
 * Utilisé lors de la création d'interventions
 */
export const INTERVENTION_TYPE_TO_DB: Record<string, InterventionType> = {
  // English (frontend forms)
  'maintenance': 'autre',
  'plumbing': 'plomberie',
  'electrical': 'electricite',
  'heating': 'chauffage',
  'locksmith': 'serrurerie',
  'carpentry': 'menuiserie',
  'painting': 'peinture',
  'cleaning': 'nettoyage',
  'gardening': 'jardinage',
  'renovation': 'renovation',
  'other': 'autre',
  // French (direct values)
  'plomberie': 'plomberie',
  'electricite': 'electricite',
  'chauffage': 'chauffage',
  'serrurerie': 'serrurerie',
  'menuiserie': 'menuiserie',
  'peinture': 'peinture',
  'nettoyage': 'nettoyage',
  'menage': 'nettoyage',  // Alias legacy
  'jardinage': 'jardinage',
  'autre': 'autre'
  // Note: 'renovation' already in English section above
}

/**
 * Database enum → Frontend display label
 * Utilisé pour l'affichage dans les UI
 */
export const INTERVENTION_TYPE_TO_FRONTEND: Record<string, string> = {
  'plomberie': 'Plomberie',
  'electricite': 'Électricité',
  'chauffage': 'Chauffage',
  'serrurerie': 'Serrurerie',
  'menuiserie': 'Menuiserie',
  'peinture': 'Peinture',
  'nettoyage': 'Nettoyage',
  'jardinage': 'Jardinage',
  'renovation': 'Rénovation',
  'autre': 'Autre'
}

/**
 * Frontend urgency → Database enum
 */
export const URGENCY_TO_DB: Record<string, InterventionUrgency> = {
  // English
  'low': 'basse',
  'medium': 'normale',
  'high': 'haute',
  'urgent': 'urgente',
  'critical': 'urgente',  // Maps to urgente (not critique enum)
  // French (direct values)
  'basse': 'basse',
  'normale': 'normale',
  'haute': 'haute',
  'urgente': 'urgente',
  'critique': 'urgente'  // Maps to urgente for DB compatibility
}

/**
 * Database urgency → Frontend display label
 */
export const URGENCY_TO_FRONTEND: Record<string, string> = {
  'basse': 'Basse',
  'normale': 'Normale',
  'haute': 'Haute',
  'urgente': 'Urgente',
  'critique': 'Critique'
}

/**
 * Database status → Frontend display status
 * Utilisé pour les badges et labels d'affichage
 */
export const STATUS_TO_FRONTEND: Record<string, string> = {
  'demande': 'nouvelle-demande',
  'rejetee': 'rejetee',
  'approuvee': 'approuvee',
  'demande_de_devis': 'devis-a-fournir',
  'planification': 'planification',
  'planifiee': 'planifiee',
  'en_cours': 'en-cours',
  'cloturee_par_prestataire': 'travaux-termines',
  'cloturee_par_locataire': 'validee',
  'cloturee_par_gestionnaire': 'cloturee',
  'annulee': 'annulee'
}

/**
 * Database status → Human readable label (French)
 */
export const STATUS_TO_LABEL: Record<string, string> = {
  'demande': 'Nouvelle demande',
  'rejetee': 'Rejetée',
  'approuvee': 'Approuvée',
  'demande_de_devis': 'En attente de devis',
  'planification': 'Planification',
  'planifiee': 'Planifiée',
  'en_cours': 'En cours',
  'cloturee_par_prestataire': 'Travaux terminés',
  'cloturee_par_locataire': 'Validée par locataire',
  'cloturee_par_gestionnaire': 'Clôturée',
  'annulee': 'Annulée'
}

/**
 * Database urgency → Priority level for display
 */
export const URGENCY_TO_PRIORITY: Record<string, string> = {
  'basse': 'basse',
  'normale': 'normale',
  'haute': 'haute',
  'urgente': 'urgent',
  'critique': 'critique'
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Map frontend intervention type to database enum
 * @param frontendType - Type from frontend form (English or French)
 * @returns Database enum value
 */
export const mapInterventionType = (frontendType: string): InterventionType => {
  return INTERVENTION_TYPE_TO_DB[frontendType?.toLowerCase()] || 'autre'
}

/**
 * Map database type to frontend display label
 * @param dbType - Database enum value
 * @returns Human-readable French label
 */
export const mapTypeToFrontend = (dbType: string): string => {
  return INTERVENTION_TYPE_TO_FRONTEND[dbType] || dbType || 'Autre'
}

/**
 * Map frontend urgency to database enum
 * @param frontendUrgency - Urgency from frontend form
 * @returns Database enum value
 */
export const mapUrgencyLevel = (frontendUrgency: string): InterventionUrgency => {
  return URGENCY_TO_DB[frontendUrgency?.toLowerCase()] || 'normale'
}

/**
 * Map database urgency to frontend display label
 * @param dbUrgency - Database enum value
 * @returns Human-readable French label
 */
export const mapUrgencyToFrontend = (dbUrgency: string): string => {
  return URGENCY_TO_FRONTEND[dbUrgency] || dbUrgency || 'Normale'
}

/**
 * Map database urgency to priority level
 * @param dbUrgency - Database enum value
 * @returns Priority level string
 */
export const mapUrgencyToPriority = (dbUrgency: string): string => {
  return URGENCY_TO_PRIORITY[dbUrgency] || 'normale'
}

/**
 * Map database status to frontend display status
 * @param dbStatus - Database status enum
 * @returns Frontend status key
 */
export const mapStatusToFrontend = (dbStatus: string): string => {
  return STATUS_TO_FRONTEND[dbStatus] || dbStatus
}

/**
 * Map database status to human-readable label
 * @param dbStatus - Database status enum
 * @returns French label
 */
export const mapStatusToLabel = (dbStatus: string): string => {
  return STATUS_TO_LABEL[dbStatus] || dbStatus
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all intervention types for select dropdowns
 */
export const getInterventionTypeOptions = () => {
  return Object.entries(INTERVENTION_TYPE_TO_FRONTEND).map(([value, label]) => ({
    value,
    label
  }))
}

/**
 * Get all urgency levels for select dropdowns
 */
export const getUrgencyOptions = () => {
  return Object.entries(URGENCY_TO_FRONTEND).map(([value, label]) => ({
    value,
    label
  }))
}

/**
 * Get all status options for filters
 */
export const getStatusOptions = () => {
  return Object.entries(STATUS_TO_LABEL).map(([value, label]) => ({
    value,
    label
  }))
}

/**
 * Check if status requires manager action
 */
export const statusRequiresManagerAction = (status: string): boolean => {
  return [
    'demande',
    'approuvee',
    'demande_de_devis',
    'planification',
    'planifiee',
    'en_cours'
  ].includes(status)
}

/**
 * Check if status is terminal (intervention closed)
 */
export const isTerminalStatus = (status: string): boolean => {
  return [
    'cloturee_par_gestionnaire',
    'annulee',
    'rejetee'
  ].includes(status)
}
