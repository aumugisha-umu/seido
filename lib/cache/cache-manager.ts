/**
 * 🚀 CACHE MANAGER - Phase 3 Implementation
 *
 * Multi-level cache architecture:
 * - L1: In-memory LRU Cache (ultra-fast access)
 * - L2: Redis Cache (persistent, shared across instances)
 *
 * Features:
 * - Automatic fallback L1 -> L2 -> Source
 * - Pattern-based invalidation
 * - Connection pooling and retry logic
 * - Performance monitoring
 */

import { LRUCache } from 'lru-cache'

// Conditional Redis import for server-side only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Redis: any = null

async function loadRedis() {
  if (typeof window === 'undefined' && !Redis) {
    try {
      const ioredis = await import('ioredis')
      Redis = ioredis.default
    } catch {
      console.warn('[CACHE-MANAGER] Redis not available, using L1 cache only')
    }
  }
  return Redis
}

export interface CacheConfig {
  l1: {
    max: number
    ttl: number // milliseconds
    updateAgeOnGet: boolean
  }
  l2: {
    host?: string
    port?: number
    maxRetriesPerRequest: number
    lazyConnect: boolean
  }
}

export interface CacheMetrics {
  l1Hits: number
  l1Misses: number
  l2Hits: number
  l2Misses: number
  totalRequests: number
  averageResponseTime: number
}

export class CacheManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private l1Cache: LRUCache<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private l2Cache: any | null = null
  private metrics: CacheMetrics
  private config: CacheConfig
  private isRedisAvailable = false

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      l1: {
        max: 500,
        ttl: 1000 * 60 * 5, // 5 minutes
        updateAgeOnGet: true,
        ...config?.l1
      },
      l2: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        ...config?.l2
      }
    }

    // Initialize L1 cache
    this.l1Cache = new LRUCache({
      max: this.config.l1.max,
      ttl: this.config.l1.ttl,
      updateAgeOnGet: this.config.l1.updateAgeOnGet
    })

    // Initialize metrics
    this.metrics = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalRequests: 0,
      averageResponseTime: 0
    }

    // Initialize L2 cache (Redis) with fallback
    this.initializeRedis()
  }

  private async initializeRedis() {
    try {
      // Only initialize Redis in production or when explicitly configured and on server
      if ((process.env.NODE_ENV === 'production' || process.env.REDIS_HOST) && Redis && typeof window === 'undefined') {
        this.l2Cache = new Redis({
          host: this.config.l2.host,
          port: this.config.l2.port,
          maxRetriesPerRequest: this.config.l2.maxRetriesPerRequest,
          lazyConnect: this.config.l2.lazyConnect,
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxLoadingTimeout: 1000
        })

        this.l2Cache.on('connect', () => {
          this.isRedisAvailable = true
          console.log('✅ [CACHE-MANAGER] Redis connected successfully')
        })

        this.l2Cache.on('error', (error) => {
          this.isRedisAvailable = false
          console.warn('⚠️ [CACHE-MANAGER] Redis connection error:', error.message)
        })

        this.l2Cache.on('close', () => {
          this.isRedisAvailable = false
          console.log('🔌 [CACHE-MANAGER] Redis connection closed')
        })
      } else {
        console.log('📝 [CACHE-MANAGER] Running in development mode - Redis L2 cache disabled')
      }
    } catch (error) {
      console.warn('⚠️ [CACHE-MANAGER] Failed to initialize Redis:', error)
      this.isRedisAvailable = false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    try {
      // Try L1 cache first
      const l1Result = this.l1Cache.get(key)
      if (l1Result !== undefined) {
        this.metrics.l1Hits++
        this.updateAverageResponseTime(startTime)
        console.log(`🎯 [CACHE-L1-HIT] ${key}`)
        return l1Result as T
      }

      this.metrics.l1Misses++

      // Try L2 cache if available
      if (this.l2Cache && this.isRedisAvailable) {
        try {
          const l2Result = await this.l2Cache.get(key)
          if (l2Result) {
            const parsed = JSON.parse(l2Result)
            // Populate L1 cache
            this.l1Cache.set(key, parsed)
            this.metrics.l2Hits++
            this.updateAverageResponseTime(startTime)
            console.log(`🎯 [CACHE-L2-HIT] ${key}`)
            return parsed as T
          }
        } catch (redisError) {
          console.warn(`⚠️ [CACHE-L2-ERROR] ${key}:`, redisError.message)
        }
      }

      this.metrics.l2Misses++
      this.updateAverageResponseTime(startTime)
      console.log(`❌ [CACHE-MISS] ${key}`)
      return null
    } catch (error) {
      console.error(`❌ [CACHE-ERROR] Failed to get ${key}:`, error)
      return null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(key: string, value: any, ttl = 300): Promise<void> {
    try {
      // Set in L1 cache
      this.l1Cache.set(key, value)

      // Set in L2 cache if available
      if (this.l2Cache && this.isRedisAvailable) {
        try {
          await this.l2Cache.setex(key, ttl, JSON.stringify(value))
          console.log(`✅ [CACHE-SET] ${key} (L1+L2)`)
        } catch (redisError) {
          console.warn(`⚠️ [CACHE-L2-SET-ERROR] ${key}:`, redisError.message)
          console.log(`✅ [CACHE-SET] ${key} (L1 only)`)
        }
      } else {
        console.log(`✅ [CACHE-SET] ${key} (L1 only)`)
      }
    } catch (error) {
      console.error(`❌ [CACHE-SET-ERROR] Failed to set ${key}:`, error)
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      // Invalidate L1 cache
      let l1Count = 0
      for (const key of this.l1Cache.keys()) {
        if (key.includes(pattern)) {
          this.l1Cache.delete(key)
          l1Count++
        }
      }

      // Invalidate L2 cache if available
      let l2Count = 0
      if (this.l2Cache && this.isRedisAvailable) {
        try {
          const keys = await this.l2Cache.keys(`*${pattern}*`)
          if (keys.length > 0) {
            await this.l2Cache.del(...keys)
            l2Count = keys.length
          }
        } catch (redisError) {
          console.warn(`⚠️ [CACHE-L2-INVALIDATE-ERROR] ${pattern}:`, redisError.message)
        }
      }

      console.log(`🗑️ [CACHE-INVALIDATE] Pattern: ${pattern}, L1: ${l1Count}, L2: ${l2Count}`)
    } catch (error) {
      console.error(`❌ [CACHE-INVALIDATE-ERROR] Pattern: ${pattern}:`, error)
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      this.l1Cache.clear()

      if (this.l2Cache && this.isRedisAvailable) {
        try {
          await this.l2Cache.flushall()
        } catch (redisError) {
          console.warn('⚠️ [CACHE-L2-FLUSH-ERROR]:', redisError.message)
        }
      }

      console.log('🗑️ [CACHE-FLUSH] All caches cleared')
    } catch (error) {
      console.error('❌ [CACHE-FLUSH-ERROR]:', error)
    }
  }

  getMetrics(): CacheMetrics {
    const hitRate = this.metrics.totalRequests > 0
      ? ((this.metrics.l1Hits + this.metrics.l2Hits) / this.metrics.totalRequests) * 100
      : 0

    return {
      ...this.metrics,
      hitRate: parseFloat(hitRate.toFixed(2))
    } as CacheMetrics & { hitRate: number }
  }

  getStatus() {
    return {
      l1Size: this.l1Cache.size,
      l1MaxSize: this.l1Cache.max,
      l2Available: this.isRedisAvailable,
      metrics: this.getMetrics()
    }
  }

  private updateAverageResponseTime(startTime: number) {
    const responseTime = Date.now() - startTime
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
      this.metrics.totalRequests
  }

  async disconnect() {
    try {
      if (this.l2Cache) {
        await this.l2Cache.disconnect()
        console.log('🔌 [CACHE-MANAGER] Redis disconnected')
      }
    } catch (error) {
      console.warn('⚠️ [CACHE-MANAGER] Error disconnecting Redis:', error)
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

// Utility wrapper with automatic JSON handling
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    return await cacheManager.get<T>(key)
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await cacheManager.set(key, value, ttl)
  },

  async invalidate(pattern: string): Promise<void> {
    await cacheManager.invalidate(pattern)
  },

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 300
  ): Promise<T> {
    const cached = await cacheManager.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const fresh = await fetcher()
    await cacheManager.set(key, fresh, ttl)
    return fresh
  },

  getMetrics: () => cacheManager.getMetrics(),
  getStatus: () => cacheManager.getStatus()
}
