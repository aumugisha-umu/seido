/**
 * 📧 Email Notification Module
 *
 * This module provides email notification functionality for interventions.
 * It is organized into smaller, maintainable files.
 *
 * @module email-notification
 *
 * @example
 * ```typescript
 * import {
 *   EmailNotificationService,
 *   createEmailNotificationServiceWithDeps,
 *   type EmailBatchResult
 * } from '@/lib/services/domain/email-notification'
 * ```
 */

// Re-export all types
export * from './types'

// Re-export constants
export * from './constants'

// Re-export helpers
export * from './helpers'

// Re-export action link generators
export * from './action-link-generators'

// Re-export data enricher
export * from './data-enricher'

// Re-export email sender
export * from './email-sender'

// Re-export builders
export * from './builders'

// Re-export main service
export { EmailNotificationService, createEmailNotificationServiceWithDeps } from './email-notification.service'
