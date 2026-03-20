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
  AlertTriangle,
  Eye,
  Edit,
  XCircle,
  CalendarPlus,
  RotateCcw
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
  | 'process_request'
  | 'revise_decision'
  | 'request_details'
  | 'request_quotes'
  | 'start_planning'
  | 'manage_quotes'
  | 'propose_slots'
  | 'manage_planning'
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
  const baseUrl = `/gestionnaire/operations/interventions/${interventionId}`

  switch (status) {
    case 'demande':
      return [
        {
          label: 'Traiter demande',
          icon: FileText,
          variant: 'primary',
          actionType: 'process_request',
          href: `${baseUrl}?action=process_request`
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
          href: `${baseUrl}?action=start_planning`
        }
      ]

    // Note: demande_de_devis removed - quote status shown via QuoteStatusBadge
    // Gestionnaire can now manage quotes from 'approuvee' or 'planification' status

    case 'planification':
      return [
        {
          label: 'Gérer planification',
          icon: Calendar,
          variant: 'primary',
          actionType: 'manage_planning',
          href: `${baseUrl}?action=manage_planning`
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
        },
        {
          label: 'Modifier planification',
          icon: Edit,
          variant: 'secondary',
          actionType: 'modify_planning',
          href: `${baseUrl}?action=modify_planning`
        }
      ]

    case 'cloturee_par_prestataire':
      return [
        {
          label: 'Clôturer',
          icon: CheckCircle,
          variant: 'primary',
          actionType: 'finalize',
          href: `${baseUrl}?action=finalize`
        },
        {
          label: 'Relancer locataire',
          icon: Send,
          variant: 'secondary',
          actionType: 'remind_tenant',
          apiRoute: '/api/intervention-remind-tenant',
          apiMethod: 'POST'
        }
      ]

    case 'cloturee_par_locataire':
      return [
        {
          label: 'Clôturer',
          icon: CheckCircle,
          variant: 'primary',
          actionType: 'finalize',
          href: `${baseUrl}?action=finalize`
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

    case 'rejetee':
      return [
        {
          label: 'Modifier décision',
          icon: RotateCcw,
          variant: 'secondary',
          actionType: 'revise_decision',
          href: `${baseUrl}?action=revise_decision`
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
  interventionId: string,
  options?: { requiresQuote?: boolean; hasPendingQuote?: boolean }
): RoleBasedAction[] => {
  const baseUrl = `/prestataire/interventions/${interventionId}`
  const actions: RoleBasedAction[] = []

  switch (status) {
    case 'planification':
      actions.push({
        label: 'Gérer planification',
        icon: CalendarCheck,
        variant: 'primary',
        actionType: 'propose_timeslots',
        href: `${baseUrl}?tab=planning`
      })
      break

    case 'planifiee':
      actions.push(
        {
          label: 'Marquer terminée',
          icon: CheckCircle,
          variant: 'primary',
          actionType: 'mark_completed',
          href: `${baseUrl}?action=complete`
        },
        {
          label: 'Voir détails',
          icon: Eye,
          variant: 'secondary',
          actionType: 'view_details',
          href: baseUrl
        }
      )
      break
  }

  // Quote action — shown when requires_quote and provider has a pending quote request
  if (options?.requiresQuote && options?.hasPendingQuote) {
    actions.push({
      label: 'Gérer devis',
      icon: Euro,
      variant: actions.length > 0 ? 'secondary' : 'primary',
      actionType: 'submit_quote',
      href: `${baseUrl}?action=quote`
    })
  }

  return actions
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
          label: 'Valider',
          icon: CheckCircle,
          variant: 'primary',
          actionType: 'validate_work',
          href: `${baseUrl}?action=validate_work`
        },
        {
          label: 'Contester',
          icon: AlertTriangle,
          variant: 'destructive',
          actionType: 'contest_work',
          href: `${baseUrl}?action=contest_work`
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
  userRole: UserRole,
  options?: { requiresQuote?: boolean; hasPendingQuote?: boolean }
): RoleBasedAction[] => {
  switch (userRole) {
    case 'gestionnaire':
      return getGestionnaireActions(status, interventionId)
    case 'prestataire':
      return getPrestataireActions(status, interventionId, options)
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
 * - Tous les statuts SAUF terminaux: cloturee_par_gestionnaire, annulee
 *
 * @param interventionId - ID de l'intervention
 * @param status - Statut actuel de l'intervention
 * @param userRole - Rôle de l'utilisateur courant
 * @returns Liste des actions du dot menu
 *
 * @example
 * ```tsx
 * const dotMenuActions = getDotMenuActions(intervention.id, intervention.status, 'gestionnaire')
 * // Pour 'demande': [{ label: 'Modifier', ... }, { label: 'Annuler', ... }]
 * // Pour 'annulee': [] (pas de dot menu)
 * ```
 */
export const getDotMenuActions = (
  interventionId: string,
  status: string,
  userRole: UserRole
): RoleBasedAction[] => {
  // Dot menu for gestionnaire on all non-terminal statuses
  const terminalStatuses = ['cloturee_par_gestionnaire', 'annulee']

  if (userRole !== 'gestionnaire' || terminalStatuses.includes(status)) {
    return []
  }

  const baseUrl = `/gestionnaire/operations/interventions`

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
