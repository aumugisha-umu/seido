'use client'

/**
 * Chat Interface Component
 * Real-time chat with optimistic updates and typing indicators
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Send,
  MoreVertical,
  Check,
  CheckCheck,
  AlertCircle,
  Users,
  Lock,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'

// Custom Components
import { ChatFileAttachment } from './chat-file-attachment'
import { AddParticipantButton } from './add-participant-button'
import { MessageAttachments } from './message-attachments'

// Hooks
import { useChatUpload } from '@/hooks/use-chat-upload'

// Utils
import { getConversationDisplayInfo } from '@/lib/utils/conversation-display'

// Types
import type { Database } from '@/lib/database.types'

type Message = Database['public']['Tables']['conversation_messages']['Row'] & {
  user?: {
    id: string
    name: string
    avatar_url?: string
    role: Database['public']['Enums']['user_role']
  }
  attachments?: Array<{
    id: string
    filename: string
    original_filename: string
    mime_type: string
    file_size: number
    storage_path: string
    signedUrl?: string
    document_type?: string
  }>
}

type Thread = Database['public']['Tables']['conversation_threads']['Row']
type ThreadType = Database['public']['Enums']['conversation_thread_type']

interface TeamMember {
  id: string
  name: string
  email: string
  role: Database['public']['Enums']['user_role']
  avatar_url?: string
}

interface Participant {
  user_id: string
  joined_at: string
  last_read_message_id?: string
  user?: {
    id: string
    name: string
    first_name?: string
    last_name?: string
    email: string
    role: Database['public']['Enums']['user_role']
    avatar_url?: string
  }
}

interface ChatInterfaceProps {
  threadId: string
  currentUserId: string
  userRole: Database['public']['Enums']['user_role']
  initialMessages?: Record<string, Message[]>
  initialParticipants?: Record<string, Participant[]>
  onSendMessage?: (content: string, attachments?: string[]) => Promise<void>
  teamMembers?: TeamMember[]
  currentParticipantIds?: string[]
  className?: string
}

// Message bubble component
function MessageBubble({
  message,
  isOwn,
  showAvatar = true
}: {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
}) {
  const formatTime = (date: string) => {
    try {
      return format(new Date(date), 'HH:mm', { locale: fr })
    } catch {
      return ''
    }
  }

  return (
    <div
      className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
        showAvatar ? 'items-end' : 'items-start'
      }`}
    >
      {showAvatar && message.user && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.user.avatar_url} />
          <AvatarFallback>
            {message.user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex flex-col gap-1 max-w-[70%] ${
          isOwn ? 'items-end' : 'items-start'
        }`}
      >
        {!isOwn && message.user && (
          <span className="text-xs text-muted-foreground ml-2">
            {message.user.name}
          </span>
        )}

        <div
          className={`px-3 py-2 rounded-lg ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Display attachments if present */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`mt-2 max-w-full ${isOwn ? 'self-end' : 'self-start'}`}>
            <MessageAttachments attachments={message.attachments} />
          </div>
        )}

        <div className="flex items-center gap-1 px-2">
          <span className="text-xs text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
          {isOwn && (
            <CheckCheck className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  )
}

// Thread type badge
function ThreadTypeBadge({ type }: { type: ThreadType }) {
  const config = {
    group: {
      label: 'Groupe',
      icon: Users,
      color: 'bg-blue-500'
    },
    tenant_to_managers: {
      label: 'Locataire → Gestionnaires',
      icon: Lock,
      color: 'bg-green-500'
    },
    provider_to_managers: {
      label: 'Prestataire → Gestionnaires',
      icon: Lock,
      color: 'bg-purple-500'
    }
  }[type]

  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1">
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-xs font-semibold">Type de conversation</p>
            {type === 'group' && (
              <p className="text-xs">Tous les participants peuvent voir les messages</p>
            )}
            {type === 'tenant_to_managers' && (
              <p className="text-xs">Conversation privée entre le locataire et les gestionnaires</p>
            )}
            {type === 'provider_to_managers' && (
              <p className="text-xs">Conversation privée entre le prestataire et les gestionnaires</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Manager transparency indicator
function TransparencyBadge({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1">
            <Eye className="w-3 h-3" />
            Gestionnaire présent
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Les gestionnaires peuvent voir cette conversation privée
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Loading skeleton for messages
function MessagesLoading() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className={`space-y-1 ${i % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col`}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-48" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Participants display component
function ParticipantsDisplay({ participants }: { participants: Participant[] }) {
  if (participants.length === 0) {
    return null
  }

  // Helper to get user initials
  const getInitials = (participant: Participant) => {
    const user = participant.user
    if (!user) return '?'

    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }

    if (user.name) {
      const parts = user.name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      }
      return user.name.substring(0, 2).toUpperCase()
    }

    return user.email.substring(0, 2).toUpperCase()
  }

  // Helper to get user display name
  const getDisplayName = (participant: Participant) => {
    const user = participant.user
    if (!user) return 'Utilisateur inconnu'

    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }

    return user.name || user.email
  }

  // Helper to get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'gestionnaire':
        return 'bg-blue-100 text-blue-700'
      case 'locataire':
        return 'bg-green-100 text-green-700'
      case 'prestataire':
        return 'bg-purple-100 text-purple-700'
      case 'admin':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Show max 3 avatars, then "+N" for remaining
  const visibleParticipants = participants.slice(0, 3)
  const remainingCount = participants.length - 3

  return (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-muted-foreground" />
      <TooltipProvider>
        <div className="flex items-center -space-x-2">
          {visibleParticipants.map((participant) => (
            <Tooltip key={participant.user_id}>
              <TooltipTrigger asChild>
                <Avatar className="w-8 h-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110">
                  <AvatarImage src={participant.user?.avatar_url} />
                  <AvatarFallback className={getRoleBadgeColor(participant.user?.role || '')}>
                    {getInitials(participant)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{getDisplayName(participant)}</p>
                  <p className="text-xs text-muted-foreground capitalize">{participant.user?.role}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium cursor-pointer hover:z-10 transition-transform hover:scale-110">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  {participants.slice(3).map((participant) => (
                    <p key={participant.user_id} className="text-xs">
                      {getDisplayName(participant)}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
      <span className="text-sm text-muted-foreground">
        {participants.length} participant{participants.length > 1 ? 's' : ''}
      </span>
    </div>
  )
}

export function ChatInterface({
  threadId,
  currentUserId,
  userRole,
  initialMessages,
  initialParticipants,
  onSendMessage,
  teamMembers = [],
  currentParticipantIds = [],
  className = ''
}: ChatInterfaceProps) {
  // Initialize with server-fetched data (Phase 2 optimization)
  const [messages, setMessages] = useState<Message[]>(initialMessages?.[threadId] || [])
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants?.[threadId] || [])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(!initialMessages?.[threadId] || !initialParticipants?.[threadId])
  const [isSending, setIsSending] = useState(false)
  const [thread, setThread] = useState<Thread | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // File upload hook
  const chatUpload = useChatUpload({
    threadId,
    onUploadComplete: (documentIds) => {
      toast.success(`${documentIds.length} fichier(s) uploadé(s)`)
    },
    onUploadError: (error) => {
      toast.error(error)
    }
  })

  // Load real data from API (Phase 2: Skip if server-fetched data available)
  useEffect(() => {
    const loadData = async () => {
      // ✅ Phase 2 optimization: Skip fetch if initial data provided
      if (initialMessages?.[threadId] && initialParticipants?.[threadId]) {
        // Update state with server-fetched data for this thread
        setMessages(initialMessages[threadId])
        setParticipants(initialParticipants[threadId])
        setIsLoading(false)
        // Still need to fetch thread details for metadata
        try {
          const { getThreadAction } = await import('@/app/actions/conversation-actions')
          const threadResult = await getThreadAction(threadId)
          if (threadResult.success && threadResult.data) {
            setThread(threadResult.data)
          }
        } catch (error) {
          console.error('Error loading thread details:', error)
        }
        return
      }

      // Fallback: Fetch from API if no initial data
      setIsLoading(true)

      try {
        // Import actions dynamically to avoid circular dependencies
        const { getThreadAction, getMessagesAction, getThreadParticipantsAction } = await import('@/app/actions/conversation-actions')

        // Load thread details, messages, and participants in parallel (3x faster)
        const [threadResult, messagesResult, participantsResult] = await Promise.all([
          getThreadAction(threadId),
          getMessagesAction(threadId),
          getThreadParticipantsAction(threadId)
        ])

        // Handle thread result
        if (threadResult.success && threadResult.data) {
          setThread(threadResult.data)
        } else {
          toast.error(threadResult.error || 'Erreur lors du chargement de la conversation')
        }

        // Handle messages result
        if (messagesResult.success && messagesResult.data) {
          setMessages(messagesResult.data)
        } else {
          toast.error(messagesResult.error || 'Erreur lors du chargement des messages')
        }

        // Handle participants result
        if (participantsResult.success && participantsResult.data) {
          setParticipants(participantsResult.data)
        } else {
          console.error('Error loading participants:', participantsResult.error)
        }
      } catch (error) {
        console.error('Error loading chat data:', error)
        toast.error('Erreur lors du chargement des données')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [threadId, initialMessages, initialParticipants])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Handle sending message
  const handleSend = async () => {
    // Require either message content or files
    if (!newMessage.trim() && chatUpload.files.length === 0) return

    const messageContent = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    try {
      // Upload files first if any
      let documentIds: string[] = []
      if (chatUpload.files.length > 0) {
        toast.info('Upload des fichiers en cours...')
        documentIds = await chatUpload.uploadFiles()
        console.log('📎 [CHAT-INTERFACE] documentIds after upload:', documentIds)

        // If no files were successfully uploaded and message is empty, abort
        if (documentIds.length === 0 && !messageContent) {
          toast.error('Aucun fichier n\'a pu être uploadé')
          setIsSending(false)
          setNewMessage(messageContent)
          return
        }
      }

      // Optimistic update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        thread_id: threadId,
        user_id: currentUserId,
        content: messageContent || '📎 Fichier(s) partagé(s)',
        created_at: new Date().toISOString(),
        metadata: documentIds.length > 0 ? { attachments: documentIds } : null,
        deleted_at: null,
        deleted_by: null,
        user: {
          id: currentUserId,
          name: 'Vous',
          role: userRole,
          avatar_url: undefined
        }
      }

      setMessages(prev => [...prev, optimisticMessage])

      // Send message with document IDs
      console.log('📤 [CHAT-INTERFACE] Calling onSendMessage with:', {
        content: messageContent || '📎 Fichier(s) partagé(s)',
        documentIds,
        documentIdsLength: documentIds.length
      })

      if (onSendMessage) {
        await onSendMessage(messageContent || '📎 Fichier(s) partagé(s)', documentIds)
      } else {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Reload messages to display attachments
      const { getMessagesAction } = await import('@/app/actions/conversation-actions')
      const messagesResult = await getMessagesAction(threadId)
      if (messagesResult.success && messagesResult.data) {
        setMessages(messagesResult.data)
      }

      // Clear uploaded files after successful send
      chatUpload.clearFiles()

      toast.success('Message envoyé')
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du message')
      // Restore message on error
      setNewMessage(messageContent)
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Check if manager can see private thread
  const isManagerTransparent = thread &&
    thread.thread_type !== 'group' &&
    userRole === 'gestionnaire'

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2 flex-1">
            {(() => {
              const displayInfo = thread
                ? getConversationDisplayInfo(thread.thread_type, userRole, participants)
                : { title: 'Conversation' }

              // Get specific participant for non-group threads
              const getTargetParticipant = () => {
                if (!thread) return null
                if (thread.thread_type === 'tenant_to_managers') {
                  return participants.find(p => p.user.role === 'locataire')
                }
                if (thread.thread_type === 'provider_to_managers') {
                  return participants.find(p => p.user.role === 'prestataire')
                }
                return null
              }

              const targetParticipant = getTargetParticipant()

              return (
                <>
                  <CardTitle className="text-lg">
                    {displayInfo.title}
                  </CardTitle>

                  {/* For group threads: show all participants */}
                  {thread?.thread_type === 'group' && !isLoading && participants.length > 0 && (
                    <ParticipantsDisplay participants={participants} />
                  )}

                  {/* For tenant/provider threads: show avatar + name */}
                  {thread?.thread_type !== 'group' && displayInfo.subtitle && targetParticipant && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={targetParticipant.user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {targetParticipant.user.first_name?.[0]}{targetParticipant.user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-muted-foreground">
                        {displayInfo.subtitle}
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
          <div className="flex items-center gap-2">
            <AddParticipantButton
              threadId={threadId}
              teamMembers={teamMembers}
              currentParticipantIds={currentParticipantIds}
              userRole={userRole}
            />
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          {isLoading ? (
            <MessagesLoading />
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Aucun message pour le moment.
                <br />
                Commencez la conversation !
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {messages.map((message, index) => {
                const isOwn = message.user_id === currentUserId
                const showAvatar = index === 0 ||
                  messages[index - 1].user_id !== message.user_id

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                  />
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <Separator />

      <CardContent className="p-4">
        {/* File preview area */}
        {chatUpload.files.length > 0 && (
          <div className="mb-3">
            <ChatFileAttachment
              files={chatUpload.files}
              isUploading={chatUpload.isUploading}
              onAddFiles={chatUpload.addFiles}
              onRemoveFile={chatUpload.removeFile}
            />
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2">
          <ChatFileAttachment
            files={[]}
            isUploading={chatUpload.isUploading}
            onAddFiles={chatUpload.addFiles}
            onRemoveFile={chatUpload.removeFile}
            className="contents"
          />
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            disabled={isSending || chatUpload.isUploading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={(!newMessage.trim() && chatUpload.files.length === 0) || isSending || chatUpload.isUploading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}