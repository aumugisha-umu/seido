'use client'

/**
 * Chat Tab Component
 * Manages conversation threads for interventions
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InterventionChat } from '@/components/interventions/intervention-chat'
import { MessageSquare, Users, UserCheck, Briefcase } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Thread = Database['public']['Tables']['conversation_threads']['Row']

interface ChatTabProps {
  interventionId: string
  threads: Thread[]
}

const threadConfig = {
  'group': {
    label: 'Discussion générale',
    description: 'Conversation visible par tous les participants',
    icon: Users,
    color: 'bg-blue-100 text-blue-800'
  },
  'tenant_to_managers': {
    label: 'Locataire ↔ Gestionnaires',
    description: 'Conversation entre le locataire et les gestionnaires',
    icon: UserCheck,
    color: 'bg-green-100 text-green-800'
  },
  'provider_to_managers': {
    label: 'Prestataire ↔ Gestionnaires',
    description: 'Conversation entre le prestataire et les gestionnaires',
    icon: Briefcase,
    color: 'bg-purple-100 text-purple-800'
  }
}

export function ChatTab({ interventionId, threads }: ChatTabProps) {
  const [activeThread, setActiveThread] = useState<Thread | null>(
    threads.length > 0 ? threads[0] : null
  )

  if (threads.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">
            Aucune conversation
          </p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Les conversations seront créées automatiquement lorsque des participants seront assignés à l'intervention.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Thread selector */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1">
              {threads.map((thread) => {
                const config = threadConfig[thread.thread_type as keyof typeof threadConfig]
                const Icon = config?.icon || MessageSquare
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
                      <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {config?.label || thread.title || 'Conversation'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {config?.description}
                        </p>
                        {thread.message_count && thread.message_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {thread.message_count} messages
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat interface */}
      <div className="lg:col-span-3">
        {activeThread ? (
          <InterventionChat
            threadId={activeThread.id}
            threadType={activeThread.thread_type}
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