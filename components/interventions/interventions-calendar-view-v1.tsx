"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, Eye, Building2, MapPin } from 'lucide-react'
import type { InterventionWithRelations } from '@/lib/services'
import {
  generateCalendarDates,
  getMonthName,
  getUrgencyColorClass,
  getInterventionsOnDate,
  type InterventionDateField
} from '@/lib/intervention-calendar-utils'
import {
  getStatusColor,
  getStatusLabel,
  getPriorityLabel,
  getInterventionLocationText,
  getInterventionLocationIcon
} from '@/lib/intervention-utils'

/**
 * 📅 INTERVENTIONS CALENDAR VIEW V1 - MONTH + SIDE PANEL (RECOMMENDED)
 *
 * **Design Philosophy:**
 * - Monthly calendar with intervention markers
 * - Side panel shows interventions for selected date
 * - Color-coded urgency indicators
 * - Desktop-optimized split layout
 *
 * **Pros:**
 * ✅ Visual timeline (see interventions across month)
 * ✅ Color-coded urgency (quick priority scan)
 * ✅ Date-based filtering (find interventions by date)
 * ✅ Planning-friendly (schedule coordination)
 * ✅ Intuitive calendar interaction
 *
 * **Cons:**
 * ❌ Requires wide screen (desktop-first)
 * ❌ Limited info per intervention (just markers)
 * ❌ Monthly scope only (can't see beyond month)
 * ❌ Small touch targets on mobile
 *
 * **Best for:**
 * - Planning and scheduling workflows
 * - Gestionnaires coordinating interventions
 * - Users who think in terms of dates/calendar
 * - Identifying busy periods at a glance
 * - Desktop users with wide screens
 */

interface InterventionsCalendarViewV1Props {
  /** List of interventions to display */
  interventions: InterventionWithRelations[]
  /** User role context for URL generation */
  userContext: 'gestionnaire' | 'prestataire' | 'locataire'
  /** Which date field to use for calendar display */
  dateField?: InterventionDateField
  /** Whether component is in loading state */
  loading?: boolean
  /** Optional CSS classes */
  className?: string
}

export function InterventionsCalendarViewV1({
  interventions,
  userContext,
  dateField = 'scheduled_date',
  loading = false,
  className
}: InterventionsCalendarViewV1Props) {
  const router = useRouter()
  const today = new Date()

  // Calendar state
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1) // 1-12
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  /**
   * 📅 Generate calendar dates with intervention data
   */
  const calendarDates = useMemo(
    () => generateCalendarDates(currentYear, currentMonth, interventions, dateField),
    [currentYear, currentMonth, interventions, dateField]
  )

  /**
   * 🎯 Get interventions for selected date
   */
  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  const selectedInterventions = useMemo(
    () => getInterventionsOnDate(interventions, selectedDateStr, dateField),
    [interventions, selectedDateStr, dateField]
  )

  /**
   * 🔗 Get intervention URL
   */
  const getInterventionUrl = (interventionId: string) => {
    switch (userContext) {
      case 'prestataire':
        return `/prestataire/interventions/${interventionId}`
      case 'locataire':
        return `/locataire/interventions/${interventionId}`
      case 'gestionnaire':
      default:
        return `/gestionnaire/interventions/${interventionId}`
    }
  }

  /**
   * 🎨 Get type label
   */
  const getTypeLabel = (_type: string) => {
    const labels: Record<string, string> = {
      plomberie: 'Plomberie',
      electricite: 'Électricité',
      chauffage: 'Chauffage',
      serrurerie: 'Serrurerie',
      peinture: 'Peinture',
      maintenance: 'Maintenance',
      autre: 'Autre'
    }
    return labels[_type?.toLowerCase()] || 'Autre'
  }

  /**
   * 🎨 Get type badge color
   */
  const getTypeBadgeColor = (_type: string) => {
    const colors: Record<string, string> = {
      plomberie: 'bg-blue-100 text-blue-800 border-blue-200',
      electricite: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      chauffage: 'bg-red-100 text-red-800 border-red-200',
      serrurerie: 'bg-gray-100 text-gray-800 border-gray-200',
      peinture: 'bg-purple-100 text-purple-800 border-purple-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
      autre: 'bg-slate-100 text-slate-800 border-slate-200'
    }
    return colors[_type?.toLowerCase()] || 'bg-slate-100 text-slate-800 border-slate-200'
  }

  /**
   * ⬅️ Navigate to previous month
   */
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  /**
   * ➡️ Navigate to next month
   */
  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  if (loading) {
    return (
      <div className="flex gap-4 h-[600px]">
        <div className="flex-1 animate-pulse bg-gray-200 rounded-lg" />
        <div className="w-[350px] animate-pulse bg-gray-200 rounded-lg" />
      </div>
    )
  }

  return (
    <div className={`flex gap-4 ${className}`}>
      {/* LEFT PANEL - Calendar */}
      <div className="flex-1 border border-slate-200 rounded-lg bg-white p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {getMonthName(currentMonth)} {currentYear}
          </h3>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => {
                const now = new Date()
                setCurrentYear(now.getFullYear())
                setCurrentMonth(now.getMonth() + 1)
                setSelectedDate(now)
              }}
            >
              Aujourd'hui
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-slate-500 py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar dates */}
          {calendarDates.map((dateInfo) => {
            const isSelected = dateInfo.date === selectedDateStr
            const hasInterventions = dateInfo.interventionCount > 0
            const urgencyColor = hasInterventions
              ? getUrgencyColorClass(dateInfo.maxUrgency)
              : ''

            return (
              <div
                key={dateInfo.date}
                className={`
                  relative aspect-square p-1 border border-slate-200 rounded cursor-pointer
                  transition-colors
                  ${dateInfo.isCurrentMonth ? 'bg-white' : 'bg-slate-50'}
                  ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                  ${dateInfo.isToday ? 'font-bold' : ''}
                  hover:bg-slate-100
                `}
                onClick={() => setSelectedDate(new Date(dateInfo.date))}
              >
                {/* Day number */}
                <div
                  className={`text-xs text-center ${
                    dateInfo.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {dateInfo.day}
                </div>

                {/* Intervention marker */}
                {hasInterventions && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${urgencyColor.replace('hover:', '')}`}
                      title={`${dateInfo.interventionCount} intervention(s)`}
                    />
                    {dateInfo.interventionCount > 1 && (
                      <span className="text-[8px] text-slate-600 font-medium">
                        {dateInfo.interventionCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-slate-700">Légende :</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-slate-600">Urgent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-slate-600">Haute</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-slate-600">Normale</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-slate-600">Faible</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Interventions for selected date */}
      <div className="w-[350px] border border-slate-200 rounded-lg bg-white flex flex-col">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-sm text-slate-900 mb-1">
            {selectedDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </h3>
          <p className="text-xs text-slate-600">
            {selectedInterventions.length === 0
              ? 'Aucune intervention'
              : selectedInterventions.length === 1
              ? '1 intervention'
              : `${selectedInterventions.length} interventions`}
          </p>
        </div>

        {/* Panel Content */}
        <ScrollArea className="flex-1">
          {selectedInterventions.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              Aucune intervention prévue ce jour
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {selectedInterventions.map((intervention) => {
                const locationText = getInterventionLocationText(intervention as any)
                const locationIcon = getInterventionLocationIcon(intervention as any)

                return (
                  <div
                    key={intervention.id}
                    className="p-3 border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => router.push(getInterventionUrl(intervention.id))}
                  >
                    {/* Title */}
                    <h4 className="font-medium text-sm text-slate-900 mb-2 line-clamp-2">
                      {intervention.title}
                    </h4>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge className={`${getTypeBadgeColor(intervention.type || 'autre')} text-xs px-1.5 py-0 border`}>
                        {getTypeLabel(intervention.type || 'autre')}
                      </Badge>
                      <Badge className={`${getStatusColor(intervention.status)} text-xs px-1.5 py-0`}>
                        {getStatusLabel(intervention.status)}
                      </Badge>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                      {locationIcon === 'building' ? (
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{locationText}</span>
                    </div>

                    {/* Action Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs mt-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(getInterventionUrl(intervention.id))
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1.5" />
                      Voir les détails
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Calendar View Benefits:**
 *
 * Calendars excel at:
 * - Time-based visualization (see patterns across days/weeks)
 * - Scheduling coordination (avoid conflicts, find free slots)
 * - Deadline awareness (upcoming interventions at a glance)
 * - Urgency indication (color-coded markers)
 *
 * **Design Decisions:**
 *
 * 1. **Color-Coded Urgency Markers:**
 *    - Red = Urgent (immediate attention)
 *    - Orange = High priority
 *    - Blue = Normal priority
 *    - Gray = Low priority
 *    - Industry standard (Google Calendar, Outlook)
 *
 * 2. **Side Panel Pattern:**
 *    - Shows interventions for selected date without page transition
 *    - Similar to Google Calendar's agenda sidebar
 *    - Desktop-optimized (requires ~900px min width)
 *
 * 3. **Selected Date Field:**
 *    - Default: 'scheduled_date' (when intervention is planned)
 *    - Alternative: 'created_at' (when intervention was requested)
 *    - Flexible based on workflow needs
 *
 * **When to Use Calendar View:**
 * - Planning and scheduling workflows
 * - Coordinating multiple interventions
 * - Finding available time slots
 * - Identifying busy/free periods
 * - Desktop users managing schedules
 *
 * **Performance Note:**
 * generateCalendarDates() runs on month/year change (typically 35-42 cells).
 * For 100 interventions, this is <1ms. For 1000+ interventions, consider
 * memoizing per month or using a date index for O(1) lookups.
 *
 * ─────────────────────────────────────────────────
 */
