'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Bell, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ReminderStats } from '@/lib/types/reminder.types'

// ============================================================================
// TYPES
// ============================================================================

interface ReminderStatsWidgetProps {
  stats: ReminderStats
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ReminderStatsWidget - Dashboard widget showing reminder stats
 *
 * Displays due today, overdue, in progress, and pending counts.
 * Clickable card navigates to the tasks page filtered on reminders.
 */
export function ReminderStatsWidget({ stats, className }: ReminderStatsWidgetProps) {
  const router = useRouter()

  const hasOverdue = stats.overdue > 0
  const hasDueToday = stats.due_today > 0
  const hasUrgent = hasOverdue || hasDueToday

  const handleClick = () => {
    router.push('/gestionnaire/operations?type=rappel')
  }

  return (
    <Card
      data-stats-card="reminders"
      className={cn(
        'shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group cursor-pointer',
        'hover:transform hover:-translate-y-1',
        'dark:backdrop-blur-sm dark:shadow-none',
        hasUrgent
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-none dark:border dark:border-amber-900/30'
          : 'bg-card dark:bg-white/5 border-none dark:border dark:border-white/10',
        hasOverdue && 'ring-2 ring-red-500/30',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      aria-label={`Rappels: ${stats.due_today} aujourd'hui, ${stats.overdue} en retard. Voir tous les rappels.`}
    >
      <CardContent className="p-3 relative">
        {/* Background Icon */}
        <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
          <Bell className={cn(
            'h-12 w-12',
            hasOverdue ? 'text-red-500' : 'text-blue-600'
          )} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Label */}
          <p className={cn(
            'text-xs font-medium uppercase tracking-wider',
            hasUrgent
              ? 'text-amber-700/80 dark:text-amber-200/80'
              : 'text-muted-foreground'
          )}>
            Rappels
          </p>

          {/* Main stat: Due today */}
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={cn(
              'text-2xl font-bold',
              hasUrgent
                ? 'text-amber-900 dark:text-amber-100'
                : 'text-foreground'
            )}>
              {stats.due_today}
            </span>
            <span className={cn(
              'text-xs font-medium',
              hasUrgent
                ? 'text-amber-700/70 dark:text-amber-200/70'
                : 'text-muted-foreground/70'
            )}>
              aujourd&apos;hui
            </span>
          </div>

          {/* Secondary stats */}
          <div className="mt-1 flex flex-col gap-0.5">
            {/* Overdue (red alert) */}
            {hasOverdue && (
              <span className="text-destructive font-medium flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {stats.overdue} en retard
              </span>
            )}

            {/* In progress + Pending on same line */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {stats.en_cours > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.en_cours} en cours
                </span>
              )}
              {stats.en_attente > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {stats.en_attente} en attente
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
