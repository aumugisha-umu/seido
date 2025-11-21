/**
 * Company Repository
 * Handles all database operations for companies
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { ValidationException, NotFoundException, handleError, createErrorResponse } from '../core/error-handler'
import {
  validateRequired,
  validateEnum
} from '../core/service-types'
import { logger } from '@/lib/logger'

type Company = Database['public']['Tables']['companies']['Row']
type CompanyInsert = Database['public']['Tables']['companies']['Insert']
type CompanyUpdate = Database['public']['Tables']['companies']['Update']

/**
 * Company Repository
 * Manages all database operations for companies table
 */
export class CompanyRepository extends BaseRepository<Company, CompanyInsert, CompanyUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'companies')
  }

  /**
   * Validation hook for company data
   */
  protected async validate(data: CompanyInsert | CompanyUpdate): Promise<void> {
    // Validate required fields
    if ('name' in data && data.name) {
      validateRequired({ name: data.name }, ['name'])
    }

    if ('team_id' in data && data.team_id) {
      validateRequired({ team_id: data.team_id }, ['team_id'])
    }

    // Validate country enum if present (ISO 3166-1 alpha-2 codes)
    if ('country' in data && data.country) {
      const validCountries = ['BE', 'FR', 'DE', 'NL', 'LU', 'CH']
      if (!validCountries.includes(data.country)) {
        throw new ValidationException(`Invalid country code: ${data.country}. Must be one of: ${validCountries.join(', ')}`)
      }
    }
  }

  /**
   * Get all companies for a specific team
   */
  async findByTeam(teamId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) {
        logger.error('[COMPANY-REPO] Error fetching companies by team:', error)
        return createErrorResponse(handleError(error, `${this.tableName}:query`))
      }

      logger.info(`[COMPANY-REPO] Found ${data?.length || 0} companies for team ${teamId}`)
      return { success: true as const, data: data || [] }
    } catch (error) {
      logger.error('[COMPANY-REPO] Exception in findByTeam:', error)
      throw error
    }
  }

  /**
   * Get active companies for a specific team (for selectors)
   */
  async findActiveByTeam(teamId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id, name, vat_number, street, street_number, postal_code, city, country')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) {
        logger.error('[COMPANY-REPO] Error fetching active companies:', error)
        return createErrorResponse(handleError(error, `${this.tableName}:query`))
      }

      logger.info(`[COMPANY-REPO] Found ${data?.length || 0} active companies for team ${teamId}`)
      return { success: true as const, data: data || [] }
    } catch (error) {
      logger.error('[COMPANY-REPO] Exception in findActiveByTeam:', error)
      throw error
    }
  }

  /**
   * Check if a VAT number already exists for a specific team
   * Returns the company if found, null otherwise
   */
  async findByVatNumber(vatNumber: string, teamId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('vat_number', vatNumber)
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logger.error('[COMPANY-REPO] Error checking VAT number:', error)
        return createErrorResponse(handleError(error, `${this.tableName}:query`))
      }

      if (data) {
        logger.info(`[COMPANY-REPO] VAT number ${vatNumber} already exists for team ${teamId}`)
      }

      return { success: true as const, data }
    } catch (error) {
      logger.error('[COMPANY-REPO] Exception in findByVatNumber:', error)
      throw error
    }
  }

  /**
   * Create a company with full address
   */
  async createWithAddress(companyData: {
    name: string
    vat_number?: string
    street?: string
    street_number?: string
    postal_code?: string
    city?: string
    country?: string
    team_id: string
    email?: string
    phone?: string
    notes?: string
  }) {
    try {
      // Validate required fields
      validateRequired(companyData, ['name', 'team_id'])

      // Check VAT uniqueness if provided
      if (companyData.vat_number) {
        const existingResult = await this.findByVatNumber(companyData.vat_number, companyData.team_id)
        if (existingResult.success && existingResult.data) {
          throw new ValidationException(`Une société avec le numéro de TVA ${companyData.vat_number} existe déjà dans cette équipe`)
        }
      }

      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert({
          name: companyData.name,
          vat_number: companyData.vat_number || null,
          street: companyData.street || null,
          street_number: companyData.street_number || null,
          postal_code: companyData.postal_code || null,
          city: companyData.city || null,
          country: companyData.country || 'BE',
          team_id: companyData.team_id,
          email: companyData.email || null,
          phone: companyData.phone || null,
          notes: companyData.notes || null,
          is_active: true
        })
        .select()
        .single()

      if (error) {
        logger.error('[COMPANY-REPO] Error creating company:', error)
        return createErrorResponse(handleError(error, `${this.tableName}:insert`))
      }

      logger.info(`[COMPANY-REPO] Created company: ${data.name} (ID: ${data.id})`)
      return { success: true as const, data }
    } catch (error) {
      logger.error('[COMPANY-REPO] Exception in createWithAddress:', error)
      throw error
    }
  }

  /**
   * Deactivate a company (soft deactivation)
   */
  async deactivate(companyId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({ is_active: false })
        .eq('id', companyId)
        .select()
        .single()

      if (error) {
        logger.error('[COMPANY-REPO] Error deactivating company:', error)
        return createErrorResponse(handleError(error, `${this.tableName}:update`))
      }

      logger.info(`[COMPANY-REPO] Deactivated company ${companyId}`)
      return { success: true as const, data }
    } catch (error) {
      logger.error('[COMPANY-REPO] Exception in deactivate:', error)
      throw error
    }
  }
}

/**
 * Factory functions to create CompanyRepository instances
 */
export async function createServerCompanyRepository() {
  const supabase = await createServerSupabaseClient()
  return new CompanyRepository(supabase)
}

export function createBrowserCompanyRepository() {
  const supabase = createBrowserSupabaseClient()
  return new CompanyRepository(supabase)
}

export async function createServerActionCompanyRepository() {
  const supabase = await createServerActionSupabaseClient()
  return new CompanyRepository(supabase)
}
