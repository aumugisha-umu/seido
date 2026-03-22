/**
 * Unit tests for bank-sync.service
 * Tests token refresh, successful sync flow, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const mockGetConnectionWithTokens = vi.fn()
const mockUpdateTokens = vi.fn()
const mockUpdateSyncState = vi.fn()
const mockGetActiveConnections = vi.fn()

vi.mock('@/lib/services/repositories/bank-connection.repository', () => {
  return {
    BankConnectionRepository: class {
      getConnectionWithTokens = mockGetConnectionWithTokens
      updateTokens = mockUpdateTokens
      updateSyncState = mockUpdateSyncState
      getActiveConnections = mockGetActiveConnections
    },
  }
})

const mockUpsertTransactions = vi.fn()

vi.mock('@/lib/services/repositories/bank-transaction.repository', () => {
  return {
    BankTransactionRepository: class {
      upsertTransactions = mockUpsertTransactions
    },
  }
})

const mockFetchAllTransactions = vi.fn()
const mockRefreshUserToken = vi.fn()
const mockFetchAccounts = vi.fn()

vi.mock('@/lib/services/domain/tink-api.service', () => ({
  fetchAllTransactions: (...args: unknown[]) => mockFetchAllTransactions(...args),
  refreshUserToken: (...args: unknown[]) => mockRefreshUserToken(...args),
  fetchAccounts: (...args: unknown[]) => mockFetchAccounts(...args),
}))

import { syncConnection, syncAllConnections } from '@/lib/services/domain/bank-sync.service'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockConnection(overrides: Record<string, unknown> = {}) {
  return {
    connection: {
      id: 'conn-001',
      team_id: 'team-001',
      tink_account_id: 'tink-acc-001',
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1h from now
      last_sync_at: '2026-03-14T00:00:00Z',
      ...overrides,
    },
    accessToken: 'valid-access-token',
    refreshToken: 'valid-refresh-token',
    iban: 'BE68539007547034',
  }
}

function createMockAccountsResponse(balance = 12500.50) {
  return {
    accounts: [
      {
        id: 'tink-acc-001',
        balances: {
          booked: {
            amount: {
              unscaledValue: String(Math.round(balance * 100)),
              scale: '2',
            },
          },
        },
      },
    ],
  }
}

const mockSupabase = {} as import('@supabase/supabase-js').SupabaseClient

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('syncConnection', () => {
  it('should complete a full sync without token refresh', async () => {
    // Token valid for 1h — no refresh needed
    mockGetConnectionWithTokens.mockResolvedValue(createMockConnection())
    mockFetchAllTransactions.mockResolvedValue([{ id: 'tx-1' }, { id: 'tx-2' }])
    mockUpsertTransactions.mockResolvedValue(2)
    mockFetchAccounts.mockResolvedValue(createMockAccountsResponse())
    mockUpdateSyncState.mockResolvedValue(undefined)

    const result = await syncConnection('conn-001', mockSupabase)

    expect(result.synced).toBe(2)
    expect(result.errors).toHaveLength(0)

    // Should NOT have refreshed token
    expect(mockRefreshUserToken).not.toHaveBeenCalled()
    expect(mockUpdateTokens).not.toHaveBeenCalled()

    // Should have fetched transactions with the correct start date
    expect(mockFetchAllTransactions).toHaveBeenCalledWith(
      'valid-access-token',
      'tink-acc-001',
      '2026-03-14' // from last_sync_at
    )

    // Should have updated sync state to active
    expect(mockUpdateSyncState).toHaveBeenCalledWith('conn-001', expect.objectContaining({
      syncStatus: 'active',
    }))
  })

  it('should refresh token when expiring within 2 minutes', async () => {
    // Token expires in 60 seconds — within the 2-minute threshold
    const soonExpiry = new Date(Date.now() + 60 * 1000).toISOString()
    mockGetConnectionWithTokens.mockResolvedValue(
      createMockConnection({ token_expires_at: soonExpiry })
    )
    mockRefreshUserToken.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
    })
    mockFetchAllTransactions.mockResolvedValue([])
    mockUpsertTransactions.mockResolvedValue(0)
    mockFetchAccounts.mockResolvedValue(createMockAccountsResponse())
    mockUpdateSyncState.mockResolvedValue(undefined)

    const result = await syncConnection('conn-001', mockSupabase)

    expect(result.synced).toBe(0)
    expect(result.errors).toHaveLength(0)

    // Should have refreshed the token
    expect(mockRefreshUserToken).toHaveBeenCalledWith('valid-refresh-token')

    // Should have saved new tokens
    expect(mockUpdateTokens).toHaveBeenCalledWith('conn-001', expect.objectContaining({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }))

    // Should have fetched transactions with the NEW token
    expect(mockFetchAllTransactions).toHaveBeenCalledWith(
      'new-access-token',
      'tink-acc-001',
      expect.any(String)
    )
  })

  it('should refresh token when token_expires_at is null', async () => {
    mockGetConnectionWithTokens.mockResolvedValue(
      createMockConnection({ token_expires_at: null })
    )
    mockRefreshUserToken.mockResolvedValue({
      access_token: 'new-token',
      expires_in: 3600,
    })
    mockFetchAllTransactions.mockResolvedValue([])
    mockUpsertTransactions.mockResolvedValue(0)
    mockFetchAccounts.mockResolvedValue(createMockAccountsResponse())
    mockUpdateSyncState.mockResolvedValue(undefined)

    await syncConnection('conn-001', mockSupabase)

    expect(mockRefreshUserToken).toHaveBeenCalled()
  })

  it('should use 90-day lookback when no last_sync_at', async () => {
    mockGetConnectionWithTokens.mockResolvedValue(
      createMockConnection({ last_sync_at: null })
    )
    mockFetchAllTransactions.mockResolvedValue([])
    mockUpsertTransactions.mockResolvedValue(0)
    mockFetchAccounts.mockResolvedValue(createMockAccountsResponse())
    mockUpdateSyncState.mockResolvedValue(undefined)

    await syncConnection('conn-001', mockSupabase)

    // The date should be approximately 90 days ago (YYYY-MM-DD format)
    const callArgs = mockFetchAllTransactions.mock.calls[0]
    const syncDate = callArgs[2]
    expect(syncDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const daysDiff = (Date.now() - new Date(syncDate).getTime()) / (1000 * 60 * 60 * 24)
    expect(daysDiff).toBeGreaterThanOrEqual(89)
    expect(daysDiff).toBeLessThanOrEqual(91)
  })

  it('should set error state when sync fails', async () => {
    mockGetConnectionWithTokens.mockResolvedValue(createMockConnection())
    mockFetchAllTransactions.mockRejectedValue(new Error('Tink API unavailable'))
    mockUpdateSyncState.mockResolvedValue(undefined)

    const result = await syncConnection('conn-001', mockSupabase)

    expect(result.synced).toBe(0)
    expect(result.errors).toContain('Tink API unavailable')

    // Should have updated sync state to error
    expect(mockUpdateSyncState).toHaveBeenCalledWith('conn-001', expect.objectContaining({
      syncStatus: 'error',
      syncErrorMessage: 'Tink API unavailable',
    }))
  })

  it('should handle balance fetch failure gracefully', async () => {
    mockGetConnectionWithTokens.mockResolvedValue(createMockConnection())
    mockFetchAllTransactions.mockResolvedValue([{ id: 'tx-1' }])
    mockUpsertTransactions.mockResolvedValue(1)
    mockFetchAccounts.mockRejectedValue(new Error('Balance API error'))
    mockUpdateSyncState.mockResolvedValue(undefined)

    const result = await syncConnection('conn-001', mockSupabase)

    // Sync should succeed despite balance failure
    expect(result.synced).toBe(1)
    expect(result.errors).toContain('Failed to fetch account balance')

    // Should still update sync state to active (balance is non-critical)
    expect(mockUpdateSyncState).toHaveBeenCalledWith('conn-001', expect.objectContaining({
      syncStatus: 'active',
    }))
  })

  it('should throw when token expired and no refresh token available', async () => {
    const expiredToken = new Date(Date.now() - 1000).toISOString()
    const mockConn = createMockConnection({ token_expires_at: expiredToken })
    mockConn.refreshToken = null as unknown as string
    mockGetConnectionWithTokens.mockResolvedValue(mockConn)
    mockUpdateSyncState.mockResolvedValue(undefined)

    const result = await syncConnection('conn-001', mockSupabase)

    expect(result.synced).toBe(0)
    expect(result.errors).toContain('Token expired and no refresh token available')
    expect(mockUpdateSyncState).toHaveBeenCalledWith('conn-001', expect.objectContaining({
      syncStatus: 'error',
    }))
  })
})

describe('syncAllConnections', () => {
  it('should sync all active connections independently', async () => {
    mockGetActiveConnections.mockResolvedValue([
      { id: 'conn-001' },
      { id: 'conn-002' },
    ])

    // First connection succeeds, second fails
    mockGetConnectionWithTokens
      .mockResolvedValueOnce(createMockConnection())
      .mockResolvedValueOnce(createMockConnection({
        id: 'conn-002',
        tink_account_id: 'tink-acc-002',
      }))

    mockFetchAllTransactions
      .mockResolvedValueOnce([{ id: 'tx-1' }])
      .mockRejectedValueOnce(new Error('Connection 2 failed'))

    mockUpsertTransactions.mockResolvedValueOnce(1)
    mockFetchAccounts.mockResolvedValue(createMockAccountsResponse())
    mockUpdateSyncState.mockResolvedValue(undefined)

    const { results } = await syncAllConnections(mockSupabase)

    expect(results).toHaveLength(2)
    expect(results[0].connectionId).toBe('conn-001')
    expect(results[0].result.synced).toBe(1)
    expect(results[1].connectionId).toBe('conn-002')
    expect(results[1].result.errors.length).toBeGreaterThan(0)
  })

  it('should handle empty connection list', async () => {
    mockGetActiveConnections.mockResolvedValue([])

    const { results } = await syncAllConnections(mockSupabase)

    expect(results).toHaveLength(0)
  })
})
