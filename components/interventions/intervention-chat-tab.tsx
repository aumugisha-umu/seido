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

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, Users, UserCheck, Shield, Briefcase, UsersRound } from 'lucide-react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { ConversationSelector } from '@/components/interventions/shared/layout/conversation-selector'
import { sendMessageAction } from '@/app/actions/conversation-actions'
import { toast } from 'sonner'
import { formatErrorMessage } from '@/lib/utils/error-formatter'
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
type ThreadType = 'group' | 'tenants_group' | 'providers_group' | 'tenant_to_managers' | 'provider_to_managers'

export interface InterventionChatTabProps {
  interventionId: string
  threads: Thread[]
  initialMessagesByThread?: Record<string, any[]>
  initialParticipantsByThread?: Record<string, any[]>
  currentUserId: string
  userRole: UserRole
  /** Type de thread à pré-sélectionner à l'ouverture */
  defaultThreadType?: string
  /** Message initial à préremplir dans le champ de saisie */
  initialMessage?: string
  /** Callback appelé quand un message est envoyé (pour réinitialiser le message initial) */
  onMessageSent?: () => void
  /** Callback appelé quand l'utilisateur sélectionne un thread via le selector (pour sync avec parent) */
  onThreadTypeChange?: (threadType: string) => void
  /** Callback appelé quand un thread est marqué comme lu (pour mise à jour optimiste des badges) */
  onThreadRead?: (threadId: string) => void
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
    visibleThreads: ['group', 'tenants_group', 'providers_group', 'tenant_to_managers', 'provider_to_managers'],
    emptyMessage: 'Les conversations seront créées automatiquement lorsque des participants seront assignés à l\'intervention.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenants_group: {
        label: 'Groupe locataires',
        description: 'Conversation entre tous les locataires et les gestionnaires',
        icon: UsersRound,
        color: 'bg-emerald-100 text-emerald-800'
      },
      providers_group: {
        label: 'Groupe prestataires',
        description: 'Conversation entre tous les prestataires et les gestionnaires',
        icon: UsersRound,
        color: 'bg-violet-100 text-violet-800'
      },
      tenant_to_managers: {
        label: 'Locataire',  // Will be replaced by participant name in title
        description: 'Conversation privée avec ce locataire',
        icon: UserCheck,
        color: 'bg-green-100 text-green-800'
      },
      provider_to_managers: {
        label: 'Prestataire',  // Will be replaced by participant name in title
        description: 'Conversation privée avec ce prestataire',
        icon: Briefcase,
        color: 'bg-purple-100 text-purple-800'
      }
    }
  },
  locataire: {
    visibleThreads: ['group', 'tenants_group', 'tenant_to_managers'],
    emptyMessage: 'Aucune conversation disponible pour le moment.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenants_group: {
        label: 'Groupe locataires',
        description: 'Conversation entre tous les locataires',
        icon: UsersRound,
        color: 'bg-emerald-100 text-emerald-800'
      },
      providers_group: {
        label: '', // Not visible to tenants
        description: '',
        icon: MessageSquare,
        color: ''
      },
      tenant_to_managers: {
        label: 'Discussion avec les gestionnaires',
        description: 'Votre conversation privée avec les gestionnaires',
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
    visibleThreads: ['group', 'providers_group', 'provider_to_managers'],
    emptyMessage: 'Aucune conversation disponible pour le moment.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenants_group: {
        label: '', // Not visible to providers
        description: '',
        icon: MessageSquare,
        color: ''
      },
      providers_group: {
        label: 'Groupe prestataires',
        description: 'Conversation entre tous les prestataires',
        icon: UsersRound,
        color: 'bg-violet-100 text-violet-800'
      },
      tenant_to_managers: {
        label: '', // Not visible to providers
        description: '',
        icon: MessageSquare,
        color: ''
      },
      provider_to_managers: {
        label: 'Discussion avec les gestionnaires',
        description: 'Votre conversation privée avec les gestionnaires',
        icon: Briefcase,
        color: 'bg-purple-100 text-purple-800'
      }
    }
  },
  admin: {
    // Admin role included for completeness (though unlikely to view interventions)
    visibleThreads: ['group', 'tenants_group', 'providers_group', 'tenant_to_managers', 'provider_to_managers'],
    emptyMessage: 'Aucune conversation disponible.',
    threadConfigs: {
      group: {
        label: 'Discussion générale',
        description: 'Conversation visible par tous les participants',
        icon: Users,
        color: 'bg-blue-100 text-blue-800'
      },
      tenants_group: {
        label: 'Groupe locataires',
        description: 'Conversation entre tous les locataires et les gestionnaires',
        icon: UsersRound,
        color: 'bg-emerald-100 text-emerald-800'
      },
      providers_group: {
        label: 'Groupe prestataires',
        description: 'Conversation entre tous les prestataires et les gestionnaires',
        icon: UsersRound,
        color: 'bg-violet-100 text-violet-800'
      },
      tenant_to_managers: {
        label: 'Locataire',
        description: 'Conversation privée avec ce locataire',
        icon: Shield,
        color: 'bg-green-100 text-green-800'
      },
      provider_to_managers: {
        label: 'Prestataire',
        description: 'Conversation privée avec ce prestataire',
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
  defaultThreadType,
  initialMessage,
  onMessageSent,
  onThreadTypeChange,
  onThreadRead
}: InterventionChatTabProps) {
  // Get role-specific configuration
  const config = roleBasedConfig[userRole]

  // ✅ FIX: Memoize visibleThreads to prevent unstable dependency in useEffect
  // This prevents re-renders from causing the useEffect to fire incorrectly
  const visibleThreads = useMemo(() =>
    threads.filter((thread) =>
      config.visibleThreads.includes(thread.thread_type as ThreadType)
    ),
    [threads, config.visibleThreads]
  )

  // Track the last processed defaultThreadType to avoid re-processing on every render
  const lastProcessedDefaultRef = useRef<string | undefined>(defaultThreadType)

  // Active thread state - pré-sélectionne le thread demandé ou le premier
  const [activeThread, setActiveThread] = useState<Thread | null>(() => {
    if (defaultThreadType) {
      const targetThread = threads.filter((thread) =>
        config.visibleThreads.includes(thread.thread_type as ThreadType)
      ).find(t => t.thread_type === defaultThreadType)
      if (targetThread) return targetThread
    }
    const initialVisibleThreads = threads.filter((thread) =>
      config.visibleThreads.includes(thread.thread_type as ThreadType)
    )
    return initialVisibleThreads.length > 0 ? initialVisibleThreads[0] : null
  })

  // ✅ FIX: Only react to defaultThreadType changes when it actually changes from parent
  // This prevents the issue where clicking ConversationSelector triggers a re-render
  // that causes the useEffect to reset activeThread
  useEffect(() => {
    // Only process if defaultThreadType actually changed from parent
    if (defaultThreadType && defaultThreadType !== lastProcessedDefaultRef.current) {
      const targetThread = visibleThreads.find(t => t.thread_type === defaultThreadType)
      if (targetThread) {
        setActiveThread(targetThread)
      }
      lastProcessedDefaultRef.current = defaultThreadType
    }
  }, [defaultThreadType, visibleThreads])

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

      toast.error(formatErrorMessage(result.error, 'Erreur lors de l\'envoi du message'))
      throw new Error(formatErrorMessage(result.error))
    }

    // Réinitialiser le message initial après envoi
    if (onMessageSent) {
      onMessageSent()
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

  // Handle thread selection from ConversationSelector
  const handleThreadSelect = (thread: Thread) => {
    setActiveThread(thread)
    // Update the ref to prevent useEffect from overwriting this user selection
    lastProcessedDefaultRef.current = thread.thread_type
    // Notify parent about the thread type change for sync
    if (onThreadTypeChange) {
      onThreadTypeChange(thread.thread_type)
    }
  }

  // Main layout: Conversation selector + Chat interface
  // Uses h-full to fill parent container, NO min-h to avoid overflow issues
  return (
    <div className="min-h-[600px] h-full flex flex-col gap-4">
      {/* Conversation selector - Material Design chips */}
      {visibleThreads.length > 1 && (
        <div className="flex-shrink-0">
          <ConversationSelector
            threads={visibleThreads}
            activeThreadId={activeThread?.id || null}
            onThreadSelect={handleThreadSelect}
            userRole={userRole}
          />
        </div>
      )}

      {/* Chat interface - flex-1 fills remaining space, min-h-0 allows shrinking */}
      <div className="flex-1 min-h-0">
        {activeThread ? (
          <ChatInterface
            threadId={activeThread.id}
            currentUserId={currentUserId}
            userRole={userRole}
            initialMessages={initialMessagesByThread}
            initialParticipants={initialParticipantsByThread}
            onSendMessage={handleSendMessage}
            initialMessage={initialMessage}
            onThreadRead={onThreadRead}
          />
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center py-12 h-full">
              <p className="text-muted-foreground">
                Sélectionnez une conversation
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
