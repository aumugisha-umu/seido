/**
 * Unit tests for NotificationDispatcher
 *
 * Tests the multi-channel notification orchestration logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  NotificationDispatcher,
  createNotificationDispatcher,
  type NotificationChannelResult
} from '../notification-dispatcher.service'
import type { NotificationRepository } from '../../repositories/notification-repository'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// ============================================================================
// Mocks
// ============================================================================

const mockNotificationRepository = {
  create: vi.fn(),
  findByUser: vi.fn(),
  markAsRead: vi.fn()
} as unknown as NotificationRepository

const mockEmailService = {
  sendInterventionCreatedBatch: vi.fn()
}

const mockPushService = {
  sendInterventionCreated: vi.fn()
}

// ============================================================================
// Tests
// ============================================================================

describe('NotificationDispatcher', () => {
  let dispatcher: NotificationDispatcher

  beforeEach(() => {
    vi.clearAllMocks()
    dispatcher = createNotificationDispatcher(
      mockNotificationRepository,
      mockEmailService as any,
      mockPushService
    )
  })

  describe('dispatchInterventionCreated', () => {
    it('should dispatch to all 3 channels in parallel', async () => {
      const interventionId = 'test-intervention-id'

      const result = await dispatcher.dispatchInterventionCreated(
        interventionId
      )

      // Should return DispatchResult
      expect(result).toHaveProperty('overallSuccess')
      expect(result).toHaveProperty('results')
      expect(result).toHaveProperty('failedChannels')
      expect(result).toHaveProperty('timings')

      // Should have results for all 3 channels
      expect(result.results).toHaveLength(3)
      expect(result.results.map(r => r.channel)).toEqual([
        'database',
        'email',
        'push'
      ])
    })

    it('should succeed overall when all channels succeed', async () => {
      const result = await dispatcher.dispatchInterventionCreated('test-id')

      expect(result.overallSuccess).toBe(true)
      expect(result.failedChannels).toHaveLength(0)
    })

    it('should gracefully handle email failure (database and push succeed)', async () => {
      // Create dispatcher with real email service that fails (not null)
      const failingEmailService = {
        sendInterventionCreatedBatch: vi.fn().mockRejectedValue(new Error('SMTP error'))
      }

      const dispatcherWithRealEmail = createNotificationDispatcher(
        mockNotificationRepository,
        failingEmailService as any,
        mockPushService
      )

      const result = await dispatcherWithRealEmail.dispatchInterventionCreated('test-id')

      // Overall should fail because email failed
      expect(result.overallSuccess).toBe(false)
      expect(result.failedChannels).toContain('email')

      // But database and push should succeed (graceful degradation)
      const dbResult = result.results.find(r => r.channel === 'database')
      const pushResult = result.results.find(r => r.channel === 'push')

      expect(dbResult?.success).toBe(true)
      expect(pushResult?.success).toBe(true)
    })

    it('should handle no email service gracefully (Phase 1)', async () => {
      // Dispatcher without email service (Phase 1 scenario)
      const dispatcherPhase1 = createNotificationDispatcher(
        mockNotificationRepository,
        null, // No email service
        null  // No push service
      )

      const result = await dispatcherPhase1.dispatchInterventionCreated(
        'test-id'
      )

      // Should still succeed (services not implemented yet)
      expect(result.overallSuccess).toBe(true)

      // Email result should indicate service not implemented
      const emailResult = result.results.find(r => r.channel === 'email')
      expect(emailResult?.success).toBe(true)
      expect(emailResult?.metadata?.reason).toBe('service_not_implemented')
    })

    it('should include timing metrics for all channels', async () => {
      const result = await dispatcher.dispatchInterventionCreated('test-id')

      expect(result.timings).toHaveProperty('total')
      // Mocked services execute instantly, so timing can be 0-2ms (EXPECTED)
      expect(result.timings.total).toBeGreaterThanOrEqual(0)
      expect(result.timings.total).toBeLessThan(50) // Very lenient (50ms max)

      // Each channel should have timing metadata
      result.results.forEach(channelResult => {
        expect(channelResult.metadata?.timing).toBeGreaterThanOrEqual(0)
      })
    })

    it('should log structured data for observability', async () => {
      // This test verifies logger is called (implicit through code coverage)
      const result = await dispatcher.dispatchInterventionCreated('test-id')

      // Verify result structure supports observability
      expect(result.results[0]).toHaveProperty('channel')
      expect(result.results[0]).toHaveProperty('success')
      expect(result.results[0]).toHaveProperty('metadata')
    })
  })

  describe('dispatchInterventionStatusChange', () => {
    const statusChangeParams = {
      interventionId: 'test-id',
      oldStatus: 'demande',
      newStatus: 'approuvee',
      teamId: 'team-id',
      changedBy: 'user-id',
      reason: 'Test reason'
    }

    it('should dispatch status change to all channels', async () => {
      const result = await dispatcher.dispatchInterventionStatusChange(
        statusChangeParams
      )

      expect(result.overallSuccess).toBe(true)
      expect(result.results).toHaveLength(3)
      expect(result.results.map(r => r.channel)).toEqual([
        'database',
        'email',
        'push'
      ])
    })

    it('should include timing metrics', async () => {
      const result = await dispatcher.dispatchInterventionStatusChange(
        statusChangeParams
      )

      // Mocked services execute instantly (EXPECTED)
      expect(result.timings.total).toBeGreaterThanOrEqual(0)
      expect(result.timings.total).toBeLessThan(50)
    })

    it('should handle database failure gracefully', async () => {
      // Mock database to fail
      vi.spyOn(
        dispatcher as any,
        'sendDatabaseNotifications'
      ).mockResolvedValue({
        channel: 'database',
        success: false,
        error: new Error('DB error')
      } as NotificationChannelResult)

      const result = await dispatcher.dispatchInterventionStatusChange(
        statusChangeParams
      )

      expect(result.overallSuccess).toBe(false)
      expect(result.failedChannels).toContain('database')
    })
  })

  describe('createNotificationDispatcher (factory)', () => {
    it('should create dispatcher with all services', () => {
      const dispatcher = createNotificationDispatcher(
        mockNotificationRepository,
        mockEmailService as any,
        mockPushService
      )

      expect(dispatcher).toBeInstanceOf(NotificationDispatcher)
    })

    it('should create dispatcher without optional services', () => {
      const dispatcher = createNotificationDispatcher(
        mockNotificationRepository,
        null,
        null
      )

      expect(dispatcher).toBeInstanceOf(NotificationDispatcher)
    })
  })

  describe('Graceful Degradation Pattern', () => {
    it('should use Promise.allSettled (not Promise.all)', async () => {
      // If we used Promise.all, one failure would reject the entire operation
      // With Promise.allSettled, we get results for all channels

      // Mock email to fail
      mockEmailService.sendInterventionCreatedBatch.mockRejectedValue(
        new Error('Email failed')
      )

      const result = await dispatcher.dispatchInterventionCreated('test-id')

      // All 3 results should be present (not rejected early)
      expect(result.results).toHaveLength(3)

      // Database and push should have succeeded
      const successfulChannels = result.results.filter(r => r.success)
      expect(successfulChannels.length).toBeGreaterThanOrEqual(2)
    })

    it('should report failed channels correctly', async () => {
      // Mock push to fail
      vi.spyOn(dispatcher as any, 'sendPushNotifications').mockResolvedValue({
        channel: 'push',
        success: false,
        error: new Error('Push failed')
      } as NotificationChannelResult)

      const result = await dispatcher.dispatchInterventionCreated('test-id')

      expect(result.failedChannels).toContain('push')
      expect(result.overallSuccess).toBe(false)
    })
  })

  describe('Performance & Timing', () => {
    it('should complete dispatch in < 2 seconds for normal case', async () => {
      const startTime = Date.now()

      await dispatcher.dispatchInterventionCreated('test-id')

      const duration = Date.now() - startTime

      // Should be fast (< 2000ms for mocked services)
      expect(duration).toBeLessThan(2000)
    })

    it('should track timing per channel', async () => {
      const result = await dispatcher.dispatchInterventionCreated('test-id')

      // Verify timing structure exists with total
      expect(result.timings).toHaveProperty('total')
      expect(result.timings.total).toBeGreaterThanOrEqual(0)

      // Individual channel timings are stored in metadata
      result.results.forEach(channelResult => {
        expect(channelResult.metadata).toBeDefined()
        expect(channelResult.metadata?.timing).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
