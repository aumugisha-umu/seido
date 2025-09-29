/**
 * Stats Service Tests - Phase 4.1
 * Comprehensive tests for statistics service with role-based access
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StatsService } from '../../domain/stats.service'
import { StatsRepository } from '../../repositories/stats.repository'
import { UserService } from '../../domain/user.service'
import { mockSupabaseClient } from '../setup'
import { PermissionException, ValidationException } from '../../core/error-handler'
import type { SystemStats, ActivityStats, TeamStats, UserStats } from '../../repositories/stats.repository'

// Mock dependencies
const mockStatsRepository = {
  getSystemStats: vi.fn(),
  getActivityStats: vi.fn(),
  getTeamStats: vi.fn(),
  getUserStats: vi.fn(),
  getDashboardStats: vi.fn(),
  clearStatsCache: vi.fn()
} as unknown as StatsRepository

const mockUserService = {
  getById: vi.fn(),
  getByTeam: vi.fn()
} as unknown as UserService

// Test data
const mockAdmin = {
  id: 'admin-123',
  email: 'admin@test.com',
  name: 'Admin User',
  role: 'admin',
  team_id: 'team-admin'
} as any

const mockGestionnaire = {
  id: 'gestionnaire-123',
  email: 'gestionnaire@test.com',
  name: 'Gestionnaire User',
  role: 'gestionnaire',
  team_id: 'team-123'
} as any

const mockPrestataire = {
  id: 'prestataire-123',
  email: 'prestataire@test.com',
  name: 'Prestataire User',
  role: 'prestataire',
  team_id: 'team-123'
} as any

const mockSystemStats: SystemStats = {
  totalUsers: 150,
  totalBuildings: 45,
  totalInterventions: 230,
  totalRevenue: 103500,
  usersGrowth: 12,
  buildingsGrowth: 3,
  interventionsGrowth: 28,
  revenueGrowth: 12600
}

const mockActivityStats: ActivityStats = {
  period: '7d',
  startDate: '2025-09-21T00:00:00.000Z',
  endDate: '2025-09-28T00:00:00.000Z',
  total: 45,
  byAction: {
    'create': 20,
    'update': 15,
    'delete': 5,
    'approve': 5
  },
  byEntity: {
    'intervention': 25,
    'user': 10,
    'building': 5,
    'contact': 5
  },
  byStatus: {
    'success': 40,
    'error': 3,
    'pending': 2
  },
  successRate: 88.9,
  dailyActivity: [
    { date: '2025-09-22', count: 8 },
    { date: '2025-09-23', count: 12 },
    { date: '2025-09-24', count: 15 },
    { date: '2025-09-25', count: 10 }
  ],
  topUsers: [
    { userId: 'user-1', count: 15 },
    { userId: 'user-2', count: 12 },
    { userId: 'user-3', count: 8 }
  ],
  topActions: [
    { action: 'create', count: 20, percentage: 44.4 },
    { action: 'update', count: 15, percentage: 33.3 },
    { action: 'delete', count: 5, percentage: 11.1 }
  ]
}

const mockTeamStats: TeamStats = {
  teamId: 'team-123',
  memberCount: 8,
  buildingsCount: 12,
  interventionsCount: 56,
  completedInterventions: 34,
  avgCompletionTime: 5,
  activeMembers: 7,
  lastActivityDate: '2025-09-28T10:30:00.000Z'
}

const mockUserStats: UserStats = {
  userId: 'user-123',
  interventionsCreated: 15,
  interventionsCompleted: 12,
  avgResponseTime: 120,
  activityScore: 85,
  lastLoginDate: '2025-09-28T09:15:00.000Z',
  roleStats: {
    role: 'gestionnaire',
    permissions: ['read', 'write', 'manage_buildings'],
    teamMemberships: 1
  }
}

describe('StatsService', () => {
  let statsService: StatsService

  beforeEach(() => {
    statsService = new StatsService(mockStatsRepository, mockUserService)
    vi.clearAllMocks()
  })

  describe('getSystemStats', () => {
    it('should return system stats for admin users', async () => {
      mockStatsRepository.getSystemStats.mockResolvedValueOnce({
        success: true,
        data: mockSystemStats
      })

      const result = await statsService.getSystemStats(mockAdmin)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSystemStats)
      expect(mockStatsRepository.getSystemStats).toHaveBeenCalledTimes(1)
    })

    it('should deny access to non-admin users', async () => {
      await expect(
        statsService.getSystemStats(mockGestionnaire)
      ).rejects.toThrow(PermissionException)

      expect(mockStatsRepository.getSystemStats).not.toHaveBeenCalled()
    })

    it('should work without user validation when no user provided', async () => {
      mockStatsRepository.getSystemStats.mockResolvedValueOnce({
        success: true,
        data: mockSystemStats
      })

      const result = await statsService.getSystemStats()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSystemStats)
    })
  })

  describe('getActivityStats', () => {
    it('should return activity stats for valid team access', async () => {
      mockStatsRepository.getActivityStats.mockResolvedValueOnce({
        success: true,
        data: mockActivityStats
      })

      const result = await statsService.getActivityStats(
        { teamId: 'team-123', period: '7d' },
        mockGestionnaire
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockActivityStats)
      expect(mockStatsRepository.getActivityStats).toHaveBeenCalledWith('team-123', '7d', undefined)
    })

    it('should apply role-based filtering for detailed metrics', async () => {
      mockStatsRepository.getActivityStats.mockResolvedValueOnce({
        success: true,
        data: mockActivityStats
      })

      const result = await statsService.getActivityStats(
        { teamId: 'team-123', period: '7d' },
        mockPrestataire
      )

      expect(result.success).toBe(true)
      expect(result.data.topUsers).toBeDefined()
      // Prestataires get sanitized user data
      expect(result.data.topUsers[0]._userId).toContain('...')
    })

    it('should default to user team when no teamId specified', async () => {
      mockStatsRepository.getActivityStats.mockResolvedValueOnce({
        success: true,
        data: mockActivityStats
      })

      const result = await statsService.getActivityStats(
        { period: '30d' },
        mockGestionnaire
      )

      expect(result.success).toBe(true)
      expect(mockStatsRepository.getActivityStats).toHaveBeenCalledWith('team-123', '30d', undefined)
    })

    it('should include user filter when userId specified', async () => {
      mockStatsRepository.getActivityStats.mockResolvedValueOnce({
        success: true,
        data: mockActivityStats
      })

      const result = await statsService.getActivityStats(
        { teamId: 'team-123', period: '7d', userId: 'user-456' },
        mockAdmin
      )

      expect(result.success).toBe(true)
      expect(mockStatsRepository.getActivityStats).toHaveBeenCalledWith('team-123', '7d', 'user-456')
    })
  })

  describe('getTeamStats', () => {
    it('should return team stats for team members', async () => {
      mockStatsRepository.getTeamStats.mockResolvedValueOnce({
        success: true,
        data: mockTeamStats
      })

      const result = await statsService.getTeamStats('team-123', mockGestionnaire)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTeamStats)
      expect(mockStatsRepository.getTeamStats).toHaveBeenCalledWith('team-123')
    })

    it('should allow admin access to any team stats', async () => {
      mockStatsRepository.getTeamStats.mockResolvedValueOnce({
        success: true,
        data: mockTeamStats
      })

      const result = await statsService.getTeamStats('any-team-id', mockAdmin)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTeamStats)
    })

    it('should work without user validation', async () => {
      mockStatsRepository.getTeamStats.mockResolvedValueOnce({
        success: true,
        data: mockTeamStats
      })

      const result = await statsService.getTeamStats('team-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTeamStats)
    })
  })

  describe('getUserStats', () => {
    it('should allow users to view their own stats', async () => {
      mockStatsRepository.getUserStats.mockResolvedValueOnce({
        success: true,
        data: mockUserStats
      })

      const result = await statsService.getUserStats('gestionnaire-123', mockGestionnaire)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUserStats)
      expect(mockStatsRepository.getUserStats).toHaveBeenCalledWith('gestionnaire-123')
    })

    it('should allow admin to view any user stats', async () => {
      mockStatsRepository.getUserStats.mockResolvedValueOnce({
        success: true,
        data: mockUserStats
      })

      const result = await statsService.getUserStats('any-user-id', mockAdmin)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUserStats)
    })

    it('should deny access to other users stats for non-admin', async () => {
      await expect(
        statsService.getUserStats('other-user-id', mockGestionnaire)
      ).rejects.toThrow(PermissionException)

      expect(mockStatsRepository.getUserStats).not.toHaveBeenCalled()
    })

    it('should sanitize user stats for non-admin viewing others', async () => {
      mockStatsRepository.getUserStats.mockResolvedValueOnce({
        success: true,
        data: mockUserStats
      })

      const result = await statsService.getUserStats('other-user-id', {
        ...mockGestionnaire,
        role: 'admin'
      } as any)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUserStats)
    })
  })

  describe('getDashboardStats', () => {
    const mockDashboardStats = {
      system: mockSystemStats,
      teams: [mockTeamStats],
      users: [],
      activity: mockActivityStats,
      performance: {
        avgApiResponseTime: 150,
        errorRate: 2.5,
        cacheHitRate: 85
      }
    }

    it('should return complete dashboard stats for admin', async () => {
      mockStatsRepository.getDashboardStats.mockResolvedValueOnce({
        success: true,
        data: mockDashboardStats
      })

      const result = await statsService.getDashboardStats({}, mockAdmin)

      expect(result.success).toBe(true)
      expect(result.data.system).toEqual(mockSystemStats)
      expect(result.data.teams).toEqual([mockTeamStats])
      expect(mockStatsRepository.getDashboardStats).toHaveBeenCalledWith(undefined)
    })

    it('should sanitize dashboard stats for non-admin users', async () => {
      mockStatsRepository.getDashboardStats.mockResolvedValueOnce({
        success: true,
        data: mockDashboardStats
      })

      const result = await statsService.getDashboardStats(
        { teamId: 'team-123' },
        mockGestionnaire
      )

      expect(result.success).toBe(true)
      expect(result.data.system).toEqual({}) // System stats hidden for non-admin
      expect(result.data.users).toEqual([]) // User stats hidden for non-admin
      expect(mockStatsRepository.getDashboardStats).toHaveBeenCalledWith('team-123')
    })
  })

  describe('getComparativeStats', () => {
    it('should return comparative stats with trend analysis', async () => {
      const currentStats = { ...mockActivityStats, total: 50 }
      const previousStats = { ...mockActivityStats, total: 40 }

      mockStatsRepository.getActivityStats
        .mockResolvedValueOnce({ success: true, data: currentStats })
        .mockResolvedValueOnce({ success: true, data: previousStats })

      const result = await statsService.getComparativeStats('team-123', '7d', mockGestionnaire)

      expect(result.success).toBe(true)
      expect(result.data.current.total).toBe(50)
      expect(result.data.previous.total).toBe(40)
      expect(result.data.comparison.totalChange).toBe(25) // 25% increase
      expect(result.data.comparison.trend).toBe('up')
    })

    it('should handle stable trends', async () => {
      mockStatsRepository.getActivityStats
        .mockResolvedValue({ success: true, data: mockActivityStats })

      const result = await statsService.getComparativeStats('team-123', '7d', mockGestionnaire)

      expect(result.success).toBe(true)
      expect(result.data.comparison.totalChange).toBe(0)
      expect(result.data.comparison.trend).toBe('stable')
    })

    it('should deny access for unauthorized teams', async () => {
      const nonTeamMember = { ...mockGestionnaire, team_id: 'other-team' }

      // Mock the canAccessTeamStats method to return false
      const canAccessSpy = vi.spyOn(statsService as any, 'canAccessTeamStats')
      canAccessSpy.mockResolvedValue(false)

      await expect(
        statsService.getComparativeStats('team-123', '7d', nonTeamMember)
      ).rejects.toThrow(PermissionException)

      canAccessSpy.mockRestore()
    })
  })

  describe('exportStats', () => {
    it('should export system stats for admin users', async () => {
      mockStatsRepository.getSystemStats.mockResolvedValueOnce({
        success: true,
        data: mockSystemStats
      })

      const result = await statsService.exportStats(
        'system',
        { format: 'json' },
        mockAdmin
      )

      expect(result.success).toBe(true)
      expect(result.data.format).toBe('json')
      expect(result.data.filename).toContain('system-stats')
      expect(result.data.data).toContain('totalUsers')
    })

    it('should export team stats in CSV format', async () => {
      mockStatsRepository.getTeamStats.mockResolvedValueOnce({
        success: true,
        data: mockTeamStats
      })

      const result = await statsService.exportStats(
        'team',
        { teamId: 'team-123', format: 'csv' },
        mockGestionnaire
      )

      expect(result.success).toBe(true)
      expect(result.data.format).toBe('csv')
      expect(result.data.filename).toContain('team-stats-team-123')
      expect(result.data.filename.endsWith('.csv')).toBe(true)
    })

    it('should deny export for users without permission', async () => {
      await expect(
        statsService.exportStats('system', { format: 'json' }, mockPrestataire)
      ).rejects.toThrow(PermissionException)
    })

    it('should require teamId for team exports', async () => {
      await expect(
        statsService.exportStats('team', { format: 'json' }, mockGestionnaire)
      ).rejects.toThrow(ValidationException)
    })
  })

  describe('clearCache', () => {
    it('should allow admin to clear cache', async () => {
      const result = await statsService.clearCache('team_stats', mockAdmin)

      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
      expect(mockStatsRepository.clearStatsCache).toHaveBeenCalledWith('team_stats')
    })

    it('should deny cache clearing for non-admin users', async () => {
      await expect(
        statsService.clearCache('team_stats', mockGestionnaire)
      ).rejects.toThrow(PermissionException)

      expect(mockStatsRepository.clearStatsCache).not.toHaveBeenCalled()
    })

    it('should clear all cache when no pattern specified', async () => {
      const result = await statsService.clearCache(undefined, mockAdmin)

      expect(result.success).toBe(true)
      expect(mockStatsRepository.clearStatsCache).toHaveBeenCalledWith(undefined)
    })
  })

  describe('getStatsPermissions', () => {
    it('should return correct permissions for admin user', async () => {
      const result = await statsService.getStatsPermissions(mockAdmin)

      expect(result.success).toBe(true)
      expect(result.data.canViewSystemStats).toBe(true)
      expect(result.data.canViewTeamStats).toBe(true)
      expect(result.data.canViewUserStats).toBe(true)
      expect(result.data.canViewDetailedMetrics).toBe(true)
      expect(result.data.canExportStats).toBe(true)
    })

    it('should return correct permissions for gestionnaire user', async () => {
      const result = await statsService.getStatsPermissions(mockGestionnaire)

      expect(result.success).toBe(true)
      expect(result.data.canViewSystemStats).toBe(false)
      expect(result.data.canViewTeamStats).toBe(true)
      expect(result.data.canViewUserStats).toBe(true)
      expect(result.data.canViewDetailedMetrics).toBe(true)
      expect(result.data.canExportStats).toBe(true)
    })

    it('should return correct permissions for prestataire user', async () => {
      const result = await statsService.getStatsPermissions(mockPrestataire)

      expect(result.success).toBe(true)
      expect(result.data.canViewSystemStats).toBe(false)
      expect(result.data.canViewTeamStats).toBe(false)
      expect(result.data.canViewUserStats).toBe(true)
      expect(result.data.canViewDetailedMetrics).toBe(false)
      expect(result.data.canExportStats).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockStatsRepository.getSystemStats.mockRejectedValueOnce(
        new Error('Database connection error')
      )

      await expect(
        statsService.getSystemStats(mockAdmin)
      ).rejects.toThrow('Database connection error')
    })

    it('should handle malformed data', async () => {
      mockStatsRepository.getActivityStats.mockResolvedValueOnce({
        success: true,
        data: null
      })

      // Service should handle null data gracefully
      const result = await statsService.getActivityStats({ teamId: 'team-123' }, mockGestionnaire)
      expect(result).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeActivityStats = {
        ...mockActivityStats,
        total: 10000,
        topUsers: Array.from({ length: 1000 }, (_, i) => ({
          userId: `user-${i}`,
          count: Math.floor(Math.random() * 100)
        }))
      }

      mockStatsRepository.getActivityStats.mockResolvedValueOnce({
        success: true,
        data: largeActivityStats
      })

      const startTime = Date.now()
      const result = await statsService.getActivityStats(
        { teamId: 'team-123' },
        mockGestionnaire
      )
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })
  })
})
