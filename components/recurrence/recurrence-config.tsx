'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type RRuleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
type RRuleWeekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'
type MonthlyMode = 'bymonthday' | 'byday'
type EndMode = 'never' | 'count' | 'until'

interface RecurrenceFormState {
  frequency: RRuleFrequency
  interval: number
  weekdays: RRuleWeekday[]
  monthlyMode: MonthlyMode
  monthDay: number
  weekdayOrdinal: number
  weekdayOfMonth: RRuleWeekday
  endMode: EndMode
  count: number
  until: string
}

export interface RecurrenceConfigProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  /** The RRULE string value */
  value: string
  onChange: (rrule: string) => void
  /** Due date from the reminder (for monthly pre-fill, ISO string or YYYY-MM-DD) */
  referenceDate?: string
  className?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEEKDAY_LABELS: Record<RRuleWeekday, string> = {
  MO: 'L',
  TU: 'M',
  WE: 'Me',
  TH: 'J',
  FR: 'V',
  SA: 'S',
  SU: 'D',
}

const WEEKDAY_FULL_LABELS: Record<RRuleWeekday, string> = {
  MO: 'lundi',
  TU: 'mardi',
  WE: 'mercredi',
  TH: 'jeudi',
  FR: 'vendredi',
  SA: 'samedi',
  SU: 'dimanche',
}

const WEEKDAYS: RRuleWeekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

const FREQUENCY_LABELS: Record<RRuleFrequency, string> = {
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  YEARLY: 'Annuel',
}

const FREQUENCY_UNIT_LABELS: Record<RRuleFrequency, string> = {
  DAILY: 'jours',
  WEEKLY: 'semaines',
  MONTHLY: 'mois',
  YEARLY: 'ans',
}

const ORDINAL_LABELS: Record<number, string> = {
  1: '1er',
  2: '2e',
  3: '3e',
  4: '4e',
  [-1]: 'dernier',
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the day of week (RRule format) from a JS Date
 */
function getWeekdayFromDate(date: Date): RRuleWeekday {
  const jsDay = date.getDay() // 0=Sun, 1=Mon, ...
  const mapping: RRuleWeekday[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
  return mapping[jsDay]
}

/**
 * Get the ordinal position of a weekday within its month (1st Monday, 2nd Tuesday, etc.)
 */
function getWeekdayOrdinal(date: Date): number {
  const dayOfMonth = date.getDate()
  return Math.ceil(dayOfMonth / 7)
}

/**
 * Build a valid RRULE string from the form state.
 * No rrule.js dependency -- pure string building.
 */
function buildRRule(config: RecurrenceFormState): string {
  const parts: string[] = [`FREQ=${config.frequency}`]

  if (config.interval > 1) {
    parts.push(`INTERVAL=${config.interval}`)
  }

  if (config.frequency === 'WEEKLY' && config.weekdays.length > 0) {
    parts.push(`BYDAY=${config.weekdays.join(',')}`)
  }

  if (config.frequency === 'MONTHLY') {
    if (config.monthlyMode === 'bymonthday') {
      parts.push(`BYMONTHDAY=${config.monthDay}`)
    } else {
      // e.g., BYDAY=2TU (2nd Tuesday)
      parts.push(`BYDAY=${config.weekdayOrdinal}${config.weekdayOfMonth}`)
    }
  }

  if (config.endMode === 'count' && config.count > 0) {
    parts.push(`COUNT=${config.count}`)
  } else if (config.endMode === 'until' && config.until) {
    // Convert YYYY-MM-DD to YYYYMMDD format for RRULE
    const untilFormatted = config.until.replace(/-/g, '') + 'T235959Z'
    parts.push(`UNTIL=${untilFormatted}`)
  }

  return parts.join(';')
}

/**
 * Generate a human-readable summary of the recurrence config (French)
 */
export function buildRecurrenceSummary(rrule: string): string {
  if (!rrule) return ''

  const parts = rrule.split(';')
  const params: Record<string, string> = {}
  for (const part of parts) {
    const [key, val] = part.split('=')
    if (key && val) params[key] = val
  }

  const freq = params['FREQ'] as RRuleFrequency | undefined
  if (!freq) return rrule

  const interval = params['INTERVAL'] ? parseInt(params['INTERVAL'], 10) : 1

  let base = ''
  switch (freq) {
    case 'DAILY':
      base = interval === 1 ? 'Tous les jours' : `Tous les ${interval} jours`
      break
    case 'WEEKLY': {
      const prefix = interval === 1 ? 'Chaque semaine' : `Toutes les ${interval} semaines`
      const byday = params['BYDAY']
      if (byday) {
        const days = byday.split(',') as RRuleWeekday[]
        const dayLabels = days
          .filter((d) => WEEKDAY_FULL_LABELS[d])
          .map((d) => WEEKDAY_FULL_LABELS[d])
        base = `${prefix} le ${dayLabels.join(', ')}`
      } else {
        base = prefix
      }
      break
    }
    case 'MONTHLY': {
      const prefix = interval === 1 ? 'Chaque mois' : `Tous les ${interval} mois`
      const bymonthday = params['BYMONTHDAY']
      const byday = params['BYDAY']
      if (bymonthday) {
        base = `${prefix} le ${bymonthday}`
      } else if (byday) {
        // Parse "2TU" format
        const match = byday.match(/^(-?\d)(\w{2})$/)
        if (match) {
          const ordinal = parseInt(match[1], 10)
          const weekday = match[2] as RRuleWeekday
          const ordLabel = ORDINAL_LABELS[ordinal] || `${ordinal}e`
          const dayLabel = WEEKDAY_FULL_LABELS[weekday] || weekday
          base = `${prefix}, le ${ordLabel} ${dayLabel}`
        } else {
          base = prefix
        }
      } else {
        base = prefix
      }
      break
    }
    case 'YEARLY':
      base = interval === 1 ? 'Chaque annee' : `Tous les ${interval} ans`
      break
    default:
      base = rrule
  }

  // End condition
  const count = params['COUNT']
  const until = params['UNTIL']
  if (count) {
    base += `, ${count} fois`
  } else if (until) {
    // Parse YYYYMMDD from UNTIL
    const year = until.substring(0, 4)
    const month = until.substring(4, 6)
    const day = until.substring(6, 8)
    base += `, jusqu'au ${day}/${month}/${year}`
  }

  return base
}

/**
 * Parse an RRULE string back into form state
 */
function parseRRule(rrule: string, refDate?: Date): RecurrenceFormState {
  const defaults = getDefaultState(refDate)
  if (!rrule) return defaults

  const params: Record<string, string> = {}
  for (const part of rrule.split(';')) {
    const [key, val] = part.split('=')
    if (key && val) params[key] = val
  }

  const freq = (params['FREQ'] || 'WEEKLY') as RRuleFrequency
  const interval = params['INTERVAL'] ? parseInt(params['INTERVAL'], 10) : 1

  let weekdays: RRuleWeekday[] = defaults.weekdays
  let monthlyMode: MonthlyMode = defaults.monthlyMode
  let monthDay = defaults.monthDay
  let weekdayOrdinal = defaults.weekdayOrdinal
  let weekdayOfMonth = defaults.weekdayOfMonth

  if (freq === 'WEEKLY' && params['BYDAY']) {
    weekdays = params['BYDAY'].split(',') as RRuleWeekday[]
  }

  if (freq === 'MONTHLY') {
    if (params['BYMONTHDAY']) {
      monthlyMode = 'bymonthday'
      monthDay = parseInt(params['BYMONTHDAY'], 10)
    } else if (params['BYDAY']) {
      monthlyMode = 'byday'
      const match = params['BYDAY'].match(/^(-?\d)(\w{2})$/)
      if (match) {
        weekdayOrdinal = parseInt(match[1], 10)
        weekdayOfMonth = match[2] as RRuleWeekday
      }
    }
  }

  let endMode: EndMode = 'never'
  let count = 10
  let until = ''
  if (params['COUNT']) {
    endMode = 'count'
    count = parseInt(params['COUNT'], 10)
  } else if (params['UNTIL']) {
    endMode = 'until'
    // Parse YYYYMMDDTHHMMSSZ to YYYY-MM-DD
    const raw = params['UNTIL']
    until = `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}`
  }

  return {
    frequency: freq,
    interval,
    weekdays,
    monthlyMode,
    monthDay,
    weekdayOrdinal,
    weekdayOfMonth,
    endMode,
    count,
    until,
  }
}

function getDefaultState(refDate?: Date): RecurrenceFormState {
  const ref = refDate || new Date()
  return {
    frequency: 'WEEKLY',
    interval: 1,
    weekdays: [getWeekdayFromDate(ref)],
    monthlyMode: 'bymonthday',
    monthDay: ref.getDate(),
    weekdayOrdinal: getWeekdayOrdinal(ref),
    weekdayOfMonth: getWeekdayFromDate(ref),
    endMode: 'never',
    count: 10,
    until: '',
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RecurrenceConfig({
  enabled,
  onEnabledChange,
  value,
  onChange,
  referenceDate,
  className,
}: RecurrenceConfigProps) {
  const refDate = useMemo(
    () => (referenceDate ? new Date(referenceDate) : undefined),
    [referenceDate]
  )

  const [formState, setFormState] = useState<RecurrenceFormState>(() =>
    value ? parseRRule(value, refDate) : getDefaultState(refDate)
  )

  // Stable ref for onChange to avoid stale closures in useEffect
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Skip first-mount emit — parent already has the initial value
  const hasMountedRef = useRef(false)

  // Re-parse when value changes externally
  useEffect(() => {
    if (value) {
      setFormState(parseRRule(value, refDate))
    }
  // Only re-parse on external value change, not on every refDate change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Update monthly defaults when reference date changes
  useEffect(() => {
    if (refDate && enabled) {
      setFormState((prev) => ({
        ...prev,
        monthDay: refDate.getDate(),
        weekdayOrdinal: getWeekdayOrdinal(refDate),
        weekdayOfMonth: getWeekdayFromDate(refDate),
      }))
    }
  }, [refDate, enabled])

  // Emit rrule whenever formState changes (after render, not during)
  // Guard: skip first mount + only emit if rrule differs from current value
  useEffect(() => {
    if (!enabled) return
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    const rrule = buildRRule(formState)
    if (rrule !== value) {
      onChangeRef.current(rrule)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState, enabled])

  const updateState = useCallback(
    (partial: Partial<RecurrenceFormState>) => {
      setFormState((prev) => ({ ...prev, ...partial }))
    },
    []
  )

  const handleWeekdayToggle = useCallback(
    (day: RRuleWeekday) => {
      setFormState((prev) => {
        const isSelected = prev.weekdays.includes(day)
        if (isSelected && prev.weekdays.length > 1) {
          return { ...prev, weekdays: prev.weekdays.filter((d) => d !== day) }
        }
        if (!isSelected) {
          return { ...prev, weekdays: [...prev.weekdays, day] }
        }
        return prev
      })
    },
    []
  )

  const summary = useMemo(() => buildRecurrenceSummary(value), [value])

  if (!enabled) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="recurrence-toggle" className="text-sm font-medium">
              Recurrence
            </Label>
          </div>
          <Switch
            id="recurrence-toggle"
            checked={false}
            onCheckedChange={onEnabledChange}
            aria-label="Activer la recurrence"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" />
          <Label htmlFor="recurrence-toggle" className="text-sm font-medium">
            Recurrence
          </Label>
        </div>
        <Switch
          id="recurrence-toggle"
          checked={true}
          onCheckedChange={onEnabledChange}
          aria-label="Desactiver la recurrence"
        />
      </div>

      <Card className="border-primary/20">
        <CardContent className="pt-4 space-y-5">
          {/* Frequency selector */}
          <div className="space-y-2">
            <Label htmlFor="recurrence-frequency">Frequence</Label>
            <Select
              value={formState.frequency}
              onValueChange={(val) => updateState({ frequency: val as RRuleFrequency })}
            >
              <SelectTrigger id="recurrence-frequency" aria-label="Frequence de recurrence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQUENCY_LABELS) as RRuleFrequency[]).map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {FREQUENCY_LABELS[freq]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="recurrence-interval">
              Tous les {formState.interval > 1 ? formState.interval : ''}{' '}
              {FREQUENCY_UNIT_LABELS[formState.frequency]}
            </Label>
            <Input
              id="recurrence-interval"
              type="number"
              min={1}
              max={365}
              value={formState.interval}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val) && val >= 1 && val <= 365) {
                  updateState({ interval: val })
                }
              }}
              className="w-24"
              aria-label="Intervalle de recurrence"
            />
          </div>

          {/* Weekly: day multi-select */}
          {formState.frequency === 'WEEKLY' && (
            <div className="space-y-2">
              <Label>Jours de la semaine</Label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map((day) => {
                  const isSelected = formState.weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleWeekdayToggle(day)}
                      className={cn(
                        'h-10 w-10 rounded-full text-sm font-medium transition-all',
                        'border flex items-center justify-center',
                        'min-w-[44px] min-h-[44px]', // 44px touch target
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted'
                      )}
                      aria-pressed={isSelected}
                      aria-label={WEEKDAY_FULL_LABELS[day]}
                    >
                      {WEEKDAY_LABELS[day]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Monthly options */}
          {formState.frequency === 'MONTHLY' && (
            <div className="space-y-3">
              <Label>Type de recurrence mensuelle</Label>
              <RadioGroup
                value={formState.monthlyMode}
                onValueChange={(val) => updateState({ monthlyMode: val as MonthlyMode })}
                className="space-y-3"
              >
                {/* Option 1: BYMONTHDAY */}
                <div className="flex items-center gap-3">
                  <RadioGroupItem
                    value="bymonthday"
                    id="monthly-bymonthday"
                    aria-label={`Le ${formState.monthDay} du mois`}
                  />
                  <Label htmlFor="monthly-bymonthday" className="text-sm font-normal cursor-pointer">
                    Le {formState.monthDay} du mois
                  </Label>
                </div>

                {/* Option 2: BYDAY with ordinal */}
                <div className="flex items-center gap-3">
                  <RadioGroupItem
                    value="byday"
                    id="monthly-byday"
                    aria-label={`Le ${ORDINAL_LABELS[formState.weekdayOrdinal] || formState.weekdayOrdinal + 'e'} ${WEEKDAY_FULL_LABELS[formState.weekdayOfMonth]} du mois`}
                  />
                  <Label htmlFor="monthly-byday" className="text-sm font-normal cursor-pointer">
                    Le {ORDINAL_LABELS[formState.weekdayOrdinal] || `${formState.weekdayOrdinal}e`}{' '}
                    {WEEKDAY_FULL_LABELS[formState.weekdayOfMonth]} du mois
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* End condition */}
          <div className="space-y-3">
            <Label>Fin de la recurrence</Label>
            <RadioGroup
              value={formState.endMode}
              onValueChange={(val) => updateState({ endMode: val as EndMode })}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="never" id="end-never" />
                <Label htmlFor="end-never" className="text-sm font-normal cursor-pointer">
                  Jamais
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <RadioGroupItem value="count" id="end-count" />
                <Label htmlFor="end-count" className="text-sm font-normal cursor-pointer">
                  Apres
                </Label>
                {formState.endMode === 'count' && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={formState.count}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val) && val >= 1 && val <= 999) {
                          updateState({ count: val })
                        }
                      }}
                      className="w-20"
                      aria-label="Nombre d'occurrences"
                    />
                    <span className="text-sm text-muted-foreground">occurrences</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <RadioGroupItem value="until" id="end-until" />
                <Label htmlFor="end-until" className="text-sm font-normal cursor-pointer">
                  Jusqu&apos;au
                </Label>
                {formState.endMode === 'until' && (
                  <DatePicker
                    value={formState.until}
                    onChange={(val) => updateState({ until: val })}
                    placeholder="jj/mm/aaaa"
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Summary preview */}
          {summary && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Apercu :</span>{' '}
                {summary}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
