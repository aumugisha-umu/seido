/**
 * Reminder Repository
 * Handles all database operations for reminders (rappels)
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import type {
  Reminder,
  ReminderInsert,
  ReminderUpdate,
  ReminderWithRelations,
  ReminderStats,
  ReminderStatus,
} from '@/lib/types/reminder.types'

// Select query for relations
const REMINDER_WITH_RELATIONS_SELECT = `
  *,
  building:buildings!reminders_building_id_fkey(id, name),
  lot:lots!reminders_lot_id_fkey(id, reference),
  contact:users!reminders_contact_id_fkey(id, name, first_name, last_name),
  contract:supplier_contracts!reminders_contract_id_fkey(id, reference),
  assigned_user:users!reminders_assigned_to_fkey(id, name, first_name, last_name),
  created_by_user:users!reminders_created_by_fkey(id, name),
  recurrence_rule:recurrence_rules!reminders_recurrence_rule_id_fkey(*)
`

// ============================================================================
// REMINDER REPOSITORY
// ============================================================================

export class ReminderRepository extends BaseRepository<Reminder, ReminderInsert, ReminderUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'reminders')
  }

  /**
   * Find reminders by team with relations
   */
  async findByTeam(
    teamId: string,
    filters?: { status?: ReminderStatus; assignedTo?: string }
  ): Promise<ReminderWithRelations[]> {
    let query = this.supabase
      .from('reminders')
      .select(REMINDER_WITH_RELATIONS_SELECT)
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      logger.error({ error, teamId }, 'Failed to find reminders by team')
      throw error
    }

    return (data || []) as unknown as ReminderWithRelations[]
  }

  /**
   * Find a single reminder by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<ReminderWithRelations | null> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select(REMINDER_WITH_RELATIONS_SELECT)
      .eq('id', id)
      .is('deleted_at', null)
      .limit(1)

    if (error) {
      logger.error({ error, id }, 'Failed to find reminder by ID')
      throw error
    }

    return (data?.[0] as unknown as ReminderWithRelations) || null
  }

  /**
   * Find reminders assigned to a specific user
   */
  async findByAssignedTo(userId: string, teamId: string): Promise<ReminderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select(REMINDER_WITH_RELATIONS_SELECT)
      .eq('team_id', teamId)
      .eq('assigned_to', userId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      logger.error({ error, userId, teamId }, 'Failed to find reminders by assigned user')
      throw error
    }

    return (data || []) as unknown as ReminderWithRelations[]
  }

  /**
   * Find reminders linked to a specific lot
   */
  async findByLot(lotId: string, teamId: string): Promise<ReminderWithRelations[]> {
    const { data, error } = await this.supabase
      .from('reminders')
      .select(REMINDER_WITH_RELATIONS_SELECT)
      .eq('team_id', teamId)
      .eq('lot_id', lotId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      logger.error({ error, lotId, teamId }, 'Failed to find reminders by lot')
      throw error
    }

    return (data || []) as unknown as ReminderWithRelations[]
  }

  /**
   * Find reminders linked to a building or any of its lots
   */
  async findByBuilding(buildingId: string, lotIds: string[], teamId: string): Promise<ReminderWithRelations[]> {
    let query = this.supabase
      .from('reminders')
      .select(REMINDER_WITH_RELATIONS_SELECT)
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (lotIds.length > 0) {
      query = query.or(`building_id.eq.${buildingId},lot_id.in.(${lotIds.join(',')})`)
    } else {
      query = query.eq('building_id', buildingId)
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      logger.error({ error, buildingId, teamId }, 'Failed to find reminders by building')
      throw error
    }

    return (data || []) as unknown as ReminderWithRelations[]
  }

  /**
   * Get reminder stats for a team (counts by status + overdue + due today)
   */
  async getStats(teamId: string): Promise<ReminderStats> {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    // Parallel queries for all counts
    const [allResult, overdueResult, dueTodayResult] = await Promise.all([
      this.supabase
        .from('reminders')
        .select('status')
        .eq('team_id', teamId)
        .is('deleted_at', null),
      this.supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .in('status', ['en_attente', 'en_cours'])
        .lt('due_date', now.toISOString()),
      this.supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .in('status', ['en_attente', 'en_cours'])
        .gte('due_date', todayStart)
        .lt('due_date', todayEnd),
    ])

    if (allResult.error) {
      logger.error({ error: allResult.error, teamId }, 'Failed to get reminder stats')
      throw allResult.error
    }

    const rows = allResult.data || []
    const statusCounts = rows.reduce((acc, row) => {
      const status = row.status as ReminderStatus
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: rows.length,
      en_attente: statusCounts['en_attente'] || 0,
      en_cours: statusCounts['en_cours'] || 0,
      termine: statusCounts['termine'] || 0,
      annule: statusCounts['annule'] || 0,
      overdue: overdueResult.count || 0,
      due_today: dueTodayResult.count || 0,
    }
  }

  /**
   * Soft delete a reminder
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('reminders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      logger.error({ error, id }, 'Failed to soft delete reminder')
      throw error
    }
  }

  /**
   * Complete a reminder
   */
  async complete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('reminders')
      .update({
        status: 'termine',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      logger.error({ error, id }, 'Failed to complete reminder')
      throw error
    }
  }

  /**
   * Cancel a reminder
   */
  async cancel(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('reminders')
      .update({ status: 'annule' })
      .eq('id', id)

    if (error) {
      logger.error({ error, id }, 'Failed to cancel reminder')
      throw error
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createReminderRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new ReminderRepository(supabase)
}

export const createServerReminderRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new ReminderRepository(supabase)
}

export const createServerActionReminderRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new ReminderRepository(supabase)
}
