'use client'

import { useState } from 'react'
import { MessageSquare, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ChatInterface } from '@/components/chat/chat-interface'
import { cn } from '@/lib/utils'

interface InternalChatPanelProps {
  emailId: string
  teamId?: string
  currentUserId: string
  userRole?: string
  className?: string
}

export const InternalChatPanel = ({
  emailId,
  teamId,
  currentUserId,
  userRole = 'gestionnaire',
  className
}: InternalChatPanelProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount] = useState(0) // TODO: Implement real unread count

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 bg-card border-t transition-all duration-300 ease-in-out',
        isOpen
          ? 'h-chat-open shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.15)] dark:shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.3)]'
          : 'h-chat-closed shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]',
        className
      )}
    >
      {/* Toggle Bar */}
      <button
        onClick={handleToggle}
        className={cn(
          'w-full h-14 px-6 flex items-center justify-between hover:bg-muted transition-colors',
          isOpen && 'border-b'
        )}
        aria-label={isOpen ? 'Fermer la discussion interne' : 'Ouvrir la discussion interne'}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium text-foreground">Discussion interne de l'equipe</span>
          <Badge variant="secondary" className="text-xs">
            Privé
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <ChevronUp
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform duration-300',
            !isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Chat Interface */}
      {isOpen && (
        <div className="h-[calc(100%-56px)] overflow-hidden">
          <div className="h-full p-4">
            <div className="h-full border rounded-lg bg-muted/50 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">Le chat interne sera integre ici</p>
                <p className="text-xs">(Reutilise le composant ChatInterface existant)</p>
                <p className="text-xs mt-2 text-muted-foreground/70">
                  ID du fil : email-{emailId}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

