import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

// Types pour le système de logging
type ActivityActionType = Database['public']['Enums']['activity_action_type']
type ActivityEntityType = Database['public']['Enums']['activity_entity_type']  
type ActivityStatus = Database['public']['Enums']['activity_status']

interface LogActivityParams {
  teamId: string
  userId: string
  actionType: ActivityActionType
  entityType: ActivityEntityType
  entityId?: string
  entityName?: string
  description: string
  status?: ActivityStatus
  metadata?: Record<string, unknown>
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
}

interface ActivityLoggerContext {
  userId?: string
  teamId?: string
  ipAddress?: string
  userAgent?: string
}

class ActivityLogger {
  private context: ActivityLoggerContext = {}

  /**
   * Configure le contexte global pour éviter de répéter les mêmes informations
   */
  setContext(context: Partial<ActivityLoggerContext>) {
    this.context = { ...this.context, ...context }
  }

  /**
   * Enregistre une activité dans la base de données
   */
  async log(params: LogActivityParams): Promise<string | null> {
    try {
      const logData = {
        team_id: params.teamId || this.context._teamId,
        user_id: params.userId || this.context._userId,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        entity_name: params.entityName || null,
        description: params.description,
        status: params.status || 'success',
        metadata: params.metadata || {},
        error_message: params.errorMessage || null,
        ip_address: params.ipAddress || this.context.ipAddress || null,
        user_agent: params.userAgent || this.context.userAgent || null,
      }

      // Validation des champs obligatoires
      if (!logData.team_id || !logData.user_id) {
        console.error('ActivityLogger: team_id and user_id are required')
        return null
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .insert(logData)
        .select('id')
        .single()

      if (error) {
        console.error('ActivityLogger: Error saving log:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        return null
      }

      return data?.id || null
    } catch (error) {
      console.error('ActivityLogger: Unexpected error:', error instanceof Error ? error.message : String(error))
      return null
    }
  }

  /**
   * Logs spécialisés pour chaque type d'entité
   */
  
  // Logs pour les utilisateurs
  async logUserAction(
    actionType: 'create' | 'update' | 'delete' | 'invite' | 'accept_invite',
    userId: string,
    userName: string,
    details?: Record<string, unknown>
  ) {
    let description = ''
    
    switch (actionType) {
      case 'create':
        description = `Nouvel utilisateur créé : ${userName}`
        break
      case 'update':
        description = `Profil utilisateur modifié : ${userName}`
        break
      case 'delete':
        description = `Utilisateur supprimé : ${userName}`
        break
      case 'invite':
        description = `Invitation envoyée à : ${userName}`
        break
      case 'accept_invite':
        description = `Invitation acceptée par : ${userName}`
        break
    }

    return this.log({
      actionType,
      entityType: 'user',
      entityId: _userId,
      entityName: userName,
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  // Logs pour les équipes
  async logTeamAction(
    actionType: 'create' | 'update' | 'delete',
    teamId: string,
    teamName: string,
    details?: Record<string, unknown>
  ) {
    let description = ''
    
    switch (actionType) {
      case 'create':
        description = `Nouvelle équipe créée : ${teamName}`
        break
      case 'update':
        description = `Équipe modifiée : ${teamName}`
        break
      case 'delete':
        description = `Équipe supprimée : ${teamName}`
        break
    }

    return this.log({
      actionType,
      entityType: 'team',
      entityId: _teamId,
      entityName: teamName,
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  // Logs pour les immeubles
  async logBuildingAction(
    actionType: 'create' | 'update' | 'delete',
    buildingId: string,
    buildingName: string,
    details?: Record<string, unknown>
  ) {
    let description = ''
    
    switch (actionType) {
      case 'create':
        description = `Nouvel immeuble ajouté : ${buildingName}`
        break
      case 'update':
        description = `Immeuble modifié : ${buildingName}`
        break
      case 'delete':
        description = `Immeuble supprimé : ${buildingName}`
        break
    }

    return this.log({
      actionType,
      entityType: 'building',
      entityId: _buildingId,
      entityName: buildingName,
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  // Logs pour les lots
  async logLotAction(
    actionType: 'create' | 'update' | 'delete' | 'assign' | 'unassign',
    lotId: string,
    lotReference: string,
    details?: Record<string, unknown>
  ) {
    let description = ''
    
    switch (actionType) {
      case 'create':
        description = `Nouveau lot créé : ${lotReference}`
        break
      case 'update':
        description = `Lot modifié : ${lotReference}`
        break
      case 'delete':
        description = `Lot supprimé : ${lotReference}`
        break
      case 'assign':
        description = `Locataire assigné au lot : ${lotReference}`
        break
      case 'unassign':
        description = `Locataire retiré du lot : ${lotReference}`
        break
    }

    return this.log({
      actionType,
      entityType: 'lot',
      entityId: _lotId,
      entityName: lotReference,
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  // Logs pour les contacts
  async logContactAction(
    actionType: 'create' | 'update' | 'delete' | 'assign' | 'unassign',
    contactId: string,
    contactName: string,
    details?: Record<string, unknown>
  ) {
    let description = ''
    
    switch (actionType) {
      case 'create':
        description = `Nouveau contact ajouté : ${contactName}`
        break
      case 'update':
        description = `Contact modifié : ${contactName}`
        break
      case 'delete':
        description = `Contact supprimé : ${contactName}`
        break
      case 'assign':
        description = `Contact assigné : ${contactName}`
        break
      case 'unassign':
        description = `Contact retiré : ${contactName}`
        break
    }

    return this.log({
      actionType,
      entityType: 'contact',
      entityId: contactId,
      entityName: contactName,
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  // Logs pour les interventions
  async logInterventionAction(
    actionType: 'create' | 'update' | 'delete' | 'assign' | 'approve' | 'reject' | 'complete' | 'cancel' | 'status_change',
    interventionId: string,
    interventionRef: string,
    details?: Record<string, unknown>
  ) {
    let description = ''
    
    switch (actionType) {
      case 'create':
        description = `Nouvelle intervention créée : ${interventionRef}`
        break
      case 'update':
        description = `Intervention modifiée : ${interventionRef}`
        break
      case 'delete':
        description = `Intervention supprimée : ${interventionRef}`
        break
      case 'assign':
        description = `Intervention assignée : ${interventionRef}`
        break
      case 'approve':
        description = `Intervention approuvée : ${interventionRef}`
        break
      case 'reject':
        description = `Intervention rejetée : ${interventionRef}`
        break
      case 'complete':
        description = `Intervention terminée : ${interventionRef}`
        break
      case 'cancel':
        description = `Intervention annulée : ${interventionRef}`
        break
      case 'status_change':
        const fromStatus = details?.from_status || 'unknown'
        const toStatus = details?.to_status || 'unknown'
        description = `Statut changé de '${fromStatus}' vers '${toStatus}' : ${interventionRef}`
        break
    }

    return this.log({
      actionType,
      entityType: 'intervention',
      entityId: interventionId,
      entityName: interventionRef,
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  // Logs pour les documents
  async logDocumentAction(
    actionType: 'upload' | 'download' | 'delete',
    documentId: string,
    fileName: string,
    details?: Record<string, unknown>
  ) {
    let description = ''
    
    switch (actionType) {
      case 'upload':
        description = `Document uploadé : ${fileName}`
        break
      case 'download':
        description = `Document téléchargé : ${fileName}`
        break
      case 'delete':
        description = `Document supprimé : ${fileName}`
        break
    }

    return this.log({
      actionType,
      entityType: 'document',
      entityId: documentId,
      entityName: fileName,
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  // Logs pour les sessions
  async logSessionAction(
    actionType: 'login' | 'logout',
    details?: Record<string, unknown>
  ) {
    const description = actionType === 'login' 
      ? 'Connexion à l\'application' 
      : 'Déconnexion de l\'application'

    return this.log({
      actionType,
      entityType: 'session',
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  /**
   * Méthode pour logger les erreurs/échecs
   */
  async logError(
    actionType: ActivityActionType,
    entityType: ActivityEntityType,
    entityName: string,
    errorMessage: string,
    details?: Record<string, unknown>
  ) {
    return this.log({
      actionType,
      entityType,
      entityName,
      description: `Échec de l'action ${actionType} sur ${entityType} : ${entityName}`,
      status: 'failed',
      errorMessage,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
    })
  }

  /**
   * Récupération des logs d'activité avec filtres
   */
  async getActivityLogs(filters?: {
    teamId?: string
    userId?: string
    entityType?: ActivityEntityType
    actionType?: ActivityActionType
    status?: ActivityStatus
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }) {
    try {
      let query = supabase
        .from('activity_logs_with_user')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?._teamId) {
        query = query.eq('team_id', filters._teamId)
      }
      
      if (filters?._userId) {
        query = query.eq('user_id', filters._userId)
      }
      
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType)
      }
      
      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType)
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('ActivityLogger: Error fetching logs:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('ActivityLogger: Unexpected error fetching logs:', error)
      return null
    }
  }

  /**
   * Statistiques d'activité
   */
  async getActivityStats(teamId: string, period: '24h' | '7d' | '30d' = '7d') {
    try {
      const startDate = new Date()
      
      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24)
          break
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
      }

      const { data, error } = await supabase
        .from('activity_logs')
        .select('action_type, entity_type, status')
        .eq('team_id', _teamId)
        .gte('created_at', startDate.toISOString())

      if (error) {
        console.error('ActivityLogger: Error fetching stats:', error)
        return null
      }

      // Calcul des statistiques
      const stats = {
        total: data.length,
        byAction: {} as Record<string, number>,
        byEntity: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        successRate: 0,
      }

      data.forEach(log => {
        stats.byAction[log.action_type] = (stats.byAction[log.action_type] || 0) + 1
        stats.byEntity[log.entity_type] = (stats.byEntity[log.entity_type] || 0) + 1
        stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1
      })

      stats.successRate = stats.total > 0 
        ? (stats.byStatus['success'] || 0) / stats.total * 100 
        : 0

      return stats
    } catch (error) {
      console.error('ActivityLogger: Error calculating stats:', error)
      return null
    }
  }
}

// Instance singleton pour réutilisation
export const activityLogger = new ActivityLogger()

// Hook pour utiliser dans les composants React
export const useActivityLogger = (context?: ActivityLoggerContext) => {
  if (context) {
    activityLogger.setContext(context)
  }
  
  return activityLogger
}

export default ActivityLogger
