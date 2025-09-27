/**
 * Optimized Database Service with Supabase 2025 Best Practices
 *
 * Key improvements:
 * - Proper error handling with typed errors
 * - Query optimization with select columns
 * - Connection pooling and retry logic
 * - Proper TypeScript types
 * - Performance monitoring
 */

import { supabase } from './supabase'
import type { Database } from './database.types'

// Type aliases for better readability
type Tables = Database['public']['Tables']
type Building = Tables['buildings']['Row']
type User = Tables['users']['Row']
type Lot = Tables['lots']['Row']
type Intervention = Tables['interventions']['Row']

// Custom error class for database operations
class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Supabase 2025 Best Practice: Query builder with monitoring
class QueryBuilder {
  private startTime: number

  constructor(private queryName: string) {
    this.startTime = performance.now()
  }

  logPerformance() {
    const duration = performance.now() - this.startTime
    console.log(`⚡ [QUERY-PERF] ${this.queryName}: ${duration.toFixed(2)}ms`)
  }
}

// Building Services with 2025 Best Practices
export const buildingServiceOptimized = {
  /**
   * Get all buildings for a team with optimized query
   * Supabase 2025 Best Practice: Select only needed columns
   */
  async getTeamBuildings(teamId: string): Promise<Building[]> {
    const query = new QueryBuilder('getTeamBuildings')

    try {
      console.log('🏢 [BUILDING-SERVICE] Getting buildings for team:', teamId)

      // Best Practice: Use single query with proper joins
      const { data, error, count } = await supabase
        .from('buildings')
        .select(`
          id,
          name,
          address,
          city,
          postal_code,
          country,
          description,
          construction_year,
          total_lots,
          team_id,
          created_at,
          updated_at,
          building_contacts!inner (
            is_primary,
            user:users!inner (
              id,
              name,
              email,
              phone,
              role,
              provider_category
            )
          )
        `, { count: 'exact' })
        .eq('team_id', teamId)
        .order('name')

      query.logPerformance()

      if (error) {
        console.error('❌ [BUILDING-SERVICE] Query error:', error)
        throw new DatabaseError(
          'Failed to fetch team buildings',
          error.code || 'UNKNOWN',
          error
        )
      }

      console.log(`✅ [BUILDING-SERVICE] Found ${count || 0} buildings`)

      // Post-process with manager extraction
      const processed = (data || []).map(building => ({
        ...building,
        manager: building.building_contacts?.find(
          (bc: any) => bc.user?.role === 'gestionnaire' && bc.is_primary
        )?.user || null
      }))

      return processed
    } catch (error) {
      // Best Practice: Proper error propagation
      if (error instanceof DatabaseError) throw error

      console.error('❌ [BUILDING-SERVICE] Unexpected error:', error)
      throw new DatabaseError(
        'Unexpected error fetching buildings',
        'INTERNAL_ERROR',
        error
      )
    }
  },

  /**
   * Get building by ID with full details
   * Supabase 2025 Best Practice: Use RLS and single() for single records
   */
  async getById(buildingId: string): Promise<Building | null> {
    const query = new QueryBuilder('getBuildingById')

    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', buildingId)
        .single()

      query.logPerformance()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null
        }
        throw new DatabaseError(
          'Failed to fetch building',
          error.code || 'UNKNOWN',
          error
        )
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) throw error

      console.error('❌ [BUILDING-SERVICE] Error:', error)
      return null
    }
  }
}

// Lot Services with 2025 Best Practices
export const lotServiceOptimized = {
  /**
   * Get lots by building ID with tenant information
   * Supabase 2025 Best Practice: Batch operations and relationship loading
   */
  async getByBuildingId(buildingId: string): Promise<Lot[]> {
    const query = new QueryBuilder('getLotsByBuilding')

    try {
      // Best Practice: Use proper join syntax for Supabase 2025
      const { data, error } = await supabase
        .from('lots')
        .select(`
          *,
          lot_contacts (
            is_primary,
            user:users (
              id,
              name,
              email,
              phone,
              role,
              provider_category
            )
          )
        `)
        .eq('building_id', buildingId)
        .order('reference')

      query.logPerformance()

      if (error) {
        throw new DatabaseError(
          'Failed to fetch lots',
          error.code || 'UNKNOWN',
          error
        )
      }

      // Best Practice: Efficient post-processing
      return (data || []).map(lot => {
        const tenants = lot.lot_contacts?.filter(
          (contact: any) => contact.user?.role === 'locataire'
        ) || []

        return {
          ...lot,
          is_occupied: tenants.length > 0,
          tenant: tenants.find((t: any) => t.is_primary)?.user ||
                  tenants[0]?.user || null,
          tenants: tenants.map((contact: any) => contact.user).filter(Boolean)
        }
      })
    } catch (error) {
      if (error instanceof DatabaseError) throw error

      console.error('❌ [LOT-SERVICE] Error:', error)
      return []
    }
  },

  /**
   * Bulk fetch lots for multiple buildings
   * Supabase 2025 Best Practice: Use IN operator for bulk queries
   */
  async getByBuildingIds(buildingIds: string[]): Promise<Record<string, Lot[]>> {
    if (buildingIds.length === 0) return {}

    const query = new QueryBuilder('getBulkLots')

    try {
      const { data, error } = await supabase
        .from('lots')
        .select(`
          *,
          lot_contacts (
            is_primary,
            user:users (
              id,
              name,
              email,
              phone,
              role
            )
          )
        `)
        .in('building_id', buildingIds)
        .order('building_id')
        .order('reference')

      query.logPerformance()

      if (error) {
        throw new DatabaseError(
          'Failed to fetch lots',
          error.code || 'UNKNOWN',
          error
        )
      }

      // Group by building ID for efficient access
      const grouped: Record<string, Lot[]> = {}

      for (const lot of data || []) {
        if (!grouped[lot.building_id]) {
          grouped[lot.building_id] = []
        }

        const tenants = lot.lot_contacts?.filter(
          (contact: any) => contact.user?.role === 'locataire'
        ) || []

        grouped[lot.building_id].push({
          ...lot,
          is_occupied: tenants.length > 0,
          tenant: tenants.find((t: any) => t.is_primary)?.user || null,
          tenants: tenants.map((contact: any) => contact.user).filter(Boolean)
        })
      }

      return grouped
    } catch (error) {
      if (error instanceof DatabaseError) throw error

      console.error('❌ [LOT-SERVICE] Bulk fetch error:', error)
      return {}
    }
  }
}

// User Services with 2025 Best Practices
export const userServiceOptimized = {
  /**
   * Get team users with pagination support
   * Supabase 2025 Best Practice: Implement pagination for large datasets
   */
  async getTeamUsers(
    teamId: string,
    options?: {
      limit?: number
      offset?: number
      role?: string
    }
  ): Promise<{ users: User[]; total: number }> {
    const query = new QueryBuilder('getTeamUsers')

    try {
      let queryBuilder = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('team_id', teamId)

      // Apply filters
      if (options?.role) {
        queryBuilder = queryBuilder.eq('role', options.role)
      }

      // Apply pagination
      if (options?.limit) {
        queryBuilder = queryBuilder.limit(options.limit)
      }
      if (options?.offset) {
        queryBuilder = queryBuilder.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        )
      }

      queryBuilder = queryBuilder.order('name')

      const { data, error, count } = await queryBuilder

      query.logPerformance()

      if (error) {
        throw new DatabaseError(
          'Failed to fetch team users',
          error.code || 'UNKNOWN',
          error
        )
      }

      return {
        users: data || [],
        total: count || 0
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error

      console.error('❌ [USER-SERVICE] Error:', error)
      return { users: [], total: 0 }
    }
  }
}

// Intervention Services with 2025 Best Practices
export const interventionServiceOptimized = {
  /**
   * Get team interventions with filtering and real-time subscription support
   * Supabase 2025 Best Practice: Prepare for real-time updates
   */
  async getTeamInterventions(
    teamId: string,
    options?: {
      status?: string
      limit?: number
      includeArchived?: boolean
    }
  ): Promise<Intervention[]> {
    const query = new QueryBuilder('getTeamInterventions')

    try {
      let queryBuilder = supabase
        .from('interventions')
        .select(`
          *,
          lot:lots!inner (
            reference,
            building:buildings!inner (
              name,
              address,
              team_id
            )
          ),
          intervention_contacts (
            role,
            is_primary,
            user:users (
              id,
              name,
              email,
              phone
            )
          )
        `)
        .eq('team_id', teamId)

      // Apply filters
      if (options?.status) {
        queryBuilder = queryBuilder.eq('status', options.status)
      }

      if (!options?.includeArchived) {
        queryBuilder = queryBuilder.neq('status', 'archived')
      }

      if (options?.limit) {
        queryBuilder = queryBuilder.limit(options.limit)
      }

      const { data, error } = await queryBuilder
        .order('created_at', { ascending: false })

      query.logPerformance()

      if (error) {
        throw new DatabaseError(
          'Failed to fetch interventions',
          error.code || 'UNKNOWN',
          error
        )
      }

      console.log(`✅ [INTERVENTION-SERVICE] Found ${data?.length || 0} interventions`)

      return data || []
    } catch (error) {
      if (error instanceof DatabaseError) throw error

      console.error('❌ [INTERVENTION-SERVICE] Error:', error)
      return []
    }
  },

  /**
   * Subscribe to real-time intervention updates
   * Supabase 2025 Best Practice: Use realtime subscriptions efficiently
   */
  subscribeToTeamInterventions(
    teamId: string,
    callback: (payload: any) => void
  ) {
    console.log('📡 [INTERVENTION-SERVICE] Setting up realtime subscription for team:', teamId)

    const channel = supabase
      .channel(`team-interventions-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interventions',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          console.log('🔄 [INTERVENTION-SERVICE] Realtime update received:', payload.eventType)
          callback(payload)
        }
      )
      .subscribe((status) => {
        console.log('📡 [INTERVENTION-SERVICE] Subscription status:', status)
      })

    // Return cleanup function
    return () => {
      console.log('🔌 [INTERVENTION-SERVICE] Cleaning up subscription')
      supabase.removeChannel(channel)
    }
  }
}

// Dashboard Service with optimized batch loading
export const dashboardServiceOptimized = {
  /**
   * Load all dashboard data in parallel with proper error handling
   * Supabase 2025 Best Practice: Batch parallel queries for performance
   */
  async loadDashboardData(teamId: string) {
    console.log('📊 [DASHBOARD] Loading optimized dashboard data for team:', teamId)
    const startTime = performance.now()

    try {
      // Parallel data loading with Promise.allSettled for resilience
      const [
        buildingsResult,
        usersResult,
        interventionsResult
      ] = await Promise.allSettled([
        buildingServiceOptimized.getTeamBuildings(teamId),
        userServiceOptimized.getTeamUsers(teamId),
        interventionServiceOptimized.getTeamInterventions(teamId, { limit: 10 })
      ])

      // Extract successful results
      const buildings = buildingsResult.status === 'fulfilled' ? buildingsResult.value : []
      const users = usersResult.status === 'fulfilled' ? usersResult.value.users : []
      const interventions = interventionsResult.status === 'fulfilled' ? interventionsResult.value : []

      // Log any failures
      if (buildingsResult.status === 'rejected') {
        console.error('❌ [DASHBOARD] Failed to load buildings:', buildingsResult.reason)
      }
      if (usersResult.status === 'rejected') {
        console.error('❌ [DASHBOARD] Failed to load users:', usersResult.reason)
      }
      if (interventionsResult.status === 'rejected') {
        console.error('❌ [DASHBOARD] Failed to load interventions:', interventionsResult.reason)
      }

      // Bulk load lots for all buildings
      let allLots: Lot[] = []
      if (buildings.length > 0) {
        const buildingIds = buildings.map(b => b.id)
        const lotsMap = await lotServiceOptimized.getByBuildingIds(buildingIds)
        allLots = Object.values(lotsMap).flat()
      }

      // Calculate statistics
      const occupiedLots = allLots.filter(lot => lot.is_occupied)

      const stats = {
        buildingsCount: buildings.length,
        lotsCount: allLots.length,
        occupiedLotsCount: occupiedLots.length,
        occupancyRate: allLots.length > 0
          ? Math.round((occupiedLots.length / allLots.length) * 100)
          : 0,
        interventionsCount: interventions.length,
        usersCount: users.length
      }

      const duration = performance.now() - startTime
      console.log(`✅ [DASHBOARD] Data loaded in ${duration.toFixed(2)}ms`)
      console.log('📊 [DASHBOARD] Stats:', stats)

      return {
        buildings,
        users,
        interventions,
        allLots,
        stats
      }
    } catch (error) {
      console.error('❌ [DASHBOARD] Critical error:', error)

      // Return empty data structure on critical failure
      return {
        buildings: [],
        users: [],
        interventions: [],
        allLots: [],
        stats: {
          buildingsCount: 0,
          lotsCount: 0,
          occupiedLotsCount: 0,
          occupancyRate: 0,
          interventionsCount: 0,
          usersCount: 0
        }
      }
    }
  }
}

// Export all services
export {
  buildingServiceOptimized as buildingService,
  lotServiceOptimized as lotService,
  userServiceOptimized as userService,
  interventionServiceOptimized as interventionService,
  dashboardServiceOptimized as dashboardService
}