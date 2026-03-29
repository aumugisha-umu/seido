/**
 * 📧 Email Notification Constants
 *
 * Configuration constants for rate limiting and retry behavior.
 *
 * @module email-notification/constants
 */

// ══════════════════════════════════════════════════════════════
// Rate Limiting
// ══════════════════════════════════════════════════════════════

/**
 * Delay between each email to avoid Resend rate limiting (500ms = 2 req/s max)
 */
export const RESEND_RATE_LIMIT_DELAY_MS = 500

/**
 * Maximum number of retries for 429 (rate limit) errors
 */
export const MAX_RETRIES = 3

/**
 * Base delay for exponential retry backoff (ms)
 */
export const RETRY_DELAY_MS = 1000

// ══════════════════════════════════════════════════════════════
// Batch Configuration
// ══════════════════════════════════════════════════════════════

/**
 * Default TVA rate for quote calculations
 */
export const DEFAULT_TVA_RATE = 0.20
