'use client'

/**
 * ParticipantsRow - Compact horizontal display of intervention participants
 *
 * Material Design 3 Guidelines:
 * - Avatar chips for compact participant display
 * - Grouped by role with clear visual distinction
 * - Message icon for 1-1 chat (role-based permissions)
 * - Two sections: account holders vs simple contacts
 * - Rich HoverCard with full contact info
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
  HoverCard,
  HoverCardTrigger,
  HoverCardContent
} from '@/components/ui/hover-card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Users, ContactRound, MessageSquare, Mail, Phone, Building2, Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'

type UserRole = 'gestionnaire' | 'locataire' | 'prestataire' | 'admin'
type ThreadType = 'group' | 'tenant_to_managers' | 'provider_to_managers'

export interface Participant {
  id: string
  name: string
  email?: string
  phone?: string
  avatar_url?: string | null
  company_name?: string | null
  /** Whether the user has an auth account (can log in and chat) */
  hasAccount?: boolean
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
export const roleConfig = {
  managers: {
    label: 'Gestionnaire',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  providers: {
    label: 'Prestataire',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  tenants: {
    label: 'Locataire',
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

const CopyButton = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [value])

  return (
    <button
      onClick={handleCopy}
      className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
      aria-label={`Copier ${value}`}
    >
      {copied
        ? <Check className="h-3 w-3 text-green-500" />
        : <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      }
    </button>
  )
}

interface ParticipantChipProps {
  participant: Participant
  roleKey: 'managers' | 'providers' | 'tenants'
  /** Afficher l'icône message pour ce participant */
  showChatIcon?: boolean
  /** Callback pour ouvrir le chat */
  onChatClick?: () => void
}

export const ParticipantChip = ({ participant, roleKey, showChatIcon, onChatClick }: ParticipantChipProps) => {
  const config = roleConfig[roleKey]
  const hasAccount = participant.hasAccount !== false // default true for backwards compat

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
            'transition-colors cursor-default',
            hasAccount
              ? cn('border', config.bgColor, config.borderColor)
              : cn('border border-dashed', config.bgColor + '/50', config.borderColor),
            'hover:opacity-80'
          )}
        >
          <Avatar className={cn('h-5 w-5', !hasAccount && 'grayscale-[40%]')}>
            {participant.avatar_url && (
              <AvatarImage src={participant.avatar_url} alt={participant.name} />
            )}
            <AvatarFallback className={cn(
              'text-xs font-medium',
              hasAccount ? cn(config.bgColor, config.textColor) : cn(config.bgColor + '/50', config.textColor + '/60')
            )}>
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
          <span className={cn(
            'text-xs font-medium truncate max-w-[100px]',
            hasAccount ? config.textColor : config.textColor + '/60'
          )}>
            {participant.name}
          </span>
          {/* Icône message pour ouvrir le chat 1-1 (only for users with accounts) */}
          {showChatIcon && hasAccount && onChatClick && (
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
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-64 p-3">
        <div className="space-y-2">
          {/* Header: Avatar + Name + Role badge */}
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              {participant.avatar_url && (
                <AvatarImage src={participant.avatar_url} alt={participant.name} />
              )}
              <AvatarFallback className={cn(
                'text-xs font-medium',
                config.bgColor, config.textColor
              )}>
                {getInitials(participant.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{participant.name}</p>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className={cn('h-5 px-1.5 text-xs font-medium', config.bgColor, config.textColor)}
                >
                  {config.label}
                </Badge>
                <span className={cn(
                  'text-xs',
                  hasAccount ? 'text-emerald-600' : 'text-muted-foreground'
                )}>
                  {hasAccount ? 'Compte Seido' : 'Contact externe'}
                </span>
              </div>
            </div>
          </div>

          {/* Separator */}
          {(participant.email || participant.phone || participant.company_name) && (
            <div className="border-t" />
          )}

          {/* Contact details */}
          <div className="space-y-1.5">
            {participant.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`mailto:${participant.email}`}
                  className="text-xs text-muted-foreground hover:text-foreground truncate transition-colors flex-1 min-w-0"
                >
                  {participant.email}
                </a>
                <CopyButton value={participant.email} />
              </div>
            )}
            {participant.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={`tel:${participant.phone}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-1 min-w-0"
                >
                  {participant.phone}
                </a>
                <CopyButton value={participant.phone} />
              </div>
            )}
            {participant.company_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {participant.company_name}
                </span>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
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

  // Flatten all participants with their role key attached, then split by account status
  const allParticipants = groups.flatMap(({ key, items }) =>
    items.map(p => ({ ...p, roleKey: key }))
  )
  const withAccount = allParticipants.filter(p => p.hasAccount !== false)
  const contacts = allParticipants.filter(p => p.hasAccount === false)

  const renderChip = (p: typeof allParticipants[number]) => {
    const threadType = canChatWith(currentUserRole, p.roleKey)
    const isCurrentUser = p.id === currentUserId
    const showChat = !isCurrentUser && threadType !== null && !!onOpenChat

    return (
      <ParticipantChip
        key={p.id}
        participant={p}
        roleKey={p.roleKey}
        showChatIcon={showChat}
        onChatClick={showChat ? () => onOpenChat!(p.id, threadType!) : undefined}
      />
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Participants row (users with accounts) */}
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-muted-foreground cursor-default">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Participants</span>
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {withAccount.length}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Utilisateurs ayant un compte Seido</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1 flex-wrap">
          {withAccount.map(renderChip)}
        </div>
      </div>

      {/* Contacts row (users without accounts) — separate line */}
      {contacts.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-muted-foreground cursor-default">
                  <ContactRound className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">Contacts</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {contacts.length}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Contacts externes sans compte Seido</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-1 flex-wrap">
            {contacts.map(renderChip)}
          </div>
        </div>
      )}
    </div>
  )
}
