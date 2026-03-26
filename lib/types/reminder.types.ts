/**
 * Reminder Types - SEIDO Operations Phase 1
 *
 * Types for reminders (rappels) and recurrence system.
 */

import type { Database } from '@/lib/database.types'

// ============================================================================
// DATABASE ROW TYPES (from generated types)
// ============================================================================

export type Reminder = Database['public']['Tables']['reminders']['Row']
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']
export type ReminderUpdate = Database['public']['Tables']['reminders']['Update']

export type RecurrenceRule = Database['public']['Tables']['recurrence_rules']['Row']
export type RecurrenceRuleInsert = Database['public']['Tables']['recurrence_rules']['Insert']
export type RecurrenceRuleUpdate = Database['public']['Tables']['recurrence_rules']['Update']

export type RecurrenceOccurrence = Database['public']['Tables']['recurrence_occurrences']['Row']
export type RecurrenceOccurrenceInsert = Database['public']['Tables']['recurrence_occurrences']['Insert']
export type RecurrenceOccurrenceUpdate = Database['public']['Tables']['recurrence_occurrences']['Update']

// ============================================================================
// STATUS & PRIORITY
// ============================================================================

export type ReminderStatus = 'en_attente' | 'en_cours' | 'termine' | 'annule'
export type ReminderPriority = 'basse' | 'normale' | 'haute'
export type RecurrenceSourceType = 'intervention' | 'reminder'
export type OccurrenceStatus = 'pending' | 'notified' | 'confirmed' | 'skipped' | 'overdue'

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

export const REMINDER_PRIORITY_LABELS: Record<ReminderPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
}

export const REMINDER_PRIORITY_COLORS: Record<ReminderPriority, string> = {
  basse: 'text-muted-foreground',
  normale: 'text-amber-600',
  haute: 'text-destructive',
}

// ============================================================================
// ENRICHED TYPES (with relations)
// ============================================================================

export interface ReminderWithRelations extends Reminder {
  building?: { id: string; name: string } | null
  lot?: { id: string; reference: string } | null
  contact?: { id: string; name: string; first_name?: string | null; last_name?: string | null } | null
  contract?: { id: string; reference: string } | null
  assigned_user?: { id: string; name: string; first_name?: string | null; last_name?: string | null } | null
  created_by_user?: { id: string; name: string } | null
  recurrence_rule?: RecurrenceRule | null
}

// ============================================================================
// STATS
// ============================================================================

export interface ReminderStats {
  total: number
  en_attente: number
  en_cours: number
  termine: number
  annule: number
  overdue: number
  due_today: number
}
