/**
 * User Service - Phase 2
 * Business logic layer for user management
 */

import { UserRepository, createUserRepository, createServerUserRepository, createServerActionUserRepository } from '../repositories/user.repository'
import type { User, UserInsert, UserUpdate } from '../core/service-types'
import { ValidationException, ConflictException, PermissionException } from '../core/error-handler'
import { hashPassword } from '../core/service-types'

/**
 * User Service
 * Handles business logic for user management
 */
export class UserService {
  constructor(private repository: UserRepository) {}

  /**
   * Get all users
   */
  async getAll(options?: { page?: number; limit?: number }) {
    return this.repository.findAll(options)
  }

  /**
   * Get user by ID
   */
  async getById(id: string) {
    const result = await this.repository.findById(id)
    if (!result.success) return result

    if (!result.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `User with ID ${id} not found`
        }
      }
    }

    return result
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string) {
    return this.repository.findByEmail(email)
  }

  /**
   * Get user by auth user ID
   */
  async getByAuthUserId(authUserId: string) {
    return this.repository.findByAuthUserId(authUserId)
  }

  /**
   * Alias for getByAuthUserId - for compatibility
   */
  async findByAuthUserId(authUserId: string) {
    return this.getByAuthUserId(authUserId)
  }

  /**
   * Create new user with business validation
   */
  async create(userData: UserInsert) {
    // Check if email already exists
    const emailCheck = await this.repository.emailExists(userData.email)
    if (!emailCheck.success) return emailCheck

    if (emailCheck.exists) {
      throw new ConflictException(
        'A user with this email already exists',
        'users',
        'email',
        userData.email
      )
    }

    // Hash password if provided
    const processedData = { ...userData }
    if ('password' in processedData && processedData.password) {
      processedData.password = await hashPassword(processedData.password)
    }

    // Set default values
    processedData.is_active = processedData.is_active ?? true
    processedData.password_set = processedData.password_set ?? false
    processedData.created_at = processedData.created_at || new Date().toISOString()
    processedData.updated_at = new Date().toISOString()

    return this.repository.create(processedData)
  }

  /**
   * Update user with business validation
   */
  async update(id: string, updates: UserUpdate) {
    // Check if user exists
    const existingUser = await this.repository.findById(id)
    if (!existingUser.success) return existingUser

    if (!existingUser.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `User with ID ${id} not found`
        }
      }
    }

    // Check email uniqueness if changing email
    if (updates.email && updates.email !== existingUser.data.email) {
      const emailCheck = await this.repository.emailExists(updates.email, id)
      if (!emailCheck.success) return emailCheck

      if (emailCheck.exists) {
        throw new ConflictException(
          'This email is already in use by another user',
          'users',
          'email',
          updates.email
        )
      }
    }

    // Hash password if provided
    const processedUpdates = { ...updates }
    if ('password' in processedUpdates && processedUpdates.password) {
      processedUpdates.password = await hashPassword(processedUpdates.password)
    }

    // Update timestamp
    processedUpdates.updated_at = new Date().toISOString()

    return this.repository.update(id, processedUpdates)
  }

  /**
   * Delete user with cascade handling
   */
  async delete(id: string) {
    // Check if user exists
    const existingUser = await this.repository.findById(id)
    if (!existingUser.success) return existingUser

    if (!existingUser.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `User with ID ${id} not found`
        }
      }
    }

    // Check if user is last admin
    if (existingUser.data.role === 'admin') {
      const admins = await this.repository.findByRole('admin')
      if (admins.success && admins.data.length <= 1) {
        throw new ValidationException(
          'Cannot delete the last admin user',
          'role',
          existingUser.data.role
        )
      }
    }

    return this.repository.delete(id)
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: User['role']) {
    return this.repository.findByRole(role)
  }

  /**
   * Get users by team
   * @param excludeUserId - Optional user ID to exclude from results (e.g., current user)
   */
  async getUsersByTeam(teamId: string, excludeUserId?: string) {
    return this.repository.findByTeam(teamId, excludeUserId)
  }

  /**
   * Search users
   */
  async searchUsers(query: string, options?: { role?: User['role']; teamId?: string }) {
    if (!query || query.trim().length < 2) {
      throw new ValidationException(
        'Search query must be at least 2 characters',
        'query',
        query
      )
    }

    return this.repository.search(query.trim(), options)
  }

  /**
   * Update user's last seen timestamp
   */
  async updateLastSeen(userId: string) {
    return this.repository.updateLastSeen(userId)
  }

  /**
   * Get user with team details
   */
  async getUserWithTeam(id: string) {
    return this.repository.findByIdWithTeam(id)
  }

  /**
   * Get active users
   */
  async getActiveUsers(daysAgo = 30) {
    if (daysAgo < 1 || daysAgo > 365) {
      throw new ValidationException(
        'Days ago must be between 1 and 365',
        'daysAgo',
        daysAgo
      )
    }

    return this.repository.findActiveUsers(daysAgo)
  }

  /**
   * Assign users to team
   */
  async assignToTeam(userIds: string[], teamId: string | null) {
    if (!userIds.length) {
      throw new ValidationException(
        'At least one user ID must be provided',
        'userIds',
        userIds
      )
    }

    // ✅ PERFORMANCE FIX (Oct 23, 2025 - Issue #1): Batch query instead of N+1
    // Fetch all users in a single query instead of N separate queries
    const usersResult = await this.repository.findByIds(userIds)
    if (!usersResult.success) {
      return usersResult
    }

    // Verify all requested users were found
    const foundUserIds = new Set(usersResult.data.map(u => u.id))
    const missingUserIds = userIds.filter(id => !foundUserIds.has(id))

    if (missingUserIds.length > 0) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `Users not found: ${missingUserIds.join(', ')}`
        }
      }
    }

    return this.repository.updateTeamBulk(userIds, teamId)
  }

  /**
   * Validate user credentials (for auth)
   */
  async validateCredentials(email: string, password: string) {
    const userResult = await this.repository.findByEmail(email)
    if (!userResult.success) return userResult

    // TODO: Implement actual password validation using password parameter
    if (!userResult.data) {
      return {
        success: false as const,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      }
    }

    // Check if user is active
    if (!userResult.data.is_active) {
      throw new PermissionException(
        'Account is deactivated',
        'users',
        'login',
        userResult.data.id
      )
    }

    // Note: In production, password verification would be done here
    // For now, we return the user if found
    // const isValid = await verifyPassword(_password, userResult.data._password)
    // if (!isValid) { return error }

    // Update last seen
    await this.updateLastSeen(userResult.data.id)

    return userResult
  }

  /**
   * Activate/Deactivate user
   */
  async setUserStatus(id: string, isActive: boolean) {
    const user = await this.repository.findById(id)
    if (!user.success) return user

    if (!user.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `User with ID ${id} not found`
        }
      }
    }

    // Prevent deactivating last admin
    if (!isActive && user.data.role === 'admin') {
      const admins = await this.repository.findByRole('admin')
      if (admins.success) {
        const activeAdmins = admins.data.filter(a => a.is_active && a.id !== id)
        if (activeAdmins.length === 0) {
          throw new ValidationException(
            'Cannot deactivate the last active admin',
            'is_active',
            isActive
          )
        }
      }
    }

    return this.repository.update(id, { is_active: isActive })
  }

  /**
   * Change user role with validation
   */
  async changeUserRole(id: string, newRole: User['role']) {
    const user = await this.repository.findById(id)
    if (!user.success) return user

    if (!user.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `User with ID ${id} not found`
        }
      }
    }

    // Prevent removing last admin
    if (user.data.role === 'admin' && newRole !== 'admin') {
      const admins = await this.repository.findByRole('admin')
      if (admins.success && admins.data.filter(a => a.id !== id).length === 0) {
        throw new ValidationException(
          'Cannot change role of the last admin',
          'role',
          newRole
        )
      }
    }

    return this.repository.update(id, { role: newRole })
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const [totalUsers, activeUsers, usersByRole] = await Promise.all([
      this.repository.findAll(),
      this.repository.findActiveUsers(30),
      Promise.all([
        this.repository.findByRole('admin'),
        this.repository.findByRole('manager'),
        this.repository.findByRole('provider'),
        this.repository.findByRole('tenant')
      ])
    ])

    if (!totalUsers.success || !activeUsers.success) {
      return {
        success: false as const,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to calculate user statistics'
        }
      }
    }

    const [admins, managers, providers, tenants] = usersByRole

    return {
      success: true as const,
      data: {
        total: totalUsers.data.length,
        active: activeUsers.data.length,
        inactive: totalUsers.data.length - activeUsers.data.length,
        byRole: {
          admin: admins.success ? admins.data.length : 0,
          manager: managers.success ? managers.data.length : 0,
          provider: providers.success ? providers.data.length : 0,
          tenant: tenants.success ? tenants.data.length : 0
        }
      }
    }
  }
}

// Factory functions for creating service instances
export const createUserService = (repository?: UserRepository) => {
  const repo = repository || createUserRepository()
  return new UserService(repo)
}

export const createServerUserService = async () => {
  const repository = await createServerUserRepository()
  return new UserService(repository)
}

/**
 * Create User Service for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionUserRepository() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionUserService = async () => {
  const repository = await createServerActionUserRepository()
  return new UserService(repository)
}
