'use server'

/**
 * Notification Quote Actions
 *
 * Quote-specific notifications: requested, approved, rejected, submitted.
 */

import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import { logger } from '@/lib/logger'
import { sendPushToNotificationRecipients } from './notification-helpers'

/**
 * Notify provider about a new quote request
 */
export async function notifyQuoteRequested(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  providerId: string
  providerName: string
  teamId: string
  requestedBy: string
  requestedByName: string
  deadline?: string | null
}) {
  try {
    logger.info({
      action: 'notifyQuoteRequested',
      quoteId: params.quoteId,
      providerId: params.providerId,
      interventionId: params.interventionId
    }, '[NOTIFICATION-ACTION] Creating quote request notification')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications: Array<{ user_id: string; is_personal: boolean }> = []

    const result = await repository.create({
      user_id: params.providerId,
      team_id: params.teamId,
      created_by: params.requestedBy,
      type: 'intervention',
      title: 'Nouvelle demande d\'estimation',
      message: `${params.requestedByName} vous demande une estimation pour "${params.interventionTitle}"${params.deadline ? ` (avant le ${new Date(params.deadline).toLocaleDateString('fr-FR')})` : ''}`,
      is_personal: true,
      metadata: {
        quote_id: params.quoteId,
        intervention_id: params.interventionId,
        intervention_title: params.interventionTitle,
        deadline: params.deadline,
        action_required: 'quote_submission'
      },
      related_entity_type: 'intervention',
      related_entity_id: params.interventionId,
      read: false
    })

    if (result.success && result.data) {
      notifications.push(result.data)
    }

    logger.info({ quoteId: params.quoteId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Quote request notification created')

    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: 'Demande d\'estimation',
        message: `Nouvelle demande pour "${params.interventionTitle}"`,
        url: `/prestataire/interventions/${params.interventionId}`,
        type: 'quote_request'
      }).catch(err => logger.error({ err }, '[PUSH] Failed in notifyQuoteRequested'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, params }, '[NOTIFICATION-ACTION] Failed to notify quote request')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Notify provider about quote approval
 */
export async function notifyQuoteApproved(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  providerId: string
  providerName: string
  teamId: string
  approvedBy: string
  approvedByName: string
  amount: number
  notes?: string
}) {
  try {
    logger.info({
      action: 'notifyQuoteApproved',
      quoteId: params.quoteId,
      providerId: params.providerId
    }, '[NOTIFICATION-ACTION] Creating quote approval notification')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications: Array<{ user_id: string; is_personal: boolean }> = []

    const result = await repository.create({
      user_id: params.providerId,
      team_id: params.teamId,
      created_by: params.approvedBy,
      type: 'intervention',
      title: 'Estimation approuvee !',
      message: `Votre estimation de ${params.amount.toFixed(2)}EUR pour "${params.interventionTitle}" a ete approuvee${params.notes ? `. Note: ${params.notes}` : ''}`,
      is_personal: true,
      metadata: {
        quote_id: params.quoteId,
        intervention_id: params.interventionId,
        intervention_title: params.interventionTitle,
        amount: params.amount,
        approved_by: params.approvedByName,
        action_required: 'planning'
      },
      related_entity_type: 'intervention',
      related_entity_id: params.interventionId,
      read: false
    })

    if (result.success && result.data) {
      notifications.push(result.data)
    }

    logger.info({ quoteId: params.quoteId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Quote approval notification created')

    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: 'Estimation approuvee',
        message: `Votre estimation de ${params.amount.toFixed(2)}EUR a ete acceptee`,
        url: `/prestataire/interventions/${params.interventionId}`,
        type: 'quote_approved'
      }).catch(err => logger.error({ err }, '[PUSH] Failed in notifyQuoteApproved'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, params }, '[NOTIFICATION-ACTION] Failed to notify quote approval')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Notify provider about quote rejection
 */
export async function notifyQuoteRejected(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  providerId: string
  providerName: string
  teamId: string
  rejectedBy: string
  rejectedByName: string
  reason: string
  canResubmit?: boolean
}) {
  try {
    logger.info({
      action: 'notifyQuoteRejected',
      quoteId: params.quoteId,
      providerId: params.providerId
    }, '[NOTIFICATION-ACTION] Creating quote rejection notification')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications: Array<{ user_id: string; is_personal: boolean }> = []

    const result = await repository.create({
      user_id: params.providerId,
      team_id: params.teamId,
      created_by: params.rejectedBy,
      type: 'intervention',
      title: 'Estimation refusee',
      message: `Votre estimation pour "${params.interventionTitle}" a ete refusee. Motif: ${params.reason}`,
      is_personal: true,
      metadata: {
        quote_id: params.quoteId,
        intervention_id: params.interventionId,
        intervention_title: params.interventionTitle,
        rejection_reason: params.reason,
        can_resubmit: params.canResubmit ?? false
      },
      related_entity_type: 'intervention',
      related_entity_id: params.interventionId,
      read: false
    })

    if (result.success && result.data) {
      notifications.push(result.data)
    }

    logger.info({ quoteId: params.quoteId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Quote rejection notification created')

    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: 'Estimation refusee',
        message: `Motif: ${params.reason.substring(0, 50)}${params.reason.length > 50 ? '...' : ''}`,
        url: `/prestataire/interventions/${params.interventionId}`,
        type: 'quote_rejected'
      }).catch(err => logger.error({ err }, '[PUSH] Failed in notifyQuoteRejected'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, params }, '[NOTIFICATION-ACTION] Failed to notify quote rejection')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Notify managers about a quote submission
 */
export async function notifyQuoteSubmittedWithPush(params: {
  quoteId: string
  interventionId: string
  interventionTitle: string
  teamId: string
  providerId: string
  providerName: string
  amount: number
  managerIds: string[]
  primaryManagerId?: string
}) {
  try {
    logger.info({
      action: 'notifyQuoteSubmittedWithPush',
      quoteId: params.quoteId,
      managerCount: params.managerIds.length
    }, '[NOTIFICATION-ACTION] Creating quote submission notifications with push')

    const supabase = createServiceRoleSupabaseClient()
    const repository = new NotificationRepository(supabase)
    const notifications: Array<{ user_id: string; is_personal: boolean }> = []

    for (const managerId of params.managerIds) {
      const isPrimary = managerId === params.primaryManagerId
      const result = await repository.create({
        user_id: managerId,
        team_id: params.teamId,
        created_by: params.providerId,
        type: 'intervention',
        title: 'Nouvelle estimation recue',
        message: `${params.providerName} a soumis une estimation de ${params.amount.toFixed(2)}EUR pour "${params.interventionTitle}"`,
        is_personal: isPrimary,
        metadata: {
          quote_id: params.quoteId,
          intervention_id: params.interventionId,
          intervention_title: params.interventionTitle,
          amount: params.amount,
          provider_name: params.providerName,
          action_required: 'quote_review'
        },
        related_entity_type: 'intervention',
        related_entity_id: params.interventionId,
        read: false
      })

      if (result.success && result.data) {
        notifications.push(result.data)
      }
    }

    logger.info({ quoteId: params.quoteId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Quote submission notifications created')

    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: 'Nouvelle estimation',
        message: `${params.providerName}: ${params.amount.toFixed(2)}EUR`,
        url: `/gestionnaire/operations/interventions/${params.interventionId}`,
        type: 'quote_submitted'
      }).catch(err => logger.error({ err }, '[PUSH] Failed in notifyQuoteSubmittedWithPush'))
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, params }, '[NOTIFICATION-ACTION] Failed to notify quote submission')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
