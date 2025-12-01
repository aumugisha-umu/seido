'use client'

/**
 * MessageBubble - Bulle de message dans une conversation
 *
 * @example
 * <MessageBubble
 *   message={{ id: '1', content: 'Hello', author: 'Jean', role: 'manager', date: '2025-01-15' }}
 *   isCurrentUser={true}
 * />
 */

import { cn } from '@/lib/utils'
import { Message } from '../types'
import { formatRelativeDate, getInitials } from '../utils/helpers'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { USER_ROLE_COLORS } from '../types'

export interface MessageBubbleProps {
  /** Message à afficher */
  message: Message
  /** Est-ce le message de l'utilisateur courant */
  isCurrentUser?: boolean
  /** Afficher l'avatar */
  showAvatar?: boolean
  /** Afficher l'horodatage */
  showTimestamp?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Bulle de message avec alignement et couleur selon le rôle
 */
export const MessageBubble = ({
  message,
  isCurrentUser = false,
  showAvatar = true,
  showTimestamp = true,
  className
}: MessageBubbleProps) => {
  const colors = USER_ROLE_COLORS[message.role]

  // Classes de couleur de fond selon le rôle et si c'est le message de l'utilisateur
  const getBubbleClasses = () => {
    if (isCurrentUser) {
      switch (message.role) {
        case 'manager':
          return 'bg-blue-600 text-white'
        case 'provider':
          return 'bg-amber-600 text-white'
        case 'tenant':
          return 'bg-emerald-600 text-white'
      }
    }
    return 'bg-slate-100 text-slate-900'
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        isCurrentUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      {showAvatar && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className={cn(colors.avatar, 'text-xs font-medium')}>
            {getInitials(message.author)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Contenu du message */}
      <div
        className={cn(
          'flex flex-col max-w-[70%]',
          isCurrentUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Nom de l'auteur */}
        {!isCurrentUser && (
          <span className="text-xs text-muted-foreground mb-1">
            {message.author}
          </span>
        )}

        {/* Bulle */}
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-sm',
            getBubbleClasses(),
            isCurrentUser ? 'rounded-br-md' : 'rounded-bl-md'
          )}
        >
          {message.content}
        </div>

        {/* Horodatage */}
        {showTimestamp && (
          <span className="text-xs text-muted-foreground mt-1">
            {formatRelativeDate(message.date)}
          </span>
        )}
      </div>
    </div>
  )
}
