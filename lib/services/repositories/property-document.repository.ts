/**
 * PropertyDocument Repository - Phase 2
 * Handles all database operations for property documents using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PropertyDocument,
  PropertyDocumentInsert,
  PropertyDocumentUpdate,
  PropertyDocumentType,
  DocumentVisibilityLevel
} from '../core/service-types'
import { NotFoundException, handleError, createErrorResponse } from '../core/error-handler'
import { validateRequired, validateLength, validateNumber } from '../core/service-types'
import { logger } from '@/lib/logger'

/**
 * PropertyDocument Repository
 * Manages all database operations for property documents with visibility controls
 */
export class PropertyDocumentRepository extends BaseRepository<
  PropertyDocument,
  PropertyDocumentInsert,
  PropertyDocumentUpdate
> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'property_documents')
  }

  /**
   * Validation hook for property document data
   */
  protected async validate(data: PropertyDocumentInsert | PropertyDocumentUpdate): Promise<void> {
    if ('filename' in data && data.filename) {
      validateLength(data.filename, 1, 255, 'filename')
    }

    if ('original_filename' in data && data.original_filename) {
      validateLength(data.original_filename, 1, 255, 'original_filename')
    }

    if ('title' in data && data.title) {
      validateLength(data.title, 1, 200, 'title')
    }

    if ('storage_path' in data && data.storage_path) {
      validateLength(data.storage_path, 1, 500, 'storage_path')
    }

    if ('file_size' in data && data.file_size !== undefined) {
      validateNumber(data.file_size, 1, 500000000, 'file_size') // Max 500MB
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, [
        'team_id',
        'document_type',
        'filename',
        'original_filename',
        'file_size',
        'mime_type',
        'storage_path',
        'uploaded_by'
      ])

      // Validate that either building_id OR lot_id is provided (not both, not neither)
      if (!data.building_id && !data.lot_id) {
        throw new Error('Either building_id or lot_id must be provided')
      }
      if (data.building_id && data.lot_id) {
        throw new Error('Cannot provide both building_id and lot_id')
      }
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(
    data: PropertyDocumentInsert | PropertyDocumentUpdate
  ): data is PropertyDocumentInsert {
    return 'filename' in data && 'storage_path' in data && 'uploaded_by' in data
  }

  /**
   * Get all documents with relations (respects RLS)
   */
  async findAllWithRelations(options?: { page?: number; limit?: number }) {
    const query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name),
        building:building_id(id, name, address_record:address_id(*)),
        lot:lot_id(id, reference, building:building_id(name)),
        uploaded_by_user:uploaded_by(id, name, email)
      `)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })

    // Apply pagination if provided
    if (options?.page && options?.limit) {
      const offset = (options.page - 1) * options.limit
      query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('❌ [PROPERTY-DOC-REPO] findAllWithRelations error:', error)
      return createErrorResponse(handleError(error, `${this.tableName}:findAllWithRelations`))
    }

    // Handle pagination response
    if (options?.page && options?.limit) {
      const totalPages = count ? Math.ceil(count / options.limit) : 1
      return {
        success: true as const,
        data: data || [],
        pagination: {
          total: count || 0,
          page: options.page,
          limit: options.limit,
          totalPages
        }
      }
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get documents by team
   */
  async findByTeam(teamId: string, options?: { includeArchived?: boolean }) {
    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(id, name, address_record:address_id(*)),
        lot:lot_id(id, reference),
        uploaded_by_user:uploaded_by(id, name, email)
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (!options?.includeArchived) {
      query = query.is('is_archived', false)
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findByTeam`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get documents by building
   */
  async findByBuilding(buildingId: string, options?: { includeArchived?: boolean }) {
    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name),
        uploaded_by_user:uploaded_by(id, name, email)
      `)
      .eq('building_id', buildingId)
      .is('deleted_at', null)

    if (!options?.includeArchived) {
      query = query.is('is_archived', false)
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findByBuilding`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get documents by lot
   */
  async findByLot(lotId: string, options?: { includeArchived?: boolean }) {
    let query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name),
        lot:lot_id(id, reference, building:building_id(name)),
        uploaded_by_user:uploaded_by(id, name, email)
      `)
      .eq('lot_id', lotId)
      .is('deleted_at', null)

    if (!options?.includeArchived) {
      query = query.is('is_archived', false)
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findByLot`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get document by ID with full relations
   */
  async findByIdWithRelations(id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name),
        building:building_id(id, name, address_record:address_id(*)),
        lot:lot_id(id, reference, building:building_id(name)),
        uploaded_by_user:uploaded_by(id, name, email)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(this.tableName, id)
      }
      return createErrorResponse(handleError(error, `${this.tableName}:findByIdWithRelations`))
    }

    return { success: true as const, data }
  }

  /**
   * Find documents by type
   */
  async findByType(
    documentType: PropertyDocumentType,
    options?: { teamId?: string; buildingId?: string; lotId?: string }
  ) {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('document_type', documentType)
      .is('deleted_at', null)

    if (options?.teamId) {
      query = query.eq('team_id', options.teamId)
    }

    if (options?.buildingId) {
      query = query.eq('building_id', options.buildingId)
    }

    if (options?.lotId) {
      query = query.eq('lot_id', options.lotId)
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findByType`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Find documents by visibility level
   */
  async findByVisibility(
    visibilityLevel: DocumentVisibilityLevel,
    teamId: string
  ) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .eq('visibility_level', visibilityLevel)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findByVisibility`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Search documents by filename or title
   */
  async search(query: string, options?: { teamId?: string; buildingId?: string; lotId?: string }) {
    validateLength(query, 1, 100, 'search query')

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name),
        lot:lot_id(reference),
        uploaded_by_user:uploaded_by(name)
      `)
      .is('deleted_at', null)
      .or(`filename.ilike.%${query}%,title.ilike.%${query}%,description.ilike.%${query}%`)

    if (options?.teamId) {
      queryBuilder = queryBuilder.eq('team_id', options.teamId)
    }

    if (options?.buildingId) {
      queryBuilder = queryBuilder.eq('building_id', options.buildingId)
    }

    if (options?.lotId) {
      queryBuilder = queryBuilder.eq('lot_id', options.lotId)
    }

    const { data, error } = await queryBuilder.order('uploaded_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:search`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Find documents expiring soon
   */
  async findExpiringSoon(teamId: string, daysThreshold = 30) {
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .not('expiry_date', 'is', null)
      .lte('expiry_date', thresholdDate.toISOString())
      .gte('expiry_date', new Date().toISOString())
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findExpiringSoon`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Find expired documents
   */
  async findExpired(teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .not('expiry_date', 'is', null)
      .lt('expiry_date', new Date().toISOString())
      .is('deleted_at', null)
      .order('expiry_date', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findExpired`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Archive document (soft operation)
   */
  async archive(documentId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:archive`))
    }

    return { success: true as const, data }
  }

  /**
   * Unarchive document
   */
  async unarchive(documentId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        is_archived: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:unarchive`))
    }

    return { success: true as const, data }
  }

  /**
   * Update visibility level
   */
  async updateVisibility(documentId: string, visibilityLevel: DocumentVisibilityLevel) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        visibility_level: visibilityLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:updateVisibility`))
    }

    return { success: true as const, data }
  }

  /**
   * Get document count by type for a team
   */
  async getCountByType(teamId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('document_type')
        .eq('team_id', teamId)
        .is('deleted_at', null)

      if (error) {
        logger.error('❌ [PROPERTY-DOC-REPO] getCountByType error:', error)
        return { success: false as const, error: handleError(error, 'property_document:getCountByType') }
      }

      // Count by type
      const counts = data?.reduce((acc, doc) => {
        acc[doc.document_type] = (acc[doc.document_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      logger.info('✅ [PROPERTY-DOC-REPO] Document counts by type:', counts)
      return { success: true as const, data: counts }
    } catch (error) {
      logger.error('❌ [PROPERTY-DOC-REPO] getCountByType exception:', error)
      return {
        success: false as const,
        error: handleError(error as Error, 'property_document:getCountByType')
      }
    }
  }

  /**
   * Bulk update documents' team
   */
  async updateTeamBulk(documentIds: string[], teamId: string) {
    if (!documentIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        team_id: teamId,
        updated_at: new Date().toISOString()
      })
      .in('id', documentIds)
      .select()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:updateTeamBulk`))
    }

    return { success: true as const, data: data || [] }
  }
}

// Factory functions for creating repository instances
export const createPropertyDocumentRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new PropertyDocumentRepository(supabase)
}

export const createServerPropertyDocumentRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new PropertyDocumentRepository(supabase)
}

/**
 * Create PropertyDocument Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionPropertyDocumentRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new PropertyDocumentRepository(supabase)
}
