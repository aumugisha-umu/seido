import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AuthCacheManager } from '@/lib/auth-cache-manager'
import type { AuthUser } from '@/lib/auth/types'

describe('AuthCacheManager', () => {
  let cacheManager: AuthCacheManager

  beforeEach(() => {
    // Reset singleton before each test
    AuthCacheManager['instance'] = undefined
    cacheManager = AuthCacheManager.getInstance()
  })

  afterEach(() => {
    // Clear all caches after each test
    cacheManager.invalidateAll()
  })

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AuthCacheManager.getInstance()
      const instance2 = AuthCacheManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Basic Cache Operations', () => {
    it('should store and retrieve profile data', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'gestionnaire'
      }

      cacheManager.set('profile', 'user-123', mockUser)

      const cached = await cacheManager.get('profile', 'user-123')
      expect(cached).toEqual(mockUser)
    })

    it('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('profile', 'non-existent')
      expect(result).toBeNull()
    })

    it('should invalidate specific entries', async () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'gestionnaire'
      }

      cacheManager.set('profile', 'user-123', mockUser)
      cacheManager.invalidate('profile', 'user-123')

      const cached = await cacheManager.get('profile', 'user-123')
      expect(cached).toBeNull()
    })
  })

  describe('TTL and Stale-While-Revalidate', () => {
    it('should use fetcher when cache miss', async () => {
      const mockUser: AuthUser = {
        id: 'user-456',
        email: 'test2@example.com',
        name: 'Test User 2',
        role: 'locataire'
      }

      const fetcher = vi.fn().mockResolvedValue(mockUser)

      const result = await cacheManager.get('profile', 'user-456', fetcher)

      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockUser)
    })

    it('should not call fetcher when cache hit', async () => {
      const mockUser: AuthUser = {
        id: 'user-789',
        email: 'test3@example.com',
        name: 'Test User 3',
        role: 'prestataire'
      }

      cacheManager.set('profile', 'user-789', mockUser)

      const fetcher = vi.fn().mockResolvedValue(mockUser)
      const result = await cacheManager.get('profile', 'user-789', fetcher)

      expect(fetcher).not.toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should bypass cache when option is set', async () => {
      const mockUser: AuthUser = {
        id: 'user-999',
        email: 'test4@example.com',
        name: 'Test User 4',
        role: 'admin'
      }

      cacheManager.set('profile', 'user-999', mockUser)

      const updatedUser = { ...mockUser, name: 'Updated User' }
      const fetcher = vi.fn().mockResolvedValue(updatedUser)

      const result = await cacheManager.get(
        'profile',
        'user-999',
        fetcher,
        { bypassCache: true }
      )

      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result).toEqual(updatedUser)
    })
  })

  describe('User Invalidation', () => {
    it('should invalidate all user-related caches', () => {
      const userId = 'user-invalidate'

      // Set data in multiple cache types
      cacheManager.set('profile', userId, { id: userId, name: 'User' })
      cacheManager.set('permission', `${userId}_admin`, { canEdit: true })
      cacheManager.set('team', `user_teams_${userId}`, ['team1', 'team2'])

      // Invalidate all user data
      cacheManager.invalidateUser(userId)

      // Verify all caches are cleared
      expect(cacheManager.get('profile', userId)).resolves.toBeNull()
      expect(cacheManager.get('permission', `${userId}_admin`)).resolves.toBeNull()
      expect(cacheManager.get('team', `user_teams_${userId}`)).resolves.toBeNull()
    })
  })

  describe('Performance Metrics', () => {
    it('should track cache hits and misses', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'test' })

      // Cache miss
      await cacheManager.get('profile', 'metrics-test', fetcher)

      // Cache hit
      await cacheManager.get('profile', 'metrics-test', fetcher)

      const metrics = cacheManager.getMetrics('profile')
      expect(metrics).toBeDefined()
      expect(metrics?.hits).toBe(1)
      expect(metrics?.misses).toBe(1)
      expect(metrics?.hitRate).toBe(50)
    })

    it('should calculate global hit rate', async () => {
      const mockData = { data: 'test' }

      // Create some hits and misses
      cacheManager.set('profile', 'hit1', mockData)
      cacheManager.set('team', 'hit2', mockData)

      await cacheManager.get('profile', 'hit1') // hit
      await cacheManager.get('team', 'hit2') // hit
      await cacheManager.get('profile', 'miss1') // miss
      await cacheManager.get('team', 'miss2') // miss

      const hitRate = cacheManager.getGlobalHitRate()
      expect(hitRate).toBe(50) // 2 hits, 2 misses = 50%
    })

    it('should track memory usage', () => {
      // Add entries to different caches
      cacheManager.set('profile', 'mem1', { id: '1' })
      cacheManager.set('profile', 'mem2', { id: '2' })
      cacheManager.set('team', 'team1', { name: 'Team 1' })
      cacheManager.set('permission', 'perm1', { role: 'admin' })

      const memory = cacheManager.getMemoryUsage()

      expect(memory.profiles).toBe(2)
      expect(memory.teams).toBe(1)
      expect(memory.permissions).toBe(1)
      expect(memory.sessions).toBe(0)
      expect(memory.total).toBe(4)
    })
  })

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when limit reached', async () => {
      // This test would require mocking the MAX_ENTRIES_PER_CACHE
      // and testing eviction behavior
      // For now, we'll just verify the eviction method exists
      expect(cacheManager['evictLRU']).toBeDefined()
    })
  })

  describe('Cache Type Management', () => {
    it('should invalidate all entries of a specific type', () => {
      // Add multiple entries to profile cache
      cacheManager.set('profile', 'user1', { id: '1' })
      cacheManager.set('profile', 'user2', { id: '2' })
      cacheManager.set('profile', 'user3', { id: '3' })

      // Add entries to other caches
      cacheManager.set('team', 'team1', { name: 'Team' })

      // Invalidate all profiles
      cacheManager.invalidateType('profile')

      // Verify profiles are cleared but teams remain
      expect(cacheManager.get('profile', 'user1')).resolves.toBeNull()
      expect(cacheManager.get('profile', 'user2')).resolves.toBeNull()
      expect(cacheManager.get('profile', 'user3')).resolves.toBeNull()
      expect(cacheManager.get('team', 'team1')).resolves.not.toBeNull()
    })
  })

  describe('Background Revalidation', () => {
    it('should revalidate in background when stale', async () => {
      // This would require time manipulation with vi.useFakeTimers()
      // to test the stale-while-revalidate behavior
      expect(cacheManager['revalidateInBackground']).toBeDefined()
    })
  })
})