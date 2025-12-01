'use client'

/**
 * ParticipantAvatar - Avatar d'un participant avec initiales et couleur de rôle
 *
 * @example
 * <ParticipantAvatar name="Jean Dupont" role="manager" />
 * <ParticipantAvatar name="Marie Martin" role="provider" size="lg" showRoleBadge />
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { UserRole, USER_ROLE_COLORS } from '../types'
import { getInitials } from '../utils/helpers'
import { RoleBadge } from './role-badge'

export interface ParticipantAvatarProps {
  /** Nom du participant */
  name: string
  /** Rôle du participant */
  role: UserRole
  /** Taille de l'avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Afficher le badge de rôle sous l'avatar */
  showRoleBadge?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Avatar avec initiales colorées selon le rôle
 */
export const ParticipantAvatar = ({
  name,
  role,
  size = 'md',
  showRoleBadge = false,
  className
}: ParticipantAvatarProps) => {
  const colors = USER_ROLE_COLORS[role]
  const initials = getInitials(name)

  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
    xl: 'h-12 w-12 text-base'
  }

  if (showRoleBadge) {
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <Avatar className={sizeClasses[size]}>
          <AvatarFallback className={cn(colors.avatar, 'font-medium')}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <RoleBadge role={role} size="sm" />
      </div>
    )
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarFallback className={cn(colors.avatar, 'font-medium')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
