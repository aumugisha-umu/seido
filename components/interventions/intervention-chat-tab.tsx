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

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users, UserCheck, Shield, Briefcase } from 'lucide-react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { sendMessageAction } from '@/app/actions/conversation-actions'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'
import { truncateMessage, formatRelativeTime } from '@/lib/utils/chat-helpers'

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
  currentUserId: string
  userRole: UserRole
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
  currentUserId,
  userRole
}: InterventionChatTabProps) {
  // Get role-specific configuration
  const config = roleBasedConfig[userRole]

  // Filter threads based on user role
  const visibleThreads = threads.filter((thread) =>
    config.visibleThreads.includes(thread.thread_type as ThreadType)
  )

  // Active thread state
  const [activeThread, setActiveThread] = useState<Thread | null>(
    visibleThreads.length > 0 ? visibleThreads[0] : null
  )

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

  // Main layout: 2-column grid (thread selector + chat interface)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* LEFT COLUMN: Thread selector sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {visibleThreads.map((thread) => {
                const threadConfig = config.threadConfigs[thread.thread_type as ThreadType]
                const Icon = threadConfig?.icon || MessageSquare
                const isActive = activeThread?.id === thread.id

                return (
                  <button
                    key={thread.id}
                    onClick={() => setActiveThread(thread)}
                    className={`
                      w-full text-left px-4 py-3 hover:bg-accent transition-colors
                      ${isActive ? 'bg-accent border-l-2 border-primary' : ''}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />

                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Header: Titre + Timestamp */}
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {threadConfig?.label || thread.title || 'Conversation'}
                          </p>
                          {thread.last_message?.[0] && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatRelativeTime(thread.last_message[0].created_at)}
                            </span>
                          )}
                        </div>

                        {/* Preview: Auteur + Message + Badge */}
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {thread.last_message?.[0] ? (
                              <>
                                <span className="font-medium">
                                  {thread.last_message[0].user?.name || 'Utilisateur'}
                                </span>
                                {': '}
                                {truncateMessage(thread.last_message[0].content)}
                              </>
                            ) : (
                              <span className="italic">Aucun message</span>
                            )}
                          </p>

                          {/* Badge non lu */}
                          {thread.unread_count && thread.unread_count > 0 && (
                            <Badge variant="destructive" className="text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-2 flex-shrink-0">
                              {thread.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Chat interface */}
      <div className="lg:col-span-3">
        {activeThread ? (
          <ChatInterface
            threadId={activeThread.id}
            currentUserId={currentUserId}
            userRole={userRole}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                Sélectionnez une conversation pour commencer
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
