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
 * NEW SCHEMA: Contacts are now users with team_members for relationships
 */
export class ContactRepository extends BaseRepository<Contact, ContactInsert, ContactUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'users')  // ✅ Updated to new simplified schema
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
   * Get contact (user) with team relations
   * NEW SCHEMA: Queries users table directly with team_members
   */
  async findByIdWithRelations(_id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        company:company_id(id, name, vat_number, street, street_number, postal_code, city, country, email, phone, is_active)
      `)
      .eq('id', _id)
      .eq('deleted_at', null)  // Exclude soft-deleted users
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(this.tableName, _id)
      }
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data }
  }

  /**
   * Get user by ID (same as findById, kept for compatibility)
   * NEW SCHEMA: Returns user record directly
   */
  async findByUser(userId: string) {
    const { data, error} = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        company:company_id(id, name, vat_number, street, street_number, postal_code, city, country, email, phone, is_active)
      `)
      .eq('id', userId)
      .eq('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.info('[CONTACT-REPO] User not found:', userId)
        return { success: true as const, data: null }
      }
      logger.error('[CONTACT-REPO-DEBUG] Raw Supabase error in findByUser:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId
      })
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data ? [data] : [] }
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
   * NEW SCHEMA: Queries team_members → users
   */
  async findByTeam(teamId: string, role?: string) {
    let queryBuilder = this.supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        user:user_id (
          id,
          name,
          email,
          phone,
          company,
          role,
          provider_category,
          speciality,
          address,
          is_active,
          avatar_url,
          notes,
          first_name,
          last_name,
          is_company,
          company_id,
          company:company_id (
            id,
            name,
            vat_number,
            street,
            street_number,
            postal_code,
            city,
            country
          ),
          created_at,
          updated_at
        )
      `)
      .eq('team_id', teamId)
      .is('left_at', null)  // Only active members

    if (role) {
      // This needs to query the user role, not team_member role
      queryBuilder = queryBuilder.filter('user.role', 'eq', role)
    }

    const { data, error } = await queryBuilder.order('joined_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'team_members:query'))
    }

    // Extract users from team_members relation
    const contacts = data?.map(tm => tm.user).filter(user => user !== null) || []
    return { success: true as const, data: contacts }
  }

  /**
   * Get contacts by role
   * NEW SCHEMA: Queries users table directly by role
   */
  async findByRole(role: string, teamId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        company:company_id(id, name, vat_number, street, street_number, postal_code, city, country, email, phone, is_active)
      `)
      .eq('role', role)
      .eq('deleted_at', null)
      .eq('is_active', true)

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Check if email already exists
   * NEW SCHEMA: Users table has unique email constraint
   */
  async emailExists(email: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('email', email)
      .eq('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true as const, exists: false }
      }
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, exists: true }
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
