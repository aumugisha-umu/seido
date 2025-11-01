"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  Building2,
  MapPin,
  CalendarDays,
  CalendarRange,
  AlertCircle,
  Droplet,
  Zap,
  Key,
  Flame,
  Wrench,
  Paintbrush,
  Settings
} from 'lucide-react'
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

/**
 * 🎯 Get intervention type icon
 */
const getInterventionIcon = (type: string | null | undefined) => {
  const iconMap: Record<string, JSX.Element> = {
    'plomberie': <Droplet className="w-3 h-3 flex-shrink-0" />,
    'electricite': <Zap className="w-3 h-3 flex-shrink-0" />,
    'serrurerie': <Key className="w-3 h-3 flex-shrink-0" />,
    'chauffage': <Flame className="w-3 h-3 flex-shrink-0" />,
    'peinture': <Paintbrush className="w-3 h-3 flex-shrink-0" />,
    'maintenance': <Settings className="w-3 h-3 flex-shrink-0" />
  }
  return iconMap[type?.toLowerCase() || ''] || <Wrench className="w-3 h-3 flex-shrink-0" />
}

/**
 * 📌 Intervention Bar Component - Used in Week View
 */
interface InterventionBarProps {
  intervention: InterventionWithRelations & { topPosition: number; height: number }
  onClick: () => void
}

const InterventionBar = ({ intervention, onClick }: InterventionBarProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const urgencyColor = getUrgencyColorClass(intervention.urgency || 'normale')

  return (
    <div
      className={`
        absolute left-1 right-1 px-2 py-1 rounded cursor-pointer
        border-l-4 text-white text-xs overflow-hidden
        transition-all duration-200
        ${urgencyColor.replace('hover:', '')}
        ${isHovered ? 'z-30 shadow-lg scale-[1.02]' : 'z-10'}
      `}
      style={{
        top: `${intervention.topPosition}px`,
        height: `${intervention.height}px`,
        minHeight: '24px'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1">
        {/* Icône type intervention */}
        {getInterventionIcon(intervention.type)}

        {/* Titre - Tronqué par défaut, complet on hover */}
        <span className={`flex-1 font-medium ${!isHovered && 'truncate'}`}>
          {intervention.title}
        </span>
      </div>

      {/* Localisation on hover */}
      {isHovered && intervention.height >= 48 && (
        <div className="text-[10px] opacity-90 mt-0.5 truncate">
          {getInterventionLocationText(intervention as any)}
        </div>
      )}
    </div>
  )
}

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
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>('week')

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
   * 📅 Week view: Scroll container ref for auto-scroll
   */
  const weekScrollAreaRef = useRef<HTMLDivElement>(null)

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
    if (calendarMode === 'week' && weekScrollAreaRef.current) {
      // Scroll to 8am (8 hours * 48px per hour = 384px)
      const HOUR_HEIGHT = 48
      const BUSINESS_HOUR_START = 8
      setTimeout(() => {
        if (weekScrollAreaRef.current) {
          weekScrollAreaRef.current.scrollTo({
            top: BUSINESS_HOUR_START * HOUR_HEIGHT,
            behavior: 'smooth'
          })
        }
      }, 100)
    }
  }, [calendarMode, weekStart])


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
   * 🎯 Week view: Get interventions for a specific day
   */
  const getInterventionsForDay = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0]
    return interventionsByDay[dateStr] || []
  }

  /**
   * 🔼 Week view: Check if interventions before visible zone (< 8h)
   */
  const hasInterventionsBefore = (day: Date) => {
    const interventions = getInterventionsForDay(day)
    return interventions.some((i) => {
      const dateValue = i[dateField as keyof InterventionWithRelations] as string | undefined
      if (!dateValue) return false
      const hour = new Date(dateValue).getHours()
      return hour < 8
    })
  }

  /**
   * 🔽 Week view: Check if interventions after visible zone (>= 18h)
   */
  const hasInterventionsAfter = (day: Date) => {
    const interventions = getInterventionsForDay(day)
    return interventions.some((i) => {
      const dateValue = i[dateField as keyof InterventionWithRelations] as string | undefined
      if (!dateValue) return false
      const hour = new Date(dateValue).getHours()
      return hour >= 18
    })
  }


  /**
   * 🎯 Week view: Handle day click (focus in side panel)
   */
  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    // Emit custom event for side panel to focus on this day
    window.dispatchEvent(
      new CustomEvent('focusDay', {
        detail: {
          date: day,
          interventions: getInterventionsOnDate(interventions, day.toISOString().split('T')[0], dateField)
        }
      })
    )
  }

  /**
   * 🎯 Week view: Handle intervention click (redirect to detail page)
   */
  const handleInterventionClick = (intervention: InterventionWithRelations) => {
    router.push(getInterventionUrl(intervention.id))
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
    <div className={`flex gap-4 flex-1 min-h-0 ${className}`}>
      {/* LEFT PANEL - Calendar (Month or Week) */}
      <div className="flex-1 border border-slate-200 rounded-lg bg-white flex flex-col min-h-0 overflow-hidden">
        {/* Calendar Header with Mode Toggle */}
        <div className="p-3 flex-shrink-0 border-b border-slate-200">
          <div className="flex items-center justify-between">
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
        </div>

        {/* Calendar Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* MONTH VIEW */}
        {calendarMode === 'month' && (
          <div className="p-3">
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
          </div>
        )}

        {/* WEEK VIEW - Structure avec Table et scroll natif */}
        {calendarMode === 'week' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Headers Row - Fixed */}
            <div className="flex gap-1 flex-shrink-0 p-3 border-b border-slate-200">
              {/* Coin heures */}
              <div className="w-20 h-16 bg-slate-100 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-slate-500">Heures</span>
              </div>

              {/* 7 jours de la semaine */}
              {weekDays.map((day, index) => {
                const dayName = day.toLocaleDateString('fr-FR', { weekday: 'short' })
                const dayNumber = day.getDate()
                const isToday = day.toDateString() === new Date().toDateString()

                return (
                  <div
                    key={index}
                    className={`flex-1 h-16 border rounded p-2 flex flex-col items-center justify-center ${
                      isToday
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="text-xs text-slate-500 capitalize">{dayName}</div>
                    <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                      {dayNumber}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Scrollable Table - Native Overflow */}
            <div ref={weekScrollAreaRef} className="flex-1 overflow-y-auto">
              <Table>
                <TableBody>
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                    <TableRow key={hour} className="hover:bg-transparent border-0">
                      {/* Colonne heures */}
                      <TableCell className="w-20 h-12 p-0 border-r-2 border-slate-300 bg-slate-50">
                        <div className="h-12 flex items-start justify-end pr-2 pt-1 border-b border-slate-100">
                          <span className="text-xs text-slate-500 font-medium">
                            {hour.toString().padStart(2, '0')}h
                          </span>
                        </div>
                      </TableCell>

                    {/* 7 colonnes jours */}
                    {weekDays.map((day, dayIndex) => {
                      const dateStr = day.toISOString().split('T')[0]
                      const dayInterventions = interventionsByDay[dateStr] || []
                      const hourInterventions = dayInterventions.filter((int) => {
                        const dateValue = int[dateField as keyof InterventionWithRelations] as string | undefined
                        if (!dateValue) return false
                        const intDate = new Date(dateValue)
                        return intDate.getHours() === hour
                      })

                      return (
                        <TableCell
                          key={dayIndex}
                          className="h-12 p-0 border-r-2 border-slate-300 last:border-r-0 relative"
                        >
                          <div
                            className="h-12 border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                            onClick={() => handleDayClick(day)}
                          >
                            {/* Affichage des interventions pour cette heure si nécessaire */}
                            {hourInterventions.length > 0 && (
                              <div className="absolute inset-x-0 top-0 p-1">
                                {hourInterventions.map((intervention) => (
                                  <div
                                    key={intervention.id}
                                    className="text-xs bg-blue-100 text-blue-900 rounded px-1 py-0.5 mb-1 truncate"
                                  >
                                    {intervention.title}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* RIGHT PANEL - Interventions for selected date */}
      <div className="w-[350px] border border-slate-200 rounded-lg bg-white flex flex-col min-h-0">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
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
        <ScrollArea className="flex-1 min-h-0">
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
