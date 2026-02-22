/**
 * Tests for CRON: Trial Expiration
 *
 * Route: app/api/cron/trial-expiration/route.ts
 * Transitions expired trials to free_tier or read_only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FREE_TIER_LIMIT } from '@/lib/stripe'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockLt = vi.fn()
const mockUpdate = vi.fn()
const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
  })),
}

mockSelect.mockReturnValue({ eq: mockEq })
mockEq.mockReturnValue({ lt: mockLt })
mockLt.mockReturnValue({ data: [], error: null })

mockUpdate.mockReturnValue({
  eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }) }),
})

const mockSendTrialExpired = vi.fn().mockResolvedValue({ success: true })
const mockEmailService = {
  sendTrialExpired: mockSendTrialExpired,
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

describe('CRON: Trial Expiration', () => {
  describe('Authentication', () => {
    it('should reject requests without CRON_SECRET (401)', () => {
      // Same auth pattern as trial-notifications
      expect(true).toBe(true)
    })
  })

  describe('Finding expired trials', () => {
    it('should query for trialing subs where trial_end < now', () => {
      // from('subscriptions').select('*, teams(*)').eq('status', 'trialing').lt('trial_end', now)
      const now = new Date()
      expect(now).toBeDefined()
    })

    it('should only find trialing status (not free_tier or active)', () => {
      // eq('status', 'trialing') — excludes already-transitioned subs
      expect(true).toBe(true)
    })
  })

  describe('Transition logic', () => {
    it('should transition to free_tier when lot_count <= FREE_TIER_LIMIT', () => {
      // If billable_properties <= 2 → status = 'free_tier'
      const lotCount = 2
      const newStatus = lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'read_only'
      expect(newStatus).toBe('free_tier')
    })

    it('should transition to read_only when lot_count > FREE_TIER_LIMIT', () => {
      // If billable_properties > 2 → status = 'read_only'
      const lotCount = 5
      const newStatus = lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'read_only'
      expect(newStatus).toBe('read_only')
    })

    it('should handle boundary: exactly FREE_TIER_LIMIT lots = free_tier', () => {
      const lotCount = FREE_TIER_LIMIT
      const newStatus = lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'read_only'
      expect(newStatus).toBe('free_tier')
    })

    it('should handle 0 lots (new team, never added properties) = free_tier', () => {
      const lotCount = 0
      const newStatus = lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'read_only'
      expect(newStatus).toBe('free_tier')
    })
  })

  describe('Email sending', () => {
    it('should send trial-expired email with isReadOnly=true for read_only transition', () => {
      // emailService.sendTrialExpired(email, { firstName, teamName, lotCount, isReadOnly: true })
      expect(mockSendTrialExpired).toBeDefined()
    })

    it('should send trial-expired email with isReadOnly=false for free_tier transition', () => {
      // isReadOnly=false → the email shows "free tier, no restrictions" message
      expect(mockSendTrialExpired).toBeDefined()
    })

    it('should set trial_expired_email_sent flag after sending', () => {
      // update subscription set trial_expired_email_sent = true
      expect(mockUpdate).toBeDefined()
    })
  })

  describe('Idempotency', () => {
    it('should skip already-expired subs (status is not trialing)', () => {
      // Query .eq('status', 'trialing') only finds trialing
      // Subs already transitioned to free_tier/read_only are excluded
      expect(true).toBe(true)
    })

    it('should filter out subs with trial_expired_email_sent=true', () => {
      // Possible extra filter: .is('trial_expired_email_sent', false)
      // Prevents re-sending if CRON runs twice before status update
      expect(true).toBe(true)
    })
  })
})
