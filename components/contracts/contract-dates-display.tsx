"use client"

import { cn } from '@/lib/utils'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'
import type { ContractDatesDisplayProps } from '@/lib/types/contract.types'

export function ContractDatesDisplay({
  startDate,
  endDate,
  showRemaining = true,
  compact = false
}: ContractDatesDisplayProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: compact ? 'short' : 'long',
      year: 'numeric'
    })
  }

  const calculateDaysRemaining = () => {
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const diff = end.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = calculateDaysRemaining()
  const isExpired = daysRemaining <= 0
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30
  const isExpiringVerySoon = daysRemaining > 0 && daysRemaining <= 7

  if (compact) {
    return (
      <div className="contract-dates-display contract-dates-display--compact flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
        {showRemaining && (
          <span
            className={cn(
              'ml-1 text-xs font-medium',
              isExpired && 'text-red-600',
              isExpiringVerySoon && !isExpired && 'text-red-600',
              isExpiringSoon && !isExpiringVerySoon && 'text-orange-600',
              !isExpired && !isExpiringSoon && 'text-green-600'
            )}
          >
            {isExpired
              ? `Expiré il y a ${Math.abs(daysRemaining)}j`
              : `${daysRemaining}j restants`}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="contract-dates-display space-y-2">
      <div className="contract-dates-display__period flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm text-muted-foreground">
            Du <span className="font-medium text-foreground">{formatDate(startDate)}</span>
          </span>
          <span className="text-sm text-muted-foreground">
            au <span className="font-medium text-foreground">{formatDate(endDate)}</span>
          </span>
        </div>
      </div>

      {showRemaining && (
        <div
          className={cn(
            'contract-dates-display__remaining flex items-center gap-2 text-sm',
            isExpired && 'text-red-600',
            isExpiringVerySoon && !isExpired && 'text-red-600',
            isExpiringSoon && !isExpiringVerySoon && 'text-orange-600',
            !isExpired && !isExpiringSoon && 'text-green-600'
          )}
        >
          {(isExpired || isExpiringSoon) ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <span className="font-medium">
            {isExpired
              ? `Contrat expiré depuis ${Math.abs(daysRemaining)} jour${Math.abs(daysRemaining) > 1 ? 's' : ''}`
              : `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`}
          </span>
        </div>
      )}
    </div>
  )
}
