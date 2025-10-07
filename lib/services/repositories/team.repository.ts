/**
 * Team Repository - Phase 3.2
 * Handles all database operations for teams with member management and caching
 */

import { BaseRepository } from '../core/base-repository'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Team, TeamMember } from '../core/service-types'
import { ValidationException, NotFoundException, handleError } from '../core/error-handler'
import { logger, logError } from '@/lib/logger'
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

  // Détecte les erreurs d'authentification (JWT expiré/401)
  private isAuthError(error: unknown): boolean {
    const err = error as { message?: string; code?: string; status?: number }
    const msg = (err?.message || '').toLowerCase()
    return (
      err?.status === 401 ||
      err?.code === '401' ||
      msg.includes('jwt') ||
      msg.includes('unauthorized') ||
      msg.includes('invalid token') ||
      msg.includes('expired')
    )
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
   * ⚠️ ANTI-RECURSION PATTERN: Splits query to avoid RLS infinite recursion
   */
  async findAllWithMembers() {
    try {
      // STEP 1: Get all teams (no JOIN to team_members)
      const { data: teamData, error: teamError } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          created_by_user:created_by(name, email)
        `)
        .order('name')

      if (teamError) {
        return { success: false as const, error: handleError(teamError, 'team') }
      }

      if (!teamData || teamData.length === 0) {
        return { success: true as const, data: [] }
      }

      // STEP 2: Get team_members for all teams (no JOIN to users)
      const teamIds = teamData.map(t => t.id)
      const { data: allTeamMembers, error: membersError } = await this.supabase
        .from('team_members')
        .select('id, team_id, user_id, role, joined_at')
        .in('team_id', teamIds)

      if (membersError) {
        return { success: false as const, error: handleError(membersError, 'team') }
      }

      // STEP 3: Get user details for all members (separate query)
      const userIds = allTeamMembers?.map(m => m.user_id).filter(Boolean) || []
      const { data: usersData, error: usersError } = await this.supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', userIds)

      if (usersError) {
        logger.warn('⚠️ Could not fetch user details:', usersError)
        // Continue without user details rather than failing
      }

      // STEP 4: Merge results in memory
      const result = teamData.map(team => {
        const teamMembers = allTeamMembers
          ?.filter(m => m.team_id === team.id)
          .map(member => {
            const user = usersData?.find(u => u.id === member.user_id)
            return {
              id: member.id,
              role: member.role,
              joined_at: member.joined_at,
              user: user ? {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
              } : null
            }
          }) || []

        return {
          ...team,
          team_members: teamMembers
        }
      })

      return { success: true as const, data: result }
    } catch (error) {
      logger.error('❌ Error in findAllWithMembers:', error)
      return { success: false as const, error: handleError(error as Error, 'team') }
    }
  }

  /**
   * Get team by ID with members
   * ⚠️ ANTI-RECURSION PATTERN: Splits query to avoid RLS infinite recursion
   */
  async findByIdWithMembers(id: string) {
    try {
      // STEP 1: Get team details (no JOIN to team_members)
      const { data: teamData, error: teamError } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          created_by_user:created_by(name, email)
        `)
        .eq('id', id)
        .single()

      if (teamError) {
        if (teamError.code === 'PGRST116') {
          throw new NotFoundException('Team not found', this.tableName, id)
        }
        return { success: false as const, error: handleError(teamError, 'team') }
      }

      // STEP 2: Get team_members for this team (no JOIN to users)
      const { data: teamMembers, error: membersError } = await this.supabase
        .from('team_members')
        .select('id, user_id, role, joined_at')
        .eq('team_id', id)

      if (membersError) {
        return { success: false as const, error: handleError(membersError, 'team') }
      }

      // STEP 3: Get user details for all members (separate query)
      const userIds = teamMembers?.map(m => m.user_id).filter(Boolean) || []
      const { data: usersData, error: usersError } = await this.supabase
        .from('users')
        .select('id, name, email, role, provider_category')
        .in('id', userIds)

      if (usersError) {
        logger.warn('⚠️ Could not fetch user details:', usersError)
        // Continue without user details rather than failing
      }

      // STEP 4: Merge results in memory
      const enrichedMembers = teamMembers?.map(member => {
        const user = usersData?.find(u => u.id === member.user_id)
        return {
          id: member.id,
          role: member.role,
          joined_at: member.joined_at,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            provider_category: user.provider_category
          } : null
        }
      }) || []

      const result = {
        ...teamData,
        team_members: enrichedMembers
      }

      return { success: true as const, data: result }
    } catch (error) {
      logger.error('❌ Error in findByIdWithMembers:', error)
      if (error instanceof NotFoundException) {
        throw error
      }
      return { success: false as const, error: handleError(error as Error, 'team') }
    }
  }

  /**
   * Get teams for a specific user with intelligent caching
   */
  async findUserTeams(userId: string): Promise<{ success: true; data: TeamWithMembers[] }> {
    // Protection against JWT-only users
    if (userId.startsWith('jwt_')) {
      logger.info('⚠️ [TEAM-REPOSITORY] JWT-only user detected, returning empty teams list')
      return { success: true, data: [] }
    }

    // Check cache first
    const cacheKey = `teams_${userId}`
    const cached = this.teamsCache.get(cacheKey)
    const now = Date.now()

    // Return fresh cache
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      logger.info('✅ Returning fresh cached teams data')
      return { success: true, data: cached.data }
    }

    // Stale-while-revalidate: return stale data while updating in background
    if (cached && (now - cached.timestamp) < this.STALE_WHILE_REVALIDATE_TTL) {
      logger.info('🔄 Returning stale data while revalidating in background')

      // Background update without waiting
      this.fetchUserTeamsFromDB(userId, cacheKey).catch(async (error) => {
        if (this.isAuthError(error)) {
          try {
            await this.supabase.auth.refreshSession()
            await this.fetchUserTeamsFromDB(userId, cacheKey)
            return
          } catch (retryError) {
            logger.error('❌ Background team fetch retry failed:', retryError)
          }
        }
        logger.error('❌ Background team fetch failed:', error)
      })

      return { success: true, data: cached.data }
    }

    // No valid cache, fetch fresh data (avec retry 401 unique)
    try {
      return await this.fetchUserTeamsFromDB(userId, cacheKey)
    } catch (error) {
      if (this.isAuthError(error)) {
        await this.supabase.auth.refreshSession()
        return await this.fetchUserTeamsFromDB(userId, cacheKey)
      }
      throw error
    }
  }

  /**
   * Private method to fetch user teams from database
   *
   * ⚠️ ANTI-RECURSION PATTERN:
   * Splits query into 3 sequential steps to avoid RLS infinite recursion
   * - Step 1: Get team_members (no JOIN)
   * - Step 2: Get teams details (no JOIN)
   * - Step 3: Get users details separately
   * - Step 4: Merge results in memory
   */
  private async fetchUserTeamsFromDB(userId: string, cacheKey: string): Promise<{ success: true; data: TeamWithMembers[] }> {
    try {
      // 🔍 DEBUG: Log user ID and session status
      logger.info('🔍 [TEAM-REPO-DEBUG] Fetching teams for user:', userId)

      // Check if Supabase session is valid
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession()
      logger.info('🔍 [TEAM-REPO-DEBUG] Supabase session status:', {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionError: sessionError?.message,
        requestedUserId: userId
      })

      // STEP 1: Get user's team memberships (no JOIN to avoid RLS recursion)
      const { data: memberData, error: memberError } = await this.supabase
        .from('team_members')
        .select('team_id, role, id, joined_at, user_id')
        .eq('user_id', userId)

      // 🔍 DEBUG: Log team_members query result
      logger.info('🔍 [TEAM-REPO-DEBUG] team_members query result:', {
        success: !memberError,
        error: memberError?.message,
        errorCode: memberError?.code,
        dataLength: memberData?.length || 0,
        data: memberData
      })

      if (memberError) {
        throw memberError
      }

      if (!memberData || memberData.length === 0) {
        logger.info('ℹ️ User is not member of any team')
        this.teamsCache.set(cacheKey, { data: [], timestamp: Date.now() })
        return { success: true, data: [] }
      }

      // STEP 2: Get team details (NO team_members JOIN)
      const teamIds = memberData.map((m: { team_id: string }) => m.team_id)
      const { data: teamData, error: teamError } = await this.supabase
        .from(this.tableName)
        .select(`
          *,
          created_by_user:created_by(name, email)
        `)
        .in('id', teamIds)
        .order('name')

      if (teamError) {
        throw teamError
      }

      if (!teamData || teamData.length === 0) {
        this.teamsCache.set(cacheKey, { data: [], timestamp: Date.now() })
        return { success: true, data: [] }
      }

      // STEP 3: Get ALL team_members for these teams (separate query)
      const { data: allTeamMembers, error: allMembersError } = await this.supabase
        .from('team_members')
        .select('id, team_id, user_id, role, joined_at')
        .in('team_id', teamIds)

      if (allMembersError) {
        throw allMembersError
      }

      // STEP 4: Get user details for all members (separate query, bypasses RLS recursion)
      const userIds = allTeamMembers?.map((m: { user_id: string }) => m.user_id).filter(Boolean) || []
      const { data: usersData, error: usersError } = await this.supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', userIds)

      if (usersError) {
        logger.warn('⚠️ Could not fetch user details:', usersError)
        // Continue without user details rather than failing
      }

      // STEP 5: Merge results in memory (avoid JOIN in SQL)
      const result = teamData.map((team: any) => {
        // Get team_members for this team
        const teamMembers = allTeamMembers
          ?.filter((m: { team_id: string }) => m.team_id === team.id)
          .map((member: { id: string; role: string; joined_at: string; user_id: string }) => {
            // Find user details for this member
            const user = usersData?.find((u: { id: string }) => u.id === member.user_id)
            return {
              id: member.id,
              role: member.role,
              joined_at: member.joined_at,
              user: user ? {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
              } : null
            }
          }) || []

        return {
          ...team,
          team_members: teamMembers
        }
      })

      // Cache the result
      this.teamsCache.set(cacheKey, { data: result, timestamp: Date.now() })

      return { success: true, data: result }
    } catch (error) {
      logger.error('❌ Error fetching user teams:', error)
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
          logger.error('❌ Failed to cleanup team after member error:', deleteError)
        }
        throw memberError
      }

      // 3. Update user's team_id (optional, for backwards compatibility)
      const { error: updateError } = await this.supabase
        .from('users')
        .update({ team_id: team.id })
        .eq('id', teamData.created_by)

      if (updateError) {
        logger.error('❌ Failed to update user team_id:', updateError)
        // Continue anyway, user is in team_members
      }

      // 4. Clear cache for this user
      this.clearUserCache(teamData.created_by)

      // 5. Return team with member data
      const result = await this.findByIdWithMembers(team.id)
      return result as { success: true; data: TeamWithMembers }

    } catch (error) {
      logger.error('❌ Team creation failed:', error)
      throw error
    }
  }

  /**
   * Add member to team
   * ⚠️ ANTI-RECURSION PATTERN: Splits query to avoid RLS infinite recursion
   */
  async addMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member') {
    try {
      // Check if user is already a member
      const { data: existingMember, error: checkError } = await this.supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        return { success: false as const, error: handleError(checkError, 'team') }
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

      // STEP 1: Insert the member (no JOIN)
      const { data: newMember, error: insertError } = await this.supabase
        .from('team_members')
        .insert(memberData)
        .select('*')
        .single()

      if (insertError) {
        return { success: false as const, error: handleError(insertError, 'team:addMember') }
      }

      // STEP 2: Get user details separately
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', userId)
        .single()

      if (userError) {
        logger.warn('⚠️ Could not fetch user details:', userError)
        // Return member data without user details
        return { success: true as const, data: newMember }
      }

      // STEP 3: Merge results
      const result = {
        ...newMember,
        user: userData ? {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        } : null
      }

      // Clear cache for this user
      this.clearUserCache(userId)

      return { success: true as const, data: result }
    } catch (error) {
      logger.error('❌ Error in addMember:', error)
      if (error instanceof ValidationException) {
        throw error
      }
      return { success: false as const, error: handleError(error as Error, 'team:addMember') }
    }
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
      .eq('user_id', userId)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new NotFoundException('Member not found in team', 'team_members', `${teamId}-${userId}`)
      }
      return { success: false as const, error: handleError(checkError, 'team') }
    }

    // Prevent removing last admin
    if (member.role === 'admin') {
      const { data: adminCount, error: countError } = await this.supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('role', 'admin')

      if (countError) {
        return { success: false as const, error: handleError(countError, 'team') }
      }

      if (adminCount && adminCount.length <= 1) {
        throw new ValidationException('Cannot remove the last admin from team', 'team_members', 'role')
      }
    }

    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) {
      return { success: false as const, error: handleError(error, 'team') }
    }

    // Clear cache for this user
    this.clearUserCache(userId)

    return { success: true as const, data: true }
  }

  /**
   * Update member role
   * ⚠️ ANTI-RECURSION PATTERN: Splits query to avoid RLS infinite recursion
   */
  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member') {
    try {
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
          return { success: false as const, error: handleError(currentError, 'team') }
        }

        if (currentMember?.role === 'admin') {
          const { data: adminCount, error: countError } = await this.supabase
            .from('team_members')
            .select('id')
            .eq('team_id', teamId)
            .eq('role', 'admin')

          if (countError) {
            return { success: false as const, error: handleError(countError, 'team') }
          }

          if (adminCount && adminCount.length <= 1) {
            throw new ValidationException('Cannot demote the last admin', 'team_members', 'role')
          }
        }
      }

      // STEP 1: Update the member role (no JOIN)
      const { data: updatedMember, error: updateError } = await this.supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select('*')
        .single()

      if (updateError) {
        return { success: false as const, error: handleError(updateError, 'team') }
      }

      // STEP 2: Get user details separately
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', userId)
        .single()

      if (userError) {
        logger.warn('⚠️ Could not fetch user details:', userError)
        // Return member data without user details
        return { success: true as const, data: updatedMember }
      }

      // STEP 3: Merge results
      const result = {
        ...updatedMember,
        user: userData ? {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        } : null
      }

      // Clear cache for this user
      this.clearUserCache(userId)

      return { success: true as const, data: result }
    } catch (error) {
      logger.error('❌ Error in updateMemberRole:', error)
      if (error instanceof ValidationException) {
        throw error
      }
      return { success: false as const, error: handleError(error as Error, 'team') }
    }
  }

  /**
   * Get all members of a team
   * ⚠️ ANTI-RECURSION PATTERN: Splits query to avoid RLS infinite recursion
   */
  async getTeamMembers(teamId: string) {
    try {
      // STEP 1: Get team_members (no JOIN to users)
      const { data: teamMembers, error: membersError } = await this.supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('joined_at')

      if (membersError) {
        return { success: false as const, error: handleError(membersError, 'team') }
      }

      if (!teamMembers || teamMembers.length === 0) {
        return { success: true as const, data: [] }
      }

      // STEP 2: Get user details for all members (separate query)
      const userIds = teamMembers.map(m => m.user_id).filter(Boolean)
      const { data: usersData, error: usersError } = await this.supabase
        .from('users')
        .select('id, name, email, role, provider_category')
        .in('id', userIds)

      if (usersError) {
        logger.warn('⚠️ Could not fetch user details:', usersError)
        // Return members without user details rather than failing
        return { success: true as const, data: teamMembers }
      }

      // STEP 3: Merge results in memory
      const result = teamMembers.map(member => {
        const user = usersData?.find(u => u.id === member.user_id)
        return {
          ...member,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            provider_category: user.provider_category
          } : null
        }
      })

      return { success: true as const, data: result }
    } catch (error) {
      logger.error('❌ Error in getTeamMembers:', error)
      return { success: false as const, error: handleError(error as Error, 'team') }
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats() {
    const { data: stats, error } = await this.supabase
      .from(this.tableName)
      .select('id')

    if (error) {
      return { success: false as const, error: handleError(error, 'team') }
    }

    const { data: memberStats, error: memberError } = await this.supabase
      .from('team_members')
      .select('team_id, role')

    if (memberError) {
      return { success: false as const, error: handleError(memberError, 'team') }
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
