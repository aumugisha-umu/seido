/**
 * Database Service Compatibility Layer
 *
 * This file provides a drop-in replacement for the legacy database-service.ts
 * that maintains the exact same API while using the new modular architecture underneath.
 *
 * The goal is to allow all 67 existing files to continue working without changes
 * while benefiting from the new architecture's improvements.
 */

import {
  createServerUserService,
  createServerBuildingService,
  createServerLotService,
  type User,
  type Team,
  type TeamMember,
  type Database
} from '@/lib/services'

// Legacy types re-exported for compatibility
export type { User, Building, Lot, Intervention, Contact } from '@/lib/services'

// Legacy interfaces maintained for compatibility
export interface Team {
  id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: string
  joined_at: string
  is_active: boolean
}

// Service instances (will be initialized lazily)
let userServiceInstance: Awaited<ReturnType<typeof createServerUserService>> | null = null
let buildingServiceInstance: Awaited<ReturnType<typeof createServerBuildingService>> | null = null
let lotServiceInstance: Awaited<ReturnType<typeof createServerLotService>> | null = null

// Helper to get or create user service instance
async function getUserService() {
  if (!userServiceInstance) {
    userServiceInstance = await createServerUserService()
  }
  return userServiceInstance
}

// Helper to get or create building service instance
async function getBuildingService() {
  if (!buildingServiceInstance) {
    buildingServiceInstance = await createServerBuildingService()
  }
  return buildingServiceInstance
}

// Helper to get or create lot service instance
async function getLotService() {
  if (!lotServiceInstance) {
    lotServiceInstance = await createServerLotService()
  }
  return lotServiceInstance
}

// Helper to unwrap repository responses and throw on error (legacy behavior)
function unwrapResponse<T>(response: { success: boolean; data?: T; error?: { message?: string; code?: string } }): T {
  if (!response.success) {
    const error = new Error(response.error?.message || 'Database operation failed')
    if (response.error?.code) {
      (error as Error & { code?: string }).code = response.error.code
    }
    throw error
  }
  if (response.data === null || response.data === undefined) {
    throw new Error('No data returned from database')
  }
  return response.data
}

// Helper to unwrap array responses
function unwrapArrayResponse<T>(response: { success: boolean; data?: T[]; error?: { message?: string; code?: string } }): T[] {
  if (!response.success) {
    const error = new Error(response.error?.message || 'Database operation failed')
    if (response.error?.code) {
      (error as Error & { code?: string }).code = response.error.code
    }
    throw error
  }
  return response.data || []
}

/**
 * User Service - Legacy API Compatibility
 */
export const userService = {
  async getAll() {
    const service = await getUserService()
    const response = await service.getAll()
    return unwrapArrayResponse(response)
  },

  async getByRole(role: User['role']) {
    const service = await getUserService()
    const response = await service.getUsersByRole(role)
    return unwrapArrayResponse(response)
  },

  async getById(id: string) {
    // Ensure ID is a string (matching legacy behavior)
    const userId = typeof id === 'string' ? id : String(id)

    console.log('🔍 [DATABASE-SERVICE-COMPAT] Getting user by ID:', {
      requestedId: userId,
      originalType: typeof id,
      timestamp: new Date().toISOString()
    })

    // Validate input
    if (!userId) {
      const error = new Error('User ID is required')
      console.error('❌ [DATABASE-SERVICE-COMPAT] Missing user ID')
      throw error
    }

    try {
      const service = await getUserService()
      const response = await service.getById(userId)

      if (!response.success) {
        console.error('❌ [DATABASE-SERVICE-COMPAT] Service error in getById:', {
          message: response.error?.message || 'Unknown error',
          code: response.error?.code || 'NO_CODE',
          userId: userId
        })
        const error = new Error(response.error?.message || 'User not found')
        if (response.error?.code) {
          (error as Error & { code?: string }).code = response.error.code
        }
        throw error
      }

      if (!response.data) {
        const notFoundError = new Error(`User not found with ID: ${userId}`)
        console.error('❌ User not found:', { userId: userId })
        throw notFoundError
      }

      console.log('✅ [DATABASE-SERVICE-COMPAT] User found:', {
        name: response.data?.name || 'Unknown name',
        id: response.data?.id,
        email: response.data?.email,
        role: response.data?.role,
        team_id: response.data?.team_id
      })

      return response.data
    } catch (error) {
      console.error('❌ Exception in userService.getById:', {
        userId: userId,
        errorType: error?.constructor?.name || 'Unknown',
        message: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  },

  async getByEmail(email: string) {
    const service = await getUserService()
    const response = await service.getByEmail(email)

    if (!response.success) {
      const error = new Error(response.error?.message || 'User not found')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }

    return response.data
  },

  async create(user: Database['public']['Tables']['users']['Insert']) {
    console.log('🔄 Creating user in database (compat layer):', user)

    const service = await getUserService()
    const response = await service.create(user)

    if (!response.success) {
      console.error('❌ Database error creating user:')
      console.error('Error message:', response.error?.message)
      console.error('Error code:', response.error?.code)
      console.error('User data:', user)
      const error = new Error(response.error?.message || 'Failed to create user')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }

    console.log('✅ User successfully created in database (compat layer):', response.data)
    return response.data
  },

  async update(id: string, updates: Database['public']['Tables']['users']['Update']) {
    const service = await getUserService()
    const response = await service.update(id, updates)
    return unwrapResponse(response)
  },

  async delete(_id: string) {
    const service = await getUserService()
    const response = await service.delete(id)
    if (!response.success) {
      const error = new Error(response.error?.message || 'Failed to delete user')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }
    return true
  },

  async findByEmail(_email: string) {
    console.log('🔍 [USER-SERVICE-COMPAT] Finding user by email:', email)
    const service = await getUserService()
    const response = await service.getByEmail(email)

    if (!response.success && response.error?.code !== 'NOT_FOUND') {
      console.error('❌ [USER-SERVICE-COMPAT] Error finding user by email:', response.error)
      const error = new Error(response.error?.message || 'Database error')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }

    console.log('✅ [USER-SERVICE-COMPAT] User found:', response.data ? 'yes' : 'no')
    return response.data || null
  },

  async findByAuthUserId(_authUserId: string) {
    console.log('🔍 [USER-SERVICE-COMPAT] Finding user by auth_user_id:', authUserId)
    const service = await getUserService()
    const response = await service.getByAuthUserId(authUserId)

    if (!response.success && response.error?.code !== 'NOT_FOUND') {
      console.error('❌ [USER-SERVICE-COMPAT] Error finding user by auth_user_id:', response.error)
      const error = new Error(response.error?.message || 'Database error')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }

    console.log('✅ [USER-SERVICE-COMPAT] User found by auth_user_id:', response.data ? 'yes' : 'no')
    return response.data || null
  },

  async getTeamUsers(_teamId: string) {
    console.log('🔍 [USER-SERVICE-COMPAT] Getting users for team:', _teamId)
    const service = await getUserService()
    const response = await service.getUsersByTeam(_teamId)

    if (!response.success) {
      console.error('❌ [USER-SERVICE-COMPAT] Error getting team users:', response.error)
      const error = new Error(response.error?.message || 'Database error')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }

    console.log('✅ [USER-SERVICE-COMPAT] Team users found:', response.data?.length || 0)
    return response.data || []
  }
}

/**
 * Building Service - Legacy API Compatibility
 *
 * Note: Some methods are placeholders that will fallback to legacy implementation
 * until the new building service is fully implemented with all required features.
 */
export const _buildingService = {
  async getAll() {
    const service = await getBuildingService()
    const response = await service.getAll()

    // For now, return the basic data. The legacy version had complex joins
    // that will need to be implemented in the new architecture
    const buildings = unwrapArrayResponse(response)

    // TODO: Add post-processing for manager extraction when building contacts are implemented
    return buildings.map(building => ({
      ...building,
      manager: null // Placeholder until building_contacts are implemented
    }))
  },

  async getTeamBuildings(_teamId: string) {
    console.log('🏢 [BUILDING-SERVICE-COMPAT] Getting buildings for team:', _teamId)

    const service = await getBuildingService()
    const response = await service.getByTeam(_teamId)

    if (!response.success) {
      console.error('❌ [BUILDING-SERVICE-COMPAT] Error getting team buildings:', response.error)
      const error = new Error(response.error?.message || 'Database error')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }

    console.log('✅ [BUILDING-SERVICE-COMPAT] Buildings found:', response.data?.length || 0)

    // TODO: Add post-processing for complex joins when implemented
    return (response.data || []).map(building => ({
      ...building,
      manager: null // Placeholder until building_contacts are implemented
    }))
  },

  // Placeholder methods that will delegate to legacy implementation for now
  async getById(_id: string) {
    const service = await getBuildingService()
    const response = await service.getById(id)
    return unwrapResponse(response)
  },

  async create(building: Database['public']['Tables']['buildings']['Insert']) {
    const service = await getBuildingService()
    const response = await service.create(building)
    return unwrapResponse(response)
  },

  async update(id: string, updates: Database['public']['Tables']['buildings']['Update']) {
    const service = await getBuildingService()
    const response = await service.update(id, updates)
    return unwrapResponse(response)
  },

  async delete(_id: string) {
    const service = await getBuildingService()
    const response = await service.delete(id)
    if (!response.success) {
      const error = new Error(response.error?.message || 'Failed to delete building')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }
    return true
  }
}

/**
 * Lot Service - Legacy API Compatibility
 */
export const lotService = {
  async getAll() {
    const service = await getLotService()
    const response = await service.getAll()
    return unwrapArrayResponse(response)
  },

  async getById(_id: string) {
    const service = await getLotService()
    const response = await service.getById(id)
    return unwrapResponse(response)
  },

  async create(lot: Database['public']['Tables']['lots']['Insert']) {
    const service = await getLotService()
    const response = await service.create(lot)
    return unwrapResponse(response)
  },

  async update(id: string, updates: Database['public']['Tables']['lots']['Update']) {
    const service = await getLotService()
    const response = await service.update(id, updates)
    return unwrapResponse(response)
  },

  async delete(_id: string) {
    const service = await getLotService()
    const response = await service.delete(id)
    if (!response.success) {
      const error = new Error(response.error?.message || 'Failed to delete lot')
      if (response.error?.code) {
        (error as Error & { code?: string }).code = response.error.code
      }
      throw error
    }
    return true
  },

  // Placeholder methods for building-specific operations
  async getBuildingLots(_buildingId: string) {
    const service = await getLotService()
    const response = await service.getByBuilding(_buildingId)
    return unwrapArrayResponse(response)
  }
}

/**
 * Placeholder services for not-yet-migrated services
 * These will fall back to legacy implementations until migrated
 */

// These services will be implemented as the migration progresses
export const interventionService: Record<string, never> = {
  // This will fallback to legacy implementation
  // TODO: Implement when intervention service is migrated
}

export const contactService: Record<string, never> = {
  // This will fallback to legacy implementation
  // TODO: Implement when contact service is migrated
}

export const teamService: Record<string, never> = {
  // This will fallback to legacy implementation
  // TODO: Implement when team service is migrated
}

export const statsService: Record<string, never> = {
  // This will fallback to legacy implementation
  // TODO: Implement when stats service is migrated
}

export const contactInvitationService: Record<string, never> = {
  // This will fallback to legacy implementation
  // TODO: Implement when contact invitation service is migrated
}

export const tenantService: Record<string, never> = {
  // This will fallback to legacy implementation
  // TODO: Implement when tenant service is migrated
}

export const compositeService: Record<string, never> = {
  // This will fallback to legacy implementation
  // TODO: Implement when composite service is migrated
}

// Legacy utility functions - these will be re-exported as-is for now
export interface AssignmentUser {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  provider_category?: string
}

export const determineAssignmentType = (user: AssignmentUser): string => {
  // This will be re-implemented or imported from legacy until utilities are migrated
  if (user.role === 'gestionnaire') return 'manager'
  if (user.role === 'prestataire') return user.provider_category || 'provider'
  if (user.role === 'locataire') return 'tenant'
  return user.role
}

export const filterUsersByRole = (users: AssignmentUser[], requestedType: string): AssignmentUser[] => {
  return users.filter(user => determineAssignmentType(user) === requestedType)
}

export const validateAssignment = (user: AssignmentUser): boolean => {
  // Basic validation logic - can be enhanced
  return user && user.id && user.role ? true : false
}

export const getActiveUsersByAssignmentType = async (teamId: string, assignmentType: string): Promise<AssignmentUser[]> => {
  // For now, delegate to userService and filter
  const users = await userService.getTeamUsers(_teamId)
  return filterUsersByRole(users as AssignmentUser[], assignmentType)
}

export const mapFrontendTypeToUserRole = (_frontendType: string): { role: string; provider_category?: string } => {
  switch (frontendType) {
    case 'manager':
      return { role: 'gestionnaire' }
    case 'plombier':
      return { role: 'prestataire', provider_category: 'plombier' }
    case 'electricien':
      return { role: 'prestataire', provider_category: 'electricien' }
    case 'menage':
      return { role: 'prestataire', provider_category: 'menage' }
    case 'general':
      return { role: 'prestataire', provider_category: 'general' }
    case 'tenant':
      return { role: 'locataire' }
    default:
      return { role: frontendType }
  }
}
