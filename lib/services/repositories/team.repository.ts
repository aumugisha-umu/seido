/**
 * Team Repository - Phase 3.2
 * Handles all database operations for teams with member management and caching
 */

import { BaseRepository } from '../core/base-repository'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Team, TeamMember } from '../core/service-types'
import { ValidationException, NotFoundException } from '../core/error-handler'
import {
  validateRequired,
  validateLength
} from '../core/service-types'

// Repository-specific types
export interface TeamInsert {
  name: string
  description?: string | null
  created_by: string
  created_at?: string
}

export interface TeamUpdate {
  name?: string
  description?: string | null
  updated_at?: string
}

export interface TeamMemberInsert {
  team_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at?: string
}

export interface TeamMemberUpdate {
  role?: 'admin' | 'member'
  updated_at?: string
}

export interface TeamWithMembers extends Team {
  team_members?: Array<TeamMember & {
    user?: {
      id: string
      name: string
      email: string
      role: string
    }
  }>
  created_by_user?: {
    name: string
    email: string
  }
}

/**
 * Team Repository
 * Manages all database operations for teams with advanced member management and caching
 */
export class TeamRepository extends BaseRepository<Team, TeamInsert, TeamUpdate> {
  // Cache for team data
  private teamsCache = new Map<string, { data: TeamWithMembers[], timestamp: number }>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly STALE_WHILE_REVALIDATE_TTL = 30 * 60 * 1000 // 30 minutes

  constructor(supabase: SupabaseClient) {
    super(supabase, 'teams')
  }

  /**
   * Validation hook for team data
   */
  protected async validate(data: TeamInsert | TeamUpdate): Promise<void> {
    if ('name' in data && data.name) {
      validateRequired({ name: data.name }, ['name'])
      validateLength(data.name, 'name', 2, 100)
    }

    if ('description' in data && data.description) {
      validateLength(data.description, 'description', 0, 500)
    }

    if ('created_by' in data && data.created_by) {
      validateRequired({ created_by: data.created_by }, ['created_by'])
    }
  }

  /**
   * Get all teams with members information
   */
  async findAllWithMembers() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        created_by_user:created_by(name, email),
        team_members(
          id,
          role,
          joined_at,
          user:user_id(id, name, email, role)
        )
      `)
      .order('name')

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get team by ID with members
   */
  async findByIdWithMembers(id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        created_by_user:created_by(name, email),
        team_members(
          id,
          role,
          joined_at,
          user:user_id(id, name, email, role, provider_category)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Team not found', this.tableName, id)
      }
      return this.handleError(error)
    }

    return { success: true as const, data }
  }

  /**
   * Get teams for a specific user with intelligent caching
   */
  async findUserTeams(userId: string): Promise<{ success: true; data: TeamWithMembers[] }> {
    // Protection against JWT-only users
    if (userId.startsWith('jwt_')) {
      console.log('⚠️ [TEAM-REPOSITORY] JWT-only user detected, returning empty teams list')
      return { success: true, data: [] }
    }

    // Check cache first
    const cacheKey = `teams_${userId}`
    const cached = this.teamsCache.get(cacheKey)
    const now = Date.now()

    // Return fresh cache
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log('✅ Returning fresh cached teams data')
      return { success: true, data: cached.data }
    }

    // Stale-while-revalidate: return stale data while updating in background
    if (cached && (now - cached.timestamp) < this.STALE_WHILE_REVALIDATE_TTL) {
      console.log('🔄 Returning stale data while revalidating in background')

      // Background update without waiting
      this.fetchUserTeamsFromDB(userId, cacheKey).catch(error => {
        console.error('❌ Background team fetch failed:', error)
      })

      return { success: true, data: cached.data }
    }

    // No valid cache, fetch fresh data
    return this.fetchUserTeamsFromDB(userId, cacheKey)
  }

  /**
   * Private method to fetch user teams from database
   */
  private async fetchUserTeamsFromDB(userId: string, cacheKey: string): Promise<{ success: true; data: TeamWithMembers[] }> {
    try {
      // 1. Get user's team memberships
      const { data: memberData, error: memberError } = await this.supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userId)

      if (memberError) {
        throw memberError
      }

      if (!memberData || memberData.length === 0) {
        console.log('ℹ️ User is not member of any team')
        this.teamsCache.set(cacheKey, { data: [], timestamp: Date.now() })
        return { success: true, data: [] }
      }

      // 2. Get team details
      const teamIds = memberData.map((m: { team_id: string }) => m.team_id)
      const { data: teamData, error: teamError } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          created_by_user:created_by(name, email),
          team_members(
            id,
            role,
            joined_at,
            user:user_id(id, name, email, role)
          )
        `)
        .in('id', teamIds)
        .order('name')

      if (teamError) {
        throw teamError
      }

      const result = teamData || []

      // Cache the result
      this.teamsCache.set(cacheKey, { data: result, timestamp: Date.now() })

      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error fetching user teams:', error)
      throw error
    }
  }

  /**
   * Create team with automatic admin membership for creator
   */
  async createWithMember(teamData: TeamInsert): Promise<{ success: true; data: TeamWithMembers }> {
    // Start transaction-like operation
    try {
      // 1. Create the team
      const { data: team, error: teamError } = await this.supabase
        .from(this.tableName)
        .insert({
          ...teamData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (teamError) {
        throw teamError
      }

      // 2. Add creator as admin member
      const memberData: TeamMemberInsert = {
        team_id: team.id,
        user_id: teamData.created_by,
        role: 'admin',
        joined_at: new Date().toISOString()
      }

      const { error: memberError } = await this.supabase
        .from('team_members')
        .insert(memberData)

      if (memberError) {
        // Cleanup: delete the team if member creation fails
        try {
          await this.supabase.from(this.tableName).delete().eq('id', team.id)
        } catch (deleteError) {
          console.error('❌ Failed to cleanup team after member error:', deleteError)
        }
        throw memberError
      }

      // 3. Update user's team_id (optional, for backwards compatibility)
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ team_id: team.id })
        .eq('id', teamData.created_by)

      if (updateError) {
        console.error('❌ Failed to update user team_id:', updateError)
        // Continue anyway, user is in team_members
      }

      // 4. Clear cache for this user
      this.clearUserCache(teamData.created_by)

      // 5. Return team with member data
      const result = await this.findByIdWithMembers(team.id)
      return result as { success: true; data: TeamWithMembers }

    } catch (error) {
      console.error('❌ Team creation failed:', error)
      throw error
    }
  }

  /**
   * Add member to team
   */
  async addMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member') {
    // Check if user is already a member
    const { data: existingMember, error: checkError } = await this.supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return this.handleError(checkError)
    }

    if (existingMember) {
      throw new ValidationException('User is already a member of this team', 'team_members', 'user_id')
    }

    const memberData: TeamMemberInsert = {
      team_id: teamId,
      user_id: userId,
      role,
      joined_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('team_members')
      .insert(memberData)
      .select(`
        *,
        user:user_id(id, name, email, role)
      `)
      .single()

    if (error) {
      return this.handleError(error)
    }

    // Clear cache for this user
    this.clearUserCache(userId)

    return { success: true as const, data }
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId: string, userId: string) {
    // Protection against JWT-only users
    if (userId.startsWith('jwt_')) {
      throw new ValidationException('Operation not available for JWT-only users', 'team_members', 'user_id')
    }

    // Check if user is a member
    const { data: member, error: checkError } = await this.supabase
      .from('team_members')
      .select('id, role')
      .eq('team_id', teamId)
      .eq('user_id', _userId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new NotFoundException('Member not found in team', 'team_members', `${teamId}-${userId}`)
      }
      return this.handleError(checkError)
    }

    // Prevent removing last admin
    if (member.role === 'admin') {
      const { data: adminCount, error: countError } = await this.supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('role', 'admin')

      if (countError) {
        return this.handleError(countError)
      }

      if (adminCount && adminCount.length <= 1) {
        throw new ValidationException('Cannot remove the last admin from team', 'team_members', 'role')
      }
    }

    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', _userId)

    if (error) {
      return this.handleError(error)
    }

    // Clear cache for this user
    this.clearUserCache(userId)

    return { success: true as const, data: true }
  }

  /**
   * Update member role
   */
  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member') {
    // Protection against JWT-only users
    if (userId.startsWith('jwt_')) {
      throw new ValidationException('Operation not available for JWT-only users', 'team_members', 'user_id')
    }

    // If demoting from admin, check we don't remove last admin
    if (role === 'member') {
      const { data: currentMember, error: currentError } = await this.supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single()

      if (currentError) {
        return this.handleError(currentError)
      }

      if (currentMember?.role === 'admin') {
        const { data: adminCount, error: countError } = await this.supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('role', 'admin')

        if (countError) {
          return this.handleError(countError)
        }

        if (adminCount && adminCount.length <= 1) {
          throw new ValidationException('Cannot demote the last admin', 'team_members', 'role')
        }
      }
    }

    const { data, error } = await this.supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', _userId)
      .select(`
        *,
        user:user_id(id, name, email, role)
      `)
      .single()

    if (error) {
      return this.handleError(error)
    }

    // Clear cache for this user
    this.clearUserCache(userId)

    return { success: true as const, data }
  }

  /**
   * Get all members of a team
   */
  async getTeamMembers(teamId: string) {
    const { data, error } = await this.supabase
      .from('team_members')
      .select(`
        *,
        user:user_id(id, name, email, role, provider_category)
      `)
      .eq('team_id', teamId)
      .order('joined_at')

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get team statistics
   */
  async getTeamStats() {
    const { data: stats, error } = await this.supabase
      .from(this.tableName)
      .select('id')

    if (error) {
      return this.handleError(error)
    }

    const { data: memberStats, error: memberError } = await this.supabase
      .from('team_members')
      .select('team_id, role')

    if (memberError) {
      return this.handleError(memberError)
    }

    // Calculate statistics
    const totalTeams = stats?.length || 0
    const totalMembers = memberStats?.length || 0

    const membersByRole = {
      admin: 0,
      member: 0
    }

    memberStats?.forEach(member => {
      if (member.role) {
        membersByRole[member.role as keyof typeof membersByRole]++
      }
    })

    return {
      success: true as const,
      data: {
        totalTeams,
        totalMembers,
        averageMembersPerTeam: totalTeams > 0 ? Math.round(totalMembers / totalTeams * 10) / 10 : 0,
        membersByRole
      }
    }
  }

  /**
   * Clear cache for a specific user
   */
  private clearUserCache(userId: string) {
    const cacheKey = `teams_${userId}`
    this.teamsCache.delete(cacheKey)
  }

  /**
   * Clear all cache (useful for testing or forced refresh)
   */
  clearAllCache() {
    this.teamsCache.clear()
  }
}

// Factory functions for creating repository instances
export const createTeamRepository = () => {
  const supabase = createBrowserSupabaseClient()
  return new TeamRepository(supabase)
}

export const createServerTeamRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new TeamRepository(supabase)
}
