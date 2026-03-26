/**
 * EmailNotificationService Tests
 *
 * Tests for the refactored email notification module.
 * The service delegates to InterventionDataEnricher + BatchEmailSender internally.
 *
 * Key mocks:
 * - supabase-client: Chainable Supabase mock for enricher's direct DB queries
 * - magic-link.service: generateMagicLinksBatch returns Map of email → URL
 * - notification-helpers: determineInterventionRecipients returns recipient list
 * - Repositories: findById (not getById) for lot, building, user lookups
 */

// ══════════════════════════════════════════════════════════════
// Module mocks (BEFORE imports — critical for Vitest hoisting)
// ══════════════════════════════════════════════════════════════

// Track which table is queried so .single() can return the right data
let _supabaseLastTable = ''
const _supabaseMockChain = {
  from: vi.fn((table: string) => {
    _supabaseLastTable = table
    return _supabaseMockChain
  }),
  select: vi.fn().mockReturnValue(undefined as any), // overridden in beforeEach
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnValue(undefined as any), // overridden in beforeEach
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
}
// .select() must return the chain (for regular selects and count selects)
_supabaseMockChain.select.mockReturnValue(_supabaseMockChain)

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

vi.mock('@/lib/services/core/supabase-client', () => ({
  createServiceRoleSupabaseClient: vi.fn(() => _supabaseMockChain),
  createServerSupabaseClient: vi.fn(() => _supabaseMockChain),
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
}))

vi.mock('@/lib/services/domain/magic-link.service', () => ({
  generateMagicLinksBatch: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('@/lib/services/domain/notification-helpers', () => ({
  determineInterventionRecipients: vi.fn().mockReturnValue([]),
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  EmailNotificationService,
  type EmailBatchResult
} from '../email-notification.service'
import { determineInterventionRecipients } from '@/lib/services/domain/notification-helpers'
import { generateMagicLinksBatch } from '@/lib/services/domain/magic-link.service'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'
import type { EmailService } from '@/lib/services/domain/email.service'
import type { InterventionRepository } from '@/lib/services/repositories/intervention-repository'
import type { UserRepository } from '@/lib/services/repositories/user-repository'
import type { BuildingRepository } from '@/lib/services/repositories/building-repository'
import type { LotRepository } from '@/lib/services/repositories/lot-repository'

// ══════════════════════════════════════════════════════════════
// Mock Repositories
// ══════════════════════════════════════════════════════════════

const mockNotificationRepository = {
  getInterventionWithManagers: vi.fn()
} as unknown as NotificationRepository

const mockEmailService = {
  send: vi.fn(),
  isConfigured: vi.fn()
} as unknown as EmailService

const mockInterventionRepository = {
  findById: vi.fn()
} as unknown as InterventionRepository

const mockUserRepository = {
  findById: vi.fn(),
  findByIdsWithAuth: vi.fn()
} as unknown as UserRepository

const mockBuildingRepository = {
  findById: vi.fn()
} as unknown as BuildingRepository

const mockLotRepository = {
  findById: vi.fn()
} as unknown as LotRepository

// ══════════════════════════════════════════════════════════════
// Test Data
// ══════════════════════════════════════════════════════════════

const MOCK_INTERVENTION = {
  id: 'intervention-1',
  reference: 'INT-2024-001',
  type: 'Plomberie',
  title: 'Fuite sous évier',
  description: 'Fuite sous évier',
  urgency: 'haute',
  status: 'demande',
  building_id: null,
  lot_id: 'lot-1',
  tenant_id: null,
  assigned_to: null,
  provider_id: null,
  requires_quote: false,
  estimated_cost: null,
  created_by: 'creator-1',
  created_at: new Date().toISOString(),
  team_id: 'team-1',
}

// ══════════════════════════════════════════════════════════════
// Helpers
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

/**
 * Setup Supabase mock to return an intervention from .single()
 * and empty arrays/null from other queries.
 */
function setupSupabaseMock(intervention: typeof MOCK_INTERVENTION | null) {
  _supabaseMockChain.single.mockImplementation(async () => {
    if (_supabaseLastTable === 'interventions') {
      return intervention
        ? { data: intervention, error: null }
        : { data: null, error: { message: 'Not found' } }
    }
    // intervention_time_slots, intervention_quotes — return null
    return { data: null, error: null }
  })

  // For intervention_documents with count
  _supabaseMockChain.select.mockImplementation((..._args: unknown[]) => {
    // Return chain with count = 0 for documents
    return { ..._supabaseMockChain, count: 0 }
  })
  // Re-mock select to still return the chain for chaining
  _supabaseMockChain.select.mockReturnValue(_supabaseMockChain)
}

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('EmailNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset select to return chain by default
    _supabaseMockChain.select.mockReturnValue(_supabaseMockChain)
    _supabaseMockChain.single.mockResolvedValue({ data: null, error: null })
    _supabaseMockChain.maybeSingle.mockResolvedValue({ data: null, error: null })
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
    })

    it('should send emails to multiple recipients successfully', async () => {
      // Setup: Email service configured
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)

      // Setup: Supabase mock returns intervention
      setupSupabaseMock(MOCK_INTERVENTION)

      // Setup: Lot & building via repositories (enricher uses findById)
      vi.mocked(mockLotRepository.findById).mockResolvedValue({
        success: true,
        data: { id: 'lot-1', reference: 'Apt 3B', building_id: 'building-1' }
      } as any)
      vi.mocked(mockBuildingRepository.findById).mockResolvedValue({
        success: true,
        data: { id: 'building-1', address_record: { street: '15 Rue de la Paix', city: 'Paris', zip_code: '75002' } }
      } as any)

      // Setup: Creator lookup
      vi.mocked(mockUserRepository.findById).mockResolvedValue({
        success: true,
        data: { id: 'creator-1', first_name: 'Admin', last_name: 'User' }
      } as any)

      // Setup: Recipients via notification pipeline
      // 1) getInterventionWithManagers returns enriched intervention
      vi.mocked(mockNotificationRepository.getInterventionWithManagers).mockResolvedValue({
        interventionId: 'intervention-1',
        interventionManagers: ['manager-1', 'admin-1'],
        interventionAssignedProviders: [],
        interventionTenantId: null,
        interventionCreatedBy: 'creator-1',
      })

      // 2) determineInterventionRecipients filters & returns recipients
      vi.mocked(determineInterventionRecipients).mockReturnValue([
        { userId: 'manager-1', role: 'gestionnaire' as any },
        { userId: 'admin-1', role: 'admin' as any },
      ])

      // 3) findByIdsWithAuth returns user details with emails
      vi.mocked(mockUserRepository.findByIdsWithAuth).mockResolvedValue({
        success: true,
        data: [
          { id: 'manager-1', email: 'manager@test.com', first_name: 'Jean', last_name: 'Martin', role: 'gestionnaire' },
          { id: 'admin-1', email: 'admin@test.com', first_name: 'Alice', last_name: 'Admin', role: 'admin' },
        ]
      } as any)

      // Setup: Magic links
      vi.mocked(generateMagicLinksBatch).mockResolvedValue(
        new Map([
          ['manager@test.com', 'https://test.com/magic/manager'],
          ['admin@test.com', 'https://test.com/magic/admin'],
        ])
      )

      // Setup: Email send success
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
    })

    it('should handle partial email failures gracefully', async () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)

      // Setup: Supabase mock returns minimal intervention
      const minimalIntervention = { ...MOCK_INTERVENTION, lot_id: null }
      setupSupabaseMock(minimalIntervention)

      // No lot/building
      vi.mocked(mockUserRepository.findById).mockResolvedValue({ success: false, data: null } as any)

      // Recipients pipeline
      vi.mocked(mockNotificationRepository.getInterventionWithManagers).mockResolvedValue({
        interventionId: 'intervention-1',
        interventionManagers: ['user-1', 'user-2'],
        interventionAssignedProviders: [],
        interventionTenantId: null,
        interventionCreatedBy: 'creator-1',
      })
      vi.mocked(determineInterventionRecipients).mockReturnValue([
        { userId: 'user-1', role: 'gestionnaire' as any },
        { userId: 'user-2', role: 'admin' as any },
      ])
      vi.mocked(mockUserRepository.findByIdsWithAuth).mockResolvedValue({
        success: true,
        data: [
          { id: 'user-1', email: 'success@test.com', first_name: 'User1', role: 'gestionnaire' },
          { id: 'user-2', email: 'fail@test.com', first_name: 'User2', role: 'admin' },
        ]
      } as any)
      vi.mocked(generateMagicLinksBatch).mockResolvedValue(new Map())

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

      // Setup: Supabase returns intervention
      setupSupabaseMock(MOCK_INTERVENTION)
      vi.mocked(mockLotRepository.findById).mockResolvedValue({
        success: true, data: { id: 'lot-1', reference: 'Apt 3B' }
      } as any)
      vi.mocked(mockUserRepository.findById).mockResolvedValue({ success: false, data: null } as any)

      // Recipients pipeline returns empty
      vi.mocked(mockNotificationRepository.getInterventionWithManagers).mockResolvedValue({
        interventionId: 'intervention-1',
        interventionManagers: [],
        interventionAssignedProviders: [],
        interventionTenantId: null,
        interventionCreatedBy: 'creator-1',
      })
      vi.mocked(determineInterventionRecipients).mockReturnValue([])

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

      // Supabase returns null intervention
      setupSupabaseMock(null)

      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('non-existent', 'intervention' as any)

      expect(result.success).toBe(false)
      expect(result.sentCount).toBe(0)
      expect(result.failedCount).toBe(0)
      expect(result.results).toHaveLength(0)
    })

    it('should handle exceptions gracefully', async () => {
      vi.mocked(mockEmailService.isConfigured).mockReturnValue(true)

      // Supabase throws
      _supabaseMockChain.single.mockRejectedValue(new Error('Database error'))

      const service = createEmailNotificationService()
      const result = await service.sendInterventionCreatedBatch('intervention-1', 'intervention' as any)

      expect(result.success).toBe(false)
      expect(result.sentCount).toBe(0)
      expect(result.failedCount).toBe(0)
    })
  })

  describe('sendInterventionStatusChangeBatch', () => {
    it('should return stub result (deprecated)', async () => {
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
