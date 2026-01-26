/**
 * Utilitaires pour les actions sur les interventions selon le rôle utilisateur
 * Centralise la logique de mapping statut -> actions pour tous les rôles
 */

import {
  Check,
  X,
  MessageSquare,
  FileText,
  Calendar,
  Euro,
  Clock,
  CheckCircle,
  UserCheck,
  Send,
  CalendarCheck,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Edit,
  XCircle,
  CalendarPlus
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'gestionnaire' | 'prestataire' | 'locataire'

export interface RoleBasedAction {
  /** Label affiché sur le bouton */
  label: string
  /** Icône Lucide */
  icon: LucideIcon
  /** Style du bouton: 'primary' (vert), 'secondary' (outline), 'destructive' (rouge) */
  variant: 'primary' | 'secondary' | 'destructive'
  /** Identifiant de l'action pour le handler */
  actionType: ActionType
  /** URL de navigation (si l'action est une navigation) */
  href?: string
  /** Tab query param pour navigation vers détails */
  tab?: string
  /** Appel API direct (si l'action fait un appel API) */
  apiRoute?: string
  /** Méthode HTTP pour l'appel API */
  apiMethod?: 'POST' | 'PUT' | 'DELETE'
}

export type ActionType =
  // Gestionnaire actions
  | 'approve'
  | 'reject'
  | 'request_details'
  | 'request_quotes'
  | 'start_planning'
  | 'manage_quotes'
  | 'propose_slots'
  | 'remind_tenant'
  | 'finalize'
  | 'reopen'
  | 'validate_directly'
  | 'schedule_followup'
  | 'modify'
  | 'cancel'
  // Prestataire actions
  | 'submit_quote'
  | 'propose_timeslots'
  | 'mark_completed'
  // Locataire actions
  | 'select_slot'
  | 'validate_work'
  | 'contest_work'
  // Common
  | 'view_details'

// ============================================================================
// ACTIONS PAR RÔLE ET STATUT
// ============================================================================

/**
 * Actions disponibles pour le gestionnaire selon le statut
 */
const getGestionnaireActions = (
  status: string,
  interventionId: string
): RoleBasedAction[] => {
  const baseUrl = `/gestionnaire/interventions/${interventionId}`

  switch (status) {
    case 'demande':
      return [
        {
          label: 'Approuver',
          icon: Check,
          variant: 'primary',
          actionType: 'approve',
          apiRoute: '/api/intervention-approve',
          apiMethod: 'POST'
        },
        {
          label: 'Rejeter',
          icon: X,
          variant: 'destructive',
          actionType: 'reject',
          href: `${baseUrl}?action=reject`
        },
        {
          label: 'Demander détails',
          icon: MessageSquare,
          variant: 'secondary',
          actionType: 'request_details',
          href: `${baseUrl}?tab=conversations&prefill=details`
        }
      ]

    case 'approuvee':
      return [
        {
          label: 'Planifier',
          icon: Calendar,
          variant: 'primary',
          actionType: 'start_planning',
          href: `${baseUrl}?tab=planning`
        },
        {
          label: 'Demander estimation',
          icon: FileText,
          variant: 'secondary',
          actionType: 'request_quotes',
          href: `${baseUrl}?tab=planning`
        }
      ]

    // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
    // Gestionnaire can now manage quotes from 'approuvee' or 'planification' status

    case 'planification':
      return [
        {
          label: 'Proposer créneaux',
          icon: Clock,
          variant: 'primary',
          actionType: 'propose_slots',
          href: `${baseUrl}?tab=planning`
        },
        {
          label: 'Gérer estimations',
          icon: FileText,
          variant: 'secondary',
          actionType: 'manage_quotes',
          href: `${baseUrl}?tab=planning`
        }
      ]

    case 'planifiee':
      return [
        {
          label: 'Clôturer',
          icon: CheckCircle,
          variant: 'primary',
          actionType: 'finalize',
          href: `${baseUrl}?action=finalize`
        }
      ]

    case 'cloturee_par_prestataire':
      return [
        {
          label: 'Relancer locataire',
          icon: Send,
          variant: 'primary',
          actionType: 'remind_tenant',
          apiRoute: '/api/intervention-remind-tenant',
          apiMethod: 'POST'
        },
        {
          label: 'Clôturer',
          icon: CheckCircle,
          variant: 'secondary',
          actionType: 'finalize',
          href: `${baseUrl}?action=finalize`
        }
      ]

    case 'cloturee_par_locataire':
      return [
        {
          label: 'Clôturer',
          icon: CheckCircle,
          variant: 'primary',
          actionType: 'finalize',
          apiRoute: '/api/intervention-finalize',
          apiMethod: 'POST'
        }
      ]

    case 'cloturee_par_gestionnaire':
      return [
        {
          label: 'Planifier suivi',
          icon: CalendarPlus,
          variant: 'secondary',
          actionType: 'schedule_followup',
          href: `${baseUrl}?action=schedule-followup`
        }
      ]

    default:
      return []
  }
}

/**
 * Actions disponibles pour le prestataire selon le statut
 */
const getPrestataireActions = (
  status: string,
  interventionId: string
): RoleBasedAction[] => {
  const baseUrl = `/prestataire/interventions/${interventionId}`

  switch (status) {
    // Note: demande_de_devis removed - providers can submit quotes from 'planification' status
    // Quote submission button shown when intervention.requires_quote = true

    case 'planification':
      return [
        {
          label: 'Proposer créneaux',
          icon: CalendarCheck,
          variant: 'primary',
          actionType: 'propose_timeslots',
          href: `${baseUrl}?tab=planning`
        }
      ]

    case 'planifiee':
      return [
        {
          label: 'Marquer terminée',
          icon: CheckCircle,
          variant: 'primary',
          actionType: 'mark_completed',
          apiRoute: '/api/intervention-complete',
          apiMethod: 'POST'
        },
        {
          label: 'Voir détails',
          icon: Eye,
          variant: 'secondary',
          actionType: 'view_details',
          href: baseUrl
        }
      ]

    default:
      return []
  }
}

/**
 * Actions disponibles pour le locataire selon le statut
 */
const getLocataireActions = (
  status: string,
  interventionId: string
): RoleBasedAction[] => {
  const baseUrl = `/locataire/interventions/${interventionId}`

  switch (status) {
    case 'planification':
      return [
        {
          label: 'Valider créneau',
          icon: CalendarCheck,
          variant: 'primary',
          actionType: 'select_slot',
          href: `${baseUrl}?tab=planning`
        }
      ]

    case 'cloturee_par_prestataire':
      return [
        {
          label: 'Valider travaux',
          icon: ThumbsUp,
          variant: 'primary',
          actionType: 'validate_work',
          apiRoute: `/api/intervention/${interventionId}/validate-tenant`,
          apiMethod: 'POST'
        },
        {
          label: 'Contester',
          icon: ThumbsDown,
          variant: 'destructive',
          actionType: 'contest_work',
          href: `${baseUrl}?action=contest`
        }
      ]

    default:
      return []
  }
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Retourne les actions disponibles pour une intervention selon le rôle utilisateur
 *
 * @param interventionId - ID de l'intervention
 * @param status - Statut actuel de l'intervention
 * @param userRole - Rôle de l'utilisateur courant
 * @returns Liste des actions avec label, icône, variant et handler info
 *
 * @example
 * ```tsx
 * const actions = getRoleBasedActions(intervention.id, intervention.status, 'prestataire')
 * // Pour 'planifiee': [{ label: 'Marquer terminée', ... }, { label: 'Voir détails', ... }]
 * ```
 */
export const getRoleBasedActions = (
  interventionId: string,
  status: string,
  userRole: UserRole
): RoleBasedAction[] => {
  switch (userRole) {
    case 'gestionnaire':
      return getGestionnaireActions(status, interventionId)
    case 'prestataire':
      return getPrestataireActions(status, interventionId)
    case 'locataire':
      return getLocataireActions(status, interventionId)
    default:
      return []
  }
}

/**
 * Vérifie si une intervention a des actions disponibles pour un rôle donné
 *
 * @param status - Statut de l'intervention
 * @param userRole - Rôle de l'utilisateur
 * @returns true si au moins une action est disponible
 */
export const hasAvailableActions = (
  status: string,
  userRole: UserRole
): boolean => {
  // Utilise un ID placeholder car on vérifie juste si des actions existent
  const actions = getRoleBasedActions('_check', status, userRole)
  return actions.length > 0
}

/**
 * Convertit le variant de RoleBasedAction vers le variant Button de shadcn
 */
export const toButtonVariant = (
  variant: RoleBasedAction['variant']
): 'default' | 'outline' | 'destructive' => {
  switch (variant) {
    case 'primary':
      return 'default'
    case 'secondary':
      return 'outline'
    case 'destructive':
      return 'destructive'
  }
}

// ============================================================================
// DOT MENU ACTIONS (MODIFIER / ANNULER)
// ============================================================================

/**
 * Retourne les actions du menu contextuel (⋮) pour une intervention
 * Ces actions secondaires (Modifier, Annuler) sont disponibles uniquement pour:
 * - Le gestionnaire
 * - Les statuts intermédiaires: approuvee, planification, planifiee
 *
 * @param interventionId - ID de l'intervention
 * @param status - Statut actuel de l'intervention
 * @param userRole - Rôle de l'utilisateur courant
 * @returns Liste des actions du dot menu
 *
 * @example
 * ```tsx
 * const dotMenuActions = getDotMenuActions(intervention.id, intervention.status, 'gestionnaire')
 * // Pour 'approuvee': [{ label: 'Modifier', ... }, { label: 'Annuler', ... }]
 * // Pour 'demande': [] (pas de dot menu)
 * ```
 */
export const getDotMenuActions = (
  interventionId: string,
  status: string,
  userRole: UserRole
): RoleBasedAction[] => {
  // Dot menu only for gestionnaire on intermediate statuses
  const intermediateStatuses = ['approuvee', 'planification', 'planifiee']

  if (userRole !== 'gestionnaire' || !intermediateStatuses.includes(status)) {
    return []
  }

  const baseUrl = `/gestionnaire/interventions`

  return [
    {
      label: 'Modifier',
      icon: Edit,
      variant: 'secondary',
      actionType: 'modify',
      href: `${baseUrl}/modifier/${interventionId}`
    },
    {
      label: 'Annuler',
      icon: XCircle,
      variant: 'destructive',
      actionType: 'cancel',
      href: `${baseUrl}/${interventionId}?action=cancel`
    }
  ]
}
