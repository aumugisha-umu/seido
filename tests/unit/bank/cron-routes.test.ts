import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks for use inside vi.mock factories
const { mockGetExpiringConnections, mockUpdateSyncState } = vi.hoisted(() => ({
  mockGetExpiringConnections: vi.fn(),
  mockUpdateSyncState: vi.fn(),
}))

// Mock dependencies before imports
vi.mock('@/lib/services/domain/bank-sync.service', () => ({
  syncAllConnections: vi.fn(),
}))

vi.mock('@/lib/services/repositories/bank-connection.repository', () => {
  return {
    BankConnectionRepository: class {
      getExpiringConnections = mockGetExpiringConnections
      updateSyncState = mockUpdateSyncState
    },
  }
})

vi.mock('@/lib/services/core/supabase-client', () => ({
  createServiceRoleSupabaseClient: vi.fn().mockReturnValue({}),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createContextLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Import after mocks
import { GET as syncBankTransactions } from '@/app/api/cron/sync-bank-transactions/route'
import { GET as checkConsentExpiry } from '@/app/api/cron/check-consent-expiry/route'
import { syncAllConnections } from '@/lib/services/domain/bank-sync.service'

const CRON_SECRET = 'test-cron-secret'

const createRequest = (authHeader?: string) =>
  new Request('http://localhost/api/cron/test', {
    headers: authHeader ? { authorization: authHeader } : {},
  })

describe('Cron: sync-bank-transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  describe('CRON_SECRET validation', () => {
    it('returns 401 when authorization header is missing', async () => {
      const response = await syncBankTransactions(createRequest())
      expect(response.status).toBe(401)
    })

    it('returns 401 when authorization header has wrong secret', async () => {
      const response = await syncBankTransactions(createRequest('Bearer wrong-secret'))
      expect(response.status).toBe(401)
    })

    it('returns 401 when CRON_SECRET env is not set', async () => {
      delete process.env.CRON_SECRET
      const response = await syncBankTransactions(createRequest(`Bearer ${CRON_SECRET}`))
      expect(response.status).toBe(401)
    })
  })

  describe('successful sync', () => {
    it('calls syncAllConnections and returns result', async () => {
      const mockResult = { total: 5, synced: 4, errors: 1 }
      vi.mocked(syncAllConnections).mockResolvedValue(mockResult)

      const response = await syncBankTransactions(createRequest(`Bearer ${CRON_SECRET}`))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({ synced: 4, errors: 1, total: 5 })
      expect(syncAllConnections).toHaveBeenCalledOnce()
    })
  })

  describe('error handling', () => {
    it('returns 500 when syncAllConnections throws', async () => {
      vi.mocked(syncAllConnections).mockRejectedValue(new Error('Sync failed'))

      const response = await syncBankTransactions(createRequest(`Bearer ${CRON_SECRET}`))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Sync failed')
    })
  })
})

describe('Cron: check-consent-expiry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  describe('CRON_SECRET validation', () => {
    it('returns 401 when authorization header is missing', async () => {
      const response = await checkConsentExpiry(createRequest())
      expect(response.status).toBe(401)
    })

    it('returns 401 when authorization header has wrong secret', async () => {
      const response = await checkConsentExpiry(createRequest('Bearer wrong-secret'))
      expect(response.status).toBe(401)
    })
  })

  describe('consent expiry detection', () => {
    it('marks expired connections as disconnected', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      mockGetExpiringConnections.mockResolvedValue([
        { id: 'conn-1', team_id: 'team-1', consent_expires_at: yesterday },
      ])
      mockUpdateSyncState.mockResolvedValue(undefined)

      const response = await checkConsentExpiry(createRequest(`Bearer ${CRON_SECRET}`))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({ expiring: 0, disconnected: 1 })
      expect(mockUpdateSyncState).toHaveBeenCalledWith('conn-1', {
        syncStatus: 'disconnected',
      })
    })

    it('logs warning for connections expiring soon without updating status', async () => {
      const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      mockGetExpiringConnections.mockResolvedValue([
        { id: 'conn-2', team_id: 'team-2', consent_expires_at: inThreeDays },
      ])

      const response = await checkConsentExpiry(createRequest(`Bearer ${CRON_SECRET}`))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({ expiring: 1, disconnected: 0 })
      expect(mockUpdateSyncState).not.toHaveBeenCalled()
    })

    it('handles mix of expired and expiring connections', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const inFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      mockGetExpiringConnections.mockResolvedValue([
        { id: 'conn-1', team_id: 'team-1', consent_expires_at: yesterday },
        { id: 'conn-2', team_id: 'team-2', consent_expires_at: inFiveDays },
        { id: 'conn-3', team_id: 'team-3', consent_expires_at: yesterday },
      ])
      mockUpdateSyncState.mockResolvedValue(undefined)

      const response = await checkConsentExpiry(createRequest(`Bearer ${CRON_SECRET}`))
      const body = await response.json()

      expect(body).toEqual({ expiring: 1, disconnected: 2 })
      expect(mockUpdateSyncState).toHaveBeenCalledTimes(2)
    })

    it('returns empty counts when no connections are expiring', async () => {
      mockGetExpiringConnections.mockResolvedValue([])

      const response = await checkConsentExpiry(createRequest(`Bearer ${CRON_SECRET}`))
      const body = await response.json()

      expect(body).toEqual({ expiring: 0, disconnected: 0 })
    })
  })

  describe('error handling', () => {
    it('returns 500 when repository throws', async () => {
      mockGetExpiringConnections.mockRejectedValue(new Error('DB error'))

      const response = await checkConsentExpiry(createRequest(`Bearer ${CRON_SECRET}`))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('DB error')
    })
  })
})
