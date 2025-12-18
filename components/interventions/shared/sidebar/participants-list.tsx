'use client'

/**
 * ParticipantsList - Liste des participants d'une intervention groupés par rôle
 *
 * Design unifié basé sur le layout legacy (Provider/Tenant) avec:
 * - Groupes par rôle avec labels en uppercase
 * - Emails affichés sous les noms
 * - Icônes de conversation individuelles (manager uniquement)
 * - Bouton "Discussion générale" en bas
 *
 * @example
 * <ParticipantsList
 *   participants={{ managers: [...], providers: [...], tenants: [...] }}
 *   currentUserRole="manager"
 *   onConversationClick={handleConversationClick}
 *   onGroupConversationClick={handleGroupClick}
 * />
 */

import { cn } from '@/lib/utils'
import { Users, MessageSquare, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SeidoBadge } from '@/components/ui/seido-badge'
import { ParticipantsListProps, UserRole, Participant, AssignmentMode } from '../types'
import { permissions, getInitials } from '../utils'

/**
 * Couleurs d'avatar par rôle
 */
const AVATAR_COLORS: Record<UserRole, { bg: string; text: string }> = {
  manager: { bg: 'bg-blue-100', text: 'text-blue-700' },
  provider: { bg: 'bg-amber-100', text: 'text-amber-700' },
  tenant: { bg: 'bg-emerald-100', text: 'text-emerald-700' }
}

/**
 * Labels de groupe par rôle
 */
const GROUP_LABELS: Record<UserRole, string> = {
  manager: 'Gestionnaire',
  provider: 'Prestataire',
  tenant: 'Locataire'
}

/**
 * Mapping entre rôle de participant et type de thread
 */
const ROLE_TO_THREAD_TYPE: Record<UserRole, string> = {
  manager: 'group', // Les gestionnaires utilisent la discussion générale entre eux
  provider: 'provider_to_managers',
  tenant: 'tenant_to_managers'
}

/**
 * Groupe de participants par rôle
 */
interface ParticipantGroupProps {
  label: string
  participants: Participant[]
  role: UserRole
  showConversationButtons: boolean
  activeConversation?: string | 'group'
  onConversationClick?: (participantId: string) => void
  assignmentMode?: AssignmentMode
  /** Compteur de messages non lus pour ce type de thread */
  unreadCount?: number
  /** ID de l'utilisateur connecté (pour masquer son icône de conversation) */
  currentUserId?: string
}

const ParticipantGroup = ({
  label,
  participants,
  role,
  showConversationButtons,
  activeConversation,
  onConversationClick,
  assignmentMode,
  unreadCount = 0,
  currentUserId
}: ParticipantGroupProps) => {
  if (participants.length === 0) return null

  const colors = AVATAR_COLORS[role]

  // Show assignment mode badge only for providers when mode is group or separate
  const showAssignmentBadge = role === 'provider' &&
    participants.length > 1 &&
    assignmentMode &&
    assignmentMode !== 'single'

  return (
    <div className="space-y-3">
      {/* Label du groupe + Assignment mode badge */}
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </p>

        {showAssignmentBadge && assignmentMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <SeidoBadge
                    type="mode"
                    value={assignmentMode}
                    size="md"
                    showIcon
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[280px] p-3">
                <p className="text-sm leading-relaxed">
                  {assignmentMode === 'separate'
                    ? 'Chaque prestataire voit uniquement ses propres informations. Des interventions individuelles seront créées à la clôture.'
                    : 'Tous les prestataires voient les mêmes informations (créneaux, instructions, devis).'
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Liste des participants */}
      <div className="space-y-3">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={cn(
              'flex items-center gap-3',
              showConversationButtons && 'group'
            )}
          >
            {/* Avatar */}
            <Avatar className="h-8 w-8 border border-slate-200 flex-shrink-0">
              <AvatarFallback className={cn('text-xs font-medium', colors.bg, colors.text)}>
                {getInitials(participant.name)}
              </AvatarFallback>
            </Avatar>

            {/* Nom et email */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-slate-700 truncate">
                {participant.name}
              </p>
              {participant.email && (
                <p className="text-xs text-slate-500 truncate">
                  {participant.email}
                </p>
              )}
            </div>

            {/* Bouton de conversation individuelle avec pastille */}
            {/* Masqué pour l'utilisateur connecté (on ne peut pas s'envoyer un message à soi-même) */}
            {showConversationButtons && onConversationClick && participant.id !== currentUserId && (
              <div className="relative flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7 text-slate-400 hover:text-blue-600',
                    activeConversation === participant.id && 'bg-blue-100 text-blue-600'
                  )}
                  onClick={() => onConversationClick(participant.id)}
                  aria-label={`Ouvrir la conversation avec ${participant.name}`}
                  aria-pressed={activeConversation === participant.id}
                >
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
                {/* Pastille de messages non lus */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Bouton de discussion générale
 */
interface GroupConversationButtonProps {
  isActive: boolean
  onClick: () => void
  /** Compteur de messages non lus */
  unreadCount?: number
}

const GroupConversationButton = ({ isActive, onClick, unreadCount = 0 }: GroupConversationButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'hover:bg-slate-50 text-slate-700'
      )}
      aria-label="Ouvrir la discussion générale"
      aria-pressed={isActive}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-full relative',
          isActive ? 'bg-blue-100' : 'bg-slate-100'
        )}>
          <Users className="w-4 h-4" aria-hidden="true" />
          {/* Pastille de messages non lus */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-sm font-medium">Discussion générale</span>
      </div>
      <div className={cn(
        'p-1.5 rounded-full',
        isActive ? 'text-blue-600' : 'text-slate-400'
      )}>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </div>
    </button>
  )
}

/**
 * Extended props for ParticipantsList with assignment mode and unread counts
 */
interface ExtendedParticipantsListProps extends ParticipantsListProps {
  assignmentMode?: AssignmentMode
  /** Compteurs de messages non lus par type de thread */
  unreadCounts?: Record<string, number>
}

/**
 * Liste complète des participants avec filtrage par rôle
 */
export const ParticipantsList = ({
  participants,
  currentUserRole,
  currentUserId,
  onConversationClick,
  onGroupConversationClick,
  activeConversation,
  showConversationButtons = false,
  assignmentMode,
  unreadCounts = {},
  className
}: ExtendedParticipantsListProps) => {
  // Détermine quels rôles sont visibles selon le rôle de l'utilisateur courant
  const visibleRoles = permissions.canViewParticipantsByRole(currentUserRole)

  // Filtre les participants selon les rôles visibles
  const visibleParticipants = {
    managers: visibleRoles.includes('manager') ? participants.managers : [],
    providers: visibleRoles.includes('provider') ? participants.providers : [],
    tenants: visibleRoles.includes('tenant') ? participants.tenants : []
  }

  // Vérifie s'il y a des participants à afficher
  const totalParticipants =
    visibleParticipants.managers.length +
    visibleParticipants.providers.length +
    visibleParticipants.tenants.length

  // Détermine si les boutons de conversation sont disponibles
  const canShowConversationButtons =
    showConversationButtons && permissions.canStartIndividualConversation(currentUserRole)

  // Détermine si le bouton de conversation de groupe est visible
  const canShowGroupConversation =
    showConversationButtons && permissions.canViewGroupConversation(currentUserRole)

  return (
    <div className={cn('space-y-6', className)}>
      {/* En-tête */}
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" aria-hidden="true" />
        Participants
      </h3>

      {/* Liste vide */}
      {totalParticipants === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun participant
        </p>
      )}

      {/* Groupes de participants */}
      <div className="space-y-6">
        {visibleParticipants.managers.length > 0 && (
          <ParticipantGroup
            label={GROUP_LABELS.manager}
            participants={visibleParticipants.managers}
            role="manager"
            showConversationButtons={canShowConversationButtons}
            activeConversation={activeConversation}
            onConversationClick={onConversationClick}
            unreadCount={unreadCounts[ROLE_TO_THREAD_TYPE.manager] || 0}
            currentUserId={currentUserId}
          />
        )}

        {visibleParticipants.providers.length > 0 && (
          <ParticipantGroup
            label={GROUP_LABELS.provider}
            participants={visibleParticipants.providers}
            role="provider"
            showConversationButtons={canShowConversationButtons}
            activeConversation={activeConversation}
            onConversationClick={onConversationClick}
            assignmentMode={assignmentMode}
            unreadCount={unreadCounts[ROLE_TO_THREAD_TYPE.provider] || 0}
            currentUserId={currentUserId}
          />
        )}

        {visibleParticipants.tenants.length > 0 && (
          <ParticipantGroup
            label={GROUP_LABELS.tenant}
            participants={visibleParticipants.tenants}
            role="tenant"
            showConversationButtons={canShowConversationButtons}
            activeConversation={activeConversation}
            onConversationClick={onConversationClick}
            unreadCount={unreadCounts[ROLE_TO_THREAD_TYPE.tenant] || 0}
            currentUserId={currentUserId}
          />
        )}
      </div>

      {/* Bouton de discussion générale (visible uniquement pour les rôles autorisés) */}
      {canShowGroupConversation && onGroupConversationClick && (
        <>
          <Separator />
          <GroupConversationButton
            isActive={activeConversation === 'group'}
            onClick={onGroupConversationClick}
            unreadCount={unreadCounts['group'] || 0}
          />
        </>
      )}
    </div>
  )
}
