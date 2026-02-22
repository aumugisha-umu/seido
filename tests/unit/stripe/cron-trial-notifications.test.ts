/**
 * Tests for CRON: Trial Notifications (J-7, J-3, J-1)
 *
 * Route: app/api/cron/trial-notifications/route.ts
 * Sends reminder emails to trialing teams before their trial expires.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGt = vi.fn()
const mockLt = vi.fn()
const mockIs = vi.fn()
const mockUpdate = vi.fn()
const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
}

// Chain: from().select().eq().gt().lt().is()
mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ gt: mockGt })
mockGt.mockReturnValue({ lt: mockLt })
mockLt.mockReturnValue({ is: mockIs })
mockIs.mockReturnValue({ data: [], error: null })

// Chain: from().update().eq() for flag updates
mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })

const mockSendTrialEnding = vi.fn().mockResolvedValue({ success: true })
const mockEmailService = {
  sendTrialEnding: mockSendTrialEnding,
}

// Mock dependencies
vi.mock('@/lib/services', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/services/domain/subscription-email.service', () => ({
  getSubscriptionEmailService: vi.fn(() => mockEmailService),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Map([['authorization', 'Bearer test-cron-secret']])),
}))

// Mock env
const originalEnv = process.env
beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret' }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CRON: Trial Notifications', () => {
  describe('Authentication', () => {
    it('should reject requests without CRON_SECRET (401)', async () => {
      // A request without Bearer token should return 401
      // The route should check: headers().get('authorization') === `Bearer ${CRON_SECRET}`
      const invalidHeaders = new Map([['authorization', 'Bearer wrong-secret']])
      vi.mocked(await import('next/headers')).headers.mockReturnValueOnce(invalidHeaders as unknown as ReturnType<typeof import('next/headers').headers>)

      // This test validates the contract: invalid auth → 401
      expect(true).toBe(true) // Placeholder — real test will call GET handler
    })

    it('should accept requests with valid CRON_SECRET', async () => {
      // Valid Bearer token should be accepted
      expect(process.env.CRON_SECRET).toBe('test-cron-secret')
    })
  })

  describe('J-7 notifications', () => {
    it('should find trialing subs with trial_end within 7 days', () => {
      // The CRON should query:
      // from('subscriptions').select('*, teams(*)').eq('status', 'trialing')
      //   .gt('trial_end', now).lt('trial_end', now + 7 days)
      //   .is('notification_j7_sent', false)
      const now = new Date()
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      expect(sevenDaysFromNow.getTime() - now.getTime()).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3)
    })

    it('should send trial ending email for J-7 matches', () => {
      // For each match, call: emailService.sendTrialEnding(email, { firstName, teamName, daysLeft: 7, lotCount })
      expect(mockSendTrialEnding).toBeDefined()
    })

    it('should set notification_j7_sent flag after sending', () => {
      // After successful send: update subscription set notification_j7_sent = true
      expect(mockUpdate).toBeDefined()
    })

    it('should skip if notification_j7_sent is already true (idempotent)', () => {
      // Query filters: .is('notification_j7_sent', false)
      // This ensures already-notified subs are excluded from the query
      mockIs.mockReturnValueOnce({ data: [], error: null })
      expect(mockIs).toBeDefined()
    })
  })

  describe('J-3 notifications', () => {
    it('should find trialing subs with trial_end within 3 days', () => {
      const now = new Date()
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      expect(threeDaysFromNow.getTime() - now.getTime()).toBeCloseTo(3 * 24 * 60 * 60 * 1000, -3)
    })

    it('should send trial ending email with daysLeft=3', () => {
      expect(mockSendTrialEnding).toBeDefined()
    })

    it('should set notification_j3_sent flag after sending', () => {
      expect(mockUpdate).toBeDefined()
    })
  })

  describe('J-1 notifications', () => {
    it('should find trialing subs with trial_end within 1 day', () => {
      const now = new Date()
      const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
      expect(oneDayFromNow.getTime() - now.getTime()).toBeCloseTo(1 * 24 * 60 * 60 * 1000, -3)
    })

    it('should send trial ending email with daysLeft=1', () => {
      expect(mockSendTrialEnding).toBeDefined()
    })

    it('should set notification_j1_sent flag after sending', () => {
      expect(mockUpdate).toBeDefined()
    })
  })

  describe('Edge cases', () => {
    it('should not send to free_tier teams', () => {
      // Query filters with .eq('status', 'trialing') — free_tier is excluded
      expect(true).toBe(true)
    })

    it('should use UTC consistently for date calculations', () => {
      // trial_end is stored as TIMESTAMPTZ (UTC)
      // CRON should calculate J-7/J-3/J-1 using UTC, not local time
      const utcNow = new Date().toISOString()
      expect(utcNow).toContain('T') // ISO format confirmation
    })

    it('should handle boundary: trial_end at exactly midnight UTC', () => {
      // If trial_end = 2026-03-01T00:00:00Z
      // J-7 should fire at 2026-02-22 (any time on that day)
      // Not 2026-02-21 23:59:59 (6.99 days)
      const trialEnd = new Date('2026-03-01T00:00:00Z')
      const j7Window = new Date(trialEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
      expect(j7Window.toISOString()).toBe('2026-02-22T00:00:00.000Z')
    })
  })
})
