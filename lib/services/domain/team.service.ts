/**
 * Team Service - Phase 3.2
 * Business logic for team management with permissions and member administration
 */

import { TeamRepository, createTeamRepository, createServerTeamRepository, type TeamInsert, type TeamUpdate, type TeamWithMembers } from '../repositories/team.repository'
import { UserService, createUserService, createServerUserService } from './user.service'
import { ValidationException, ConflictException, NotFoundException } from '../core/error-handler'
import type {
  Team,
  User
} from '../core/service-types'

/**
 * Team creation data
 */
export interface CreateTeamData {
  name: string
  description?: string
  created_by: string
}

/**
 * Team update data
 */
export interface UpdateTeamData {
  name?: string
  description?: string
}

/**
 * Team Service
 * Manages team lifecycle with member administration and permissions
 */
export class TeamService {
  constructor(
    private repository: TeamRepository,
    private userService?: UserService
  ) {}

  /**
   * Get all teams with members
   */
  async getAll() {
    try {
      const result = await this.repository.findAllWithMembers()
      return { success: true as const, data: result.data }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get team by ID
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
   * Get team by ID with members
   */
  async getByIdWithMembers(id: string) {
    try {
      const result = await this.repository.findByIdWithMembers(id)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get teams for a specific user
   */
  async getUserTeams(userId: string) {
    try {
      const result = await this.repository.findUserTeams(userId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Create new team with validation
   */
  async create(teamData: CreateTeamData, createdBy?: User) {
    // Validate creator exists
    if (this.userService) {
      const userResult = await this.userService.getById(teamData.created_by)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('Creator user not found', 'users', teamData.created_by)
      }

      // Validate creator permissions (only admins and managers can create teams)
      const creator = userResult.data
      if (!this.canCreateTeam(creator)) {
        throw new ValidationException('User does not have permission to create teams', 'teams', 'permissions')
      }
    }

    // Check if team name is unique
    const existingTeams = await this.repository.findAll()
    if (existingTeams.success && existingTeams.data) {
      const nameExists = existingTeams.data.some(team =>
        team.name.toLowerCase() === teamData.name.toLowerCase()
      )
      if (nameExists) {
        throw new ConflictException('Team name already exists', 'teams', 'name')
      }
    }

    const insertData: TeamInsert = {
      name: teamData.name,
      description: teamData.description || null,
      created_by: teamData.created_by
    }

    const result = await this.repository.createWithMember(insertData)

    // Log activity
    if (result.success && result.data) {
      await this.logTeamCreation(result.data, createdBy)
    }

    return result
  }

  /**
   * Update team with validation
   */
  async update(id: string, updates: UpdateTeamData, updatedBy?: User) {
    // Check if team exists
    const existingTeam = await this.repository.findById(id)
    if (!existingTeam.success) return existingTeam

    if (!existingTeam.data) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Team not found' }
      }
    }

    // Validate permissions
    if (updatedBy) {
      const hasPermission = await this.canModifyTeam(id, updatedBy.id)
      if (!hasPermission) {
        throw new ValidationException('User does not have permission to modify this team', 'teams', 'permissions')
      }
    }

    // Check name uniqueness if name is being updated
    if (updates.name && updates.name !== existingTeam.data.name) {
      const allTeams = await this.repository.findAll()
      if (allTeams.success && allTeams.data) {
        const nameExists = allTeams.data.some(team =>
          team.id !== id && team.name.toLowerCase() === updates.name!.toLowerCase()
        )
        if (nameExists) {
          throw new ConflictException('Team name already exists', 'teams', 'name')
        }
      }
    }

    const updateData: TeamUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const result = await this.repository.update(id, updateData)

    // Log activity
    if (result.success && result.data) {
      await this.logTeamUpdate(result.data, updates, updatedBy)
    }

    return result
  }

  /**
   * Delete team with validation
   */
  async delete(id: string, deletedBy?: User) {
    // Check if team exists
    const existingTeam = await this.repository.findById(id)
    if (!existingTeam.success) return existingTeam

    if (!existingTeam.data) {
      throw new NotFoundException('Team not found', 'teams', id)
    }

    // Validate permissions
    if (deletedBy) {
      const hasPermission = await this.canDeleteTeam(id, deletedBy.id)
      if (!hasPermission) {
        throw new ValidationException('User does not have permission to delete this team', 'teams', 'permissions')
      }
    }

    // Check if team has dependencies (buildings, interventions, etc.)
    const canDelete = await this.canSafelyDeleteTeam(id)
    if (!canDelete) {
      throw new ValidationException('Cannot delete team with active dependencies', 'teams', 'dependencies')
    }

    const result = await this.repository.delete(id)

    // Log activity
    if (result.success) {
      await this.logTeamDeletion(existingTeam.data, deletedBy)
    }

    return result
  }

  /**
   * Add member to team
   */
  async addMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member', addedBy?: User) {
    // Validate permissions
    if (addedBy) {
      const hasPermission = await this.canManageMembers(teamId, addedBy.id)
      if (!hasPermission) {
        throw new ValidationException('User does not have permission to add members to this team', 'teams', 'permissions')
      }
    }

    // Validate user exists
    if (this.userService) {
      const userResult = await this.userService.getById(userId)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('User not found', 'users', userId)
      }

      // Validate user can be added to teams
      const user = userResult.data
      if (!this.canJoinTeam(user)) {
        throw new ValidationException('User cannot be added to teams', 'teams', 'user_role')
      }
    }

    const result = await this.repository.addMember(teamId, userId, role)

    if (result.success && result.data) {
      await this.logMemberAddition(teamId, userId, role, addedBy)
    }

    return result
  }

  /**
   * Remove member from team
   */
  async removeMember(teamId: string, userId: string, removedBy?: User) {
    // Validate permissions
    if (removedBy) {
      const hasPermission = await this.canManageMembers(teamId, removedBy.id)
      if (!hasPermission && removedBy.id !== userId) {
        throw new ValidationException('User does not have permission to remove members from this team', 'teams', 'permissions')
      }
    }

    const result = await this.repository.removeMember(teamId, userId)

    if (result.success) {
      await this.logMemberRemoval(teamId, userId, removedBy)
    }

    return result
  }

  /**
   * Update member role
   */
  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member', updatedBy?: User) {
    // Validate permissions
    if (updatedBy) {
      const hasPermission = await this.canManageMembers(teamId, updatedBy.id)
      if (!hasPermission) {
        throw new ValidationException('User does not have permission to update member roles', 'teams', 'permissions')
      }
    }

    const result = await this.repository.updateMemberRole(teamId, userId, role)

    if (result.success && result.data) {
      await this.logMemberRoleUpdate(teamId, userId, role, updatedBy)
    }

    return result
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string) {
    try {
      const result = await this.repository.getTeamMembers(teamId)
      return result
    } catch (error) {
      throw error
    }
  }


  /**
   * Get team statistics
   */
  async getStats() {
    try {
      const result = await this.repository.getTeamStats()
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Count total teams
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
   * Clear cache for specific user
   */
  clearUserCache(userId: string) {
    // Delegate to repository
    // TODO: Implement user-specific cache clearing using userId
    this.repository.clearAllCache() // For now, clear all cache
  }

  /**
   * Permission validation methods
   */

  /**
   * Check if user can create teams
   */
  private canCreateTeam(user: User): boolean {
    return ['admin', 'gestionnaire'].includes(user.role)
  }

  /**
   * Check if user can join teams
   */
  private canJoinTeam(user: User): boolean {
    // All user roles can join teams
    return ['admin', 'gestionnaire', 'prestataire', 'locataire'].includes(user.role)
  }

  /**
   * Check if user can modify team
   */
  private async canModifyTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.repository.getTeamMembers(teamId)
      if (!members.success || !members.data) return false

      const userMember = members.data.find(member => member.user_id === userId)
      return userMember?.role === 'admin'
    } catch {
      return false
    }
  }

  /**
   * Check if user can delete team
   */
  private async canDeleteTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      const team = await this.repository.findById(teamId)
      if (!team.success || !team.data) return false

      // Only team creator or admin members can delete
      if (team.data.created_by === userId) return true

      const members = await this.repository.getTeamMembers(teamId)
      if (!members.success || !members.data) return false

      const userMember = members.data.find(member => member.user_id === userId)
      return userMember?.role === 'admin'
    } catch {
      return false
    }
  }

  /**
   * Check if user can manage team members
   */
  private async canManageMembers(teamId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.repository.getTeamMembers(teamId)
      if (!members.success || !members.data) return false

      const userMember = members.data.find(member => member.user_id === userId)
      return userMember?.role === 'admin'
    } catch {
      return false
    }
  }

  /**
   * Check if team can be safely deleted
   */
  private async canSafelyDeleteTeam(teamId: string): Promise<boolean> {
    // In a real application, check for:
    // - Buildings assigned to this team
    // - Active interventions
    // - Other dependencies
    // TODO: Implement actual safety checks using teamId
    // For now, return true (assuming proper cascade deletes)
    return true
  }

  /**
   * Logging methods (in production, these would use the activity-logger service)
   */
  private async logTeamCreation(team: TeamWithMembers, createdBy?: User) {
    console.log('Team created:', team.id, team.name, 'by:', createdBy?.name || 'system')
  }

  private async logTeamUpdate(team: Team, changes: UpdateTeamData, updatedBy?: User) {
    console.log('Team updated:', team.id, changes, 'by:', updatedBy?.name || 'system')
  }

  private async logTeamDeletion(team: Team, deletedBy?: User) {
    console.log('Team deleted:', team.id, team.name, 'by:', deletedBy?.name || 'system')
  }

  private async logMemberAddition(teamId: string, userId: string, role: string, addedBy?: User) {
    console.log('Member added to team:', teamId, 'user:', userId, 'role:', role, 'by:', addedBy?.name || 'system')
  }

  private async logMemberRemoval(teamId: string, userId: string, removedBy?: User) {
    console.log('Member removed from team:', teamId, 'user:', userId, 'by:', removedBy?.name || 'system')
  }

  private async logMemberRoleUpdate(teamId: string, userId: string, role: string, updatedBy?: User) {
    console.log('Member role updated:', teamId, 'user:', userId, 'new role:', role, 'by:', updatedBy?.name || 'system')
  }
}

// Factory functions for creating service instances
export const createTeamService = (
  repository?: TeamRepository,
  userService?: UserService
) => {
  const repo = repository || createTeamRepository()
  const users = userService || createUserService()
  return new TeamService(repo, users)
}

export const createServerTeamService = async () => {
  const [repository, userService] = await Promise.all([
    createServerTeamRepository(),
    createServerUserService()
  ])
  return new TeamService(repository, userService)
}
