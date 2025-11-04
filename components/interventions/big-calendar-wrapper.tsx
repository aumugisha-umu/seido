"use client"

import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './big-calendar-custom.css'
import type { InterventionWithRelations } from '@/lib/services'
import { getStatusColor, getStatusLabel } from '@/lib/intervention-utils'
import { Badge } from '@/components/ui/badge'
import { useState, useMemo, useCallback } from 'react'
import {
  Droplet,
  Zap,
  Key,
  Flame,
  Wrench,
  Paintbrush,
  Settings
} from 'lucide-react'

/**
 * 📅 BIG CALENDAR WRAPPER - React-Big-Calendar Integration for SEIDO
 *
 * **Design Philosophy:**
 * - Seamless integration with shadcn/ui design system
 * - French localization with proper day formatting
 * - Visual status indicators for interventions
 * - Type-specific icons for quick recognition
 * - Responsive and accessible
 *
 * **Features:**
 * ✅ Month and week views
 * ✅ French locale with Monday as first day of week
 * ✅ Color-coded status badges
 * ✅ Intervention type icons
 * ✅ Responsive event display with hover states
 * ✅ Click handlers for event selection and slot booking
 *
 * **Best for:**
 * - Full-featured calendar interactions
 * - Drag-and-drop scheduling (future enhancement)
 * - Professional gestionnaire interface
 * - Desktop-optimized workflows
 */

interface BigCalendarWrapperProps {
  /** List of interventions to display */
  interventions: InterventionWithRelations[]
  /** Which date field to use for calendar display */
  dateField: 'scheduled_date' | 'created_at' | 'requested_date' | 'completed_date'
  /** Handler when user clicks an intervention */
  onSelectEvent: (intervention: InterventionWithRelations) => void
  /** Handler when user selects a time slot */
  onSelectSlot: (date: Date) => void
  /** Initial view mode */
  initialView?: 'month' | 'week'
  /** Optional CSS classes */
  className?: string
}

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
 * 🎨 Custom Event Component
 */
interface EventComponentProps {
  event: {
    title: string
    status: string
    type: string | null
    resource: InterventionWithRelations
  }
}

const EventComponent = ({ event }: EventComponentProps) => {
  const statusClasses = getStatusColor(event.status)
  const timeString = event.resource.scheduled_date
    ? format(new Date(event.resource.scheduled_date), 'HH:mm', { locale: fr })
    : ''

  return (
    <div className="flex items-start gap-1 p-0.5 overflow-hidden">
      {/* Icon Type */}
      <div className="mt-0.5">
        {getInterventionIcon(event.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Time */}
        {timeString && (
          <div className="text-[10px] font-semibold leading-tight opacity-90">
            {timeString}
          </div>
        )}

        {/* Title */}
        <div className="text-xs font-medium leading-tight truncate">
          {event.title}
        </div>

        {/* Status Badge - Only in month view or when enough space */}
        <div className="mt-0.5 hidden md:block">
          <Badge
            variant="outline"
            className={`${statusClasses} text-[10px] px-1 py-0 h-4 border-0`}
          >
            {getStatusLabel(event.status)}
          </Badge>
        </div>
      </div>
    </div>
  )
}

/**
 * 📅 French Localizer Configuration
 */
const locales = { 'fr': fr }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
})

/**
 * 🎨 Main Component
 */
export function BigCalendarWrapper({
  interventions,
  dateField,
  onSelectEvent,
  onSelectSlot,
  initialView = 'week',
  className = ''
}: BigCalendarWrapperProps) {
  const [view, setView] = useState<View>(initialView)
  const [currentDate, setCurrentDate] = useState(new Date())

  /**
   * 📋 Transform interventions into calendar events
   */
  const events = useMemo(() => {
    return interventions
      .filter((intervention) => {
        // Only show interventions with a valid date
        const dateValue = intervention[dateField]
        return dateValue && dateValue !== null
      })
      .map((intervention) => {
        const dateValue = intervention[dateField] as string
        const startDate = new Date(dateValue)
        const endDate = new Date(dateValue)

        // Default duration: 1 hour
        // TODO: Use actual duration from intervention if available
        endDate.setHours(endDate.getHours() + 1)

        return {
          id: intervention.id,
          title: intervention.title,
          start: startDate,
          end: endDate,
          resource: intervention, // Store full intervention for event handler
          status: intervention.status,
          type: intervention.type,
          urgency: intervention.urgency,
        }
      })
  }, [interventions, dateField])

  /**
   * 🎨 Event style getter - Color-coded by status
   */
  const eventStyleGetter = useCallback((event: any) => {
    const statusClasses = getStatusColor(event.status)

    // Extract background color from Tailwind classes
    // Map status classes to hex colors for react-big-calendar
    const statusColorMap: Record<string, string> = {
      'demande': '#fee2e2',           // red-100
      'rejetee': '#fee2e2',           // red-100
      'approuvee': '#dcfce7',         // green-100
      'demande_de_devis': '#dbeafe',  // blue-100
      'planification': '#fef3c7',     // yellow-100
      'planifiee': '#f3e8ff',         // purple-100
      'en_cours': '#e0e7ff',          // indigo-100
      'cloturee_par_prestataire': '#fed7aa', // orange-100
      'cloturee_par_locataire': '#d1fae5',   // emerald-100
      'cloturee_par_gestionnaire': '#dcfce7', // green-100
      'annulee': '#f3f4f6'            // gray-100
    }

    const textColorMap: Record<string, string> = {
      'demande': '#991b1b',           // red-800
      'rejetee': '#991b1b',           // red-800
      'approuvee': '#166534',         // green-800
      'demande_de_devis': '#1e40af',  // blue-800
      'planification': '#854d0e',     // yellow-800
      'planifiee': '#6b21a8',         // purple-800
      'en_cours': '#3730a3',          // indigo-800
      'cloturee_par_prestataire': '#9a3412', // orange-800
      'cloturee_par_locataire': '#065f46',   // emerald-800
      'cloturee_par_gestionnaire': '#166534', // green-800
      'annulee': '#1f2937'            // gray-800
    }

    const backgroundColor = statusColorMap[event.status] || '#f3f4f6'
    const color = textColorMap[event.status] || '#1e293b'

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        border: 'none',
        color,
        fontSize: '0.75rem',
        padding: '2px 4px',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        transition: 'all 0.2s ease',
      }
    }
  }, [])

  /**
   * 🔗 Event handlers
   */
  const handleSelectEvent = useCallback((event: any) => {
    onSelectEvent(event.resource)
  }, [onSelectEvent])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    onSelectSlot(slotInfo.start)
  }, [onSelectSlot])

  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
  }, [])

  /**
   * 📅 French messages configuration
   */
  const messages = {
    today: "Aujourd'hui",
    previous: "Précédent",
    next: "Suivant",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    agenda: "Agenda",
    date: "Date",
    time: "Heure",
    event: "Événement",
    noEventsInRange: "Aucune intervention dans cette période",
    showMore: (count: number) => `+ ${count} intervention(s)`,
    allDay: "Toute la journée",
    work_week: "Semaine de travail",
    yesterday: "Hier",
    tomorrow: "Demain",
  }

  /**
   * 📅 Date format configuration
   */
  const formats = {
    monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: fr }), // "novembre 2025"
    dayHeaderFormat: (date: Date) => format(date, 'dd MMM yyyy', { locale: fr }), // "01 nov. 2025"
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) => {
      // Week view: "01 nov. - 07 nov. 2025"
      return `${format(start, 'dd MMM', { locale: fr })} - ${format(end, 'dd MMM yyyy', { locale: fr })}`
    },
    agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) => {
      // Agenda view: "01 nov. 2025 – 30 nov. 2025"
      return `${format(start, 'dd MMM yyyy', { locale: fr })} – ${format(end, 'dd MMM yyyy', { locale: fr })}`
    },
  }

  /**
   * 🎨 Empty state handling - Let parent container handle empty state
   */
  if (events.length === 0) {
    return null
  }

  return (
    <div className={`rbc-calendar-container ${className}`}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 'calc(100vh - 280px)' }}
        views={['month', 'week', 'day', 'agenda']}
        view={view}
        date={currentDate}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        components={{
          event: EventComponent,
        }}
        formats={formats}
        min={new Date(0, 0, 0, 0, 0)} // Start at 00:00
        max={new Date(0, 0, 0, 23, 59)} // End at 23:59
        step={60} // 1 hour increments
        timeslots={1}
        scrollToTime={new Date(0, 0, 0, 8, 0, 0)} // Auto-scroll to 8AM
        length={30} // Agenda view: show 30 days
        messages={messages}
        culture="fr"
        popup
        tooltipAccessor={(event: any) => `${event.title} - ${getStatusLabel(event.status)}`}
      />
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **React-Big-Calendar Integration Benefits:**
 *
 * 1. **Industry Standard:**
 *    - Mature library with extensive features
 *    - Familiar UX patterns (Google Calendar-like)
 *    - Accessible out of the box
 *
 * 2. **Enhanced Features:**
 *    - Drag-and-drop support (future enhancement)
 *    - Multiple view modes (month/week/day/agenda)
 *    - Responsive grid system
 *    - Customizable event rendering
 *    - Agenda view: 30-day list format
 *
 * 3. **Design System Alignment:**
 *    - Custom CSS matches shadcn/ui colors
 *    - Lucide icons for intervention types
 *    - Tailwind-inspired spacing and shadows
 *    - Consistent typography
 *
 * 4. **French Localization:**
 *    - Week starts on Monday (European standard)
 *    - French month/day names via date-fns
 *    - Localized UI messages
 *
 * 5. **Performance:**
 *    - Memoized event transformation
 *    - Efficient re-renders with useCallback
 *    - Optimized for large datasets
 *
 * **When to Use:**
 * - Gestionnaire interface with complex scheduling
 * - Desktop-first workflows
 * - Users comfortable with traditional calendar UX
 * - Need for advanced features (drag-drop, multi-view)
 *
 * **Comparison with Custom Calendar:**
 * - Custom: Better mobile experience, lighter weight
 * - Big-Calendar: More features, familiar UX, heavier bundle
 *
 * ─────────────────────────────────────────────────
 */
