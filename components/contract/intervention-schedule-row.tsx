"use client"

/**
 * InterventionScheduleRow - Ligne d'intervention/rappel pour la planification
 *
 * Affiche un item planifiable avec :
 * - Checkbox pour activer/désactiver
 * - Toggle intervention/rappel (Wrench/Bell segmented control)
 * - Titre, description et avatars des personnes assignées
 * - Badge récurrence interactif (popover avec presets + personnalisé)
 * - Bouton d'assignation avec Popover pour choisir le type de contact
 * - Select dropdown avec options de planification relatives
 * - DatePicker conditionnel pour l'option "Date personnalisée"
 */

import { useCallback, useMemo, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  ClipboardCheck,
  ClipboardX,
  TrendingUp,
  Calculator,
  Shield,
  FileSearch,
  Calendar,
  UserPlus,
  Users,
  PenLine,
  RefreshCw,
  X,
  Wrench,
  Bell
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CUSTOM_DATE_VALUE } from '@/lib/constants/lease-interventions'
import type { SchedulingOption } from '@/lib/constants/lease-interventions'
import type { AssignableRole } from '@/lib/types/intervention-planner.types'
import { ALL_ASSIGNABLE_ROLES, GESTIONNAIRE_ONLY_ROLES, ROLE_COLORS } from '@/lib/constants/assignable-roles'
import {
  getRecurrenceLabel,
  RECURRENCE_PRESETS,
  parseRRule,
  buildRRule,
  type RRuleFrequency
} from '@/lib/utils/rrule'

// Map des icônes par nom
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardCheck,
  ClipboardX,
  TrendingUp,
  Calculator,
  Shield,
  FileSearch,
  Calendar,
  PenLine
}

/** Personne assignée à une intervention */
export interface InterventionAssignment {
  userId: string
  role: 'gestionnaire' | 'prestataire' | 'locataire'
  name: string
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
  availableOptions: SchedulingOption[]
  selectedSchedulingOption: string
  assignedUsers: InterventionAssignment[]
  /** Distinguishes interventions (involve external parties) from reminders (internal tasks) */
  itemType?: 'intervention' | 'reminder'
  /** RFC 5545 recurrence rule (e.g. 'FREQ=YEARLY;INTERVAL=1') */
  recurrenceRule?: string
}


interface InterventionScheduleRowProps {
  intervention: ScheduledInterventionData
  onToggle: (enabled: boolean) => void
  onDateChange: (date: Date | null) => void
  onSchedulingOptionChange: (optionValue: string) => void
  /** Called when user wants to assign a specific contact type (opens ContactSelector) */
  onAssignType: (contactType: string) => void
  disabled?: boolean
  className?: string
  /** Render title/description as editable inputs */
  isEditable?: boolean
  onTitleChange?: (title: string) => void
  onDescriptionChange?: (desc: string) => void
  onDelete?: () => void
  showDelete?: boolean
  /** Configurable roles in the assign popover. Defaults to all 3 roles. */
  assignableRoles?: AssignableRole[]
  /** Called when user toggles between intervention and reminder */
  onItemTypeChange?: (type: 'intervention' | 'reminder') => void
  /** Called when user changes recurrence rule */
  onRecurrenceChange?: (rrule: string | null) => void
}

export function InterventionScheduleRow({
  intervention,
  onToggle,
  onDateChange,
  onSchedulingOptionChange,
  onAssignType,
  disabled = false,
  className,
  isEditable = false,
  onTitleChange,
  onDescriptionChange,
  onDelete,
  showDelete = false,
  assignableRoles,
  onItemTypeChange,
  onRecurrenceChange
}: InterventionScheduleRowProps) {
  const IconComponent = ICON_MAP[intervention.icon] || Calendar
  const isCustomDate = intervention.selectedSchedulingOption === CUSTOM_DATE_VALUE
  const assignCount = intervention.assignedUsers.length
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false)
  const [recurrencePopoverOpen, setRecurrencePopoverOpen] = useState(false)
  const [customInterval, setCustomInterval] = useState<number>(1)
  const [customFrequency, setCustomFrequency] = useState<RRuleFrequency>('YEARLY')

  const isReminder = intervention.itemType === 'reminder'
  const recurrenceLabel = getRecurrenceLabel(intervention.recurrenceRule)

  const handleToggle = useCallback((checked: boolean) => {
    onToggle(checked)
  }, [onToggle])

  const handleOptionChange = useCallback((value: string) => {
    onSchedulingOptionChange(value)
  }, [onSchedulingOptionChange])

  const handleCustomDateChange = useCallback((dateStr: string) => {
    if (dateStr) {
      onDateChange(new Date(dateStr))
    } else {
      onDateChange(null)
    }
  }, [onDateChange])

  const handleAssignTypeClick = useCallback((contactType: string) => {
    setAssignPopoverOpen(false)
    onAssignType(contactType)
  }, [onAssignType])

  const handleItemTypeToggle = useCallback((newType: 'intervention' | 'reminder') => {
    if (newType === intervention.itemType) return
    onItemTypeChange?.(newType)
  }, [intervention.itemType, onItemTypeChange])

  const handleRecurrencePreset = useCallback((rrule: string) => {
    onRecurrenceChange?.(rrule)
    setRecurrencePopoverOpen(false)
  }, [onRecurrenceChange])

  const handleRecurrenceRemove = useCallback(() => {
    onRecurrenceChange?.(null)
    setRecurrencePopoverOpen(false)
  }, [onRecurrenceChange])

  const handleRecurrenceCustomApply = useCallback(() => {
    const rrule = buildRRule(customFrequency, customInterval)
    onRecurrenceChange?.(rrule)
    setRecurrencePopoverOpen(false)
  }, [customFrequency, customInterval, onRecurrenceChange])

  // Sync custom fields when popover opens
  const handleRecurrencePopoverChange = useCallback((open: boolean) => {
    if (open && intervention.recurrenceRule) {
      const parsed = parseRRule(intervention.recurrenceRule)
      if (parsed) {
        setCustomInterval(parsed.interval)
        setCustomFrequency(parsed.frequency)
      }
    }
    setRecurrencePopoverOpen(open)
  }, [intervention.recurrenceRule])

  // Format date for readable display
  const formattedDate = useMemo(() => {
    if (!intervention.scheduledDate) return null
    return format(intervention.scheduledDate, 'dd MMMM yyyy', { locale: fr })
  }, [intervention.scheduledDate])

  // Convert Date to ISO string for DatePicker (custom mode)
  const dateValue = useMemo(() => {
    if (!intervention.scheduledDate) return ''
    return format(intervention.scheduledDate, 'yyyy-MM-dd')
  }, [intervention.scheduledDate])

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return (name.substring(0, 2)).toUpperCase()
  }

  // Check if current rrule matches a preset
  const isPresetSelected = (presetRrule: string) =>
    intervention.recurrenceRule === presetRrule

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border border-l-4 transition-colors",
        intervention.enabled
          ? (isReminder ? "bg-white border-l-amber-500" : "bg-white border-l-indigo-500")
          : (isReminder ? "bg-amber-50/30 border-l-amber-300" : "bg-indigo-50/30 border-l-indigo-300"),
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

      {/* Toggle intervention/rappel */}
      {intervention.enabled && onItemTypeChange && (
        <div className="shrink-0 flex rounded-md border overflow-hidden">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleItemTypeToggle('intervention')}
                  className={cn(
                    "flex items-center justify-center h-7 w-7 transition-colors",
                    !isReminder
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Wrench className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Intervention</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleItemTypeToggle('reminder')}
                  className={cn(
                    "flex items-center justify-center h-7 w-7 transition-colors",
                    isReminder
                      ? "bg-amber-100 text-amber-700"
                      : "bg-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Bell className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Rappel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditable ? (
            <div className="relative flex-1">
              <Input
                value={intervention.title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                placeholder="Titre de l'intervention *"
                className={cn(
                  "h-7 text-sm font-medium",
                  !intervention.title && "border-destructive focus-visible:ring-destructive/40"
                )}
              />
            </div>
          ) : (
            <>
              <h4
                className={cn(
                  "font-medium text-sm",
                  !intervention.enabled && "text-muted-foreground"
                )}
              >
                {intervention.title}
              </h4>
              {/* Recurrence badge — clickable popover or add button */}
              {intervention.enabled && onRecurrenceChange && (
                recurrenceLabel ? (
                  <Popover open={recurrencePopoverOpen} onOpenChange={handleRecurrencePopoverChange}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {recurrenceLabel}
                      </button>
                    </PopoverTrigger>
                    <RecurrencePopoverContent
                      isPresetSelected={isPresetSelected}
                      onPreset={handleRecurrencePreset}
                      onRemove={handleRecurrenceRemove}
                      onCustomApply={handleRecurrenceCustomApply}
                      customInterval={customInterval}
                      customFrequency={customFrequency}
                      onCustomIntervalChange={setCustomInterval}
                      onCustomFrequencyChange={setCustomFrequency}
                    />
                  </Popover>
                ) : (
                  <Popover open={recurrencePopoverOpen} onOpenChange={handleRecurrencePopoverChange}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3" />
                        + Recurrence
                      </button>
                    </PopoverTrigger>
                    <RecurrencePopoverContent
                      isPresetSelected={isPresetSelected}
                      onPreset={handleRecurrencePreset}
                      onRemove={handleRecurrenceRemove}
                      onCustomApply={handleRecurrenceCustomApply}
                      customInterval={customInterval}
                      customFrequency={customFrequency}
                      onCustomIntervalChange={setCustomInterval}
                      onCustomFrequencyChange={setCustomFrequency}
                    />
                  </Popover>
                )
              )}
              {/* Read-only badge when no onRecurrenceChange handler */}
              {recurrenceLabel && !onRecurrenceChange && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                        <RefreshCw className="h-3 w-3" />
                        {recurrenceLabel}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Ce rappel sera recree automatiquement
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </div>
        {isEditable ? (
          <Input
            value={intervention.description}
            onChange={(e) => onDescriptionChange?.(e.target.value)}
            placeholder="Description (optionnel)..."
            className="h-7 text-xs mt-0.5"
          />
        ) : (
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
        )}

        {/* Avatars des personnes assignees */}
        {intervention.enabled && assignCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <TooltipProvider delayDuration={200}>
              {intervention.assignedUsers.map(user => (
                <Tooltip key={user.userId}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium border cursor-default",
                        ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {getInitials(user.name)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {user.name} ({user.role})
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* Delete button for custom interventions */}
      {showDelete && onDelete && (
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive">
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Bouton d'assignation avec Popover pour choisir le type */}
      {intervention.enabled && (
        <div className="shrink-0">
          <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                className={cn(
                  "h-9 gap-1.5 text-xs",
                  assignCount > 0 && "border-primary/30 text-primary"
                )}
              >
                {assignCount > 0 ? (
                  <>
                    <Users className="h-3.5 w-3.5" />
                    {assignCount}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Assigner
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1.5">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                  {isReminder ? 'Assigner a un gestionnaire' : 'Ajouter des...'}
                </p>
                {(isReminder ? GESTIONNAIRE_ONLY_ROLES : (assignableRoles ?? ALL_ASSIGNABLE_ROLES)).map(({ type, label, Icon, color }) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 text-xs"
                    onClick={() => handleAssignTypeClick(type)}
                  >
                    <Icon className={cn("h-3.5 w-3.5", color)} />
                    {label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Planification : Select + date */}
      <div className="shrink-0 w-[240px] space-y-1.5">
        {intervention.enabled ? (
          <>
            {/* Dropdown des options relatives */}
            <Select
              value={intervention.selectedSchedulingOption}
              onValueChange={handleOptionChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Quand ?" />
              </SelectTrigger>
              <SelectContent>
                {intervention.availableOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_DATE_VALUE} className="text-xs">
                  Date personnalisee
                </SelectItem>
              </SelectContent>
            </Select>

            {/* DatePicker conditionnel pour date personnalisee */}
            {isCustomDate && (
              <DatePicker
                value={dateValue}
                onChange={handleCustomDateChange}
                placeholder="Choisir une date"
                disabled={disabled}
                className="w-full"
              />
            )}

            {/* Date calculee en texte lisible */}
            {formattedDate && (
              <p className="text-xs text-muted-foreground pl-1">
                {formattedDate}
              </p>
            )}
          </>
        ) : (
          <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
    </div>
  )
}

/** Recurrence popover content — extracted to avoid duplication */
function RecurrencePopoverContent({
  isPresetSelected,
  onPreset,
  onRemove,
  onCustomApply,
  customInterval,
  customFrequency,
  onCustomIntervalChange,
  onCustomFrequencyChange
}: {
  isPresetSelected: (rrule: string) => boolean
  onPreset: (rrule: string) => void
  onRemove: () => void
  onCustomApply: () => void
  customInterval: number
  customFrequency: RRuleFrequency
  onCustomIntervalChange: (v: number) => void
  onCustomFrequencyChange: (v: RRuleFrequency) => void
}) {
  return (
    <PopoverContent align="start" className="w-56 p-2">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground px-1 pb-1">Recurrence</p>
        {RECURRENCE_PRESETS.map(preset => (
          <Button
            key={preset.rrule}
            variant={isPresetSelected(preset.rrule) ? "secondary" : "ghost"}
            size="sm"
            className="w-full justify-start h-7 text-xs"
            onClick={() => onPreset(preset.rrule)}
          >
            {preset.label}
          </Button>
        ))}

        <div className="border-t pt-1.5 mt-1.5">
          <p className="text-[10px] text-muted-foreground px-1 mb-1">Personnalise</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground shrink-0">Tous les</span>
            <Input
              type="number"
              min={1}
              max={99}
              value={customInterval}
              onChange={(e) => onCustomIntervalChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-7 w-14 text-xs text-center"
            />
            <Select value={customFrequency} onValueChange={(v) => onCustomFrequencyChange(v as RRuleFrequency)}>
              <SelectTrigger className="h-7 w-[72px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY" className="text-xs">mois</SelectItem>
                <SelectItem value="YEARLY" className="text-xs">ans</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={onCustomApply}>
              OK
            </Button>
          </div>
        </div>

        <div className="border-t pt-1.5 mt-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 text-xs text-muted-foreground"
            onClick={onRemove}
          >
            <X className="h-3 w-3 mr-1.5" />
            Pas de recurrence
          </Button>
        </div>
      </div>
    </PopoverContent>
  )
}

export default InterventionScheduleRow
