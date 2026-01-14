/**
 * 📅 INTERVENTION CALENDAR UTILITIES
 *
 * Helper functions for calendar view operations:
 * - Date grouping and filtering
 * - Calendar data transformations
 * - Date range calculations
 * - Intervention counting by date
 */

import type { InterventionWithRelations } from '@/lib/services'

/**
 * 🗓️ CALENDAR DATE TYPE
 *
 * Represents a single date in the calendar with intervention data
 */
export interface CalendarDate {
  /** ISO date string (YYYY-MM-DD) */
  date: string
  /** Day of month (1-31) */
  day: number
  /** Whether this date is in the current month */
  isCurrentMonth: boolean
  /** Whether this date is today */
  isToday: boolean
  /** Whether this date is in the past */
  isPast: boolean
  /** Number of interventions on this date */
  interventionCount: number
  /** List of interventions on this date */
  interventions: InterventionWithRelations[]
  /** Highest urgency level on this date */
  maxUrgency: 'urgent' | 'haute' | 'normale' | 'faible' | null
}

/**
 * 📊 INTERVENTION DATE FIELD
 *
 * Which date field to use for calendar grouping
 */
export type InterventionDateField =
  | 'created_at'      // When intervention was created
  | 'scheduled_date'  // Planned execution date
  | 'completed_date'  // When work was finished
  | 'requested_date'  // When tenant requested it

/**
 * 📅 Get ISO date string from intervention
 *
 * Extracts the date from specified field and normalizes to YYYY-MM-DD format
 */
export function getInterventionDate(
  intervention: InterventionWithRelations,
  field: InterventionDateField = 'scheduled_date'
): string | null {
  const dateValue = intervention[field]

  if (!dateValue) {
    // Fallback to created_at if primary field is null
    return intervention.created_at
      ? new Date(intervention.created_at).toISOString().split('T')[0]
      : null
  }

  try {
    return new Date(dateValue).toISOString().split('T')[0]
  } catch {
    return null
  }
}

/**
 * 🗂️ Group interventions by date
 *
 * Groups interventions by specified date field into a Map
 *
 * @param interventions List of interventions to group
 * @param field Date field to group by (default: 'scheduled_date')
 * @returns Map of ISO date strings to intervention arrays
 *
 * @example
 * ```ts
 * const byDate = groupInterventionsByDate(interventions, 'scheduled_date')
 * const todayInterventions = byDate.get('2025-10-31') || []
 * ```
 */
export function groupInterventionsByDate(
  interventions: InterventionWithRelations[],
  field: InterventionDateField = 'scheduled_date'
): Map<string, InterventionWithRelations[]> {
  const grouped = new Map<string, InterventionWithRelations[]>()

  for (const intervention of interventions) {
    const date = getInterventionDate(intervention, field)

    if (!date) continue

    const existing = grouped.get(date) || []
    grouped.set(date, [...existing, intervention])
  }

  return grouped
}

/**
 * 🔢 Count interventions by date
 *
 * Returns a Map of ISO date strings to intervention counts
 *
 * @param interventions List of interventions to count
 * @param field Date field to group by (default: 'scheduled_date')
 * @returns Map of ISO date strings to counts
 */
export function countInterventionsByDate(
  interventions: InterventionWithRelations[],
  field: InterventionDateField = 'scheduled_date'
): Map<string, number> {
  const grouped = groupInterventionsByDate(interventions, field)
  const counts = new Map<string, number>()

  for (const [date, items] of grouped.entries()) {
    counts.set(date, items.length)
  }

  return counts
}

/**
 * 📆 Filter interventions by date range
 *
 * Returns interventions within specified date range (inclusive)
 *
 * @param interventions List of interventions to filter
 * @param startDate Start of date range (ISO string)
 * @param endDate End of date range (ISO string)
 * @param field Date field to filter by (default: 'scheduled_date')
 * @returns Filtered interventions
 */
export function filterInterventionsByDateRange(
  interventions: InterventionWithRelations[],
  startDate: string,
  endDate: string,
  field: InterventionDateField = 'scheduled_date'
): InterventionWithRelations[] {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return interventions.filter(intervention => {
    const date = getInterventionDate(intervention, field)
    if (!date) return false

    const interventionDate = new Date(date)
    return interventionDate >= start && interventionDate <= end
  })
}

/**
 * 🎯 Get interventions for specific date
 *
 * Returns all interventions on a specific date
 *
 * @param interventions List of interventions to search
 * @param date ISO date string (YYYY-MM-DD)
 * @param field Date field to match (default: 'scheduled_date')
 * @returns Interventions on specified date
 */
export function getInterventionsOnDate(
  interventions: InterventionWithRelations[],
  date: string,
  field: InterventionDateField = 'scheduled_date'
): InterventionWithRelations[] {
  return interventions.filter(intervention => {
    const interventionDate = getInterventionDate(intervention, field)
    return interventionDate === date
  })
}

/**
 * 🔴 Get highest urgency for date
 *
 * Determines the most urgent intervention on a given date
 *
 * @param interventions Interventions on this date
 * @returns Highest urgency level or null
 */
export function getMaxUrgencyForDate(
  interventions: InterventionWithRelations[]
): 'urgent' | 'haute' | 'normale' | 'faible' | null {
  if (interventions.length === 0) return null

  const urgencyOrder = ['urgent', 'haute', 'normale', 'faible'] as const

  for (const level of urgencyOrder) {
    if (interventions.some(i => i.urgency === level)) {
      return level
    }
  }

  return 'normale'
}

/**
 * 📅 Generate calendar month dates
 *
 * Generates array of CalendarDate objects for a given month
 * Includes padding days from previous/next months for complete weeks
 *
 * @param year Year (e.g., 2025)
 * @param month Month (1-12)
 * @param interventions List of interventions to include
 * @param field Date field to use for intervention matching
 * @returns Array of CalendarDate objects
 *
 * @example
 * ```ts
 * const dates = generateCalendarDates(2025, 10, interventions, 'scheduled_date')
 * // Returns 35-42 dates (5-6 weeks) including padding days
 * ```
 */
export function generateCalendarDates(
  year: number,
  month: number,
  interventions: InterventionWithRelations[],
  field: InterventionDateField = 'scheduled_date'
): CalendarDate[] {
  const dates: CalendarDate[] = []

  // First day of month
  const firstDay = new Date(year, month - 1, 1)
  const firstDayOfWeek = firstDay.getDay() // 0 = Sunday

  // Last day of month
  const lastDay = new Date(year, month, 0)
  const lastDate = lastDay.getDate()

  // Today for comparison
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Group interventions by date
  const interventionsByDate = groupInterventionsByDate(interventions, field)

  // Add padding days from previous month
  const prevMonthLastDay = new Date(year, month - 1, 0)
  const prevMonthLastDate = prevMonthLastDay.getDate()
  const paddingStart = prevMonthLastDate - firstDayOfWeek + 1

  for (let day = paddingStart; day <= prevMonthLastDate; day++) {
    const date = new Date(year, month - 2, day)
    const dateStr = date.toISOString().split('T')[0]
    const interventionsOnDate = interventionsByDate.get(dateStr) || []

    dates.push({
      date: dateStr,
      day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: date < today,
      interventionCount: interventionsOnDate.length,
      interventions: interventionsOnDate,
      maxUrgency: getMaxUrgencyForDate(interventionsOnDate)
    })
  }

  // Add current month days
  for (let day = 1; day <= lastDate; day++) {
    const date = new Date(year, month - 1, day)
    const dateStr = date.toISOString().split('T')[0]
    const interventionsOnDate = interventionsByDate.get(dateStr) || []

    dates.push({
      date: dateStr,
      day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isPast: date < today,
      interventionCount: interventionsOnDate.length,
      interventions: interventionsOnDate,
      maxUrgency: getMaxUrgencyForDate(interventionsOnDate)
    })
  }

  // Add padding days from next month to complete weeks
  const remainingDays = 7 - (dates.length % 7)
  if (remainingDays < 7) {
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const interventionsOnDate = interventionsByDate.get(dateStr) || []

      dates.push({
        date: dateStr,
        day,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: date < today,
        interventionCount: interventionsOnDate.length,
        interventions: interventionsOnDate,
        maxUrgency: getMaxUrgencyForDate(interventionsOnDate)
      })
    }
  }

  return dates
}

/**
 * 📊 Get calendar statistics
 *
 * Calculates statistics for interventions in a date range
 *
 * @param interventions List of interventions
 * @param startDate Start of range
 * @param endDate End of range
 * @param field Date field to analyze
 * @returns Statistics object
 */
export function getCalendarStatistics(
  interventions: InterventionWithRelations[],
  startDate: string,
  endDate: string,
  field: InterventionDateField = 'scheduled_date'
) {
  const filtered = filterInterventionsByDateRange(interventions, startDate, endDate, field)

  const byUrgency = {
    urgent: filtered.filter(i => i.urgency === 'urgent').length,
    haute: filtered.filter(i => i.urgency === 'haute').length,
    normale: filtered.filter(i => i.urgency === 'normale').length,
    faible: filtered.filter(i => i.urgency === 'faible').length
  }

  const byStatus = {
    demande: filtered.filter(i => i.status === 'demande').length,
    approuvee: filtered.filter(i => i.status === 'approuvee').length,
    planifiee: filtered.filter(i => i.status === 'planifiee').length,
    cloturee: filtered.filter(i =>
      i.status === 'cloturee_par_prestataire' ||
      i.status === 'cloturee_par_locataire' ||
      i.status === 'cloturee_par_gestionnaire'
    ).length
  }

  return {
    total: filtered.length,
    byUrgency,
    byStatus,
    daysWithInterventions: countInterventionsByDate(filtered, field).size
  }
}

/**
 * 🎨 Get urgency color class
 *
 * Returns Tailwind color class for urgency level
 *
 * @param urgency Urgency level
 * @returns Tailwind color class string
 */
export function getUrgencyColorClass(
  urgency: 'urgent' | 'haute' | 'normale' | 'faible' | null
): string {
  switch (urgency) {
    case 'urgent':
      return 'bg-red-500 hover:bg-red-600'
    case 'haute':
      return 'bg-orange-500 hover:bg-orange-600'
    case 'normale':
      return 'bg-blue-500 hover:bg-blue-600'
    case 'faible':
      return 'bg-gray-400 hover:bg-gray-500'
    default:
      return 'bg-gray-300 hover:bg-gray-400'
  }
}

/**
 * 📅 Format month name
 *
 * Returns French month name
 *
 * @param month Month number (1-12)
 * @returns French month name
 */
export function getMonthName(month: number): string {
  const names = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  return names[month - 1] || 'Mois invalide'
}

/**
 * 📅 Get week day names
 *
 * Returns array of French weekday abbreviations
 *
 * @returns Array of weekday names (starting Sunday)
 */
export function getWeekDayNames(): string[] {
  return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
}
