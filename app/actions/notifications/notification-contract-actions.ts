'use server'

/**
 * Notification Contract Actions
 *
 * Contract-specific notifications: expiring contracts, new contracts.
 */

import { createServerNotificationRepository } from '@/lib/services'
import { EmailService } from '@/lib/services/domain/email.service'
import { getServerAuthContext } from '@/lib/server-context'
import { logger } from '@/lib/logger'
import { sendPushNotificationToUsers } from '@/lib/send-push-notification'
import { sendPushToNotificationRecipients } from './notification-helpers'

/**
 * Notify team managers about an expiring contract
 */
export async function notifyContractExpiring({
  contractId,
  daysUntilExpiry
}: {
  contractId: string
  daysUntilExpiry: number
}) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({
      action: 'notifyContractExpiring',
      contractId,
      daysUntilExpiry,
      teamId: team.id
    }, '[NOTIFICATION-ACTION] Creating contract expiration notification')

    const repository = await createServerNotificationRepository()

    const { data: contract } = await repository.supabase
      .from('contracts')
      .select(`id, title, end_date, lot_id, lots(reference, address_record:address_id(*))`)
      .eq('id', contractId)
      .single()

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    const notifications: Array<{ user_id: string; is_personal: boolean }> = []

    const { data: teamManagers } = await repository.supabase
      .from('team_members')
      .select('user_id, users(email, first_name, last_name)')
      .eq('team_id', team.id)
      .eq('role', 'gestionnaire')

    const urgencyLevel = daysUntilExpiry <= 7 ? 'urgent' : 'warning'
    const urgencyEmoji = daysUntilExpiry <= 7 ? '🔴' : '🟠'

    for (const manager of teamManagers || []) {
      const result = await repository.create({
        user_id: manager.user_id,
        team_id: team.id,
        created_by: profile.id,
        type: 'alert',
        title: `${urgencyEmoji} Contrat expire bientot`,
        message: `Le contrat "${contract.title}" expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`,
        is_personal: false,
        metadata: {
          contract_id: contractId,
          days_until_expiry: daysUntilExpiry,
          urgency_level: urgencyLevel,
          end_date: contract.end_date,
          lot_reference: (contract.lots as Record<string, unknown>)?.reference
        },
        related_entity_type: 'contract',
        related_entity_id: contractId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    logger.info({ contractId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Contract expiration notifications created')

    // PUSH: urgent expiry (7 days or less)
    if (daysUntilExpiry <= 7 && notifications.length > 0) {
      const managerIds = notifications.map(n => n.user_id)
      sendPushNotificationToUsers(managerIds, {
        title: `Contrat expire dans ${daysUntilExpiry}j`,
        message: `Le contrat "${contract.title}" expire bientot`,
        url: `/gestionnaire/contrats/${contractId}`,
        type: 'deadline'
      }).catch(err => logger.error({ err }, '[PUSH] Failed in notifyContractExpiring'))
    }

    // EMAIL NOTIFICATIONS
    try {
      const emailService = new EmailService()
      if (emailService.isConfigured() && teamManagers && teamManagers.length > 0) {
        const { ContractExpiringEmail } = await import('@/emails/templates/contracts/contract-expiring')

        const lotReference = (contract.lots as Record<string, unknown>)?.reference as string || 'N/A'
        const endDateFormatted = contract.end_date
          ? new Date(contract.end_date).toLocaleDateString('fr-FR')
          : 'N/A'
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido-app.com'
        const contractUrl = `${baseUrl}/gestionnaire/contrats/${contractId}`
        const urgencyIcon = daysUntilExpiry <= 7 ? '🔴' : '🟠'

        for (const manager of teamManagers) {
          const managerUser = manager.users as Record<string, unknown> | null
          if (!managerUser?.email) continue

          const result = await emailService.send({
            to: managerUser.email as string,
            subject: `${urgencyIcon} Contrat expire dans ${daysUntilExpiry}j - ${contract.title}`,
            react: ContractExpiringEmail({
              firstName: (managerUser.first_name as string) || 'Gestionnaire',
              contractTitle: contract.title || 'Contrat',
              lotReference,
              daysUntilExpiry,
              endDate: endDateFormatted,
              contractUrl,
            }),
            tags: [{ name: 'type', value: 'contract_expiring' }]
          })

          logger.info({ contractId, emailSent: result.success, to: managerUser.email }, '[NOTIFICATION-ACTION] Contract expiring email sent')
        }
      }
    } catch (emailError) {
      logger.warn({ emailError, contractId }, '[NOTIFICATION-ACTION] Could not send contract expiring emails')
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, contractId }, '[NOTIFICATION-ACTION] Failed to notify contract expiration')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Check all expiring contracts for a team and send notifications
 */
export async function checkExpiringContracts() {
  try {
    const { team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'checkExpiringContracts', teamId: team.id }, '[NOTIFICATION-ACTION] Checking for expiring contracts')

    const repository = await createServerNotificationRepository()

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const { data: expiringContracts } = await repository.supabase
      .from('contracts')
      .select('id, title, end_date, lot_id, metadata')
      .eq('team_id', team.id)
      .eq('status', 'actif')
      .is('deleted_at', null)
      .gte('end_date', now.toISOString().split('T')[0])
      .lte('end_date', in30Days.toISOString().split('T')[0])

    if (!expiringContracts || expiringContracts.length === 0) {
      return { success: true, data: [], message: 'No expiring contracts found' }
    }

    const notifications: unknown[] = []

    for (const contract of expiringContracts) {
      const endDate = new Date(contract.end_date)
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

      const metadata = (contract.metadata as Record<string, unknown>) || {}
      const notified30Days = metadata.notified_30_days
      const notified7Days = metadata.notified_7_days

      if (daysUntilExpiry <= 30 && daysUntilExpiry > 7 && !notified30Days) {
        const result = await notifyContractExpiring({ contractId: contract.id, daysUntilExpiry })

        if (result.success) {
          await repository.supabase
            .from('contracts')
            .update({ metadata: { ...metadata, notified_30_days: new Date().toISOString() } })
            .eq('id', contract.id)

          notifications.push(...(result.data || []))
        }
      }

      if (daysUntilExpiry <= 7 && !notified7Days) {
        const result = await notifyContractExpiring({ contractId: contract.id, daysUntilExpiry })

        if (result.success) {
          await repository.supabase
            .from('contracts')
            .update({ metadata: { ...metadata, notified_7_days: new Date().toISOString() } })
            .eq('id', contract.id)

          notifications.push(...(result.data || []))
        }
      }
    }

    logger.info({
      teamId: team.id,
      expiringCount: expiringContracts.length,
      notificationsSent: notifications.length
    }, '[NOTIFICATION-ACTION] Expiring contracts check complete')

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error }, '[NOTIFICATION-ACTION] Failed to check expiring contracts')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Create notification for new contract
 */
export async function createContractNotification(contractId: string) {
  try {
    const { profile, team } = await getServerAuthContext('gestionnaire')

    logger.info({ action: 'createContractNotification', contractId, userId: profile.id }, '[NOTIFICATION-ACTION] Creating contract notification')

    const repository = await createServerNotificationRepository()

    const { data: contract } = await repository.supabase
      .from('contracts')
      .select('id, title, start_date, end_date, rent_amount, lot_id, lots(reference, address_record:address_id(*))')
      .eq('id', contractId)
      .single()

    if (!contract) {
      return { success: false, error: 'Contract not found' }
    }

    const notifications: Array<{ user_id: string; is_personal: boolean }> = []

    // Notify team managers
    const { data: teamManagers } = await repository.supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', team.id)
      .eq('role', 'gestionnaire')
      .neq('user_id', profile.id)

    for (const manager of teamManagers || []) {
      const result = await repository.create({
        user_id: manager.user_id,
        team_id: team.id,
        created_by: profile.id,
        type: 'system',
        title: 'Nouveau contrat cree',
        message: `Le contrat "${contract.title}" a ete cree pour le lot ${(contract.lots as Record<string, unknown>)?.reference || 'N/A'}`,
        is_personal: false,
        metadata: {
          contract_id: contractId,
          start_date: contract.start_date,
          end_date: contract.end_date,
          rent_amount: contract.rent_amount
        },
        related_entity_type: 'contract',
        related_entity_id: contractId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    // Notify tenants
    const { data: contractContacts } = await repository.supabase
      .from('contract_contacts')
      .select('user_id, role, users(email, first_name, last_name)')
      .eq('contract_id', contractId)
      .eq('role', 'locataire')

    for (const contact of contractContacts || []) {
      const result = await repository.create({
        user_id: contact.user_id,
        team_id: team.id,
        created_by: profile.id,
        type: 'system',
        title: 'Votre contrat de bail',
        message: `Un contrat de bail "${contract.title}" a ete cree pour vous`,
        is_personal: true,
        metadata: {
          contract_id: contractId,
          start_date: contract.start_date,
          end_date: contract.end_date
        },
        related_entity_type: 'contract',
        related_entity_id: contractId,
        read: false
      })
      if (result.success && result.data) notifications.push(result.data)
    }

    logger.info({ contractId, notificationCount: notifications.length }, '[NOTIFICATION-ACTION] Contract notifications created')

    // PUSH
    if (notifications.length > 0) {
      sendPushToNotificationRecipients(notifications, {
        title: 'Nouveau contrat de bail',
        message: `Contrat "${contract.title}" cree`,
        url: `/locataire/contrats/${contractId}`,
        type: 'contract'
      }).catch(err => logger.error({ err }, '[PUSH] Failed in createContractNotification'))
    }

    // EMAIL
    try {
      const emailService = new EmailService()
      if (emailService.isConfigured() && contractContacts && contractContacts.length > 0) {
        const { ContractCreatedEmail } = await import('@/emails/templates/contracts/contract-created')

        const lot = contract.lots as Record<string, unknown> | null
        const lotReference = (lot?.reference as string) || 'N/A'
        const addressRecord = lot?.address_record as Record<string, unknown> | null
        const propertyAddress = addressRecord
          ? `${addressRecord.street || ''}, ${addressRecord.postal_code || ''} ${addressRecord.city || ''}`.trim().replace(/^,\s*/, '')
          : 'Adresse non renseignee'
        const startDateFormatted = contract.start_date
          ? new Date(contract.start_date).toLocaleDateString('fr-FR')
          : 'Non definie'
        const endDateFormatted = contract.end_date
          ? new Date(contract.end_date).toLocaleDateString('fr-FR')
          : undefined
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seido-app.com'
        const contractUrl = `${baseUrl}/locataire/contrats/${contractId}`

        for (const contact of contractContacts) {
          const contactUser = contact.users as Record<string, unknown> | null
          if (!contactUser?.email) continue

          const result = await emailService.send({
            to: contactUser.email as string,
            subject: `Nouveau contrat - ${contract.title}`,
            react: ContractCreatedEmail({
              firstName: (contactUser.first_name as string) || 'Locataire',
              contractTitle: contract.title || 'Contrat',
              lotReference,
              propertyAddress,
              startDate: startDateFormatted,
              endDate: endDateFormatted,
              contractUrl,
            }),
            tags: [{ name: 'type', value: 'contract_created' }]
          })

          logger.info({ contractId, emailSent: result.success, to: contactUser.email }, '[NOTIFICATION-ACTION] Contract created email sent')
        }
      }
    } catch (emailError) {
      logger.warn({ emailError, contractId }, '[NOTIFICATION-ACTION] Could not send contract created emails')
    }

    return { success: true, data: notifications }
  } catch (error) {
    logger.error({ error, contractId }, '[NOTIFICATION-ACTION] Failed to create contract notification')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
