'use client'

import { Progress } from '@/components/ui/progress'
import { Phone, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhoneUsageCounterProps {
  minutesUsed: number
  minutesIncluded: number
  callsCount: number
  /** Compact mode for dashboard sidebar */
  compact?: boolean
}

const getUsageColor = (percentage: number) => {
  if (percentage >= 80) return 'red' as const
  if (percentage >= 60) return 'orange' as const
  return 'green' as const
}

const colorClasses = {
  green: {
    text: 'text-green-600',
    progress: '[&>div]:bg-green-500',
  },
  orange: {
    text: 'text-orange-500',
    progress: '[&>div]:bg-orange-500',
  },
  red: {
    text: 'text-red-600',
    progress: '[&>div]:bg-red-500',
  },
} as const

const PhoneUsageCounter = ({
  minutesUsed,
  minutesIncluded,
  callsCount,
  compact = false,
}: PhoneUsageCounterProps) => {
  const percentage = minutesIncluded > 0 ? Math.min(100, (minutesUsed / minutesIncluded) * 100) : 0
  const color = getUsageColor(percentage)
  const showWarning = !compact && percentage > 80

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" />
          <span className={cn('font-medium', colorClasses[color].text)}>
            {minutesUsed}/{minutesIncluded} min
          </span>
        </div>
        <Progress
          value={percentage}
          className={cn('h-1.5', colorClasses[color].progress)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Phone className="h-4 w-4" />
          <span>Consommation IA</span>
        </div>
        <span className={cn('text-sm font-semibold', colorClasses[color].text)}>
          {minutesUsed}/{minutesIncluded} min ({Math.round(percentage)}%)
        </span>
      </div>

      <Progress
        value={percentage}
        className={cn('h-2', colorClasses[color].progress)}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {callsCount} appel{callsCount !== 1 ? 's' : ''} ce mois
        </span>
      </div>

      {showWarning && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Attention : vous approchez de votre limite</span>
        </div>
      )}
    </div>
  )
}

export { PhoneUsageCounter }
