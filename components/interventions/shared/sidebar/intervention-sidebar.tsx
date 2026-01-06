'use client'

/**
 * InterventionSidebar - Sidebar complète pour la prévisualisation d'intervention
 * Compose: ParticipantsList (avec conversations) + ProgressionTimeline
 *
 * @example
 * <InterventionSidebar
 *   participants={{ managers: [...], providers: [...], tenants: [...] }}
 *   currentUserRole="manager"
 *   currentStatus="planifiee"
 *   onConversationClick={handleIndividualClick}
 *   onGroupConversationClick={handleGroupClick}
 *   showConversationButtons={true}
 * />
 */

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { InterventionSidebarProps } from '../types'
import { ParticipantsList, GroupConversationButton } from './participants-list'
import { ProgressionTimeline } from './progression-timeline'
import { permissions } from '../utils'

/**
 * Sidebar complète pour la prévisualisation d'intervention
 */
export const InterventionSidebar = ({
  participants,
  currentUserRole,
  currentUserId,
  currentStatus,
  timelineEvents,
  activeConversation,
  onConversationClick,
  onGroupConversationClick,
  showConversationButtons = false,
  assignmentMode,
  unreadCounts = {},
  className
}: InterventionSidebarProps) => {
  return (
    <aside
      className={cn(
        'w-80 border-r border-slate-200 bg-white flex flex-col h-full',
        className
      )}
    >
      {/* Section Participants - max 50% de hauteur avec scroll */}
      <div className="flex-shrink-0 max-h-[50%] flex flex-col p-6 pb-2">
        {/* Liste scrollable des participants */}
        <div className="overflow-y-auto min-h-0 flex-1">
          <ParticipantsList
            participants={participants}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            showConversationButtons={showConversationButtons}
            activeConversation={activeConversation}
            onConversationClick={onConversationClick}
            onGroupConversationClick={onGroupConversationClick}
            assignmentMode={assignmentMode}
            unreadCounts={unreadCounts}
            hideGroupConversationButton={true}
          />
        </div>

        {/* Bouton Discussion générale - toujours visible (hors scroll) */}
        {showConversationButtons &&
         permissions.canViewGroupConversation(currentUserRole) &&
         onGroupConversationClick && (
          <div className="flex-shrink-0 pt-2 mt-2 border-t border-slate-200">
            <GroupConversationButton
              isActive={activeConversation === 'group'}
              onClick={onGroupConversationClick}
              unreadCount={unreadCounts?.['group'] || 0}
            />
          </div>
        )}
      </div>

      {/* Section Progression - prend l'espace restant avec scroll */}
      <div className="flex-1 flex flex-col min-h-0 p-6 pt-4">
        <Separator className="mb-4 flex-shrink-0" />
        <div className="flex-1 overflow-y-auto min-h-0">
          <ProgressionTimeline
            currentStatus={currentStatus}
            events={timelineEvents}
            variant="default"
          />
        </div>
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
