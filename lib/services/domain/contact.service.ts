/**
 * Contact Service - Phase 3
 * Business logic for contact management with permissions and relations
 */

import { ContactRepository, createContactRepository, createServerContactRepository } from '../repositories/contact.repository'
import { UserService, createUserService, createServerUserService } from './user.service'
import { LotService, createLotService, createServerLotService } from './lot.service'
import { BuildingService, createBuildingService, createServerBuildingService } from './building.service'
import { ValidationException, NotFoundException } from '../core/error-handler'
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  User
} from '../core/service-types'

/**
 * Contact Service
 * Manages contact assignments between users and lots/buildings with business rules
 */
export class ContactService {
  constructor(
    private repository: ContactRepository,
    private userService?: UserService,
    private lotService?: LotService,
    private buildingService?: BuildingService
  ) {}

  /**
   * Get all contacts with pagination
   */
  async getAll(options?: { page?: number; limit?: number }) {
    try {
      const result = await this.repository.findAll(options)
      return { success: true as const, data: result }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get contact by ID
   */
  async getById(id: string) {
    try {
      const result = await this.repository.findById(id)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get contact by ID with full relations
   */
  async getByIdWithRelations(id: string) {
    try {
      const result = await this.repository.findByIdWithRelations(id)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Create new contact with validation
   */
  async create(contactData: ContactInsert) {
    // Validate user exists
    if (this.userService) {
      const userResult = await this.userService.getById(contactData.user_id)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('User not found', 'users', contactData.user_id)
      }

      // Validate role-based assignment rules
      await this.validateRoleAssignment(userResult.data, contactData)
    }

    // Validate lot or building exists
    if (contactData.lot_id && this.lotService) {
      const lotResult = await this.lotService.getById(contactData.lot_id)
      if (!lotResult.success || !lotResult.data) {
        throw new NotFoundException('Lot not found', 'lots', contactData.lot_id)
      }
    }

    if (contactData.building_id && this.buildingService) {
      const buildingResult = await this.buildingService.getById(contactData.building_id)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Building not found', 'buildings', contactData.building_id)
      }
    }

    // Set default values
    const processedData = {
      ...contactData,
      status: contactData.status || 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const result = await this.repository.create(processedData)

    // Log activity
    if (result.success && result.data) {
      await this.logContactCreation(result.data)
    }

    return result
  }

  /**
   * Update contact with validation
   */
  async update(id: string, updates: ContactUpdate) {
    // Check if contact exists
    const existingContact = await this.repository.findById(id)
    if (!existingContact.success) return existingContact

    if (!existingContact.data) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Contact not found' }
      }
    }

    // Update timestamp
    const processedUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const result = await this.repository.update(id, processedUpdates)

    // Log activity
    if (result.success && result.data) {
      await this.logContactUpdate(result.data, updates)
    }

    return result
  }

  /**
   * Delete contact with validation
   */
  async delete(id: string) {
    // Check if contact exists
    const existingContact = await this.repository.findById(id)
    if (!existingContact.success) return existingContact

    if (!existingContact.data) {
      throw new NotFoundException('Contact not found', 'contacts', id)
    }

    const result = await this.repository.delete(id)

    // Log activity
    if (result.success) {
      await this.logContactDeletion(existingContact.data)
    }

    return result
  }

  /**
   * Get all contacts for a user
   */
  async getUserContacts(userId: string) {
    try {
      const result = await this.repository.findByUser(userId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all contacts for a lot
   */
  async getLotContacts(lotId: string, type?: Contact['type']) {
    try {
      const result = await this.repository.findByLot(lotId, type)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all contacts for a building
   */
  async getBuildingContacts(buildingId: string, type?: Contact['type']) {
    try {
      const result = await this.repository.findByBuilding(buildingId, type)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get contacts by type
   */
  async getContactsByType(type: Contact['type'], options?: { status?: Contact['status'] }) {
    try {
      const result = await this.repository.findByType(type, options)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Add user to lot with role validation
   */
  async addContactToLot(lotId: string, userId: string, isPrimary: boolean = false) {
    // Get user to determine contact type
    if (!this.userService) {
      throw new Error('UserService is required for contact assignment')
    }

    const userResult = await this.userService.getById(userId)
    if (!userResult.success || !userResult.data) {
      throw new NotFoundException('User not found', 'users', userId)
    }

    const user = userResult.data
    const contactType = this.mapUserRoleToContactType(user)

    // Validate role can be assigned to lots
    this.validateLotAssignment(user)

    try {
      const result = await this.repository.addToLot(lotId, userId, contactType, isPrimary)

      if (result.success && result.data) {
        await this.logContactAssignment('lot', lotId, userId, contactType)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Add user to building with role validation
   */
  async addContactToBuilding(buildingId: string, userId: string, isPrimary: boolean = false) {
    // Get user to determine contact type
    if (!this.userService) {
      throw new Error('UserService is required for contact assignment')
    }

    const userResult = await this.userService.getById(userId)
    if (!userResult.success || !userResult.data) {
      throw new NotFoundException('User not found', 'users', userId)
    }

    const user = userResult.data
    const contactType = this.mapUserRoleToContactType(user)

    // Validate role can be assigned to buildings
    this.validateBuildingAssignment(user)

    try {
      const result = await this.repository.addToBuilding(buildingId, userId, contactType, isPrimary)

      if (result.success && result.data) {
        await this.logContactAssignment('building', buildingId, userId, contactType)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Remove user from lot
   */
  async removeContactFromLot(lotId: string, userId: string) {
    try {
      const result = await this.repository.removeFromLot(lotId, userId)

      if (result.success) {
        await this.logContactRemoval('lot', lotId, userId)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Remove user from building
   */
  async removeContactFromBuilding(buildingId: string, userId: string) {
    try {
      const result = await this.repository.removeFromBuilding(buildingId, userId)

      if (result.success) {
        await this.logContactRemoval('building', buildingId, userId)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get contact statistics
   */
  async getContactStats() {
    try {
      const result = await this.repository.getContactStats()
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Count total contacts
   */
  async count() {
    try {
      const result = await this.repository.count()
      return { success: true as const, data: result }
    } catch (error) {
      throw error
    }
  }

  /**
   * Validate role-based assignment rules
   */
  private async validateRoleAssignment(user: User, contactData: ContactInsert) {
    const contactType = this.mapUserRoleToContactType(user)

    // Validate assignment rules
    if (contactData.lot_id) {
      this.validateLotAssignment(user)
    }

    if (contactData.building_id) {
      this.validateBuildingAssignment(user)
    }

    // Validate contact type matches user role
    if (contactData.type && contactData.type !== contactType) {
      throw new ValidationException(
        `Contact type '${contactData.type}' does not match user role '${user.role}'`,
        'contacts',
        'type'
      )
    }
  }

  /**
   * Map user role to contact type
   */
  private mapUserRoleToContactType(user: User): Contact['type'] {
    switch (user.role) {
      case 'locataire':
        return 'tenant'
      case 'gestionnaire':
      case 'admin':
        return 'manager'
      case 'prestataire':
        return 'provider'
      default:
        return 'owner' // Default fallback
    }
  }

  /**
   * Validate user can be assigned to lots
   */
  private validateLotAssignment(user: User) {
    // All roles can be assigned to lots
    const allowedRoles = ['locataire', 'gestionnaire', 'prestataire', 'admin']

    if (!allowedRoles.includes(user.role)) {
      throw new ValidationException(
        `User with role '${user.role}' cannot be assigned to lots`,
        'contacts',
        'user_role'
      )
    }
  }

  /**
   * Validate user can be assigned to buildings
   */
  private validateBuildingAssignment(user: User) {
    // Tenants should typically be assigned to lots, not buildings directly
    const allowedRoles = ['gestionnaire', 'prestataire', 'admin']

    if (!allowedRoles.includes(user.role)) {
      throw new ValidationException(
        `User with role '${user.role}' cannot be assigned to buildings. Tenants should be assigned to lots.`,
        'contacts',
        'user_role'
      )
    }
  }

  /**
   * Log contact creation activity
   */
  private async logContactCreation(contact: Contact) {
    // In production, this would use the activity-logger service
    console.log('Contact created:', contact.id, contact.type, contact.user_id)
  }

  /**
   * Log contact update activity
   */
  private async logContactUpdate(contact: Contact, changes: ContactUpdate) {
    // In production, this would use the activity-logger service
    console.log('Contact updated:', contact.id, changes)
  }

  /**
   * Log contact deletion activity
   */
  private async logContactDeletion(contact: Contact) {
    // In production, this would use the activity-logger service
    console.log('Contact deleted:', contact.id, contact.type, contact.user_id)
  }

  /**
   * Log contact assignment activity
   */
  private async logContactAssignment(
    assignmentType: 'lot' | 'building',
    assignmentId: string,
    userId: string,
    contactType: Contact['type']
  ) {
    // In production, this would use the activity-logger service
    console.log(`Contact assigned to ${assignmentType}:`, assignmentId, userId, contactType)
  }

  /**
   * Log contact removal activity
   */
  private async logContactRemoval(
    assignmentType: 'lot' | 'building',
    assignmentId: string,
    userId: string
  ) {
    // In production, this would use the activity-logger service
    console.log(`Contact removed from ${assignmentType}:`, assignmentId, userId)
  }
}

// Factory functions for creating service instances
export const createContactService = (
  repository?: ContactRepository,
  userService?: UserService,
  lotService?: LotService,
  buildingService?: BuildingService
) => {
  const repo = repository || createContactRepository()
  const users = userService || createUserService()
  const lots = lotService || createLotService()
  const buildings = buildingService || createBuildingService()
  return new ContactService(repo, users, lots, buildings)
}

export const createServerContactService = async () => {
  const [repository, userService, lotService, buildingService] = await Promise.all([
    createServerContactRepository(),
    createServerUserService(),
    createServerLotService(),
    createServerBuildingService()
  ])
  return new ContactService(repository, userService, lotService, buildingService)
}
