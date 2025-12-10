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
}

const ParticipantGroup = ({
  label,
  participants,
  role,
  showConversationButtons,
  activeConversation,
  onConversationClick,
  assignmentMode
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

            {/* Bouton de conversation individuelle */}
            {showConversationButtons && onConversationClick && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 flex-shrink-0 text-slate-400 hover:text-blue-600',
                  activeConversation === participant.id && 'bg-blue-100 text-blue-600'
                )}
                onClick={() => onConversationClick(participant.id)}
                aria-label={`Ouvrir la conversation avec ${participant.name}`}
                aria-pressed={activeConversation === participant.id}
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
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
}

const GroupConversationButton = ({ isActive, onClick }: GroupConversationButtonProps) => {
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
          'p-2 rounded-full',
          isActive ? 'bg-blue-100' : 'bg-slate-100'
        )}>
          <Users className="w-4 h-4" aria-hidden="true" />
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
 * Extended props for ParticipantsList with assignment mode
 */
interface ExtendedParticipantsListProps extends ParticipantsListProps {
  assignmentMode?: AssignmentMode
}

/**
 * Liste complète des participants avec filtrage par rôle
 */
export const ParticipantsList = ({
  participants,
  currentUserRole,
  onConversationClick,
  onGroupConversationClick,
  activeConversation,
  showConversationButtons = false,
  assignmentMode,
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
          />
        </>
      )}
    </div>
  )
}
