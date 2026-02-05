/**
 * Notification System Constants
 */

// LocalStorage key for tracking when user dismissed the notification prompt
export const NOTIFICATION_DISMISS_KEY = 'seido_notification_prompt_dismissed_at'

// Duration before showing the prompt again after dismiss (24 hours)
export const NOTIFICATION_DISMISS_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Check if the notification prompt was dismissed recently (within 24h)
 */
export function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false

  const dismissedAt = localStorage.getItem(NOTIFICATION_DISMISS_KEY)
  if (!dismissedAt) return false

  const dismissedTime = parseInt(dismissedAt, 10)
  if (isNaN(dismissedTime)) return false

  return Date.now() - dismissedTime < NOTIFICATION_DISMISS_DURATION_MS
}

/**
 * Mark the notification prompt as dismissed (will reappear after 24h)
 */
export function setDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(NOTIFICATION_DISMISS_KEY, Date.now().toString())
}

/**
 * Clear the dismiss timestamp (prompt will show immediately)
 */
export function clearDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(NOTIFICATION_DISMISS_KEY)
}
