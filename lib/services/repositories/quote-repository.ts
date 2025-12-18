/**
 * Quote Repository - Phase 3
 * Handles all database operations for intervention quotes
 * Supports estimation and final quote workflows
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
import { validateNumber } from '../core/service-types'

// Type aliases from database
type InterventionQuote = Database['public']['Tables']['intervention_quotes']['Row']
type InterventionQuoteInsert = Database['public']['Tables']['intervention_quotes']['Insert']
type InterventionQuoteUpdate = Database['public']['Tables']['intervention_quotes']['Update']

// Extended types (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _QuoteWithRelations extends InterventionQuote {
  intervention?: Database['public']['Tables']['interventions']['Row']
  provider?: Database['public']['Tables']['users']['Row']
  created_by_user?: Database['public']['Tables']['users']['Row']
  validated_by_user?: Database['public']['Tables']['users']['Row']
}

// Quote line item structure
interface QuoteLineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
  unit?: string
}

// Input types
interface QuoteCreateInput extends Omit<InterventionQuoteInsert, 'line_items'> {
  line_items?: QuoteLineItem[]
}

interface QuoteUpdateInput extends Omit<InterventionQuoteUpdate, 'line_items'> {
  line_items?: QuoteLineItem[]
}

// Quote status type (stored as string in DB but we enforce these values)
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
type QuoteType = 'estimation' | 'final'

/**
 * Quote Repository
 * Manages all database operations for intervention quotes
 */
export class QuoteRepository extends BaseRepository<InterventionQuote, InterventionQuoteInsert, InterventionQuoteUpdate> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase as any, 'intervention_quotes')
  }

  /**
   * Validation hook for quote data
   */
  protected async validate(data: InterventionQuoteInsert | InterventionQuoteUpdate): Promise<void> {
    if ('amount' in data && data.amount !== undefined) {
      validateNumber(data.amount, 0, 1000000, 'amount')
    }

    if ('description' in data && data.description !== undefined && data.description !== null) {
      if (data.description.length > 5000) {
        throw new ValidationException('Description must be less than 5000 characters', 'intervention_quotes', 'description')
      }
    }

    if ('status' in data && data.status !== undefined) {
      const validStatuses: QuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired']
      if (!validStatuses.includes(data.status as QuoteStatus)) {
        throw new ValidationException(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          'intervention_quotes',
          'status'
        )
      }
    }

    if ('quote_type' in data && data.quote_type !== undefined) {
      const validTypes: QuoteType[] = ['estimation', 'final']
      if (!validTypes.includes(data.quote_type as QuoteType)) {
        throw new ValidationException(
          `Invalid quote type. Must be one of: ${validTypes.join(', ')}`,
          'intervention_quotes',
          'quote_type'
        )
      }
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['intervention_id', 'provider_id', 'amount', 'team_id', 'created_by'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: InterventionQuoteInsert | InterventionQuoteUpdate): data is InterventionQuoteInsert {
    return 'intervention_id' in data && 'provider_id' in data && 'amount' in data
  }

  /**
   * Find quote by ID with relations
   */
  async findById(id: string): Promise<{ success: boolean; data?: InterventionQuote; error?: any }> {
    try {
      validateUUID(id)
      return await super.findById(id)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:findById'))
    }
  }

  /**
   * Find quotes by intervention
   */
  async findByIntervention(interventionId: string) {
    try {
      validateUUID(interventionId)

      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .select(`
          *,
          provider:provider_id(id, name, email, phone, provider_category),
          created_by_user:created_by(id, name),
          validated_by_user:validated_by(id, name)
        `)
        .eq('intervention_id', interventionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:findByIntervention'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:findByIntervention'))
    }
  }

  /**
   * Find quotes by provider
   */
  async findByProvider(providerId: string) {
    try {
      validateUUID(providerId)

      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .select(`
          *,
          intervention:intervention_id(
            id,
            reference,
            title,
            status,
            urgency,
            building:building_id(id, name),
            lot:lot_id(id, reference)
          )
        `)
        .eq('provider_id', providerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:findByProvider'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:findByProvider'))
    }
  }

  /**
   * Find pending quotes by team
   */
  async findPendingByTeam(teamId: string) {
    try {
      validateUUID(teamId)

      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .select(`
          *,
          intervention:intervention_id(
            id,
            reference,
            title,
            building:building_id(id, name),
            lot:lot_id(id, reference)
          ),
          provider:provider_id(id, name, email, provider_category)
        `)
        .eq('team_id', teamId)
        .eq('status', 'sent')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:findPendingByTeam'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:findPendingByTeam'))
    }
  }

  /**
   * Create new quote with line items
   */
  async create(data: QuoteCreateInput) {
    try {
      // Calculate total from line items if provided
      if (data.line_items && Array.isArray(data.line_items)) {
        const calculatedTotal = data.line_items.reduce((sum, item) => sum + item.total, 0)
        if (Math.abs(calculatedTotal - data.amount) > 0.01) {
          throw new ValidationException(
            `Quote amount (${data.amount}) does not match line items total (${calculatedTotal})`,
            'intervention_quotes',
            'amount'
          )
        }
      }

      // Set defaults
      const insertData: InterventionQuoteInsert = {
        ...data,
        status: data.status || 'draft',
        quote_type: data.quote_type || 'estimation',
        currency: data.currency || 'EUR',
        line_items: data.line_items ? JSON.stringify(data.line_items) : null
      }

      return await super.create(insertData)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:create'))
    }
  }

  /**
   * Update quote
   */
  async update(id: string, data: QuoteUpdateInput) {
    try {
      validateUUID(id)

      // Calculate total from line items if provided
      if (data.line_items && Array.isArray(data.line_items)) {
        const calculatedTotal = data.line_items.reduce((sum, item) => sum + item.total, 0)
        if (data.amount !== undefined && Math.abs(calculatedTotal - data.amount) > 0.01) {
          throw new ValidationException(
            `Quote amount (${data.amount}) does not match line items total (${calculatedTotal})`,
            'intervention_quotes',
            'amount'
          )
        }
      }

      const updateData: InterventionQuoteUpdate = {
        ...data,
        line_items: data.line_items ? JSON.stringify(data.line_items) : undefined,
        updated_at: new Date().toISOString()
      }

      return await super.update(id, updateData)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:update'))
    }
  }

  /**
   * Send quote (change status from draft to sent)
   */
  async sendQuote(id: string) {
    try {
      validateUUID(id)

      // Check current status
      const quoteResult = await this.findById(id)
      if (!quoteResult.success || !quoteResult.data) {
        throw new NotFoundException('Quote', id)
      }

      if (quoteResult.data.status !== 'draft') {
        throw new ValidationException(
          `Cannot send quote with status '${quoteResult.data.status}'. Quote must be in 'draft' status.`,
          'intervention_quotes',
          'status'
        )
      }

      // Update status to sent
      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .update({
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:sendQuote'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:sendQuote'))
    }
  }

  /**
   * Accept quote
   */
  async acceptQuote(id: string, validatedBy: string) {
    try {
      validateUUID(id)
      validateUUID(validatedBy)

      // Check current status
      const quoteResult = await this.findById(id)
      if (!quoteResult.success || !quoteResult.data) {
        throw new NotFoundException('Quote', id)
      }

      if (quoteResult.data.status !== 'sent') {
        throw new ValidationException(
          `Cannot accept quote with status '${quoteResult.data.status}'. Quote must be in 'sent' status.`,
          'intervention_quotes',
          'status'
        )
      }

      // Update status to accepted
      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .update({
          status: 'accepted',
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:acceptQuote'))
      }

      // Also update intervention status if needed
      if (data) {
        await this.supabase
          .from('interventions')
          .update({
            status: 'planification',
            estimated_cost: data.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.intervention_id)
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:acceptQuote'))
    }
  }

  /**
   * Reject quote
   */
  async rejectQuote(id: string, validatedBy: string, reason: string) {
    try {
      validateUUID(id)
      validateUUID(validatedBy)
      validateRequired({ reason }, ['reason'])

      // Check current status
      const quoteResult = await this.findById(id)
      if (!quoteResult.success || !quoteResult.data) {
        throw new NotFoundException('Quote', id)
      }

      if (quoteResult.data.status !== 'sent') {
        throw new ValidationException(
          `Cannot reject quote with status '${quoteResult.data.status}'. Quote must be in 'sent' status.`,
          'intervention_quotes',
          'status'
        )
      }

      // Update status to rejected
      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .update({
          status: 'rejected',
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:rejectQuote'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:rejectQuote'))
    }
  }

  /**
   * Mark quote as expired
   */
  async markExpired(id: string) {
    try {
      validateUUID(id)

      // Check current status
      const quoteResult = await this.findById(id)
      if (!quoteResult.success || !quoteResult.data) {
        throw new NotFoundException('Quote', id)
      }

      if (quoteResult.data.status !== 'sent') {
        throw new ValidationException(
          `Cannot expire quote with status '${quoteResult.data.status}'. Quote must be in 'sent' status.`,
          'intervention_quotes',
          'status'
        )
      }

      // Update status to expired
      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:markExpired'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:markExpired'))
    }
  }

  /**
   * Soft delete quote
   */
  async softDelete(id: string, deletedBy: string) {
    try {
      validateUUID(id)
      validateUUID(deletedBy)

      const { data, error } = await this.supabase
        .from('intervention_quotes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('Quote', id)
        }
        return createErrorResponse(handleError(error, 'quotes:softDelete'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:softDelete'))
    }
  }

  /**
   * Check for expired quotes and update their status
   */
  async processExpiredQuotes(teamId?: string) {
    try {
      let query = this.supabase
        .from('intervention_quotes')
        .select('id, valid_until')
        .eq('status', 'sent')
        .lt('valid_until', new Date().toISOString())
        .is('deleted_at', null)

      if (teamId) {
        query = query.eq('team_id', teamId)
      }

      const { data: expiredQuotes, error: selectError } = await query

      if (selectError) {
        return createErrorResponse(handleError(selectError, 'quotes:processExpiredQuotes:select'))
      }

      const results = []
      for (const quote of expiredQuotes || []) {
        const result = await this.markExpired(quote.id)
        results.push({ id: quote.id, success: result.success })
      }

      return createSuccessResponse({
        processed: results.length,
        results
      })
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:processExpiredQuotes'))
    }
  }

  /**
   * Get quote statistics for a team
   */
  async getQuoteStats(teamId: string) {
    try {
      validateUUID(teamId)

      const { data: quotes, error } = await this.supabase
        .from('intervention_quotes')
        .select('status, amount, quote_type, created_at')
        .eq('team_id', teamId)
        .is('deleted_at', null)

      if (error) {
        return createErrorResponse(handleError(error, 'quotes:getQuoteStats'))
      }

      const stats = {
        total: quotes?.length || 0,
        by_status: {
          draft: 0,
          sent: 0,
          accepted: 0,
          rejected: 0,
          expired: 0
        },
        by_type: {
          estimation: 0,
          final: 0
        },
        total_amount: {
          all: 0,
          accepted: 0
        },
        average_amount: 0,
        acceptance_rate: 0
      }

      quotes?.forEach(quote => {
        // Count by status
        if (quote.status) {
          stats.by_status[quote.status as QuoteStatus]++
        }

        // Count by type
        if (quote.quote_type) {
          stats.by_type[quote.quote_type as QuoteType]++
        }

        // Calculate amounts
        stats.total_amount.all += quote.amount
        if (quote.status === 'accepted') {
          stats.total_amount.accepted += quote.amount
        }
      })

      // Calculate averages
      if (stats.total > 0) {
        stats.average_amount = Math.round(stats.total_amount.all / stats.total)
        const totalSentOrCompleted = stats.by_status.sent + stats.by_status.accepted + stats.by_status.rejected + stats.by_status.expired
        if (totalSentOrCompleted > 0) {
          stats.acceptance_rate = Math.round((stats.by_status.accepted / totalSentOrCompleted) * 100)
        }
      }

      return createSuccessResponse(stats)
    } catch (error) {
      return createErrorResponse(handleError(error, 'quotes:getQuoteStats'))
    }
  }
}

// Factory functions for creating repository instances
export const createQuoteRepository = (client?: SupabaseClient<Database>) => {
  const supabase = client || createBrowserSupabaseClient()
  return new QuoteRepository(supabase as SupabaseClient<Database>)
}

export const createServerQuoteRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new QuoteRepository(supabase as SupabaseClient<Database>)
}

export const createServerActionQuoteRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new QuoteRepository(supabase as SupabaseClient<Database>)
}