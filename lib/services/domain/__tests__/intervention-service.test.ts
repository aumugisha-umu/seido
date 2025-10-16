/**
 * Intervention Service Tests - Phase 3
 * Comprehensive test suite for intervention service with focus on NotFoundException usage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { InterventionService } from '../intervention-service'
import { NotFoundException, ValidationException, PermissionException } from '../../core/error-handler'
import type { InterventionRepository } from '../../repositories/intervention-repository'
import type { QuoteRepository } from '../../repositories/quote-repository'
import type { NotificationRepository } from '../../repositories/notification-repository'
import type { ConversationRepository } from '../../repositories/conversation-repository'
import type { UserService } from '../user.service'

// Mock the logger module
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  },
  logError: vi.fn()
}))

describe('InterventionService', () => {
  let service: InterventionService
  let mockInterventionRepo: any
  let mockQuoteRepo: any
  let mockNotificationRepo: any
  let mockConversationRepo: any
  let mockUserService: any

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'gestionnaire' as const,
    team_id: 'team-123'
  }

  const mockIntervention = {
    id: 'int-123',
    title: 'Test Intervention',
    description: 'Test Description',
    status: 'demande' as const,
    team_id: 'team-123',
    tenant_id: 'tenant-123'
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock repositories
    mockInterventionRepo = {
      findById: vi.fn(),
      findWithAssignments: vi.fn(),
      findByTeam: vi.fn(),
      findByTenant: vi.fn(),
      findUpcoming: vi.fn(),
      findDashboardStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      supabase: {
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null })
            }))
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          }))
        }))
      }
    }

    mockQuoteRepo = {
      create: vi.fn().mockResolvedValue({ success: true, data: {} })
    }

    mockNotificationRepo = {
      create: vi.fn().mockResolvedValue({ success: true, data: {} })
    }

    mockConversationRepo = {
      createThread: vi.fn().mockResolvedValue({ success: true, data: {} })
    }

    mockUserService = {
      getById: vi.fn()
    }

    service = new InterventionService(
      mockInterventionRepo as any,
      mockQuoteRepo as any,
      mockNotificationRepo as any,
      mockConversationRepo as any,
      mockUserService as any
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('NotFoundException Usage', () => {
    describe('create method', () => {
      it('should throw NotFoundException with correct message when user not found', async () => {
        const createData = {
          title: 'New Intervention',
          description: 'Description',
          team_id: 'team-123'
        }

        mockUserService.getById.mockResolvedValue({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        })

        const result = await service.create(createData, 'invalid-user-id')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("User with identifier 'invalid-user-id' not found")
      })

      it('should generate proper error message for numeric user ID', async () => {
        const createData = {
          title: 'New Intervention',
          description: 'Description',
          team_id: 'team-123'
        }

        // Mock user not found with numeric-like ID
        mockUserService.getById.mockResolvedValue({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        })

        const result = await service.create(createData, '12345')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("User with identifier '12345' not found")
      })

      it('should handle valid user and create intervention successfully', async () => {
        const createData = {
          title: 'New Intervention',
          description: 'Description',
          team_id: 'team-123'
        }

        mockUserService.getById.mockResolvedValue({
          success: true,
          data: { ...mockUser, role: 'locataire' }
        })

        mockInterventionRepo.create.mockResolvedValue({
          success: true,
          data: { ...mockIntervention, id: 'new-int-id' }
        })

        const result = await service.create(createData, mockUser.id)

        expect(result.success).toBe(true)
        expect(mockUserService.getById).toHaveBeenCalledWith(mockUser.id)
        expect(mockInterventionRepo.create).toHaveBeenCalled()
      })

      it('should throw PermissionException for invalid role', async () => {
        const createData = {
          title: 'New Intervention',
          description: 'Description',
          team_id: 'team-123'
        }

        mockUserService.getById.mockResolvedValue({
          success: true,
          data: { ...mockUser, role: 'prestataire' }
        })

        const result = await service.create(createData, mockUser.id)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain('You do not have permission to create interventions')
      })
    })

    describe('assignUser method', () => {
      it('should throw NotFoundException for invalid assigner', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: mockIntervention
        })

        mockUserService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        })

        const result = await service.assignUser('int-123', 'user-456', 'prestataire', 'invalid-assigner')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("User with identifier 'invalid-assigner' not found")
      })

      it('should throw NotFoundException for invalid assignee', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: mockIntervention
        })

        // First call for assigner - valid
        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: mockUser
        })

        // Second call for assignee - not found
        mockUserService.getById.mockResolvedValueOnce({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        })

        const result = await service.assignUser('int-123', 'invalid-user', 'prestataire', mockUser.id)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("User with identifier 'invalid-user' not found")
      })

      it('should successfully assign user when all validations pass', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: mockIntervention
        })

        // Assigner - valid manager
        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: { ...mockUser, role: 'gestionnaire' }
        })

        // Assignee - valid prestataire
        mockUserService.getById.mockResolvedValueOnce({
          success: true,
          data: { ...mockUser, id: 'prest-123', role: 'prestataire' }
        })

        // Mock successful assignment
        mockInterventionRepo.supabase.from = vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { intervention_id: 'int-123', user_id: 'prest-123' },
                error: null
              })
            }))
          }))
        }))

        const result = await service.assignUser('int-123', 'prest-123', 'prestataire', mockUser.id)

        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
      })
    })

    describe('confirmSchedule method', () => {
      it('should throw NotFoundException for invalid time slot', async () => {
        mockInterventionRepo.supabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '404', message: 'Not found' }
              })
            }))
          }))
        }))

        const result = await service.confirmSchedule('int-123', 'user-123', 'invalid-slot-id')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("intervention_time_slots with identifier 'invalid-slot-id' not found")
      })

      it('should handle valid time slot and update intervention', async () => {
        const mockSlot = {
          id: 'slot-123',
          start_time: '2024-01-15T10:00:00',
          end_time: '2024-01-15T12:00:00'
        }

        // Mock slot retrieval
        mockInterventionRepo.supabase.from = vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockSlot,
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }))
        }))

        // Mock intervention retrieval and update
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: { ...mockIntervention, status: 'planification' }
        })

        mockInterventionRepo.update.mockResolvedValue({
          success: true,
          data: { ...mockIntervention, status: 'planifiee' }
        })

        mockUserService.getById.mockResolvedValue({
          success: true,
          data: mockUser
        })

        const result = await service.confirmSchedule('int-123', mockUser.id, 'slot-123')

        expect(result.success).toBe(true)
        expect(mockInterventionRepo.update).toHaveBeenCalled()
      })
    })

    describe('validateTransitionPermissions', () => {
      it('should throw NotFoundException when user not found during status transition', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: mockIntervention
        })

        mockUserService.getById.mockResolvedValue({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        })

        const result = await service.approveIntervention('int-123', 'invalid-manager-id', 'Approved')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("User with identifier 'invalid-manager-id' not found")
      })

      it('should throw PermissionException for invalid role transition', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: mockIntervention
        })

        // User exists but has wrong role for approval
        mockUserService.getById.mockResolvedValue({
          success: true,
          data: { ...mockUser, role: 'locataire' }
        })

        const result = await service.approveIntervention('int-123', mockUser.id, 'Approved')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("Role 'locataire' cannot transition intervention to status 'approuvee'")
      })
    })

    describe('unassignUser method', () => {
      it('should throw NotFoundException when unassigner not found', async () => {
        mockUserService.getById.mockResolvedValue({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        })

        const result = await service.unassignUser('int-123', 'user-456', 'prestataire', 'invalid-unassigner')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("User with identifier 'invalid-unassigner' not found")
      })

      it('should successfully unassign user with valid permissions', async () => {
        mockUserService.getById.mockResolvedValue({
          success: true,
          data: { ...mockUser, role: 'gestionnaire' }
        })

        mockInterventionRepo.supabase.from = vi.fn(() => ({
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }))

        const result = await service.unassignUser('int-123', 'user-456', 'prestataire', mockUser.id)

        expect(result.success).toBe(true)
        expect(result.data?.message).toBe('User unassigned successfully')
      })
    })

    describe('delete method', () => {
      it('should throw NotFoundException when deleter not found', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: mockIntervention
        })

        mockUserService.getById.mockResolvedValue({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not found' }
        })

        const result = await service.delete('int-123', 'invalid-user')

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("User with identifier 'invalid-user' not found")
      })

      it('should throw ValidationException for invalid status', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: { ...mockIntervention, status: 'en_cours' }
        })

        mockUserService.getById.mockResolvedValue({
          success: true,
          data: { ...mockUser, role: 'gestionnaire' }
        })

        const result = await service.delete('int-123', mockUser.id)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain('Cannot delete intervention with status: en_cours')
      })

      it('should successfully delete with valid permissions', async () => {
        mockInterventionRepo.findById.mockResolvedValue({
          success: true,
          data: { ...mockIntervention, status: 'demande' }
        })

        mockUserService.getById.mockResolvedValue({
          success: true,
          data: { ...mockUser, role: 'gestionnaire' }
        })

        mockInterventionRepo.softDelete.mockResolvedValue({
          success: true,
          data: true
        })

        const result = await service.delete('int-123', mockUser.id)

        expect(result.success).toBe(true)
        expect(mockInterventionRepo.softDelete).toHaveBeenCalledWith('int-123', mockUser.id)
      })
    })
  })

  describe('Error Message Format', () => {
    it('should format User not found error correctly', async () => {
      const error = new NotFoundException('User', 'abc-123')
      expect(error.message).toBe("User with identifier 'abc-123' not found")
    })

    it('should format intervention_time_slots not found error correctly', async () => {
      const error = new NotFoundException('intervention_time_slots', 'slot-456')
      expect(error.message).toBe("intervention_time_slots with identifier 'slot-456' not found")
    })

    it('should handle UUID format identifiers', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      const error = new NotFoundException('Intervention', uuid)
      expect(error.message).toBe(`Intervention with identifier '${uuid}' not found`)
    })

    it('should handle empty string identifier', async () => {
      const error = new NotFoundException('Entity', '')
      expect(error.message).toBe("Entity with identifier '' not found")
    })
  })

  describe('Integration with Error Handler', () => {
    it('should properly wrap NotFoundException in error response', async () => {
      mockUserService.getById.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Not found' }
      })

      const result = await service.create(
        { title: 'Test', description: 'Test', team_id: 'team-123' },
        'non-existent-user'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('NOT_FOUND')
      expect(result.error?.message).toContain('non-existent-user')
    })

    it('should properly wrap ValidationException in error response', async () => {
      mockInterventionRepo.findById.mockResolvedValue({
        success: true,
        data: { ...mockIntervention, status: 'cloturee_par_gestionnaire' }
      })

      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser
      })

      const result = await service.delete('int-123', mockUser.id)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should properly wrap PermissionException in error response', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: { ...mockUser, role: 'prestataire' }
      })

      const result = await service.create(
        { title: 'Test', description: 'Test', team_id: 'team-123' },
        mockUser.id
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe('PERMISSION_DENIED')
    })
  })
})