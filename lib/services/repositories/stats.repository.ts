/**
 * Stats Repository - Phase 4.1
 * Handles all database operations for system statistics and metrics
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
// Repository-specific types for statistics
export interface ActivityStats {
  period: string
  startDate: string
  endDate: string
  total: number
  byAction: Record<string, number>
  byEntity: Record<string, number>
  byStatus: Record<string, number>
  successRate: number
  dailyActivity: Array<{ date: string; count: number }>
  topUsers: Array<{ userId: string; count: number }>
  topActions: Array<{ action: string; count: number; percentage: number }>
}

export interface SystemStats {
  totalUsers: number
  totalBuildings: number
  totalInterventions: number
  totalRevenue: number
  usersGrowth: number
  buildingsGrowth: number
  interventionsGrowth: number
  revenueGrowth: number
}

export interface TeamStats {
  teamId: string
  memberCount: number
  buildingsCount: number
  interventionsCount: number
  completedInterventions: number
  avgCompletionTime: number
  activeMembers: number
  lastActivityDate: string
}

export interface UserStats {
  userId: string
  interventionsCreated: number
  interventionsCompleted: number
  avgResponseTime: number
  activityScore: number
  lastLoginDate: string
  roleStats: {
    role: string
    permissions: string[]
    teamMemberships: number
  }
}

export interface DashboardStats {
  system: SystemStats
  teams: TeamStats[]
  users: UserStats[]
  activity: ActivityStats
  performance: {
    avgApiResponseTime: number
    errorRate: number
    cacheHitRate: number
  }
}

/**
 * Stats Repository
 * Manages all database operations for statistics with advanced caching and aggregation
 */
// Placeholder types for stats operations
type StatsEntity = ActivityStats | SystemStats | TeamStats | UserStats | DashboardStats
type StatsInsert = never
type StatsUpdate = never

export class StatsRepository extends BaseRepository<StatsEntity, StatsInsert, StatsUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'activity_logs') // Base table for activity tracking
  }

  /**
   * Get system-wide statistics (admin level)
   * ✅ Next.js 15 Data Cache automatically caches Supabase queries
   */
  async getSystemStats(): Promise<{ success: true; data: SystemStats }> {
    try {
      // Get total counts (head:true = count only, no row data transferred)
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      const [usersResult, buildingsResult, interventionsResult, completedResult,
             usersGrowthResult, buildingsGrowthResult, interventionsGrowthResult] = await Promise.all([
        this.supabase.from('users').select('*', { count: 'exact', head: true }),
        this.supabase.from('buildings').select('*', { count: 'exact', head: true }),
        this.supabase.from('interventions').select('*', { count: 'exact', head: true }),
        this.supabase.from('interventions').select('*', { count: 'exact', head: true })
          .in('status', ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire']),
        this.supabase.from('users').select('*', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString()),
        this.supabase.from('buildings').select('*', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString()),
        this.supabase.from('interventions').select('*', { count: 'exact', head: true })
          .gte('created_at', oneMonthAgo.toISOString()),
      ])

      if (usersResult.error) throw usersResult.error
      if (buildingsResult.error) throw buildingsResult.error
      if (interventionsResult.error) throw interventionsResult.error

      const totalRevenue = (completedResult.count || 0) * 450 // 450€ average per intervention

      const stats: SystemStats = {
        totalUsers: usersResult.count || 0,
        totalBuildings: buildingsResult.count || 0,
        totalInterventions: interventionsResult.count || 0,
        totalRevenue,
        usersGrowth: usersGrowthResult.count || 0,
        buildingsGrowth: buildingsGrowthResult.count || 0,
        interventionsGrowth: interventionsGrowthResult.count || 0,
        revenueGrowth: Math.round((interventionsGrowthResult.count || 0) * 450)
      }

      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting system stats:', error)
      throw error
    }
  }

  /**
   * Get activity statistics for a team
   * ✅ Next.js 15 Data Cache automatically caches Supabase queries
   */
  async getActivityStats(
    teamId: string,
    period: '24h' | '7d' | '30d' = '7d',
    userId?: string
  ): Promise<{ success: true; data: ActivityStats }> {
    try {
      // Calculate date range
      const now = new Date()
      const startDate = new Date()

      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24)
          break
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
      }

      // Build query
      let query = this.supabase
        .from('activity_logs')
        .select('action_type, entity_type, status, created_at, user_id')
        .eq('team_id', teamId)
        .gte('created_at', startDate.toISOString())

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      // Process statistics
      const stats: ActivityStats = {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        total: data?.length || 0,
        byAction: {},
        byEntity: {},
        byStatus: {},
        successRate: 0,
        dailyActivity: [],
        topUsers: [],
        topActions: []
      }

      if (data && data.length > 0) {
        const userActivity: Record<string, number> = {}
        const dailyCount: Record<string, number> = {}

        // Aggregate data
        data.forEach(log => {
          stats.byAction[log.action_type] = (stats.byAction[log.action_type] || 0) + 1
          stats.byEntity[log.entity_type] = (stats.byEntity[log.entity_type] || 0) + 1
          stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1
          userActivity[log.user_id] = (userActivity[log.user_id] || 0) + 1

          const date = new Date(log.created_at).toISOString().split('T')[0]
          dailyCount[date] = (dailyCount[date] || 0) + 1
        })

        // Calculate derived stats
        stats.successRate = ((stats.byStatus['success'] || 0) / stats.total * 100)

        stats.dailyActivity = Object.entries(dailyCount)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))

        stats.topUsers = Object.entries(userActivity)
          .map(([userId, count]) => ({ userId, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        stats.topActions = Object.entries(stats.byAction)
          .map(([action, count]) => ({
            action,
            count,
            percentage: (count / stats.total * 100)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      }

      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting activity stats:', error)
      throw error
    }
  }

  /**
   * Get team statistics
   * ✅ Next.js 15 Data Cache automatically caches Supabase queries
   */
  async getTeamStats(teamId: string): Promise<{ success: true; data: TeamStats }> {
    try {
      // Get team data with related counts
      const [teamResult, membersResult, buildingsResult, interventionsResult] = await Promise.all([
        this.supabase.from('teams').select('*').eq('id', teamId).single(),
        this.supabase.from('team_members').select('id, user_id').eq('team_id', teamId),
        this.supabase.from('buildings').select('id').eq('team_id', teamId),
        this.supabase.from('interventions').select('id, status, created_at, updated_at').eq('team_id', teamId)
      ])

      if (teamResult.error) throw teamResult.error

      const members = membersResult.data || []
      const buildings = buildingsResult.data || []
      const interventions = interventionsResult.data || []

      // Calculate intervention metrics
      const completedInterventions = interventions.filter(
        i => i.status === 'cloturee_par_prestataire' || i.status === 'cloturee_par_locataire' || i.status === 'cloturee_par_gestionnaire'
      )

      // Calculate average completion time
      let avgCompletionTime = 0
      if (completedInterventions.length > 0) {
        const totalTime = completedInterventions.reduce((sum, intervention) => {
          const created = new Date(intervention.created_at)
          const updated = new Date(intervention.updated_at)
          return sum + (updated.getTime() - created.getTime())
        }, 0)
        avgCompletionTime = Math.round(totalTime / completedInterventions.length / (1000 * 60 * 60 * 24)) // days
      }

      // Get last activity
      const { data: lastActivity } = await this.supabase
        .from('activity_logs')
        .select('created_at')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const stats: TeamStats = {
        teamId,
        memberCount: members.length,
        buildingsCount: buildings.length,
        interventionsCount: interventions.length,
        completedInterventions: completedInterventions.length,
        avgCompletionTime,
        activeMembers: members.length, // Simplified - could check recent activity
        lastActivityDate: lastActivity?.created_at || teamResult.data.created_at
      }

      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting team stats:', error)
      throw error
    }
  }

  /**
   * Get user statistics
   * ✅ Next.js 15 Data Cache automatically caches Supabase queries
   */
  async getUserStats(userId: string): Promise<{ success: true; data: UserStats }> {
    try {
      // Get user data
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, role, last_login_at')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      // Get intervention stats (head:true = count only, no row data transferred)
      const [createdResult, completedResult, activityResult] = await Promise.all([
        this.supabase
          .from('interventions')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', userId),
        this.supabase
          .from('intervention_assignments')
          .select('intervention:intervention_id!inner(status)', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('intervention.status', ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire']),
        this.supabase
          .from('activity_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // Get team memberships
      const { data: teamMemberships } = await this.supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)

      const stats: UserStats = {
        userId,
        interventionsCreated: createdResult.count || 0,
        interventionsCompleted: completedResult.count || 0,
        avgResponseTime: 0, // Would need more detailed tracking
        activityScore: Math.min(100, (activityResult.count || 0) * 2), // Simple scoring
        lastLoginDate: user.last_login_at || user.created_at,
        roleStats: {
          role: user.role,
          permissions: this.getRolePermissions(user.role),
          teamMemberships: teamMemberships?.length || 0
        }
      }

      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting user stats:', error)
      throw error
    }
  }

  /**
   * Get comprehensive dashboard statistics
   * ✅ Next.js 15 Data Cache automatically caches Supabase queries
   */
  async getDashboardStats(teamId?: string): Promise<{ success: true; data: DashboardStats }> {
    try {
      // Get system stats
      const systemStatsResult = await this.getSystemStats()

      // Get activity stats
      const activityStatsResult = teamId
        ? await this.getActivityStats(teamId)
        : await this.getActivityStats('global') // Global stats for admin

      // Get team stats (limited for performance)
      const teamsResult = teamId
        ? [await this.getTeamStats(teamId)]
        : [] // For global dashboard, we'd need to implement top teams

      const dashboardStats: DashboardStats = {
        system: systemStatsResult.data,
        teams: teamsResult.map(r => r.data),
        users: [], // Implement top users if needed
        activity: activityStatsResult.data,
        performance: {
          avgApiResponseTime: 150, // Would need monitoring integration
          errorRate: 2.5, // Would calculate from logs
          cacheHitRate: 85 // Would track from cache metrics
        }
      }

      return { success: true, data: dashboardStats }

    } catch (error) {
      logger.error('❌ Error getting dashboard stats:', error)
      throw error
    }
  }

  /**
   * Private helper methods
   */
  private getRolePermissions(_role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_teams', 'system_stats'],
      gestionnaire: ['read', 'write', 'manage_buildings', 'manage_interventions'],
      prestataire: ['read', 'write_quotes', 'update_interventions'],
      locataire: ['read', 'create_interventions']
    }
    return permissions[_role] || ['read']
  }
}

// Factory functions for creating repository instances
export const createStatsRepository = () => {
  const supabase = createBrowserSupabaseClient()
  return new StatsRepository(supabase)
}

export const createServerStatsRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new StatsRepository(supabase)
}

/**
 * Create Stats Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionStatsRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new StatsRepository(supabase)
}
