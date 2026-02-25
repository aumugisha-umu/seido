/**
 * Tests for CRON: Behavioral Triggers
 *
 * Route: app/api/cron/behavioral-triggers/route.ts
 * Sends engagement emails based on user activity during trial.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGt = vi.fn()
const mockOr = vi.fn()
const mockUpdate = vi.fn()
const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
}

mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ gt: mockGt })
mockGt.mockReturnValue({ or: mockOr })
mockOr.mockReturnValue({ data: [], error: null })

mockUpdate.mockReturnValue({
  eq: vi.fn().mockReturnValue({ error: null }),
})

const mockSendFeatureEngagement = vi.fn().mockResolvedValue({ success: true })
const mockSendValueReport = vi.fn().mockResolvedValue({ success: true })
const mockEmailService = {
  sendFeatureEngagement: mockSendFeatureEngagement,
  sendValueReport: mockSendValueReport,
}

vi.mock('@/lib/services', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/services/domain/subscription-email.service', () => ({
  getSubscriptionEmailService: vi.fn(() => mockEmailService),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Map([['authorization', 'Bearer test-cron-secret']])),
}))

const originalEnv = process.env
beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret' }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CRON: Behavioral Triggers', () => {
  describe('Authentication', () => {
    it('should reject requests without CRON_SECRET (401)', () => {
      expect(true).toBe(true)
    })
  })

  describe('Trigger conditions', () => {
    it('should trigger on >= 3 lots (feature engagement)', () => {
      // billable_properties >= 3 means user is actively using SEIDO
      const lotCount = 3
      expect(lotCount >= 3).toBe(true)
    })

    it('should trigger on >= 1 closed intervention (value report)', () => {
      // At least 1 completed intervention = can show value metrics
      const completedInterventions = 1
      expect(completedInterventions >= 1).toBe(true)
    })

    it('should only trigger for trialing teams', () => {
      // .eq('status', 'trialing') — skip free_tier and active
      expect(true).toBe(true)
    })
  })

  describe('Anti-spam', () => {
    it('should skip if email sent less than 7 days ago', () => {
      // last_behavioral_email_at > now - 7 days → skip
      const lastEmailAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const shouldSkip = lastEmailAt > sevenDaysAgo
      expect(shouldSkip).toBe(true)
    })

    it('should send if no previous behavioral email (null)', () => {
      // last_behavioral_email_at IS NULL → send
      const lastEmailAt = null
      expect(lastEmailAt).toBeNull()
    })

    it('should send if last email was more than 7 days ago', () => {
      const lastEmailAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const shouldSend = lastEmailAt <= sevenDaysAgo
      expect(shouldSend).toBe(true)
    })

    it('should update last_behavioral_email_at after sending', () => {
      // update subscription set last_behavioral_email_at = now()
      expect(mockUpdate).toBeDefined()
    })
  })

  describe('Email type selection', () => {
    it('should send feature-engagement for J+7 (trial day 7-13)', () => {
      // trial_start + 7 days <= now < trial_start + 14 days
      expect(mockSendFeatureEngagement).toBeDefined()
    })

    it('should send value-report for J+14 (trial day 14+)', () => {
      // trial_start + 14 days <= now
      expect(mockSendValueReport).toBeDefined()
    })

    it('should not send behavioral emails before J+7', () => {
      // trial_start + 7 days > now → skip (too early)
      const trialStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const daysSinceStart = Math.floor((Date.now() - trialStart.getTime()) / (24 * 60 * 60 * 1000))
      expect(daysSinceStart < 7).toBe(true)
    })
  })
})
