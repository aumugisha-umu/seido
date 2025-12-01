/**
 * Système de permissions centralisé pour les composants de prévisualisation d'intervention
 * Détermine les actions autorisées en fonction du rôle utilisateur
 */

import { UserRole } from '../types/intervention-preview.types'

/**
 * Permissions par fonctionnalité
 */
export const permissions = {
  // ============================================================================
  // Devis
  // ============================================================================

  /**
   * Peut gérer (approuver/rejeter) les devis
   * @returns true pour les gestionnaires uniquement
   */
  canManageQuotes: (role: UserRole): boolean => role === 'manager',

  /**
   * Peut soumettre un nouveau devis
   * @returns true pour les prestataires uniquement
   */
  canSubmitQuote: (role: UserRole): boolean => role === 'provider',

  /**
   * Peut voir les devis
   * @returns true pour gestionnaires et prestataires
   */
  canViewQuotes: (role: UserRole): boolean =>
    role === 'manager' || role === 'provider',

  // ============================================================================
  // Planning
  // ============================================================================

  /**
   * Peut modifier le planning (dates, créneaux)
   * @returns true pour les gestionnaires uniquement
   */
  canEditPlanning: (role: UserRole): boolean => role === 'manager',

  /**
   * Peut proposer un créneau horaire
   * @returns true pour gestionnaires et prestataires
   */
  canProposeTimeSlot: (role: UserRole): boolean =>
    role === 'manager' || role === 'provider',

  /**
   * Peut sélectionner/choisir un créneau parmi les propositions
   * @returns true pour les locataires uniquement
   */
  canSelectTimeSlot: (role: UserRole): boolean => role === 'tenant',

  /**
   * Peut approuver ou rejeter un créneau proposé
   * @returns true pour les gestionnaires uniquement
   */
  canApproveTimeSlot: (role: UserRole): boolean => role === 'manager',

  // ============================================================================
  // Documents
  // ============================================================================

  /**
   * Peut ajouter des documents
   * @returns true pour gestionnaires et prestataires
   */
  canAddDocuments: (role: UserRole): boolean =>
    role === 'manager' || role === 'provider',

  /**
   * Peut voir les documents
   * @returns true pour tous les rôles
   */
  canViewDocuments: (_role: UserRole): boolean => true,

  /**
   * Peut supprimer des documents
   * @returns true pour les gestionnaires uniquement
   */
  canDeleteDocuments: (role: UserRole): boolean => role === 'manager',

  // ============================================================================
  // Commentaires internes
  // ============================================================================

  /**
   * Peut voir les commentaires internes
   * @returns true pour les gestionnaires uniquement
   */
  canViewInternalComments: (role: UserRole): boolean => role === 'manager',

  /**
   * Peut ajouter un commentaire interne
   * @returns true pour les gestionnaires uniquement
   */
  canAddComment: (role: UserRole): boolean => role === 'manager',

  // ============================================================================
  // Conversations
  // ============================================================================

  /**
   * Peut démarrer une conversation individuelle avec un participant
   * @returns true pour les gestionnaires uniquement
   */
  canStartIndividualConversation: (role: UserRole): boolean => role === 'manager',

  /**
   * Peut voir la conversation de groupe
   * @returns true pour tous les rôles
   */
  canViewGroupConversation: (role: UserRole): boolean => true,

  // ============================================================================
  // Participants
  // ============================================================================

  /**
   * Retourne les rôles de participants visibles selon le rôle utilisateur
   * - Manager voit tous les participants
   * - Provider voit managers et locataires (pas les autres prestataires)
   * - Tenant voit managers et prestataires (pas les autres locataires)
   */
  canViewParticipantsByRole: (role: UserRole): UserRole[] => {
    switch (role) {
      case 'manager':
        return ['manager', 'provider', 'tenant']
      case 'provider':
        return ['manager', 'tenant']
      case 'tenant':
        return ['manager', 'provider']
    }
  },

  /**
   * Peut modifier la liste des participants
   * @returns true pour les gestionnaires uniquement
   */
  canEditParticipants: (role: UserRole): boolean => role === 'manager',

  // ============================================================================
  // Actions générales
  // ============================================================================

  /**
   * Peut modifier les détails de l'intervention
   * @returns true pour les gestionnaires uniquement
   */
  canEditIntervention: (role: UserRole): boolean => role === 'manager',

  /**
   * Peut clôturer l'intervention
   */
  canCloseIntervention: (role: UserRole): boolean =>
    role === 'manager' || role === 'provider' || role === 'tenant',
}

// ============================================================================
// Helpers de vérification
// ============================================================================

/**
 * Vérifie si l'utilisateur a au moins une permission parmi la liste
 */
export const hasAnyPermission = (
  role: UserRole,
  permissionChecks: ((role: UserRole) => boolean)[]
): boolean => {
  return permissionChecks.some(check => check(role))
}

/**
 * Vérifie si l'utilisateur a toutes les permissions de la liste
 */
export const hasAllPermissions = (
  role: UserRole,
  permissionChecks: ((role: UserRole) => boolean)[]
): boolean => {
  return permissionChecks.every(check => check(role))
}

/**
 * Type guard pour vérifier si un rôle est valide
 */
export const isValidRole = (role: string): role is UserRole => {
  return ['manager', 'provider', 'tenant'].includes(role)
}
