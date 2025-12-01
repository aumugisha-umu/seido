'use client'

/**
 * StatusBadge - Badge affichant le statut d'un élément (intervention, devis, créneau)
 *
 * @example
 * <StatusBadge status="pending" type="quote" />
 * <StatusBadge status="approved" type="quote" showIcon />
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  AlertCircle,
  Calendar
} from 'lucide-react'

export type StatusType = 'quote' | 'timeSlot' | 'intervention'

export interface StatusBadgeProps {
  /** Statut à afficher */
  status: string
  /** Type de statut (quote, timeSlot, intervention) */
  type?: StatusType
  /** Taille du badge */
  size?: 'sm' | 'md' | 'lg'
  /** Afficher l'icône */
  showIcon?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Configuration des statuts par type
 */
const STATUS_CONFIG: Record<StatusType, Record<string, {
  label: string
  bg: string
  text: string
  border: string
  icon?: React.ComponentType<{ className?: string }>
}>> = {
  quote: {
    pending: {
      label: 'En attente',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Clock
    },
    sent: {
      label: 'Envoyé',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Send
    },
    approved: {
      label: 'Validé',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: CheckCircle2
    },
    rejected: {
      label: 'Refusé',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle
    }
  },
  timeSlot: {
    pending: {
      label: 'En attente',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Clock
    },
    proposed: {
      label: 'Proposé',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Calendar
    },
    selected: {
      label: 'Sélectionné',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: CheckCircle2
    },
    confirmed: {
      label: 'Confirmé',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: CheckCircle2
    },
    rejected: {
      label: 'Refusé',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle
    },
    cancelled: {
      label: 'Annulé',
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: XCircle
    }
  },
  intervention: {
    demande: {
      label: 'Demande',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: AlertCircle
    },
    approuvee: {
      label: 'Approuvée',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: CheckCircle2
    },
    planifiee: {
      label: 'Planifiée',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: Calendar
    },
    cloturee_par_gestionnaire: {
      label: 'Clôturée',
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: CheckCircle2
    },
    annulee: {
      label: 'Annulée',
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: XCircle
    }
  }
}

/**
 * Badge de statut avec couleur et icône adaptées
 */
export const StatusBadge = ({
  status,
  type = 'quote',
  size = 'sm',
  showIcon = false,
  className
}: StatusBadgeProps) => {
  const config = STATUS_CONFIG[type][status] || {
    label: status,
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200'
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  }

  const IconComponent = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bg,
        config.text,
        config.border,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {showIcon && IconComponent && (
        <IconComponent className={iconSizes[size]} />
      )}
      {config.label}
    </Badge>
  )
}
