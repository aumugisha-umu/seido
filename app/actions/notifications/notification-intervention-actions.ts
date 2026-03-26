'use server'

/**
 * Notification Intervention Actions
 *
 * Intervention-specific notification creation: new intervention, status change, assignments.
 */

import {
  createServerNotificationRepository,
  createServerInterventionRepository,
  createServerUserRepository,
  createServerBuildingRepository,
  createServerLotRepository
} from '@/lib/services'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { NotificationService } from '@/lib/services/domain/notification.service'
import { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailService } from '@/lib/services/domain/email.service'
import { getServerAuthContext } from '@/lib/server-context'
import { logger } from '@/lib/logger'
import { isTeamSubscriptionBlocked } from '@/lib/subscription-guard'
import { sendRoleAwarePushNotifications } from './notification-helpers'

/**
 * Create notification for new intervention
 *
 * Uses service role to work regardless of who creates the intervention
 */
export async function createInterventionNotification(interventionId: string) {
  try {
    const supabase = createServiceRoleSupabaseClient()

    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, team_id, created_by, title, status')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error({ error: interventionError, interventionId }, '[NOTIFICATION-ACTION] Intervention not found')
      return { success: false, error: interventionError?.message || 'Intervention not found' }
    }

    if (await isTeamSubscriptionBlocked(intervention.team_id)) {
      logger.info({ interventionId, teamId: intervention.team_id }, '[NOTIFICATION-ACTION] Skipping — subscription blocked')
      return { success: true, data: [] }
    }

    logger.info({
      action: 'createInterventionNotification',
      interventionId,
      teamId: intervention.team_id,
      createdBy: intervention.created_by
    }, '[NOTIFICATION-ACTION] Creating intervention notification (service role)')

    const repository = new NotificationRepository(supabase)
    const service = new NotificationService(repository)

    const notifications = await service.notifyInterventionCreated({
      interventionId,
      teamId: intervention.team_id,
      createdBy: intervention.created_by
    })

    logger.info({ interventionId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Intervention notifications created')

    sendRoleAwarePushNotifications(notifications, {
      title: 'Nouvelle intervention',
      message: intervention.title || 'Une nouvelle intervention a ete creee',
      type: 'intervention'
    }, interventionId).catch(err => logger.error({ err }, '[PUSH] Failed in createInterventionNotification'))

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, interventionId }, '[NOTIFICATION-ACTION] Failed to create intervention notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Create notification for intervention status change
 */
export async function notifyInterventionStatusChange({
  interventionId,
  oldStatus,
  newStatus,
  reason
}: {
  interventionId: string
  oldStatus: string
  newStatus: string
  reason?: string
}) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    if (await isTeamSubscriptionBlocked(team.id)) {
      logger.info({ interventionId, teamId: team.id }, '[NOTIFICATION-ACTION] Skipping status change — subscription blocked')
      return { success: true, data: [] }
    }

    logger.info({
      action: 'notifyInterventionStatusChange',
      interventionId,
      oldStatus,
      newStatus,
      userId: profile.id
    }, '[NOTIFICATION-ACTION] Creating status change notification')

    const repository = await createServerNotificationRepository()
    const service = new NotificationService(repository)

    const notifications = await service.notifyInterventionStatusChange({
      interventionId,
      oldStatus,
      newStatus,
      teamId: team.id,
      changedBy: profile.id,
      reason
    })

    logger.info({
      interventionId,
      notificationCount: notifications.length,
      notificationDetails: notifications.map((n, i) => {
        let parsedMetadata = n.data?.metadata
        if (typeof parsedMetadata === 'string') {
          try { parsedMetadata = JSON.parse(parsedMetadata) } catch { parsedMetadata = { parseError: 'Failed to parse metadata string' } }
        }
        return {
          index: i,
          hasData: !!n.data,
          userId: n.data?.user_id,
          isPersonal: n.data?.is_personal,
          metadataType: typeof n.data?.metadata,
          metadataRaw: n.data?.metadata,
          metadataParsed: parsedMetadata,
          assignedRoleFromRaw: n.data?.metadata?.assigned_role,
          assignedRoleFromParsed: (parsedMetadata as Record<string, unknown>)?.assigned_role
        }
      })
    }, '[NOTIFICATION-ACTION] Status change notifications created - DEBUG full structure')

    // PUSH NOTIFICATIONS
    const statusMessages: Record<string, string> = {
      approuvee: 'Intervention approuvee',
      rejetee: 'Demande refusee',
      planification: 'Planification en cours',
      planifiee: 'Intervention planifiee',
      en_cours: 'Intervention en cours',
      cloturee_par_prestataire: 'Intervention terminee par le prestataire',
      cloturee_par_locataire: 'Intervention validee',
      cloturee_par_gestionnaire: 'Intervention cloturee',
      annulee: 'Intervention annulee'
    }

    const getPushMessage = (): string => {
      if (newStatus === 'approuvee') return 'Votre demande a ete approuvee. La planification peut commencer.'
      if (newStatus === 'rejetee' && reason) return `Motif : ${reason}`
      return reason || `Statut change de ${oldStatus} vers ${newStatus}`
    }

    sendRoleAwarePushNotifications(notifications, {
      title: statusMessages[newStatus] || 'Mise a jour intervention',
      message: getPushMessage(),
      type: 'status_change'
    }, interventionId).catch(err => logger.error({ err }, '[PUSH] Failed in notifyInterventionStatusChange'))

    // EMAIL NOTIFICATIONS
    try {
      const [interventionRepository, userRepository, buildingRepository, lotRepository] = await Promise.all([
        createServerInterventionRepository(),
        createServerUserRepository(),
        createServerBuildingRepository(),
        createServerLotRepository()
      ])
      const emailService = new EmailService()

      const emailNotificationService = new EmailNotificationService(
        repository,
        emailService,
        interventionRepository,
        userRepository,
        buildingRepository,
        lotRepository
      )

      const emailResult = await emailNotificationService.sendInterventionEmails({
        interventionId,
        eventType: 'status_changed',
        excludeUserId: profile.id,
        excludeNonPersonal: true,
        statusChange: {
          oldStatus,
          newStatus,
          reason,
          actorName: profile.name || 'Votre gestionnaire'
        }
      })

      logger.info({
        interventionId,
        emailsSent: emailResult.sentCount,
        emailsFailed: emailResult.failedCount
      }, '[NOTIFICATION-ACTION] Status change emails sent')
    } catch (emailError) {
      logger.warn({ emailError, interventionId }, '[NOTIFICATION-ACTION] Could not send status change emails')
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, interventionId, oldStatus, newStatus }, '[NOTIFICATION-ACTION] Failed to create status change notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
