/**
 * User Service Tests - Phase 2
 * Comprehensive CRUD tests for UserService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { UserService } from '../../domain/user.service'
import { UserRepository } from '../../repositories/user.repository'
import { UserTestDataFactory, MockedObject } from '../helpers/test-data'
import {
  ValidationException,
  ConflictException,
  NotFoundException,
  PermissionException
} from '../../core/error-handler'

// Mock the repository
vi.mock('../../repositories/user.repository')

describe('UserService', () => {
  let service: UserService
  let mockRepository: MockedObject<UserRepository>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create mock repository
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByAuthUserId: vi.fn(),
      findByRole: vi.fn(),
      findByTeam: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
      emailExists: vi.fn(),
      updateLastSeen: vi.fn(),
      findByIdWithTeam: vi.fn(),
      findActiveUsers: vi.fn(),
      updateTeamBulk: vi.fn()
    }

    // Create service with mocked repository
    service = new UserService(mockRepository as UserRepository)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('CRUD Operations', () => {
    describe('CREATE', () => {
      it('should create user with valid data', async () => {
        const newUser = UserTestDataFactory.createTenant()
        const createdUser = { ...newUser, id: 'user-123' }

        mockRepository.emailExists.mockResolvedValueOnce({
          success: true,
          exists: false
        })
        mockRepository.create.mockResolvedValueOnce({
          success: true,
          data: createdUser
        })

        const result = await service.create(newUser)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(createdUser)
        expect(mockRepository.emailExists).toHaveBeenCalledWith(newUser.email)
        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...newUser,
            is_active: true,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        )
      })

      it('should throw ConflictException if email already exists', async () => {
        const newUser = UserTestDataFactory.createManager()

        mockRepository.emailExists.mockResolvedValueOnce({
          success: true,
          exists: true
        })

        await expect(service.create(newUser)).rejects.toThrow(ConflictException)
        expect(mockRepository.create).not.toHaveBeenCalled()
      })

      it('should set default values for optional fields', async () => {
        const minimalUser = {
          email: 'test@example.com',
          name: 'Test User',
          role: 'tenant' as const
        }

        mockRepository.emailExists.mockResolvedValueOnce({
          success: true,
          exists: false
        })
        mockRepository.create.mockResolvedValueOnce({
          success: true,
          data: { ...minimalUser, id: 'user-123' }
        })

        await service.create(minimalUser)

        expect(mockRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...minimalUser,
            is_active: true,
            created_at: expect.any(String),
            updated_at: expect.any(String)
          })
        )
      })
    })

    describe('READ', () => {
      it('should get user by ID', async () => {
        const user = UserTestDataFactory.createAdmin()
        user.id = 'user-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: user
        })

        const result = await service.getById('user-123')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(user)
        expect(mockRepository.findById).toHaveBeenCalledWith('user-123')
      })

      it('should return error if user not found', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: null
        })

        const result = await service.getById('non-existent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
      })

      it('should get all users with pagination', async () => {
        const users = [
          UserTestDataFactory.createAdmin(),
          UserTestDataFactory.createManager(),
          UserTestDataFactory.createTenant()
        ]

        mockRepository.findAll.mockResolvedValueOnce({
          success: true,
          data: users,
          pagination: {
            total: 3,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        })

        const result = await service.getAll({ page: 1, limit: 10 })

        expect(result.success).toBe(true)
        expect(result.data).toEqual(users)
        expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 })
      })

      it('should find user by email', async () => {
        const user = UserTestDataFactory.createProvider()
        user.email = 'provider@example.com'

        mockRepository.findByEmail.mockResolvedValueOnce({
          success: true,
          data: user
        })

        const result = await service.getByEmail('provider@example.com')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(user)
        expect(mockRepository.findByEmail).toHaveBeenCalledWith('provider@example.com')
      })

      it('should get users by role', async () => {
        const managers = [
          UserTestDataFactory.createManager(),
          UserTestDataFactory.createManager()
        ]

        mockRepository.findByRole.mockResolvedValueOnce({
          success: true,
          data: managers
        })

        const result = await service.getUsersByRole('manager')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(managers)
        expect(mockRepository.findByRole).toHaveBeenCalledWith('manager')
      })

      it('should search users with filters', async () => {
        const users = [UserTestDataFactory.createTenant()]

        mockRepository.search.mockResolvedValueOnce({
          success: true,
          data: users
        })

        const result = await service.searchUsers('john', { role: 'tenant' })

        expect(result.success).toBe(true)
        expect(result.data).toEqual(users)
        expect(mockRepository.search).toHaveBeenCalledWith('john', { role: 'tenant' })
      })

      it('should throw ValidationException for short search query', async () => {
        await expect(service.searchUsers('a')).rejects.toThrow(ValidationException)
        expect(mockRepository.search).not.toHaveBeenCalled()
      })
    })

    describe('UPDATE', () => {
      it('should update user properties', async () => {
        const existingUser = UserTestDataFactory.createTenant()
        existingUser.id = 'user-123'

        const updates = {
          name: 'Updated Name',
          phone: '+1234567890'
        }

        const updatedUser = { ...existingUser, ...updates }

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingUser
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: updatedUser
        })

        const result = await service.update('user-123', updates)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(updatedUser)
        expect(mockRepository.update).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            ...updates,
            updated_at: expect.any(String)
          })
        )
      })

      it('should check email uniqueness when updating email', async () => {
        const existingUser = UserTestDataFactory.createManager()
        existingUser.id = 'user-123'
        existingUser.email = 'old@example.com'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingUser
        })
        mockRepository.emailExists.mockResolvedValueOnce({
          success: true,
          exists: false
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: { ...existingUser, email: 'new@example.com' }
        })

        await service.update('user-123', { email: 'new@example.com' })

        expect(mockRepository.emailExists).toHaveBeenCalledWith('new@example.com', 'user-123')
      })

      it('should throw ConflictException if new email already exists', async () => {
        const existingUser = UserTestDataFactory.createProvider()
        existingUser.id = 'user-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: existingUser
        })
        mockRepository.emailExists.mockResolvedValueOnce({
          success: true,
          exists: true
        })

        await expect(
          service.update('user-123', { email: 'taken@example.com' })
        ).rejects.toThrow(ConflictException)
      })

      it('should update last seen timestamp', async () => {
        const user = UserTestDataFactory.createAdmin()
        user.id = 'user-123'

        mockRepository.updateLastSeen.mockResolvedValueOnce({
          success: true,
          data: { ...user, last_seen_at: new Date().toISOString() }
        })

        const result = await service.updateLastSeen('user-123')

        expect(result.success).toBe(true)
        expect(mockRepository.updateLastSeen).toHaveBeenCalledWith('user-123')
      })
    })

    describe('DELETE', () => {
      it('should delete user', async () => {
        const user = UserTestDataFactory.createTenant()
        user.id = 'user-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockRepository.delete.mockResolvedValueOnce({
          success: true,
          data: true
        })

        const result = await service.delete('user-123')

        expect(result.success).toBe(true)
        expect(mockRepository.delete).toHaveBeenCalledWith('user-123')
      })

      it('should return error if user not found', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: null
        })

        const result = await service.delete('non-existent')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
        expect(mockRepository.delete).not.toHaveBeenCalled()
      })

      it('should prevent deleting last admin', async () => {
        const admin = UserTestDataFactory.createAdmin()
        admin.id = 'admin-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: admin
        })
        mockRepository.findByRole.mockResolvedValueOnce({
          success: true,
          data: [admin] // Only one admin
        })

        await expect(service.delete('admin-123')).rejects.toThrow(ValidationException)
        expect(mockRepository.delete).not.toHaveBeenCalled()
      })
    })
  })

  describe('Business Logic', () => {
    describe('Role Management', () => {
      it('should change user role', async () => {
        const user = UserTestDataFactory.createTenant()
        user.id = 'user-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: { ...user, role: 'manager' }
        })

        const result = await service.changeUserRole('user-123', 'manager')

        expect(result.success).toBe(true)
        expect(result.data?.role).toBe('manager')
      })

      it('should prevent changing role of last admin', async () => {
        const admin = UserTestDataFactory.createAdmin()
        admin.id = 'admin-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: admin
        })
        mockRepository.findByRole.mockResolvedValueOnce({
          success: true,
          data: [admin] // Only one admin
        })

        await expect(
          service.changeUserRole('admin-123', 'manager')
        ).rejects.toThrow(ValidationException)
      })
    })

    describe('User Status', () => {
      it('should activate user', async () => {
        const user = UserTestDataFactory.createTenant()
        user.id = 'user-123'
        user.is_active = false

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: { ...user, is_active: true }
        })

        const result = await service.setUserStatus('user-123', true)

        expect(result.success).toBe(true)
        expect(result.data?.is_active).toBe(true)
      })

      it('should deactivate user', async () => {
        const user = UserTestDataFactory.createManager()
        user.id = 'user-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockRepository.update.mockResolvedValueOnce({
          success: true,
          data: { ...user, is_active: false }
        })

        const result = await service.setUserStatus('user-123', false)

        expect(result.success).toBe(true)
        expect(result.data?.is_active).toBe(false)
      })

      it('should prevent deactivating last active admin', async () => {
        const admin = UserTestDataFactory.createAdmin()
        admin.id = 'admin-123'

        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: admin
        })
        mockRepository.findByRole.mockResolvedValueOnce({
          success: true,
          data: [admin] // Only one active admin
        })

        await expect(
          service.setUserStatus('admin-123', false)
        ).rejects.toThrow(ValidationException)
      })
    })

    describe('Team Management', () => {
      it('should assign users to team', async () => {
        const userIds = ['user-1', 'user-2']
        const teamId = 'team-123'

        const user1 = UserTestDataFactory.createTenant()
        const user2 = UserTestDataFactory.createManager()

        mockRepository.findById
          .mockResolvedValueOnce({ success: true, data: user1 })
          .mockResolvedValueOnce({ success: true, data: user2 })

        mockRepository.updateTeamBulk.mockResolvedValueOnce({
          success: true,
          data: [
            { ...user1, team_id: teamId },
            { ...user2, team_id: teamId }
          ]
        })

        const result = await service.assignToTeam(userIds, teamId)

        expect(result.success).toBe(true)
        expect(mockRepository.updateTeamBulk).toHaveBeenCalledWith(userIds, teamId)
      })

      it('should validate all users exist before team assignment', async () => {
        mockRepository.findById.mockResolvedValueOnce({
          success: true,
          data: null // User doesn't exist
        })

        const result = await service.assignToTeam(['non-existent'], 'team-123')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('NOT_FOUND')
        expect(mockRepository.updateTeamBulk).not.toHaveBeenCalled()
      })

      it('should throw ValidationException for empty user list', async () => {
        await expect(service.assignToTeam([], 'team-123')).rejects.toThrow(ValidationException)
      })
    })

    describe('Statistics', () => {
      it('should calculate user statistics', async () => {
        const allUsers = [
          UserTestDataFactory.createAdmin(),
          UserTestDataFactory.createManager(),
          UserTestDataFactory.createProvider(),
          UserTestDataFactory.createTenant(),
          UserTestDataFactory.createTenant()
        ]

        const activeUsers = allUsers.slice(0, 3)

        mockRepository.findAll.mockResolvedValueOnce({
          success: true,
          data: allUsers
        })
        mockRepository.findActiveUsers.mockResolvedValueOnce({
          success: true,
          data: activeUsers
        })
        mockRepository.findByRole
          .mockResolvedValueOnce({ success: true, data: [allUsers[0]] }) // admin
          .mockResolvedValueOnce({ success: true, data: [allUsers[1]] }) // manager
          .mockResolvedValueOnce({ success: true, data: [allUsers[2]] }) // provider
          .mockResolvedValueOnce({ success: true, data: allUsers.slice(3) }) // tenants

        const result = await service.getUserStats()

        expect(result.success).toBe(true)
        expect(result.data).toEqual({
          total: 5,
          active: 3,
          inactive: 2,
          byRole: {
            admin: 1,
            manager: 1,
            provider: 1,
            tenant: 2
          }
        })
      })
    })

    describe('Authentication', () => {
      it('should validate user credentials', async () => {
        const user = UserTestDataFactory.createManager()
        user.is_active = true

        mockRepository.findByEmail.mockResolvedValueOnce({
          success: true,
          data: user
        })
        mockRepository.updateLastSeen.mockResolvedValueOnce({
          success: true,
          data: user
        })

        const result = await service.validateCredentials('manager@example.com', 'password')

        expect(result.success).toBe(true)
        expect(result.data).toEqual(user)
        expect(mockRepository.updateLastSeen).toHaveBeenCalledWith(user.id)
      })

      it('should reject inactive user login', async () => {
        const user = UserTestDataFactory.createTenant()
        user.is_active = false

        mockRepository.findByEmail.mockResolvedValueOnce({
          success: true,
          data: user
        })

        await expect(
          service.validateCredentials('tenant@example.com', 'password')
        ).rejects.toThrow(PermissionException)
      })

      it('should return error for invalid credentials', async () => {
        mockRepository.findByEmail.mockResolvedValueOnce({
          success: true,
          data: null
        })

        const result = await service.validateCredentials('wrong@example.com', 'password')

        expect(result.success).toBe(false)
        expect(result.error?.code).toBe('INVALID_CREDENTIALS')
      })
    })

    describe('Active Users', () => {
      it('should get active users within time range', async () => {
        const activeUsers = [
          UserTestDataFactory.createAdmin(),
          UserTestDataFactory.createManager()
        ]

        mockRepository.findActiveUsers.mockResolvedValueOnce({
          success: true,
          data: activeUsers
        })

        const result = await service.getActiveUsers(7)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(activeUsers)
        expect(mockRepository.findActiveUsers).toHaveBeenCalledWith(7)
      })

      it('should validate days range', async () => {
        await expect(service.getActiveUsers(0)).rejects.toThrow(ValidationException)
        await expect(service.getActiveUsers(400)).rejects.toThrow(ValidationException)
      })
    })
  })
})
