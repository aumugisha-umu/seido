/**
 * Intervention Permissions Helper
 *
 * Détermine les permissions d'un participant sur une intervention
 * en fonction de son statut de confirmation.
 *
 * Cas d'usage:
 * - Mode "Date fixe" avec confirmation activée
 * - Mode "Créneaux proposés" (confirmation obligatoire)
 */

export interface ParticipantPermissions {
  /** Peut voir et interagir avec l'intervention (pas en mode lecture seule complet) */
  canInteract: boolean
  /** Peut confirmer ou décliner sa participation */
  canConfirm: boolean
  /** Peut modifier le planning (dates, créneaux) */
  canEditSchedule: boolean
  /** Peut participer au chat */
  canChat: boolean
  /** Peut uploader des documents */
  canUploadDocuments: boolean
  /** Peut soumettre/modifier un devis */
  canManageQuotes: boolean
  /** Raison de restriction (pour affichage utilisateur) */
  reason?: string
}

export interface InterventionConfirmationInfo {
  requires_participant_confirmation: boolean
}

export interface AssignmentConfirmationInfo {
  requires_confirmation: boolean
  confirmation_status: 'pending' | 'confirmed' | 'rejected' | 'not_required'
}

/**
 * Calcule les permissions d'un participant sur une intervention
 *
 * @param intervention - Données de l'intervention (requires_participant_confirmation)
 * @param assignment - Données de l'assignment du participant (requires_confirmation, confirmation_status)
 * @param isCreator - Si l'utilisateur est le créateur de l'intervention
 * @returns ParticipantPermissions
 */
export function getParticipantPermissions(
  intervention: InterventionConfirmationInfo | null,
  assignment: AssignmentConfirmationInfo | null,
  isCreator: boolean = false
): ParticipantPermissions {
  // Créateur = accès complet à tout moment
  if (isCreator) {
    return {
      canInteract: true,
      canConfirm: false,
      canEditSchedule: true,
      canChat: true,
      canUploadDocuments: true,
      canManageQuotes: true
    }
  }

  // Pas d'intervention = pas de permissions
  if (!intervention) {
    return {
      canInteract: false,
      canConfirm: false,
      canEditSchedule: false,
      canChat: false,
      canUploadDocuments: false,
      canManageQuotes: false,
      reason: 'Intervention introuvable'
    }
  }

  // Si la confirmation n'est pas requise pour cette intervention = accès complet
  if (!intervention.requires_participant_confirmation) {
    return {
      canInteract: true,
      canConfirm: false,
      canEditSchedule: true,
      canChat: true,
      canUploadDocuments: true,
      canManageQuotes: true
    }
  }

  // Pas d'assignment pour cet utilisateur = accès restreint (vue uniquement)
  if (!assignment) {
    return {
      canInteract: false,
      canConfirm: false,
      canEditSchedule: false,
      canChat: false,
      canUploadDocuments: false,
      canManageQuotes: false,
      reason: 'Non assigné à cette intervention'
    }
  }

  // Si cet assignment ne nécessite pas de confirmation = accès complet
  if (!assignment.requires_confirmation || assignment.confirmation_status === 'not_required') {
    return {
      canInteract: true,
      canConfirm: false,
      canEditSchedule: true,
      canChat: true,
      canUploadDocuments: true,
      canManageQuotes: true
    }
  }

  // Confirmation requise - déterminer les permissions selon le statut
  switch (assignment.confirmation_status) {
    case 'pending':
      // En attente de confirmation = accès limité
      // Peut voir, chatter, mais pas modifier tant que non confirmé
      return {
        canInteract: true,
        canConfirm: true, // PEUT confirmer/décliner
        canEditSchedule: false,
        canChat: true, // Chat autorisé pour coordination
        canUploadDocuments: false,
        canManageQuotes: false,
        reason: 'Confirmation de disponibilité requise'
      }

    case 'confirmed':
      // Confirmé = accès complet
      return {
        canInteract: true,
        canConfirm: false, // Déjà confirmé
        canEditSchedule: true,
        canChat: true,
        canUploadDocuments: true,
        canManageQuotes: true
      }

    case 'rejected':
      // Décliné = accès très restreint
      return {
        canInteract: false,
        canConfirm: false, // Ne peut plus changer d'avis (pour l'instant)
        canEditSchedule: false,
        canChat: true, // Chat autorisé pour explication
        canUploadDocuments: false,
        canManageQuotes: false,
        reason: 'Vous avez décliné cette intervention'
      }

    default:
      // Fallback = accès complet par défaut
      return {
        canInteract: true,
        canConfirm: false,
        canEditSchedule: true,
        canChat: true,
        canUploadDocuments: true,
        canManageQuotes: true
      }
  }
}

/**
 * Vérifie si un utilisateur a besoin de confirmer sa participation
 *
 * @param assignment - Données de l'assignment
 * @returns boolean
 */
export function needsConfirmation(
  assignment: AssignmentConfirmationInfo | null
): boolean {
  if (!assignment) return false
  return (
    assignment.requires_confirmation === true &&
    assignment.confirmation_status === 'pending'
  )
}

/**
 * Vérifie si un utilisateur a confirmé sa participation
 *
 * @param assignment - Données de l'assignment
 * @returns boolean
 */
export function hasConfirmed(
  assignment: AssignmentConfirmationInfo | null
): boolean {
  if (!assignment) return false
  return assignment.confirmation_status === 'confirmed'
}

/**
 * Vérifie si un utilisateur a décliné sa participation
 *
 * @param assignment - Données de l'assignment
 * @returns boolean
 */
export function hasRejected(
  assignment: AssignmentConfirmationInfo | null
): boolean {
  if (!assignment) return false
  return assignment.confirmation_status === 'rejected'
}
