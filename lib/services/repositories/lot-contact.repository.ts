/**
 * LotContact Repository - Phase 2.5
 * Handles many-to-many relationships between lots and users (tenants, managers)
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '../core/service-types'
import { handleError, createErrorResponse } from '../core/error-handler'
import { logger } from '@/lib/logger'

// Types for lot_contacts table
export interface LotContact {
  id: string
  lot_id: string
  user_id: string
  is_primary: boolean
  role?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface LotContactInsert {
  lot_id: string
  user_id: string
  is_primary?: boolean
  role?: string
  notes?: string
}

export interface LotContactUpdate {
  is_primary?: boolean
  role?: string
  notes?: string
}

export interface LotContactWithUser extends LotContact {
  user?: User
}

/**
 * LotContact Repository
 * Manages many-to-many relationships between lots and contacts (tenants, managers, etc.)
 */
export class LotContactRepository extends BaseRepository<LotContact, LotContactInsert, LotContactUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'lot_contacts')
  }

  /**
   * Assign a tenant to a lot
   * @param lotId - Lot UUID
   * @param userId - User UUID
   * @param isPrimary - Whether this is the primary tenant
   */
  async assignTenant(lotId: string, userId: string, isPrimary = true) {
    // If assigning as primary, unset other primary tenants
    if (isPrimary) {
      const { error: unsetError } = await this.supabase
        .from(this.tableName)
        .update({ is_primary: false })
        .eq('lot_id', lotId)
        .eq('is_primary', true)

      if (unsetError) {
        logger.error('❌ [LOT-CONTACT-REPO] Failed to unset primary tenants:', unsetError)
      }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert({
        lot_id: lotId,
        user_id: userId,
        is_primary: isPrimary
      })
      .select()
      .single()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:assignTenant`))
    }

    logger.info('✅ [LOT-CONTACT-REPO] Tenant assigned:', { lotId, userId, isPrimary })
    return { success: true as const, data }
  }

  /**
   * Remove a tenant from a lot
   * @param lotId - Lot UUID
   * @param userId - User UUID
   */
  async removeTenant(lotId: string, userId: string) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('lot_id', lotId)
      .eq('user_id', userId)

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:removeTenant`))
    }

    logger.info('✅ [LOT-CONTACT-REPO] Tenant removed:', { lotId, userId })
    return { success: true as const, data: null }
  }

  /**
   * Get all tenants for a lot
   * @param lotId - Lot UUID
   */
  async getTenants(lotId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, phone, role, provider_category)
      `)
      .eq('lot_id', lotId)

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:getTenants`))
    }

    // Filter only users with role 'locataire'
    const tenants = (data || []).filter((contact: any) =>
      contact.user?.role === 'locataire'
    )

    return { success: true as const, data: tenants }
  }

  /**
   * Get primary tenant for a lot
   * @param lotId - Lot UUID
   */
  async getPrimaryTenant(lotId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, phone, role, provider_category)
      `)
      .eq('lot_id', lotId)
      .eq('is_primary', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No primary tenant
        return { success: true as const, data: null }
      }
      return createErrorResponse(handleError(error, `${this.tableName}:getPrimaryTenant`))
    }

    // Ensure it's a tenant
    if (data.user?.role !== 'locataire') {
      return { success: true as const, data: null }
    }

    return { success: true as const, data }
  }

  /**
   * Check if a lot has any tenants
   * @param lotId - Lot UUID
   */
  async isLotOccupied(lotId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id, user:user_id(role)')
      .eq('lot_id', lotId)

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:isLotOccupied`))
    }

    const hasTenants = (data || []).some((contact: any) =>
      contact.user?.role === 'locataire'
    )

    return { success: true as const, data: hasTenants }
  }

  /**
   * Get all contacts for a lot (tenants, managers, etc.)
   * @param lotId - Lot UUID
   */
  async getAllContacts(lotId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, phone, role, provider_category)
      `)
      .eq('lot_id', lotId)
      .order('is_primary', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:getAllContacts`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Update primary tenant status
   * @param lotId - Lot UUID
   * @param userId - User UUID to set as primary
   */
  async setPrimaryTenant(lotId: string, userId: string) {
    // First, unset all primary tenants for this lot
    const { error: unsetError } = await this.supabase
      .from(this.tableName)
      .update({ is_primary: false })
      .eq('lot_id', lotId)
      .eq('is_primary', true)

    if (unsetError) {
      return createErrorResponse(handleError(unsetError, `${this.tableName}:setPrimaryTenant:unset`))
    }

    // Then, set the new primary tenant
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ is_primary: true })
      .eq('lot_id', lotId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:setPrimaryTenant:set`))
    }

    logger.info('✅ [LOT-CONTACT-REPO] Primary tenant set:', { lotId, userId })
    return { success: true as const, data }
  }
}

// Factory functions for creating repository instances
export const createLotContactRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new LotContactRepository(supabase)
}

export const createServerLotContactRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new LotContactRepository(supabase)
}

/**
 * Create LotContact Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionLotContactRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new LotContactRepository(supabase)
}
