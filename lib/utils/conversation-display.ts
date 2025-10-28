/**
 * Conversation Display Utilities
 *
 * Helper functions to generate user-friendly conversation titles and subtitles
 * based on thread type and viewer's role.
 */

import { Database } from '@/lib/database.types'

type ThreadType = Database['public']['Enums']['conversation_thread_type']
type UserRole = Database['public']['Enums']['user_role']

interface Participant {
  user_id: string
  user: {
    id: string
    name: string
    first_name?: string | null
    last_name?: string | null
    role: UserRole
  }
}

interface ConversationDisplayInfo {
  title: string
  subtitle?: string
}

/**
 * Get display title and subtitle for a conversation based on viewer's role
 *
 * @param threadType - Type of conversation thread
 * @param viewerRole - Role of the user viewing the conversation
 * @param participants - List of conversation participants
 * @returns Object with title and optional subtitle
 */
export function getConversationDisplayInfo(
  threadType: ThreadType,
  viewerRole: UserRole,
  participants: Participant[]
): ConversationDisplayInfo {
  // Group conversations always show "Discussion générale"
  if (threadType === 'group') {
    return {
      title: 'Discussion générale'
    }
  }

  // For tenant_to_managers thread
  if (threadType === 'tenant_to_managers') {
    if (viewerRole === 'gestionnaire') {
      // Manager viewing tenant conversation
      const tenants = participants.filter(p => p.user.role === 'locataire')
      return {
        title: 'Locataire',
        subtitle: formatParticipantNames(tenants)
      }
    } else {
      // Tenant viewing manager conversation
      const managers = participants.filter(p => p.user.role === 'gestionnaire')
      return {
        title: 'Gestionnaire',
        subtitle: formatParticipantNames(managers)
      }
    }
  }

  // For provider_to_managers thread
  if (threadType === 'provider_to_managers') {
    if (viewerRole === 'gestionnaire') {
      // Manager viewing provider conversation
      const providers = participants.filter(p => p.user.role === 'prestataire')
      return {
        title: 'Prestataire',
        subtitle: formatParticipantNames(providers)
      }
    } else {
      // Provider viewing manager conversation
      const managers = participants.filter(p => p.user.role === 'gestionnaire')
      return {
        title: 'Gestionnaire',
        subtitle: formatParticipantNames(managers)
      }
    }
  }

  // Fallback (should not happen)
  return {
    title: 'Conversation'
  }
}

/**
 * Format participant names into a readable string
 *
 * @param participants - List of participants
 * @returns Formatted string with participant name(s)
 */
function formatParticipantNames(participants: Participant[]): string {
  if (participants.length === 0) {
    return 'Aucun participant'
  }

  if (participants.length === 1) {
    return participants[0].user.name
  }

  if (participants.length === 2) {
    return `${participants[0].user.name} et ${participants[1].user.name}`
  }

  // For 3+ participants, show first name + count
  const firstName = participants[0].user.name
  const remaining = participants.length - 1
  return `${firstName} et ${remaining} autre${remaining > 1 ? 's' : ''}`
}

/**
 * Get short label for conversation sidebar (without subtitle)
 * Used when space is limited
 *
 * @param threadType - Type of conversation thread
 * @param viewerRole - Role of the user viewing the conversation
 * @returns Short label string
 */
export function getConversationShortLabel(
  threadType: ThreadType,
  viewerRole: UserRole
): string {
  if (threadType === 'group') {
    return 'Discussion générale'
  }

  if (threadType === 'tenant_to_managers') {
    return viewerRole === 'gestionnaire' ? 'Locataire' : 'Gestionnaire'
  }

  if (threadType === 'provider_to_managers') {
    return viewerRole === 'gestionnaire' ? 'Prestataire' : 'Gestionnaire'
  }

  return 'Conversation'
}
