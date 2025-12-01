'use client'

/**
 * ParticipantsList - Liste des participants d'une intervention groupés par rôle
 *
 * @example
 * <ParticipantsList
 *   participants={{ managers: [...], providers: [...], tenants: [...] }}
 *   currentUserRole="manager"
 *   onConversationClick={handleConversationClick}
 * />
 */

import { cn } from '@/lib/utils'
import { Users, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ParticipantsListProps, UserRole, USER_ROLE_LABELS, Participant } from '../types'
import { ParticipantAvatar, RoleBadge } from '../atoms'
import { permissions } from '../utils'

/**
 * Groupe de participants par rôle
 */
interface ParticipantGroupProps {
  title: string
  participants: Participant[]
  role: UserRole
  showConversationButtons: boolean
  activeConversation?: string | 'group'
  onConversationClick?: (participantId: string) => void
}

const ParticipantGroup = ({
  title,
  participants,
  role,
  showConversationButtons,
  activeConversation,
  onConversationClick
}: ParticipantGroupProps) => {
  if (participants.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Titre du groupe */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs text-muted-foreground">
          ({participants.length})
        </span>
      </div>

      {/* Liste des participants */}
      <div className="space-y-1">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg transition-colors',
              activeConversation === participant.id
                ? 'bg-slate-100'
                : 'hover:bg-slate-50'
            )}
          >
            {/* Avatar */}
            <ParticipantAvatar
              name={participant.name}
              role={role}
              size="md"
            />

            {/* Informations */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {participant.name}
              </p>
              {participant.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {participant.email}
                </p>
              )}
            </div>

            {/* Badge de rôle (optionnel, pour clarification) */}
            <RoleBadge role={role} size="sm" className="hidden lg:flex" />

            {/* Bouton de conversation */}
            {showConversationButtons && onConversationClick && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 w-7 p-0',
                  activeConversation === participant.id && 'bg-blue-100 text-blue-600'
                )}
                onClick={() => onConversationClick(participant.id)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Liste complète des participants avec filtrage par rôle
 */
export const ParticipantsList = ({
  participants,
  currentUserRole,
  onConversationClick,
  activeConversation,
  showConversationButtons = false,
  className
}: ParticipantsListProps) => {
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

  return (
    <div className={cn('space-y-4', className)}>
      {/* En-tête */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Participants</span>
        <span className="text-xs text-muted-foreground">
          ({totalParticipants})
        </span>
      </div>

      {/* Liste vide */}
      {totalParticipants === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun participant
        </p>
      )}

      {/* Groupes de participants */}
      {visibleParticipants.managers.length > 0 && (
        <>
          <ParticipantGroup
            title={USER_ROLE_LABELS.manager + 's'}
            participants={visibleParticipants.managers}
            role="manager"
            showConversationButtons={canShowConversationButtons}
            activeConversation={activeConversation}
            onConversationClick={onConversationClick}
          />
        </>
      )}

      {visibleParticipants.providers.length > 0 && (
        <>
          {visibleParticipants.managers.length > 0 && <Separator />}
          <ParticipantGroup
            title={USER_ROLE_LABELS.provider + 's'}
            participants={visibleParticipants.providers}
            role="provider"
            showConversationButtons={canShowConversationButtons}
            activeConversation={activeConversation}
            onConversationClick={onConversationClick}
          />
        </>
      )}

      {visibleParticipants.tenants.length > 0 && (
        <>
          {(visibleParticipants.managers.length > 0 ||
            visibleParticipants.providers.length > 0) && <Separator />}
          <ParticipantGroup
            title={USER_ROLE_LABELS.tenant + 's'}
            participants={visibleParticipants.tenants}
            role="tenant"
            showConversationButtons={canShowConversationButtons}
            activeConversation={activeConversation}
            onConversationClick={onConversationClick}
          />
        </>
      )}
    </div>
  )
}
