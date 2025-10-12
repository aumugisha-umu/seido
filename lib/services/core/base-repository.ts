import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  RepositoryResponse,
  RepositoryListResponse,
  PaginatedResponse,
  QueryOptions,
  FilterOptions,
  PaginationOptions
} from './service-types'
import {
  handleError,
  createSuccessResponse,
  createErrorResponse,
  validateUUID,
  NotFoundException
} from './error-handler'

/**
 * Base repository class providing common CRUD operations
 * with type safety and error handling
 */
export abstract class BaseRepository<
  TRow extends Record<string, unknown> = Record<string, unknown>,
  TInsert extends Record<string, unknown> = Record<string, unknown>,
  TUpdate extends Record<string, unknown> = Record<string, unknown>
> {
  protected readonly supabase: SupabaseClient<Database>
  protected readonly tableName: string
  protected readonly cache = new Map<string, { data: unknown; timestamp: number }>()
  protected readonly defaultCacheTTL = 30 // 30 seconds (réduit pour éviter état partagé entre tests)

  constructor(supabase: SupabaseClient<Database>, tableName: string) {
    this.supabase = supabase
    this.tableName = tableName
  }

  /**
   * Create a new record
   * 
   * ✅ FIX: Generate UUID upfront and insert without .select() to avoid RLS issues
   * The implicit SELECT triggered by .select() after INSERT was causing RLS policy
   * violations because auth context wasn't properly established for SECURITY DEFINER functions.
   * By separating INSERT and SELECT operations, we ensure proper auth context for both.
   */
  async create(data: TInsert): Promise<RepositoryResponse<TRow>> {
    try {
      // Generate an ID upfront to avoid needing .select() after INSERT
      const newId = crypto.randomUUID()
      const dataWithId = { ...data, id: newId } as any

      // Step 1: Pure INSERT without ANY select - no RLS on SELECT triggered
      const { error: insertError } = await this.supabase
        .from(this.tableName as any)
        .insert(dataWithId)

      if (insertError) {
        return createErrorResponse(handleError(insertError, `${this.tableName}:create:insert`))
      }

      // Step 2: Separate SELECT query with full auth context established
      const { data: result, error: selectError } = await this.supabase
        .from(this.tableName as any)
        .select('*')
        .eq('id', newId)
        .single()

      if (selectError) {
        return createErrorResponse(handleError(selectError, `${this.tableName}:create:select`))
      }

      // Clear cache for this table
      this.clearTableCache()

      return createSuccessResponse(result as unknown as TRow)
    } catch (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:create`))
    }
  }

  /**
   * Get record by ID
   */
  async findById(id: string, useCache = true): Promise<RepositoryResponse<TRow>> {
    try {
      validateUUID(id)

      // Check cache first
      if (useCache) {
        const cached = this.getFromCache(`${this.tableName}:${id}`)
        if (cached) {
          return createSuccessResponse(cached as TRow)
        }
      }

      const { data, error } = await this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException(this.tableName, id)
        }
        return createErrorResponse(handleError(error, `${this.tableName}:findById`))
      }

      // Cache the result
      if (useCache && data) {
        this.setCache(`${this.tableName}:${id}`, data)
      }

      return createSuccessResponse(data as TRow)
    } catch (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findById`))
    }
  }

  /**
   * Get all records with optional filtering and pagination
   */
  async findAll(
    options: QueryOptions = {},
    filters: FilterOptions = {}
  ): Promise<RepositoryListResponse<TRow>> {
    try {
      let query = this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .select('*')

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as unknown)
        }
      })

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.orderDirection !== 'desc'
        })
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit)
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        return createErrorResponse(handleError(error, `${this.tableName}:findAll`))
      }

      return {
        data: (data || []) as TRow[],
        error: null,
        success: true,
        count: data?.length || 0
      }
    } catch (error) {
      console.error(`💥 [BaseRepository] Exception in findAll on table ${this.tableName}:`, error)
      console.error(`💥 [BaseRepository] Error type:`, typeof error)
      console.error(`💥 [BaseRepository] Error stringified:`, JSON.stringify(error, null, 2))
      return {
        data: [],
        error: handleError(error, `${this.tableName}:findAll`),
        success: false,
        count: 0
      }
    }
  }

  /**
   * Get paginated records
   */
  async findPaginated(
    pagination: PaginationOptions,
    filters: FilterOptions = {},
    orderBy?: string,
    orderDirection: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedResponse<TRow>> {
    try {
      const { page, pageSize } = pagination
      const offset = (page - 1) * pageSize

      // Get total count
      let countQuery = this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .select('*', { count: 'exact', head: true })

      // Apply filters to count query
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          countQuery = countQuery.eq(key, value as unknown)
        }
      })

      const { count, error: countError } = await countQuery

      if (countError) {
        return {
          data: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          error: handleError(countError, `${this.tableName}:findPaginated:count`),
          success: false
        }
      }

      const total = count || 0
      const totalPages = Math.ceil(total / pageSize)

      // Get data
      let dataQuery = this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .select('*')

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          dataQuery = dataQuery.eq(key, value as unknown)
        }
      })

      // Apply ordering and pagination
      if (orderBy) {
        dataQuery = dataQuery.order(orderBy, { ascending: orderDirection === 'asc' })
      }

      dataQuery = dataQuery.range(offset, offset + pageSize - 1)

      const { data, error: dataError } = await dataQuery

      if (dataError) {
        return {
          data: [],
          pagination: {
            page,
            pageSize,
            total,
            totalPages,
            hasNext: false,
            hasPrev: false
          },
          error: handleError(dataError, `${this.tableName}:findPaginated:data`),
          success: false
        }
      }

      return {
        data: (data || []) as TRow[],
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: [],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        error: handleError(error, `${this.tableName}:findPaginated`),
        success: false
      }
    }
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: TUpdate): Promise<RepositoryResponse<TRow>> {
    try {
      validateUUID(id)

      // First check if record exists
      const existsResult = await this.findById(id, false)
      if (!existsResult.success) {
        return existsResult
      }

      const { data: result, error } = await this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, `${this.tableName}:update`))
      }

      // Clear cache
      this.clearCache(`${this.tableName}:${id}`)
      this.clearTableCache()

      return createSuccessResponse(result as unknown as TRow)
    } catch (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:update`))
    }
  }

  /**
   * Delete record by ID
   */
  async delete(_id: string): Promise<RepositoryResponse<boolean>> {
    try {
      validateUUID(_id)

      // First check if record exists
      const existsResult = await this.findById(_id, false)
      if (!existsResult.success) {
        return createErrorResponse(existsResult.error!)
      }

      const { error } = await this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .delete()
        .eq('id', _id)

      if (error) {
        return createErrorResponse(handleError(error, `${this.tableName}:delete`))
      }

      // Clear cache
      this.clearCache(`${this.tableName}:${_id}`)
      this.clearTableCache()

      return createSuccessResponse(true)
    } catch (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:delete`))
    }
  }

  /**
   * Check if record exists by ID
   */
  async exists(_id: string): Promise<RepositoryResponse<boolean>> {
    try {
      validateUUID(_id)

      const { data, error } = await this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .select('id')
        .eq('id', _id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createSuccessResponse(false)
        }
        return createErrorResponse(handleError(error, `${this.tableName}:exists`))
      }

      return createSuccessResponse(!!data)
    } catch (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:exists`))
    }
  }

  /**
   * Count records with optional filters
   */
  async count(filters: FilterOptions = {}): Promise<RepositoryResponse<number>> {
    try {
      let query = this.supabase
        .from(this.tableName as keyof Database['public']['Tables'])
        .select('*', { count: 'exact', head: true })

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value as unknown)
        }
      })

      const { count, error } = await query

      if (error) {
        return createErrorResponse(handleError(error, `${this.tableName}:count`))
      }

      return createSuccessResponse(count || 0)
    } catch (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:count`))
    }
  }

  /**
   * Cache management
   */
  protected setCache(key: string, data: unknown, ttl = this.defaultCacheTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl * 1000
    })
  }

  protected getFromCache(_key: string): unknown | null {
    const entry = this.cache.get(_key)
    if (!entry) return null

    if (Date.now() > entry.timestamp) {
      this.cache.delete(_key)
      return null
    }

    return entry.data
  }

  protected clearCache(_key: string): void {
    this.cache.delete(_key)
  }

  protected clearTableCache(): void {
    const tablePrefix = `${this.tableName}:`
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      if (key.startsWith(tablePrefix)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  protected clearAllCache(): void {
    this.cache.clear()
  }

  /**
   * Abstract method for custom validation
   * Override in concrete repositories
   */
  protected abstract validate(data: TInsert | TUpdate): Promise<void>

  /**
   * Hook called before create operations
   * Override in concrete repositories for custom logic
   */
  protected async beforeCreate(data: TInsert): Promise<TInsert> {
    await this.validate(data)
    return data
  }

  /**
   * Hook called before update operations
   * Override in concrete repositories for custom logic
   */
  protected async beforeUpdate(id: string, data: TUpdate): Promise<TUpdate> {
    await this.validate(data)
    return data
  }

  /**
   * Hook called after successful operations
   * Override in concrete repositories for custom logic
   */
  protected async afterCreate(): Promise<void> {
    // Override in concrete repositories
  }

  protected async afterUpdate(): Promise<void> {
    // Override in concrete repositories
  }

  protected async afterDelete(): Promise<void> {
    // Override in concrete repositories
  }
}
