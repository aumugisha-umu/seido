/**
 * Reminder Domain Service
 *
 * Business logic for reminder management.
 * Architecture: Server Actions → ReminderService → Repository → Supabase
 */

import type { ReminderRepository } from '../repositories/reminder.repository'
import {
  createServerReminderRepository,
  createServerActionReminderRepository,
} from '../repositories/reminder.repository'
import type {
  ReminderInsert,
  ReminderUpdate,
  ReminderWithRelations,
  ReminderStats,
  ReminderStatus,
} from '@/lib/types/reminder.types'

// ============================================================================
// SERVICE
// ============================================================================

export class ReminderService {
  constructor(private repo: ReminderRepository) {}

  /**
   * Get all reminders for a team
   */
  async getByTeam(
    teamId: string,
    filters?: { status?: ReminderStatus; assignedTo?: string }
  ): Promise<ReminderWithRelations[]> {
    return this.repo.findByTeam(teamId, filters)
  }

  /**
   * Get a single reminder by ID
   */
  async getById(id: string): Promise<ReminderWithRelations | null> {
    return this.repo.findByIdWithRelations(id)
  }

  /**
   * Get reminders assigned to a specific user
   */
  async getByAssignedTo(userId: string, teamId: string): Promise<ReminderWithRelations[]> {
    return this.repo.findByAssignedTo(userId, teamId)
  }

  /**
   * Create a new reminder
   */
  async create(data: ReminderInsert): Promise<{ id: string }> {
    const result = await this.repo.create(data, { skipInitialSelect: true })
    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to create reminder')
    }
    return { id: result.data.id as string }
  }

  /**
   * Update a reminder
   */
  async update(id: string, data: ReminderUpdate): Promise<void> {
    const result = await this.repo.update(id, data)
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to update reminder')
    }
  }

  /**
   * Start working on a reminder
   */
  async start(id: string): Promise<void> {
    const result = await this.repo.update(id, { status: 'en_cours' })
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to start reminder')
    }
  }

  /**
   * Complete a reminder
   */
  async complete(id: string): Promise<void> {
    await this.repo.complete(id)
  }

  /**
   * Cancel a reminder
   */
  async cancel(id: string): Promise<void> {
    await this.repo.cancel(id)
  }

  /**
   * Soft delete a reminder
   */
  async delete(id: string): Promise<void> {
    await this.repo.softDelete(id)
  }

  /**
   * Get stats for dashboard
   */
  async getStats(teamId: string): Promise<ReminderStats> {
    return this.repo.getStats(teamId)
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createServerReminderService = async () => {
  const repo = await createServerReminderRepository()
  return new ReminderService(repo)
}

export const createServerActionReminderService = async () => {
  const repo = await createServerActionReminderRepository()
  return new ReminderService(repo)
}
