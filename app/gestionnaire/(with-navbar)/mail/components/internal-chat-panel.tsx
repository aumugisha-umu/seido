'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, ChevronUp, UserPlus, MessageSquarePlus, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChatInterface } from '@/components/chat/chat-interface'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { StartConversationModal } from './start-conversation-modal'
import { AddParticipantModal } from './add-participant-modal'
import {
  getEmailConversationAction,
  getEmailConversationParticipantsAction
} from '@/app/actions/email-conversation-actions'
import { sendMessageAction } from '@/app/actions/conversation-actions'
import type { Database } from '@/lib/database.types'

interface ThreadWithParticipants {
  id: string
  email_id: string | null
  team_id: string
  thread_type: string
  title: string | null
  message_count: number
  last_message_at: string | null
  created_by: string
  created_at: string
  participants?: Array<{
    user_id: string
    joined_at: string
    user?: {
      id: string
      name: string | null
      email: string | null
      avatar_url: string | null
    }
  }>
}

interface InternalChatPanelProps {
  emailId: string
  teamId: string
  currentUserId: string
  userRole?: Database['public']['Enums']['user_role']
  className?: string
}

// Helper to get initials from name or email
const getInitials = (name: string | null, email: string | null): string => {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  if (email) {
    return email.substring(0, 2).toUpperCase()
  }
  return '?'
}

export const InternalChatPanel = ({
  emailId,
  teamId,
  currentUserId,
  userRole = 'gestionnaire',
  className
}: InternalChatPanelProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [thread, setThread] = useState<ThreadWithParticipants | null>(null)
  const [isLoadingThread, setIsLoadingThread] = useState(true)
  const [showStartModal, setShowStartModal] = useState(false)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [participantIds, setParticipantIds] = useState<string[]>([])

  // Fetch existing conversation on mount and when emailId changes
  const fetchThread = useCallback(async () => {
    if (!emailId) return

    // Reset state when emailId changes to avoid showing stale data
    setThread(null)
    setParticipantIds([])
    setIsLoadingThread(true)

    try {
      const result = await getEmailConversationAction(emailId)
      if (result.success) {
        setThread(result.data)
        if (result.data?.participants) {
          setParticipantIds(result.data.participants.map(p => p.user_id))
        }
      } else {
        // Explicitly set to null on error
        setThread(null)
        console.error('Failed to fetch email conversation:', result.error)
      }
    } catch (error) {
      // Explicitly set to null on exception
      setThread(null)
      console.error('Failed to fetch email conversation:', error)
    } finally {
      setIsLoadingThread(false)
    }
  }, [emailId])

  // Close panel and refetch when emailId changes
  useEffect(() => {
    setIsOpen(false)
    fetchThread()
  }, [fetchThread])

  // Refresh participants
  const refreshParticipants = useCallback(async () => {
    if (!thread?.id) return

    try {
      const result = await getEmailConversationParticipantsAction(thread.id)
      if (result.success && result.data) {
        setParticipantIds(result.data.map(p => p.user_id))
      }
    } catch (error) {
      console.error('Failed to refresh participants:', error)
    }
  }, [thread?.id])

  const handleToggle = () => {
    if (thread) {
      setIsOpen(!isOpen)
    }
  }

  const handleStartConversation = () => {
    setShowStartModal(true)
  }

  const handleConversationCreated = (threadId: string) => {
    // Refresh to get the new thread
    fetchThread()
    setIsOpen(true)
  }

  const handleAddParticipants = () => {
    setShowAddParticipantModal(true)
  }

  const handleParticipantsAdded = () => {
    // Refresh the full thread to get updated participant details (names, avatars)
    fetchThread()
  }

  // Handler for sending messages via ChatInterface
  const handleSendMessage = async (content: string, attachments?: string[]) => {
    if (!thread?.id) return

    const result = await sendMessageAction(thread.id, content, attachments || [])
    if (!result.success) {
      // Ensure error is always a string (defensive against Supabase error objects)
      const errorMessage = typeof result.error === 'string'
        ? result.error
        : (result.error as { message?: string })?.message || 'Erreur lors de l\'envoi'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Calculate unread count (simplified for now)
  const unreadCount = 0 // TODO: Implement real unread count based on last_read_message_id

  // Loading state
  if (isLoadingThread) {
    return (
      <div className={cn(
        'sticky bottom-0 z-20 bg-card border-t h-14 flex items-center justify-center',
        className
      )}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No conversation exists - show "Start Conversation" button
  if (!thread) {
    return (
      <>
        <div className={cn(
          'sticky bottom-0 z-20 bg-card border-t h-14',
          className
        )}>
          <button
            onClick={handleStartConversation}
            className="w-full h-full px-6 flex items-center justify-between hover:bg-muted transition-colors"
            aria-label="Démarrer une discussion interne"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground">Discussion interne de l'équipe</span>
            </div>
            <div className="inline-flex items-center gap-2 h-8 px-3 text-sm font-medium border rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
              <MessageSquarePlus className="h-4 w-4" />
              Démarrer
            </div>
          </button>
        </div>

        <StartConversationModal
          open={showStartModal}
          onOpenChange={setShowStartModal}
          emailId={emailId}
          teamId={teamId}
          currentUserId={currentUserId}
          onConversationCreated={handleConversationCreated}
        />
      </>
    )
  }

  // Conversation exists - show chat with toggle
  return (
    <>
      <div
        className={cn(
          'sticky bottom-0 z-20 bg-card border-t transition-all duration-300 ease-in-out',
          isOpen
            ? 'h-[400px] shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.15)] dark:shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.3)]'
            : 'h-14 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]',
          className
        )}
      >
        {/* Toggle Bar */}
        <div className={cn(
          'w-full h-14 px-6 flex items-center justify-between',
          isOpen && 'border-b'
        )}>
          <button
            onClick={handleToggle}
            className="flex items-center gap-3 flex-1 h-full hover:opacity-80 transition-opacity"
            aria-label={isOpen ? 'Fermer la discussion interne' : 'Ouvrir la discussion interne'}
            aria-expanded={isOpen}
          >
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">Discussion interne de l'équipe</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
            {thread.message_count > 0 && (
              <Badge variant="outline" className="text-xs">
                {thread.message_count} message{thread.message_count > 1 ? 's' : ''}
              </Badge>
            )}
          </button>

          <div className="flex items-center gap-3">
            {/* Participant avatars */}
            {thread.participants && thread.participants.length > 0 && (
              <TooltipProvider>
                <div className="flex items-center -space-x-2">
                  {thread.participants.slice(0, 3).map((participant) => (
                    <Tooltip key={participant.user_id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7 border-2 border-background cursor-default hover:z-10 transition-transform hover:scale-110">
                          <AvatarImage src={participant.user?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {getInitials(participant.user?.name || null, participant.user?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs font-medium">{participant.user?.name || participant.user?.email || 'Participant'}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {thread.participants.length > 3 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7 border-2 border-background cursor-default">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                            +{thread.participants.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="flex flex-col gap-1">
                          {thread.participants.slice(3).map((participant) => (
                            <p key={participant.user_id} className="text-xs">
                              {participant.user?.name || participant.user?.email || 'Participant'}
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            )}

            {/* Add participant button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddParticipants}
              className="h-8 w-8"
              title="Ajouter un membre"
            >
              <UserPlus className="h-4 w-4" />
            </Button>

            {/* Toggle chevron */}
            <button
              onClick={handleToggle}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <ChevronUp
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform duration-300',
                  !isOpen && 'rotate-180'
                )}
              />
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        {isOpen && (
          <div className="h-[calc(100%-56px)] overflow-hidden">
            <ChatInterface
              threadId={thread.id}
              currentUserId={currentUserId}
              userRole={userRole}
              onSendMessage={handleSendMessage}
              currentParticipantIds={participantIds}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      <AddParticipantModal
        open={showAddParticipantModal}
        onOpenChange={setShowAddParticipantModal}
        threadId={thread.id}
        teamId={teamId}
        currentParticipantIds={participantIds}
        onParticipantsAdded={handleParticipantsAdded}
      />
    </>
  )
}
