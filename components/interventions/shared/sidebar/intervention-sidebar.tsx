'use client'

/**
 * InterventionSidebar - Sidebar complète pour la prévisualisation d'intervention
 * Compose: ParticipantsList + ProgressionTimeline + ConversationButtons
 *
 * @example
 * <InterventionSidebar
 *   participants={{ managers: [...], providers: [...], tenants: [...] }}
 *   currentUserRole="manager"
 *   currentStatus="planifiee"
 *   onConversationClick={handleConversationClick}
 * />
 */

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { InterventionSidebarProps } from '../types'
import { ParticipantsList } from './participants-list'
import { ProgressionTimeline } from './progression-timeline'
import { ConversationButton, ConversationButtonsGroup } from './conversation-button'
import { permissions } from '../utils'

/**
 * Sidebar complète pour la prévisualisation d'intervention
 */
export const InterventionSidebar = ({
  participants,
  currentUserRole,
  currentStatus,
  activeConversation = 'group',
  onConversationClick,
  className
}: InterventionSidebarProps) => {
  // Détermine si les conversations individuelles sont disponibles
  const canStartIndividualConversations =
    permissions.canStartIndividualConversation(currentUserRole)

  // Génère la liste des conversations individuelles possibles (pour manager)
  const individualConversations = canStartIndividualConversations
    ? [
        ...participants.providers.map((p) => ({
          id: p.id,
          participantName: p.name,
          unreadCount: 0 // À connecter avec les vraies données
        })),
        ...participants.tenants.map((p) => ({
          id: p.id,
          participantName: p.name,
          unreadCount: 0
        }))
      ]
    : []

  const handleGroupClick = () => {
    onConversationClick?.('group')
  }

  const handleIndividualClick = (conversationId: string) => {
    onConversationClick?.(conversationId)
  }

  return (
    <aside
      className={cn(
        'w-80 border-r border-slate-200 bg-white flex flex-col',
        className
      )}
    >
      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section Participants */}
        <ParticipantsList
          participants={participants}
          currentUserRole={currentUserRole}
          showConversationButtons={canStartIndividualConversations}
          activeConversation={activeConversation}
          onConversationClick={handleIndividualClick}
        />

        <Separator />

        {/* Section Progression */}
        <ProgressionTimeline
          currentStatus={currentStatus}
          variant="default"
        />

        <Separator />

        {/* Section Conversations */}
        {onConversationClick && (
          <>
            {canStartIndividualConversations ? (
              <ConversationButtonsGroup
                activeConversation={activeConversation}
                onGroupClick={handleGroupClick}
                individualConversations={individualConversations}
                onIndividualClick={handleIndividualClick}
              />
            ) : (
              <div className="space-y-2">
                <ConversationButton
                  type="group"
                  isActive={activeConversation === 'group'}
                  onClick={handleGroupClick}
                />
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}

/**
 * Version compacte de la sidebar (pour mobile ou espaces réduits)
 */
export interface CompactSidebarProps {
  /** Participants */
  participants: InterventionSidebarProps['participants']
  /** Rôle de l'utilisateur courant */
  currentUserRole: InterventionSidebarProps['currentUserRole']
  /** Statut actuel de l'intervention */
  currentStatus: string
  /** Classes CSS additionnelles */
  className?: string
}

export const CompactSidebar = ({
  participants,
  currentUserRole,
  currentStatus,
  className
}: CompactSidebarProps) => {
  const totalParticipants =
    participants.managers.length +
    participants.providers.length +
    participants.tenants.length

  return (
    <div
      className={cn(
        'p-4 bg-slate-50 rounded-lg space-y-4',
        className
      )}
    >
      {/* Résumé des participants */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Participants</span>
        <span className="text-xs text-muted-foreground">
          {totalParticipants} personnes
        </span>
      </div>

      {/* Timeline compacte */}
      <ProgressionTimeline
        currentStatus={currentStatus}
        variant="compact"
      />
    </div>
  )
}
