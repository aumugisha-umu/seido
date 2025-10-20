/**
 * 🚀 PHASE 3: Query Optimizer
 *
 * Advanced query optimization with:
 * - DataLoader for batch operations
 * - Materialized views for dashboards
 * - Connection pooling
 * - Query performance monitoring
 */

import DataLoader from 'dataloader'
import { createClient } from '@/utils/supabase/server'
import { cache } from '@/lib/cache/cache-manager'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'

// Type aliases for better readability
type Tables = Database['public']['Tables']
type User = Tables['users']['Row']
type Intervention = Tables['interventions']['Row']
type Building = Tables['buildings']['Row']

interface QueryMetrics {
  query: string
  duration: number
  cacheHit: boolean
  timestamp: number
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = []
  private slowQueryThreshold = 200 // ms

  logQuery(query: string, duration: number, cacheHit = false) {
    const metric: QueryMetrics = {
      query,
      duration,
      cacheHit,
      timestamp: Date.now()
    }

    this.metrics.push(metric)

    // Keep only last 100 queries
    if (this.metrics.length > 100) {
      this.metrics.shift()
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`🐌 [SLOW-QUERY] ${query}: ${duration}ms`)
    } else {
      console.log(`⚡ [QUERY] ${query}: ${duration}ms ${cacheHit ? '(cached)' : ''}`)
    }
  }

  getMetrics() {
    const total = this.metrics.length
    const cached = this.metrics.filter(m => m.cacheHit).length
    const avgDuration = total > 0
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total
      : 0
    const slowQueries = this.metrics.filter(m => m.duration > this.slowQueryThreshold).length

    return {
      totalQueries: total,
      cachedQueries: cached,
      cacheHitRate: total > 0 ? (cached / total) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      slowQueries,
      slowQueryRate: total > 0 ? (slowQueries / total) * 100 : 0
    }
  }

  getSlowQueries() {
    return this.metrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
  }
}

export const queryMonitor = new QueryPerformanceMonitor()

/**
 * Enhanced Database Service with Query Optimization
 */
export class QueryOptimizerV2 {
  private userLoader: DataLoader<string, User | null>
  private interventionLoader: DataLoader<string, Intervention | null>
  private buildingLoader: DataLoader<string, Building | null>

  constructor() {
    // Initialize DataLoaders for batch operations
    this.userLoader = new DataLoader(async (ids: string[]) => {
      const startTime = Date.now()
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', ids)

      queryMonitor.logQuery(`users batch(${ids.length})`, Date.now() - startTime)

      if (error) {
        console.error('[DATALOADER] Users batch error:', error)
        return ids.map(() => null)
      }

      // Maintain order and handle missing items
      return ids.map(id => data?.find(item => item.id === id) || null)
    }, {
      maxBatchSize: 100,
      batchScheduleFn: callback => setTimeout(callback, 10) // 10ms batching window
    })

    this.interventionLoader = new DataLoader(async (ids: string[]) => {
      const startTime = Date.now()
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          building:buildings(*),
          contacts:intervention_contacts(
            contact:contacts(*)
          )
        `)
        .in('id', ids)

      queryMonitor.logQuery(`interventions batch(${ids.length})`, Date.now() - startTime)

      if (error) {
        console.error('[DATALOADER] Interventions batch error:', error)
        return ids.map(() => null)
      }

      return ids.map(id => data?.find(item => item.id === id) || null)
    }, {
      maxBatchSize: 50, // Smaller batch for complex queries
      batchScheduleFn: callback => setTimeout(callback, 10)
    })

    this.buildingLoader = new DataLoader(async (ids: string[]) => {
      const startTime = Date.now()
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .in('id', ids)

      queryMonitor.logQuery(`buildings batch(${ids.length})`, Date.now() - startTime)

      if (error) {
        console.error('[DATALOADER] Buildings batch error:', error)
        return ids.map(() => null)
      }

      return ids.map(id => data?.find(item => item.id === id) || null)
    }, {
      maxBatchSize: 100,
      batchScheduleFn: callback => setTimeout(callback, 10)
    })
  }

  /**
   * Get user with batching and caching
   */
  async getUser(_id: string): Promise<User | null> {
    const cacheKey = `user:${id}`

    // Try cache first
    const cached = await cache.get<User>(cacheKey)
    if (cached) {
      queryMonitor.logQuery(`user:${id}`, 0, true)
      return cached
    }

    // Use DataLoader for batching
    const user = await this.userLoader.load(id)

    // Cache result
    if (user) {
      await cache.set(cacheKey, user, 300) // 5 minutes
    }

    return user
  }

  /**
   * Get intervention with batching and caching
   */
  async getIntervention(_id: string): Promise<Intervention | null> {
    const cacheKey = `intervention:${id}`

    const cached = await cache.get<Intervention>(cacheKey)
    if (cached) {
      queryMonitor.logQuery(`intervention:${id}`, 0, true)
      return cached
    }

    const intervention = await this.interventionLoader.load(id)

    if (intervention) {
      await cache.set(cacheKey, intervention, 120) // 2 minutes (more dynamic data)
    }

    return intervention
  }

  /**
   * Get building with batching and caching
   */
  async getBuilding(_id: string): Promise<Building | null> {
    const cacheKey = `building:${id}`

    const cached = await cache.get<Building>(cacheKey)
    if (cached) {
      queryMonitor.logQuery(`building:${id}`, 0, true)
      return cached
    }

    const building = await this.buildingLoader.load(id)

    if (building) {
      await cache.set(cacheKey, building, 600) // 10 minutes (stable data)
    }

    return building
  }

  /**
   * Get dashboard summary with materialized view
   */
  async getDashboardSummary(teamId: string) {
    const cacheKey = `dashboard:summary:${teamId}`
    const startTime = Date.now()

    return await cache.getOrSet(cacheKey, async () => {
      const supabase = await createClient()

      // Use materialized view for better performance
      const { data, error } = await supabase
        .from('intervention_summary_view')
        .select('*')
        .eq('team_id', teamId)

      queryMonitor.logQuery(`dashboard_summary:${teamId}`, Date.now() - startTime)

      if (error) {
        console.error('[QUERY-OPTIMIZER] Dashboard summary error:', error)
        throw error
      }

      return data
    }, 300) // 5 minutes cache
  }

  /**
   * Get paginated interventions with optimized query
   */
  async getInterventionsPaginated(
    teamId: string,
    page = 1,
    limit = 20,
    filters: {
      status?: string
      priority?: string
      search?: string
    } = {}
  ) {
    const cacheKey = `interventions:paginated:${teamId}:${page}:${limit}:${JSON.stringify(filters)}`
    const startTime = Date.now()

    return await cache.getOrSet(cacheKey, async () => {
      const supabase = await createClient()
      const offset = (page - 1) * limit

      let query = supabase
        .from('interventions')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          created_at,
          building:buildings!inner(
            id,
            name,
            address
          )
        `, { count: 'exact' })
        .eq('team_id', teamId)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error, count } = await query

      queryMonitor.logQuery(
        `interventions_paginated:${teamId}:page${page}`,
        Date.now() - startTime
      )

      if (error) {
        console.error('[QUERY-OPTIMIZER] Interventions paginated error:', error)
        throw error
      }

      return {
        items: data || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }, 120) // 2 minutes cache
  }

  /**
   * Clear cache for entity
   */
  async invalidateEntity(entityType: string, id: string) {
    await cache.invalidate(`${entityType}:${id}`)
  }

  /**
   * Clear all cache for team
   */
  async invalidateTeam(teamId: string) {
    await Promise.all([
      cache.invalidate(`dashboard:summary:${teamId}`),
      cache.invalidate(`interventions:paginated:${teamId}`),
      cache.invalidate(`user:team:${teamId}`)
    ])
  }

  /**
   * Prime cache with batch data
   */
  async primeCache<T>(entityType: string, entities: Array<T & { id: string }>, ttl = 300) {
    await Promise.all(
      entities.map(entity =>
        cache.set(`${entityType}:${entity.id}`, entity, ttl)
      )
    )
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      queries: queryMonitor.getMetrics(),
      slowQueries: queryMonitor.getSlowQueries(),
      cache: cache.getMetrics(),
      dataLoader: {
        userLoader: {
          cacheHitRatio: this.userLoader.cacheKeyFn ? 'enabled' : 'disabled',
          size: (this.userLoader as unknown as { _cache?: { size: number } })._cache?.size || 0
        },
        interventionLoader: {
          cacheHitRatio: this.interventionLoader.cacheKeyFn ? 'enabled' : 'disabled',
          size: (this.interventionLoader as unknown as { _cache?: { size: number } })._cache?.size || 0
        }
      }
    }
  }

  /**
   * Clear all DataLoader caches
   */
  clearDataLoaderCache() {
    this.userLoader.clearAll()
    this.interventionLoader.clearAll()
    this.buildingLoader.clearAll()
    console.log('🧹 [QUERY-OPTIMIZER] DataLoader caches cleared')
  }
}

// Singleton instance
export const queryOptimizer = new QueryOptimizerV2()

// Helper function to create materialized views
export async function createMaterializedViews() {
  const supabase = await createClient()

  try {
    // Intervention summary view for dashboards
    await supabase.rpc('create_intervention_summary_view', {
      sql: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS intervention_summary_view AS
        SELECT
          i.id,
          i.title,
          i.status,
          i.priority,
          i.created_at,
          i.team_id,
          COUNT(DISTINCT ic.contact_id) as contact_count,
          COUNT(DISTINCT f.id) as file_count,
          MAX(il.created_at) as last_activity
        FROM interventions i
        LEFT JOINintervention_assignments ic ON i.id = ic.intervention_id
        LEFT JOIN files f ON i.id = f.intervention_id
        LEFT JOIN intervention_logs il ON i.id = il.intervention_id
        GROUP BY i.id, i.title, i.status, i.priority, i.created_at, i.team_id;

        CREATE INDEX IF NOT EXISTS idx_intervention_summary_team_status
        ON intervention_summary_view(team_id, status);

        CREATE INDEX IF NOT EXISTS idx_intervention_summary_created_at
        ON intervention_summary_view(created_at DESC);
      `
    })

    console.log('✅ [QUERY-OPTIMIZER] Materialized views created successfully')
  } catch (error) {
    console.warn('⚠️ [QUERY-OPTIMIZER] Failed to create materialized views:', error)
  }
}
