import { createServerSupabaseClient, type ServerSupabaseClient } from '@/lib/services'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import { generateActivityEntityName } from '@/lib/utils/activity-name-generator'

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
  // ✅ NOUVEAU: Champs pour filtrage et affichage enrichi
  interventionId?: string
  buildingId?: string
  lotId?: string
  displayTitle?: string
  displayContext?: string
}

interface ActivityLoggerContext {
  userId?: string
  teamId?: string
  ipAddress?: string
  userAgent?: string
}

class ActivityLogger {
  private supabase: ServerSupabaseClient
  private context: ActivityLoggerContext = {}

  constructor(supabase: ServerSupabaseClient) {
    this.supabase = supabase
  }

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
        team_id: params.teamId || this.context.teamId,
        user_id: params.userId || this.context.userId,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        entity_name: params.entityName || generateActivityEntityName(params.entityType, params.actionType),
        description: params.description,
        status: params.status || 'success',
        metadata: params.metadata || {},
        error_message: params.errorMessage || null,
        ip_address: params.ipAddress || this.context.ipAddress || null,
        user_agent: params.userAgent || this.context.userAgent || null,
        // ✅ NOUVEAU: Champs pour filtrage et affichage enrichi
        intervention_id: params.interventionId || null,
        building_id: params.buildingId || null,
        lot_id: params.lotId || null,
        display_title: params.displayTitle || null,
        display_context: params.displayContext || null,
      }

      // Validation des champs obligatoires
      if (!logData.team_id || !logData.user_id) {
        console.error('❌ ActivityLogger: team_id and user_id are required', {
          team_id: logData.team_id,
          user_id: logData.user_id,
          context: this.context
        })
        return null
      }

      // 🔍 DEBUG: Log the data being sent
      console.log('📝 ActivityLogger: Attempting to insert log:', JSON.stringify(logData, null, 2))

      const { data, error } = await this.supabase
        .from('activity_logs')
        .insert(logData)
        .select('id')
        .single()

      if (error) {
        console.error('❌ ActivityLogger: Error saving log:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          sentData: logData
        })
        console.error('❌ Full error object:', JSON.stringify(error, null, 2))
        return null
      }

      console.log('✅ ActivityLogger: Log saved successfully:', data?.id)
      return data?.id || null
    } catch (error) {
      console.error('❌ ActivityLogger: Unexpected error:', error instanceof Error ? error.message : String(error))
      console.error('❌ Full exception:', error)
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
      entityId: userId,
      entityName: generateActivityEntityName('user', actionType),
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
      entityId: teamId,
      entityName: generateActivityEntityName('team', actionType),
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
      entityId: buildingId,
      entityName: generateActivityEntityName('building', actionType),
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
      entityId: lotId,
      entityName: generateActivityEntityName('lot', actionType),
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
      entityName: generateActivityEntityName('contact', actionType),
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
    // ✅ Charger l'intervention avec relations pour extraire building_id et lot_id
    let buildingId: string | null = null
    let lotId: string | null = null
    let displayTitle: string | null = null
    let displayContext: string | null = null

    try {
      const { data: intervention } = await this.supabase
        .from('interventions')
        .select(`
          id,
          title,
          reference,
          lot_id,
          building_id,
          lot:lot_id(
            id,
            reference,
            building_id,
            building:building_id(id, name)
          )
        `)
        .eq('id', interventionId)
        .single()

      if (intervention) {
        // ✅ Extraire building_id: priorité à lot.building_id
        buildingId = intervention.lot?.building_id || intervention.building_id || null
        lotId = intervention.lot_id || null
        
        // ✅ Construire affichage enrichi
        displayTitle = details?.title as string || intervention.title || interventionRef
        const lotRef = intervention.lot?.reference
        const buildingName = intervention.lot?.building?.name
        displayContext = lotRef
          ? `${buildingName} - Lot ${lotRef}`
          : buildingName || null
      }
    } catch (error) {
      console.error('⚠️ ActivityLogger: Failed to load intervention relations:', error)
      // Continue sans ces infos si erreur
    }

    let description = ''
    
    switch (actionType) {
      case 'create':
        description = `Nouvelle intervention créée : ${displayTitle || interventionRef}`
        break
      case 'update':
        description = `Intervention modifiée : ${displayTitle || interventionRef}`
        break
      case 'delete':
        description = `Intervention supprimée : ${displayTitle || interventionRef}`
        break
      case 'assign':
        description = `Intervention assignée : ${displayTitle || interventionRef}`
        break
      case 'approve':
        description = `Intervention approuvée : ${displayTitle || interventionRef}`
        break
      case 'reject':
        description = `Intervention rejetée : ${displayTitle || interventionRef}`
        break
      case 'complete':
        description = `Intervention terminée : ${displayTitle || interventionRef}`
        break
      case 'cancel':
        description = `Intervention annulée : ${displayTitle || interventionRef}`
        break
      case 'status_change':
        const fromStatus = details?.from_status || 'unknown'
        const toStatus = details?.to_status || 'unknown'
        description = `Statut changé de '${fromStatus}' vers '${toStatus}' : ${displayTitle || interventionRef}`
        break
    }

    return this.log({
      actionType,
      entityType: 'intervention',
      entityId: interventionId,
      entityName: generateActivityEntityName('intervention', actionType),
      description,
      metadata: details,
      teamId: this.context.teamId!,
      userId: this.context.userId!,
      // ✅ NOUVEAU: Relations et affichage enrichi
      interventionId,
      buildingId,
      lotId,
      displayTitle,
      displayContext,
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
      entityName: generateActivityEntityName('document', actionType),
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
      status: 'failure',  // ✅ Fixed: changed from 'failed' to match database enum (success|failure|pending)
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

      if (filters?.teamId) {
        query = query.eq('team_id', filters.teamId)
      }
      
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
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

      const { data, error } = await this.supabase
        .from('activity_logs')
        .select('action_type, entity_type, status')
        .eq('team_id', teamId)
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

// Factory function for creating service instances (RECOMMENDED)
export const createActivityLogger = async () => {
  const supabase = await createServerSupabaseClient()
  return new ActivityLogger(supabase)
}

// Legacy singleton for backward compatibility
// @deprecated Use createActivityLogger() for proper server context
// This uses a browser client as fallback - only for legacy code
let _legacyInstance: ActivityLogger | null = null

export const activityLogger = new Proxy({} as ActivityLogger, {
  get(_target, prop) {
    // Lazy initialization on first access
    if (!_legacyInstance) {
      // Import dynamically to avoid circular dependencies
      const { createBrowserSupabaseClient } = require('./services')
      const supabase = createBrowserSupabaseClient()
      _legacyInstance = new ActivityLogger(supabase)
    }
    return (_legacyInstance as any)[prop]
  }
})

export default ActivityLogger
