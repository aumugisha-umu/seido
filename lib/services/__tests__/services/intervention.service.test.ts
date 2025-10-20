/**
 * Intervention Service Tests - Phase 3.3
 * Comprehensive test suite for intervention workflow and business logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InterventionService } from '../../domain/intervention.service'
import { InterventionRepository } from '../../repositories/intervention.repository'
import { UserService } from '../../domain/user.service'
import { LotService } from '../../domain/lot.service'
import { ContactService } from '../../domain/contact.service'
import { ValidationException, NotFoundException } from '../../core/error-handler'
import {
  UserTestDataFactory,
  LotTestDataFactory,
  InterventionTestDataFactory,
  ContactTestDataFactory
} from '../helpers/test-data'
import type { Intervention, User, Lot } from '../../core/service-types'

// Mock dependencies
const mockRepository = {
  findById: vi.fn(),
  findByIdWithRelations: vi.fn(),
  findAllWithRelations: vi.fn(),
  findByTenant: vi.fn(),
  findByLot: vi.fn(),
  findByBuilding: vi.fn(),
  findByProvider: vi.fn(),
  findByStatus: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  updateStatus: vi.fn(),
  assignToProvider: vi.fn(),
  removeProviderAssignment: vi.fn(),
  getInterventionStats: vi.fn(),
  getDocuments: vi.fn(),
  count: vi.fn()
} as unknown as InterventionRepository

const mockUserService = {
  getById: vi.fn()
} as unknown as UserService

const mockLotService = {
  getById: vi.fn()
} as unknown as LotService

const mockContactService = {
  getBuildingContacts: vi.fn()
} as unknown as ContactService

describe('InterventionService', () => {
  let service: InterventionService
  let mockManager: User
  let mockProvider: User
  let mockTenant: User
  let mockIntervention: Intervention
  let mockLot: Lot

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create service instance
    service = new InterventionService(
      mockRepository,
      mockUserService,
      mockLotService,
      mockContactService
    )

    // Create test data
    mockManager = UserTestDataFactory.create({ role: 'gestionnaire' })
    mockProvider = UserTestDataFactory.create({ role: 'prestataire' })
    mockTenant = UserTestDataFactory.create({ role: 'locataire' })
    mockLot = LotTestDataFactory.create()
    mockIntervention = InterventionTestDataFactory.create({
      lot_id: mockLot.id,
      requested_by: mockTenant.id,
      assigned_to: mockProvider.id
    })
  })

  describe('Basic CRUD Operations', () => {
    it('should get all interventions with pagination', async () => {
      const mockInterventions = [mockIntervention]
      mockRepository.findAllWithRelations = vi.fn().mockResolvedValue({
        success: true,
        data: mockInterventions
      })

      const result = await service.getAll({ page: 1, limit: 10 })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInterventions)
      expect(mockRepository.findAllWithRelations).toHaveBeenCalledWith({ page: 1, limit: 10 })
    })

    it('should get intervention by ID', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockIntervention
      })

      const result = await service.getById(mockIntervention.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockIntervention)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockIntervention.id)
    })

    it('should get intervention by ID with relations', async () => {
      mockRepository.findByIdWithRelations = vi.fn().mockResolvedValue({
        success: true,
        data: mockIntervention
      })

      const result = await service.getByIdWithRelations(mockIntervention.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockIntervention)
      expect(mockRepository.findByIdWithRelations).toHaveBeenCalledWith(mockIntervention.id)
    })

    it('should create intervention with validation', async () => {
      const insertData = {
        lot_id: mockLot.id,
        title: 'Test Intervention',
        description: 'Test description',
        priority: 'medium' as const,
        category: 'maintenance',
        requested_by: mockTenant.id
      }

      // Mock dependencies
      mockLotService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockLot
      })
      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTenant
      })
      mockRepository.create = vi.fn().mockResolvedValue({
        success: true,
        data: mockIntervention
      })

      const result = await service.create(insertData, mockTenant)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockIntervention)
      expect(mockLotService.getById).toHaveBeenCalledWith(mockLot.id)
      expect(mockUserService.getById).toHaveBeenCalledWith(mockTenant.id)
      expect(mockRepository.create).toHaveBeenCalled()
    })

    it('should fail to create intervention with invalid lot', async () => {
      const insertData = {
        lot_id: 'invalid-lot-id',
        title: 'Test Intervention',
        description: 'Test description',
        priority: 'medium' as const,
        category: 'maintenance',
        requested_by: mockTenant.id
      }

      mockLotService.getById = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Lot not found' }
      })

      await expect(service.create(insertData)).rejects.toThrow(NotFoundException)
      expect(mockLotService.getById).toHaveBeenCalledWith('invalid-lot-id')
    })

    it('should update intervention with validation', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description'
      }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: mockIntervention
      })
      mockRepository.update = vi.fn().mockResolvedValue({
        success: true,
        data: { ...mockIntervention, ...updates }
      })

      const result = await service.update(mockIntervention.id, updates, mockManager)

      expect(result.success).toBe(true)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockIntervention.id)
      expect(mockRepository.update).toHaveBeenCalled()
    })

    it('should delete intervention with validation', async () => {
      const pendingIntervention = { ...mockIntervention, status: 'pending' as const }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: pendingIntervention
      })
      mockRepository.delete = vi.fn().mockResolvedValue({
        success: true,
        data: true
      })

      const result = await service.delete(mockIntervention.id, mockManager)

      expect(result.success).toBe(true)
      expect(mockRepository.findById).toHaveBeenCalledWith(mockIntervention.id)
      expect(mockRepository.delete).toHaveBeenCalledWith(mockIntervention.id)
    })

    it('should not delete intervention in progress', async () => {
      const inProgressIntervention = { ...mockIntervention, status: 'in_progress' as const }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: inProgressIntervention
      })

      await expect(service.delete(mockIntervention.id, mockManager))
        .rejects.toThrow(ValidationException)
      expect(mockRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('Query Methods', () => {
    it('should get interventions by tenant', async () => {
      const mockInterventions = [mockIntervention]
      mockRepository.findByTenant = vi.fn().mockResolvedValue({
        success: true,
        data: mockInterventions
      })

      const result = await service.getByTenant(mockTenant.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInterventions)
      expect(mockRepository.findByTenant).toHaveBeenCalledWith(mockTenant.id)
    })

    it('should get interventions by lot', async () => {
      const mockInterventions = [mockIntervention]
      mockRepository.findByLot = vi.fn().mockResolvedValue({
        success: true,
        data: mockInterventions
      })

      const result = await service.getByLot(mockLot.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInterventions)
      expect(mockRepository.findByLot).toHaveBeenCalledWith(mockLot.id)
    })

    it('should get interventions by building', async () => {
      const mockInterventions = [mockIntervention]
      mockRepository.findByBuilding = vi.fn().mockResolvedValue({
        success: true,
        data: mockInterventions
      })

      const result = await service.getByBuilding('building-id')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInterventions)
      expect(mockRepository.findByBuilding).toHaveBeenCalledWith('building-id')
    })

    it('should get interventions by provider', async () => {
      const mockInterventions = [mockIntervention]
      mockRepository.findByProvider = vi.fn().mockResolvedValue({
        success: true,
        data: mockInterventions
      })

      const result = await service.getByProvider(mockProvider.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInterventions)
      expect(mockRepository.findByProvider).toHaveBeenCalledWith(mockProvider.id)
    })

    it('should get interventions by status', async () => {
      const mockInterventions = [mockIntervention]
      mockRepository.findByStatus = vi.fn().mockResolvedValue({
        success: true,
        data: mockInterventions
      })

      const result = await service.getByStatus('pending')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockInterventions)
      expect(mockRepository.findByStatus).toHaveBeenCalledWith('pending')
    })
  })

  describe('Workflow Actions', () => {
    describe('Approve Intervention', () => {
      it('should approve intervention as manager', async () => {
        const approvalData = {
          action: 'approve' as const,
          internalComment: 'Approved by manager'
        }

        mockRepository.updateStatus = vi.fn().mockResolvedValue({
          success: true,
          data: { ...mockIntervention, status: 'approved' }
        })

        const result = await service.approveIntervention(mockIntervention.id, approvalData, mockManager)

        expect(result.success).toBe(true)
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(mockIntervention.id, 'approved')
      })

      it('should not approve intervention as non-manager', async () => {
        const approvalData = {
          action: 'approve' as const
        }

        await expect(service.approveIntervention(mockIntervention.id, approvalData, mockTenant))
          .rejects.toThrow(ValidationException)
        expect(mockRepository.updateStatus).not.toHaveBeenCalled()
      })

      it('should validate approval action', async () => {
        const invalidApprovalData = {
          action: 'reject' as const // Invalid for approve method
        }

        await expect(service.approveIntervention(mockIntervention.id, invalidApprovalData, mockManager))
          .rejects.toThrow(ValidationException)
      })
    })

    describe('Reject Intervention', () => {
      it('should reject intervention with reason', async () => {
        const rejectionData = {
          action: 'reject' as const,
          rejectionReason: 'Budget constraints',
          internalComment: 'Rejected due to budget'
        }

        mockRepository.update = vi.fn().mockResolvedValue({
          success: true,
          data: { ...mockIntervention, status: 'cancelled' }
        })

        const result = await service.rejectIntervention(mockIntervention.id, rejectionData, mockManager)

        expect(result.success).toBe(true)
        expect(mockRepository.update).toHaveBeenCalledWith(
          mockIntervention.id,
          expect.objectContaining({
            status: 'cancelled',
            notes: 'Budget constraints'
          })
        )
      })

      it('should require rejection reason', async () => {
        const invalidRejectionData = {
          action: 'reject' as const
          // Missing rejectionReason
        }

        await expect(service.rejectIntervention(mockIntervention.id, invalidRejectionData, mockManager))
          .rejects.toThrow(ValidationException)
      })
    })

    describe('Schedule Intervention', () => {
      it('should schedule intervention with direct planning', async () => {
        const approvedIntervention = { ...mockIntervention, status: 'approved' as const }
        const planningData = {
          option: 'direct' as const,
          directSchedule: {
            date: '2024-01-15',
            startTime: '09:00',
            endTime: '12:00'
          }
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: approvedIntervention
        })
        mockRepository.update = vi.fn().mockResolvedValue({
          success: true,
          data: { ...approvedIntervention, status: 'in_progress' }
        })

        const result = await service.scheduleIntervention(mockIntervention.id, planningData, mockManager)

        expect(result.success).toBe(true)
        expect(mockRepository.update).toHaveBeenCalledWith(
          mockIntervention.id,
          expect.objectContaining({
            status: 'in_progress',
            scheduled_date: expect.any(String)
          })
        )
      })

      it('should not schedule non-approved intervention', async () => {
        const pendingIntervention = { ...mockIntervention, status: 'pending' as const }
        const planningData = {
          option: 'direct' as const,
          directSchedule: {
            date: '2024-01-15',
            startTime: '09:00',
            endTime: '12:00'
          }
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: pendingIntervention
        })

        await expect(service.scheduleIntervention(mockIntervention.id, planningData, mockManager))
          .rejects.toThrow(ValidationException)
      })
    })

    describe('Start Execution', () => {
      it('should start execution as assigned provider', async () => {
        const approvedIntervention = {
          ...mockIntervention,
          status: 'approved' as const,
          assigned_to: mockProvider.id
        }
        const executionData = {
          action: 'start' as const,
          comment: 'Starting work on site'
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: approvedIntervention
        })
        mockRepository.update = vi.fn().mockResolvedValue({
          success: true,
          data: { ...approvedIntervention, status: 'in_progress' }
        })

        const result = await service.startExecution(mockIntervention.id, executionData, mockProvider)

        expect(result.success).toBe(true)
        expect(mockRepository.update).toHaveBeenCalledWith(
          mockIntervention.id,
          expect.objectContaining({
            status: 'in_progress',
            notes: 'Starting work on site'
          })
        )
      })

      it('should not start execution if not assigned provider', async () => {
        const approvedIntervention = {
          ...mockIntervention,
          status: 'approved' as const,
          assigned_to: 'different-provider-id'
        }
        const executionData = {
          action: 'start' as const,
          comment: 'Starting work'
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: approvedIntervention
        })

        await expect(service.startExecution(mockIntervention.id, executionData, mockProvider))
          .rejects.toThrow(ValidationException)
      })
    })

    describe('Complete Execution', () => {
      it('should complete execution as assigned provider', async () => {
        const inProgressIntervention = {
          ...mockIntervention,
          status: 'in_progress' as const,
          assigned_to: mockProvider.id
        }
        const executionData = {
          action: 'complete' as const,
          comment: 'Work completed successfully',
          actualDuration: 180 // 3 hours in minutes
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: inProgressIntervention
        })
        mockRepository.update = vi.fn().mockResolvedValue({
          success: true,
          data: { ...inProgressIntervention, status: 'completed' }
        })

        const result = await service.completeExecution(mockIntervention.id, executionData, mockProvider)

        expect(result.success).toBe(true)
        expect(mockRepository.update).toHaveBeenCalledWith(
          mockIntervention.id,
          expect.objectContaining({
            status: 'completed',
            actual_duration: 180,
            notes: 'Work completed successfully',
            completed_date: expect.any(String)
          })
        )
      })

      it('should not complete execution if not in progress', async () => {
        const approvedIntervention = {
          ...mockIntervention,
          status: 'approved' as const,
          assigned_to: mockProvider.id
        }
        const executionData = {
          action: 'complete' as const,
          comment: 'Trying to complete'
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: approvedIntervention
        })

        await expect(service.completeExecution(mockIntervention.id, executionData, mockProvider))
          .rejects.toThrow(ValidationException)
      })
    })

    describe('Finalize Intervention', () => {
      it('should finalize intervention as manager', async () => {
        const completedIntervention = {
          ...mockIntervention,
          status: 'completed' as const
        }
        const finalizationData = {
          finalAmount: 250.00,
          paymentComment: 'Payment approved',
          managerComment: 'Work quality satisfactory'
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: completedIntervention
        })
        mockRepository.update = vi.fn().mockResolvedValue({
          success: true,
          data: { ...completedIntervention, final_amount: 250.00 }
        })

        const result = await service.finalizeIntervention(mockIntervention.id, finalizationData, mockManager)

        expect(result.success).toBe(true)
        expect(mockRepository.update).toHaveBeenCalledWith(
          mockIntervention.id,
          expect.objectContaining({
            final_amount: 250.00,
            notes: 'Work quality satisfactory'
          })
        )
      })

      it('should not finalize non-completed intervention', async () => {
        const inProgressIntervention = {
          ...mockIntervention,
          status: 'in_progress' as const
        }
        const finalizationData = {
          finalAmount: 250.00
        }

        mockRepository.findById = vi.fn().mockResolvedValue({
          success: true,
          data: inProgressIntervention
        })

        await expect(service.finalizeIntervention(mockIntervention.id, finalizationData, mockManager))
          .rejects.toThrow(ValidationException)
      })
    })
  })

  describe('Provider Assignment', () => {
    it('should assign provider to intervention', async () => {
      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockProvider
      })
      mockRepository.assignToProvider = vi.fn().mockResolvedValue({
        success: true,
        data: { intervention_id: mockIntervention.id, user_id: mockProvider.id }
      })

      const result = await service.assignProvider(mockIntervention.id, mockProvider.id, mockManager)

      expect(result.success).toBe(true)
      expect(mockUserService.getById).toHaveBeenCalledWith(mockProvider.id)
      expect(mockRepository.assignToProvider).toHaveBeenCalledWith(mockIntervention.id, mockProvider.id, true)
    })

    it('should not assign non-provider to intervention', async () => {
      mockUserService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: mockTenant // Not a provider
      })

      await expect(service.assignProvider(mockIntervention.id, mockTenant.id, mockManager))
        .rejects.toThrow(ValidationException)
      expect(mockRepository.assignToProvider).not.toHaveBeenCalled()
    })

    it('should not assign provider as non-manager', async () => {
      await expect(service.assignProvider(mockIntervention.id, mockProvider.id, mockTenant))
        .rejects.toThrow(ValidationException)
    })

    it('should remove provider assignment', async () => {
      mockRepository.removeProviderAssignment = vi.fn().mockResolvedValue({
        success: true,
        data: { intervention_id: mockIntervention.id, user_id: mockProvider.id }
      })

      const result = await service.removeProviderAssignment(mockIntervention.id, mockProvider.id, mockManager)

      expect(result.success).toBe(true)
      expect(mockRepository.removeProviderAssignment).toHaveBeenCalledWith(mockIntervention.id, mockProvider.id)
    })
  })

  describe('Statistics and Documents', () => {
    it('should get intervention statistics', async () => {
      const mockStats = {
        total: 100,
        byStatus: {
          pending: 20,
          approved: 15,
          in_progress: 10,
          completed: 50,
          cancelled: 5
        },
        byPriority: {
          low: 30,
          medium: 40,
          high: 25,
          urgent: 5
        }
      }

      mockRepository.getInterventionStats = vi.fn().mockResolvedValue({
        success: true,
        data: mockStats
      })

      const result = await service.getStats()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockStats)
      expect(mockRepository.getInterventionStats).toHaveBeenCalled()
    })

    it('should get intervention documents', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'report.pdf',
          uploaded_at: '2024-01-01T10:00:00Z'
        }
      ]

      mockRepository.getDocuments = vi.fn().mockResolvedValue({
        success: true,
        data: mockDocuments
      })

      const result = await service.getDocuments(mockIntervention.id)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockDocuments)
      expect(mockRepository.getDocuments).toHaveBeenCalledWith(mockIntervention.id)
    })

    it('should count total interventions', async () => {
      mockRepository.count = vi.fn().mockResolvedValue(150)

      const result = await service.count()

      expect(result.success).toBe(true)
      expect(result.data).toBe(150)
      expect(mockRepository.count).toHaveBeenCalled()
    })
  })

  describe('Status Transition Validation', () => {
    it('should validate status transitions', async () => {
      const pendingIntervention = { ...mockIntervention, status: 'pending' as const }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: pendingIntervention
      })
      mockRepository.update = vi.fn().mockResolvedValue({
        success: true,
        data: { ...pendingIntervention, status: 'approved' }
      })

      // Valid transition: pending -> approved
      const result = await service.update(mockIntervention.id, { status: 'approved' }, mockManager)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status transitions', async () => {
      const pendingIntervention = { ...mockIntervention, status: 'pending' as const }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: pendingIntervention
      })

      // Invalid transition: pending -> completed (should go through approved and in_progress)
      await expect(service.update(mockIntervention.id, { status: 'completed' }, mockManager))
        .rejects.toThrow(ValidationException)
    })

    it('should enforce role-based status transitions', async () => {
      const pendingIntervention = { ...mockIntervention, status: 'pending' as const }

      mockRepository.findById = vi.fn().mockResolvedValue({
        success: true,
        data: pendingIntervention
      })

      // Tenant cannot approve intervention
      await expect(service.update(mockIntervention.id, { status: 'approved' }, mockTenant))
        .rejects.toThrow(ValidationException)
    })
  })

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.findById = vi.fn().mockRejectedValue(new Error('Database connection failed'))

      await expect(service.getById(mockIntervention.id))
        .rejects.toThrow('Database connection failed')
    })

    it('should handle not found errors', async () => {
      mockRepository.findById = vi.fn().mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Intervention not found' }
      })

      const result = await service.getById('non-existent-id')
      expect(result.success).toBe(false)
    })
  })
})
