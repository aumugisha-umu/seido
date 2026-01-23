/**
 * 📧 EmailNotificationService - Re-export Facade
 *
 * This file re-exports the refactored email notification module for backward compatibility.
 * All existing imports from '@/lib/services/domain/email-notification.service' continue to work.
 *
 * The actual implementation is now in:
 * - lib/services/domain/email-notification/types.ts - Types and interfaces
 * - lib/services/domain/email-notification/constants.ts - Rate limiting constants
 * - lib/services/domain/email-notification/helpers.ts - Utility functions
 * - lib/services/domain/email-notification/data-enricher.ts - Data fetching
 * - lib/services/domain/email-notification/email-sender.ts - Batch sending
 * - lib/services/domain/email-notification/builders/*.ts - Email templates
 * - lib/services/domain/email-notification/email-notification.service.ts - Orchestrator
 *
 * @module email-notification.service
 *
 * @example
 * ```typescript
 * // Old import path (still works)
 * import { EmailNotificationService, createEmailNotificationServiceWithDeps } from '@/lib/services/domain/email-notification.service'
 *
 * // New import path (preferred)
 * import { EmailNotificationService, createEmailNotificationServiceWithDeps } from '@/lib/services/domain/email-notification'
 * ```
 */

// Re-export everything from the refactored module
export * from './email-notification'

// Note: The factory is in email-notification.factory.ts (separate file to avoid webpack fs issues)
// import { createEmailNotificationService } from '@/lib/services/domain/email-notification.factory'
