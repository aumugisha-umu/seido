'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { MailboxEmail, ConversationGroup } from './types'
import { EmailListItem } from './email-list-item'

interface ConversationGroupProps {
  group: ConversationGroup
  selectedEmailId?: string
  onEmailSelect: (emailId: string) => void
  onConversationSelect: (conversationId: string) => void
}

export function ConversationGroupComponent({
  group,
  selectedEmailId,
  onEmailSelect,
  onConversationSelect
}: ConversationGroupProps) {
  // Auto-expand if parent or any child is selected
  const isParentSelected = selectedEmailId === group.parent.id
  const isChildSelected = group.children.some(e => e.id === selectedEmailId)
  const [isExpanded, setIsExpanded] = useState(isParentSelected || isChildSelected)

  // Auto-expand when parent or child is selected
  useEffect(() => {
    if (isParentSelected || isChildSelected) {
      setIsExpanded(true)
    }
  }, [isParentSelected, isChildSelected])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  const handleParentClick = () => {
    // Expand when clicking on conversation
    if (!isExpanded) {
      setIsExpanded(true)
    }
    onConversationSelect(group.conversationId)
  }

  const hasUnreadChildren = group.children.some(e => !e.is_read)

  return (
    <div className="border-b">
      {/* Parent conversation row */}
      <div
        className={`
          p-3 px-4 cursor-pointer transition-colors
          hover:bg-muted/50
          ${isParentSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
          ${!group.parent.is_read || hasUnreadChildren ? 'bg-blue-50/30' : ''}
        `}
        onClick={handleParentClick}
        role="button"
        aria-label={`Conversation: ${group.parent.subject}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleParentClick()
          }
        }}
      >
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggle()
            }}
            className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={isExpanded ? 'Collapse conversation' : 'Expand conversation'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className={`text-sm truncate ${!group.parent.is_read ? 'font-semibold' : ''}`}>
                {group.parent.sender_name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(group.parent.received_at).toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className={`text-sm ${group.parent.is_read ? 'text-muted-foreground' : 'font-medium'} truncate mb-1`}>
              {group.parent.subject}
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              {group.children.length + 1} message{group.children.length > 0 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Children emails (when expanded) */}
      {isExpanded && group.children.length > 0 && (
        <div className="bg-muted/20 border-t">
          {group.children.map((child) => (
            <div 
              key={child.id} 
              className={`
                pl-12 pr-4 py-2 cursor-pointer transition-colors
                hover:bg-muted/50
                ${selectedEmailId === child.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
                ${!child.is_read ? 'bg-blue-50/30' : ''}
              `}
              onClick={() => onEmailSelect(child.id)}
              role="button"
              aria-label={`Message from ${child.sender_name}: ${child.subject}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onEmailSelect(child.id)
                }
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={`text-xs truncate ${!child.is_read ? 'font-semibold' : ''}`}>
                  {child.sender_name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(child.received_at).toLocaleDateString('fr-FR', { 
                    day: '2-digit', 
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className={`text-xs ${child.is_read ? 'text-muted-foreground' : ''} truncate line-clamp-1`}>
                {child.snippet || child.subject}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

