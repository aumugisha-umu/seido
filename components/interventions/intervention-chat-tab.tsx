'use client'

/**
 * Intervention Chat Tab Component (Shared/Reusable)
 * Unified chat interface for all user roles with role-based configuration
 *
 * This component adapts its behavior and available threads based on the user's role:
 * - Gestionnaire: Can see all conversations (group, tenant_to_managers, provider_to_managers)
 * - Locataire: Can see group + tenant_to_managers
 * - Prestataire: Can see group + provider_to_managers
 */

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Users, UserCheck, Shield, Briefcase } from 'lucide-react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { sendMessageAction } from '@/app/actions/conversation-actions'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

type Thread = Database['public']['Tables']['conversation_threads']['Row'] & {
  unread_count?: number  // Added by conversation service
  last_message?: Array<{  // Added by repository query
    content: string
    created_at: string
    user: { name: string } | null
  }>
}
type UserRole = Database['public']['Enums']['user_role']
type ThreadType = 'group' | 'tenant_to_managers' | 'provider_to_managers'

export interface InterventionChatTabProps {
  interventionId: string
  threads: Thread[]
  initialMessagesByThread?: Record<string, any[]>
  initialParticipantsByThread?: Record<string, any[]>
  currentUserId: string
  userRole: UserRole
  /** Type de thread à pré-sélectionner à l'ouverture */
  defaultThreadType?: string
}

// ============================================================================
// ROLE-BASED CONFIGURATION
// ============================================================================
// This configuration adapts the component behavior based on the user's role

interface ThreadConfig {
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface RoleConfig {
  visibleThreads: ThreadType[]
  emptyMessage: string
  threadConfigs: Record<ThreadType, ThreadConfig>
}

const roleBasedConfig: Record<UserRole, RoleConfig> = {
  gestionnaire: {
    visibleThreads: ['group', 'tenant_to_managers', 'provider_to_managers'],
    emptyMessage: 'Les conversations seront créées automatiquement lorsque des participants seront assignés à l\'intervention.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenant_to_managers: {
        label: 'Locataire ↔ Gestionnaires',
        description: 'Conversation entre le locataire et les gestionnaires',
        icon: UserCheck,
        color: 'bg-green-100 text-green-800'
      },
      provider_to_managers: {
        label: 'Prestataire ↔ Gestionnaires',
        description: 'Conversation entre le prestataire et les gestionnaires',
        icon: Briefcase,
        color: 'bg-purple-100 text-purple-800'
      }
    }
  },
  locataire: {
    visibleThreads: ['group', 'tenant_to_managers'],
    emptyMessage: 'Les conversations seront disponibles une fois votre demande validée.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenant_to_managers: {
        label: 'Discussion avec les gestionnaires',
        description: 'Conversation privée avec les gestionnaires',
        icon: Shield,
        color: 'bg-green-100 text-green-800'
      },
      provider_to_managers: {
        label: '', // Not visible to tenants
        description: '',
        icon: MessageSquare,
        color: ''
      }
    }
  },
  prestataire: {
    visibleThreads: ['group', 'provider_to_managers'],
    emptyMessage: 'Les conversations seront disponibles une fois l\'intervention planifiée.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenant_to_managers: {
        label: '', // Not visible to providers
        description: '',
        icon: MessageSquare,
        color: ''
      },
      provider_to_managers: {
        label: 'Discussion avec les gestionnaires',
        description: 'Conversation privée avec les gestionnaires',
        icon: Briefcase,
        color: 'bg-purple-100 text-purple-800'
      }
    }
  },
  admin: {
    // Admin role included for completeness (though unlikely to view interventions)
    visibleThreads: ['group', 'tenant_to_managers', 'provider_to_managers'],
    emptyMessage: 'Aucune conversation disponible.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenant_to_managers: {
        label: 'Locataire ↔ Gestionnaires',
        description: 'Conversation entre le locataire et les gestionnaires',
        icon: Shield,
        color: 'bg-green-100 text-green-800'
      },
      provider_to_managers: {
        label: 'Prestataire ↔ Gestionnaires',
        description: 'Conversation entre le prestataire et les gestionnaires',
        icon: Briefcase,
        color: 'bg-purple-100 text-purple-800'
      }
    }
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InterventionChatTab({
  interventionId,
  threads,
  initialMessagesByThread,
  initialParticipantsByThread,
  currentUserId,
  userRole,
  defaultThreadType
}: InterventionChatTabProps) {
  // Get role-specific configuration
  const config = roleBasedConfig[userRole]

  // Filter threads based on user role
  const visibleThreads = threads.filter((thread) =>
    config.visibleThreads.includes(thread.thread_type as ThreadType)
  )

  // Active thread state - pré-sélectionne le thread demandé ou le premier
  const [activeThread, setActiveThread] = useState<Thread | null>(() => {
    if (defaultThreadType) {
      const targetThread = visibleThreads.find(t => t.thread_type === defaultThreadType)
      if (targetThread) return targetThread
    }
    return visibleThreads.length > 0 ? visibleThreads[0] : null
  })

  // Réagir aux changements de defaultThreadType (quand on clique sur une icône message)
  useEffect(() => {
    if (defaultThreadType) {
      const targetThread = visibleThreads.find(t => t.thread_type === defaultThreadType)
      if (targetThread && targetThread.id !== activeThread?.id) {
        setActiveThread(targetThread)
      }
    }
  }, [defaultThreadType, visibleThreads, activeThread?.id])

  // Handle sending message
  const handleSendMessage = async (content: string, attachments?: string[]) => {
    if (!activeThread) return

    console.log('💬 [INTERVENTION-CHAT-TAB] handleSendMessage called with:', {
      threadId: activeThread.id,
      content,
      attachments,
      attachmentsLength: attachments?.length
    })

    const result = await sendMessageAction(activeThread.id, content, attachments)

    console.log('💬 [INTERVENTION-CHAT-TAB] sendMessageAction result:', {
      success: result.success,
      hasData: !!result.data,
      error: result.error
    })

    if (!result.success) {
      console.error('❌ [INTERVENTION-CHAT-TAB] Full error object:', result.error)
      console.error('❌ [INTERVENTION-CHAT-TAB] Error type:', typeof result.error)
      console.error('❌ [INTERVENTION-CHAT-TAB] Error stringified:', JSON.stringify(result.error, null, 2))

      toast.error(result.error || 'Erreur lors de l\'envoi du message')
      throw new Error(result.error)
    }
  }

  // Empty state: no threads available
  if (visibleThreads.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">
            Aucune conversation
          </p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {config.emptyMessage}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Main layout: Chat interface only (no sidebar list)
  // Le thread actif est déterminé par defaultThreadType ou le premier thread disponible
  return (
    <div className="h-full flex flex-col">
      {activeThread ? (
        <ChatInterface
          threadId={activeThread.id}
          currentUserId={currentUserId}
          userRole={userRole}
          initialMessages={initialMessagesByThread}
          initialParticipants={initialParticipantsByThread}
          onSendMessage={handleSendMessage}
        />
      ) : (
        <Card className="flex-1">
          <CardContent className="flex items-center justify-center py-12 h-full">
            <p className="text-muted-foreground">
              Aucune conversation disponible
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
