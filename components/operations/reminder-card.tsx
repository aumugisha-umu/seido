'use client'

import { useCallback, memo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Building2,
  Home,
  User,
  Bell,
  Flame,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReminderWithRelations } from '@/lib/types/reminder.types'
import {
  REMINDER_STATUS_LABELS,
  REMINDER_PRIORITY_LABELS,
  type ReminderPriority,
  type ReminderStatus,
} from '@/lib/types/reminder.types'
import {
  REMINDER_PRIORITY_BADGE_STYLES,
  REMINDER_STATUS_BADGE_STYLES,
  REMINDER_ICON_BG_COLORS,
  isReminderOverdue,
  formatRelativeDueDate,
  getReminderLinkedEntity,
  getReminderAssigneeName,
  getReminderActionMessage,
} from '@/lib/utils/reminder-helpers'

// ============================================================================
// TYPES
// ============================================================================

interface ReminderCardProps {
  reminder: ReminderWithRelations
  onStart?: (id: string) => void
  onComplete?: (id: string) => void
  onCancel?: (id: string) => void
}

// ============================================================================
// ICON MAPPING
// ============================================================================

const ENTITY_ICONS = { building: Building2, lot: Home, contact: User } as const

// ============================================================================
// COMPONENT
// ============================================================================

export const ReminderCard = memo(function ReminderCard({
  reminder,
  onStart,
  onComplete,
  onCancel,
}: ReminderCardProps) {
  const overdue = isReminderOverdue(reminder)
  const status = reminder.status as ReminderStatus
  const priority = reminder.priority as ReminderPriority
  const linkedEntity = getReminderLinkedEntity(reminder)
  const assignedUser = getReminderAssigneeName(reminder)
  const hasRecurrence = !!reminder.recurrence_rule_id
  const reminderUrl = `/gestionnaire/operations/rappels/${reminder.id}`
  const actionMessage = getReminderActionMessage(status, overdue)
  const isAlert = overdue

  const handleStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onStart?.(reminder.id)
  }, [onStart, reminder.id])

  const handleComplete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onComplete?.(reminder.id)
  }, [onComplete, reminder.id])

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onCancel?.(reminder.id)
  }, [onCancel, reminder.id])

  // Build action buttons (same pattern as InterventionCard)
  const actions: Array<{
    label: string
    icon: typeof Play
    onClick: (e: React.MouseEvent) => void
    variant: 'primary' | 'secondary'
  }> = []

  if (status === 'en_attente' && onStart) {
    actions.push({
      label: 'Commencer',
      icon: Play,
      onClick: handleStart,
      variant: 'primary',
    })
  }

  if ((status === 'en_attente' || status === 'en_cours') && onComplete) {
    actions.push({
      label: 'Terminer',
      icon: CheckCircle,
      onClick: handleComplete,
      variant: status === 'en_cours' ? 'primary' : 'secondary',
    })
  }

  const EntityIcon = linkedEntity ? ENTITY_ICONS[linkedEntity.type] : null

  return (
    <div
      className={cn(
        "group relative bg-card dark:bg-white/5 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none",
        "transition-all duration-300 border border-border dark:border-white/10",
        "hover:border-primary/30 flex flex-col h-full dark:backdrop-blur-sm",
      )}
    >
      {/* Header: Icon + (Title + Badges) + dot menu */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon circle — priority-colored like InterventionTypeIcon */}
        <div
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-md flex-shrink-0",
            REMINDER_ICON_BG_COLORS[priority]
          )}
        >
          <Bell className="h-6 w-6" />
        </div>

        {/* Title + Badges container */}
        <div className="flex-1 min-w-0">
          <Link href={reminderUrl} className="block">
            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate cursor-pointer">
              {reminder.title}
              {hasRecurrence && (
                <RefreshCw
                  className="inline-block h-3.5 w-3.5 text-amber-600 ml-1.5 -mt-0.5"
                  aria-label="Rappel recurrent"
                />
              )}
            </h3>
          </Link>
          {/* Badges row — same pattern as InterventionCard */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mt-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={cn(REMINDER_PRIORITY_BADGE_STYLES[priority], "text-xs border flex items-center gap-1 cursor-default")}>
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">{REMINDER_PRIORITY_LABELS[priority]}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden">
                {REMINDER_PRIORITY_LABELS[priority]}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={cn(REMINDER_STATUS_BADGE_STYLES[status], "text-xs border flex items-center gap-1 cursor-default")}>
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span className="hidden sm:inline">{REMINDER_STATUS_LABELS[status]}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden">
                {REMINDER_STATUS_LABELS[status]}
              </TooltipContent>
            </Tooltip>

            {overdue && (
              <Badge className="text-xs bg-red-100 text-red-800 border-red-200 border">
                En retard
              </Badge>
            )}
          </div>
        </div>

        {/* Dot menu */}
        {(status === 'en_attente' || status === 'en_cours') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Plus d'actions"
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Plus d&apos;actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status === 'en_attente' && onStart && (
                <DropdownMenuItem onClick={handleStart}>
                  <Play className="h-4 w-4 mr-2" />
                  Commencer
                </DropdownMenuItem>
              )}
              {onComplete && (
                <DropdownMenuItem onClick={handleComplete}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Terminer
                </DropdownMenuItem>
              )}
              {onCancel && (
                <DropdownMenuItem onClick={handleCancel} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                  <XCircle className="h-4 w-4 mr-2" />
                  Annuler
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Status Banner — same structure as InterventionCard */}
      <div className={cn(
        "border rounded-lg px-3 py-2 mb-3 w-full",
        isAlert
          ? 'bg-orange-50/80 border-orange-200 dark:bg-orange-500/15 dark:border-orange-500/40'
          : 'bg-blue-50/80 border-blue-200 dark:bg-blue-500/15 dark:border-blue-500/40',
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
            isAlert ? 'bg-orange-100 dark:bg-orange-500/25' : 'bg-blue-100 dark:bg-blue-500/25'
          )}>
            <Clock className={cn("h-3 w-3", isAlert ? 'text-orange-600' : 'text-blue-600')} />
          </div>
          <p className={cn(
            "text-sm font-medium",
            isAlert ? 'text-orange-900 dark:text-orange-200' : 'text-blue-900 dark:text-blue-200'
          )}>
            {actionMessage}
          </p>
          {reminder.due_date && (
            <span className={cn(
              "text-xs ml-auto flex-shrink-0",
              overdue ? 'text-orange-700 font-medium' : 'text-blue-700'
            )}>
              {formatRelativeDueDate(reminder.due_date)}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {reminder.description && (
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
          {reminder.description}
        </p>
      )}

      {/* Location / Linked entity */}
      <div className="flex flex-col gap-0.5 text-sm text-muted-foreground mb-4">
        {linkedEntity && EntityIcon && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{linkedEntity.label}</span>
          </div>
        )}
        {assignedUser && (
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{assignedUser}</span>
          </div>
        )}
      </div>

      {/* Action Buttons — same pattern as InterventionCard */}
      {actions.length > 0 && (
        <div className="flex gap-2 mt-auto pt-4 border-t border-border">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant === 'primary' ? 'default' : 'outline'}
              size="default"
              onClick={action.onClick}
              className={cn(
                "flex-1 min-w-0 justify-center min-h-[44px]",
                action.variant === 'primary' && "bg-green-600 hover:bg-green-700 text-white",
              )}
              aria-label={`${action.label} le rappel ${reminder.title}`}
            >
              <action.icon className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
})
