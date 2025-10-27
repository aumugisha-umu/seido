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
  Paperclip,
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

// Hooks
import { useChatUpload } from '@/hooks/use-chat-upload'

// Types
import type { Database } from '@/lib/database.types'

type Message = Database['public']['Tables']['conversation_messages']['Row'] & {
  user?: {
    id: string
    name: string
    avatar_url?: string
    role: Database['public']['Enums']['user_role']
  }
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

interface ChatInterfaceProps {
  threadId: string
  currentUserId: string
  userRole: Database['public']['Enums']['user_role']
  onSendMessage?: (content: string) => Promise<void>
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

export function ChatInterface({
  threadId,
  currentUserId,
  userRole,
  onSendMessage,
  teamMembers = [],
  currentParticipantIds = [],
  className = ''
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
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

  // Mock data for demo - in real app, load from API
  useEffect(() => {
    const loadMockData = async () => {
      setIsLoading(true)

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock thread
      setThread({
        id: threadId,
        intervention_id: 'mock-intervention',
        thread_type: 'group',
        title: 'Discussion intervention #2024-001',
        team_id: 'mock-team',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 3,
        last_message_at: new Date().toISOString()
      })

      // Mock messages
      const mockMessages: Message[] = [
        {
          id: '1',
          thread_id: threadId,
          user_id: 'user-1',
          content: 'Bonjour, j\'ai un problème de fuite dans ma salle de bain.',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          metadata: null,
          deleted_at: null,
          deleted_by: null,
          user: {
            id: 'user-1',
            name: 'Marie Dupont',
            role: 'locataire',
            avatar_url: undefined
          }
        },
        {
          id: '2',
          thread_id: threadId,
          user_id: 'user-2',
          content: 'Bonjour Marie, nous allons envoyer un plombier rapidement. Pouvez-vous nous envoyer une photo ?',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          metadata: null,
          deleted_at: null,
          deleted_by: null,
          user: {
            id: 'user-2',
            name: 'Jean Martin',
            role: 'gestionnaire',
            avatar_url: undefined
          }
        },
        {
          id: '3',
          thread_id: threadId,
          user_id: 'user-1',
          content: 'Bien sûr, je vous envoie ça tout de suite.',
          created_at: new Date(Date.now() - 900000).toISOString(),
          metadata: null,
          deleted_at: null,
          deleted_by: null,
          user: {
            id: 'user-1',
            name: 'Marie Dupont',
            role: 'locataire',
            avatar_url: undefined
          }
        }
      ]

      setMessages(mockMessages)
      setIsLoading(false)
    }

    loadMockData()
  }, [threadId])

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
      if (onSendMessage) {
        await onSendMessage(messageContent || '📎 Fichier(s) partagé(s)')
      } else {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
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
          <CardTitle className="text-lg">
            {thread?.title || 'Conversation'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {thread && <ThreadTypeBadge type={thread.thread_type} />}
            {isManagerTransparent && <TransparencyBadge visible={true} />}
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