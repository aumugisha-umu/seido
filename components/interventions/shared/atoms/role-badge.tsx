'use client'

/**
 * RoleBadge - Badge affichant le rôle d'un utilisateur
 *
 * @example
 * <RoleBadge role="manager" />
 * <RoleBadge role="provider" size="md" />
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { UserRole, USER_ROLE_LABELS, USER_ROLE_COLORS } from '../types'

export interface RoleBadgeProps {
  /** Rôle de l'utilisateur */
  role: UserRole
  /** Taille du badge */
  size?: 'sm' | 'md' | 'lg'
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Badge de rôle avec couleur et label adaptés
 */
export const RoleBadge = ({
  role,
  size = 'sm',
  className
}: RoleBadgeProps) => {
  const colors = USER_ROLE_COLORS[role]
  const label = USER_ROLE_LABELS[role]

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1'
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        'font-medium',
        className
      )}
    >
      {label}
    </Badge>
  )
}
