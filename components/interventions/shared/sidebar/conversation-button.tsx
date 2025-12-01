'use client'

/**
 * ConversationButton - Bouton pour accéder à une conversation
 *
 * @example
 * <ConversationButton type="group" isActive={true} onClick={handleClick} />
 * <ConversationButton type="individual" participantName="Jean Dupont" onClick={handleClick} />
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users, ArrowRight } from 'lucide-react'

export interface ConversationButtonProps {
  /** Type de conversation */
  type: 'group' | 'individual'
  /** Nom du participant (pour type individual) */
  participantName?: string
  /** Est la conversation active */
  isActive: boolean
  /** Callback au clic */
  onClick: () => void
  /** Nombre de messages non lus */
  unreadCount?: number
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Bouton stylisé pour accéder aux conversations
 */
export const ConversationButton = ({
  type,
  participantName,
  isActive,
  onClick,
  unreadCount = 0,
  className
}: ConversationButtonProps) => {
  const isGroup = type === 'group'

  return (
    <Button
      variant="outline"
      className={cn(
        'w-full justify-start gap-3 h-auto py-3 px-4 transition-all',
        isActive
          ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
          : 'hover:bg-slate-50',
        className
      )}
      onClick={onClick}
    >
      {/* Icône */}
      <div
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0',
          isActive ? 'bg-blue-100' : 'bg-slate-100'
        )}
      >
        {isGroup ? (
          <Users className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-500')} />
        ) : (
          <MessageSquare className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-500')} />
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">
          {isGroup ? 'Conversation de groupe' : participantName || 'Conversation'}
        </p>
        <p className="text-xs text-muted-foreground">
          {isGroup ? 'Tous les participants' : 'Discussion privée'}
        </p>
      </div>

      {/* Badge de messages non lus */}
      {unreadCount > 0 && (
        <Badge
          variant="default"
          className="bg-blue-600 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}

      {/* Indicateur actif */}
      {isActive && (
        <ArrowRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
      )}
    </Button>
  )
}

/**
 * Groupe de boutons de conversation pour la sidebar
 */
export interface ConversationButtonsGroupProps {
  /** Conversation active */
  activeConversation: string | 'group'
  /** Callback au clic sur conversation de groupe */
  onGroupClick: () => void
  /** Conversations individuelles disponibles */
  individualConversations?: Array<{
    id: string
    participantName: string
    unreadCount?: number
  }>
  /** Callback au clic sur conversation individuelle */
  onIndividualClick?: (conversationId: string) => void
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Groupe de boutons de conversation (groupe + individuels)
 */
export const ConversationButtonsGroup = ({
  activeConversation,
  onGroupClick,
  individualConversations = [],
  onIndividualClick,
  className
}: ConversationButtonsGroupProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Conversations</span>
      </div>

      {/* Conversation de groupe */}
      <ConversationButton
        type="group"
        isActive={activeConversation === 'group'}
        onClick={onGroupClick}
      />

      {/* Conversations individuelles */}
      {individualConversations.length > 0 && onIndividualClick && (
        <div className="space-y-1.5 mt-2">
          <p className="text-xs text-muted-foreground px-1">Conversations privées</p>
          {individualConversations.map((conv) => (
            <ConversationButton
              key={conv.id}
              type="individual"
              participantName={conv.participantName}
              isActive={activeConversation === conv.id}
              onClick={() => onIndividualClick(conv.id)}
              unreadCount={conv.unreadCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
