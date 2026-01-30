'use client'

/**
 * ParticipantsRow - Compact horizontal display of intervention participants
 *
 * Material Design 3 Guidelines:
 * - Avatar chips for compact participant display
 * - Grouped by role with clear visual distinction
 * - Message icon for 1-1 chat (role-based permissions)
 *
 * Chat permissions:
 * - Gestionnaires can chat with everyone
 * - Locataires can only chat 1-1 with gestionnaires
 * - Prestataires can only chat 1-1 with gestionnaires
 */

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Users, MessageSquare } from 'lucide-react'

type UserRole = 'gestionnaire' | 'locataire' | 'prestataire' | 'admin'
type ThreadType = 'group' | 'tenant_to_managers' | 'provider_to_managers'

interface Participant {
  id: string
  name: string
  email?: string
  avatar_url?: string | null
  company_name?: string | null
}

interface ParticipantsRowProps {
  participants: {
    managers: Participant[]
    providers: Participant[]
    tenants: Participant[]
  }
  /** ID de l'utilisateur connecté (pour masquer l'icône chat sur soi-même) */
  currentUserId?: string
  /** Rôle de l'utilisateur connecté (pour filtrer les permissions de chat) */
  currentUserRole?: UserRole
  /** Callback pour ouvrir le chat avec un participant */
  onOpenChat?: (participantId: string, threadType: ThreadType) => void
  className?: string
}

// Role colors following the existing design system
const roleConfig = {
  managers: {
    label: 'Gestionnaires',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  providers: {
    label: 'Prestataires',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  tenants: {
    label: 'Locataires',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200'
  }
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface ParticipantChipProps {
  participant: Participant
  role: 'managers' | 'providers' | 'tenants'
  /** Afficher l'icône message pour ce participant */
  showChatIcon?: boolean
  /** Callback pour ouvrir le chat */
  onChatClick?: () => void
}

const ParticipantChip = ({ participant, role, showChatIcon, onChatClick }: ParticipantChipProps) => {
  const config = roleConfig[role]

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
              'border transition-colors cursor-default',
              config.bgColor,
              config.borderColor,
              'hover:opacity-80'
            )}
          >
            <Avatar className="h-5 w-5">
              {participant.avatar_url && (
                <AvatarImage src={participant.avatar_url} alt={participant.name} />
              )}
              <AvatarFallback className={cn('text-[10px] font-medium', config.bgColor, config.textColor)}>
                {getInitials(participant.name)}
              </AvatarFallback>
            </Avatar>
            <span className={cn('text-xs font-medium truncate max-w-[100px]', config.textColor)}>
              {participant.name}
            </span>
            {/* Icône message pour ouvrir le chat 1-1 */}
            {showChatIcon && onChatClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onChatClick()
                }}
                className={cn(
                  'ml-0.5 p-0.5 rounded-full transition-colors',
                  'hover:bg-white/50 active:bg-white/70',
                  config.textColor
                )}
                aria-label={`Envoyer un message à ${participant.name}`}
              >
                <MessageSquare className="h-3 w-3" />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-0.5">
            <p className="font-medium">{participant.name}</p>
            {participant.email && <p className="text-muted-foreground">{participant.email}</p>}
            {participant.company_name && <p className="text-muted-foreground">{participant.company_name}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Détermine si l'utilisateur peut chatter avec un participant
 * et retourne le type de thread approprié
 */
const canChatWith = (
  currentUserRole: UserRole | undefined,
  targetRole: 'managers' | 'providers' | 'tenants'
): ThreadType | null => {
  if (!currentUserRole) return null

  // Gestionnaires peuvent chatter avec tout le monde
  if (currentUserRole === 'gestionnaire' || currentUserRole === 'admin') {
    if (targetRole === 'tenants') return 'tenant_to_managers'
    if (targetRole === 'providers') return 'provider_to_managers'
    // Avec d'autres gestionnaires → groupe général
    return 'group'
  }

  // Locataires peuvent seulement chatter avec les gestionnaires
  if (currentUserRole === 'locataire') {
    if (targetRole === 'managers') return 'tenant_to_managers'
    return null // Pas de chat 1-1 avec prestataires ou autres locataires
  }

  // Prestataires peuvent seulement chatter avec les gestionnaires
  if (currentUserRole === 'prestataire') {
    if (targetRole === 'managers') return 'provider_to_managers'
    return null // Pas de chat 1-1 avec locataires ou autres prestataires
  }

  return null
}

export const ParticipantsRow = ({
  participants,
  currentUserId,
  currentUserRole,
  onOpenChat,
  className
}: ParticipantsRowProps) => {
  const totalCount =
    participants.managers.length +
    participants.providers.length +
    participants.tenants.length

  if (totalCount === 0) {
    return null
  }

  // Group participants by role
  const groups = [
    { key: 'managers' as const, items: participants.managers },
    { key: 'providers' as const, items: participants.providers },
    { key: 'tenants' as const, items: participants.tenants }
  ].filter(g => g.items.length > 0)

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {/* Icon + Label */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">Participants</span>
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {totalCount}
        </Badge>
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-border" />

      {/* Participant chips grouped by role */}
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {groups.map(({ key, items }) => {
          // Déterminer si on peut chatter avec ce groupe
          const threadType = canChatWith(currentUserRole, key)

          return (
            <div key={key} className="flex items-center gap-1">
              {items.slice(0, 3).map((participant) => {
                // Ne pas afficher l'icône chat pour soi-même
                const isCurrentUser = participant.id === currentUserId
                const showChat = !isCurrentUser && threadType !== null && onOpenChat

                return (
                  <ParticipantChip
                    key={participant.id}
                    participant={participant}
                    role={key}
                    showChatIcon={showChat}
                    onChatClick={showChat ? () => onOpenChat(participant.id, threadType!) : undefined}
                  />
                )
              })}
              {items.length > 3 && (
                <Badge
                  variant="outline"
                  className={cn('text-xs', roleConfig[key].textColor, roleConfig[key].borderColor)}
                >
                  +{items.length - 3}
                </Badge>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
