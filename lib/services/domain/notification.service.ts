/**
 * Notification Domain Service
 *
 * Business logic for notification management (pure, testable).
 * NO direct Supabase calls - uses NotificationRepository for data access.
 *
 * Architecture:
 * - Server Actions → NotificationService (this) → NotificationRepository → Supabase
 *
 * @example
 * ```typescript
 * const repository = await createServerNotificationRepository()
 * const service = new NotificationService(repository)
 * await service.notifyInterventionCreated({ interventionId, teamId, createdBy })
 * ```
 */

import type { NotificationRepository } from '../repositories/notification-repository'
import type { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'
import {
  determineInterventionRecipients,
  determineBuildingRecipients,
  determineLotRecipients,
  determineContactRecipients,
  formatInterventionMessage,
  truncate,
  type NotificationRecipient,
  type InterventionWithManagers,
  type BuildingWithManagers,
  type LotWithManagers,
  type ContactWithManagers
} from './notification-helpers'

type NotificationType = Database['public']['Enums']['notification_type']

/**
 * Notification Domain Service
 */
export class NotificationService {
  constructor(private repository: NotificationRepository) { }

  // ============================================================================
  // REUSABLE HELPERS FOR INTERVENTION NOTIFICATIONS
  // ============================================================================

  /**
   * Get all assigned users with their roles for an intervention
   * Optimized: 1 query instead of N queries
   * @returns Map for O(1) lookup by userId
   */
  private async getAssignedUsersWithRoles(
    interventionId: string
  ): Promise<Map<string, { role: string; is_primary: boolean }>> {
    const { data: assignments } = await this.repository.supabase
      .from('intervention_assignments')
      .select('user_id, role, is_primary')
      .eq('intervention_id', interventionId)

    const assignmentMap = new Map<string, { role: string; is_primary: boolean }>()

    if (assignments) {
      assignments.forEach(assignment => {
        assignmentMap.set(assignment.user_id, {
          role: assignment.role,
          is_primary: assignment.is_primary
        })
      })
    }

    return assignmentMap
  }

  /**
   * Status labels (French)
   */
  private readonly STATUS_LABELS: Record<string, string> = {
    demande: 'Demande',
    rejetee: 'Rejetée',
    approuvee: 'Approuvée',
    demande_de_devis: 'Demande de devis',
    planification: 'Planification',
    planifiee: 'Planifiée',
    en_cours: 'En cours',
    cloturee_par_prestataire: 'Clôturée par prestataire',
    cloturee_par_locataire: 'Clôturée par locataire',
    cloturee_par_gestionnaire: 'Clôturée par gestionnaire',
    annulee: 'Annulée'
  }

  /**
   * Generate role-adapted message for intervention creation
   */
  private getInterventionCreatedMessage(
    intervention: InterventionWithManagers,
    role: string
  ): string {
    switch (role) {
      case 'locataire':
        return `Une intervention "${intervention.title}" a été créée pour votre logement`
      case 'prestataire':
        return `Vous avez été assigné(e) à l'intervention "${intervention.title}" en tant que prestataire`
      case 'gestionnaire':
        return `Vous avez été assigné(e) à l'intervention "${intervention.title}" en tant que gestionnaire`
      default:
        return `Vous avez été assigné(e) à l'intervention "${intervention.title}"`
    }
  }

  /**
   * Generate role-adapted message for status change
   */
  private getStatusChangeMessage(
    intervention: InterventionWithManagers,
    oldStatus: string,
    newStatus: string,
    role: string | null,
    reason?: string
  ): string {
    const oldLabel = this.STATUS_LABELS[oldStatus] || oldStatus
    const newLabel = this.STATUS_LABELS[newStatus] || newStatus
    const reasonText = reason ? `. Motif: ${reason}` : ''

    // Messages spécifiques pour locataires
    if (role === 'locataire') {
      if (oldStatus === 'demande' && newStatus === 'approuvee') {
        return `Votre demande d'intervention "${intervention.title}" a été approuvée${reasonText}`
      }
      if (oldStatus === 'demande' && newStatus === 'rejetee') {
        return `Votre demande d'intervention "${intervention.title}" a été rejetée${reasonText}`
      }
      if (newStatus === 'cloturee_par_prestataire') {
        return `Le prestataire a terminé les travaux pour "${intervention.title}". Merci de valider${reasonText}`
      }
      return `L'intervention "${intervention.title}" dans votre logement est passée de "${oldLabel}" à "${newLabel}"${reasonText}`
    }

    // Messages spécifiques pour prestataires
    if (role === 'prestataire') {
      if (oldStatus === 'approuvee' && newStatus === 'planification') {
        return `L'intervention "${intervention.title}" qui vous est assignée est maintenant en planification${reasonText}`
      }
      if (newStatus === 'en_cours') {
        return `Vous avez démarré l'intervention "${intervention.title}"${reasonText}`
      }
      return `L'intervention "${intervention.title}" à laquelle vous êtes assigné(e) est passée de "${oldLabel}" à "${newLabel}"${reasonText}`
    }

    // Messages spécifiques pour gestionnaires assignés
    if (role === 'gestionnaire') {
      return `L'intervention "${intervention.title}" que vous gérez est passée de "${oldLabel}" à "${newLabel}"${reasonText}`
    }

    // Fallback pour membres d'équipe (non assignés)
    return `L'intervention "${intervention.title}" est passée de "${oldLabel}" à "${newLabel}"${reasonText}`
  }

  // ============================================================================
  // NOTIFICATION METHODS
  // ============================================================================

  /**
   * Notifier la création d'une intervention
   */
  async notifyInterventionCreated({
    interventionId,
    teamId,
    createdBy
  }: {
    interventionId: string
    teamId: string
    createdBy: string
  }) {
    // 1. Fetch data via repository with extended details
    const intervention = await this.repository.getInterventionWithManagers(interventionId)

    logger.info({
      interventionId: intervention.id,
      hasLot: !!intervention.lot,
      hasBuilding: !!intervention.building,
      lotRef: intervention.lot?.reference,
      buildingName: intervention.lot?.building?.name || intervention.building?.name
    }, '🔍 [DEBUG] Intervention data fetched')

    // Build context string (lot or building reference)
    const lotRef = intervention.lot?.reference
    const buildingName = intervention.lot?.building?.name || intervention.building?.name
    const context = lotRef
      ? `${buildingName} - Lot ${lotRef}`
      : buildingName || 'Emplacement non spécifié'

    // 2. Fetch ALL assignments once (performance optimization: 1 query instead of N)
    const assignmentMap = await this.getAssignedUsersWithRoles(interventionId)

    // 3. Déterminer les destinataires (business logic) - EXCLUT le créateur
    const recipients = determineInterventionRecipients(intervention, { excludeUserId: createdBy })

    // 4. Créer les notifications avec titre amélioré et messages adaptés par rôle
    const notifications = await Promise.all(
      recipients.map(async recipient => {
        // O(1) lookup for assignment instead of database query
        const assignment = assignmentMap.get(recipient.userId)
        const isAssigned = !!assignment

        // Use helper to get role-adapted message
        const message = isAssigned && assignment.role
          ? this.getInterventionCreatedMessage(intervention, assignment.role)
          : `Une nouvelle intervention "${intervention.title}" a été créée dans votre équipe`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: createdBy,
          type: 'intervention',
          title: `Nouvelle intervention - ${context}`,
          message,
          is_personal: assignment?.is_primary ?? false,
          metadata: {
            intervention_id: interventionId,
            lot_reference: intervention.lot?.reference,
            building_name: buildingName,
            context,
            is_assigned: isAssigned,
            assigned_role: assignment?.role || null
          },
          related_entity_type: 'intervention',
          related_entity_id: interventionId
        })
      })
    )

    logger.info(`📬 Intervention creation notifications sent:`, {
      total: recipients.length,
      personal: recipients.filter((_, i) => notifications[i]?.data?.is_personal).length,
      team: recipients.filter((_, i) => !notifications[i]?.data?.is_personal).length
    })

    return notifications
  }

  /**
   * Notifier le changement de statut d'une intervention
   */
  async notifyInterventionStatusChange({
    interventionId,
    oldStatus,
    newStatus,
    teamId,
    changedBy,
    reason
  }: {
    interventionId: string
    oldStatus: string
    newStatus: string
    teamId: string
    changedBy: string
    reason?: string
  }) {
    // 1. Fetch intervention with managers
    const intervention = await this.repository.getInterventionWithManagers(interventionId)

    // 2. Fetch ALL assignments once (performance optimization: 1 query instead of N)
    const assignmentMap = await this.getAssignedUsersWithRoles(interventionId)

    // 3. Determine recipients
    const recipients = determineInterventionRecipients(intervention, { excludeUserId: changedBy })

    // 4. Create role-adapted notifications
    const notifications = await Promise.all(
      recipients.map(recipient => {
        // O(1) lookup for assignment
        const assignment = assignmentMap.get(recipient.userId)

        // Use helper to get role-adapted message
        const message = this.getStatusChangeMessage(
          intervention,
          oldStatus,
          newStatus,
          assignment?.role || null,
          reason
        )

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: changedBy,
          type: 'status_change',
          title: `Intervention ${this.STATUS_LABELS[newStatus]?.toLowerCase() || newStatus}`,
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            intervention_id: interventionId,
            old_status: oldStatus,
            new_status: newStatus,
            reason: reason || null,
            is_assigned: !!assignment,
            assigned_role: assignment?.role || null
          },
          related_entity_type: 'intervention',
          related_entity_id: interventionId
        })
      })
    )

    return notifications
  }

  /**
   * Notifier la création d'un bâtiment
   */
  async notifyBuildingCreated({
    buildingId,
    teamId,
    createdBy
  }: {
    buildingId: string
    teamId: string
    createdBy: string
  }) {
    const building = await this.repository.getBuildingWithManagers(buildingId)
    const recipients = determineBuildingRecipients(building, createdBy)

    const notifications = await Promise.all(
      recipients.map(recipient => {
        const message = recipient.isPersonal
          ? `Vous avez été désigné(e) comme gestionnaire responsable de l'immeuble "${building.name}"`
          : `Un nouvel immeuble "${building.name}" a été ajouté`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: createdBy,
          type: 'system',
          title: recipient.isPersonal ? 'Vous êtes responsable d\'un nouvel immeuble' : 'Nouvel immeuble créé',
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            building_id: buildingId,
            building_name: building.name,
            address: building.address
          },
          related_entity_type: 'building',
          related_entity_id: buildingId
        })
      })
    )

    return notifications
  }

  /**
   * Notifier la modification d'un bâtiment
   */
  async notifyBuildingUpdated({
    buildingId,
    teamId,
    updatedBy,
    changes
  }: {
    buildingId: string
    teamId: string
    updatedBy: string
    changes: Record<string, any>
  }) {
    const building = await this.repository.getBuildingWithManagers(buildingId)
    const recipients = determineBuildingRecipients(building, updatedBy)

    const notifications = await Promise.all(
      recipients.map(recipient => {
        const message = recipient.isPersonal
          ? `L'immeuble "${building.name}" dont vous êtes responsable a été modifié`
          : `L'immeuble "${building.name}" a été modifié`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: updatedBy,
          type: 'system',
          title: 'Immeuble modifié',
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            building_id: buildingId,
            building_name: building.name,
            changes
          },
          related_entity_type: 'building',
          related_entity_id: buildingId
        })
      })
    )

    return notifications
  }

  /**
   * Notifier la suppression d'un bâtiment
   */
  async notifyBuildingDeleted({
    building,
    teamId,
    deletedBy
  }: {
    building: { id: string; name: string; address: string; team_id: string }
    teamId: string
    deletedBy: string
  }) {
    const buildingWithManagers = await this.repository.getBuildingWithManagers(building.id)
    const recipients = determineBuildingRecipients(buildingWithManagers, deletedBy)

    const notifications = await Promise.all(
      recipients.map(recipient => {
        const message = recipient.isPersonal
          ? `L'immeuble "${building.name}" dont vous étiez responsable a été supprimé`
          : `L'immeuble "${building.name}" a été supprimé`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: deletedBy,
          type: 'system',
          title: 'Immeuble supprimé',
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            building_name: building.name,
            address: building.address
          },
          related_entity_type: 'building',
          related_entity_id: building.id
        })
      })
    )

    return notifications
  }

  /**
   * Notifier la création d'un lot
   */
  async notifyLotCreated({
    lotId,
    teamId,
    createdBy
  }: {
    lotId: string
    teamId: string
    createdBy: string
  }) {
    const lot = await this.repository.getLotWithManagers(lotId)
    const recipients = determineLotRecipients(lot, createdBy)

    const notifications = await Promise.all(
      recipients.map(recipient => {
        let message: string
        if (recipient.isPersonal) {
          if (lot.lotManagers.includes(recipient.userId)) {
            message = `Vous avez été assigné(e) comme gestionnaire du lot "${lot.reference}" dans l'immeuble "${lot.building?.name || 'N/A'}"`
          } else {
            message = `Un nouveau lot "${lot.reference}" a été créé dans l'immeuble "${lot.building?.name || 'N/A'}" dont vous êtes responsable`
          }
        } else {
          message = `Un nouveau lot "${lot.reference}" a été ajouté à l'immeuble "${lot.building?.name || 'N/A'}"`
        }

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: createdBy,
          type: 'system',
          title: recipient.isPersonal ? 'Nouveau lot sous votre responsabilité' : 'Nouveau lot créé',
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            lot_id: lotId,
            lot_reference: lot.reference,
            building_name: lot.building?.name
          },
          related_entity_type: 'lot',
          related_entity_id: lotId
        })
      })
    )

    return notifications
  }

  /**
   * Notifier la modification d'un lot
   */
  async notifyLotUpdated({
    lotId,
    teamId,
    updatedBy,
    changes
  }: {
    lotId: string
    teamId: string
    updatedBy: string
    changes: Record<string, any>
  }) {
    const lot = await this.repository.getLotWithManagers(lotId)
    const recipients = determineLotRecipients(lot, updatedBy)

    const notifications = await Promise.all(
      recipients.map(recipient => {
        const message = recipient.isPersonal
          ? `Le lot "${lot.reference}" dont vous êtes responsable a été modifié`
          : `Le lot "${lot.reference}" a été modifié`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: updatedBy,
          type: 'system',
          title: 'Lot modifié',
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            lot_id: lotId,
            lot_reference: lot.reference,
            building_name: lot.building?.name,
            changes
          },
          related_entity_type: 'lot',
          related_entity_id: lotId
        })
      })
    )

    return notifications
  }

  /**
   * Notifier la suppression d'un lot
   */
  async notifyLotDeleted({
    lot,
    teamId,
    deletedBy
  }: {
    lot: { id: string; reference: string; building_id: string; team_id: string }
    teamId: string
    deletedBy: string
  }) {
    const lotWithManagers = await this.repository.getLotWithManagers(lot.id)
    const recipients = determineLotRecipients(lotWithManagers, deletedBy)

    const notifications = await Promise.all(
      recipients.map(recipient => {
        const message = recipient.isPersonal
          ? `Le lot "${lot.reference}" dont vous étiez responsable a été supprimé`
          : `Le lot "${lot.reference}" a été supprimé`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: deletedBy,
          type: 'system',
          title: 'Lot supprimé',
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            lot_reference: lot.reference,
            building_name: lotWithManagers.building?.name
          },
          related_entity_type: 'lot',
          related_entity_id: lot.id
        })
      })
    )

    return notifications
  }

  /**
   * Notifier la création d'un contact
   */
  async notifyContactCreated({
    contactId,
    teamId,
    createdBy
  }: {
    contactId: string
    teamId: string
    createdBy: string
  }) {
    const contact = await this.repository.getContactWithManagers(contactId)
    const recipients = determineContactRecipients(contact, createdBy)

    const notifications = await Promise.all(
      recipients.map(recipient => {
        const message = recipient.isPersonal
          ? `Un nouveau contact "${contact.first_name} ${contact.last_name}" a été ajouté et est lié à des biens dont vous êtes responsable`
          : `Un nouveau contact "${contact.first_name} ${contact.last_name}" a été ajouté`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: createdBy,
          type: 'system',
          title: recipient.isPersonal ? 'Nouveau contact lié à vos biens' : 'Nouveau contact ajouté',
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            contact_id: contactId,
            contact_name: `${contact.first_name} ${contact.last_name}`,
            contact_type: contact.type
          },
          related_entity_type: 'contact',
          related_entity_id: contactId
        })
      })
    )

    return notifications
  }

  // ============================================================================
  // PRIVATE METHODS (Business Logic) - NOW USING SHARED HELPERS
  // ============================================================================

  // Note: Business logic methods moved to notification-helpers.ts
  // This allows sharing logic between NotificationService (DB) and EmailNotificationService (Email)

  // LEGACY METHOD REMOVED - Duplicate with improved method above (lines 106-171)
  // The main notifyInterventionCreated() method now handles all the logic
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

import {
  createServerNotificationRepository,
  createServerActionNotificationRepository,
  createNotificationRepository
} from '../repositories/notification-repository'

/**
 * Create NotificationService for browser/client usage
 */
export const createNotificationService = async () => {
  const repository = await createNotificationRepository()
  return new NotificationService(repository)
}

/**
 * Create NotificationService for Server Components (read-only)
 */
export const createServerNotificationService = async () => {
  const repository = await createServerNotificationRepository()
  return new NotificationService(repository)
}

/**
 * Create NotificationService for Server Actions (read-write)
 */
export const createServerActionNotificationService = async () => {
  const repository = await createServerActionNotificationRepository()
  return new NotificationService(repository)
}
