/**
 * Team Service Tests - Phase 3.2
 * Comprehensive test suite for team management and member administration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TeamService } from '../../domain/team.service'
import { TeamRepository } from '../../repositories/team.repository'
import { UserService } from '../../domain/user.service'
import { ValidationException, NotFoundException, ConflictException } from '../../core/error-handler'
import {
  UserTestDataFactory,
  TeamTestDataFactory,
  TeamMemberTestDataFactory
} from '../helpers/test-data'
import type { Team, User, TeamMember } from '../../core/service-types'

// Mock dependencies
const mockRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findAllWithMembers: vi.fn(),
  findByIdWithMembers: vi.fn(),
  findUserTeams: vi.fn(),
  create: vi.fn(),
  createWithMember: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
  getTeamMembers: vi.fn(),
  getTeamStats: vi.fn(),
  count: vi.fn(),
  clearAllCache: vi.fn()
} as unknown as TeamRepository

const mockUserService = {
  getById: vi.fn()
} as unknown as UserService

describe('TeamService', () => {
  let service: TeamService
  let mockAdmin: User
  let mockManager: User
  let mockProvider: User
  let mockTenant: User
  let mockTeam: Team
  let mockTeamMember: TeamMember

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create service instance
    service = new TeamService(mockRepository, mockUserService)

    // Create test data
    mockAdmin = UserTestDataFactory.create({ role: 'admin' })
    mockManager = UserTestDataFactory.create({ role: 'gestionnaire' })
    mockProvider = UserTestDataFactory.create({ role: 'prestataire' })
    mockTenant = UserTestDataFactory.create({ role: 'locataire' })
    mockTeam = TeamTestDataFactory.create({ created_by: mockAdmin.id })
    mockTeamMember = TeamMemberTestDataFactory.create({
      team_id: mockTeam.id,
      user_id: mockAdmin.id,
      role: 'admin'
    })
  })

  describe('Basic CRUD Operations', () => {
    it('should get all teams with members', async () => {
      const mockTeams = [mockTeam]
      mockRepository.findAllWithMembers = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeams
      })

      const result = await service.getAll()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTeams)
      expect(mockRepository.findAllWithMembers).toHaveBeenCalled()
    })

    it('should get team by ID', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })

      const result = await service.getById(mockTeam.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTeam)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockTeam.id)
    })

    it('should get team by ID with members', async () => {
      const teamWithMembers = { ...mockTeam, team_members: [mockTeamMember] }
      mockRepository.findByIdWithMembers = vi.fn().mockResolvedValue({
        success: true,
        data: teamWithMembers
      })

      const result = await service.getByIdWithMembers(mockTeam.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(teamWithMembers)
      expect(mockRepository.findByIdWithMembers).toHaveBeenCalledWith(mockTeam.id)
    })

    it('should get user teams', async () => {
      const mockTeams = [mockTeam]
      mockRepository.findUserTeams = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeams
      })

      const result = await service.getUserTeams(mockAdmin.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTeams)
      expect(mockRepository.findUserTeams).toHaveBeenCalledWith(mockAdmin.id)
    })

    it('should create team with validation', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'Test description',
        created_by: mockAdmin.id
      }

      // Mock dependencies
      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockAdmin
      })
      mockRepository.findAll = vi.fn().mockResolvedValue({
        success: true,
        data: []
      })
      mockRepository.createWithMember = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })

      const result = await service.create(teamData, mockAdmin)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTeam)
      expect(mockUserService.getById).toHaveBeenCalledWith(mockAdmin.id)
      expect(mockRepository.findAll).toHaveBeenCalled()
      expect(mockRepository.createWithMember).toHaveBeenCalled()
    })

    it('should fail to create team with non-admin user', async () => {
      const teamData = {
        name: 'Test Team',
        description: 'Test description',
        created_by: mockTenant.id
      }

      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTenant
      })

      await expect(service.create(teamData, mockTenant))
        .rejects.toThrow(ValidationException)
      expect(mockRepository.createWithMember).not.toHaveBeenCalled()
    })

    it('should fail to create team with duplicate name', async () => {
      const teamData = {
        name: 'Existing Team',
        description: 'Test description',
        created_by: mockAdmin.id
      }

      const existingTeam = { ...mockTeam, name: 'Existing Team' }

      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockAdmin
      })
      mockRepository.findAll = vi.fn().mockResolvedValue({
        success: true,
        data: [existingTeam]
      })

      await expect(service.create(teamData, mockAdmin))
        .rejects.toThrow(ConflictException)
      expect(mockRepository.createWithMember).not.toHaveBeenCalled()
    })

    it('should update team with validation', async () => {
      const updates = {
        name: 'Updated Team Name',
        description: 'Updated description'
      }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' }]
      })
      mockRepository.findAll = vi.fn().mockResolvedValue({
        success: true,
        data: [mockTeam]
      })
      mockRepository.update = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockTeam, ...updates }
      })

      const result = await service.update(mockTeam.id, updates, mockAdmin)

      expect(result.success).toBe(true)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockTeam.id)
      expect(mockRepository.update).toHaveBeenCalled()
    })

    it('should delete team with validation', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' }]
      })
      mockRepository.delete = vi.fn().mockResolvedValue({
        success: true,
        data: true
      })

      const result = await service.delete(mockTeam.id, mockAdmin)

      expect(result.success).toBe(true)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockTeam.id)
      expect(mockRepository.delete).toHaveBeenCalledWith(mockTeam.id)
    })
  })

  describe('Member Management', () => {
    it('should add member to team', async () => {
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' }]
      })
      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockProvider
      })
      mockRepository.addMember = vi.fn().mockResolvedValue({
        success: true,
        data: { team_id: mockTeam.id, user_id: mockProvider.id, role: 'prestataire' }
      })

      const result = await service.addMember(mockTeam.id, mockProvider.id, 'member', mockAdmin)

      expect(result.success).toBe(true)
      expect(mockUserService.getById).toHaveBeenCalledWith(mockProvider.id)
      expect(mockRepository.addMember).toHaveBeenCalledWith(mockTeam.id, mockProvider.id, 'member')
    })

    it('should not add member without admin permissions', async () => {
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }]
      })

      await expect(service.addMember(mockTeam.id, mockTenant.id, 'member', mockProvider))
        .rejects.toThrow(ValidationException)
      expect(mockRepository.addMember).not.toHaveBeenCalled()
    })

    it('should remove member from team', async () => {
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [
          { ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' },
          { ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }
        ]
      })
      mockRepository.removeMember = vi.fn().mockResolvedValue({
        success: true,
        data: true
      })

      const result = await service.removeMember(mockTeam.id, mockProvider.id, mockAdmin)

      expect(result.success).toBe(true)
      expect(mockRepository.removeMember).toHaveBeenCalledWith(mockTeam.id, mockProvider.id)
    })

    it('should allow self-removal from team', async () => {
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [
          { ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' },
          { ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }
        ]
      })
      mockRepository.removeMember = vi.fn().mockResolvedValue({
        success: true,
        data: true
      })

      const result = await service.removeMember(mockTeam.id, mockProvider.id, mockProvider)

      expect(result.success).toBe(true)
      expect(mockRepository.removeMember).toHaveBeenCalledWith(mockTeam.id, mockProvider.id)
    })

    it('should update member role', async () => {
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [
          { ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' },
          { ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }
        ]
      })
      mockRepository.updateMemberRole = vi.fn().mockResolvedValue({
        success: true,
        data: { team_id: mockTeam.id, user_id: mockProvider.id, role: 'admin' }
      })

      const result = await service.updateMemberRole(mockTeam.id, mockProvider.id, 'admin', mockAdmin)

      expect(result.success).toBe(true)
      expect(mockRepository.updateMemberRole).toHaveBeenCalledWith(mockTeam.id, mockProvider.id, 'admin')
    })

    it('should not update member role without admin permissions', async () => {
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }]
      })

      await expect(service.updateMemberRole(mockTeam.id, mockTenant.id, 'admin', mockProvider))
        .rejects.toThrow(ValidationException)
      expect(mockRepository.updateMemberRole).not.toHaveBeenCalled()
    })

    it('should get team members', async () => {
      const mockMembers = [
        { ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' },
        { ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }
      ]
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: mockMembers
      })

      const result = await service.getTeamMembers(mockTeam.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMembers)
      expect(mockRepository.getTeamMembers).toHaveBeenCalledWith(mockTeam.id)
    })
  })

  describe('Ensure User Has Team', () => {
    it('should return existing team if user already has one', async () => {
      const existingTeams = [mockTeam]
      mockRepository.findUserTeams = vi.fn().mockResolvedValue({
        success: true,
        data: existingTeams
      })

      const result = await service.ensureUserHasTeam(mockAdmin.id)

      expect(result.hasTeam).toBe(true)
      expect(result.team).toEqual(mockTeam)
      expect(mockRepository.findUserTeams).toHaveBeenCalledWith(mockAdmin.id)
    })

    it('should return error if user has no team assigned', async () => {
      mockRepository.findUserTeams = vi.fn().mockResolvedValue({
        success: true,
        data: []
      })

      const result = await service.ensureUserHasTeam(mockAdmin.id)

      expect(result.hasTeam).toBe(false)
      expect(result.error).toBe('Utilisateur sans équipe assignée. Contactez votre administrateur.')
      // Should not try to create team automatically
      expect(mockRepository.createWithMember).not.toHaveBeenCalled()
    })

    it('should return error for JWT-only users', async () => {
      const result = await service.ensureUserHasTeam('jwt_test_user')

      expect(result.hasTeam).toBe(false)
      expect(result.error).toBe('JWT-only users need to complete registration')
    })

    it('should return error for user without team regardless of role', async () => {
      mockRepository.findUserTeams = vi.fn().mockResolvedValue({
        success: true,
        data: []
      })

      const result = await service.ensureUserHasTeam(mockTenant.id)

      expect(result.hasTeam).toBe(false)
      expect(result.error).toBe('Utilisateur sans équipe assignée. Contactez votre administrateur.')
      // Should not try to create team or check user permissions
      expect(mockUserService.getById).not.toHaveBeenCalled()
    })
  })

  describe('Permission Validation', () => {
    it('should validate team creation permissions', async () => {
      const teamData = {
        name: 'Test Team',
        created_by: mockTenant.id
      }

      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTenant
      })

      await expect(service.create(teamData))
        .rejects.toThrow(ValidationException)
    })

    it('should validate team modification permissions', async () => {
      const updates = { name: 'New Name' }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }]
      })

      await expect(service.update(mockTeam.id, updates, mockProvider))
        .rejects.toThrow(ValidationException)
    })

    it('should validate team deletion permissions', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockProvider.id, role: 'prestataire' }]
      })

      await expect(service.delete(mockTeam.id, mockProvider))
        .rejects.toThrow(ValidationException)
    })
  })

  describe('Statistics and Utilities', () => {
    it('should get team statistics', async () => {
      const mockStats = {
        totalTeams: 5,
        totalMembers: 20,
        averageMembersPerTeam: 4.0,
        membersByRole: {
          admin: 5,
          member: 15
        }
      }

      mockRepository.getTeamStats = vi.fn().mockResolvedValue({
        success: true,
        data: mockStats
      })

      const result = await service.getStats()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockStats)
      expect(mockRepository.getTeamStats).toHaveBeenCalled()
    })

    it('should count total teams', async () => {
      mockRepository.count = vi.fn().mockResolvedValue(10)

      const result = await service.count()

      expect(result.success).toBe(true)
      expect(result.data).toBe(10)
      expect(mockRepository.count).toHaveBeenCalled()
    })

    it('should clear user cache', async () => {
      mockRepository.clearAllCache = vi.fn()

      service.clearUserCache(mockAdmin.id)

      expect(mockRepository.clearAllCache).toHaveBeenCalled()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.findById = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      await expect(service.getById(mockTeam.id))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle not found errors', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' }
      })

      const result = await service.getById('non-existent-id')
      expect(result.success).toBe(false)
    })

    it('should handle user service unavailable', async () => {
      const serviceWithoutUserService = new TeamService(mockRepository)
      const teamData = {
        name: 'Test Team',
        created_by: mockAdmin.id
      }

      mockRepository.findAll = vi.fn().mockResolvedValue({
        success: true,
        data: []
      })
      mockRepository.createWithMember = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })

      // Should work without user validation
      const result = await serviceWithoutUserService.create(teamData)
      expect(result.success).toBe(true)
    })

    it('should validate user exists when adding member', async () => {
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' }]
      })
      mockUserService.getById = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      })

      await expect(service.addMember(mockTeam.id, 'non-existent-user', 'member', mockAdmin))
        .rejects.toThrow(NotFoundException)
    })
  })

  describe('Business Rules', () => {
    it('should enforce unique team names', async () => {
      const teamData = {
        name: 'Duplicate Name',
        created_by: mockAdmin.id
      }

      const existingTeam = { ...mockTeam, name: 'Duplicate Name' }

      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockAdmin
      })
      mockRepository.findAll = vi.fn().mockResolvedValue({
        success: true,
        data: [existingTeam]
      })

      await expect(service.create(teamData))
        .rejects.toThrow(ConflictException)
    })

    it('should allow updating team with same name', async () => {
      const updates = { name: mockTeam.name } // Same name

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTeam
      })
      mockRepository.getTeamMembers = vi.fn().mockResolvedValue({
        success: true,
        data: [{ ...mockTeamMember, user_id: mockAdmin.id, role: 'admin' }]
      })
      mockRepository.findAll = vi.fn().mockResolvedValue({
        success: true,
        data: [mockTeam]
      })
      mockRepository.update = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockTeam, ...updates }
      })

      const result = await service.update(mockTeam.id, updates, mockAdmin)

      expect(result.success).toBe(true)
      expect(mockRepository.update).toHaveBeenCalled()
    })
  })
})
