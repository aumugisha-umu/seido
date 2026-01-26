/**
 * 📧 Email Notification Helpers
 *
 * Pure utility functions for email notification processing.
 *
 * @module email-notification/helpers
 */

// ══════════════════════════════════════════════════════════════
// Time Formatting
// ══════════════════════════════════════════════════════════════

/**
 * Format a PostgreSQL time (HH:mm:ss) to display format (HH:mm)
 * Removes seconds for cleaner display in emails and UI
 *
 * @param time - Time string in HH:mm:ss format
 * @returns Time string in HH:mm format
 *
 * @example
 * formatTimeWithoutSeconds('09:00:00') // Returns '09:00'
 * formatTimeWithoutSeconds('14:30:00') // Returns '14:30'
 */
export function formatTimeWithoutSeconds(time: string): string {
  return time.slice(0, 5)
}

// ══════════════════════════════════════════════════════════════
// Feature Flags
// ══════════════════════════════════════════════════════════════

/**
 * Check if interactive email buttons are enabled
 * Controlled via ENABLE_INTERACTIVE_EMAILS environment variable
 */
export function isInteractiveEmailsEnabled(): boolean {
  return process.env.ENABLE_INTERACTIVE_EMAILS === 'true'
}

// ══════════════════════════════════════════════════════════════
// Address Formatting
// ══════════════════════════════════════════════════════════════

/**
 * Format a property address as "postal code, city, country"
 *
 * Handles two cases:
 * 1. Independent lot (without building_id): uses lot fields
 * 2. Lot linked to a building or direct building: uses building fields
 *
 * @param building - Building data (can be null)
 * @param lot - Lot data (can be null)
 * @returns Formatted address or "Adresse non disponible"
 */
export function formatPropertyAddress(
  building: { postal_code?: string; city?: string; country?: string } | null,
  lot: { building_id?: string | null; postal_code?: string | null; city?: string | null; country?: string | null } | null
): string {
  // Case 1: Independent lot (no building_id)
  if (lot && !lot.building_id) {
    const parts = [lot.postal_code, lot.city, lot.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible'
  }

  // Case 2: Building (linked lot or direct intervention on building)
  if (building) {
    const parts = [building.postal_code, building.city, building.country].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : 'Adresse non disponible'
  }

  return 'Adresse non disponible'
}

/**
 * Format a full property address as "address, city"
 *
 * @param building - Building data with address and city
 * @returns Formatted full address
 */
export function formatFullPropertyAddress(
  building: { address?: string; city?: string } | null
): string {
  if (!building) return 'Adresse non specifiee'

  const parts = [building.address, building.city].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Adresse non specifiee'
}

// ══════════════════════════════════════════════════════════════
// Name Formatting
// ══════════════════════════════════════════════════════════════

/**
 * Format a user's full name
 *
 * @param user - User with optional first_name, last_name, name fields
 * @param fallback - Fallback string if no name available
 * @returns Formatted name or fallback
 */
export function formatUserName(
  user: { first_name?: string | null; last_name?: string | null; name?: string | null } | null,
  fallback: string = 'Utilisateur'
): string {
  if (!user) return fallback

  // Try first_name + last_name first
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  if (fullName) return fullName

  // Fallback to name field
  if (user.name) return user.name

  return fallback
}

/**
 * Format provider info for email display
 *
 * @param provider - Provider user data
 * @returns Formatted provider info
 */
export function formatProviderInfo(
  provider: { first_name?: string | null; last_name?: string | null; company_name?: string | null; phone?: string | null } | null
): { name: string; company: string; phone: string } {
  if (!provider) {
    return { name: 'Prestataire', company: '', phone: '' }
  }

  return {
    name: formatUserName(provider, 'Prestataire'),
    company: provider.company_name || '',
    phone: provider.phone || ''
  }
}

// ══════════════════════════════════════════════════════════════
// Error Detection
// ══════════════════════════════════════════════════════════════

/**
 * Check if an error is a rate limit error (429)
 *
 * @param error - Error message or object
 * @returns True if rate limit error
 */
export function isRateLimitError(error: string | undefined): boolean {
  if (!error) return false
  return error.includes('429') ||
         error.includes('rate_limit') ||
         error.includes('Too many requests')
}

// ══════════════════════════════════════════════════════════════
// Delay Helpers
// ══════════════════════════════════════════════════════════════

/**
 * Create a delay promise for rate limiting
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 *
 * @param retryCount - Current retry attempt (1-based)
 * @param baseDelay - Base delay in ms
 * @returns Delay in ms
 */
export function calculateBackoffDelay(retryCount: number, baseDelay: number): number {
  return baseDelay * retryCount
}
