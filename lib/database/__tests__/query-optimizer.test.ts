/**
 * 🧪 Unit Tests for Query Optimizer
 * Phase 3: Testing database optimization functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { QueryOptimizerV2, queryMonitor } from '../query-optimizer'

// Mock Supabase client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          then: vi.fn().mockResolvedValue({ data: [], error: null })
        })),
        eq: vi.fn(() => ({
          then: vi.fn().mockResolvedValue({ data: [], error: null })
        })),
        range: vi.fn(() => ({
          order: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
          }))
        }))
      }))
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  })
}))

// Mock cache
vi.mock('../cache-manager', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getOrSet: vi.fn().mockImplementation(async (key, fetcher) => {
      return await fetcher()
    }),
    invalidate: vi.fn().mockResolvedValue(undefined),
    getMetrics: vi.fn().mockReturnValue({
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalRequests: 0
    })
  }
}))

describe('QueryOptimizerV2', () => {
  let optimizer: QueryOptimizerV2

  beforeEach(() => {
    optimizer = new QueryOptimizerV2()
    vi.clearAllMocks()
  })

  afterEach(() => {
    optimizer.clearDataLoaderCache()
  })

  describe('DataLoader Functionality', () => {
    it('should batch user requests', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com' },
        { id: '2', name: 'User 2', email: 'user2@test.com' }
      ]

      // Mock the supabase response for user batch loading
      const { createClient } = await import('@/utils/supabase/server')
      const mockClient = await createClient()
      const mockFrom = mockClient.from as any
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ data: mockUsers, error: null })
          }))
        }))
      })

      // Request multiple users
      const [user1, user2] = await Promise.all([
        optimizer.getUser('1'),
        optimizer.getUser('2')
      ])

      expect(user1).toEqual(mockUsers[0])
      expect(user2).toEqual(mockUsers[1])

      // Should have made only one batch request
      expect(mockFrom).toHaveBeenCalledTimes(1)
    })

    it('should handle missing users in batch', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', email: 'user1@test.com' }
        // User 2 missing
      ]

      const { createClient } = await import('@/utils/supabase/server')
      const mockClient = await createClient()
      const mockFrom = mockClient.from as any
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ data: mockUsers, error: null })
          }))
        }))
      })

      const [user1, user2] = await Promise.all([
        optimizer.getUser('1'),
        optimizer.getUser('2')
      ])

      expect(user1).toEqual(mockUsers[0])
      expect(user2).toBeNull() // Missing user should return null
    })

    it('should handle database errors in batch loading', async () => {
      const { createClient } = await import('@/utils/supabase/server')
      const mockClient = await createClient()
      const mockFrom = mockClient.from as any
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          }))
        }))
      })

      const user = await optimizer.getUser('1')
      expect(user).toBeNull()
    })
  })

  describe('Cache Integration', () => {
    it('should use cache for repeated requests', async () => {
      const { cache } = await import('../cache-manager')
      const mockUser = { id: '1', name: 'Cached User', email: 'cached@test.com' }

      // Mock cache hit
      ;(cache.get as any).mockResolvedValueOnce(mockUser)

      const user = await optimizer.getUser('1')

      expect(user).toEqual(mockUser)
      expect(cache.get).toHaveBeenCalledWith('user:1')
      // Should not call database when cache hits
    })

    it('should cache database results', async () => {
      const { cache } = await import('../cache-manager')
      const { createClient } = await import('@/utils/supabase/server')

      const mockUser = { id: '1', name: 'DB User', email: 'db@test.com' }

      // Mock cache miss then database hit
      ;(cache.get as any).mockResolvedValueOnce(null)

      const mockClient = await createClient()
      const mockFrom = mockClient.from as any
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ data: [mockUser], error: null })
          }))
        }))
      })

      const user = await optimizer.getUser('1')

      expect(user).toEqual(mockUser)
      expect(cache.set).toHaveBeenCalledWith('user:1', mockUser, 300)
    })
  })

  describe('Dashboard Summary', () => {
    it('should fetch dashboard summary with caching', async () => {
      const { cache } = await import('../cache-manager')
      const mockSummary = [
        { id: '1', title: 'Intervention 1', status: 'pending' },
        { id: '2', title: 'Intervention 2', status: 'completed' }
      ]

      ;(cache.getOrSet as any).mockResolvedValueOnce(mockSummary)

      const summary = await optimizer.getDashboardSummary('team-1')

      expect(summary).toEqual(mockSummary)
      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dashboard:summary:team-1',
        expect.any(Function),
        300
      )
    })

    it('should handle dashboard summary errors', async () => {
      const { cache } = await import('../cache-manager')
      const error = new Error('Database error')

      ;(cache.getOrSet as any).mockRejectedValueOnce(error)

      await expect(optimizer.getDashboardSummary('team-1')).rejects.toThrow('Database error')
    })
  })

  describe('Paginated Interventions', () => {
    it('should fetch paginated interventions with filters', async () => {
      const { cache } = await import('../cache-manager')
      const mockResult = {
        items: [
          { id: '1', title: 'Intervention 1', status: 'pending' }
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      }

      ;(cache.getOrSet as any).mockResolvedValueOnce(mockResult)

      const result = await optimizer.getInterventionsPaginated(
        'team-1',
        1,
        20,
        { status: 'pending', priority: 'high' }
      )

      expect(result).toEqual(mockResult)

      // Check cache key includes filters
      const cacheKey = (cache.getOrSet as any).mock.calls[0][0]
      expect(cacheKey).toContain('team-1')
      expect(cacheKey).toContain('pending')
      expect(cacheKey).toContain('high')
    })

    it('should handle search filters', async () => {
      const { cache } = await import('../cache-manager')

      await optimizer.getInterventionsPaginated(
        'team-1',
        1,
        20,
        { search: 'plomberie' }
      )

      const cacheKey = (cache.getOrSet as any).mock.calls[0][0]
      expect(cacheKey).toContain('plomberie')
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate entity cache', async () => {
      const { cache } = await import('../cache-manager')

      await optimizer.invalidateEntity('user', '1')

      expect(cache.invalidate).toHaveBeenCalledWith('user:1')
    })

    it('should invalidate team cache', async () => {
      const { cache } = await import('../cache-manager')

      await optimizer.invalidateTeam('team-1')

      expect(cache.invalidate).toHaveBeenCalledWith('dashboard:summary:team-1')
      expect(cache.invalidate).toHaveBeenCalledWith('interventions:paginated:team-1')
      expect(cache.invalidate).toHaveBeenCalledWith('user:team:team-1')
    })
  })

  describe('Cache Priming', () => {
    it('should prime cache with batch data', async () => {
      const { cache } = await import('../cache-manager')
      const entities = [
        { id: '1', name: 'Entity 1' },
        { id: '2', name: 'Entity 2' }
      ]

      await optimizer.primeCache('user', entities, 600)

      expect(cache.set).toHaveBeenCalledWith('user:1', entities[0], 600)
      expect(cache.set).toHaveBeenCalledWith('user:2', entities[1], 600)
    })
  })

  describe('Performance Metrics', () => {
    it('should provide performance metrics', () => {
      const metrics = optimizer.getPerformanceMetrics()

      expect(metrics).toHaveProperty('queries')
      expect(metrics).toHaveProperty('slowQueries')
      expect(metrics).toHaveProperty('cache')
      expect(metrics).toHaveProperty('dataLoader')

      expect(metrics.dataLoader).toHaveProperty('userLoader')
      expect(metrics.dataLoader).toHaveProperty('interventionLoader')
    })
  })

  describe('DataLoader Cache Management', () => {
    it('should clear DataLoader caches', () => {
      // This is mainly for ensuring the method exists and doesn't throw
      expect(() => optimizer.clearDataLoaderCache()).not.toThrow()
    })
  })
})

describe('Query Performance Monitor', () => {
  beforeEach(() => {
    // Reset metrics
    queryMonitor.getMetrics()
  })

  describe('Query Logging', () => {
    it('should log query performance', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      queryMonitor.logQuery('test-query', 150)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-query'),
        expect.stringContaining('150ms')
      )

      consoleSpy.mockRestore()
    })

    it('should warn about slow queries', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      queryMonitor.logQuery('slow-query', 250) // Above 200ms threshold

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SLOW-QUERY'),
        expect.stringContaining('slow-query'),
        expect.stringContaining('250ms')
      )

      consoleSpy.mockRestore()
    })

    it('should track cache hits', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      queryMonitor.logQuery('cached-query', 5, true)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('cached-query'),
        expect.stringContaining('(cached)')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Metrics Calculation', () => {
    it('should calculate correct metrics', () => {
      // Log some queries
      queryMonitor.logQuery('fast-query', 100)
      queryMonitor.logQuery('cached-query', 50, true)
      queryMonitor.logQuery('slow-query', 300)

      const metrics = queryMonitor.getMetrics()

      expect(metrics.totalQueries).toBe(3)
      expect(metrics.cachedQueries).toBe(1)
      expect(metrics.cacheHitRate).toBe(33.33) // 1/3 * 100
      expect(metrics.slowQueries).toBe(1)
      expect(metrics.slowQueryRate).toBe(33.33) // 1/3 * 100
      expect(metrics.averageDuration).toBe(150) // (100 + 50 + 300) / 3
    })

    it('should handle empty metrics', () => {
      const metrics = queryMonitor.getMetrics()

      expect(metrics.totalQueries).toBe(0)
      expect(metrics.cachedQueries).toBe(0)
      expect(metrics.cacheHitRate).toBe(0)
      expect(metrics.averageDuration).toBe(0)
      expect(metrics.slowQueries).toBe(0)
      expect(metrics.slowQueryRate).toBe(0)
    })
  })

  describe('Slow Query Tracking', () => {
    it('should return slow queries sorted by duration', () => {
      queryMonitor.logQuery('query1', 150)
      queryMonitor.logQuery('query2', 300)
      queryMonitor.logQuery('query3', 250)
      queryMonitor.logQuery('query4', 100)

      const slowQueries = queryMonitor.getSlowQueries()

      expect(slowQueries).toHaveLength(2) // Only queries > 200ms
      expect(slowQueries[0].duration).toBe(300) // Highest first
      expect(slowQueries[1].duration).toBe(250)
      expect(slowQueries[0].query).toBe('query2')
      expect(slowQueries[1].query).toBe('query3')
    })

    it('should limit slow queries to top 10', () => {
      // Log 15 slow queries
      for (let i = 0; i < 15; i++) {
        queryMonitor.logQuery(`slow-query-${i}`, 250 + i)
      }

      const slowQueries = queryMonitor.getSlowQueries()

      expect(slowQueries).toHaveLength(10)
      // Should be sorted by duration (highest first)
      expect(slowQueries[0].duration).toBe(264) // 250 + 14
      expect(slowQueries[9].duration).toBe(255) // 250 + 5
    })
  })

  describe('Metrics Retention', () => {
    it('should keep only last 100 queries', () => {
      // Log 150 queries
      for (let i = 0; i < 150; i++) {
        queryMonitor.logQuery(`query-${i}`, 100)
      }

      const metrics = queryMonitor.getMetrics()

      expect(metrics.totalQueries).toBe(100) // Should cap at 100
    })
  })
})
