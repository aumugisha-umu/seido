'use client'

import { cn } from '@/lib/utils'
import { Wrench, Bell, Bot } from 'lucide-react'

export type TaskType = 'assistant_ia' | 'intervention' | 'rappel'

interface TaskTypeSegmentProps {
  activeType: TaskType
  onTypeChange: (type: TaskType) => void
  assistantIaCount?: number
  interventionCount?: number
  reminderCount?: number
  className?: string
}

const segments: {
  type: TaskType
  label: string
  icon: typeof Wrench
  activeClasses: string
}[] = [
  {
    type: 'assistant_ia',
    label: 'Assistant IA',
    icon: Bot,
    activeClasses: 'bg-emerald-600 text-white dark:bg-emerald-500',
  },
  {
    type: 'intervention',
    label: 'Interventions',
    icon: Wrench,
    activeClasses: 'bg-primary text-primary-foreground',
  },
  {
    type: 'rappel',
    label: 'Rappels',
    icon: Bell,
    activeClasses: 'bg-amber-500 text-white dark:bg-amber-600',
  },
]

export function TaskTypeSegment({
  activeType,
  onTypeChange,
  assistantIaCount,
  interventionCount,
  reminderCount,
  className,
}: TaskTypeSegmentProps) {
  const counts: Record<TaskType, number | undefined> = {
    assistant_ia: assistantIaCount,
    intervention: interventionCount,
    rappel: reminderCount,
  }

  return (
    <div className={cn('flex gap-2', className)} role="tablist" aria-label="Type de tache">
      {segments.map(({ type, label, icon: Icon, activeClasses }) => {
        const isActive = activeType === type
        const count = counts[type]

        return (
          <button
            key={type}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${type}`}
            onClick={() => onTypeChange(type)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isActive
                ? activeClasses
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
            {count != null && count > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold min-w-[1.25rem]',
                  isActive
                    ? 'bg-white/20 text-inherit'
                    : type === 'assistant_ia'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-background text-foreground'
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
