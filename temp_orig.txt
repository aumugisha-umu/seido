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

type NotificationType = Database['public']['Enums']['notification_type']

/**
 * Recipient pour une notification
 */
interface NotificationRecipient {
  userId: string
  isPersonal: boolean // true = notification personnelle, false = notification d'équipe
}

/**
 * Intervention enrichie avec managers
 */
interface InterventionWithManagers {
  id: string
  title: string
  reference: string
  lot_id: string | null
  team_id: string
  created_by: string
  assigned_to: string | null
  manager_id: string | null
  interventionAssignedManagers: string[] // IDs des gestionnaires assignés à CETTE intervention (via intervention_assignments)
  interventionAssignedProviders: string[] // IDs des prestataires assignés à CETTE intervention (via intervention_assignments)
  buildingManagers: string[] // IDs des gestionnaires du bâtiment (contexte, ne PAS utiliser pour is_personal)
  lotManagers: string[] // IDs des gestionnaires du lot (contexte, ne PAS utiliser pour is_personal)
  teamMembers: Array<{ id: string; role: string; name: string }>
  lot?: {
    reference: string
    building?: {
      name: string
    }
  }
}

/**
 * Bâtiment enrichi avec managers
 */
interface BuildingWithManagers {
  id: string
  name: string
  address: string
  team_id: string
  buildingManagers: string[] // IDs des gestionnaires principaux
  teamMembers: Array<{ id: string; role: string; name: string }>
}

/**
 * Lot enrichi avec managers
 */
interface LotWithManagers {
  id: string
  reference: string
  building_id: string
  team_id: string
  lotManagers: string[] // IDs des gestionnaires du lot
  buildingManagers: string[] // IDs des gestionnaires du bâtiment parent
  teamMembers: Array<{ id: string; role: string; name: string }>
  building?: {
    name: string
  }
}

/**
 * Contact enrichi avec managers
 */
interface ContactWithManagers {
  id: string
  first_name: string
  last_name: string
  type: string
  team_id: string
  relatedBuildingManagers: string[] // Gestionnaires des bâtiments liés
  teamMembers: Array<{ id: string; role: string; name: string }>
}

/**
 * Notification Domain Service
 */
export class NotificationService {
  constructor(private repository: NotificationRepository) { }

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

    // 2. Déterminer les destinataires (business logic) - EXCLUT le créateur
    const recipients = this.determineInterventionRecipients(intervention, createdBy)

    // 3. Créer les notifications avec titre amélioré
    const notifications = await Promise.all(
      recipients.map(async recipient => {
        // Check if this user is assigned to the intervention
        const { data: assignment } = await this.repository.supabase
          .from('intervention_assignments')
          .select('is_primary')
          .eq('intervention_id', interventionId)
          .eq('user_id', recipient.userId)
          .maybeSingle()

        const isAssigned = !!assignment

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: createdBy,
          type: 'intervention',
          title: `Nouvelle intervention - ${context}`, // ✅ Titre avec contexte clair
          message: isAssigned
            ? `Vous avez été assigné(e) à l'intervention "${intervention.title}"`
            : `Une nouvelle intervention "${intervention.title}" a été créée dans votre équipe`,
          is_personal: assignment?.is_primary ?? false,
          metadata: {
            intervention_id: interventionId,
            lot_reference: intervention.lot?.reference,
            building_name: buildingName,
            context,
            is_assigned: isAssigned
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
    const intervention = await this.repository.getInterventionWithManagers(interventionId)
    const recipients = this.determineInterventionRecipients(intervention, changedBy)

    const statusLabels: Record<string, string> = {
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

    const oldLabel = statusLabels[oldStatus] || oldStatus
    const newLabel = statusLabels[newStatus] || newStatus

    const notifications = await Promise.all(
      recipients.map(recipient => {
        const message = recipient.isPersonal
          ? `L'intervention "${intervention.title}" qui vous concerne est passée de "${oldLabel}" à "${newLabel}"${reason ? `. Motif: ${reason}` : ''}`
          : `L'intervention "${intervention.title}" est passée de "${oldLabel}" à "${newLabel}"`

        return this.repository.create({
          user_id: recipient.userId,
          team_id: teamId,
          created_by: changedBy,
          type: 'status_change',
          title: `Intervention ${newLabel.toLowerCase()}`,
          message,
          is_personal: recipient.isPersonal,
          metadata: {
            intervention_id: interventionId,
            old_status: oldStatus,
            new_status: newStatus,
            reason: reason || null
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
    const recipients = this.determineBuildingRecipients(building, createdBy)

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
    const recipients = this.determineBuildingRecipients(building, updatedBy)

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
    const recipients = this.determineBuildingRecipients(buildingWithManagers, deletedBy)

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
    const recipients = this.determineLotRecipients(lot, createdBy)

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
    const recipients = this.determineLotRecipients(lot, updatedBy)

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
    const recipients = this.determineLotRecipients(lotWithManagers, deletedBy)

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
    const recipients = this.determineContactRecipients(contact, createdBy)

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
  // PRIVATE METHODS (Business Logic)
  // ============================================================================

  /**
   * Déterminer les destinataires pour une intervention
   */
  private determineInterventionRecipients(
      intervention: InterventionWithManagers,
      excludeUserId: string
  ): NotificationRecipient[] {
    const recipients: NotificationRecipient[] = []
    const processedUserIds = new Set<string>()
    // 1. Ajouter tous les utilisateurs directement assignés à l'intervention (gestionnaires, prestataires, locataires)
    const directlyAssignedIds = [
        ...intervention.interventionAssignedManagers,
        ...intervention.interventionAssignedProviders
    ]
    directlyAssignedIds.forEach(userId => {
        if (userId !== excludeUserId && !processedUserIds.has(userId)) {
            recipients.push({
                userId,
                isPersonal: true // Assigné directement = notification personnelle
            })
            processedUserIds.add(userId)
        }
    })
    // 2. Ajouter les gestionnaires de l'équipe non encore inclus (notification d'équipe)
    intervention.teamMembers
        .filter(member =>
            member.role === 'gestionnaire' &&
            member.id !== excludeUserId &&
            !processedUserIds.has(member.id)
        )
        .forEach(manager => {
            recipients.push({
                userId: manager.id,
                isPersonal: false // Gestionnaire d'équipe = notification d'équipe
            })
            processedUserIds.add(manager.id)
        })
    return recipients
}


  /**
   * Déterminer les destinataires pour un lot
   */
  private determineLotRecipients(
    lot: LotWithManagers,
    excludeUserId: string
  ): NotificationRecipient[] {
    const directResponsibles = new Set<string>()

    lot.lotManagers.forEach(id => {
      if (id !== excludeUserId) directResponsibles.add(id)
    })

    lot.buildingManagers.forEach(id => {
      if (id !== excludeUserId) directResponsibles.add(id)
    })

    const allManagers = lot.teamMembers
      .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

    return allManagers.map(manager => ({
      userId: manager.id,
      isPersonal: directResponsibles.has(manager.id)
    }))
  }

  /**
   * Déterminer les destinataires pour un contact
   */
  private determineContactRecipients(
    contact: ContactWithManagers,
    excludeUserId: string
  ): NotificationRecipient[] {
    const directResponsibles = new Set(
      contact.relatedBuildingManagers.filter(id => id !== excludeUserId)
    )

    const allManagers = contact.teamMembers
      .filter(member => member.role === 'gestionnaire' && member.id !== excludeUserId)

    return allManagers.map(manager => ({
      userId: manager.id,
      isPersonal: directResponsibles.has(manager.id)
    }))
  }

  /**
   * Formater le message d'intervention
   */
  private formatInterventionMessage(
    intervention: InterventionWithManagers,
    isPersonal: boolean,
    action: 'created' | 'status_change'
  ): string {
    const lotRef = intervention.lot?.reference ? ` pour ${intervention.lot.reference}` : ''

    if (action === 'created') {
      return isPersonal
        ? `Une nouvelle intervention "${intervention.title}"${lotRef} vous concerne directement`
        : `Une nouvelle intervention "${intervention.title}"${lotRef} a été créée`
    }

    return `L'intervention "${intervention.title}"${lotRef} a été mise à jour`
  }

  /**
   * Tronquer un texte
   */
  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // LEGACY METHOD REMOVED - Duplicate with improved method above (lines 106-171)
  // The main notifyInterventionCreated() method now handles all the logic
}
