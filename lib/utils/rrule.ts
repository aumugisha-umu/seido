/**
 * RRULE utilities for recurrence management in wizards
 *
 * Lightweight build/parse for RFC 5545 RRULE strings.
 * Server-side occurrence generation uses the full rrule.js library.
 */

export type RRuleFrequency = 'MONTHLY' | 'YEARLY'

export interface ParsedRRule {
  frequency: RRuleFrequency
  interval: number
}

/** Predefined recurrence options for the UI popover */
export const RECURRENCE_PRESETS = [
  { label: 'Mensuel', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
  { label: 'Trimestriel', rrule: 'FREQ=MONTHLY;INTERVAL=3' },
  { label: 'Semestriel', rrule: 'FREQ=MONTHLY;INTERVAL=6' },
  { label: 'Annuel', rrule: 'FREQ=YEARLY;INTERVAL=1' },
] as const

/** Build an RRULE string from frequency and interval */
export function buildRRule(frequency: RRuleFrequency, interval: number): string {
  return `FREQ=${frequency};INTERVAL=${Math.max(1, Math.round(interval))}`
}

/** Parse an RRULE string into frequency and interval */
export function parseRRule(rrule: string): ParsedRRule | null {
  const freqMatch = rrule.match(/FREQ=(MONTHLY|YEARLY)/)
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/)
  if (!freqMatch) return null
  return {
    frequency: freqMatch[1] as RRuleFrequency,
    interval: intervalMatch ? parseInt(intervalMatch[1], 10) : 1,
  }
}

/** Human-readable label for an RRULE string */
export function getRecurrenceLabel(rrule: string | undefined | null): string | null {
  if (!rrule) return null
  const preset = RECURRENCE_PRESETS.find(p => p.rrule === rrule)
  if (preset) return preset.label
  const parsed = parseRRule(rrule)
  if (!parsed) return null
  const unit = parsed.frequency === 'YEARLY' ? 'an' : 'mois'
  if (parsed.interval === 1) {
    return parsed.frequency === 'YEARLY' ? 'Annuel' : 'Mensuel'
  }
  const plural = unit === 'an' && parsed.interval > 1 ? 's' : ''
  return `Tous les ${parsed.interval} ${unit}${plural}`
}
