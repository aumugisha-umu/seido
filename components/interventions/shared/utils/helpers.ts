/**
 * Fonctions utilitaires pour les composants de prévisualisation d'intervention
 */

import { UserRole, USER_ROLE_COLORS, USER_ROLE_LABELS } from '../types/intervention-preview.types'

// ============================================================================
// Formatage de texte
// ============================================================================

/**
 * Extrait les initiales d'un nom complet
 * @example getInitials("Jean Dupont") => "JD"
 * @example getInitials("Marie") => "M"
 * @example getInitials("Jean-Pierre Martin") => "JM"
 */
export const getInitials = (name: string): string => {
  if (!name || typeof name !== 'string') return '?'

  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Tronque un texte à une longueur maximale avec ellipsis
 * @example truncateText("Hello World", 5) => "Hello..."
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

// ============================================================================
// Formatage de dates
// ============================================================================

/**
 * Formate une date pour affichage
 * @example formatDate("2025-01-15") => "15 janvier 2025"
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

/**
 * Formate une date de façon courte
 * @example formatDateShort("2025-01-15") => "15 janv."
 */
export const formatDateShort = (dateString: string): string => {
  if (!dateString) return ''

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    })
  } catch {
    return dateString
  }
}

/**
 * Formate une heure
 * @example formatTime("14:30:00") => "14h30"
 */
export const formatTime = (timeString: string): string => {
  if (!timeString) return ''

  // Si c'est au format HH:MM:SS ou HH:MM
  const parts = timeString.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}h${parts[1]}`
  }

  return timeString
}

/**
 * Formate une plage horaire
 * @example formatTimeRange("09:00", "12:00") => "9h00 - 12h00"
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

/**
 * Formate une date relative (il y a X minutes, hier, etc.)
 * @example formatRelativeDate(new Date(Date.now() - 60000)) => "il y a 1 minute"
 */
export const formatRelativeDate = (date: Date | string): string => {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - then.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return "à l'instant"
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays} jours`

  return formatDateShort(then.toISOString())
}

// ============================================================================
// Formatage de montants
// ============================================================================

/**
 * Formate un montant en euros
 * @example formatAmount(1500) => "1 500 €"
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

// ============================================================================
// Couleurs et styles
// ============================================================================

/**
 * Retourne les classes Tailwind pour un badge de rôle
 */
export const getRoleBadgeClasses = (role: UserRole): string => {
  const colors = USER_ROLE_COLORS[role]
  return `${colors.bg} ${colors.text} ${colors.border}`
}

/**
 * Retourne les classes Tailwind pour un avatar de rôle
 */
export const getRoleAvatarClasses = (role: UserRole): string => {
  return USER_ROLE_COLORS[role].avatar
}

/**
 * Retourne le label français d'un rôle
 */
export const getRoleLabel = (role: UserRole): string => {
  return USER_ROLE_LABELS[role]
}

/**
 * Retourne la couleur principale d'un rôle (pour les boutons, etc.)
 */
export const getRoleAccentColor = (role: UserRole): string => {
  switch (role) {
    case 'manager':
      return 'blue'
    case 'provider':
      return 'amber'
    case 'tenant':
      return 'emerald'
  }
}

/**
 * Retourne les classes pour un bouton selon le rôle
 */
export const getRoleButtonClasses = (role: UserRole): string => {
  switch (role) {
    case 'manager':
      return 'bg-blue-600 hover:bg-blue-700 text-white'
    case 'provider':
      return 'bg-amber-600 hover:bg-amber-700 text-white'
    case 'tenant':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white'
  }
}

// ============================================================================
// Utilitaires divers
// ============================================================================

/**
 * Génère un ID unique simple
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Classe conditionnelle (alternative simple à clsx/cn)
 */
export const cx = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ')
}

/**
 * Comptage avec pluriel
 * @example pluralize(0, "message", "messages") => "0 message"
 * @example pluralize(1, "message", "messages") => "1 message"
 * @example pluralize(5, "message", "messages") => "5 messages"
 */
export const pluralize = (
  count: number,
  singular: string,
  plural: string
): string => {
  return `${count} ${count <= 1 ? singular : plural}`
}

/**
 * Extrait l'extension d'un nom de fichier
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

/**
 * Retourne l'icône appropriée pour un type de fichier
 */
export const getFileTypeIcon = (filename: string): string => {
  const ext = getFileExtension(filename)

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  const docExts = ['doc', 'docx', 'odt']
  const pdfExts = ['pdf']
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods']

  if (imageExts.includes(ext)) return 'image'
  if (docExts.includes(ext)) return 'document'
  if (pdfExts.includes(ext)) return 'pdf'
  if (spreadsheetExts.includes(ext)) return 'spreadsheet'

  return 'file'
}
