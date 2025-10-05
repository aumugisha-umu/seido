/**
 * Status Converter Utilities
 *
 * Gère la conversion bidirectionnelle entre les statuts français (frontend)
 * et les statuts anglais (base de données).
 *
 * Architecture :
 * - Frontend utilise statuts FR (ex: "demande", "approuvee")
 * - Base de données utilise statuts EN (ex: "pending", "approved")
 * - Conversion automatique dans les repositories
 */

import type { InterventionStatusFR } from '@/lib/types/intervention-status-fr'
import type { InterventionStatus } from '../core/service-types'
import { logger, logError } from '@/lib/logger'
/**
 * Mapping bidirectionnel FR → EN
 * Utilisé pour convertir les statuts frontend vers base de données
 */
export const FR_TO_EN_STATUS: Record<InterventionStatusFR, InterventionStatus> = {
  'demande': 'pending',
  'rejetee': 'rejected',
  'approuvee': 'approved',
  'demande_de_devis': 'quote_requested',
  'planification': 'scheduling',
  'planifiee': 'scheduled',
  'en_cours': 'in_progress',
  'cloturee_par_prestataire': 'provider_completed',
  'cloturee_par_locataire': 'tenant_validated',
  'cloturee_par_gestionnaire': 'completed',
  'annulee': 'cancelled'
} as const

/**
 * Mapping inverse EN → FR
 * Utilisé pour convertir les statuts base de données vers frontend
 */
export const EN_TO_FR_STATUS: Record<InterventionStatus, InterventionStatusFR> = {
  'pending': 'demande',
  'rejected': 'rejetee',
  'approved': 'approuvee',
  'quote_requested': 'demande_de_devis',
  'scheduling': 'planification',
  'scheduled': 'planifiee',
  'in_progress': 'en_cours',
  'provider_completed': 'cloturee_par_prestataire',
  'tenant_validated': 'cloturee_par_locataire',
  'completed': 'cloturee_par_gestionnaire',
  'cancelled': 'annulee'
} as const

/**
 * Convertit un statut français (frontend) vers anglais (database)
 *
 * @param frStatus - Statut en français
 * @returns Statut en anglais pour la base de données
 *
 * @example
 * toEnglishStatus('demande') // returns 'pending'
 * toEnglishStatus('approuvee') // returns 'approved'
 */
export function toEnglishStatus(frStatus: string): InterventionStatus {
  const mapped = FR_TO_EN_STATUS[frStatus as InterventionStatusFR]

  if (!mapped) {
    logger.warn(`[STATUS_CONVERTER] Unknown French status: "${frStatus}". Returning as-is.`)
    return frStatus as InterventionStatus
  }

  return mapped
}

/**
 * Convertit un statut anglais (database) vers français (frontend)
 *
 * @param enStatus - Statut en anglais
 * @returns Statut en français pour le frontend
 *
 * @example
 * toFrenchStatus('pending') // returns 'demande'
 * toFrenchStatus('approved') // returns 'approuvee'
 */
export function toFrenchStatus(enStatus: string): InterventionStatusFR {
  const mapped = EN_TO_FR_STATUS[enStatus as InterventionStatus]

  if (!mapped) {
    logger.warn(`[STATUS_CONVERTER] Unknown English status: "${enStatus}". Returning as-is.`)
    return enStatus as InterventionStatusFR
  }

  return mapped
}

/**
 * Convertit un objet contenant un champ status de FR vers EN
 * Utile pour les données avant insertion/update en DB
 *
 * @param data - Objet contenant un champ status
 * @returns Nouvel objet avec status converti en anglais
 */
export function convertStatusToDb<T extends { status?: string }>(data: T): T {
  if (!data.status) return data

  return {
    ...data,
    status: toEnglishStatus(data.status)
  }
}

/**
 * Convertit un objet contenant un champ status de EN vers FR
 * Utile pour les données après lecture depuis la DB
 *
 * @param data - Objet contenant un champ status
 * @returns Nouvel objet avec status converti en français
 */
export function convertStatusFromDb<T extends { status?: string }>(data: T): T {
  if (!data.status) return data

  return {
    ...data,
    status: toFrenchStatus(data.status)
  }
}

/**
 * Convertit un tableau d'objets avec status de EN vers FR
 *
 * @param items - Tableau d'objets contenant un champ status
 * @returns Nouveau tableau avec tous les statuts convertis en français
 */
export function convertStatusArrayFromDb<T extends { status?: string }>(items: T[]): T[] {
  return items.map(item => convertStatusFromDb(item))
}

/**
 * Vérifie si une chaîne est un statut français valide
 *
 * @param value - Valeur à vérifier
 * @returns true si la valeur est un statut français valide
 */
export function isFrenchStatus(value: string): value is InterventionStatusFR {
  return value in FR_TO_EN_STATUS
}

/**
 * Vérifie si une chaîne est un statut anglais valide
 *
 * @param value - Valeur à vérifier
 * @returns true si la valeur est un statut anglais valide
 */
export function isEnglishStatus(value: string): value is InterventionStatus {
  return value in EN_TO_FR_STATUS
}
