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
import { logger } from '@/lib/logger'

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

  constructor(supabase: SupabaseClient<Database>, tableName: string) {
    this.supabase = supabase
    this.tableName = tableName
  }

  /**
   * Get the Supabase client instance
   * Allows services to make custom queries with the correct client context
   */
  public getClient(): SupabaseClient<Database> {
    return this.supabase
  }

  /**
   * Create a new record
   *
   * ✅ FIX: Generate UUID upfront and insert without .select() to avoid RLS issues
   * The implicit SELECT triggered by .select() after INSERT was causing RLS policy
   * violations because auth context wasn't properly established for SECURITY DEFINER functions.
   * By separating INSERT and SELECT operations, we ensure proper auth context for both.
   *
   * @param data - The data to insert
   * @param options - Optional configuration
   * @param options.skipInitialSelect - If true, returns only the ID without fetching complete record
   */
  async create(data: TInsert, options?: { skipInitialSelect?: boolean }): Promise<RepositoryResponse<TRow>> {
    try {
      // Generate an ID upfront to avoid needing .select() after INSERT
      const newId = crypto.randomUUID()
      const dataWithId = { ...data, id: newId } as any

      // Step 1: Pure INSERT without ANY select - no RLS on SELECT triggered
      const { error: insertError } = await this.supabase
        .from(this.tableName as any)
        .insert(dataWithId)

      if (insertError) {
        // ✅ DEBUG: Log raw Supabase error before transformation
        logger.error(`❌ [${this.tableName}:create:insert] RAW Supabase INSERT error:`, {
          code: insertError.code,
          message: insertError.message,
          details: (insertError as any).details,
          hint: (insertError as any).hint,
          dataAttempted: dataWithId
        })
        return createErrorResponse(handleError(insertError, `${this.tableName}:create:insert`))
      }

      // ✅ NEW: If skipInitialSelect, return minimal response with just the ID
      if (options?.skipInitialSelect) {
        logger.info({ table: this.tableName, id: newId }, "✅ INSERT successful, skipping SELECT as requested")
        // Return a partial object with just the ID
        // The caller can fetch the complete object later
        return createSuccessResponse({ id: newId } as unknown as TRow)
      }

      // Step 2: Separate SELECT query with full auth context established
      const { data: result, error: selectError } = await this.supabase
        .from(this.tableName as any)
        .select('*')
        .eq('id', newId)
        .single()

      if (selectError) {
        // ✅ FIX: If SELECT fails due to RLS (PGRST116), return success with ID and input data
        // This ensures the creation is not reported as failed just because the user can't see the result
        if (selectError.code === 'PGRST116') {
          logger.warn(`⚠️ [${this.tableName}:create:select] RLS prevented reading created record. Returning partial data.`, {
            id: newId,
            table: this.tableName
          })
          return createSuccessResponse({ ...dataWithId } as unknown as TRow)
        }
        return createErrorResponse(handleError(selectError, `${this.tableName}:create:select`))
      }

      return createSuccessResponse(result as unknown as TRow)
    } catch (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:create`))
    }
  }

  /**
   * Get record by ID
   * ✅ Next.js 15 Data Cache automatically caches Supabase queries
   */
  async findById(id: string, _useCache = true): Promise<RepositoryResponse<TRow>> {
    const startTime = Date.now()
    console.log(`🔍 [BASE-REPOSITORY] findById called`, {
      table: this.tableName,
      id,
      timestamp: new Date().toISOString()
    })

    try {
      console.log(`📍 [BASE-REPOSITORY] Step 1: Validating UUID...`, { table: this.tableName })
      const validateStart = Date.now()
      validateUUID(id)
      const validateElapsed = Date.now() - validateStart
      console.log(`✅ [BASE-REPOSITORY] UUID validation passed`, {
        table: this.tableName,
        elapsed: `${validateElapsed}ms`
      })

      // ✅ DIAGNOSTIC: Check browser auth context before query
      console.log(`📍 [BASE-REPOSITORY] Step 3: Checking browser auth context...`, { table: this.tableName })

      // Check cookies
      if (typeof document !== 'undefined') {
        const cookieHeader = document.cookie
        const cookies = cookieHeader ? cookieHeader.split(';').map(c => c.trim().split('=')[0]) : []
        const authCookies = cookies.filter(c => c.includes('supabase') || c.includes('auth'))
        console.log(`🍪 [BASE-REPOSITORY] Browser cookies check:`, {
          totalCookies: cookies.length,
          authCookies: authCookies.length,
          authCookieNames: authCookies.slice(0, 3) // First 3 to avoid spam
        })
      }

      // Check localStorage session
      if (typeof localStorage !== 'undefined') {
        const sessionKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth'))
        console.log(`💾 [BASE-REPOSITORY] LocalStorage session check:`, {
          sessionKeys: sessionKeys.length,
          keyNames: sessionKeys.slice(0, 3) // First 3 to avoid spam
        })
      }

      console.log(`📍 [BASE-REPOSITORY] Step 4: Querying Supabase with timeout...`, {
        table: this.tableName,
        id
      })
      const queryStart = Date.now()

      // Create AbortController for explicit timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn(`⏰ [BASE-REPOSITORY] Query timeout triggered after 5s`, { table: this.tableName })
        controller.abort()
      }, 5000) // 5s timeout

      try {
        const { data, error } = await this.supabase
          .from(this.tableName as keyof Database['public']['Tables'])
          .select('*')
          .eq('id', id)
          .abortSignal(controller.signal)
          .single()

        clearTimeout(timeoutId)

        const queryElapsed = Date.now() - queryStart
        console.log(`⏱️ [BASE-REPOSITORY] Supabase query completed`, {
          table: this.tableName,
          hasData: !!data,
          hasError: !!error,
          errorCode: error?.code,
          elapsed: `${queryElapsed}ms`
        })

        if (error) {
          console.error(`❌ [BASE-REPOSITORY] Query error`, {
            table: this.tableName,
            errorCode: error.code,
            errorMessage: error.message,
            totalElapsed: `${Date.now() - startTime}ms`
          })

          if (error.code === 'PGRST116') {
            throw new NotFoundException(this.tableName, id)
          }
          return createErrorResponse(handleError(error, `${this.tableName}:findById`))
        }

        const totalElapsed = Date.now() - startTime
        console.log(`✅ [BASE-REPOSITORY] findById completed successfully`, {
          table: this.tableName,
          totalElapsed: `${totalElapsed}ms`
        })

        return createSuccessResponse(data as TRow)
      } catch (abortError: any) {
        clearTimeout(timeoutId)

        if (abortError.name === 'AbortError') {
          const totalElapsed = Date.now() - startTime
          console.error(`🚫 [BASE-REPOSITORY] Query aborted (5s timeout)`, {
            table: this.tableName,
            totalElapsed: `${totalElapsed}ms`
          })
          return createErrorResponse({
            code: 'TIMEOUT',
            message: `Query timeout after 5s for ${this.tableName}`
          })
        }
        throw abortError
      }
    } catch (error) {
      const totalElapsed = Date.now() - startTime
      console.error(`💥 [BASE-REPOSITORY] Exception in findById`, {
        table: this.tableName,
        error: error instanceof Error ? error.message : String(error),
        totalElapsed: `${totalElapsed}ms`
      })
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
