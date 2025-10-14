/**
 * Intervention Repository - Phase 3
 * Handles all database operations for interventions using Repository Pattern
 * Supports Phase 3 schema with proper TypeScript types and RLS optimization
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  NotFoundException,
  ValidationException,
  handleError,
  createErrorResponse,
  createSuccessResponse,
  validateRequired,
  validateUUID
} from '../core/error-handler'
import { validateLength } from '../core/service-types'

// Type aliases from database
type Intervention = Database['public']['Tables']['interventions']['Row']
type InterventionInsert = Database['public']['Tables']['interventions']['Insert']
type InterventionUpdate = Database['public']['Tables']['interventions']['Update']
type InterventionStatus = Database['public']['Enums']['intervention_status']
type InterventionUrgency = Database['public']['Enums']['intervention_urgency']
type InterventionType = Database['public']['Enums']['intervention_type']

// Extended types with relations
interface InterventionWithRelations extends Intervention {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
  intervention_assignments?: Array<{
    id: string
    user_id: string
    role: 'gestionnaire' | 'prestataire' | 'superviseur'
    is_lead: boolean
    user?: Database['public']['Tables']['users']['Row']
  }>
  conversation_threads?: Array<{
    id: string
    thread_type: Database['public']['Enums']['conversation_thread_type']
    message_count: number | null
    last_message_at: string | null
  }>
  intervention_quotes?: Array<{
    id: string
    status: string
    amount: number
    provider?: Database['public']['Tables']['users']['Row']
  }>
}

// Filter interface
interface InterventionFilters {
  status?: InterventionStatus
  urgency?: InterventionUrgency
  type?: InterventionType
  building_id?: string
  lot_id?: string
  tenant_id?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
}

// Dashboard stats interface
interface DashboardStats {
  total: number
  by_status: Record<InterventionStatus, number>
  by_urgency: Record<InterventionUrgency, number>
  by_type: Partial<Record<InterventionType, number>>
  average_resolution_time: number | null
  pending_quotes: number
  overdue: number
}

/**
 * Intervention Repository
 * Manages all database operations for interventions with Phase 3 schema support
 */
export class InterventionRepository extends BaseRepository<Intervention, InterventionInsert, InterventionUpdate> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase as any, 'interventions')
  }

  /**
   * Validation hook for intervention data
   */
  protected async validate(data: InterventionInsert | InterventionUpdate): Promise<void> {
    if ('title' in data && data.title !== undefined) {
      validateLength(data.title, 3, 200, 'title')
    }

    if ('description' in data && data.description !== undefined) {
      validateLength(data.description, 10, 5000, 'description')
    }

    if ('reference' in data && data.reference !== undefined) {
      validateLength(data.reference, 1, 50, 'reference')
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['title', 'description', 'team_id'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: InterventionInsert | InterventionUpdate): data is InterventionInsert {
    return 'title' in data && 'description' in data && 'team_id' in data
  }

  /**
   * Find intervention by ID with all relations
   */
  async findById(id: string): Promise<{ success: boolean; data?: Intervention; error?: any }> {
    try {
      validateUUID(id)
      return await super.findById(id)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:findById'))
    }
  }

  /**
   * Find interventions by team with filters
   */
  async findByTeam(teamId: string, filters?: InterventionFilters) {
    const cacheKey = this.getTeamCacheKey(teamId, JSON.stringify(filters || {}))

    return await this.getCachedOrFetch(
      cacheKey,
      async () => {
        let query = this.supabase
          .from('interventions')
          .select(`
            *,
            building:building_id(id, name, address),
            lot:lot_id(id, reference),
            tenant:tenant_id(id, name, email)
          `)
          .eq('team_id', teamId)
          .is('deleted_at', null)

        // Apply filters
        if (filters?.status) {
          query = query.eq('status', filters.status)
        }
        if (filters?.urgency) {
          query = query.eq('urgency', filters.urgency)
        }
        if (filters?.type) {
          query = query.eq('type', filters.type)
        }
        if (filters?.building_id) {
          query = query.eq('building_id', filters.building_id)
        }
        if (filters?.lot_id) {
          query = query.eq('lot_id', filters.lot_id)
        }
        if (filters?.tenant_id) {
          query = query.eq('tenant_id', filters.tenant_id)
        }
        if (filters?.date_from) {
          query = query.gte('created_at', filters.date_from)
        }
        if (filters?.date_to) {
          query = query.lte('created_at', filters.date_to)
        }

        // Apply ordering - most urgent/recent first
        query = query.order('urgency', { ascending: false })
          .order('created_at', { ascending: false })

        const { data, error } = await query

        if (error) {
          return createErrorResponse(handleError(error, 'interventions:findByTeam'))
        }

        return createSuccessResponse(data || [])
      },
      300 // 5 minutes cache
    )
  }

  /**
   * Find interventions by tenant
   */
  async findByTenant(tenantId: string) {
    validateUUID(tenantId)

    const { data, error } = await this.supabase
      .from('interventions')
      .select(`
        *,
        building:building_id(id, name, address),
        lot:lot_id(id, reference),
        intervention_assignments!inner(
          user_id,
          role,
          is_lead,
          user:user_id(id, name, email)
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'interventions:findByTenant'))
    }

    return createSuccessResponse(data || [])
  }

  /**
   * Find interventions by status for a team
   */
  async findByStatus(status: InterventionStatus, teamId: string) {
    validateUUID(teamId)

    const { data, error } = await this.supabase
      .from('interventions')
      .select(`
        *,
        building:building_id(id, name, address),
        lot:lot_id(id, reference),
        tenant:tenant_id(id, name, email)
      `)
      .eq('team_id', teamId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('urgency', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'interventions:findByStatus'))
    }

    return createSuccessResponse(data || [])
  }

  /**
   * Create new intervention with proper defaults
   */
  async create(data: InterventionInsert) {
    try {
      // Generate reference if not provided
      if (!data.reference) {
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = Math.random().toString(36).substring(2, 5).toUpperCase()
        data.reference = `INT-${timestamp}-${random}`
      }

      // Set defaults
      data.status = data.status || 'demande'
      data.urgency = data.urgency || 'normale'

      return await super.create(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:create'))
    }
  }

  /**
   * Update intervention
   */
  async update(id: string, data: InterventionUpdate) {
    try {
      validateUUID(id)

      // Invalidate team cache on update
      const intervention = await this.findById(id)
      if (intervention.success && intervention.data) {
        await this.invalidateTeamCache(intervention.data.team_id)
      }

      return await super.update(id, data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:update'))
    }
  }

  /**
   * Soft delete intervention
   */
  async softDelete(id: string, deletedBy: string) {
    try {
      validateUUID(id)
      validateUUID(deletedBy)

      const { data, error } = await this.supabase
        .from('interventions')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:softDelete'))
      }

      // Invalidate caches
      await this.invalidateTeamCache(data.team_id)

      return createSuccessResponse(true)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:softDelete'))
    }
  }

  /**
   * Find intervention with all assignments and relations
   */
  async findWithAssignments(id: string): Promise<{ success: boolean; data?: InterventionWithRelations; error?: any }> {
    try {
      validateUUID(id)

      const { data, error } = await this.supabase
        .from('interventions')
        .select(`
          *,
          building:building_id(*),
          lot:lot_id(*),
          tenant:tenant_id(id, name, email, phone),
          intervention_assignments(
            id,
            user_id,
            role,
            is_lead,
            assigned_at,
            user:user_id(id, name, email, phone, provider_category)
          ),
          conversation_threads(
            id,
            thread_type,
            title,
            message_count,
            last_message_at
          ),
          intervention_quotes(
            id,
            status,
            amount,
            currency,
            quote_type,
            provider:provider_id(id, name, email)
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('Intervention', id)
        }
        return createErrorResponse(handleError(error, 'interventions:findWithAssignments'))
      }

      return createSuccessResponse(data as InterventionWithRelations)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:findWithAssignments'))
    }
  }

  /**
   * Get dashboard statistics for a team
   */
  async findDashboardStats(teamId: string): Promise<{ success: boolean; data?: DashboardStats; error?: any }> {
    try {
      validateUUID(teamId)

      const { data: interventions, error } = await this.supabase
        .from('interventions')
        .select('status, urgency, type, created_at, completed_date')
        .eq('team_id', teamId)
        .is('deleted_at', null)

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:findDashboardStats'))
      }

      // Calculate statistics
      const stats: DashboardStats = {
        total: interventions?.length || 0,
        by_status: {} as Record<InterventionStatus, number>,
        by_urgency: {} as Record<InterventionUrgency, number>,
        by_type: {},
        average_resolution_time: null,
        pending_quotes: 0,
        overdue: 0
      }

      // Initialize status and urgency counters
      const statuses: InterventionStatus[] = ['demande', 'rejetee', 'approuvee', 'demande_de_devis', 'planification', 'planifiee', 'en_cours', 'cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee']
      const urgencies: InterventionUrgency[] = ['basse', 'normale', 'haute', 'urgente']

      statuses.forEach(s => stats.by_status[s] = 0)
      urgencies.forEach(u => stats.by_urgency[u] = 0)

      // Calculate stats
      let totalResolutionTime = 0
      let resolvedCount = 0

      interventions?.forEach(intervention => {
        // Count by status
        if (intervention.status) {
          stats.by_status[intervention.status]++
        }

        // Count by urgency
        if (intervention.urgency) {
          stats.by_urgency[intervention.urgency]++
        }

        // Count by type
        if (intervention.type) {
          stats.by_type[intervention.type] = (stats.by_type[intervention.type] || 0) + 1
        }

        // Calculate resolution time for completed interventions
        if (intervention.completed_date && intervention.created_at) {
          const created = new Date(intervention.created_at).getTime()
          const completed = new Date(intervention.completed_date).getTime()
          totalResolutionTime += completed - created
          resolvedCount++
        }

        // Check for pending quotes
        if (intervention.status === 'demande_de_devis') {
          stats.pending_quotes++
        }

        // Check for overdue (urgent interventions older than 24h)
        if (intervention.urgency === 'urgente' && intervention.status !== 'cloturee_par_gestionnaire' && intervention.status !== 'annulee') {
          const created = new Date(intervention.created_at).getTime()
          const now = Date.now()
          if (now - created > 24 * 60 * 60 * 1000) {
            stats.overdue++
          }
        }
      })

      // Calculate average resolution time in days
      if (resolvedCount > 0) {
        stats.average_resolution_time = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60 * 24))
      }

      return createSuccessResponse(stats)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:findDashboardStats'))
    }
  }

  /**
   * Find upcoming interventions for a team
   */
  async findUpcoming(teamId: string, limit: number = 10) {
    try {
      validateUUID(teamId)

      const { data, error } = await this.supabase
        .from('interventions')
        .select(`
          *,
          building:building_id(id, name),
          lot:lot_id(id, reference),
          tenant:tenant_id(id, name)
        `)
        .eq('team_id', teamId)
        .in('status', ['planifiee', 'en_cours'])
        .is('deleted_at', null)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(limit)

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:findUpcoming'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:findUpcoming'))
    }
  }

  /**
   * Find interventions by urgency
   */
  async findByUrgency(urgency: InterventionUrgency, teamId: string) {
    try {
      validateUUID(teamId)

      const { data, error } = await this.supabase
        .from('interventions')
        .select(`
          *,
          building:building_id(id, name, address),
          lot:lot_id(id, reference),
          tenant:tenant_id(id, name, email)
        `)
        .eq('team_id', teamId)
        .eq('urgency', urgency)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:findByUrgency'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:findByUrgency'))
    }
  }

  /**
   * Search interventions by query
   */
  async search(query: string, teamId: string) {
    try {
      validateUUID(teamId)
      validateLength(query, 2, 100, 'search query')

      const { data, error } = await this.supabase
        .from('interventions')
        .select(`
          *,
          building:building_id(id, name),
          lot:lot_id(id, reference),
          tenant:tenant_id(id, name)
        `)
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,reference.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:search'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:search'))
    }
  }
}

// Factory functions for creating repository instances
export const createInterventionRepository = (client?: SupabaseClient<Database>) => {
  const supabase = client || createBrowserSupabaseClient()
  return new InterventionRepository(supabase as SupabaseClient<Database>)
}

export const createServerInterventionRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new InterventionRepository(supabase as SupabaseClient<Database>)
}

export const createServerActionInterventionRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new InterventionRepository(supabase as SupabaseClient<Database>)
}