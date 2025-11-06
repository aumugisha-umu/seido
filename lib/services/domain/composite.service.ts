/**
 * Composite Service - Phase 4.2
 * Orchestrates complex multi-service operations with transaction support
 */

import { UserService, createUserService, createServerUserService, createServerActionUserService } from './user.service'
import { BuildingService, createBuildingService, createServerBuildingService, createServerActionBuildingService } from './building.service'
import { LotService, createLotService, createServerLotService, createServerActionLotService } from './lot.service'
import { ContactService, createContactService, createServerContactService, createServerActionContactService } from './contact.service'
import { TeamService, createTeamService, createServerTeamService, createServerActionTeamService } from './team.service'
import type {
  User,
  Building,
  Lot,
  Contact,
  Team,
  ServiceResult
} from '../core/service-types'

/**
 * Complex operation data structures
 */
export interface CreateCompleteUserData {
  user: {
    email: string
    first_name: string
    last_name: string
    role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
    phone?: string
  }
  team?: {
    name: string
    description?: string
  }
  building?: {
    name: string
    address: string
    city: string
    postal_code: string
    country: string
  }
  lots?: Array<{
    name: string
    type: 'apartment' | 'commercial' | 'parking' | 'storage'
    floor?: number
    surface_area?: number
    rent_amount?: number
    charges_amount?: number
    deposit_amount?: number
  }>
}

export interface CreateCompleteBuildingData {
  building: {
    name: string
    address: string
    city: string
    postal_code: string
    country: string
    team_id: string
    created_by: string
  }
  lots: Array<{
    name: string
    type: 'apartment' | 'commercial' | 'parking' | 'storage'
    floor?: number
    surface_area?: number
    rent_amount?: number
    charges_amount?: number
    deposit_amount?: number
  }>
}

/**
 * Complete property creation with contacts and lot assignments
 * Used by building creation wizard
 */
export interface CreateCompletePropertyData {
  building: {
    name: string
    address: string
    city: string
    postal_code?: string
    country: string
    team_id: string
    description?: string
  }
  lots: Array<{
    reference: string
    floor?: number
    apartment_number?: string
    surface_area?: number
    rooms?: number
    charges_amount?: number
    category: string
    description?: string
  }>
  buildingContacts?: Array<{
    id: string
    type: string
    isPrimary: boolean
  }>
  lotContactAssignments: Array<{
    lotId: string // Temporary lot ID from frontend
    lotIndex: number // Index in lots array
    assignments: Array<{
      contactId: string
      contactType: string
      isPrimary: boolean
      isLotPrincipal?: boolean
    }>
  }>
}

export interface InviteTeamContactsData {
  teamId: string
  contacts: Array<{
    email: string
    first_name: string
    last_name: string
    role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
    phone?: string
  }>
  invitedBy: string
}

export interface TransferLotTenantData {
  lotId: string
  fromTenantId: string
  toTenantId: string
  transferDate: string
  reason?: string
  transferredBy: string
}

export interface BulkUserOperationsData {
  operations: Array<{
    type: 'create' | 'update' | 'delete'
    id?: string
    data?: unknown
  }>
  performedBy: string
}

export interface CompositeStatsRequest {
  teamId: string
  period: '24h' | '7d' | '30d'
  includeDetails?: boolean
  requestedBy: string
}

/**
 * Operation tracking for rollback capabilities
 */
export interface CompositeOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  service: string
  entity: string
  entityId?: string
  data?: unknown
  status: 'pending' | 'completed' | 'failed' | 'rolledback'
  timestamp: string
}

export interface CompositeOperationResult<T = unknown> {
  success: boolean
  data: T
  error?: string
  operations: CompositeOperation[]
  rollbackOperations?: CompositeOperation[]
  rollbackErrors?: string[]
  partialSuccess?: boolean
  validationErrors?: Record<string, string>
}

/**
 * Composite Service
 * Manages complex multi-service operations with transaction support and rollback capabilities
 */
export class CompositeService {
  constructor(
    private userService: UserService,
    private buildingService: BuildingService,
    private lotService: LotService,
    private teamService?: TeamService,
    private contactService?: ContactService
  ) {}

  /**
   * Create a complete user setup with team, building, and lots
   */
  async createCompleteUser(data: CreateCompleteUserData): Promise<CompositeOperationResult<{
    user: User
    team?: Team
    building?: Building
    lots?: Lot[]
  }>> {
    const operations: CompositeOperation[] = []
    const rollbackOperations: CompositeOperation[] = []
    let user: User | null = null
    let team: Team | null = null
    let building: Building | null = null
    const lots: Lot[] = []

    try {
      // Step 1: Create user
      const userOperation: CompositeOperation = {
        id: `user-${Date.now()}`,
        type: 'create',
        service: 'user',
        entity: 'user',
        data: data.user,
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(userOperation)

      const userResult = await this.userService.create(data.user)
      if (!userResult.success) {
        userOperation.status = 'failed'
        // ✅ Safely access error message from RepositoryError object
        const errorMsg = userResult.error?.message || String(userResult.error)
        throw new Error('User creation failed: ' + errorMsg)
      }

      user = userResult.data
      userOperation.entityId = user.id
      userOperation.status = 'completed'

      // Step 2: Create team (if specified)
      if (data.team) {
        const teamOperation: CompositeOperation = {
          id: `team-${Date.now()}`,
          type: 'create',
          service: 'team',
          entity: 'team',
          data: { ...data.team, created_by: user.id },
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(teamOperation)

        if (!this.teamService) {
          throw new Error('Team service not available')
        }

        const teamResult = await this.teamService.create({
          ...data.team,
          created_by: user.id
        })

        if (!teamResult.success) {
          teamOperation.status = 'failed'
          // ✅ Safely access error message from RepositoryError object
          const errorMsg = teamResult.error?.message || String(teamResult.error)
          throw new Error('Team creation failed: ' + errorMsg)
        }

        team = teamResult.data
        teamOperation.entityId = team.id
        teamOperation.status = 'completed'

        // Step 3: Update user with team_id
        const userUpdateOperation: CompositeOperation = {
          id: `user-update-${Date.now()}`,
          type: 'update',
          service: 'user',
          entity: 'user',
          entityId: user.id,
          data: { team_id: team.id },
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(userUpdateOperation)

        const userUpdateResult = await this.userService.update(user.id, { team_id: team.id })
        if (!userUpdateResult.success) {
          userUpdateOperation.status = 'failed'
          // ✅ Safely access error message from RepositoryError object
          const errorMsg = userUpdateResult.error?.message || String(userUpdateResult.error)
          throw new Error('User team assignment failed: ' + errorMsg)
        }

        user = userUpdateResult.data
        userUpdateOperation.status = 'completed'
      }

      // Step 4: Create building (if specified)
      if (data.building && team) {
        const buildingOperation: CompositeOperation = {
          id: `building-${Date.now()}`,
          type: 'create',
          service: 'building',
          entity: 'building',
          data: {
            ...data.building,
            team_id: team.id,
            created_by: user.id
          },
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(buildingOperation)

        const buildingResult = await this.buildingService.create({
          ...data.building,
          team_id: team.id,
          created_by: user.id
        })

        if (!buildingResult.success) {
          buildingOperation.status = 'failed'
          // ✅ Safely access error message from RepositoryError object
          const errorMsg = buildingResult.error?.message || String(buildingResult.error)
          throw new Error('Building creation failed: ' + errorMsg)
        }

        building = buildingResult.data
        buildingOperation.entityId = building.id
        buildingOperation.status = 'completed'

        // Step 5: Create lots (if specified)
        if (data.lots && data.lots.length > 0) {
          for (const lotData of data.lots) {
            const lotOperation: CompositeOperation = {
              id: `lot-${Date.now()}-${lots.length}`,
              type: 'create',
              service: 'lot',
              entity: 'lot',
              data: {
                ...lotData,
                building_id: building.id
              },
              status: 'pending',
              timestamp: new Date().toISOString()
            }
            operations.push(lotOperation)

            const lotResult = await this.lotService.create({
              ...lotData,
              building_id: building.id
            })

            if (!lotResult.success) {
              lotOperation.status = 'failed'
              // ✅ Safely access error message from RepositoryError object
              const errorMsg = lotResult.error?.message || String(lotResult.error)
              throw new Error('Lot creation failed: ' + errorMsg)
            }

            lots.push(lotResult.data)
            lotOperation.entityId = lotResult.data.id
            lotOperation.status = 'completed'
          }
        }
      }

      return {
        success: true,
        data: {
          user,
          team: team || undefined,
          building: building || undefined,
          lots: lots.length > 0 ? lots : undefined
        },
        operations
      }

    } catch (error) {
      // Rollback all completed operations
      const rollbackErrors: string[] = []

      for (const operation of operations.reverse()) {
        if (operation.status === 'completed') {
          try {
            const rollbackOp: CompositeOperation = {
              id: `rollback-${operation.id}`,
              type: 'delete',
              service: operation.service,
              entity: operation.entity,
              entityId: operation.entityId,
              status: 'pending',
              timestamp: new Date().toISOString()
            }

            switch (operation.service) {
              case 'user':
                if (operation.type === 'create' && operation.entityId) {
                  await this.userService.delete(operation.entityId)
                }
                break
              case 'team':
                if (operation.type === 'create' && operation.entityId && this.teamService) {
                  await this.teamService.delete(operation.entityId)
                }
                break
              case 'building':
                if (operation.type === 'create' && operation.entityId) {
                  await this.buildingService.delete(operation.entityId)
                }
                break
              case 'lot':
                if (operation.type === 'create' && operation.entityId) {
                  await this.lotService.delete(operation.entityId)
                }
                break
            }

            rollbackOp.status = 'completed'
            rollbackOperations.push(rollbackOp)
          } catch (rollbackError) {
            rollbackErrors.push(`Failed to rollback ${operation.service} ${operation.entityId}: ${rollbackError}`)
          }
        }
      }

      return {
        success: false,
        data: {
          user: user || {} as User,
          team: team || undefined,
          building: building || undefined,
          lots: lots.length > 0 ? lots : undefined
        },
        error: error instanceof Error ? error.message : String(error),
        operations,
        rollbackOperations,
        rollbackErrors: rollbackErrors.length > 0 ? rollbackErrors : undefined
      }
    }
  }

  /**
   * Create a building with multiple lots
   */
  async createCompleteBuilding(data: CreateCompleteBuildingData): Promise<CompositeOperationResult<{
    building: Building
    lots: Lot[]
  }>> {
    const operations: CompositeOperation[] = []
    const rollbackOperations: CompositeOperation[] = []
    let building: Building | null = null
    const lots: Lot[] = []

    try {
      // Step 1: Create building
      const buildingOperation: CompositeOperation = {
        id: `building-${Date.now()}`,
        type: 'create',
        service: 'building',
        entity: 'building',
        data: data.building,
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(buildingOperation)

      const buildingResult = await this.buildingService.create(data.building)
      if (!buildingResult.success) {
        buildingOperation.status = 'failed'
        // ✅ Safely access error message from RepositoryError object
        const errorMsg = buildingResult.error?.message || String(buildingResult.error)
        throw new Error('Building creation failed: ' + errorMsg)
      }

      building = buildingResult.data
      buildingOperation.entityId = building.id
      buildingOperation.status = 'completed'

      // Step 2: Create lots
      for (const lotData of data.lots) {
        const lotOperation: CompositeOperation = {
          id: `lot-${Date.now()}-${lots.length}`,
          type: 'create',
          service: 'lot',
          entity: 'lot',
          data: {
            ...lotData,
            building_id: building.id
          },
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(lotOperation)

        const lotResult = await this.lotService.create({
          ...lotData,
          building_id: building.id
        })

        if (!lotResult.success) {
          lotOperation.status = 'failed'
          // ✅ Safely access error message from RepositoryError object
          const errorMsg = lotResult.error?.message || String(lotResult.error)
          throw new Error('Lot creation failed: ' + errorMsg)
        }

        lots.push(lotResult.data)
        lotOperation.entityId = lotResult.data.id
        lotOperation.status = 'completed'
      }

      return {
        success: true,
        data: {
          building,
          lots
        },
        operations
      }

    } catch (error) {
      // Rollback logic similar to createCompleteUser
      const rollbackErrors: string[] = []

      for (const operation of operations.reverse()) {
        if (operation.status === 'completed') {
          try {
            const rollbackOp: CompositeOperation = {
              id: `rollback-${operation.id}`,
              type: 'delete',
              service: operation.service,
              entity: operation.entity,
              entityId: operation.entityId,
              status: 'pending',
              timestamp: new Date().toISOString()
            }

            if (operation.service === 'building' && operation.entityId) {
              await this.buildingService.delete(operation.entityId)
            } else if (operation.service === 'lot' && operation.entityId) {
              await this.lotService.delete(operation.entityId)
            }

            rollbackOp.status = 'completed'
            rollbackOperations.push(rollbackOp)
          } catch (rollbackError) {
            rollbackErrors.push(`Failed to rollback ${operation.service} ${operation.entityId}: ${rollbackError}`)
          }
        }
      }

      return {
        success: false,
        data: {
          building: building || {} as Building,
          lots
        },
        error: error instanceof Error ? error.message : String(error),
        operations,
        rollbackOperations,
        rollbackErrors: rollbackErrors.length > 0 ? rollbackErrors : undefined
      }
    }
  }

  /**
   * Create complete property with building, lots, and contact assignments
   * This is the main method used by the building creation wizard
   */
  async createCompleteProperty(data: CreateCompletePropertyData): Promise<CompositeOperationResult<{
    building: Building
    lots: Lot[]
  }>> {
    const operations: CompositeOperation[] = []
    const rollbackOperations: CompositeOperation[] = []
    let building: Building | null = null
    const lots: Lot[] = []

    try {
      // Step 1: Create building
      const buildingOperation: CompositeOperation = {
        id: `building-${Date.now()}`,
        type: 'create',
        service: 'building',
        entity: 'building',
        data: data.building,
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(buildingOperation)

      const buildingResult = await this.buildingService.create(data.building)
      if (!buildingResult.success) {
        buildingOperation.status = 'failed'
        // ✅ Safely access error message from RepositoryError object
        const errorMsg = buildingResult.error?.message || String(buildingResult.error)
        throw new Error('Building creation failed: ' + errorMsg)
      }

      building = buildingResult.data
      buildingOperation.entityId = building.id
      buildingOperation.status = 'completed'

      // Step 1.5: Create building_contacts (OPTIMIZED: Bulk insert)
      if (data.buildingContacts && data.buildingContacts.length > 0) {
        // Prepare all building contacts for bulk insert
        const buildingContactsToInsert = data.buildingContacts.map(contact => ({
          building_id: building.id,
          user_id: contact.id,
          is_primary: contact.isPrimary
        }))

        // Single bulk insert instead of loop
        const { error: insertError } = await this.buildingService['repository']['supabase']
          .from('building_contacts')
          .insert(buildingContactsToInsert)

        if (insertError) {
          throw new Error(`Building contacts assignment failed: ${insertError.message}`)
        }

        // Track operation
        operations.push({
          id: `building-contacts-bulk-${Date.now()}`,
          type: 'create',
          service: 'contact',
          entity: 'building_contact',
          data: buildingContactsToInsert,
          status: 'completed',
          timestamp: new Date().toISOString()
        })
      }

      // Step 2: Create lots
      for (let i = 0; i < data.lots.length; i++) {
        const lotData = data.lots[i]
        const lotOperation: CompositeOperation = {
          id: `lot-${Date.now()}-${i}`,
          type: 'create',
          service: 'lot',
          entity: 'lot',
          data: {
            ...lotData,
            building_id: building.id,
            team_id: data.building.team_id
          },
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(lotOperation)

        const lotResult = await this.lotService.create({
          ...lotData,
          building_id: building.id,
          team_id: data.building.team_id
        })

        if (!lotResult.success) {
          lotOperation.status = 'failed'
          // ✅ Safely access error message from RepositoryError object
          const errorMsg = lotResult.error?.message || String(lotResult.error)
          throw new Error(`Lot creation failed for ${lotData.reference}: ` + errorMsg)
        }

        lots.push(lotResult.data)
        lotOperation.entityId = lotResult.data.id
        lotOperation.status = 'completed'
      }

      // Step 3: Handle contact assignments to lots (OPTIMIZED: Bulk insert)
      if (data.lotContactAssignments && data.lotContactAssignments.length > 0) {
        // Prepare all lot contacts for bulk insert
        const allLotContactsToInsert: Array<{
          lot_id: string
          user_id: string
          is_primary: boolean
        }> = []

        for (const assignment of data.lotContactAssignments) {
          const lotIndex = assignment.lotIndex
          if (lotIndex < 0 || lotIndex >= lots.length) {
            throw new Error(`Invalid lot index: ${lotIndex}`)
          }

          const createdLot = lots[lotIndex]

          for (const contactAssignment of assignment.assignments) {
            allLotContactsToInsert.push({
              lot_id: createdLot.id,
              user_id: contactAssignment.contactId,
              is_primary: contactAssignment.isLotPrincipal || contactAssignment.isPrimary || false
            })
          }
        }

        // Single bulk insert for all lot contacts
        if (allLotContactsToInsert.length > 0) {
          const { error: insertError } = await this.buildingService['repository']['supabase']
            .from('lot_contacts')
            .insert(allLotContactsToInsert)

          if (insertError) {
            throw new Error(`Lot contacts assignment failed: ${insertError.message}`)
          }

          // Track operation
          operations.push({
            id: `lot-contacts-bulk-${Date.now()}`,
            type: 'create',
            service: 'contact',
            entity: 'lot_contact',
            data: allLotContactsToInsert,
            status: 'completed',
            timestamp: new Date().toISOString()
          })
        }
      }

      return {
        success: true,
        data: {
          building,
          lots
        },
        operations
      }

    } catch (error) {
      // Rollback logic
      const rollbackErrors: string[] = []

      // Rollback in reverse order: contacts -> lots -> building
      for (const operation of operations.reverse()) {
        if (operation.status === 'completed') {
          try {
            const rollbackOp: CompositeOperation = {
              id: `rollback-${operation.id}`,
              type: 'delete',
              service: operation.service,
              entity: operation.entity,
              entityId: operation.entityId,
              status: 'pending',
              timestamp: new Date().toISOString()
            }

            if (operation.entity === 'building' && operation.entityId) {
              await this.buildingService.delete(operation.entityId)
            } else if (operation.entity === 'lot' && operation.entityId) {
              await this.lotService.delete(operation.entityId)
            } else if (operation.entity === 'lot_contact' && operation.data) {
              // Delete from lot_contacts junction table
              const assignmentData = operation.data as any
              await this.buildingService['repository']['supabase']
                .from('lot_contacts')
                .delete()
                .eq('lot_id', assignmentData.lot_id)
                .eq('user_id', assignmentData.user_id)
            }

            rollbackOp.status = 'completed'
            rollbackOperations.push(rollbackOp)
          } catch (rollbackError) {
            rollbackErrors.push(`Failed to rollback ${operation.entity} ${operation.entityId}: ${rollbackError}`)
          }
        }
      }

      return {
        success: false,
        data: {
          building: building || {} as Building,
          lots
        },
        error: error instanceof Error ? error.message : String(error),
        operations,
        rollbackOperations,
        rollbackErrors: rollbackErrors.length > 0 ? rollbackErrors : undefined
      }
    }
  }

  /**
   * Update complete property with differential updates for lots and contacts
   * Handles new lots, updated lots, deleted lots, and contact reassignments
   */
  async updateCompleteProperty(data: {
    buildingId: string
    building: Partial<Building>
    lots: {
      new: Partial<Lot>[]
      updated: Array<Partial<Lot> & { id: string }>
      deleted: string[]
    }
    buildingContacts?: Array<{ id: string; type: string; isPrimary: boolean }>
    lotContactAssignments?: Array<{
      lotId: string
      assignments: Array<{
        contactId: string
        contactType: string
        isPrimary: boolean
        isLotPrincipal?: boolean
      }>
    }>
  }): Promise<CompositeOperationResult<{
    building: Building
    lots: Lot[]
  }>> {
    const operations: CompositeOperation[] = []
    let building: Building | null = null
    const lots: Lot[] = []

    try {
      // Step 1: Update building
      const buildingOperation: CompositeOperation = {
        id: `building-update-${Date.now()}`,
        type: 'update',
        service: 'building',
        entity: 'building',
        entityId: data.buildingId,
        data: data.building,
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(buildingOperation)

      const buildingResult = await this.buildingService.update(data.buildingId, data.building)
      if (!buildingResult.success) {
        buildingOperation.status = 'failed'
        const errorMsg = buildingResult.error?.message || String(buildingResult.error)
        throw new Error('Building update failed: ' + errorMsg)
      }

      building = buildingResult.data
      buildingOperation.status = 'completed'

      // Step 2: Update building_contacts (OPTIMIZED: Bulk insert)
      if (data.buildingContacts && data.buildingContacts.length > 0) {
        // Delete all existing building_contacts
        await this.buildingService['repository']['supabase']
          .from('building_contacts')
          .delete()
          .eq('building_id', data.buildingId)

        // Prepare all building contacts for bulk insert
        const buildingContactsToInsert = data.buildingContacts.map(contact => ({
          building_id: data.buildingId,
          user_id: contact.id,
          is_primary: contact.isPrimary
        }))

        // Single bulk insert instead of loop
        const { error: insertError } = await this.buildingService['repository']['supabase']
          .from('building_contacts')
          .insert(buildingContactsToInsert)

        if (insertError) {
          throw new Error(`Building contacts assignment failed: ${insertError.message}`)
        }

        // Track operation
        operations.push({
          id: `building-contacts-bulk-${Date.now()}`,
          type: 'create',
          service: 'contact',
          entity: 'building_contact',
          data: buildingContactsToInsert,
          status: 'completed',
          timestamp: new Date().toISOString()
        })
      }

      // Step 3: Delete removed lots (OPTIMIZED: Parallel execution)
      if (data.lots.deleted.length > 0) {
        const deletePromises = data.lots.deleted.map(async (deletedLotId) => {
          const deleteOperation: CompositeOperation = {
            id: `lot-delete-${Date.now()}-${deletedLotId}`,
            type: 'delete',
            service: 'lot',
            entity: 'lot',
            entityId: deletedLotId,
            status: 'pending',
            timestamp: new Date().toISOString()
          }
          operations.push(deleteOperation)

          const deleteResult = await this.lotService.delete(deletedLotId)
          if (!deleteResult.success) {
            deleteOperation.status = 'failed'
            const errorMsg = deleteResult.error?.message || String(deleteResult.error)
            throw new Error(`Lot deletion failed for ${deletedLotId}: ` + errorMsg)
          }

          deleteOperation.status = 'completed'
        })

        await Promise.all(deletePromises)
      }

      // Step 4: Update existing lots (OPTIMIZED: Parallel execution)
      if (data.lots.updated.length > 0) {
        const updatePromises = data.lots.updated.map(async (lotData) => {
          const updateOperation: CompositeOperation = {
            id: `lot-update-${Date.now()}-${lotData.id}`,
            type: 'update',
            service: 'lot',
            entity: 'lot',
            entityId: lotData.id,
            data: lotData,
            status: 'pending',
            timestamp: new Date().toISOString()
          }
          operations.push(updateOperation)

          const lotResult = await this.lotService.update(lotData.id, lotData)
          if (!lotResult.success) {
            updateOperation.status = 'failed'
            const errorMsg = lotResult.error?.message || String(lotResult.error)
            throw new Error(`Lot update failed for ${lotData.id}: ` + errorMsg)
          }

          lots.push(lotResult.data)
          updateOperation.status = 'completed'
          return lotResult.data
        })

        await Promise.all(updatePromises)
      }

      // Step 5: Create new lots (OPTIMIZED: Parallel execution)
      if (data.lots.new.length > 0) {
        const createPromises = data.lots.new.map(async (lotData) => {
          const createOperation: CompositeOperation = {
            id: `lot-create-${Date.now()}-${Math.random()}`,
            type: 'create',
            service: 'lot',
            entity: 'lot',
            data: {
              ...lotData,
              building_id: data.buildingId,
              team_id: building.team_id
            },
            status: 'pending',
            timestamp: new Date().toISOString()
          }
          operations.push(createOperation)

          const lotResult = await this.lotService.create({
            ...lotData,
            building_id: data.buildingId,
            team_id: building.team_id
          })

          if (!lotResult.success) {
            createOperation.status = 'failed'
            const errorMsg = lotResult.error?.message || String(lotResult.error)
            throw new Error(`Lot creation failed: ` + errorMsg)
          }

          lots.push(lotResult.data)
          createOperation.entityId = lotResult.data.id
          createOperation.status = 'completed'
          return lotResult.data
        })

        await Promise.all(createPromises)
      }

      // Step 6: Update lot contact assignments (OPTIMIZED: Parallel + Bulk)
      if (data.lotContactAssignments && data.lotContactAssignments.length > 0) {
        // Process all lots in parallel
        const lotContactPromises = data.lotContactAssignments.map(async (assignment) => {
          // Delete existing lot_contacts for this lot
          await this.buildingService['repository']['supabase']
            .from('lot_contacts')
            .delete()
            .eq('lot_id', assignment.lotId)

          // Prepare all contacts for bulk insert
          if (assignment.assignments.length > 0) {
            const contactsToInsert = assignment.assignments.map(contactAssignment => ({
              lot_id: assignment.lotId,
              user_id: contactAssignment.contactId,
              is_primary: contactAssignment.isLotPrincipal || contactAssignment.isPrimary || false
            }))

            // Single bulk insert for all contacts of this lot
            const { error: insertError } = await this.buildingService['repository']['supabase']
              .from('lot_contacts')
              .insert(contactsToInsert)

            if (insertError) {
              throw new Error(`Contact assignment failed for lot ${assignment.lotId}: ` + insertError.message)
            }

            // Track operation
            operations.push({
              id: `lot-contacts-bulk-${assignment.lotId}-${Date.now()}`,
              type: 'create',
              service: 'contact',
              entity: 'lot_contact',
              data: contactsToInsert,
              status: 'completed',
              timestamp: new Date().toISOString()
            })
          }
        })

        await Promise.all(lotContactPromises)
      }

      // ✅ Cache invalidation now handled by Server Actions (building-actions.ts)
      // Server Actions call revalidateTag() and revalidatePath() after successful operations
      // This ensures Next.js 15 Data Cache and Router Cache are properly invalidated

      // Load all lots for the building to return complete data
      const allLotsResult = await this.buildingService.getById(data.buildingId)
      const allLots = allLotsResult?.lots || lots

      return {
        success: true,
        data: {
          building,
          lots: allLots
        },
        operations
      }

    } catch (error) {
      return {
        success: false,
        data: {
          building: building || {} as Building,
          lots
        },
        error: error instanceof Error ? error.message : String(error),
        operations
      }
    }
  }

  /**
   * Invite multiple contacts to a team
   */
  async inviteTeamContacts(data: InviteTeamContactsData): Promise<CompositeOperationResult<{
    invitations: Array<{ contact: Contact; invited: boolean }>
  }>> {
    const operations: CompositeOperation[] = []
    const invitations: Array<{ contact: Contact; invited: boolean }> = []
    let hasErrors = false

    if (!this.contactService) {
      return {
        success: false,
        data: { invitations: [] },
        error: 'Contact service not available',
        operations
      }
    }

    for (const contactData of data.contacts) {
      try {
        // Create contact
        const contactOperation: CompositeOperation = {
          id: `contact-${Date.now()}-${invitations.length}`,
          type: 'create',
          service: 'contact',
          entity: 'contact',
          data: {
            ...contactData,
            team_id: data.teamId,
            created_by: data.invitedBy
          },
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(contactOperation)

        const contactResult = await this.contactService.create({
          ...contactData,
          team_id: data.teamId,
          created_by: data.invitedBy
        })

        if (!contactResult.success) {
          contactOperation.status = 'failed'
          hasErrors = true
          continue
        }

        const contact = contactResult.data
        contactOperation.entityId = contact.id
        contactOperation.status = 'completed'

        // Send invitation
        const inviteOperation: CompositeOperation = {
          id: `invite-${Date.now()}-${invitations.length}`,
          type: 'update',
          service: 'contact',
          entity: 'invitation',
          entityId: contact.id,
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(inviteOperation)

        const inviteResult = await this.contactService.invite(contact.id)
        if (!inviteResult.success) {
          inviteOperation.status = 'failed'
          hasErrors = true
          invitations.push({ contact, invited: false })
        } else {
          inviteOperation.status = 'completed'
          invitations.push({ contact, invited: true })
        }

      } catch (error) {
        hasErrors = true
      }
    }

    return {
      success: !hasErrors,
      data: { invitations },
      error: hasErrors ? 'Some contact invitations failed' : undefined,
      operations,
      partialSuccess: hasErrors && invitations.length > 0
    }
  }

  /**
   * Transfer lot tenant
   */
  async transferLotTenant(data: TransferLotTenantData): Promise<CompositeOperationResult<{
    lot: Lot
  }>> {
    const operations: CompositeOperation[] = []

    try {
      // Validate lot exists
      const lotResult = await this.lotService.getById(data.lotId)
      if (!lotResult.success) {
        throw new Error('Lot not found: ' + data.lotId)
      }

      const lot = lotResult.data

      // Validate current tenant
      if (lot.tenant_id !== data.fromTenantId) {
        throw new Error('Current tenant mismatch')
      }

      // Validate new tenant exists
      const fromTenantResult = await this.userService.getById(data.fromTenantId)
      const toTenantResult = await this.userService.getById(data.toTenantId)

      if (!fromTenantResult.success) {
        throw new Error('Current tenant not found: ' + data.fromTenantId)
      }

      if (!toTenantResult.success) {
        throw new Error('New tenant not found: ' + data.toTenantId)
      }

      // Transfer tenant
      const transferOperation: CompositeOperation = {
        id: `transfer-${Date.now()}`,
        type: 'update',
        service: 'lot',
        entity: 'tenant_assignment',
        entityId: data.lotId,
        data: { tenant_id: data.toTenantId },
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(transferOperation)

      const transferResult = await this.lotService.assignTenant(data.lotId, data.toTenantId)
      if (!transferResult.success) {
        transferOperation.status = 'failed'
        // ✅ Safely access error message from RepositoryError object
        const errorMsg = transferResult.error?.message || String(transferResult.error)
        throw new Error('Tenant transfer failed: ' + errorMsg)
      }

      transferOperation.status = 'completed'

      return {
        success: true,
        data: {
          lot: transferResult.data
        },
        operations
      }

    } catch (error) {
      return {
        success: false,
        data: {
          lot: {} as Lot
        },
        error: error instanceof Error ? error.message : String(error),
        operations
      }
    }
  }

  /**
   * Perform bulk user operations
   */
  async bulkUserOperations(data: BulkUserOperationsData): Promise<CompositeOperationResult<{
    results: Array<{ success: boolean; data?: User; error?: string }>
  }>> {
    const operations: CompositeOperation[] = []
    const results: Array<{ success: boolean; data?: User; error?: string }> = []
    let hasErrors = false

    for (const operation of data.operations) {
      try {
        // Validate operation type
        if (!['create', 'update', 'delete'].includes(operation.type)) {
          throw new Error('Invalid operation type: ' + operation.type)
        }

        const compositeOp: CompositeOperation = {
          id: `bulk-${Date.now()}-${results.length}`,
          type: operation.type,
          service: 'user',
          entity: 'user',
          entityId: operation.id,
          data: operation.data,
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(compositeOp)

        let result: ServiceResult<unknown>

        switch (operation.type) {
          case 'create':
            result = await this.userService.create(operation.data)
            break
          case 'update':
            if (!operation.id) throw new Error('ID required for update operation')
            result = await this.userService.update(operation.id, operation.data)
            break
          case 'delete':
            if (!operation.id) throw new Error('ID required for delete operation')
            result = await this.userService.delete(operation.id)
            break
          default:
            throw new Error('Unsupported operation type')
        }

        if (result.success) {
          compositeOp.status = 'completed'
          results.push({ success: true, data: result.data })
        } else {
          compositeOp.status = 'failed'
          hasErrors = true
          results.push({ success: false, error: result.error })
        }

      } catch (error) {
        hasErrors = true
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return {
      success: !hasErrors,
      data: { results },
      error: hasErrors ? 'Some operations failed' : undefined,
      operations,
      partialSuccess: hasErrors && results.some(r => r.success)
    }
  }

  /**
   * Get composite statistics from multiple services
   */
  async getCompositeStats(request: CompositeStatsRequest): Promise<CompositeOperationResult<{
    team?: Team
    buildings?: Building[]
    users?: User[]
  }>> {
    const operations: CompositeOperation[] = []
    let hasErrors = false
    const data: {
      team?: Team
      buildings?: Building[]
      users?: User[]
    } = {}

    try {
      // Get team stats
      if (this.teamService) {
        const teamOp: CompositeOperation = {
          id: `stats-team-${Date.now()}`,
          type: 'create',
          service: 'team',
          entity: 'stats',
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(teamOp)

        try {
          const teamResult = await this.teamService.getById(request.teamId)
          if (teamResult.success) {
            data.team = teamResult.data
            teamOp.status = 'completed'
          } else {
            teamOp.status = 'failed'
            hasErrors = true
          }
        } catch (error) {
          teamOp.status = 'failed'
          hasErrors = true
        }
      }

      // Get building stats
      const buildingOp: CompositeOperation = {
        id: `stats-buildings-${Date.now()}`,
        type: 'create',
        service: 'building',
        entity: 'stats',
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(buildingOp)

      try {
        const buildingsResult = await this.buildingService.getByTeam(request.teamId)
        if (buildingsResult.success) {
          data.buildings = buildingsResult.data
          buildingOp.status = 'completed'
        } else {
          buildingOp.status = 'failed'
          hasErrors = true
        }
      } catch (error) {
        buildingOp.status = 'failed'
        hasErrors = true
        throw new Error('Failed to fetch buildings stats')
      }

      // Get user stats
      const userOp: CompositeOperation = {
        id: `stats-users-${Date.now()}`,
        type: 'create',
        service: 'user',
        entity: 'stats',
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(userOp)

      try {
        const usersResult = await this.userService.getAll()
        if (usersResult.success) {
          data.users = usersResult.data
          userOp.status = 'completed'
        } else {
          userOp.status = 'failed'
          hasErrors = true
        }
      } catch (error) {
        userOp.status = 'failed'
        hasErrors = true
      }

      return {
        success: !hasErrors,
        data,
        operations,
        partialSuccess: hasErrors && Object.keys(data).length > 0
      }

    } catch (error) {
      return {
        success: false,
        data,
        error: error instanceof Error ? error.message : String(error),
        operations,
        partialSuccess: Object.keys(data).length > 0
      }
    }
  }
}

// Factory functions for creating service instances
export const createCompositeService = (
  userService?: UserService,
  buildingService?: BuildingService,
  lotService?: LotService,
  teamService?: TeamService,
  contactService?: ContactService
) => {
  const users = userService || createUserService()
  const buildings = buildingService || createBuildingService()
  const lots = lotService || createLotService()
  const teams = teamService || createTeamService()
  const contacts = contactService || createContactService()

  return new CompositeService(users, buildings, lots, teams, contacts)
}

export const createServerCompositeService = async () => {
  const [
    userService,
    buildingService,
    lotService,
    teamService,
    contactService
  ] = await Promise.all([
    createServerUserService(),
    createServerBuildingService(),
    createServerLotService(),
    createServerTeamService(),
    createServerContactService()
  ])

  return new CompositeService(
    userService,
    buildingService,
    lotService,
    teamService,
    contactService
  )
}

/**
 * Create Composite Service for Server Actions (READ-WRITE)
 * ✅ Uses createServerAction*Service() factories which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 *
 * This is the CRITICAL factory for Server Actions like building creation
 */
export const createServerActionCompositeService = async () => {
  const [
    userService,
    buildingService,
    lotService,
    teamService,
    contactService
  ] = await Promise.all([
    createServerActionUserService(),
    createServerActionBuildingService(),
    createServerActionLotService(),
    createServerActionTeamService(),
    createServerActionContactService()
  ])

  return new CompositeService(
    userService,
    buildingService,
    lotService,
    teamService,
    contactService
  )
}
