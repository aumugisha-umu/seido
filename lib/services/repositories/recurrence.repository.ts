/**
 * Recurrence Repository
 * Handles database operations for recurrence rules and occurrences
 */

import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient,
  createServiceRoleSupabaseClient,
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type {
  RecurrenceRule,
  RecurrenceRuleInsert,
  RecurrenceOccurrence,
  RecurrenceOccurrenceInsert,
  OccurrenceStatus,
  RecurrenceSourceType,
} from '@/lib/types/reminder.types'

// ============================================================================
// RECURRENCE RULE REPOSITORY
// ============================================================================

export class RecurrenceRuleRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a recurrence rule
   */
  async create(data: RecurrenceRuleInsert): Promise<RecurrenceRule> {
    const { data: rule, error } = await this.supabase
      .from('recurrence_rules')
      .insert(data)
      .select()
      .limit(1)

    if (error) {
      logger.error({ error }, 'Failed to create recurrence rule')
      throw error
    }

    return rule[0]
  }

  /**
   * Find active recurrence rules for a team
   */
  async findActiveByTeam(teamId: string, sourceType?: RecurrenceSourceType): Promise<RecurrenceRule[]> {
    let query = this.supabase
      .from('recurrence_rules')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (sourceType) {
      query = query.eq('source_type', sourceType)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error({ error, teamId }, 'Failed to find active recurrence rules')
      throw error
    }

    return data || []
  }

  /**
   * Find recurrence rule by ID
   */
  async findById(id: string): Promise<RecurrenceRule | null> {
    const { data, error } = await this.supabase
      .from('recurrence_rules')
      .select('*')
      .eq('id', id)
      .limit(1)

    if (error) {
      logger.error({ error, id }, 'Failed to find recurrence rule')
      throw error
    }

    return data?.[0] || null
  }

  /**
   * Deactivate a recurrence rule
   */
  async deactivate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('recurrence_rules')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      logger.error({ error, id }, 'Failed to deactivate recurrence rule')
      throw error
    }
  }
}

// ============================================================================
// RECURRENCE OCCURRENCE REPOSITORY
// ============================================================================

export class RecurrenceOccurrenceRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create occurrences in batch
   */
  async createBatch(occurrences: RecurrenceOccurrenceInsert[]): Promise<RecurrenceOccurrence[]> {
    if (occurrences.length === 0) return []

    const { data, error } = await this.supabase
      .from('recurrence_occurrences')
      .insert(occurrences)
      .select()

    if (error) {
      logger.error({ error, count: occurrences.length }, 'Failed to create recurrence occurrences')
      throw error
    }

    return data || []
  }

  /**
   * Find pending occurrences for a rule
   */
  async findPendingByRule(ruleId: string): Promise<RecurrenceOccurrence[]> {
    const { data, error } = await this.supabase
      .from('recurrence_occurrences')
      .select('*')
      .eq('rule_id', ruleId)
      .eq('status', 'pending')
      .order('occurrence_date', { ascending: true })

    if (error) {
      logger.error({ error, ruleId }, 'Failed to find pending occurrences')
      throw error
    }

    return data || []
  }

  /**
   * Find all occurrences for a rule (history view)
   */
  async findByRule(ruleId: string): Promise<RecurrenceOccurrence[]> {
    const { data, error } = await this.supabase
      .from('recurrence_occurrences')
      .select('*')
      .eq('rule_id', ruleId)
      .order('occurrence_date', { ascending: false })

    if (error) {
      logger.error({ error, ruleId }, 'Failed to find occurrences by rule')
      throw error
    }

    return data || []
  }

  /**
   * Update occurrence status
   */
  async updateStatus(id: string, status: OccurrenceStatus, confirmedBy?: string): Promise<void> {
    const update: Record<string, unknown> = { status }
    if (status === 'confirmed' && confirmedBy) {
      update.confirmed_by = confirmedBy
      update.confirmed_at = new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('recurrence_occurrences')
      .update(update)
      .eq('id', id)

    if (error) {
      logger.error({ error, id, status }, 'Failed to update occurrence status')
      throw error
    }
  }

  /**
   * Link a generated entity to an occurrence
   */
  async linkGeneratedEntity(id: string, entityType: RecurrenceSourceType, entityId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recurrence_occurrences')
      .update({
        generated_entity_type: entityType,
        generated_entity_id: entityId,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      logger.error({ error, id, entityType, entityId }, 'Failed to link generated entity')
      throw error
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createRecurrenceRuleRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new RecurrenceRuleRepository(supabase)
}

export const createServerRecurrenceRuleRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new RecurrenceRuleRepository(supabase)
}

export const createServerActionRecurrenceRuleRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new RecurrenceRuleRepository(supabase)
}

export const createServiceRoleRecurrenceRuleRepository = () => {
  const supabase = createServiceRoleSupabaseClient()
  return new RecurrenceRuleRepository(supabase)
}

export const createRecurrenceOccurrenceRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new RecurrenceOccurrenceRepository(supabase)
}

export const createServerActionRecurrenceOccurrenceRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new RecurrenceOccurrenceRepository(supabase)
}

export const createServiceRoleRecurrenceOccurrenceRepository = () => {
  const supabase = createServiceRoleSupabaseClient()
  return new RecurrenceOccurrenceRepository(supabase)
}
