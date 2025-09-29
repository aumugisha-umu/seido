/**
 * Composite Service - Phase 4.2
 * Orchestrates complex multi-service operations with transaction support
 */

import { UserService, createUserService, createServerUserService } from './user.service'
import { BuildingService, createBuildingService, createServerBuildingService } from './building.service'
import { LotService, createLotService, createServerLotService } from './lot.service'
import { ContactService, createContactService, createServerContactService } from './contact.service'
import { TeamService, createTeamService, createServerTeamService } from './team.service'
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
        throw new Error('User creation failed: ' + userResult.error)
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
          throw new Error('Team creation failed: ' + teamResult.error)
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
          throw new Error('User team assignment failed: ' + userUpdateResult.error)
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
          throw new Error('Building creation failed: ' + buildingResult.error)
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
              throw new Error('Lot creation failed: ' + lotResult.error)
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
        throw new Error('Building creation failed: ' + buildingResult.error)
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
          throw new Error('Lot creation failed: ' + lotResult.error)
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
            team_id: data._teamId,
            created_by: data.invitedBy
          },
          status: 'pending',
          timestamp: new Date().toISOString()
        }
        operations.push(contactOperation)

        const contactResult = await this.contactService.create({
          ...contactData,
          team_id: data._teamId,
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
      const lotResult = await this.lotService.getById(data._lotId)
      if (!lotResult.success) {
        throw new Error('Lot not found: ' + data._lotId)
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
        entityId: data._lotId,
        data: { tenant_id: data.toTenantId },
        status: 'pending',
        timestamp: new Date().toISOString()
      }
      operations.push(transferOperation)

      const transferResult = await this.lotService.assignTenant(data._lotId, data.toTenantId)
      if (!transferResult.success) {
        transferOperation.status = 'failed'
        throw new Error('Tenant transfer failed: ' + transferResult.error)
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
          const teamResult = await this.teamService.getById(request._teamId)
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
        const buildingsResult = await this.buildingService.getByTeam(request._teamId)
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
