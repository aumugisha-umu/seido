'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Eye,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  Home,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigationPending } from '@/hooks/use-navigation-pending'
import type { ReminderWithRelations } from '@/lib/types/reminder.types'
import {
  REMINDER_PRIORITY_LABELS,
  REMINDER_STATUS_LABELS,
  type ReminderPriority,
  type ReminderStatus,
} from '@/lib/types/reminder.types'
import {
  REMINDER_PRIORITY_BADGE_STYLES,
  REMINDER_STATUS_BADGE_STYLES,
  isReminderOverdue,
  formatRelativeDueDate,
  getReminderLinkedEntity,
  getReminderAssigneeName,
} from '@/lib/utils/reminder-helpers'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface RemindersListViewProps {
  reminders: ReminderWithRelations[]
  onStart?: (id: string) => void
  onComplete?: (id: string) => void
  onCancel?: (id: string) => void
}

type SortColumn = 'title' | 'priority' | 'status' | 'due_date' | 'linked_entity' | 'assigned_user'
type SortDirection = 'asc' | 'desc'

// ============================================================================
// ICON MAPPING
// ============================================================================

const ENTITY_ICONS = { building: Building2, lot: Home, contact: User } as const

// ============================================================================
// SORT HELPERS
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = { haute: 0, normale: 1, basse: 2 }
const STATUS_ORDER: Record<string, number> = { en_attente: 0, en_cours: 1, termine: 2, annule: 3 }

function getSortValue(reminder: ReminderWithRelations, column: SortColumn): string | number {
  switch (column) {
    case 'title':
      return reminder.title?.toLowerCase() || ''
    case 'priority':
      return PRIORITY_ORDER[reminder.priority as string] ?? 1
    case 'status':
      return STATUS_ORDER[reminder.status as string] ?? 0
    case 'due_date':
      return reminder.due_date ? new Date(reminder.due_date).getTime() : Infinity
    case 'linked_entity': {
      const entity = getReminderLinkedEntity(reminder)
      return entity?.label.toLowerCase() || ''
    }
    case 'assigned_user':
      return getReminderAssigneeName(reminder)?.toLowerCase() || ''
    default:
      return ''
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RemindersListView({ reminders, onStart, onComplete, onCancel }: RemindersListViewProps) {
  const { isPending, navigate } = useNavigationPending()
  const [sortColumn, setSortColumn] = useState<SortColumn>('due_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = useCallback((column: SortColumn) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection('asc')
      return column
    })
  }, [])

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn)
      const bVal = getSortValue(b, sortColumn)

      if (aVal === bVal) return 0

      const comparison = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal))

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [reminders, sortColumn, sortDirection])

  const handleRowClick = useCallback((id: string) => {
    navigate(`/gestionnaire/operations/rappels/${id}`)
  }, [navigate])

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 ml-0.5 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-primary" />
  }

  const renderSortableHeader = (column: SortColumn, label: string, width: string) => (
    <div className={cn('px-3 py-2 flex-shrink-0', width)} role="columnheader">
      <button
        type="button"
        className="flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        onClick={() => handleSort(column)}
      >
        {label}
        {renderSortIcon(column)}
      </button>
    </div>
  )

  return (
    <div className="rounded-md border" role="table">
      {/* Header */}
      <div className="flex bg-muted/50 border-b sticky top-0 z-10" role="row">
        {renderSortableHeader('title', 'Titre', 'flex-1 min-w-0')}
        {renderSortableHeader('priority', 'Priorite', 'w-[90px]')}
        {renderSortableHeader('status', 'Statut', 'w-[100px]')}
        {renderSortableHeader('due_date', 'Echeance', 'w-[110px]')}
        {renderSortableHeader('linked_entity', 'Bien lie', 'w-[150px]')}
        {renderSortableHeader('assigned_user', 'Assigne a', 'w-[120px]')}
        <div className="w-[80px] px-3 py-2 flex-shrink-0" role="columnheader" />
      </div>

      {/* Body */}
      <div className="divide-y" role="rowgroup">
        {sortedReminders.map((reminder) => {
          const overdue = isReminderOverdue(reminder)
          const status = reminder.status as ReminderStatus
          const priority = reminder.priority as ReminderPriority
          const linkedEntity = getReminderLinkedEntity(reminder)
          const assignedUser = getReminderAssigneeName(reminder)
          const hasRecurrence = !!reminder.recurrence_rule_id
          const EntityIcon = linkedEntity ? ENTITY_ICONS[linkedEntity.type] : null

          return (
            <div
              key={reminder.id}
              className={cn(
                'flex items-center cursor-pointer transition-colors hover:bg-accent/50',
                overdue && 'bg-red-50',
              )}
              role="row"
              onClick={() => handleRowClick(reminder.id)}
            >
              {/* Titre */}
              <div className="flex-1 min-w-0 px-3 py-2.5" role="cell">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm truncate">{reminder.title}</span>
                  {hasRecurrence && (
                    <RefreshCw
                      className="h-3.5 w-3.5 text-amber-600 flex-shrink-0"
                      aria-label="Rappel recurrent"
                    />
                  )}
                </div>
              </div>

              {/* Priorite */}
              <div className="w-[90px] px-3 py-2.5 flex-shrink-0" role="cell">
                <Badge
                  variant="outline"
                  className={cn('text-xs', REMINDER_PRIORITY_BADGE_STYLES[priority])}
                >
                  {REMINDER_PRIORITY_LABELS[priority]}
                </Badge>
              </div>

              {/* Statut */}
              <div className="w-[100px] px-3 py-2.5 flex-shrink-0" role="cell">
                <Badge
                  variant="outline"
                  className={cn('text-xs', REMINDER_STATUS_BADGE_STYLES[status])}
                >
                  {REMINDER_STATUS_LABELS[status]}
                </Badge>
              </div>

              {/* Echeance */}
              <div className="w-[110px] px-3 py-2.5 flex-shrink-0" role="cell">
                {reminder.due_date ? (
                  <span className={cn(
                    'flex items-center gap-1 text-sm',
                    overdue ? 'text-red-600 font-medium' : 'text-muted-foreground',
                  )}>
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    {formatRelativeDueDate(reminder.due_date)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>

              {/* Bien lie */}
              <div className="w-[150px] px-3 py-2.5 flex-shrink-0" role="cell">
                {linkedEntity && EntityIcon ? (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <EntityIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{linkedEntity.label}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>

              {/* Assigne a */}
              <div className="w-[120px] px-3 py-2.5 flex-shrink-0" role="cell">
                {assignedUser ? (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{assignedUser}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>

              {/* Actions */}
              <div
                className="w-[80px] px-2 py-2.5 flex-shrink-0"
                role="cell"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    disabled={isPending}
                    onClick={() => handleRowClick(reminder.id)}
                    aria-label="Voir le rappel"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={isPending}
                        aria-label="Actions du rappel"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {status === 'en_attente' && onStart && (
                        <DropdownMenuItem onClick={() => onStart(reminder.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Commencer
                        </DropdownMenuItem>
                      )}
                      {(status === 'en_attente' || status === 'en_cours') && onComplete && (
                        <DropdownMenuItem onClick={() => onComplete(reminder.id)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Terminer
                        </DropdownMenuItem>
                      )}
                      {(status === 'en_attente' || status === 'en_cours') && onCancel && (
                        <DropdownMenuItem onClick={() => onCancel(reminder.id)} className="text-destructive">
                          <XCircle className="h-4 w-4 mr-2" />
                          Annuler
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
