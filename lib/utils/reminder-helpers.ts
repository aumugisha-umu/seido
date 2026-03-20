import type { ReminderWithRelations, ReminderPriority, ReminderStatus } from '@/lib/types/reminder.types'

// ============================================================================
// BADGE STYLE CONSTANTS
// ============================================================================

export const REMINDER_PRIORITY_BADGE_STYLES: Record<ReminderPriority, string> = {
  haute: 'bg-red-100 text-red-800 border-red-200',
  normale: 'bg-blue-100 text-blue-800 border-blue-200',
  basse: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const REMINDER_STATUS_BADGE_STYLES: Record<ReminderStatus, string> = {
  en_attente: 'bg-blue-100 text-blue-800 border-blue-200',
  en_cours: 'bg-amber-100 text-amber-800 border-amber-200',
  termine: 'bg-green-100 text-green-800 border-green-200',
  annule: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const REMINDER_ICON_BG_COLORS: Record<ReminderPriority, string> = {
  haute: 'bg-red-500',
  normale: 'bg-amber-500',
  basse: 'bg-gray-400',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function isReminderOverdue(reminder: ReminderWithRelations): boolean {
  if (!reminder.due_date) return false
  const status = reminder.status as ReminderStatus
  if (status !== 'en_attente' && status !== 'en_cours') return false
  return new Date(reminder.due_date) < new Date()
}

export function formatRelativeDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Demain'
  if (diffDays === -1) return 'Hier'
  if (diffDays < -1) return `Il y a ${Math.abs(diffDays)} jours`
  if (diffDays <= 7) return `Dans ${diffDays} jours`

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export type ReminderEntityType = 'building' | 'lot' | 'contact'

export function getReminderLinkedEntity(
  reminder: ReminderWithRelations
): { label: string; type: ReminderEntityType } | null {
  if (reminder.building) {
    return { label: reminder.building.name, type: 'building' }
  }
  if (reminder.lot) {
    return { label: reminder.lot.reference, type: 'lot' }
  }
  if (reminder.contact) {
    const name = reminder.contact.first_name && reminder.contact.last_name
      ? `${reminder.contact.first_name} ${reminder.contact.last_name}`
      : reminder.contact.name
    return { label: name, type: 'contact' }
  }
  return null
}

export function getReminderAssigneeName(reminder: ReminderWithRelations): string | null {
  if (!reminder.assigned_user) return null
  const { first_name, last_name, name } = reminder.assigned_user
  if (first_name && last_name) {
    return `${first_name} ${last_name}`
  }
  if (first_name || last_name) {
    return [first_name, last_name].filter(Boolean).join(' ')
  }
  return name
}

export function getReminderActionMessage(status: ReminderStatus, overdue: boolean): string {
  if (overdue) return 'En retard — action requise'
  switch (status) {
    case 'en_attente': return 'En attente de traitement'
    case 'en_cours': return 'Rappel en cours'
    case 'termine': return 'Rappel termine'
    case 'annule': return 'Rappel annule'
    default: return ''
  }
}
