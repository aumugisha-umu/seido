/**
 * EmailNotificationService Tests
 *
 * Tests for Phase 2 email notification batch sending
 */

// Mock logger BEFORE imports (critical for Vitest)
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  EmailNotificationService,
  type EmailBatchResult
} from '../email-notification.service'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { EmailService } from '@/lib/services/domain/email.service'
import type { InterventionRepository } from '@/lib/services/repositories/intervention-repository'
import type { UserRepository } from '@/lib/services/repositories/user-repository'
import type { BuildingRepository } from '@/lib/services/repositories/building-repository'
import type { LotRepository } from '@/lib/services/repositories/lot-repository'

// ══════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════

const mockNotificationRepository = {
  getNotificationRecipients: vi.fn()
} as unknown as NotificationRepository

const mockEmailService = {
  send: vi.fn(),
  isConfigured: vi.fn()
} as unknown as EmailService

const mockInterventionRepository = {
  getById: vi.fn()
} as unknown as InterventionRepository

const mockUserRepository = {
  getById: vi.fn()
} as unknown as UserRepository

const mockBuildingRepository = {
  getById: vi.fn()
} as unknown as BuildingRepository

const mockLotRepository = {
  getById: vi.fn()
} as unknown as LotRepository

// ══════════════════════════════════════════════════════════════
// Test Helpers
// ══════════════════════════════════════════════════════════════

function createEmailNotificationService() {
  return new EmailNotificationService(
    mockNotificationRepository,
    mockEmailService,
    mockInterventionRepository,
    mockUserRepository,
    mockBuildingRepository,
    mockLotRepository
  )
}

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('EmailNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isConfigured', () => {
    it('should return true if email service is configured', () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)

      const service = createEmailNotificationService()
      expect(service.isConfigured()).toBe(true)
    })

    it('should return false if email service is not configured', () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(false)

      const service = createEmailNotificationService()
      expect(service.isConfigured()).toBe(false)
    })
  })

  describe('sendInterventionCreatedBatch', () => {
    it('should return early if email service not configured', async () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(false)

      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('test-id', 'intervention' as any)

      expect(result).toEqual({
        success: false,
        sentCount: 0,
        failedCount: 0,
        results: []
      })

      // Should not call repositories
      expect(mockInterventionRepository.getById).not.toHaveBeenCalled()
      expect(mockNotificationRepository.getNotificationRecipients).not.toHaveBeenCalled()
    })

    it('should send emails to multiple recipients successfully', async () => {
      // Setup: Email service configured
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)

      // Setup: Intervention data
      const mockIntervention = {
        id: 'intervention-1',
        reference: 'INT-2024-001',
        type: 'Plomberie',
        description: 'Fuite sous évier',
        urgency: 'haute',
        building_id: 'building-1',
        lot_id: 'lot-1',
        tenant_id: 'tenant-1',
        assigned_to: 'manager-1',
        provider_id: null,
        created_at: new Date().toISOString()
      }

      const mockBuilding = {
        id: 'building-1',
        address: '15 Rue de la Paix, 75002 Paris'
      }

      const mockLot = {
        id: 'lot-1',
        reference: 'Apt 3B'
      }

      const mockTenant = {
        id: 'tenant-1',
        first_name: 'Marie',
        last_name: 'Dupont'
      }

      const mockRecipients = [
        {
          id: 'manager-1',
          email: 'manager@test.com',
          first_name: 'Jean',
          last_name: 'Martin',
          role: 'gestionnaire' as const
        },
        {
          id: 'admin-1',
          email: 'admin@test.com',
          first_name: 'Alice',
          last_name: 'Admin',
          role: 'admin' as const
        }
      ]

      // Mock repository responses
      vi.mocked(mockInterventionRepository.getById).mockResolvedValue(mockIntervention as any)
      vi.mocked(mockBuildingRepository.getById).mockResolvedValue(mockBuilding as any)
      vi.mocked(mockLotRepository.getById).mockResolvedValue(mockLot as any)
      vi.mocked(mockUserRepository.getById).mockImplementation(async (id) => {
        if (id === 'tenant-1') return mockTenant as any
        return null
      })
      vi.mocked(mockNotificationRepository.getNotificationRecipients).mockResolvedValue(mockRecipients as any)

      // Mock email service success
      vi.mocked(mockEmailService.send).mockResolvedValue({
        success: true,
        emailId: 'email-id-123'
      })

      // Execute
      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('intervention-1', 'intervention' as any)

      // Assert
      expect(result.success).toBe(true)
      expect(result.sentCount).toBe(2)
      expect(result.failedCount).toBe(0)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].success).toBe(true)
      expect(result.results[0].email).toBe('manager@test.com')
      expect(result.results[1].success).toBe(true)
      expect(result.results[1].email).toBe('admin@test.com')

      // Verify email service called twice
      expect(mockEmailService.send).toHaveBeenCalledTimes(2)

      // Verify email content for first recipient
      const firstEmailCall = vi.mocked(mockEmailService.send).mock.calls[0][0]
      expect(firstEmailCall.to).toBe('manager@test.com')
      expect(firstEmailCall.subject).toContain('INT-2024-001')
      expect(firstEmailCall.subject).toContain('Plomberie')
      expect(firstEmailCall.tags).toEqual([
        { name: 'type', value: 'intervention_created' },
        { name: 'intervention_id', value: 'intervention-1' },
        { name: 'user_role', value: 'gestionnaire' }
      ])
    })

    it('should handle partial email failures gracefully', async () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)

      // Setup intervention data (minimal)
      const mockIntervention = {
        id: 'intervention-1',
        reference: 'INT-2024-001',
        type: 'Plomberie',
        description: 'Test',
        urgency: 'moyenne',
        building_id: null,
        lot_id: null,
        tenant_id: null,
        created_at: new Date().toISOString()
      }

      const mockRecipients = [
        { id: 'user-1', email: 'success@test.com', first_name: 'User1', role: 'gestionnaire' as const },
        { id: 'user-2', email: 'fail@test.com', first_name: 'User2', role: 'admin' as const }
      ]

      vi.mocked(mockInterventionRepository.getById).mockResolvedValue(mockIntervention as any)
      vi.mocked(mockBuildingRepository.getById).mockResolvedValue(null)
      vi.mocked(mockLotRepository.getById).mockResolvedValue(null)
      vi.mocked(mockUserRepository.getById).mockResolvedValue(null)
      vi.mocked(mockNotificationRepository.getNotificationRecipients).mockResolvedValue(mockRecipients as any)

      // First email succeeds, second fails
      vi.mocked(mockEmailService.send)
        .mockResolvedValueOnce({ success: true, emailId: 'email-1' })
        .mockResolvedValueOnce({ success: false, error: 'SMTP error' })

      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('intervention-1', 'intervention' as any)

      expect(result.success).toBe(false) // Not all succeeded
      expect(result.sentCount).toBe(1)
      expect(result.failedCount).toBe(1)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(false)
      expect(result.results[1].error).toBe('SMTP error')
    })

    it('should return empty result if no recipients found', async () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)

      const mockIntervention = {
        id: 'intervention-1',
        reference: 'INT-2024-001',
        type: 'Plomberie',
        description: 'Test',
        urgency: 'moyenne',
        building_id: null,
        lot_id: null,
        tenant_id: null,
        created_at: new Date().toISOString()
      }

      vi.mocked(mockInterventionRepository.getById).mockResolvedValue(mockIntervention as any)
      vi.mocked(mockNotificationRepository.getNotificationRecipients).mockResolvedValue([])

      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('intervention-1', 'intervention' as any)

      expect(result.success).toBe(true)
      expect(result.sentCount).toBe(0)
      expect(result.failedCount).toBe(0)
      expect(result.results).toHaveLength(0)

      // Should not call email service
      expect(mockEmailService.send).not.toHaveBeenCalled()
    })

    it('should handle intervention not found', async () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)
      vi.mocked(mockInterventionRepository.getById).mockResolvedValue(null)

      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('non-existent', 'intervention' as any)

      expect(result.success).toBe(false)
      expect(result.sentCount).toBe(0)
      expect(result.failedCount).toBe(0)
      expect(result.results).toHaveLength(0)
    })

    it('should handle exceptions gracefully', async () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)
      vi.mocked(mockInterventionRepository.getById).mockRejectedValue(new Error('Database error'))

      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('intervention-1', 'intervention' as any)

      expect(result.success).toBe(false)
      expect(result.sentCount).toBe(0)
      expect(result.failedCount).toBe(0)
    })
  })

  describe('sendInterventionStatusChangeBatch', () => {
    it('should return stub result (Phase 2 WIP)', async () => {
      const service = createEmailNotificationService()
      const result = await service.sendInterventionStatusChangeBatch(
        'intervention-1',
        'demande' as any,
        'approuvee' as any
      )

      expect(result).toEqual({
        success: true,
        sentCount: 0,
        failedCount: 0,
        results: []
      })
    })
  })
})
