import { Bell, User, Check, Info, Clock, Activity, Users } from "lucide-react"

/**
 * Convertit une date en format relatif (il y a X min/h/j)
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return "À l'instant"
  } else if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`
  } else if (diffHours < 24) {
    return `Il y a ${diffHours}h`
  } else if (diffDays === 1) {
    return "Hier"
  } else if (diffDays < 7) {
    return `Il y a ${diffDays}j`
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short"
    })
  }
}

/**
 * Retourne l'icône appropriée pour un type de notification
 */
export function getNotificationIcon(type: string): {
  icon: typeof Bell
  className: string
} {
  const iconMap: Record<string, { icon: typeof Bell; className: string }> = {
    intervention: {
      icon: Bell,
      className: "text-blue-500"
    },
    assignment: {
      icon: User,
      className: "text-purple-500"
    },
    payment: {
      icon: Check,
      className: "text-green-500"
    },
    document: {
      icon: Info,
      className: "text-blue-500"
    },
    system: {
      icon: Clock,
      className: "text-gray-500"
    },
    team_invite: {
      icon: Users,
      className: "text-indigo-500"
    },
    status_change: {
      icon: Activity,
      className: "text-orange-500"
    },
    reminder: {
      icon: Clock,
      className: "text-yellow-600"
    }
  }

  return iconMap[type] || {
    icon: Bell,
    className: "text-slate-500"
  }
}

/**
 * Tronque un texte sur un nombre maximum de lignes
 */
export function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + "..."
}

/**
 * Retourne le label français d'un type de notification
 */
export function getNotificationTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    intervention: "Intervention",
    assignment: "Assignation",
    payment: "Paiement",
    document: "Document",
    system: "Système",
    team_invite: "Invitation d'équipe",
    status_change: "Changement de statut",
    reminder: "Rappel"
  }

  return labelMap[type] || "Notification"
}

/**
 * Interface de notification pour la navigation
 */
export interface NotificationNavigable {
  related_entity_type?: string
  related_entity_id?: string
  metadata?: Record<string, any>
}

/**
 * Retourne l'URL de navigation appropriée pour une notification
 * Basé sur le type d'entité liée et le rôle de l'utilisateur
 */
export function getNotificationNavigationUrl(
  notification: NotificationNavigable,
  userRole: 'gestionnaire' | 'prestataire' | 'locataire' | 'admin'
): string | null {
  const entityType = notification.related_entity_type
  const entityId = notification.related_entity_id || notification.metadata?.intervention_id

  if (!entityType || !entityId) {
    return null
  }

  // Navigation vers les interventions
  if (entityType === 'intervention') {
    return `/${userRole}/interventions/${entityId}`
  }

  // Navigation vers les lots (extensible)
  if (entityType === 'lot') {
    return `/${userRole}/biens/lots/${entityId}`
  }

  // Navigation vers les bâtiments (extensible)
  if (entityType === 'building') {
    return `/${userRole}/biens/immeubles/${entityId}`
  }

  // Navigation vers les documents (extensible)
  if (entityType === 'document') {
    return `/${userRole}/documents`
  }

  // Aucune navigation applicable
  return null
}
