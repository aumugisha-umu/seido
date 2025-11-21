/**
 * Contact Service - Phase 3 (Updated for New Schema)
 * Business logic for contact management with team-based relationships
 * NEW SCHEMA: Contacts are users managed via team_members table
 */

import { ContactRepository, createContactRepository, createServerContactRepository, createServerActionContactRepository } from '../repositories/contact.repository'
import { UserService, createUserService, createServerUserService, createServerActionUserService } from './user.service'
import { ValidationException, NotFoundException } from '../core/error-handler'
import { logger, logError } from '@/lib/logger'
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  User
} from '../core/service-types'

/**
 * Contact Service
 * NEW SCHEMA: Manages users (contacts) with team-based relationships
 */
export class ContactService {
  constructor(
    private repository: ContactRepository,
    private userService?: UserService
  ) { }

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
   * Find a specific contact within a team
   * Queries team_members to ensure the user belongs to the team (and respects RLS)
   */
  async findContactInTeam(teamId: string, contactId: string) {
    try {
      const result = await this.repository.findContactInTeam(teamId, contactId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Create new contact (user) with validation
   * NEW SCHEMA: Creates user record in users table
   */
  async create(contactData: ContactInsert) {
    // Validate required fields for new schema
    if (!contactData.email || !contactData.name) {
      throw new ValidationException('Email and name are required', 'users', 'email')
    }

    // Check if email already exists
    const emailCheck = await this.repository.emailExists(contactData.email)
    if (emailCheck.success && emailCheck.exists) {
      throw new ValidationException('Email already exists', 'users', 'email')
    }

    // Set default values for users table
    const processedData = {
      ...contactData,
      is_active: contactData.is_active !== undefined ? contactData.is_active : true,
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
      throw new NotFoundException('contacts', id)
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
   * Phase 2: Returns lot_contacts assignments (not the user itself)
   */
  async getUserContacts(userId: string) {
    try {
      const result = await this.repository.findLotContactsByUser(userId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get contacts by role (NEW SCHEMA: queries users by role)
   */
  async getContactsByRole(role: string, teamId?: string) {
    try {
      const result = await this.repository.findByRole(role, teamId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Add user to team
   * NEW SCHEMA: Creates team_members entry
   */
  async addContactToTeam(teamId: string, userId: string, role: 'admin' | 'member' = 'member') {
    // Validate user exists
    if (this.userService) {
      const userResult = await this.userService.getById(userId)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('users', userId)
      }
    }

    try {
      const result = await this.repository.addToTeam(teamId, userId, role)

      if (result.success && result.data) {
        await this.logTeamAssignment(teamId, userId, role)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Remove user from team (soft delete)
   * NEW SCHEMA: Sets left_at on team_members
   */
  async removeContactFromTeam(teamId: string, userId: string) {
    try {
      const result = await this.repository.removeFromTeam(teamId, userId)

      if (result.success) {
        await this.logTeamRemoval(teamId, userId)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get contact statistics
   * NEW SCHEMA: Statistics by role and status
   */
  async getContactStats(teamId?: string) {
    try {
      const result = await this.repository.getContactStats(teamId)
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
   * Get contacts by team with role filtering
   * Uses repository layer to ensure proper filtering (left_at IS NULL + RLS)
   * @param excludeUserId - Optional user ID to exclude from results (e.g., current user)
   */
  async getContactsByTeam(teamId: string, role?: User['role'], excludeUserId?: string) {
    try {
      // ✅ Use repository method that includes left_at filter and RLS
      const result = await this.repository.findByTeam(teamId, role, excludeUserId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get all contacts for a team (alias for getContactsByTeam)
   * Provided for compatibility with legacy API
   */
  async getTeamContacts(teamId: string, role?: User['role']) {
    return this.getContactsByTeam(teamId, role)
  }

  /**
   * Search contacts by name or email
   * NEW SCHEMA: Searches users table directly
   */
  async searchContacts(query: string, options?: { role?: User['role']; teamId?: string }) {
    try {
      const allContactsResult = await this.repository.findAll()
      const allContacts = allContactsResult.data || []

      let filteredContacts = allContacts.filter(contact => {
        // Search in name and email (users table fields)
        const searchText = `${contact.name || ''} ${contact.email || ''}`.toLowerCase()
        const matchesQuery = searchText.includes(query.toLowerCase())

        // Apply role filter if specified
        const matchesRole = !options?.role || (contact.role === options.role)

        return matchesQuery && matchesRole
      })

      // Filter by team if specified
      if (options?.teamId) {
        filteredContacts = filteredContacts.filter(contact =>
          contact.team_id === options.teamId
        )
      }

      return { success: true as const, data: filteredContacts }
    } catch (error) {
      throw error
    }
  }

  /**
   * Add contact to lot via lot_contacts table (Phase 2 architecture)
   * @param lotId - Lot UUID
   * @param userId - User/Contact UUID
   * @param isPrimary - Whether this is the primary contact (default: false)
   */
  async addContactToLot(lotId: string, userId: string, isPrimary = false) {
    try {
      // Import and create lot contact repository
      const { createServerActionLotContactRepository } = await import('../repositories/lot-contact.repository')
      const lotContactRepo = await createServerActionLotContactRepository()

      // Assign contact using repository
      const result = await lotContactRepo.assignTenant(lotId, userId, isPrimary)

      if (result.success && result.data) {
        await this.logLotContactAssignment(lotId, userId, isPrimary)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Log contact creation activity (NEW SCHEMA)
   */
  private async logContactCreation(contact: Contact) {
    // In production, this would use the activity-logger service
    logger.info('User/Contact created:', contact.id, contact.email, contact.role)
  }

  /**
   * Log contact update activity (NEW SCHEMA)
   */
  private async logContactUpdate(contact: Contact, changes: ContactUpdate) {
    // In production, this would use the activity-logger service
    logger.info('User/Contact updated:', contact.id, changes)
  }

  /**
   * Log contact deletion activity (NEW SCHEMA)
   */
  private async logContactDeletion(contact: Contact) {
    // In production, this would use the activity-logger service
    logger.info('User/Contact deleted:', contact.id, contact.email, contact.role)
  }

  /**
   * Log team assignment activity (NEW SCHEMA)
   */
  private async logTeamAssignment(
    teamId: string,
    userId: string,
    role: 'admin' | 'member'
  ) {
    // In production, this would use the activity-logger service
    logger.info('User added to team:', { teamId, userId, role })
  }

  /**
   * Log team removal activity (NEW SCHEMA)
   */
  private async logTeamRemoval(
    teamId: string,
    userId: string
  ) {
    // In production, this would use the activity-logger service
    logger.info('User removed from team:', { teamId, userId })
  }

  /**
   * Log lot contact assignment activity (Phase 2)
   */
  private async logLotContactAssignment(
    lotId: string,
    userId: string,
    isPrimary: boolean
  ) {
    // In production, this would use the activity-logger service
    logger.info('✅ User assigned to lot via lot_contacts:', { lotId, userId, isPrimary })
  }
}

// Factory functions for creating service instances (NEW SCHEMA)
export const createContactService = (
  repository?: ContactRepository,
  userService?: UserService
) => {
  const repo = repository || createContactRepository()
  const users = userService || createUserService()
  return new ContactService(repo, users)
}

export const createServerContactService = async () => {
  const [repository, userService] = await Promise.all([
    createServerContactRepository(),
    createServerUserService()
  ])
  return new ContactService(repository, userService)
}

/**
 * Create Contact Service for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionContactRepository() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionContactService = async () => {
  const [repository, userService] = await Promise.all([
    createServerActionContactRepository(),
    createServerActionUserService()
  ])
  return new ContactService(repository, userService)
}
