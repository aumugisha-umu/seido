/**
 * User Repository - Phase 2
 * Handles all database operations for users using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User, UserInsert, UserUpdate } from '../core/service-types'
import { ValidationException, NotFoundException } from '../core/error-handler'
import {
  validateRequired,
  validateEmail,
  validateLength,
  validateEnum
} from '../core/service-types'

/**
 * User Repository
 * Manages all database operations for users
 */
export class UserRepository extends BaseRepository<User, UserInsert, UserUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'users')
  }

  /**
   * Validation hook for user data
   */
  protected async validate(data: UserInsert | UserUpdate): Promise<void> {
    if ('email' in data && data.email) {
      validateEmail(data.email)
    }

    if ('name' in data && data.name) {
      validateLength(data.name, 2, 100, 'name')
    }

    if ('role' in data && data.role) {
      validateEnum(data.role, ['admin', 'manager', 'provider', 'tenant'] as const, 'role')
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['email', 'name', 'role'])
    }
  }

  /**
   * Type guard to check if data is for insert (has required fields)
   */
  private isInsertData(data: UserInsert | UserUpdate): data is UserInsert {
    return 'email' in data && 'name' in data && 'role' in data
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    validateEmail(email)

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return { success: true as const, data: null }
      }
      return this.handleError(error)
    }

    return { success: true as const, data }
  }

  /**
   * Find user by auth_user_id
   */
  async findByAuthUserId(authUserId: string) {
    validateRequired({ authUserId }, ['authUserId'])

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('auth_user_id', authUserId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return { success: true as const, data: null }
      }
      return this.handleError(error)
    }

    return { success: true as const, data }
  }

  /**
   * Get users by role
   */
  async findByRole(role: User['role']) {
    validateEnum(role, ['admin', 'manager', 'provider', 'tenant'] as const, 'role')

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('role', role)
      .order('name')

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get users by team
   */
  async findByTeam(teamId: string) {
    validateRequired({ teamId }, ['teamId'])

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .order('name')

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data }
  }

  /**
   * Search users by name or email
   */
  async search(query: string, options?: { role?: User['role']; teamId?: string }) {
    validateLength(query, 1, 100, 'search query')

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)

    if (options?.role) {
      validateEnum(options.role, ['admin', 'manager', 'provider', 'tenant'] as const, 'role')
      queryBuilder = queryBuilder.eq('role', options.role)
    }

    if (options?.teamId) {
      queryBuilder = queryBuilder.eq('team_id', options.teamId)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Check if email exists (for validation)
   */
  async emailExists(email: string, excludeId?: string) {
    validateEmail(email)

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('email', email)

    if (excludeId) {
      queryBuilder = queryBuilder.neq('id', excludeId)
    }

    const { data, error } = await queryBuilder.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found = email doesn't exist
        return { success: true as const, exists: false }
      }
      return this.handleError(error)
    }

    return { success: true as const, exists: true }
  }

  /**
   * Get user with team details
   */
  async findByIdWithTeam(id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(
          id,
          name,
          description,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('User not found', this.tableName, id)
      }
      return this.handleError(error)
    }

    return { success: true as const, data }
  }

  /**
   * Get active users (seen in last 30 days)
   */
  async findActiveUsers(daysAgo = 30) {
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo)

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .gte('last_seen_at', dateThreshold.toISOString())
      .order('last_seen_at', { ascending: false })

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Bulk update users' team
   */
  async updateTeamBulk(userIds: string[], teamId: string | null) {
    if (!userIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ team_id: teamId })
      .in('id', userIds)
      .select()

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }
}

// Factory functions for creating repository instances
export const createUserRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new UserRepository(supabase)
}

export const createServerUserRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new UserRepository(supabase)
}