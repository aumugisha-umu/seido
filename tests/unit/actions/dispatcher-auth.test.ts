/**
 * Unit tests for auth guard in dispatcher-actions
 * Verifies that unauthenticated calls are rejected and authenticated calls proceed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the server-context module
vi.mock('@/lib/server-context', () => ({
  getServerActionAuthContextOrNull: vi.fn(),
}))

// Mock all heavy service dependencies to avoid SSR/Node-only imports
vi.mock('@/lib/services/domain/notification-dispatcher.service', () => ({
  createNotificationDispatcher: vi.fn(() => ({
    dispatchInterventionCreated: vi.fn().mockResolvedValue({
      overallSuccess: true,
      failedChannels: [],
      timings: {},
    }),
    dispatchInterventionStatusChange: vi.fn().mockResolvedValue({
      overallSuccess: true,
      failedChannels: [],
      timings: {},
    }),
  })),
}))
vi.mock('@/lib/services/repositories/notification-repository', () => ({
  createServerNotificationRepository: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/services/domain/email-notification.service', () => ({
  createEmailNotificationService: vi.fn().mockReturnValue({}),
}))
vi.mock('@/lib/services/domain/email.service', () => ({
  createEmailService: vi.fn().mockReturnValue({}),
}))
vi.mock('@/lib/services/repositories/intervention.repository', () => ({
  createServerInterventionRepository: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/services/repositories/user.repository', () => ({
  createServerUserRepository: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/services/repositories/building.repository', () => ({
  createServerBuildingRepository: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/services/repositories/lot.repository', () => ({
  createServerLotRepository: vi.fn().mockResolvedValue({}),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { dispatchInterventionCreated, dispatchInterventionStatusChange } from '@/app/actions/dispatcher-actions'

const mockAuth = getServerActionAuthContextOrNull as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dispatchInterventionCreated — auth guard', () => {
  it('returns early with error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await dispatchInterventionCreated('intervention-uuid')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/authentication/i)
  })

  it('proceeds normally when authenticated', async () => {
    mockAuth.mockResolvedValue({ profile: { id: 'user-1' }, team: { id: 'team-1' } })

    const result = await dispatchInterventionCreated('intervention-uuid')

    expect(result.success).toBe(true)
  })
})

describe('dispatchInterventionStatusChange — auth guard', () => {
  const params = {
    interventionId: 'intervention-uuid',
    oldStatus: 'demande',
    newStatus: 'approuvee',
    teamId: 'team-1',
    changedBy: 'user-1',
  }

  it('returns early with error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await dispatchInterventionStatusChange(params)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/authentication/i)
  })

  it('proceeds normally when authenticated', async () => {
    mockAuth.mockResolvedValue({ profile: { id: 'user-1' }, team: { id: 'team-1' } })

    const result = await dispatchInterventionStatusChange(params)

    expect(result.success).toBe(true)
  })
})
