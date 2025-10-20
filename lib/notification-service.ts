import { createServerSupabaseClient, type ServerSupabaseClient } from '@/lib/services'
import type { Database } from '@/lib/database.types'
import type { Building, Lot, Intervention, Contact, User } from '@/lib/services/core/service-types'
import { logger, logError } from '@/lib/logger'
type NotificationType = Database['public']['Enums']['notification_type']
type NotificationPriority = Database['public']['Enums']['notification_priority']

// Type for notification metadata
type NotificationMetadata = Record<string, string | number | boolean | null | undefined>

// Type for team member with user relationship
interface TeamMemberWithUser {
  user_id: string
  user: {
    id: string
    name?: string
    role?: string
  } | null
}

// Type for building/lot contact with user relationship
interface ContactWithUser {
  user_id: string
  is_primary: boolean | null
  user: {
    id: string
    role?: string
    provider_category?: string
  } | null
}

// Type for lot with building relationship
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface LotWithBuilding {
  id: string
  reference?: string
  building_id?: string
  building?: {
    id: string
    name?: string
  } | null
}

// Type for intervention contact
interface InterventionContact {
  user_id: string
  role: string
  user: {
    id: string
    name?: string
    role?: string
  } | null
}

// Type for lot contact
interface LotContact {
  user_id: string
  is_primary: boolean | null
  user: {
    id: string
    role?: string
  } | null
}

// Type for intervention with relationships
/* interface InterventionWithRelations extends Intervention {
  lot?: LotWithBuilding | null
  tenant_id?: string
  team_id: string
  title: string
} */

interface CreateNotificationParams {
  userId: string
  teamId: string
  createdBy?: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  isPersonal?: boolean
  metadata?: NotificationMetadata
  relatedEntityType?: string
  relatedEntityId?: string
}

class NotificationService {
  private supabase: ServerSupabaseClient

  constructor(supabase: ServerSupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Créer une notification pour un utilisateur
   */
  async createNotification({
    userId,
    teamId,
    createdBy,
    type,
    priority = 'normal',
    title,
    message,
    isPersonal = false,
    metadata = {},
    relatedEntityType,
    relatedEntityId
  }: CreateNotificationParams) {
    try {
      logger.info('📬 [NOTIFICATION-SERVICE] Creating notification:', {
        userId,
        teamId,
        createdBy,
        type,
        title,
        isPersonal,
        priority
      })

      const notificationData = {
        user_id: userId,
        team_id: teamId,
        created_by: createdBy,
        type,
        priority,
        title,
        message,
        is_personal: isPersonal,
        metadata,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId
      }

      logger.info('📬 [NOTIFICATION-SERVICE] Inserting notification data:', notificationData)

      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notificationData)
        .select('*')
        .single()

      if (error) {
        logger.error('❌ [NOTIFICATION-SERVICE] Error creating notification:', error)
        return null
      }

      logger.info('✅ [NOTIFICATION-SERVICE] Notification created successfully:', {
        id: data.id,
        user_id: data.user_id,
        team_id: data.team_id,
        is_personal: data.is_personal,
        title: data.title
      })
      return data
    } catch (error) {
      logger.error('❌ Exception creating notification:', error)
      return null
    }
  }

  /**
   * Créer des notifications pour tous les membres d'une équipe
   */
  async createTeamNotification({
    teamId,
    createdBy,
    type,
    priority = 'normal',
    title,
    message,
    metadata = {},
    relatedEntityType,
    relatedEntityId,
    excludeUsers = []
  }: Omit<CreateNotificationParams, 'userId'> & {
    excludeUsers?: string[]
  }) {
    try {
      logger.info('📬 Creating team notification for team:', teamId)

      // Récupérer tous les membres de l'équipe
      const { data: teamMembers, error: membersError } = await this.supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)

      if (membersError) {
        logger.error('❌ Error fetching team members:', membersError)
        return []
      }

      if (!teamMembers || teamMembers.length === 0) {
        logger.info('⚠️ No team members found for team:', teamId)
        return []
      }

      // Filtrer les utilisateurs exclus
      const userIds = teamMembers
        .map(member => member.user_id)
        .filter(userId => !excludeUsers.includes(userId))

      // Créer une notification pour chaque membre
      const notifications = userIds.map(userId => ({
        user_id: userId,
        team_id: teamId,
        created_by: createdBy,
        type,
        priority,
        title,
        message,
        metadata,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId
      }))

      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notifications)
        .select('*')

      if (error) {
        logger.error('❌ Error creating team notifications:', error)
        return []
      }

      logger.info('✅ Created team notifications:', data.length)
      return data
    } catch (error) {
      logger.error('❌ Exception creating team notifications:', error)
      return []
    }
  }

  /**
   * Notifications spécialisées pour les interventions
   */
  async notifyInterventionCreated({
    interventionId,
    interventionTitle,
    teamId,
    createdBy,
    assignedTo,
    managerId,
    lotId,
    lotReference,
    urgency = 'normal'
  }: {
    interventionId: string
    interventionTitle: string
    teamId: string
    createdBy: string
    assignedTo?: string
    managerId?: string
    lotId?: string
    lotReference?: string
    urgency?: NotificationPriority
  }) {
    try {
      // Récupérer les informations du lot et de l'immeuble pour identifier les responsables
      let buildingManagerIds: string[] = []
      let lotManagerIds: string[] = []
      
      if (lotId) {
        // Récupérer le lot avec son immeuble parent
        const { data: lotData } = await this.supabase
          .from('lots')
          .select(`
            id,
            reference,
            building:buildings(id, name)
          `)
          .eq('id', lotId)
          .single()
        
        // Récupérer les gestionnaires du bâtiment via building_contacts
        if (lotData?.building?.id) {
          buildingManagerIds = await this.getBuildingManagers(lotData.building.id)
        }

        // Récupérer les gestionnaires spécifiquement assignés au lot
        lotManagerIds = await this.getLotManagers(lotId)
      }

      // Récupérer tous les gestionnaires de l'équipe
      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', teamId)

      if (!teamMembers) return []

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== createdBy
      )

      // Identifier les gestionnaires directement responsables
      const directResponsibles = new Set()
      if (managerId && managerId !== createdBy) directResponsibles.add(managerId)
      if (assignedTo && assignedTo !== createdBy) directResponsibles.add(assignedTo)
      
      // Ajouter les gestionnaires du bâtiment
      buildingManagerIds.forEach(buildingManagerId => {
        if (buildingManagerId !== createdBy) {
          directResponsibles.add(buildingManagerId)
        }
      })
      
      // Ajouter les gestionnaires spécifiquement assignés au lot
      lotManagerIds.forEach(lotManagerId => {
        if (lotManagerId !== createdBy) {
          directResponsibles.add(lotManagerId)
        }
      })

      const notifications = []

      // Créer les notifications selon la logique de responsabilité
      for (const manager of allManagers) {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          const notification = await this.createNotification({
            userId: manager.user_id,
            teamId,
            createdBy,
            type: 'intervention',
            priority: urgency === 'normal' ? 'high' : urgency,
            title: 'Nouvelle intervention sous votre responsabilité',
            message: `Une nouvelle intervention "${interventionTitle}"${lotReference ? ` pour ${lotReference}` : ''} vous concerne directement`,
            metadata: { 
              intervention_id: interventionId, 
              lot_reference: lotReference,
              isPersonal: true
            },
            relatedEntityType: 'intervention',
            relatedEntityId: interventionId
          })
          if (notification) notifications.push(notification)
        } else {
          // Notification d'équipe pour les autres gestionnaires
          const notification = await this.createNotification({
            userId: manager.user_id,
            teamId,
            createdBy,
            type: 'intervention',
            priority: 'normal',
            title: 'Nouvelle intervention créée',
            message: `Une nouvelle intervention "${interventionTitle}"${lotReference ? ` pour ${lotReference}` : ''} a été créée`,
            metadata: { 
              intervention_id: interventionId, 
              lot_reference: lotReference,
              isPersonal: false
            },
            relatedEntityType: 'intervention',
            relatedEntityId: interventionId
          })
          if (notification) notifications.push(notification)
        }
      }

      const logDetails = [
        buildingManagerIds.length > 0 ? `${buildingManagerIds.length} building manager(s)` : null,
        lotManagerIds.length > 0 ? `${lotManagerIds.length} lot manager(s)` : null,
        managerId && managerId !== createdBy ? 'intervention manager' : null,
        assignedTo && assignedTo !== createdBy ? 'assignee' : null
      ].filter(Boolean).join(', ')

      logger.info(`📬 Intervention creation notifications sent to ${allManagers.length} gestionnaires`)
      logger.info(`📬   - ${directResponsibles.size} personal notifications (${logDetails})`)
      logger.info(`📬   - ${allManagers.length - directResponsibles.size} team notifications`)
      return notifications
    } catch (error) {
      logger.error('❌ Failed to notify intervention created:', error)
      return []
    }
  }

  /**
   * Notifications pour changement de statut d'intervention
   */
  async notifyInterventionStatusChange({
    interventionId,
    interventionTitle,
    oldStatus,
    newStatus,
    teamId,
    changedBy,
    assignedTo,
    managerId,
    lotId,
    lotReference
  }: {
    interventionId: string
    interventionTitle: string
    oldStatus: string
    newStatus: string
    teamId: string
    changedBy: string
    assignedTo?: string
    managerId?: string
    lotId?: string
    lotReference?: string
  }) {
    try {
      const statusLabels = {
        // Phase 1: Demande
        demande: 'Demande',
        rejetee: 'Rejetée',
        approuvee: 'Approuvée',
        
        // Phase 2: Planification & Exécution
        demande_de_devis: 'Demande de devis',
        planification: 'Planification',
        planifiee: 'Planifiée',
        en_cours: 'En cours',
        
        // Phase 3: Clôture
        cloturee_par_prestataire: 'Clôturée par prestataire',
        cloturee_par_locataire: 'Clôturée par locataire',
        cloturee_par_gestionnaire: 'Clôturée par gestionnaire',
        
        // Transversal
        annulee: 'Annulée'
      }

      // Récupérer les informations du lot et de l'immeuble pour identifier les responsables
      let buildingManagerIds: string[] = []
      let lotManagerIds: string[] = []
      
      if (lotId) {
        // Récupérer le lot avec son immeuble parent
        const { data: lotData } = await this.supabase
          .from('lots')
          .select(`
            id,
            reference,
            building:buildings(id, name)
          `)
          .eq('id', lotId)
          .single()
        
        // Récupérer les gestionnaires du bâtiment via building_contacts
        if (lotData?.building?.id) {
          buildingManagerIds = await this.getBuildingManagers(lotData.building.id)
        }

        // Récupérer les gestionnaires spécifiquement assignés au lot
        lotManagerIds = await this.getLotManagers(lotId)
      }

      // Récupérer tous les gestionnaires de l'équipe
      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', teamId)

      if (!teamMembers) return []

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== changedBy
      )

      // Identifier les gestionnaires directement responsables
      const directResponsibles = new Set()
      if (managerId && managerId !== changedBy) directResponsibles.add(managerId)
      if (assignedTo && assignedTo !== changedBy) directResponsibles.add(assignedTo)
      
      // Ajouter les gestionnaires du bâtiment
      buildingManagerIds.forEach(buildingManagerId => {
        if (buildingManagerId !== changedBy) {
          directResponsibles.add(buildingManagerId)
        }
      })
      
      // Ajouter les gestionnaires spécifiquement assignés au lot
      lotManagerIds.forEach(lotManagerId => {
        if (lotManagerId !== changedBy) {
          directResponsibles.add(lotManagerId)
        }
      })

      const notifications = []

      // Créer les notifications selon la logique de responsabilité
      for (const manager of allManagers) {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)

        const oldLabel = statusLabels[oldStatus as keyof typeof statusLabels] || oldStatus
        const newLabel = statusLabels[newStatus as keyof typeof statusLabels] || newStatus

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          const notification = await this.createNotification({
            userId: manager.user_id,
            teamId,
            createdBy: changedBy,
            type: 'status_change',
            priority: newStatus === 'approuvee' ? 'high' : 'normal',
            title: 'Statut d\'intervention sous votre responsabilité modifié',
            message: `L'intervention "${interventionTitle}"${lotReference ? ` (${lotReference})` : ''} qui vous concerne est passée de "${oldLabel}" à "${newLabel}"`,
            metadata: { 
              intervention_id: interventionId, 
              old_status: oldStatus, 
              new_status: newStatus,
              lot_reference: lotReference,
              isPersonal: true
            },
            relatedEntityType: 'intervention',
            relatedEntityId: interventionId
          })
          if (notification) notifications.push(notification)
        } else {
          // Notification d'équipe pour les autres gestionnaires
          const notification = await this.createNotification({
            userId: manager.user_id,
            teamId,
            createdBy: changedBy,
            type: 'status_change',
            priority: 'normal',
            title: 'Statut d\'intervention modifié',
            message: `L'intervention "${interventionTitle}"${lotReference ? ` (${lotReference})` : ''} est passée de "${oldLabel}" à "${newLabel}"`,
            metadata: { 
              intervention_id: interventionId, 
              old_status: oldStatus, 
              new_status: newStatus,
              lot_reference: lotReference,
              isPersonal: false
            },
            relatedEntityType: 'intervention',
            relatedEntityId: interventionId
          })
          if (notification) notifications.push(notification)
        }
      }

      const logDetails = [
        buildingManagerIds.length > 0 ? `${buildingManagerIds.length} building manager(s)` : null,
        lotManagerIds.length > 0 ? `${lotManagerIds.length} lot manager(s)` : null,
        managerId && managerId !== changedBy ? 'intervention manager' : null,
        assignedTo && assignedTo !== changedBy ? 'assignee' : null
      ].filter(Boolean).join(', ')

      logger.info(`📬 Intervention status change notifications sent to ${allManagers.length} gestionnaires`)
      logger.info(`📬   - ${directResponsibles.size} personal notifications (${logDetails})`)
      logger.info(`📬   - ${allManagers.length - directResponsibles.size} team notifications`)
      return notifications
    } catch (error) {
      logger.error('❌ Failed to notify intervention status change:', error)
      return []
    }
  }

  /**
   * Notifications pour les documents
   */
  async notifyDocumentUploaded({
    documentId,
    documentName,
    teamId,
    uploadedBy,
    relatedEntityType,
    relatedEntityId,
    assignedTo
  }: {
    documentId: string
    documentName: string
    teamId: string
    uploadedBy: string
    relatedEntityType: string
    relatedEntityId: string
    assignedTo?: string
  }) {
    const notifications = []

    // Notifier l'assigné si spécifié
    if (assignedTo && assignedTo !== uploadedBy) {
      const assigneeNotification = await this.createNotification({
        userId: assignedTo,
        teamId,
        createdBy: uploadedBy,
        type: 'document',
        priority: 'normal',
        title: 'Nouveau document disponible',
        message: `Le document "${documentName}" a été ajouté`,
        metadata: { 
          document_id: documentId,
          document_name: documentName,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId
        },
        relatedEntityType: 'document',
        relatedEntityId: documentId
      })
      if (assigneeNotification) notifications.push(assigneeNotification)
    }

    return notifications
  }

  /**
   * Notifications pour les invitations d'équipe
   */
  async notifyTeamInvitation({
    userId,
    teamId,
    teamName,
    invitedBy,
    role
  }: {
    userId: string
    teamId: string
    teamName: string
    invitedBy: string
    role: string
  }) {
    return this.createNotification({
      userId,
      teamId,
      createdBy: invitedBy,
      type: 'team_invite',
      priority: 'high',
      title: 'Invitation à rejoindre une équipe',
      message: `Vous avez été invité(e) à rejoindre l'équipe "${teamName}" en tant que ${role}`,
      metadata: { team_name: teamName, role },
      relatedEntityType: 'team',
      relatedEntityId: teamId
    })
  }

  /**
   * Notifications système
   */
  async notifySystemMaintenance({
    teamId,
    title,
    message,
    scheduledFor
  }: {
    teamId: string
    title: string
    message: string
    scheduledFor: string
  }) {
    return this.createTeamNotification({
      teamId,
      type: 'system',
      priority: 'normal',
      title,
      message,
      metadata: { scheduled_for: scheduledFor }
    })
  }

  /**
   * Notifications de rappel
   */
  async notifyReminder({
    userId,
    teamId,
    createdBy,
    title,
    message,
    reminderDate,
    relatedEntityType,
    relatedEntityId
  }: {
    userId: string
    teamId: string
    createdBy?: string
    title: string
    message: string
    reminderDate: string
    relatedEntityType?: string
    relatedEntityId?: string
  }) {
    return this.createNotification({
      userId,
      teamId,
      createdBy,
      type: 'reminder',
      priority: 'normal',
      title,
      message,
      metadata: { reminder_date: reminderDate },
      relatedEntityType,
      relatedEntityId
    })
  }

  /**
   * Notifier la création d'un immeuble
   */
  async notifyBuildingCreated(building: Building, createdBy: string) {
    try {
      if (!building.team_id || !createdBy) return

      logger.info('📬 Notifying building created:', { buildingId: building.id, teamId: building.team_id })

      // Récupérer tous les gestionnaires de l'équipe
      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', building.team_id)

      if (!teamMembers) return

      // Filtrer les gestionnaires (exclure celui qui a fait l'action)
      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== createdBy
      )

      // Identifier les gestionnaires directement responsables via building_contacts
      const { data: buildingContacts } = await this.supabase
        .from('building_contacts')
        .select(`
          user_id, 
          is_primary,
          user:user_id(role)
        `)
        .eq('building_id', building.id)
        .is('end_date', null) // Only active assignments

      const directManagers = new Set<string>()
      (buildingContacts as ContactWithUser[])?.forEach(contact => {
        if (contact.is_primary && contact.user_id !== createdBy && contact.user?.role === 'gestionnaire') {
          directManagers.add(contact.user_id)
        }
      })

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directManagers.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour le gestionnaire directement responsable
          return this.createNotification({
            userId: manager.user_id,
            teamId: building.team_id,
            createdBy,
            type: 'system',
            priority: 'high',
            title: 'Vous avez été assigné(e) comme responsable d\'un immeuble',
            message: `Vous avez été désigné(e) comme gestionnaire responsable de l'immeuble "${building.name}"`,
            metadata: {
              buildingId: building.id,
              buildingName: building.name,
              address: building.address,
              isPersonal: true
            },
            relatedEntityType: 'building',
            relatedEntityId: building.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: building.team_id,
            createdBy,
            type: 'system',
            priority: 'normal',
            title: 'Nouvel immeuble créé',
            message: `Un nouvel immeuble "${building.name}" a été ajouté`,
            metadata: {
              buildingId: building.id,
              buildingName: building.name,
              address: building.address,
              isPersonal: false
            },
            relatedEntityType: 'building',
            relatedEntityId: building.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Building creation notifications sent to ${allManagers.length} gestionnaires (${directManagers.size} personal, ${allManagers.length - directManagers.size} team)`)
    } catch (error) {
      logger.error('❌ Failed to notify building created:', error)
    }
  }

  /**
   * Notifier la modification d'un immeuble
   */
  async notifyBuildingUpdated(building: Building, updatedBy: string, changes: Partial<Building>) {
    try {
      if (!building.team_id || !_updatedBy) return

      // Récupérer tous les gestionnaires de l'équipe
      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', building.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== _updatedBy
      )

      // Identifier les gestionnaires directement responsables via building_contacts
      const { data: buildingContacts } = await this.supabase
        .from('building_contacts')
        .select(`
          user_id, 
          is_primary,
          user:user_id(role)
        `)
        .eq('building_id', building.id)
        .is('end_date', null) // Only active assignments

      const directManagers = new Set<string>()
      (buildingContacts as ContactWithUser[])?.forEach(contact => {
        if (contact.is_primary && contact.user_id !== updatedBy && contact.user?.role === 'gestionnaire') {
          directManagers.add(contact.user_id)
        }
      })

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directManagers.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour le gestionnaire directement responsable
          return this.createNotification({
            userId: manager.user_id,
            teamId: building.team_id,
            createdBy: _updatedBy,
            type: 'system',
            priority: 'normal',
            title: 'Immeuble dont vous êtes responsable modifié',
            message: `L'immeuble "${building.name}" dont vous êtes le gestionnaire responsable a été modifié`,
            metadata: {
              buildingId: building.id,
              buildingName: building.name,
              changes,
              isPersonal: true
            },
            relatedEntityType: 'building',
            relatedEntityId: building.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: building.team_id,
            createdBy: _updatedBy,
            type: 'system',
            priority: 'normal',
            title: 'Immeuble modifié',
            message: `L'immeuble "${building.name}" a été modifié`,
            metadata: {
              buildingId: building.id,
              buildingName: building.name,
              changes,
              isPersonal: false
            },
            relatedEntityType: 'building',
            relatedEntityId: building.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Building update notifications sent to ${allManagers.length} gestionnaires (${directManagers.size} personal, ${allManagers.length - directManagers.size} team)`)
    } catch (error) {
      logger.error('❌ Failed to notify building updated:', error)
    }
  }

  /**
   * Notifier la suppression d'un immeuble
   */
  async notifyBuildingDeleted(building: Building, deletedBy: string) {
    try {
      if (!building.team_id || !deletedBy) return

      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', building.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== deletedBy
      )

      // Identifier les gestionnaires directement responsables via building_contacts
      const { data: buildingContacts } = await this.supabase
        .from('building_contacts')
        .select(`
          user_id, 
          is_primary,
          user:user_id(role)
        `)
        .eq('building_id', building.id)
        .is('end_date', null) // Only active assignments

      const directManagers = new Set<string>()
      (buildingContacts as ContactWithUser[])?.forEach(contact => {
        if (contact.is_primary && contact.user_id !== deletedBy && contact.user?.role === 'gestionnaire') {
          directManagers.add(contact.user_id)
        }
      })

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directManagers.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour le gestionnaire directement responsable
          return this.createNotification({
            userId: manager.user_id,
            teamId: building.team_id,
            createdBy: deletedBy,
            type: 'system',
            priority: 'high',
            title: 'Immeuble dont vous étiez responsable supprimé',
            message: `L'immeuble "${building.name}" dont vous étiez le gestionnaire responsable a été supprimé`,
            metadata: {
              buildingName: building.name,
              address: building.address,
              isPersonal: true
            },
            relatedEntityType: 'building',
            relatedEntityId: building.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: building.team_id,
            createdBy: deletedBy,
            type: 'system',
            priority: 'high',
            title: 'Immeuble supprimé',
            message: `L'immeuble "${building.name}" a été supprimé`,
            metadata: {
              buildingName: building.name,
              address: building.address,
              isPersonal: false
            },
            relatedEntityType: 'building',
            relatedEntityId: building.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Building deletion notifications sent to ${allManagers.length} gestionnaires (${directManagers.size} personal, ${allManagers.length - directManagers.size} team)`)
    } catch (error) {
      logger.error('❌ Failed to notify building deleted:', error)
    }
  }

  /**
   * Notifier la création d'un lot
   */
  async notifyLotCreated(lot: Lot, building: Building | null, createdBy: string) {
    try {
      if (!lot.team_id || !createdBy) return

      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', lot.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== createdBy
      )

      // Identifier TOUS les gestionnaires directement responsables
      const directResponsibles = new Set<string>()
      
      // 1. Gestionnaires du lot (lot_contacts) - principaux et additionnels
      const { data: lotContacts } = await this.supabase
        .from('lot_contacts')
        .select(`
          user_id, 
          is_primary,
          user:user_id(role)
        `)
        .eq('lot_id', lot.id)
        .is('end_date', null) // Only active assignments

      const lotPrimaryManagers = new Set<string>()
      const lotAdditionalManagers = new Set<string>()

      (lotContacts as LotContact[])?.forEach(contact => {
        if (contact.user?.role === 'gestionnaire' && contact.user_id !== createdBy) {
          directResponsibles.add(contact.user_id)
          if (contact.is_primary) {
            lotPrimaryManagers.add(contact.user_id)
          } else {
            lotAdditionalManagers.add(contact.user_id)
          }
        }
      })
      
      // 2. Gestionnaires de l'immeuble parent (building_contacts)
      const buildingPrimaryManagers = new Set<string>()
      if (building?.id) {
        const { data: buildingContacts } = await this.supabase
          .from('building_contacts')
          .select(`
            user_id, 
            is_primary,
            user:user_id(role)
          `)
          .eq('building_id', building.id)
          .is('end_date', null) // Only active assignments

        (buildingContacts as ContactWithUser[])?.forEach(contact => {
          if (contact.is_primary && contact.user_id !== createdBy && contact.user?.role === 'gestionnaire') {
            directResponsibles.add(contact.user_id)
            buildingPrimaryManagers.add(contact.user_id)
          }
        })
      }
      
      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)
        const isLotPrincipal = lotPrimaryManagers.has(manager.user_id)
        const isLotAdditional = lotAdditionalManagers.has(manager.user_id)
        const isBuildingManager = buildingPrimaryManagers.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          let title, message
          if (isLotPrincipal) {
            title = 'Vous avez été assigné(e) comme responsable principal d\'un lot'
            message = `Vous avez été désigné(e) comme gestionnaire principal du lot "${lot.reference}" dans l'immeuble "${building?.name || 'N/A'}"`
          } else if (isLotAdditional) {
            title = 'Vous avez été assigné(e) comme gestionnaire d\'un lot'
            message = `Vous avez été assigné(e) comme gestionnaire du lot "${lot.reference}" dans l'immeuble "${building?.name || 'N/A'}"`
          } else if (isBuildingManager) {
            title = 'Nouveau lot dans votre immeuble'
            message = `Un nouveau lot "${lot.reference}" a été créé dans l'immeuble "${building?.name || 'N/A'}" dont vous êtes responsable`
          } else {
            // Cas par défaut si aucune condition spécifique n'est remplie
            title = 'Nouveau lot créé'
            message = `Un nouveau lot "${lot.reference}" a été créé dans l'immeuble "${building?.name || 'N/A'}"`
          }
          
          return this.createNotification({
            userId: manager.user_id,
            teamId: lot.team_id,
            createdBy,
            type: 'system',
            priority: 'normal',
            title,
            message,
            metadata: {
              lotId: lot.id,
              lotReference: lot.reference,
              buildingId: lot.building_id,
              buildingName: building?.name,
              managerType: isLotPrincipal ? 'lot_principal' : isLotAdditional ? 'lot_additional' : 'building',
              isPersonal: true
            },
            relatedEntityType: 'lot',
            relatedEntityId: lot.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: lot.team_id,
            createdBy,
            type: 'system',
            priority: 'normal',
            title: 'Nouveau lot créé',
            message: `Un nouveau lot "${lot.reference}" a été ajouté à l'immeuble "${building?.name || 'N/A'}"`,
            metadata: {
              lotId: lot.id,
              lotReference: lot.reference,
              buildingId: lot.building_id,
              buildingName: building?.name,
              isPersonal: false
            },
            relatedEntityType: 'lot',
            relatedEntityId: lot.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Lot creation notifications sent to ${allManagers.length} gestionnaires`)
      logger.info(`📬   - ${directResponsibles.size} personal notifications`)
      logger.info(`📬     • ${lotPrimaryManagers.size} lot principal`)
      logger.info(`📬     • ${lotAdditionalManagers.size} lot additionnels`)
      logger.info(`📬     • ${buildingPrimaryManagers.size} building manager`)
      logger.info(`📬   - ${allManagers.length - directResponsibles.size} team notifications`)
    } catch (error) {
      logger.error('❌ Failed to notify lot created:', error)
    }
  }

  /**
   * Notifier la modification d'un lot
   */
  async notifyLotUpdated(lot: Lot, building: Building | null, updatedBy: string, changes: Partial<Lot>) {
    try {
      if (!lot.team_id || !_updatedBy) return

      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', lot.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== _updatedBy
      )

      // Identifier TOUS les gestionnaires directement responsables
      const directResponsibles = new Set<string>()
      
      // 1. Gestionnaires du lot (lot_contacts) - principaux et additionnels
      const { data: lotContacts } = await this.supabase
        .from('lot_contacts')
        .select(`
          user_id, 
          is_primary,
          user:user_id(role)
        `)
        .eq('lot_id', lot.id)
        .is('end_date', null) // Only active assignments

      const lotPrimaryManagers = new Set<string>()
      const lotAdditionalManagers = new Set<string>()

      (lotContacts as LotContact[])?.forEach(contact => {
        if (contact.user?.role === 'gestionnaire' && contact.user_id !== _updatedBy) {
          directResponsibles.add(contact.user_id)
          if (contact.is_primary) {
            lotPrimaryManagers.add(contact.user_id)
          } else {
            lotAdditionalManagers.add(contact.user_id)
          }
        }
      })
      
      // 2. Gestionnaires de l'immeuble parent (building_contacts)
      const buildingPrimaryManagers = new Set<string>()
      if (building?.id) {
        const { data: buildingContacts } = await this.supabase
          .from('building_contacts')
          .select(`
            user_id, 
            is_primary,
            user:user_id(role)
          `)
          .eq('building_id', building.id)
          .is('end_date', null) // Only active assignments

        (buildingContacts as ContactWithUser[])?.forEach(contact => {
          if (contact.is_primary && contact.user_id !== updatedBy && contact.user?.role === 'gestionnaire') {
            directResponsibles.add(contact.user_id)
            buildingPrimaryManagers.add(contact.user_id)
          }
        })
      }

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)
        const isLotPrincipal = lotPrimaryManagers.has(manager.user_id)
        const isLotAdditional = lotAdditionalManagers.has(manager.user_id)
        const isBuildingManager = buildingPrimaryManagers.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          let title, message
          if (isLotPrincipal) {
            title = 'Lot dont vous êtes responsable principal modifié'
            message = `Le lot "${lot.reference}" dont vous êtes le gestionnaire principal a été modifié`
          } else if (isLotAdditional) {
            title = 'Lot dont vous êtes gestionnaire modifié'
            message = `Le lot "${lot.reference}" dont vous êtes gestionnaire a été modifié`
          } else if (isBuildingManager) {
            title = 'Lot de votre immeuble modifié'
            message = `Le lot "${lot.reference}" de l'immeuble "${building?.name || 'N/A'}" dont vous êtes responsable a été modifié`
          } else {
            // Cas par défaut si aucune condition spécifique n'est remplie
            title = 'Lot modifié'
            message = `Le lot "${lot.reference}" dans l'immeuble "${building?.name || 'N/A'}" a été modifié`
          }

          return this.createNotification({
            userId: manager.user_id,
            teamId: lot.team_id,
            createdBy: _updatedBy,
            type: 'system',
            priority: 'normal',
            title,
            message,
            metadata: {
              lotId: lot.id,
              lotReference: lot.reference,
              buildingName: building?.name,
              changes,
              managerType: isLotPrincipal ? 'lot_principal' : isLotAdditional ? 'lot_additional' : 'building',
              isPersonal: true
            },
            relatedEntityType: 'lot',
            relatedEntityId: lot.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: lot.team_id,
            createdBy: _updatedBy,
            type: 'system',
            priority: 'normal',
            title: 'Lot modifié',
            message: `Le lot "${lot.reference}" a été modifié`,
            metadata: {
              lotId: lot.id,
              lotReference: lot.reference,
              buildingName: building?.name,
              changes,
              isPersonal: false
            },
            relatedEntityType: 'lot',
            relatedEntityId: lot.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Lot update notifications sent to ${allManagers.length} gestionnaires`)
      logger.info(`📬   - ${directResponsibles.size} personal notifications`)
      logger.info(`📬     • ${lotPrimaryManagers.size} lot principal`)
      logger.info(`📬     • ${lotAdditionalManagers.size} lot additionnels`)
      logger.info(`📬     • ${buildingPrimaryManagers.size} building manager`)
      logger.info(`📬   - ${allManagers.length - directResponsibles.size} team notifications`)
    } catch (error) {
      logger.error('❌ Failed to notify lot updated:', error)
    }
  }

  /**
   * Notifier la suppression d'un lot
   */
  async notifyLotDeleted(lot: Lot, building: Building | null, deletedBy: string) {
    try {
      if (!lot.team_id || !deletedBy) return

      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', lot.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== deletedBy
      )

      // Identifier TOUS les gestionnaires directement responsables
      const directResponsibles = new Set<string>()
      
      // 1. Gestionnaires du lot (lot_contacts) - principaux et additionnels
      const { data: lotContacts } = await this.supabase
        .from('lot_contacts')
        .select(`
          user_id, 
          is_primary,
          user:user_id(role)
        `)
        .eq('lot_id', lot.id)
        .is('end_date', null) // Only active assignments

      const lotPrimaryManagers = new Set<string>()
      const lotAdditionalManagers = new Set<string>()

      (lotContacts as LotContact[])?.forEach(contact => {
        if (contact.user?.role === 'gestionnaire' && contact.user_id !== deletedBy) {
          directResponsibles.add(contact.user_id)
          if (contact.is_primary) {
            lotPrimaryManagers.add(contact.user_id)
          } else {
            lotAdditionalManagers.add(contact.user_id)
          }
        }
      })
      
      // 2. Gestionnaires de l'immeuble parent (building_contacts)
      const buildingPrimaryManagers = new Set<string>()
      if (building?.id) {
        const { data: buildingContacts } = await this.supabase
          .from('building_contacts')
          .select(`
            user_id, 
            is_primary,
            user:user_id(role)
          `)
          .eq('building_id', building.id)
          .is('end_date', null) // Only active assignments

        (buildingContacts as ContactWithUser[])?.forEach(contact => {
          if (contact.is_primary && contact.user_id !== deletedBy && contact.user?.role === 'gestionnaire') {
            directResponsibles.add(contact.user_id)
            buildingPrimaryManagers.add(contact.user_id)
          }
        })
      }

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)
        const isLotPrincipal = lotPrimaryManagers.has(manager.user_id)
        const isLotAdditional = lotAdditionalManagers.has(manager.user_id)
        const isBuildingManager = buildingPrimaryManagers.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          let title, message
          if (isLotPrincipal) {
            title = 'Lot dont vous étiez responsable principal supprimé'
            message = `Le lot "${lot.reference}" dont vous étiez le gestionnaire principal a été supprimé`
          } else if (isLotAdditional) {
            title = 'Lot dont vous étiez gestionnaire supprimé'
            message = `Le lot "${lot.reference}" dont vous étiez gestionnaire a été supprimé`
          } else if (isBuildingManager) {
            title = 'Lot de votre immeuble supprimé'
            message = `Le lot "${lot.reference}" de l'immeuble "${building?.name || 'N/A'}" dont vous êtes responsable a été supprimé`
          } else {
            // Cas par défaut si aucune condition spécifique n'est remplie
            title = 'Lot supprimé'
            message = `Le lot "${lot.reference}" dans l'immeuble "${building?.name || 'N/A'}" a été supprimé`
          }

          return this.createNotification({
            userId: manager.user_id,
            teamId: lot.team_id,
            createdBy: deletedBy,
            type: 'system',
            priority: 'high',
            title,
            message,
            metadata: {
              lotReference: lot.reference,
              buildingName: building?.name,
              managerType: isLotPrincipal ? 'lot_principal' : isLotAdditional ? 'lot_additional' : 'building',
              isPersonal: true
            },
            relatedEntityType: 'lot',
            relatedEntityId: lot.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: lot.team_id,
            createdBy: deletedBy,
            type: 'system',
            priority: 'high',
            title: 'Lot supprimé',
            message: `Le lot "${lot.reference}" a été supprimé de l'immeuble "${building?.name || 'N/A'}"`,
            metadata: {
              lotReference: lot.reference,
              buildingName: building?.name,
              isPersonal: false
            },
            relatedEntityType: 'lot',
            relatedEntityId: lot.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Lot deletion notifications sent to ${allManagers.length} gestionnaires`)
      logger.info(`📬   - ${directResponsibles.size} personal notifications`)
      logger.info(`📬     • ${lotPrimaryManagers.size} lot principal`)
      logger.info(`📬     • ${lotAdditionalManagers.size} lot additionnels`)
      logger.info(`📬     • ${buildingPrimaryManagers.size} building manager`)
      logger.info(`📬   - ${allManagers.length - directResponsibles.size} team notifications`)
    } catch (error) {
      logger.error('❌ Failed to notify lot deleted:', error)
    }
  }

  /**
   * Notifier la création d'un contact
   */
  async notifyContactCreated(contact: Contact, createdBy: string) {
    try {
      if (!contact.team_id || !createdBy) return

      // Récupérer tous les gestionnaires de l'équipe
      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', contact.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== createdBy
      )

      // Identifier les gestionnaires directement responsables
      const directResponsibles = await this.getContactDirectResponsibles(contact.id, createdBy)

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          return this.createNotification({
            userId: manager.user_id,
            teamId: contact.team_id,
            createdBy,
            type: 'system',
            priority: 'normal',
            title: 'Nouveau contact lié à vos biens',
            message: `Un nouveau contact "${contact.first_name} ${contact.last_name}" a été ajouté et est lié à des biens dont vous êtes responsable`,
            metadata: {
              contactId: contact.id,
              contactName: `${contact.first_name} ${contact.last_name}`,
              contactType: contact.type,
              isPersonal: true
            },
            relatedEntityType: 'contact',
            relatedEntityId: contact.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: contact.team_id,
            createdBy,
            type: 'system',
            priority: 'normal',
            title: 'Nouveau contact ajouté',
            message: `Un nouveau contact "${contact.first_name} ${contact.last_name}" a été ajouté`,
            metadata: {
              contactId: contact.id,
              contactName: `${contact.first_name} ${contact.last_name}`,
              contactType: contact.type,
              isPersonal: false
            },
            relatedEntityType: 'contact',
            relatedEntityId: contact.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Contact creation notifications sent to ${allManagers.length} gestionnaires (${directResponsibles.size} personal, ${allManagers.length - directResponsibles.size} team)`)
    } catch (error) {
      logger.error('❌ Failed to notify contact created:', error)
    }
  }

  /**
   * Récupérer les gestionnaires spécifiquement assignés à un lot
   */
  private async getLotManagers(lotId: string): Promise<string[]> {
    try {
      const { data: lotContacts } = await this.supabase
        .from('lot_contacts')
        .select(`
          user:user_id(
            id,
            role,
            provider_category
          )
        `)
        .eq('lot_id', lotId)
        .is('end_date', null) // Only active assignments

      // Filtrer pour récupérer seulement les gestionnaires (rôle en français)
      type LotContactWithUser = { user: { id: string; role?: string; provider_category?: string } | null }
      const managers = (lotContacts as LotContactWithUser[])?.filter(lc =>
        lc.user?.role === 'gestionnaire'
      ).map(lc => lc.user!.id) || []

      return managers
    } catch (error) {
      logger.error('Error getting lot managers:', error)
      return []
    }
  }

  /**
   * Récupérer les gestionnaires spécifiquement assignés à un bâtiment
   */
  private async getBuildingManagers(buildingId: string): Promise<string[]> {
    try {
      const { data: buildingContacts } = await this.supabase
        .from('building_contacts')
        .select(`
          user:user_id(
            id,
            role,
            provider_category
          )
        `)
        .eq('building_id', buildingId)
        .is('end_date', null) // Only active assignments

      // Filtrer pour récupérer seulement les gestionnaires (rôle en français)
      type BuildingContactWithUser = { user: { id: string; role?: string; provider_category?: string } | null }
      const managers = (buildingContacts as BuildingContactWithUser[])?.filter(bc =>
        bc.user?.role === 'gestionnaire'
      ).map(bc => bc.user!.id) || []

      return managers
    } catch (error) {
      logger.error('Error getting building managers:', error)
      return []
    }
  }

  /**
   * Identifier les gestionnaires directement responsables d'un contact
   */
  private async getContactDirectResponsibles(contactId: string, excludeUserId: string): Promise<Set<string>> {
    const directResponsibles = new Set<string>()

    try {
      // Vérifier les liens avec les immeubles via building_contacts
      const { data: buildingLinks } = await this.supabase
        .from('building_contacts')
        .select(`
          building:buildings(id, name),
          building_id
        `)
        .eq('user_id', contactId) // Corrected field name from contact_id to user_id

      if (buildingLinks) {
        // Pour chaque bâtiment lié, récupérer ses gestionnaires principaux
        const buildingIds = buildingLinks.map(link => link.building_id)
        
        if (buildingIds.length > 0) {
          const { data: buildingManagers } = await this.supabase
            .from('building_contacts')
            .select(`
              user_id,
              building_id,
              is_primary,
              user:user_id(role)
            `)
            .in('building_id', buildingIds)
            .eq('user.role', 'gestionnaire')
            .eq('is_primary', true)
            .is('end_date', null)

          (buildingManagers as Array<{ user_id: string }>)?.forEach(manager => {
            if (manager.user_id !== excludeUserId) {
              directResponsibles.add(manager.user_id)
            }
          })
        }
      }

      // Vérifier les liens avec les lots via lot_contacts
      const { data: lotLinks } = await this.supabase
        .from('lot_contacts')
        .select(`
          lot:lots(
            id, 
            reference, 
            building_id,
            building:buildings(id, name)
          )
        `)
        .eq('user_id', contactId) // Corrected field name
        .limit(10)

      if (lotLinks) {
        // Pour chaque lot lié, récupérer les gestionnaires principaux de son bâtiment
        const uniqueBuildingIds = new Set<string>()
        (lotLinks as Array<{ lot?: { building_id?: string } | null }>).forEach(link => {
          if (link.lot?.building_id) {
            uniqueBuildingIds.add(link.lot.building_id)
          }
        })
        
        if (uniqueBuildingIds.size > 0) {
          const { data: lotBuildingManagers } = await this.supabase
            .from('building_contacts')
            .select(`
              user_id,
              building_id,
              is_primary,
              user:user_id(role)
            `)
            .in('building_id', Array.from(uniqueBuildingIds))
            .eq('user.role', 'gestionnaire')
            .eq('is_primary', true)
            .is('end_date', null)

          (lotBuildingManagers as Array<{ user_id: string }>)?.forEach(manager => {
            if (manager.user_id !== excludeUserId) {
              directResponsibles.add(manager.user_id)
            }
          })
        }
      }

      // Vérifier les liens avec les interventions viaintervention_assignments
      const { data: interventionLinks } = await this.supabase
        .from('intervention_contacts')
        .select(`
          intervention:interventions(
            id,
            lot:lots(
              id,
              building_id,
              building:buildings(id, name)
            )
          )
        `)
        .eq('user_id', contactId)
        .limit(10)

      if (interventionLinks) {
        // Pour chaque intervention liée, récupérer les gestionnaires principaux de son bâtiment
        const interventionBuildingIds = new Set<string>()
        (interventionLinks as Array<{ intervention?: { lot?: { building_id?: string } | null } | null }>).forEach(link => {
          if (link.intervention?.lot?.building_id) {
            interventionBuildingIds.add(link.intervention.lot.building_id)
          }
        })
        
        if (interventionBuildingIds.size > 0) {
          const { data: interventionBuildingManagers } = await this.supabase
            .from('building_contacts')
            .select(`
              user_id,
              building_id,
              is_primary,
              user:user_id(role)
            `)
            .in('building_id', Array.from(interventionBuildingIds))
            .eq('user.role', 'gestionnaire')
            .eq('is_primary', true)
            .is('end_date', null)

          (interventionBuildingManagers as Array<{ user_id: string }>)?.forEach(manager => {
            if (manager.user_id !== excludeUserId) {
              directResponsibles.add(manager.user_id)
            }
          })
        }
      }
    } catch (error) {
      logger.error('Error getting contact direct responsibles:', error)
    }

    return directResponsibles
  }

  /**
   * Notifier la modification d'un contact
   */
  async notifyContactUpdated(contact: Contact, updatedBy: string, changes: Partial<Contact>) {
    try {
      if (!contact.team_id || !_updatedBy) return

      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', contact.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== _updatedBy
      )

      // Identifier les gestionnaires directement responsables
      const directResponsibles = await this.getContactDirectResponsibles(contact.id, _updatedBy)

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          return this.createNotification({
            userId: manager.user_id,
            teamId: contact.team_id,
            createdBy: _updatedBy,
            type: 'system',
            priority: 'normal',
            title: 'Contact lié à vos biens modifié',
            message: `Le contact "${contact.first_name} ${contact.last_name}" lié à vos biens a été modifié`,
            metadata: {
              contactId: contact.id,
              contactName: `${contact.first_name} ${contact.last_name}`,
              changes,
              isPersonal: true
            },
            relatedEntityType: 'contact',
            relatedEntityId: contact.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: contact.team_id,
            createdBy: _updatedBy,
            type: 'system',
            priority: 'normal',
            title: 'Contact modifié',
            message: `Le contact "${contact.first_name} ${contact.last_name}" a été modifié`,
            metadata: {
              contactId: contact.id,
              contactName: `${contact.first_name} ${contact.last_name}`,
              changes,
              isPersonal: false
            },
            relatedEntityType: 'contact',
            relatedEntityId: contact.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Contact update notifications sent to ${allManagers.length} gestionnaires (${directResponsibles.size} personal, ${allManagers.length - directResponsibles.size} team)`)
    } catch (error) {
      logger.error('❌ Failed to notify contact updated:', error)
    }
  }

  /**
   * Notifier la suppression d'un contact
   */
  async notifyContactDeleted(contact: Contact, deletedBy: string) {
    try {
      if (!contact.team_id || !deletedBy) return

      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', contact.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== deletedBy
      )

      // Identifier les gestionnaires directement responsables
      const directResponsibles = await this.getContactDirectResponsibles(contact.id, deletedBy)

      // Créer les notifications selon la logique de responsabilité
      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          return this.createNotification({
            userId: manager.user_id,
            teamId: contact.team_id,
            createdBy: deletedBy,
            type: 'system',
            priority: 'high',
            title: 'Contact lié à vos biens supprimé',
            message: `Le contact "${contact.first_name} ${contact.last_name}" lié à vos biens a été supprimé`,
            metadata: {
              contactName: `${contact.first_name} ${contact.last_name}`,
              contactType: contact.type,
              isPersonal: true
            },
            relatedEntityType: 'contact',
            relatedEntityId: contact.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: contact.team_id,
            createdBy: deletedBy,
            type: 'system',
            priority: 'high',
            title: 'Contact supprimé',
            message: `Le contact "${contact.first_name} ${contact.last_name}" a été supprimé`,
            metadata: {
              contactName: `${contact.first_name} ${contact.last_name}`,
              contactType: contact.type,
              isPersonal: false
            },
            relatedEntityType: 'contact',
            relatedEntityId: contact.id
          })
        }
      })

      await Promise.all(notificationPromises)

      logger.info(`📬 Contact deletion notifications sent to ${allManagers.length} gestionnaires (${directResponsibles.size} personal, ${allManagers.length - directResponsibles.size} team)`)
    } catch (error) {
      logger.error('❌ Failed to notify contact deleted:', error)
    }
  }

  /**
   * Notifier le changement de statut d'une intervention
   */
  async notifyInterventionStatusChanged(intervention: Intervention, statusFrom: string, statusTo: string, changedBy: string, reason?: string) {
    try {
      if (!intervention.team_id || !changedBy) return

      // Récupérer les gestionnaires directement liés viaintervention_assignments
      let directManagerIds: string[] = []
      
      const { data: interventionContacts } = await this.supabase
        .from('intervention_contacts')
        .select(`
          user:user_id(id, role)
        `)
        .eq('intervention_id', intervention.id)
        .eq('role', 'gestionnaire')
        .is('end_date', null)

      if (interventionContacts) {
        directManagerIds = interventionContacts.map(ic => ic.user.id)
      }

      // Si pas de gestionnaires directs assignés, on utilise les gestionnaires du lot
      if (directManagerIds.length === 0 && intervention.lot_id) {
        const lotManagerIds = await this.getLotManagers(intervention.lot_id)
        directManagerIds = lotManagerIds
      }

      // Récupérer tous les gestionnaires de l'équipe
      const { data: teamMembers } = await this.supabase
        .from('team_members')
        .select(`
          user_id,
          user:users(id, name, role)
        `)
        .eq('team_id', intervention.team_id)

      if (!teamMembers) return

      const allManagers = (teamMembers as TeamMemberWithUser[]).filter(member =>
        member.user?.role === 'gestionnaire' && member.user_id !== changedBy
      )

      // Identifier les gestionnaires directement responsables
      const directResponsibles = new Set(directManagerIds.filter(id => id !== changedBy))

      // Notification pour le locataire (toujours personnelle)
      if (intervention.tenant_id && intervention.tenant_id !== changedBy) {
        let tenantTitle: string, tenantMessage: string, priority: "low" | "normal" | "high" | "urgent"

        switch (statusTo) {
          case 'approuvee':
            tenantTitle = 'Intervention approuvée'
            tenantMessage = `Votre demande d'intervention "${intervention.title}" a été approuvée. Elle va maintenant être planifiée.`
            priority = 'normal'
            break
          case 'rejetee':
            tenantTitle = 'Intervention rejetée'
            tenantMessage = `Votre demande d'intervention "${intervention.title}" a été rejetée. ${reason ? `Motif: ${reason}` : ''}`
            priority = 'high'
            break
          case 'annulee':
            tenantTitle = 'Intervention annulée'
            tenantMessage = `L'intervention "${intervention.title}" a été annulée. ${reason ? `Motif: ${reason}` : ''}`
            priority = 'high'
            break
          default:
            tenantTitle = 'Statut intervention modifié'
            tenantMessage = `Le statut de l'intervention "${intervention.title}" a été modifié.`
            priority = 'normal'
        }

        await this.createNotification({
          userId: intervention.tenant_id,
          teamId: intervention.team_id,
          createdBy: changedBy,
          type: 'intervention',
          priority,
          title: tenantTitle,
          message: tenantMessage,
          isPersonal: true,
          metadata: {
            interventionId: intervention.id,
            interventionTitle: intervention.title,
            statusFrom,
            statusTo,
            reason: reason || null
          },
          relatedEntityType: 'intervention',
          relatedEntityId: intervention.id
        })
      }

      // Notifications pour les gestionnaires
      let actionLabel, personalTitle, teamTitle
      
      switch (statusTo) {
        case 'approuvee':
          actionLabel = 'approuvée'
          personalTitle = 'Intervention approuvée sous votre responsabilité'
          teamTitle = 'Intervention approuvée'
          break
        case 'rejetee':
          actionLabel = 'rejetée'
          personalTitle = 'Intervention rejetée sous votre responsabilité'
          teamTitle = 'Intervention rejetée'
          break
        case 'annulee':
          actionLabel = 'annulée'
          personalTitle = 'Intervention annulée sous votre responsabilité'
          teamTitle = 'Intervention annulée'
          break
        default:
          actionLabel = 'modifiée'
          personalTitle = 'Intervention modifiée sous votre responsabilité'
          teamTitle = 'Statut d\'intervention modifié'
      }

      const notificationPromises = allManagers.map(async (manager) => {
        const isDirectlyResponsible = directResponsibles.has(manager.user_id)

        if (isDirectlyResponsible) {
          // Notification personnelle pour les gestionnaires directement responsables
          return this.createNotification({
            userId: manager.user_id,
            teamId: intervention.team_id,
            createdBy: changedBy,
            type: 'intervention',
            priority: 'normal',
            title: personalTitle,
            message: `L'intervention "${intervention.title}" a été ${actionLabel}.${reason ? ` Motif: ${reason}` : ''}`,
            isPersonal: true,
            metadata: {
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              statusFrom,
              statusTo,
              reason: reason || null
            },
            relatedEntityType: 'intervention',
            relatedEntityId: intervention.id
          })
        } else {
          // Notification d'équipe pour les autres gestionnaires
          return this.createNotification({
            userId: manager.user_id,
            teamId: intervention.team_id,
            createdBy: changedBy,
            type: 'intervention',
            priority: 'normal',
            title: teamTitle,
            message: `L'intervention "${intervention.title}" a été ${actionLabel} par votre équipe.`,
            isPersonal: false,
            metadata: {
              interventionId: intervention.id,
              interventionTitle: intervention.title,
              statusFrom,
              statusTo,
              reason: reason || null
            },
            relatedEntityType: 'intervention',
            relatedEntityId: intervention.id
          })
        }
      })

      await Promise.all(notificationPromises)

      // Notifications pour les prestataires assignés (simplifiées pour éviter les erreurs de schema)
      const providerCount = 0
      try {
        // TODO: Implémenter les notifications prestataires quand le schema sera corrigé
        logger.info("📧 Provider notifications skipped (schema issues)")
      } catch (error) {
        logger.warn("⚠️ Error getting provider contacts:", error)
      }

      const directCount = directResponsibles.size
      const teamCount = allManagers.length - directCount
      const tenantCount = intervention.tenant_id && intervention.tenant_id !== changedBy ? 1 : 0
      
      logger.info(`📬 Intervention status change notifications sent: ${directCount} personal managers, ${teamCount} team managers, ${tenantCount} tenant, ${providerCount} providers`)

    } catch (error) {
      logger.error('❌ Failed to notify intervention status changed:', error)
    }
  }

  /**
   * Notifier la demande de devis à un prestataire
   */
  async notifyQuoteRequest(intervention: Intervention, provider: User, requestedBy: string, deadline?: string, notes?: string) {
    try {
      if (!intervention.team_id || !provider.id || !requestedBy) return

      // Notification au prestataire pour la demande de devis
      await this.createNotification({
        userId: provider.id,
        teamId: intervention.team_id,
        createdBy: requestedBy,
        type: 'intervention',
        priority: 'high',
        title: 'Nouvelle demande de devis',
        message: `Vous avez reçu une demande de devis pour l'intervention "${intervention.title}".${deadline ? ` Date limite: ${new Date(deadline).toLocaleDateString('fr-FR')}` : ''}`,
        isPersonal: true,
        metadata: {
          interventionId: intervention.id,
          interventionTitle: intervention.title,
          deadline: deadline || null,
          notes: notes || null,
          actionRequired: 'quote_submission'
        },
        relatedEntityType: 'intervention',
        relatedEntityId: intervention.id
      })

      logger.info(`📬 Quote request notification sent to provider ${provider.name} (${provider.id})`)

    } catch (error) {
      logger.error('❌ Failed to notify quote request:', error)
    }
  }

  /**
   * Notifier la réponse du locataire aux disponibilités proposées
   */
  async notifyAvailabilityResponse({
    interventionId,
    interventionTitle,
    responseType,
    tenantName,
    message = '',
    teamId,
    lotReference
  }: {
    interventionId: string
    interventionTitle: string
    responseType: 'accept' | 'reject' | 'counter'
    tenantName: string
    message?: string
    teamId: string
    lotReference?: string
  }) {
    try {
      if (!teamId) return

      logger.info('📬 Notifying availability response:', {
        interventionId,
        responseType,
        tenantName,
        teamId
      })

      // Récupérer les gestionnaires et prestataires assignés à l'intervention
      const { data: interventionContacts } = await this.supabase
        .from('intervention_contacts')
        .select(`
          user_id,
          role,
          user:user_id(id, name, role)
        `)
        .eq('intervention_id', interventionId)

      if (!interventionContacts || interventionContacts.length === 0) {
        logger.warn('No contacts found for intervention:', interventionId)
        return
      }

      // Séparer gestionnaires et prestataires
      const managers = (interventionContacts as InterventionContact[]).filter(ic => ic.role === 'gestionnaire')
      const providers = (interventionContacts as InterventionContact[]).filter(ic => ic.role === 'prestataire')

      // Préparer les titres et messages selon le type de réponse
      let managerTitle: string, managerMessage: string, providerTitle: string, providerMessage: string
      let priority: 'normal' | 'high' | 'urgent' = 'normal'

      switch (responseType) {
        case 'accept':
          managerTitle = `Créneaux acceptés - ${interventionTitle}`
          managerMessage = `${tenantName} a accepté les créneaux proposés pour l'intervention ${lotReference ? `(${lotReference})` : ''}.`
          providerTitle = `Créneaux acceptés - ${interventionTitle}`
          providerMessage = `Le locataire ${tenantName} a accepté vos créneaux proposés ${lotReference ? `(${lotReference})` : ''}.`
          priority = 'high'
          break

        case 'reject':
          managerTitle = `Créneaux rejetés - ${interventionTitle}`
          managerMessage = `${tenantName} a rejeté tous les créneaux proposés pour l'intervention ${lotReference ? `(${lotReference})` : ''}.`
          providerTitle = `Créneaux rejetés - ${interventionTitle}`
          providerMessage = `Le locataire ${tenantName} a rejeté vos créneaux proposés ${lotReference ? `(${lotReference})` : ''}.`
          priority = 'urgent'
          break

        case 'counter':
          managerTitle = `Contre-propositions reçues - ${interventionTitle}`
          managerMessage = `${tenantName} a proposé d'autres créneaux pour l'intervention ${lotReference ? `(${lotReference})` : ''}.`
          providerTitle = `Contre-propositions reçues - ${interventionTitle}`
          providerMessage = `Le locataire ${tenantName} a proposé d'autres créneaux ${lotReference ? `(${lotReference})` : ''}.`
          priority = 'high'
          break
      }

      // Ajouter le message du locataire s'il y en a un
      if (message) {
        managerMessage += ` Message: "${message}"`
        providerMessage += ` Message: "${message}"`
      }

      // Créer les notifications pour les gestionnaires
      const managerPromises = managers.map(manager =>
        this.createNotification({
          userId: manager.user_id,
          teamId,
          type: 'intervention',
          priority,
          title: managerTitle,
          message: managerMessage,
          isPersonal: true,
          metadata: {
            interventionId,
            interventionTitle,
            responseType,
            tenantName,
            tenantMessage: message,
            actionRequired: responseType === 'accept' ? 'schedule_intervention' : 'review_availability_response'
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      )

      // Créer les notifications pour les prestataires
      const providerPromises = providers.map(provider =>
        this.createNotification({
          userId: provider.user_id,
          teamId,
          type: 'intervention',
          priority,
          title: providerTitle,
          message: providerMessage,
          isPersonal: true,
          metadata: {
            interventionId,
            interventionTitle,
            responseType,
            tenantName,
            tenantMessage: message,
            actionRequired: responseType === 'counter' ? 'review_counter_proposals' : 'prepare_for_intervention'
          },
          relatedEntityType: 'intervention',
          relatedEntityId: interventionId
        })
      )

      // Envoyer toutes les notifications
      await Promise.all([...managerPromises, ...providerPromises])

      logger.info(`📬 Availability response notifications sent: ${managers.length} managers, ${providers.length} providers`)

    } catch (error) {
      logger.error('❌ Failed to notify availability response:', error)
      throw error
    }
  }
}

// Factory function for creating service instances (RECOMMENDED)
export const createNotificationService = async () => {
  const supabase = await createServerSupabaseClient()
  return new NotificationService(supabase)
}

// Legacy singleton for backward compatibility
// @deprecated Use createNotificationService() for proper server context
// This uses a browser client as fallback - only for legacy code
let _legacyInstance: NotificationService | null = null

export const notificationService = new Proxy({} as NotificationService, {
  get(_target, prop) {
    // Lazy initialization on first access
    if (!_legacyInstance) {
      // Import dynamically to avoid circular dependencies
      const { createBrowserSupabaseClient } = require('./services')
      const supabase = createBrowserSupabaseClient()
      _legacyInstance = new NotificationService(supabase)
    }
    return (_legacyInstance as any)[prop]
  }
})
