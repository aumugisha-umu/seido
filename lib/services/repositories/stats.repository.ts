/**
 * Stats Repository - Phase 4.1
 * Handles all database operations for system statistics and metrics
 */

import { BaseRepository } from '../core/base-repository'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, logError } from '@/lib/logger'
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
  // Cache for stats data with different TTLs
  private statsCache = new Map<string, { data: StatsEntity; timestamp: number; ttl: number }>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly SYSTEM_STATS_TTL = 15 * 60 * 1000 // 15 minutes for system stats
  private readonly ACTIVITY_STATS_TTL = 2 * 60 * 1000 // 2 minutes for activity stats

  constructor(supabase: SupabaseClient) {
    super(supabase, 'activity_logs') // Base table for activity tracking
  }

  /**
   * Get system-wide statistics (admin level)
   */
  async getSystemStats(): Promise<{ success: true; data: SystemStats }> {
    const cacheKey = 'system_stats'
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

    try {
      // Get total counts from all services
      const [usersResult, buildingsResult, interventionsResult] = await Promise.all([
        this.supabase.from('users').select('id', { count: 'exact' }),
        this.supabase.from('buildings').select('id', { count: 'exact' }),
        this.supabase.from('interventions').select('id, status', { count: 'exact' })
      ])

      if (usersResult.error) throw usersResult.error
      if (buildingsResult.error) throw buildingsResult.error
      if (interventionsResult.error) throw interventionsResult.error

      // Calculate completed interventions and revenue
      const completedInterventions = interventionsResult.data?.filter(
        i => i.status === 'cloturee_par_prestataire' || i.status === 'cloturee_par_locataire' || i.status === 'cloturee_par_gestionnaire'
      ) || []

      const totalRevenue = completedInterventions.length * 450 // 450€ average per intervention

      // Get growth data (compare with previous month)
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      const [usersGrowthResult, buildingsGrowthResult, interventionsGrowthResult] = await Promise.all([
        this.supabase
          .from('users')
          .select('id', { count: 'exact' })
          .gte('created_at', oneMonthAgo.toISOString()),
        this.supabase
          .from('buildings')
          .select('id', { count: 'exact' })
          .gte('created_at', oneMonthAgo.toISOString()),
        this.supabase
          .from('interventions')
          .select('id', { count: 'exact' })
          .gte('created_at', oneMonthAgo.toISOString())
      ])

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

      this.setToCache(cacheKey, stats, this.SYSTEM_STATS_TTL)
      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting system stats:', error)
      throw error
    }
  }

  /**
   * Get activity statistics for a team
   */
  async getActivityStats(
    teamId: string,
    period: '24h' | '7d' | '30d' = '7d',
    userId?: string
  ): Promise<{ success: true; data: ActivityStats }> {
    const cacheKey = `activity_stats_${teamId}_${period}_${userId || 'all'}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

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

      if (_userId) {
        query = query.eq('user_id', _userId)
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
          .map(([_userId, count]) => ({ _userId, count }))
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

      this.setToCache(cacheKey, stats, this.ACTIVITY_STATS_TTL)
      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting activity stats:', error)
      throw error
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId: string): Promise<{ success: true; data: TeamStats }> {
    const cacheKey = `team_stats_${teamId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

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

      this.setToCache(cacheKey, stats, this.DEFAULT_TTL)
      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting team stats:', error)
      throw error
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(_userId: string): Promise<{ success: true; data: UserStats }> {
    const cacheKey = `user_stats_${_userId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

    try {
      // Get user data
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, role, last_login_at')
        .eq('id', _userId)
        .single()

      if (userError) throw userError

      // Get intervention stats
      const [createdResult, completedResult, activityResult] = await Promise.all([
        this.supabase
          .from('interventions')
          .select('id', { count: 'exact' })
          .eq('created_by', _userId),
        this.supabase
          .from('interventions')
          .select('id', { count: 'exact' })
          .or(`assigned_gestionnaire.eq.${_userId},assigned_prestataire.eq.${_userId}`)
          .in('status', ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire']),
        this.supabase
          .from('activity_logs')
          .select('id, created_at', { count: 'exact' })
          .eq('user_id', _userId)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ])

      // Get team memberships
      const { data: teamMemberships } = await this.supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', _userId)

      const stats: UserStats = {
        _userId,
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

      this.setToCache(cacheKey, stats, this.DEFAULT_TTL)
      return { success: true, data: stats }

    } catch (error) {
      logger.error('❌ Error getting user stats:', error)
      throw error
    }
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(teamId?: string): Promise<{ success: true; data: DashboardStats }> {
    const cacheKey = `dashboard_stats_${teamId || 'global'}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

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

      this.setToCache(cacheKey, dashboardStats, this.DEFAULT_TTL)
      return { success: true, data: dashboardStats }

    } catch (error) {
      logger.error('❌ Error getting dashboard stats:', error)
      throw error
    }
  }

  /**
   * Clear stats cache
   */
  clearStatsCache(pattern?: string) {
    if (pattern) {
      for (const key of this.statsCache.keys()) {
        if (key.includes(pattern)) {
          this.statsCache.delete(key)
        }
      }
    } else {
      this.statsCache.clear()
    }
  }

  /**
   * Private helper methods
   */
  private getFromCache(_key: string): unknown | null {
    const cached = this.statsCache.get(_key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    this.statsCache.delete(_key)
    return null
  }

  private setToCache(key: string, data: unknown, ttl: number = this.DEFAULT_TTL) {
    this.statsCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

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
