/**
 * Chat Utilities - Message Preview & Timestamp Formatting
 * Based on Material Design 3 best practices for conversation lists
 */

/**
 * Truncates message content to a maximum length with ellipsis
 *
 * UX Best Practice: 70 characters provides optimal readability
 * while fitting most mobile and desktop layouts
 *
 * @param content - The message content to truncate
 * @param maxLength - Maximum character count (default: 70)
 * @returns Truncated string with "..." if content exceeds maxLength
 *
 * @example
 * truncateMessage("This is a very long message that needs to be shortened", 20)
 * // Returns: "This is a very lon..."
 */
export function truncateMessage(content: string, maxLength = 70): string {
  if (!content) return ''
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength).trim() + '...'
}

/**
 * Formats a timestamp as relative time in French
 *
 * Pattern follows Material Design 3 Expressive guidelines:
 * - Immediate: "À l'instant"
 * - Recent (< 1h): "Il y a X min"
 * - Today (< 24h): "Il y a Xh"
 * - Yesterday: "Hier à 14:30"
 * - This week (< 7 days): "Mar à 10:15"
 * - Older: "2 janv. à 10:15"
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted relative time string in French
 *
 * @example
 * formatRelativeTime("2025-10-27T12:30:00Z") // 5 minutes ago
 * // Returns: "Il y a 5 min"
 */
export function formatRelativeTime(timestamp: string): string {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()

  // Handle invalid dates
  if (isNaN(date.getTime())) return ''

  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // Less than 1 minute
  if (diffMins < 1) {
    return "À l'instant"
  }

  // Less than 1 hour
  if (diffMins < 60) {
    return `Il y a ${diffMins} min`
  }

  // Less than 24 hours
  if (diffHours < 24) {
    return `Il y a ${diffHours}h`
  }

  // Yesterday
  if (diffDays === 1) {
    const timeStr = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `Hier à ${timeStr}`
  }

  // Less than 7 days (show day name)
  if (diffDays < 7) {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const timeStr = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    return `${days[date.getDay()]} à ${timeStr}`
  }

  // Older than 7 days
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${dateStr} à ${timeStr}`
}
