/**
 * User Repository - Phase 2
 * Handles all database operations for users using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User, UserInsert, UserUpdate } from '../core/service-types'
import { NotFoundException, handleError } from '../core/error-handler'
import {
  validateRequired,
  validateEmail,
  validateLength,
  validateEnum
} from '../core/service-types'
import { logger } from '@/lib/logger'

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
   * Uses maybeSingle() to handle RLS-blocked results gracefully
   * (returns null instead of 406 error when RLS blocks access)
   */
  async findByEmail(email: string) {
    validateEmail(email)

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      return { success: false as const, error: handleError(error) }
    }

    // maybeSingle() returns null if not found or RLS blocks - no error
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
      return { success: false as const, error: handleError(error) }
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
      return { success: false as const, error: handleError(error) }
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get users by team
   * @param excludeUserId - Optional user ID to exclude from results (e.g., current user)
   */
  async findByTeam(teamId: string, excludeUserId?: string) {
    validateRequired({ teamId }, ['teamId'])

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)

    if (excludeUserId) {
      queryBuilder = queryBuilder.neq('id', excludeUserId)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return { success: false as const, error: handleError(error) }
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
      return { success: false as const, error: handleError(error) }
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
      return { success: false as const, error: handleError(error) }
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

    const { error } = await queryBuilder.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found = email doesn't exist
        return { success: true as const, exists: false }
      }
      return { success: false as const, error: handleError(error) }
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
        throw new NotFoundException(this.tableName, id)
      }
      return { success: false as const, error: handleError(error) }
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
      return { success: false as const, error: handleError(error) }
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Find multiple users by IDs in a single query (batch operation)
   * ✅ PERFORMANCE FIX (Oct 23, 2025 - Issue #1): Prevents N+1 query pattern
   *
   * @param userIds Array of user IDs to fetch
   * @returns Array of users (may be less than input if some IDs don't exist)
   */
  async findByIds(userIds: string[]) {
    if (!userIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .in('id', userIds)

    if (error) {
      return { success: false as const, error: handleError(error) }
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Find multiple users by IDs that have a linked auth account (batch operation)
   * ✅ NOTIFICATION FIX (Jan 2026): Only return users who can actually log in
   *
   * Use this method for notifications to ensure:
   * - Emails are only sent to users who can click magic links and log in
   * - In-app notifications are only created for users who can see them
   *
   * @param userIds Array of user IDs to fetch
   * @returns Array of users with auth_user_id (users without auth are excluded)
   */
  async findByIdsWithAuth(userIds: string[]) {
    if (!userIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .in('id', userIds)
      .not('auth_user_id', 'is', null) // Only users with linked auth account

    if (error) {
      return { success: false as const, error: handleError(error) }
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
      return { success: false as const, error: handleError(error) }
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Find user by email within a team
   * With UNIQUE(email, team_id), each team has its own user record
   * Simply query by email + team_id directly on users table
   */
  async findByEmailInTeam(email: string, teamId: string) {
    if (!email) {
      return { success: true as const, data: null }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      return { success: false as const, error: handleError(error) }
    }

    return { success: true as const, data: data as User | null }
  }

  /**
   * Bulk upsert users (for import)
   * With UNIQUE(email, team_id), each team gets its own user record
   * - If email exists in THIS team → UPDATE
   * - If email doesn't exist in THIS team → CREATE (even if email exists in other teams)
   */
  async upsertMany(
    users: (UserInsert & { _existingId?: string })[],
    teamId: string
  ): Promise<{ success: true; created: string[]; updated: string[]; skipped: string[] } | { success: false; error: { code: string; message: string } }> {
    const created: string[] = []
    const updated: string[] = []
    const skipped: string[] = []

    logger.info('[USER-REPO] upsertMany starting', { count: users.length, teamId })

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      logger.debug(`[USER-REPO] Processing user ${i + 1}/${users.length}`, { name: user.name, email: user.email })

      // Check if user already exists in THIS team
      if (user.email) {
        const existingInTeamResult = await this.findByEmailInTeam(user.email, teamId)

        if (!existingInTeamResult.success) {
          return existingInTeamResult as { success: false; error: { code: string; message: string } }
        }

        if (existingInTeamResult.data) {
          // User already exists in THIS team → UPDATE
          const updateResult = await this.update(existingInTeamResult.data.id, {
            name: user.name,
            phone: user.phone,
            address: user.address,
            speciality: user.speciality,
            notes: user.notes,
          })

          if (!updateResult.success) {
            return updateResult as { success: false; error: { code: string; message: string } }
          }

          updated.push(existingInTeamResult.data.id)
          continue
        }
      }

      // User doesn't exist in THIS team → CREATE new user
      // With UNIQUE(email, team_id), this succeeds even if email exists in other teams
      const { _rowIndex, _existingId, _companyId, ...userDataForDb } = user as typeof user & { _rowIndex?: number; _companyId?: string }
      const createResult = await this.create({
        ...userDataForDb,
        email: user.email?.toLowerCase().trim() || null,
        team_id: teamId,
      })

      if (!createResult.success) {
        // CONFLICT means email+team_id already exists (shouldn't happen as we checked above)
        // But handle gracefully by trying to update instead
        if (createResult.error.code === 'CONFLICT' && user.email) {
          logger.info('[USER-REPO] Conflict on create, attempting update', { email: user.email, teamId })
          
          // Re-fetch and update
          const refetchResult = await this.findByEmailInTeam(user.email, teamId)
          if (refetchResult.success && refetchResult.data) {
            await this.update(refetchResult.data.id, {
              name: user.name,
              phone: user.phone,
              address: user.address,
              speciality: user.speciality,
              notes: user.notes,
            })
            updated.push(refetchResult.data.id)
            continue
          }
          
          // If still can't find, skip
          logger.warn('[USER-REPO] Could not resolve conflict for user', { email: user.email })
          skipped.push(user.email)
          continue
        }

        return createResult as { success: false; error: { code: string; message: string } }
      }

      // Add to team_members using SECURITY DEFINER function to bypass RLS recursion
      const { error: memberError } = await this.supabase
        .rpc('add_user_to_team', {
          p_user_id: createResult.data.id,
          p_team_id: teamId,
          p_role: user.role,
        })

      if (memberError) {
        logger.warn('[USER-REPO] Failed to add user to team_members:', memberError)
      }

      created.push(createResult.data.id)
    }

    logger.info('[USER-REPO] upsertMany completed', { created: created.length, updated: updated.length, skipped: skipped.length })
    return { success: true, created, updated, skipped }
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

/**
 * Create User Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionUserRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new UserRepository(supabase)
}
