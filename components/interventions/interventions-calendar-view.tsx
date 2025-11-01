"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ChevronLeft, ChevronRight, Eye, Building2, MapPin, CalendarDays, CalendarRange, AlertCircle } from 'lucide-react'
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
  getPriorityColor,
  getPriorityLabel,
  getInterventionLocationText,
  getInterventionLocationIcon
} from '@/lib/intervention-utils'

/**
 * 📅 INTERVENTIONS CALENDAR VIEW - MONTH/WEEK TOGGLE + SIDE PANEL
 *
 * **Design Philosophy:**
 * - Toggle between monthly overview and weekly detail view
 * - Side panel shows interventions for selected date
 * - Color-coded urgency indicators (month view)
 * - Detailed daily columns (week view)
 *
 * **Features:**
 * ✅ Month view: Visual timeline across entire month
 * ✅ Week view: Detailed 7-day schedule
 * ✅ Toggle: Switch between perspectives instantly
 * ✅ Side panel: Consistent intervention details
 * ✅ Color-coded urgency: Quick priority scan
 * ✅ Responsive navigation: Previous/Next/Today buttons
 *
 * **Best for:**
 * - Planning and scheduling workflows
 * - Gestionnaires coordinating interventions
 * - Users who need both overview and detail
 * - Desktop users with wide screens
 */

type CalendarViewMode = 'month' | 'week'

interface InterventionsCalendarViewProps {
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

export function InterventionsCalendarView({
  interventions,
  userContext,
  dateField = 'scheduled_date',
  loading = false,
  className
}: InterventionsCalendarViewProps) {
  const router = useRouter()
  const today = new Date()

  // View mode state (month or week)
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>('month')

  // Month view state
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1) // 1-12
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  // Week view state (start of week = Monday)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  })

  /**
   * 📅 Month view: Generate calendar dates
   */
  const calendarDates = useMemo(
    () => generateCalendarDates(currentYear, currentMonth, interventions, dateField),
    [currentYear, currentMonth, interventions, dateField]
  )

  /**
   * 📅 Week view: Generate week days array
   */
  const weekDays = useMemo(() => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      days.push(date)
    }
    return days
  }, [weekStart])

  /**
   * 📅 Week view: Scroll container ref for auto-scroll to business hours
   */
  const weekTimelineRef = useRef<HTMLDivElement>(null)

  /**
   * 📅 Week view: Filter scheduled vs unscheduled interventions
   */
  const { scheduledInterventions, unscheduledCount } = useMemo(() => {
    const scheduled = interventions.filter((i) => {
      const dateValue = i[dateField as keyof InterventionWithRelations]
      return dateValue && dateValue !== null
    })
    const unscheduled = interventions.length - scheduled.length
    return { scheduledInterventions: scheduled, unscheduledCount: unscheduled }
  }, [interventions, dateField])

  /**
   * 📅 Week view: Auto-scroll to business hours on mount and mode change
   */
  useEffect(() => {
    if (calendarMode === 'week' && weekTimelineRef.current) {
      // Scroll to 8am (8 hours * 48px per hour = 384px)
      const HOUR_HEIGHT = 48
      const BUSINESS_HOUR_START = 8
      setTimeout(() => {
        weekTimelineRef.current?.scrollTo({
          top: BUSINESS_HOUR_START * HOUR_HEIGHT,
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [calendarMode])

  /**
   * 🎯 Get interventions for selected date
   */
  const selectedDateStr = selectedDate.toISOString().split('T')[0]
  const selectedInterventions = useMemo(
    () => getInterventionsOnDate(interventions, selectedDateStr, dateField),
    [interventions, selectedDateStr, dateField]
  )

  /**
   * 🎯 Week view: Get SCHEDULED interventions grouped by day with time positioning
   */
  const interventionsByDay = useMemo(() => {
    const grouped: Record<string, Array<InterventionWithRelations & { topPosition: number; height: number }>> = {}

    weekDays.forEach((day) => {
      const dateStr = day.toISOString().split('T')[0]
      const dayInterventions = getInterventionsOnDate(scheduledInterventions, dateStr, dateField)

      // Calculate position and height for each intervention
      grouped[dateStr] = dayInterventions.map((intervention) => {
        const dateValue = intervention[dateField as keyof InterventionWithRelations] as string | undefined
        const interventionDate = dateValue ? new Date(dateValue) : null

        let hour = 0
        let minute = 0

        if (interventionDate) {
          hour = interventionDate.getHours()
          minute = interventionDate.getMinutes()
        }

        const HOUR_HEIGHT = 48 // pixels per hour
        const topPosition = (hour + minute / 60) * HOUR_HEIGHT

        // Default height: 1 hour (48px)
        // TODO: Use actual duration if available
        const height = HOUR_HEIGHT

        return {
          ...intervention,
          topPosition,
          height
        }
      })
    })

    return grouped
  }, [weekDays, scheduledInterventions, dateField])

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
   * 🎨 Get type label and badge color
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
   * ⬅️➡️ Navigation functions
   */
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToPreviousWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() - 7)
    setWeekStart(newStart)
  }

  const goToNextWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() + 7)
    setWeekStart(newStart)
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth() + 1)
    setSelectedDate(now)

    // Also update week view
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    setWeekStart(new Date(now.setDate(diff)))
  }

  /**
   * 🗓️ Get week range text
   */
  const weekRangeText = useMemo(() => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const startMonth = weekStart.getMonth() + 1
    const endMonth = weekEnd.getMonth() + 1

    if (startMonth === endMonth) {
      return `${weekStart.getDate()}-${weekEnd.getDate()} ${getMonthName(startMonth)} ${weekStart.getFullYear()}`
    } else {
      return `${weekStart.getDate()} ${getMonthName(startMonth)} - ${weekEnd.getDate()} ${getMonthName(endMonth)} ${weekStart.getFullYear()}`
    }
  }, [weekStart])

  if (loading) {
    return (
      <div className="flex gap-4 h-[400px]">
        <div className="flex-1 animate-pulse bg-gray-200 rounded-lg" />
        <div className="w-[350px] animate-pulse bg-gray-200 rounded-lg" />
      </div>
    )
  }

  return (
    <div className={`flex gap-4 ${className}`}>
      {/* LEFT PANEL - Calendar (Month or Week) */}
      <div className="flex-1 border border-slate-200 rounded-lg bg-white p-4">
        {/* Calendar Header with Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900">
              {calendarMode === 'month'
                ? `${getMonthName(currentMonth)} ${currentYear}`
                : weekRangeText
              }
            </h3>

            {/* Month/Week Toggle */}
            <ToggleGroup
              type="single"
              value={calendarMode}
              onValueChange={(value) => {
                if (value) setCalendarMode(value as CalendarViewMode)
              }}
              className="border border-slate-200 rounded-md"
            >
              <ToggleGroupItem
                value="month"
                aria-label="Vue mois"
                className="h-7 px-2 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                title="Vue mois"
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Mois</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="week"
                aria-label="Vue semaine"
                className="h-7 px-2 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
                title="Vue semaine"
              >
                <CalendarRange className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Semaine</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={calendarMode === 'month' ? goToPreviousMonth : goToPreviousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={goToToday}
            >
              Aujourd'hui
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={calendarMode === 'month' ? goToNextMonth : goToNextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* MONTH VIEW */}
        {calendarMode === 'month' && (
          <>
            <div className="grid grid-cols-7 gap-1">
              {/* Week day headers */}
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-slate-500 py-1"
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
                      relative h-12 p-1 border border-slate-200 rounded cursor-pointer
                      transition-colors
                      ${dateInfo.isCurrentMonth ? 'bg-white' : 'bg-slate-50'}
                      ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                      ${dateInfo.isToday ? 'font-bold' : ''}
                      hover:bg-slate-100
                    `}
                    onClick={() => setSelectedDate(new Date(dateInfo.date))}
                  >
                    <div
                      className={`text-xs text-center ${
                        dateInfo.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {dateInfo.day}
                    </div>

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
          </>
        )}

        {/* WEEK VIEW - Google Calendar-style 24h Timeline */}
        {calendarMode === 'week' && (
          <>
            {/* Unscheduled Interventions Counter */}
            {unscheduledCount > 0 && (
              <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">
                    {unscheduledCount} intervention{unscheduledCount > 1 ? 's' : ''} à planifier
                  </span>
                </div>
              </div>
            )}

            {/* Timeline Container */}
            <div className="overflow-x-auto -mx-4">
              <div className="min-w-[800px]">
                {/* Day Headers */}
                <div className="flex border-b border-slate-200">
                  {/* Empty corner for time labels */}
                  <div className="w-16 flex-shrink-0 border-r border-slate-200" />

                  {/* Day columns headers */}
                  <div className="flex-1 grid grid-cols-7">
                    {weekDays.map((day) => {
                      const dateStr = day.toISOString().split('T')[0]
                      const isToday = dateStr === today.toISOString().split('T')[0]
                      const count = interventionsByDay[dateStr]?.length || 0

                      return (
                        <div
                          key={dateStr}
                          className={`p-2 border-r border-slate-200 last:border-r-0 ${
                            isToday ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium text-slate-600">
                              {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                            </div>
                            <div
                              className={`text-lg font-bold ${
                                isToday ? 'text-blue-600' : 'text-slate-900'
                              }`}
                            >
                              {day.getDate()}
                            </div>
                            {count > 0 && (
                              <div className="text-[10px] text-slate-500">
                                {count} intervention{count > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Timeline Grid (24 hours) */}
                <div
                  ref={weekTimelineRef}
                  className="flex max-h-[500px] overflow-y-auto"
                >
                  {/* Time Labels Column */}
                  <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div
                        key={hour}
                        className="h-12 border-b border-slate-100 flex items-start justify-end pr-2 pt-1"
                      >
                        <span className="text-[10px] text-slate-500 font-medium">
                          {hour.toString().padStart(2, '0')}h
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day Columns with Interventions */}
                  <div className="flex-1 grid grid-cols-7 relative">
                    {weekDays.map((day) => {
                      const dateStr = day.toISOString().split('T')[0]
                      const isToday = dateStr === today.toISOString().split('T')[0]
                      const dayInterventions = interventionsByDay[dateStr] || []

                      return (
                        <div
                          key={dateStr}
                          className={`border-r border-slate-200 last:border-r-0 relative ${
                            isToday ? 'bg-blue-50/20' : ''
                          }`}
                        >
                          {/* Hour grid lines */}
                          {Array.from({ length: 24 }, (_, hour) => (
                            <div
                              key={hour}
                              className="h-12 border-b border-slate-100"
                            />
                          ))}

                          {/* Interventions positioned absolutely */}
                          {dayInterventions.map((intervention) => {
                            const urgencyColor = getUrgencyColorClass(intervention.urgency || 'normale')

                            return (
                              <div
                                key={intervention.id}
                                className={`absolute left-0.5 right-0.5 ${urgencyColor.replace('hover:', '')} rounded px-1 py-0.5 cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
                                style={{
                                  top: `${intervention.topPosition}px`,
                                  height: `${intervention.height}px`
                                }}
                                onClick={() => {
                                  setSelectedDate(day)
                                  router.push(getInterventionUrl(intervention.id))
                                }}
                                title={intervention.title}
                              >
                                <div className="text-[10px] font-medium text-white leading-tight line-clamp-2">
                                  {intervention.title}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend (identical to month view) */}
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
          </>
        )}
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
                    <h4 className="font-medium text-sm text-slate-900 mb-2 line-clamp-2">
                      {intervention.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge className={`${getTypeBadgeColor(intervention.type || 'autre')} text-xs px-1.5 py-0 border`}>
                        {getTypeLabel(intervention.type || 'autre')}
                      </Badge>
                      <Badge className={`${getStatusColor(intervention.status)} text-xs px-1.5 py-0`}>
                        {getStatusLabel(intervention.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                      {locationIcon === 'building' ? (
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span className="truncate">{locationText}</span>
                    </div>

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
 * **Combined Month/Week View Benefits:**
 *
 * This component combines the best of both worlds:
 * - **Month view**: Big picture overview, identify patterns
 * - **Week view**: Detailed daily schedule, short-term planning
 * - **Instant toggle**: Switch perspectives without losing context
 *
 * **Design Decisions:**
 *
 * 1. **Toggle Position:**
 *    - Placed next to month/week title for clarity
 *    - Uses ToggleGroup pattern (same as view switcher)
 *    - Icons + text labels for explicit meaning
 *
 * 2. **Consistent Side Panel:**
 *    - Same panel for both month and week views
 *    - Selected date updates in both modes
 *    - Smooth transition between modes
 *
 * 3. **Week View Optimization:**
 *    - Compact 7-column grid (700px min-width)
 *    - Mini intervention cards show urgency badge
 *    - Click day column to select and see full details in panel
 *
 * 4. **Navigation Logic:**
 *    - Previous/Next adapt to current mode (month or week)
 *    - "Aujourd'hui" button resets both month and week state
 *    - Selected date persists across mode switches
 *
 * **When to Use Each View:**
 * - **Month**: Planning ahead, identifying busy periods
 * - **Week**: Current/next week detail, daily coordination
 * - **Toggle**: Drill down from month to week, zoom out from week
 *
 * ─────────────────────────────────────────────────
 */
