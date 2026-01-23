/**
 * 📧 Factory auto-wired pour EmailNotificationService
 *
 * Ce fichier est séparé pour éviter que webpack n'inclue 'fs' dans le bundle client.
 * Il ne doit être importé QUE dans du code serveur (API routes, Server Actions, after()).
 *
 * IMPORTANT: Tous les imports sont dynamiques pour éviter que webpack n'analyse
 * les dépendances statiquement et n'essaie d'inclure 'fs' dans le bundle client.
 *
 * @example
 * ```typescript
 * // Dans une API route (after() closure)
 * const { createEmailNotificationService } = await import('@/lib/services/domain/email-notification.factory')
 * const emailService = await createEmailNotificationService()
 * await emailService.sendQuoteSubmitted({...})
 * ```
 */

import type { EmailNotificationService } from './email-notification'

/**
 * Crée une instance de EmailNotificationService avec toutes les dépendances auto-wired
 *
 * @returns Instance configurée prête à l'emploi
 */
export const createEmailNotificationService = async (): Promise<EmailNotificationService> => {
  // Imports dynamiques avec webpackIgnore pour éviter que webpack n'inclue 'fs' dans le bundle client
  const { EmailNotificationService } = await import(/* webpackIgnore: true */ './email-notification')
  const { EmailService } = await import(/* webpackIgnore: true */ './email.service')
  const {
    createServerNotificationRepository,
    createServerUserRepository,
    createServerBuildingRepository,
    createServerLotRepository,
    createServerInterventionRepository
  } = await import(/* webpackIgnore: true */ '@/lib/services')

  const notificationRepository = await createServerNotificationRepository()
  const userRepository = await createServerUserRepository()
  const buildingRepository = await createServerBuildingRepository()
  const lotRepository = await createServerLotRepository()
  const interventionRepository = await createServerInterventionRepository()
  const emailService = new EmailService()

  return new EmailNotificationService(
    notificationRepository,
    emailService,
    interventionRepository,
    userRepository,
    buildingRepository,
    lotRepository
  )
}
