"use client"

/**
 * InterventionScheduleRow - Ligne d'intervention pour la modale de planification
 *
 * Affiche une intervention planifiable avec :
 * - Checkbox pour activer/désactiver
 * - Titre et description
 * - Date picker pour la date planifiée
 * - Badge "Auto" si la date est auto-calculée
 */

import { useCallback, useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  ClipboardX,
  TrendingUp,
  Calculator,
  Shield,
  FileSearch,
  Calendar,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Map des icônes par nom
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck,
  ClipboardX,
  TrendingUp,
  Calculator,
  Shield,
  FileSearch,
  Calendar
}

export interface ScheduledInterventionData {
  key: string
  title: string
  description: string
  interventionTypeCode: string
  icon: string
  colorClass: string
  enabled: boolean
  scheduledDate: Date | null
  isAutoCalculated: boolean
}

interface InterventionScheduleRowProps {
  intervention: ScheduledInterventionData
  onToggle: (enabled: boolean) => void
  onDateChange: (date: Date | null) => void
  disabled?: boolean
  className?: string
}

export function InterventionScheduleRow({
  intervention,
  onToggle,
  onDateChange,
  disabled = false,
  className
}: InterventionScheduleRowProps) {
  const IconComponent = ICON_MAP[intervention.icon] || Calendar

  const handleToggle = useCallback((checked: boolean) => {
    onToggle(checked)
  }, [onToggle])

  const handleDateChange = useCallback((dateStr: string) => {
    if (dateStr) {
      onDateChange(new Date(dateStr))
    } else {
      onDateChange(null)
    }
  }, [onDateChange])

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!intervention.scheduledDate) return null
    return format(intervention.scheduledDate, 'dd MMMM yyyy', { locale: fr })
  }, [intervention.scheduledDate])

  // Convert Date to string for DatePicker
  const dateValue = useMemo(() => {
    if (!intervention.scheduledDate) return ''
    return format(intervention.scheduledDate, 'yyyy-MM-dd')
  }, [intervention.scheduledDate])

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-colors",
        intervention.enabled
          ? "bg-card border-border"
          : "bg-muted/30 border-transparent",
        className
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={intervention.enabled}
        onCheckedChange={handleToggle}
        disabled={disabled}
        className="mt-1"
      />

      {/* Icône */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          intervention.enabled
            ? "bg-primary/10"
            : "bg-muted"
        )}
      >
        <IconComponent
          className={cn(
            "h-4 w-4",
            intervention.enabled
              ? intervention.colorClass
              : "text-muted-foreground"
          )}
        />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4
            className={cn(
              "font-medium text-sm",
              !intervention.enabled && "text-muted-foreground"
            )}
          >
            {intervention.title}
          </h4>
          {intervention.isAutoCalculated && intervention.enabled && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 bg-primary/10 text-primary border-primary/20"
            >
              <Sparkles className="h-3 w-3" />
              Auto
            </Badge>
          )}
        </div>
        <p
          className={cn(
            "text-xs mt-0.5",
            intervention.enabled
              ? "text-muted-foreground"
              : "text-muted-foreground/60"
          )}
        >
          {intervention.description}
        </p>
      </div>

      {/* Date Picker */}
      <div className="shrink-0 w-[160px]">
        {intervention.enabled ? (
          <DatePicker
            value={dateValue}
            onChange={handleDateChange}
            placeholder="Date"
            disabled={disabled}
            className="w-full"
          />
        ) : (
          <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
    </div>
  )
}

export default InterventionScheduleRow
