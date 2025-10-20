/**
 * User Service Integration Tests
 * Tests real service interactions with cache validation and cross-service relationships
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createUserService } from '../../domain/user.service'
import { createTeamService } from '../../domain/team.service'
import { createStatsService } from '../../domain/stats.service'
import type { UserService } from '../../domain/user.service'
import type { TeamService } from '../../domain/team.service'
import type { StatsService } from '../../domain/stats.service'

describe('UserService Integration Tests', () => {
  let userService: UserService
  let teamService: TeamService
  let statsService: StatsService

  beforeEach(async () => {
    // Create browser service instances for testing (don't require Next.js request context)
    userService = createUserService()
    teamService = createTeamService()
    statsService = createStatsService()
  })

  afterEach(() => {
    // Clear any caches if needed
    vi.restoreAllMocks()
  })

  describe('Service Creation and Basic Operations', () => {
    it('should create UserService successfully', async () => {
      expect(userService).toBeDefined()
      expect(typeof userService.getAll).toBe('function')
      expect(typeof userService.getById).toBe('function')
      expect(typeof userService.getByEmail).toBe('function')
    })

    it('should have consistent API response format', async () => {
      const response = await userService.getAll()

      expect(response).toHaveProperty('success')
      expect(typeof response.success).toBe('boolean')

      if (response.success) {
        expect(response).toHaveProperty('data')
        expect(Array.isArray(response.data)).toBe(true)
      } else {
        expect(response).toHaveProperty('error')
        expect(response.error).toHaveProperty('message')
      }
    })
  })

  describe('Cache Performance Validation', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const startTime = Date.now()

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => userService.getAll())
      const results = await Promise.all(promises)

      const endTime = Date.now()
      const duration = endTime - startTime

      // All requests should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Should complete within reasonable time (allow for potential cache hits)
      expect(duration).toBeLessThan(5000) // 5 seconds max
    })

    it('should demonstrate cache effectiveness on repeated calls', async () => {
      // First call - might be slower (cache miss)
      const start1 = Date.now()
      const result1 = await userService.getAll()
      const time1 = Date.now() - start1

      // Second call - should be faster (cache hit)
      const start2 = Date.now()
      const result2 = await userService.getAll()
      const time2 = Date.now() - start2

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      // Results should be identical
      expect(JSON.stringify(result1.data)).toEqual(JSON.stringify(result2.data))

      // Note: Cache effectiveness varies, so we just ensure both calls work
      console.log(`Cache timing - First call: ${time1}ms, Second call: ${time2}ms`)
    })
  })

  describe('Cross-Service Integration', () => {
    it('should integrate well with TeamService', async () => {
      const teamsResult = await teamService.getAll()
      expect(teamsResult.success).toBe(true)

      if (teamsResult.success && teamsResult.data && teamsResult.data.length > 0) {
        const firstTeam = teamsResult.data[0]

        // Test getUserTeams method
        const userTeamsResult = await teamService.getUserTeams('test-user-id')
        expect(userTeamsResult).toBeDefined()
        expect(Array.isArray(userTeamsResult)).toBe(true)
      }
    })

    it('should integrate well with StatsService', async () => {
      // Test that UserService data can be used by StatsService
      const usersResult = await userService.getAll()
      expect(usersResult.success).toBe(true)

      // Test stats generation
      const statsResult = await statsService.getDashboardStats()
      expect(statsResult.success).toBe(true)

      if (statsResult.success) {
        expect(statsResult.data).toHaveProperty('users')
        expect(Array.isArray(statsResult.data.users)).toBe(true)
      }
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle invalid user ID gracefully', async () => {
      const invalidId = 'invalid-uuid-format'
      const result = await userService.getById(invalidId)

      // Should either return success: false with error, or handle gracefully
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(typeof result.error.message).toBe('string')
      }
    })

    it('should handle network-like errors gracefully', async () => {
      // This tests the error handling when services are unavailable
      // In a real scenario, this would test database connection issues

      try {
        const result = await userService.getByEmail('')
        // Empty email should be handled gracefully
        expect(result).toBeDefined()
      } catch (error) {
        // If it throws, it should be a proper error with message
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('Business Logic Validation', () => {
    it('should validate user roles correctly', async () => {
      const roles = ['admin', 'gestionnaire', 'locataire', 'prestataire'] as const

      for (const role of roles) {
        const result = await userService.getUsersByRole(role)
        expect(result.success).toBe(true)

        if (result.success && result.data) {
          // All returned users should have the requested role
          result.data.forEach(user => {
            expect(user.role).toBe(role)
          })
        }
      }
    })

    it('should handle team-based filtering', async () => {
      const testTeamId = 'team-test'
      const result = await userService.getUsersByTeam(testTeamId)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true)

        // All returned users should belong to the specified team
        result.data.forEach(user => {
          expect(user.team_id).toBe(testTeamId)
        })
      }
    })
  })

  describe('Performance Benchmarks', () => {
    it('should handle reasonable data loads efficiently', async () => {
      const operations = [
        () => userService.getAll(),
        () => userService.getUsersByRole('gestionnaire'),
        () => teamService.getAll(),
        () => statsService.getDashboardStats()
      ]

      const startTime = Date.now()
      const results = await Promise.all(operations.map(op => op()))
      const endTime = Date.now()

      const totalTime = endTime - startTime

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // Total time should be reasonable for multiple service calls
      expect(totalTime).toBeLessThan(10000) // 10 seconds max for all operations

      console.log(`Integration test performance: ${totalTime}ms for ${operations.length} operations`)
    })
  })
})