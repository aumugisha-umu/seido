"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import type { InterventionWithRelations } from '@/lib/services'
import {
  getMonthName,
  getInterventionsOnDate,
  type InterventionDateField
} from '@/lib/intervention-calendar-utils'
import {
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel
} from '@/lib/intervention-utils'

/**
 * 📅 INTERVENTIONS CALENDAR VIEW V3 - WEEK VIEW
 *
 * **Design Philosophy:**
 * - Weekly timeline showing 7 days
 * - Interventions displayed as blocks per day
 * - Detailed view of daily schedule
 * - Similar to Google Calendar week view
 *
 * **Pros:**
 * ✅ Detailed weekly schedule
 * ✅ See multiple days side-by-side
 * ✅ Better for short-term planning
 * ✅ Clear daily distribution of interventions
 * ✅ More info visible than month view
 *
 * **Cons:**
 * ❌ Limited to one week at a time
 * ❌ Requires horizontal scroll on mobile
 * ❌ Less overview than month view
 * ❌ Desktop-optimized (needs wide screen)
 *
 * **Best for:**
 * - Short-term planning (current/next week)
 * - Desktop users with wide screens
 * - Detailed daily schedule review
 * - Coordinating multiple interventions per day
 * - When day-by-day detail is important
 */

interface InterventionsCalendarViewV3Props {
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

export function InterventionsCalendarViewV3({
  interventions,
  userContext,
  dateField = 'scheduled_date',
  loading = false,
  className
}: InterventionsCalendarViewV3Props) {
  const router = useRouter()
  const today = new Date()

  // Week navigation state (start of week = Monday)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(today)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    return new Date(d.setDate(diff))
  })

  /**
   * 📅 Generate week days array
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
   * 🎯 Get interventions grouped by day
   */
  const interventionsByDay = useMemo(() => {
    const grouped: Record<string, InterventionWithRelations[]> = {}
    weekDays.forEach((day) => {
      const dateStr = day.toISOString().split('T')[0]
      grouped[dateStr] = getInterventionsOnDate(interventions, dateStr, dateField)
    })
    return grouped
  }, [weekDays, interventions, dateField])

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
   * ⬅️ Navigate to previous week
   */
  const goToPreviousWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() - 7)
    setWeekStart(newStart)
  }

  /**
   * ➡️ Navigate to next week
   */
  const goToNextWeek = () => {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() + 7)
    setWeekStart(newStart)
  }

  /**
   * 🔄 Go to current week
   */
  const goToToday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    setWeekStart(new Date(d.setDate(diff)))
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
    return <div className="h-[600px] animate-pulse bg-gray-200 rounded-lg" />
  }

  return (
    <div className={`border border-slate-200 rounded-lg bg-white ${className}`}>
      {/* HEADER */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{weekRangeText}</h3>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={goToToday}>
              Aujourd'hui
            </Button>

            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* WEEK GRID */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {weekDays.map((day) => {
              const dateStr = day.toISOString().split('T')[0]
              const isToday = dateStr === today.toISOString().split('T')[0]
              const count = interventionsByDay[dateStr]?.length || 0

              return (
                <div
                  key={dateStr}
                  className={`p-3 border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className="text-center">
                    <div className="text-xs font-medium text-slate-600">
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                      {day.getDate()}
                    </div>
                    {count > 0 && (
                      <div className="text-xs text-slate-500 mt-1">
                        {count} intervention{count > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Day columns with interventions */}
          <div className="grid grid-cols-7" style={{ minHeight: '500px' }}>
            {weekDays.map((day) => {
              const dateStr = day.toISOString().split('T')[0]
              const isToday = dateStr === today.toISOString().split('T')[0]
              const dayInterventions = interventionsByDay[dateStr] || []

              return (
                <div
                  key={dateStr}
                  className={`border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  <ScrollArea className="h-[500px] p-2">
                    <div className="space-y-2">
                      {dayInterventions.length === 0 ? (
                        <div className="text-center text-xs text-slate-400 py-4">Aucune intervention</div>
                      ) : (
                        dayInterventions.map((intervention) => (
                          <div
                            key={intervention.id}
                            className="p-2 border border-slate-200 rounded bg-white hover:shadow-sm transition-shadow cursor-pointer"
                            onClick={() => router.push(getInterventionUrl(intervention.id))}
                          >
                            {/* Title */}
                            <h4 className="font-medium text-xs text-slate-900 mb-1.5 line-clamp-2 leading-tight">
                              {intervention.title}
                            </h4>

                            {/* Badges */}
                            <div className="flex flex-col gap-1">
                              {/* Status Badge */}
                              <Badge className={`${getStatusColor(intervention.status)} text-[10px] px-1.5 py-0 w-fit`}>
                                {getStatusLabel(intervention.status)}
                              </Badge>

                              {/* Urgency Badge */}
                              <Badge className={`${getPriorityColor(intervention.urgency || 'normale')} text-[10px] px-1.5 py-0 w-fit`}>
                                {getPriorityLabel(intervention.urgency || 'normale')}
                              </Badge>
                            </div>

                            {/* View button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-6 text-[10px] mt-2 hover:bg-slate-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(getInterventionUrl(intervention.id))
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Voir
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Week View Pattern:**
 *
 * Week views excel at:
 * - Short-term planning (current/next week focus)
 * - Day-by-day schedule detail
 * - Comparing daily workload across the week
 * - Identifying busy/free days at a glance
 *
 * **Design Decisions:**
 *
 * 1. **Monday Start:**
 *    - Week starts on Monday (ISO 8601 standard)
 *    - Common in Europe and business contexts
 *    - Alternative: Sunday start for US audiences
 *
 * 2. **Column Layout:**
 *    - 7 equal-width columns (one per day)
 *    - Fixed min-width (900px) ensures readability
 *    - Horizontal scroll on smaller screens
 *    - Each column independently scrollable vertically
 *
 * 3. **Today Highlighting:**
 *    - Blue background tint for current day column
 *    - Blue date number in header
 *    - Helps maintain temporal orientation
 *
 * 4. **Intervention Cards:**
 *    - Compact design (title + 2 badges + view button)
 *    - Stacked vertically in each day column
 *    - Click entire card or "Voir" button to navigate
 *    - Hover shadow for interactivity feedback
 *
 * **When to Choose V3:**
 * Use week view when:
 * - Desktop is primary platform (needs ~900px width)
 * - Short-term planning is the focus (this week, next week)
 * - Users need to see daily distribution of work
 * - Comparing workload across days is important
 * - Monthly overview is too broad, daily is too narrow
 *
 * **Performance Note:**
 * Week view shows max 7 days, so even with 100 interventions,
 * each day column typically has <15 items. Vertical scrolling
 * in columns keeps performance smooth. For heavy loads (20+
 * interventions per day), consider virtual scrolling.
 *
 * **Responsive Strategy:**
 * - Desktop (>900px): Full 7-column layout
 * - Tablet (600-900px): Horizontal scroll
 * - Mobile (<600px): Consider switching to day view or
 *   collapsible accordion per day (future enhancement)
 *
 * ─────────────────────────────────────────────────
 */
