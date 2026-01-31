/**
 * Contact Repository - Phase 3
 * Handles all database operations for contacts with relations User/Lot/Building
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contact, ContactInsert, ContactUpdate } from '../core/service-types'
import { ValidationException, NotFoundException, handleError, createErrorResponse } from '../core/error-handler'
import {
  validateRequired,
  validateEnum
} from '../core/service-types'
import { logger } from '@/lib/logger'

/**
 * Contact Repository
 * Manages all database operations for contacts (users table)
 *
 * IMPORTANT: This repository uses separate queries instead of PostgREST relations
 * (e.g., `company:company_id(...)`) because RLS policies can cause silent failures
 * when joining tables. The separate query approach is more robust with RLS.
 */
export class ContactRepository extends BaseRepository<Contact, ContactInsert, ContactUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'users')
  }

  /**
   * Helper: Fetch company with its address (separate queries for RLS compatibility)
   */
  private async fetchCompanyWithAddress(companyId: string) {
    const { data: companyData } = await this.supabase
      .from('companies')
      .select('id, name, vat_number, email, phone, is_active, address_id')
      .eq('id', companyId)
      .maybeSingle()

    if (!companyData) return null

    let address_record = null
    if (companyData.address_id) {
      const { data: addressData } = await this.supabase
        .from('addresses')
        .select('*')
        .eq('id', companyData.address_id)
        .maybeSingle()
      address_record = addressData
    }
    return { ...companyData, address_record }
  }

  /**
   * Helper: Fetch team by ID
   */
  private async fetchTeam(teamId: string) {
    const { data } = await this.supabase
      .from('teams')
      .select('id, name, description')
      .eq('id', teamId)
      .maybeSingle()
    return data
  }

  /**
   * Validation hook for contact data (users table)
   */
  protected async validate(data: ContactInsert | ContactUpdate): Promise<void> {
    // Validate email if present
    if ('email' in data && data.email) {
      validateRequired({ email: data.email }, ['email'])
    }

    // Validate name if present
    if ('name' in data && data.name) {
      validateRequired({ name: data.name }, ['name'])
    }

    // Validate role if present
    if ('role' in data && data.role) {
      validateEnum(data.role, ['admin', 'gestionnaire', 'locataire', 'prestataire', 'proprietaire'], 'role')
    }

    // Validate provider_category if present
    if ('provider_category' in data && data.provider_category) {
      validateEnum(data.provider_category, ['prestataire', 'autre'], 'provider_category')
    }
  }

  /**
   * Get contact (user) with team and company relations
   */
  async findByIdWithRelations(_id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', _id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    if (!data) {
      throw new NotFoundException(this.tableName, _id)
    }

    const [company, team] = await Promise.all([
      data.company_id ? this.fetchCompanyWithAddress(data.company_id) : null,
      data.team_id ? this.fetchTeam(data.team_id) : null
    ])

    return { success: true as const, data: { ...data, team, company } }
  }

  /**
   * Get user by ID with relations (returns array for compatibility)
   */
  async findByUser(userId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    if (!data) {
      return { success: true as const, data: [] }
    }

    const [company, team] = await Promise.all([
      data.company_id ? this.fetchCompanyWithAddress(data.company_id) : null,
      data.team_id ? this.fetchTeam(data.team_id) : null
    ])

    return { success: true as const, data: [{ ...data, team, company }] }
  }

  /**
   * Get lot contacts for a user (Phase 2: lot_contacts table)
   * Returns lot assignments with metadata (is_primary, start_date, end_date, role)
   */
  async findLotContactsByUser(userId: string) {
    logger.info('[CONTACT-REPO] Finding lot contacts for user:', userId)

    const { data, error } = await this.supabase
      .from('lot_contacts')
      .select(`
        *,
        lot:lot_id (
          *,
          building:building_id (*)
        ),
        user:user_id (*)
      `)
      .eq('user_id', userId)

    if (error) {
      logger.error('[CONTACT-REPO] Error finding lot contacts:', error)
      return createErrorResponse(handleError(error, 'lot_contacts:query'))
    }

    logger.info('[CONTACT-REPO] Found lot contacts:', data?.length || 0)
    return { success: true as const, data: data || [] }
  }

  /**
   * Get contacts by team
   * Uses separate queries to avoid RLS issues with PostgREST relations
   * @param excludeUserId - Optional user ID to exclude from results (e.g., current user)
   */
  async findByTeam(teamId: string, role?: string, excludeUserId?: string) {
    // Step 1: Fetch users
    let queryBuilder = this.supabase
      .from('users')
      .select(`
        id, name, email, phone, company, role, provider_category, speciality,
        address, is_active, avatar_url, notes, first_name, last_name,
        is_company, company_id, auth_user_id, team_id, created_at, updated_at
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (role) {
      queryBuilder = queryBuilder.eq('role', role)
    }

    if (excludeUserId) {
      queryBuilder = queryBuilder.neq('id', excludeUserId)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'users:query'))
    }

    if (!data || data.length === 0) {
      return { success: true as const, data: [] }
    }

    // Step 2: Get unique company IDs and fetch companies in batch
    const companyIds = [...new Set(data.filter(u => u.company_id).map(u => u.company_id))]
    let companiesMap: Record<string, any> = {}

    if (companyIds.length > 0) {
      const { data: companies } = await this.supabase
        .from('companies')
        .select('id, name, vat_number, email, phone, is_active, address_id')
        .in('id', companyIds)

      if (companies) {
        // Get unique address IDs and fetch addresses in batch
        const addressIds = [...new Set(companies.filter(c => c.address_id).map(c => c.address_id))]
        let addressesMap: Record<string, any> = {}

        if (addressIds.length > 0) {
          const { data: addresses } = await this.supabase
            .from('addresses')
            .select('*')
            .in('id', addressIds)

          if (addresses) {
            addressesMap = Object.fromEntries(addresses.map(a => [a.id, a]))
          }
        }

        // Map companies with their addresses
        companiesMap = Object.fromEntries(companies.map(c => [
          c.id,
          { ...c, address_record: c.address_id ? addressesMap[c.address_id] || null : null }
        ]))
      }
    }

    // Step 3: Enrich users with company data
    const enrichedUsers = data.map(user => ({
      ...user,
      company: user.company_id ? companiesMap[user.company_id] || null : null
    }))

    return { success: true as const, data: enrichedUsers }
  }

  /**
   * Get contacts by role with relations
   */
  async findByRole(role: string, teamId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('role', role)
      .is('deleted_at', null)
      .eq('is_active', true)

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    if (!data || data.length === 0) {
      return { success: true as const, data: [] }
    }

    // Enrich each user with company and team
    const enrichedUsers = await Promise.all(data.map(async (user) => {
      const [company, team] = await Promise.all([
        user.company_id ? this.fetchCompanyWithAddress(user.company_id) : null,
        user.team_id ? this.fetchTeam(user.team_id) : null
      ])
      return { ...user, team, company }
    }))

    return { success: true as const, data: enrichedUsers }
  }

  /**
   * Check if email already exists in a specific team
   * NEW SCHEMA: UNIQUE(email, team_id) - email can exist in multiple teams
   */
  async emailExists(email: string, teamId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)

    // Si teamId fourni, vérifier uniquement dans cette équipe
    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId)
    }

    const { data, error } = await queryBuilder.limit(1).maybeSingle()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, exists: data !== null }
  }

  /**
   * Get contact statistics for dashboard
   * NEW SCHEMA: Count users by role and status
   */
  async getContactStats(teamId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('role, is_active')
      .eq('deleted_at', null)

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId)
    }

    const { data: roleStats, error: roleError } = await queryBuilder

    if (roleError) {
      return createErrorResponse(handleError(roleError, `${this.tableName}:query`))
    }

    // Calculate statistics
    const stats = {
      total: roleStats?.length || 0,
      byRole: {
        admin: 0,
        gestionnaire: 0,
        locataire: 0,
        prestataire: 0
      },
      byStatus: {
        active: 0,
        inactive: 0
      }
    }

    roleStats?.forEach(user => {
      if (user.role) {
        stats.byRole[user.role as keyof typeof stats.byRole]++
      }
      if (user.is_active !== undefined) {
        if (user.is_active) {
          stats.byStatus.active++
        } else {
          stats.byStatus.inactive++
        }
      }
    })

    return { success: true as const, data: stats }
  }

  /**
   * Add user to team
   * NEW SCHEMA: Creates team_members entry
   */
  async addToTeam(teamId: string, userId: string, role: 'admin' | 'member' = 'member') {
    // Check if user is already in team
    const { data: existing, error: checkError } = await this.supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single()

    if (existing) {
      throw new ValidationException('User is already a member of this team', 'team_members', 'user_id')
    }

    // Create team_members entry
    const { data, error } = await this.supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: role
      })
      .select()
      .single()

    if (error) {
      return createErrorResponse(handleError(error, 'team_members:insert'))
    }

    return { success: true as const, data }
  }

  /**
   * Remove user from team (soft delete)
   * NEW SCHEMA: Sets left_at on team_members
   */
  async removeFromTeam(teamId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('team_members')
      .update({ left_at: new Date().toISOString() })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .is('left_at', null)
      .select()

    if (error) {
      return createErrorResponse(handleError(error, 'team_members:update'))
    }

    if (!data || data.length === 0) {
      throw new NotFoundException('team_members', `${teamId}-${userId}`)
    }

    return { success: true as const, data: data[0] }
  }
  /**
   * Find a specific contact within a team
   * Used for contact edit page and other team-scoped operations
   */
  async findContactInTeam(teamId: string, contactId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', contactId)
      .eq('team_id', teamId)
      .maybeSingle()

    if (error) {
      logger.error('[CONTACT-REPO] findContactInTeam error:', error.code, error.message)
      return createErrorResponse(handleError(error, 'users:query'))
    }

    if (!data) {
      return { success: true as const, data: null }
    }

    const [company, team] = await Promise.all([
      data.company_id ? this.fetchCompanyWithAddress(data.company_id) : null,
      data.team_id ? this.fetchTeam(data.team_id) : null
    ])

    return { success: true as const, data: { ...data, team, company } as Contact }
  }
}

// Factory functions for creating repository instances
export const createContactRepository = () => {
  const supabase = createBrowserSupabaseClient()
  return new ContactRepository(supabase)
}

export const createServerContactRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new ContactRepository(supabase)
}

/**
 * Create Contact Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionContactRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new ContactRepository(supabase)
}
