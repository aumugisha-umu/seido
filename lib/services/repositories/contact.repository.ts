/**
 * Contact Repository - Phase 3
 * Handles all database operations for contacts with relations User/Lot/Building
 */

import { BaseRepository } from '../core/base-repository'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contact, ContactInsert, ContactUpdate } from '../core/service-types'
import { ValidationException, NotFoundException } from '../core/error-handler'
import {
  validateRequired,
  validateEnum
} from '../core/service-types'

/**
 * Contact Repository
 * Manages all database operations for contacts with advanced relations and permissions
 */
export class ContactRepository extends BaseRepository<Contact, ContactInsert, ContactUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'contacts')
  }

  /**
   * Validation hook for contact data
   */
  protected async validate(data: ContactInsert | ContactUpdate): Promise<void> {
    if ('user_id' in data && data.user_id) {
      validateRequired({ user_id: data.user_id }, ['user_id'])
    }

    if ('type' in data && data.type) {
      validateEnum(data.type, ['tenant', 'owner', 'manager', 'provider'], 'type')
    }

    if ('status' in data && data.status) {
      validateEnum(data.status, ['active', 'inactive', 'pending'], 'status')
    }

    // Validate that either lot_id or building_id is provided, but not both
    if ('lot_id' in data && 'building_id' in data && data.lot_id && data.building_id) {
      throw new ValidationException('Contact cannot be assigned to both lot and building', 'contacts', 'assignment')
    }
  }

  /**
   * Get contact with all relations (user, lot, building)
   */
  async findByIdWithRelations(_id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, phone, role, provider_category),
        lot:lot_id(id, reference, building_id, building:building_id(name, address)),
        building:building_id(id, name, address, city)
      `)
      .eq('id', _id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Contact not found', this.tableName, _id)
      }
      return this.handleError(error)
    }

    return { success: true as const, data }
  }

  /**
   * Get all contacts for a specific user
   */
  async findByUser(_userId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot:lot_id(id, reference, building:building_id(name, address)),
        building:building_id(id, name, address, city)
      `)
      .eq('user_id', _userId)
      .order('created_at', { ascending: false })

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get all contacts for a specific lot
   */
  async findByLot(lotId: string, type?: Contact['type']) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, phone, role, provider_category)
      `)
      .eq('lot_id', _lotId)

    if (type) {
      queryBuilder = queryBuilder.eq('type', type)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get all contacts for a specific building
   */
  async findByBuilding(buildingId: string, type?: Contact['type']) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, phone, role, provider_category)
      `)
      .eq('building_id', _buildingId)

    if (type) {
      queryBuilder = queryBuilder.eq('type', type)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get contacts by type across all lots/buildings
   */
  async findByType(type: Contact['type'], options?: { status?: Contact['status'] }) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        user:user_id(id, name, email, phone, role, provider_category),
        lot:lot_id(id, reference, building:building_id(name)),
        building:building_id(id, name, address)
      `)
      .eq('type', type)

    if (options?.status) {
      queryBuilder = queryBuilder.eq('status', options.status)
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false })

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Check if a user is already assigned to a lot or building
   */
  async userExists(userId: string, lotId?: string, buildingId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('user_id', _userId)

    if (_lotId) {
      queryBuilder = queryBuilder.eq('lot_id', _lotId)
    }

    if (_buildingId) {
      queryBuilder = queryBuilder.eq('building_id', _buildingId)
    }

    const { data, error } = await queryBuilder.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true as const, exists: false }
      }
      return this.handleError(error)
    }

    return { success: true as const, exists: true }
  }

  /**
   * Get contact statistics for dashboard
   */
  async getContactStats() {
    // Count by type and status
    const { data: typeStats, error: typeError } = await this.supabase
      .from(this.tableName)
      .select('type, status')

    if (typeError) {
      return this.handleError(typeError)
    }

    // Calculate statistics
    const stats = {
      total: typeStats?.length || 0,
      byType: {
        tenant: 0,
        owner: 0,
        manager: 0,
        provider: 0
      },
      byStatus: {
        active: 0,
        inactive: 0,
        pending: 0
      }
    }

    typeStats?.forEach(contact => {
      if (contact.type) {
        stats.byType[contact.type as keyof typeof stats.byType]++
      }
      if (contact.status) {
        stats.byStatus[contact.status as keyof typeof stats.byStatus]++
      }
    })

    return { success: true as const, data: stats }
  }

  /**
   * Add contact to lot (specialized method)
   */
  async addToLot(lotId: string, userId: string, type: Contact['type'], isPrimary: boolean = false) {
    // Check if user is already assigned to this lot
    const existingCheck = await this.userExists(_userId, _lotId)
    if (!existingCheck.success) return existingCheck

    if (existingCheck.exists) {
      throw new ValidationException('User is already assigned to this lot', 'contacts', 'user_id')
    }

    const contactData: ContactInsert = {
      user_id: _userId,
      lot_id: _lotId,
      type,
      status: 'active'
    }

    return this.create(contactData)
  }

  /**
   * Add contact to building (specialized method)
   */
  async addToBuilding(buildingId: string, userId: string, type: Contact['type'], isPrimary: boolean = false) {
    // Check if user is already assigned to this building
    const existingCheck = await this.userExists(_userId, undefined, _buildingId)
    if (!existingCheck.success) return existingCheck

    if (existingCheck.exists) {
      throw new ValidationException('User is already assigned to this building', 'contacts', 'user_id')
    }

    const contactData: ContactInsert = {
      user_id: _userId,
      building_id: _buildingId,
      type,
      status: 'active'
    }

    return this.create(contactData)
  }

  /**
   * Remove contact from lot
   */
  async removeFromLot(lotId: string, userId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('lot_id', _lotId)
      .eq('user_id', _userId)
      .select()

    if (error) {
      return this.handleError(error)
    }

    if (!data || data.length === 0) {
      throw new NotFoundException('Contact assignment not found', this.tableName, `${lotId}-${userId}`)
    }

    return { success: true as const, data: data[0] }
  }

  /**
   * Remove contact from building
   */
  async removeFromBuilding(buildingId: string, userId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('building_id', _buildingId)
      .eq('user_id', _userId)
      .select()

    if (error) {
      return this.handleError(error)
    }

    if (!data || data.length === 0) {
      throw new NotFoundException('Contact assignment not found', this.tableName, `${buildingId}-${userId}`)
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
