'use client'

import { ReminderCard } from '@/components/operations/reminder-card'
import { RemindersListView } from '@/components/operations/reminders-list-view'
import type { ReminderWithRelations } from '@/lib/types/reminder.types'
import type { ViewMode } from '@/hooks/use-view-mode'

interface RemindersViewContainerProps {
  reminders: ReminderWithRelations[]
  viewMode?: ViewMode
  onStart?: (id: string) => void
  onComplete?: (id: string) => void
  onCancel?: (id: string) => void
}

export function RemindersViewContainer({
  reminders,
  viewMode = 'cards',
  onStart,
  onComplete,
  onCancel,
}: RemindersViewContainerProps) {
  if (reminders.length === 0) return null

  if (viewMode === 'list') {
    return (
      <RemindersListView
        reminders={reminders}
        onStart={onStart}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-1 pb-4">
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          onStart={onStart}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      ))}
      </div>
    </div>
  )
}
