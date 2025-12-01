'use client'

/**
 * ConversationCard - Card de conversation avec messages
 *
 * @example
 * <ConversationCard
 *   messages={messages}
 *   currentUserId="user-123"
 *   currentUserRole="manager"
 *   conversationType="group"
 *   onSendMessage={handleSend}
 * />
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, Send, Users, User } from 'lucide-react'
import { ConversationCardProps } from '../types'
import { MessageBubble } from '../atoms'
import { getRoleButtonClasses } from '../utils/helpers'

/**
 * Card de conversation
 */
export const ConversationCard = ({
  messages = [],
  currentUserId,
  currentUserRole,
  conversationType = 'group',
  participantName,
  onSendMessage,
  isLoading = false,
  className
}: ConversationCardProps) => {
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || !onSendMessage) return

    setIsSending(true)
    try {
      await onSendMessage(newMessage.trim())
      setNewMessage('')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isGroup = conversationType === 'group'

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          {isGroup ? (
            <>
              <Users className="h-4 w-4 text-muted-foreground" />
              Conversation de groupe
            </>
          ) : (
            <>
              <User className="h-4 w-4 text-muted-foreground" />
              {participantName || 'Conversation'}
            </>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Zone des messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[400px]">
          {messages.length > 0 ? (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isCurrentUser={message.isMe || message.author === currentUserId}
                  showAvatar={true}
                  showTimestamp={true}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <MessageSquare className="h-10 w-10 mb-2 text-slate-300" />
              <p className="text-sm">Aucun message</p>
              <p className="text-xs">Démarrez la conversation !</p>
            </div>
          )}
        </div>

        {/* Zone de saisie */}
        {onSendMessage && (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 pt-3 border-t"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez votre message..."
              disabled={isLoading || isSending}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newMessage.trim() || isLoading || isSending}
              className={cn(getRoleButtonClasses(currentUserRole))}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Version minimale de la conversation (juste les derniers messages)
 */
export interface ConversationPreviewProps {
  messages: ConversationCardProps['messages']
  currentUserId: string
  maxMessages?: number
  onViewAll?: () => void
  className?: string
}

export const ConversationPreview = ({
  messages = [],
  currentUserId,
  maxMessages = 3,
  onViewAll,
  className
}: ConversationPreviewProps) => {
  const recentMessages = messages.slice(-maxMessages)

  return (
    <div className={cn('space-y-3', className)}>
      {recentMessages.length > 0 ? (
        <>
          {recentMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.isMe || message.author === currentUserId}
              showAvatar={false}
              showTimestamp={false}
            />
          ))}

          {messages.length > maxMessages && onViewAll && (
            <Button
              variant="link"
              size="sm"
              onClick={onViewAll}
              className="w-full"
            >
              Voir tous les messages ({messages.length})
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun message
        </p>
      )}
    </div>
  )
}
