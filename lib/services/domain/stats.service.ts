/**
 * Stats Service - Phase 4.1
 * Business logic for statistics and metrics with role-based access control
 */

import {
  StatsRepository,
  createStatsRepository,
  createServerStatsRepository,
  createServerActionStatsRepository,
  type ActivityStats,
  type SystemStats,
  type TeamStats,
  type UserStats,
  type DashboardStats
} from '../repositories/stats.repository'
import { UserService, createUserService, createServerUserService, createServerActionUserService } from './user.service'
import { InterventionRepository, createInterventionRepository, createServerActionInterventionRepository } from '../repositories/intervention.repository'
import { ValidationException, PermissionException } from '../core/error-handler'
import type { User, ServiceResult } from '../core/service-types'
import { logger, logError } from '@/lib/logger'
/**
 * Stats query options
 */
export interface StatsQueryOptions {
  period?: '24h' | '7d' | '30d'
  teamId?: string
  userId?: string
  includeDetails?: boolean
  cached?: boolean
}

/**
 * Role-based stats access levels
 */
export interface StatsPermissions {
  canViewSystemStats: boolean
  canViewTeamStats: boolean
  canViewUserStats: boolean
  canViewDetailedMetrics: boolean
  canExportStats: boolean
}

/**
 * Stats export format
 */
export interface StatsExport {
  format: 'json' | 'csv' | 'xlsx'
  data: ActivityStats | SystemStats | TeamStats | UserStats | DashboardStats
  filename: string
  generatedAt: string
}

/**
 * Stats Service
 * Manages statistics access with role-based permissions and caching optimization
 */
export class StatsService {
  constructor(
    private repository: StatsRepository,
    private userService?: UserService,
    private interventionRepository?: InterventionRepository
  ) {}

  /**
   * Get system statistics (admin only)
   */
  async getSystemStats(requestingUser?: User): Promise<ServiceResult<SystemStats>> {
    try {
      // Validate permissions
      if (requestingUser && !this.canViewSystemStats(requestingUser)) {
        throw new PermissionException('User does not have permission to view system statistics', 'stats', 'system')
      }

      const result = await this.repository.getSystemStats()
      return result

    } catch (error) {
      throw error
    }
  }

  /**
   * Get activity statistics with role-based filtering
   */
  async getActivityStats(
    options: StatsQueryOptions,
    requestingUser?: User
  ): Promise<ServiceResult<ActivityStats>> {
    try {
      // Validate permissions and apply role-based filtering
      const filteredOptions = await this.applyRoleBasedFiltering(options, requestingUser)

      const result = await this.repository.getActivityStats(
        filteredOptions.teamId!,
        filteredOptions.period || '7d',
        filteredOptions.userId
      )

      // Apply additional filtering based on user role
      if (requestingUser && !this.canViewDetailedMetrics(requestingUser)) {
        result.data = this.sanitizeActivityStats(result.data)
      }

      return result

    } catch (error) {
      throw error
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(
    teamId: string,
    requestingUser?: User
  ): Promise<ServiceResult<TeamStats>> {
    try {
      // Validate team access
      if (requestingUser) {
        const canAccess = await this.canAccessTeamStats(teamId, requestingUser)
        if (!canAccess) {
          throw new PermissionException('User does not have access to this team statistics', 'stats', 'team')
        }
      }

      const result = await this.repository.getTeamStats(teamId)
      return result

    } catch (error) {
      throw error
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(
    userId: string,
    requestingUser?: User
  ): Promise<ServiceResult<UserStats>> {
    try {
      // Validate user access (users can see their own stats, admins can see all)
      if (requestingUser) {
        const canAccess = this.canAccessUserStats(userId, requestingUser)
        if (!canAccess) {
          throw new PermissionException('User does not have access to these user statistics', 'stats', 'user')
        }
      }

      const result = await this.repository.getUserStats(userId)

      // Apply role-based data filtering
      if (requestingUser && requestingUser.id !== userId && !this.isAdmin(requestingUser)) {
        result.data = this.sanitizeUserStats(result.data)
      }

      return result

    } catch (error) {
      throw error
    }
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(
    options: StatsQueryOptions,
    requestingUser?: User
  ): Promise<ServiceResult<DashboardStats>> {
    try {
      // Apply role-based filtering
      const filteredOptions = await this.applyRoleBasedFiltering(options, requestingUser)

      const result = await this.repository.getDashboardStats(filteredOptions.teamId)

      // Apply role-based data sanitization
      if (requestingUser) {
        result.data = this.sanitizeDashboardStats(result.data, requestingUser)
      }

      return result

    } catch (error) {
      throw error
    }
  }

  /**
   * Generate comparative statistics (current vs previous period)
   */
  async getComparativeStats(
    teamId: string,
    period: '24h' | '7d' | '30d' = '7d',
    requestingUser?: User
  ): Promise<ServiceResult<{
    current: ActivityStats
    previous: ActivityStats
    comparison: {
      totalChange: number
      successRateChange: number
      topActionsChange: Record<string, number>
      trend: 'up' | 'down' | 'stable'
    }
  }>> {
    try {
      // Validate team access
      if (requestingUser) {
        const canAccess = await this.canAccessTeamStats(teamId, requestingUser)
        if (!canAccess) {
          throw new PermissionException('User does not have access to this team statistics', 'stats', 'team')
        }
      }

      // Get current period stats
      const currentResult = await this.repository.getActivityStats(teamId, period)

      // Calculate previous period dates
      // TODO: Implement proper historical comparison using these dates
      // const currentStart = new Date(currentResult.data.startDate)
      // const currentEnd = new Date(currentResult.data.endDate)
      // const periodDuration = currentEnd.getTime() - currentStart.getTime()

      // Calculate previous period dates
      // Note: _previousStart and previousEnd would be used for proper historical comparison
      // Currently simplified for MVP implementation

      // Get previous period stats (we'd need to modify repository to accept custom dates)
      // For now, we'll simulate with a simplified approach
      const previousResult = await this.repository.getActivityStats(teamId, period)

      // Calculate comparison metrics
      const comparison = {
        totalChange: this.calculatePercentageChange(
          previousResult.data.total,
          currentResult.data.total
        ),
        successRateChange: this.calculatePercentageChange(
          previousResult.data.successRate,
          currentResult.data.successRate
        ),
        topActionsChange: this.calculateActionChanges(
          previousResult.data.topActions,
          currentResult.data.topActions
        ),
        trend: this.determineTrend(previousResult.data.total, currentResult.data.total)
      }

      return {
        success: true,
        data: {
          current: currentResult.data,
          previous: previousResult.data,
          comparison
        }
      }

    } catch (error) {
      throw error
    }
  }

  /**
   * Export statistics in various formats
   */
  async exportStats(
    type: 'system' | 'team' | 'user' | 'activity',
    options: StatsQueryOptions & { format: 'json' | 'csv' | 'xlsx' },
    requestingUser?: User
  ): Promise<ServiceResult<StatsExport>> {
    try {
      // Validate export permissions
      if (requestingUser && !this.canExportStats(requestingUser)) {
        throw new PermissionException('User does not have permission to export statistics', 'stats', 'export')
      }

      let data: SystemStats | TeamStats | UserStats | ActivityStats
      let filename: string

      // Get data based on type
      switch (type) {
        case 'system':
          if (!this.canViewSystemStats(requestingUser!)) {
            throw new PermissionException('Cannot export system stats', 'stats', 'system')
          }
          const systemResult = await this.getSystemStats(requestingUser)
          data = systemResult.data
          filename = `system-stats-${new Date().toISOString().split('T')[0]}`
          break

        case 'team':
          if (!options.teamId) {
            throw new ValidationException('Team ID required for team stats export', 'stats', 'teamId')
          }
          const teamResult = await this.getTeamStats(options.teamId, requestingUser)
          data = teamResult.data
          filename = `team-stats-${options.teamId}-${new Date().toISOString().split('T')[0]}`
          break

        case 'activity':
          if (!options.teamId) {
            throw new ValidationException('Team ID required for activity stats export', 'stats', 'teamId')
          }
          const activityResult = await this.getActivityStats(options, requestingUser)
          data = activityResult.data
          filename = `activity-stats-${options.teamId}-${options.period || '7d'}-${new Date().toISOString().split('T')[0]}`
          break

        case 'user':
          if (!options.userId) {
            throw new ValidationException('User ID required for user stats export', 'stats', 'userId')
          }
          const userResult = await this.getUserStats(options.userId, requestingUser)
          data = userResult.data
          filename = `user-stats-${options.userId}-${new Date().toISOString().split('T')[0]}`
          break

        default:
          throw new ValidationException('Invalid export type', 'stats', 'type')
      }

      // Format data based on requested format
      const exportData: StatsExport = {
        format: options.format,
        data: this.formatDataForExport(data, options.format),
        filename: `${filename}.${options.format}`,
        generatedAt: new Date().toISOString()
      }

      return { success: true, data: exportData }

    } catch (error) {
      throw error
    }
  }

  /**
   * Clear statistics cache
   */
  async clearCache(pattern?: string, requestingUser?: User): Promise<ServiceResult<boolean>> {
    try {
      // Only admins can clear cache
      if (requestingUser && !this.isAdmin(requestingUser)) {
        throw new PermissionException('Only administrators can clear statistics cache', 'stats', 'cache')
      }

      this.repository.clearStatsCache(pattern)
      return { success: true, data: true }

    } catch (error) {
      throw error
    }
  }

  /**
   * Get statistics permissions for a user
   */
  async getStatsPermissions(user: User): Promise<ServiceResult<StatsPermissions>> {
    try {
      const permissions: StatsPermissions = {
        canViewSystemStats: this.canViewSystemStats(user),
        canViewTeamStats: this.canViewTeamStats(user),
        canViewUserStats: this.canViewUserStats(user),
        canViewDetailedMetrics: this.canViewDetailedMetrics(user),
        canExportStats: this.canExportStats(user)
      }

      return { success: true, data: permissions }

    } catch (error) {
      throw error
    }
  }

  /**
   * Permission validation methods
   */
  private canViewSystemStats(user: User): boolean {
    return user.role === 'admin'
  }

  private canViewTeamStats(user: User): boolean {
    return ['admin', 'gestionnaire'].includes(user.role)
  }

  private canViewUserStats(user: User): boolean {
    // All users can view user stats (with restrictions)
    // TODO: Implement user-specific restrictions based on user parameter
    return true
  }

  private canViewDetailedMetrics(user: User): boolean {
    return ['admin', 'gestionnaire'].includes(user.role)
  }

  private canExportStats(user: User): boolean {
    return ['admin', 'gestionnaire'].includes(user.role)
  }

  private isAdmin(user: User): boolean {
    return user.role === 'admin'
  }

  private canAccessUserStats(userId: string, requestingUser: User): boolean {
    return requestingUser.id === userId || this.isAdmin(requestingUser)
  }

  private async canAccessTeamStats(teamId: string, requestingUser: User): Promise<boolean> {
    if (this.isAdmin(requestingUser)) {
      return true
    }

    // Check if user is member of the team
    if (requestingUser.team_id === teamId) {
      return true
    }

    // For gestionnaires, check if they have access to multiple teams
    if (requestingUser.role === 'gestionnaire') {
      // This would require checking team memberships
      // For now, allow if user has team access role
      return true
    }

    return false
  }

  /**
   * Data filtering and sanitization methods
   */
  private async applyRoleBasedFiltering(
    options: StatsQueryOptions,
    requestingUser?: User
  ): Promise<StatsQueryOptions> {
    if (!requestingUser) {
      return options
    }

    const filteredOptions = { ...options }

    // Non-admin users can only see their team's stats
    if (!this.isAdmin(requestingUser) && !filteredOptions.teamId) {
      filteredOptions.teamId = requestingUser.team_id
    }

    // Non-admin users can only see their own user stats
    if (!this.isAdmin(requestingUser) && filteredOptions.userId && filteredOptions.userId !== requestingUser.id) {
      throw new PermissionException('Cannot access other users statistics', 'stats', 'userId')
    }

    return filteredOptions
  }

  private sanitizeActivityStats(stats: ActivityStats): ActivityStats {
    // Remove sensitive user information for non-admin users
    return {
      ...stats,
      topUsers: stats.topUsers.map(user => ({
        ...user,
        userId: user.userId.substring(0, 8) + '...' // Anonymize user IDs
      }))
    }
  }

  private sanitizeUserStats(stats: UserStats): UserStats {
    // Remove detailed personal information
    return {
      ...stats,
      roleStats: {
        role: stats.roleStats.role,
        permissions: [], // Don't expose permissions
        teamMemberships: stats.roleStats.teamMemberships
      }
    }
  }

  private sanitizeDashboardStats(stats: DashboardStats, requestingUser: User): DashboardStats {
    if (this.isAdmin(requestingUser)) {
      return stats
    }

    // Filter data based on user permissions
    return {
      ...stats,
      system: this.canViewSystemStats(requestingUser) ? stats.system : {} as SystemStats,
      users: [] // Don't expose user stats to non-admins
    }
  }

  /**
   * Utility methods
   */
  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0
    }
    return Math.round(((current - previous) / previous) * 100)
  }

  private calculateActionChanges(
    previous: Array<{ action: string; count: number }>,
    current: Array<{ action: string; count: number }>
  ): Record<string, number> {
    const changes: Record<string, number> = {}

    current.forEach(currentAction => {
      const previousAction = previous.find(p => p.action === currentAction.action)
      const previousCount = previousAction?.count || 0
      changes[currentAction.action] = this.calculatePercentageChange(previousCount, currentAction.count)
    })

    return changes
  }

  private determineTrend(previous: number, current: number): 'up' | 'down' | 'stable' {
    if (current > previous) return 'up'
    if (current < previous) return 'down'
    return 'stable'
  }

  private formatDataForExport(data: SystemStats | TeamStats | UserStats | ActivityStats | DashboardStats, format: 'json' | 'csv' | 'xlsx'): string | object {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'csv':
        // Simplified CSV conversion - would need proper CSV library
        return this.convertToCSV(data)
      case 'xlsx':
        // Would need XLSX library integration
        return data
      default:
        return data
    }
  }

  private convertToCSV(data: SystemStats | TeamStats | UserStats | ActivityStats | DashboardStats): string {
    // Simplified CSV conversion
    if (Array.isArray(data)) {
      const headers = Object.keys(data[0] || {})
      const rows = data.map(row => headers.map(header => row[header]).join(','))
      return [headers.join(','), ...rows].join('\n')
    }

    // For objects, convert to key-value pairs
    return Object.entries(data)
      .map(([key, value]) => `${key},${value}`)
      .join('\n')
  }

  /**
   * Get manager-specific stats with recent interventions
   */
  async getManagerStats(userId: string): Promise<any> {
    try {
      // Get user's team ID
      const user = this.userService ? await this.userService.getById(userId) : null
      const teamId = user?.data?.team_id

      if (!teamId) {
        // Return empty stats if no team
        return {
          stats: {
            buildingsCount: 0,
            lotsCount: 0,
            occupiedLotsCount: 0,
            occupancyRate: 0,
            contactsCount: 0,
            interventionsCount: 0
          },
          buildings: [],
          lots: [],
          contacts: [],
          interventions: [],
          recentInterventions: []
        }
      }

      // Get team stats which includes building/lot counts
      const teamStatsResult = await this.repository.getTeamStats(teamId)

      // Fetch actual buildings for this team
      let buildings: any[] = []
      try {
        const buildingsResult = await this.repository.supabase
          .from('buildings')
          .select('id, name, address, city, postal_code, created_at')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })

        if (buildingsResult.data) {
          buildings = buildingsResult.data
        }
      } catch (buildingError) {
        logger.error('⚠️ Error fetching buildings:', buildingError)
        // Continue with empty array if building fetch fails
      }

      // Fetch all interventions and recent interventions requiring manager action
      let allInterventions: any[] = []
      let recentInterventions: any[] = []
      if (this.interventionRepository) {
        try {
          // Get all interventions with relations
          const interventionsResult = await this.interventionRepository.findAllWithRelations({ limit: 100 })

          if (interventionsResult.success && interventionsResult.data) {
            // First, filter ALL interventions for this team
            allInterventions = interventionsResult.data
              .filter((intervention: any) => {
                // Check if intervention belongs to this team
                // Support both lot-based AND building-wide interventions
                const belongsToTeam =
                  intervention.lot?.building?.team_id === teamId ||  // Intervention on a specific lot
                  intervention.building?.team_id === teamId           // Intervention on building (building-wide)
                return belongsToTeam
              })

            // Then, create recentInterventions: filter by requiring action and limit to 10
            recentInterventions = allInterventions
              .filter((intervention: any) => {
                // Check if intervention requires manager action
                const requiresAction = [
                  'demande',
                  'approuvee',
                  'demande_de_devis',
                  'planification',
                  'planifiee',
                  'en_cours'
                ].includes(intervention.status)
                return requiresAction
              })
              .sort((a: any, b: any) => {
                // Sort by created_at descending (most recent first)
                const dateA = new Date(a.created_at).getTime()
                const dateB = new Date(b.created_at).getTime()
                return dateB - dateA
              })
              .slice(0, 10) // Limit to 10 most recent
          }
        } catch (interventionError) {
          // Error is already logged by error-handler.ts
          // Continue with empty arrays if intervention fetch fails (e.g., Phase 3 not yet applied)
        }
      }

      const result = {
        stats: {
          buildingsCount: teamStatsResult.data.buildingsCount || 0,
          lotsCount: teamStatsResult.data.lotCount || 0,
          occupiedLotsCount: teamStatsResult.data.occupiedLots || 0,
          occupancyRate: teamStatsResult.data.occupancyRate || 0,
          contactsCount: teamStatsResult.data.contactCount || 0,
          interventionsCount: teamStatsResult.data.interventionsCount || 0
        },
        buildings: buildings,
        lots: [],
        contacts: [],
        interventions: allInterventions,
        recentInterventions
      }

      return result
    } catch (error) {
      logger.error('❌ Error getting manager stats:', error)
      throw error
    }
  }
}

// Factory functions for creating service instances
export const createStatsService = (
  repository?: StatsRepository,
  userService?: UserService,
  interventionRepository?: InterventionRepository
) => {
  const repo = repository || createStatsRepository()
  const users = userService || createUserService()
  const interventions = interventionRepository || createInterventionRepository()
  return new StatsService(repo, users, interventions)
}

export const createServerStatsService = async () => {
  const [repository, userService] = await Promise.all([
    createServerStatsRepository(),
    createServerUserService()
  ])
  // Note: Server intervention repository would need async creation
  const interventionRepo = createInterventionRepository()
  return new StatsService(repository, userService, interventionRepo)
}

/**
 * Create Stats Service for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionStatsRepository() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionStatsService = async () => {
  const [repository, userService, interventionRepo] = await Promise.all([
    createServerActionStatsRepository(),
    createServerActionUserService(),
    createServerActionInterventionRepository()
  ])
  return new StatsService(repository, userService, interventionRepo)
}
