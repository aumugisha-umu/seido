/**
 * Unit tests for bank and rent reminder server actions.
 *
 * Tests: auth guard, reconcile dispatch, ignore toggle, 24h cooldown.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockReconcileTransaction = vi.fn().mockResolvedValue(undefined)
const mockUnlinkTransactionFromEntity = vi.fn().mockResolvedValue(undefined)
const mockSyncConnection = vi.fn().mockResolvedValue({ synced: 5, errors: [] })
const mockGetTransactionById = vi.fn()
const mockUpdateStatus = vi.fn().mockResolvedValue(undefined)
const mockGetRentCallById = vi.fn()
const mockBroadcast = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/server-context', () => ({
  getServerActionAuthContextOrNull: vi.fn(),
}))

vi.mock('@/lib/services/domain/bank-matching.service', () => ({
  reconcileTransaction: (...args: unknown[]) => mockReconcileTransaction(...args),
  unlinkTransactionFromEntity: (...args: unknown[]) => mockUnlinkTransactionFromEntity(...args),
}))

vi.mock('@/lib/services/domain/bank-sync.service', () => ({
  syncConnection: (...args: unknown[]) => mockSyncConnection(...args),
}))

vi.mock('@/lib/services/repositories/bank-transaction.repository', () => {
  return {
    BankTransactionRepository: class {
      getTransactionById(...args: unknown[]) { return mockGetTransactionById(...args) }
      updateStatus(...args: unknown[]) { return mockUpdateStatus(...args) }
    }
  }
})

vi.mock('@/lib/services/repositories/rent-call.repository', () => {
  return {
    RentCallRepository: class {
      getRentCallById(...args: unknown[]) { return mockGetRentCallById(...args) }
    }
  }
})

vi.mock('@/lib/data-invalidation-server', () => ({
  broadcastInvalidationServer: (...args: unknown[]) => mockBroadcast(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Must import after mocks
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import {
  reconcileTransactionAction,
  ignoreTransactionAction,
  triggerManualSyncAction,
} from '@/app/actions/bank-actions'
import { sendRentReminderAction } from '@/app/actions/rent-reminder-actions'

const mockAuth = getServerActionAuthContextOrNull as ReturnType<typeof vi.fn>

const fakeSupabase = {
  from: vi.fn(),
}

function setupSupabaseChain() {
  fakeSupabase.from.mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  })
}

const fakeContext = {
  profile: { id: 'user-1' },
  team: { id: 'team-1' },
  supabase: fakeSupabase,
}

beforeEach(() => {
  vi.clearAllMocks()
  setupSupabaseChain()
})

// ── reconcileTransactionAction ───────────────────────────────────────────────

describe('reconcileTransactionAction', () => {
  it('returns error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await reconcileTransactionAction('tx-1', 'rent_call', 'rc-1')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/authentication/i)
    expect(mockReconcileTransaction).not.toHaveBeenCalled()
  })

  it('calls reconcileTransaction with correct params', async () => {
    mockAuth.mockResolvedValue(fakeContext)

    const result = await reconcileTransactionAction('tx-1', 'rent_call', 'rc-1', 'auto', 0.95)

    expect(result.success).toBe(true)
    expect(mockReconcileTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      entityType: 'rent_call',
      entityId: 'rc-1',
      matchMethod: 'auto',
      matchConfidence: 0.95,
      userId: 'user-1',
      teamId: 'team-1',
      supabase: fakeSupabase,
    })
    expect(mockBroadcast).toHaveBeenCalledWith(
      fakeSupabase,
      'team-1',
      ['bank_transactions', 'rent_calls', 'stats']
    )
  })

  it('defaults matchMethod to manual and matchConfidence to 100', async () => {
    mockAuth.mockResolvedValue(fakeContext)

    await reconcileTransactionAction('tx-1', 'rent_call', 'rc-1')

    expect(mockReconcileTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        matchMethod: 'manual',
        matchConfidence: 100,
      })
    )
  })
})

// ── ignoreTransactionAction ──────────────────────────────────────────────────

describe('ignoreTransactionAction', () => {
  it('toggles to_reconcile -> ignored', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    mockGetTransactionById.mockResolvedValue({ id: 'tx-1', status: 'to_reconcile' })

    const result = await ignoreTransactionAction('tx-1')

    expect(result.success).toBe(true)
    expect(result.newStatus).toBe('ignored')
    expect(mockUpdateStatus).toHaveBeenCalledWith('tx-1', 'ignored', 'user-1')
  })

  it('toggles ignored -> to_reconcile', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    mockGetTransactionById.mockResolvedValue({ id: 'tx-1', status: 'ignored' })

    const result = await ignoreTransactionAction('tx-1')

    expect(result.success).toBe(true)
    expect(result.newStatus).toBe('to_reconcile')
    expect(mockUpdateStatus).toHaveBeenCalledWith('tx-1', 'to_reconcile', 'user-1')
  })

  it('returns error when transaction not found', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    mockGetTransactionById.mockResolvedValue(null)

    const result = await ignoreTransactionAction('tx-missing')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/introuvable/i)
  })
})

// ── triggerManualSyncAction ──────────────────────────────────────────────────

describe('triggerManualSyncAction', () => {
  it('calls syncConnection and returns result', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    mockSyncConnection.mockResolvedValue({ synced: 12, errors: [] })

    const result = await triggerManualSyncAction('conn-1')

    expect(result.success).toBe(true)
    expect(result.synced).toBe(12)
    expect(result.errors).toEqual([])
  })
})

// ── sendRentReminderAction ───────────────────────────────────────────────────

describe('sendRentReminderAction', () => {
  it('returns error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await sendRentReminderAction('rc-1')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/authentication/i)
  })

  it('sends reminder when no previous reminder exists', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    mockGetRentCallById.mockResolvedValue({
      success: true,
      data: { id: 'rc-1', last_reminder_sent_at: null, reminder_count: 0 },
    })

    const result = await sendRentReminderAction('rc-1')

    expect(result.success).toBe(true)
    expect(fakeSupabase.from).toHaveBeenCalledWith('rent_calls')
  })

  it('blocks reminder within 24h cooldown', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    // Last reminder sent 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    mockGetRentCallById.mockResolvedValue({
      success: true,
      data: { id: 'rc-1', last_reminder_sent_at: oneHourAgo, reminder_count: 1 },
    })

    const result = await sendRentReminderAction('rc-1')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/attendre/i)
  })

  it('allows reminder after 24h cooldown', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    // Last reminder sent 25 hours ago
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mockGetRentCallById.mockResolvedValue({
      success: true,
      data: { id: 'rc-1', last_reminder_sent_at: twentyFiveHoursAgo, reminder_count: 2 },
    })

    const result = await sendRentReminderAction('rc-1')

    expect(result.success).toBe(true)
  })

  it('returns error when rent call not found', async () => {
    mockAuth.mockResolvedValue(fakeContext)
    mockGetRentCallById.mockResolvedValue({ success: false, error: 'Not found' })

    const result = await sendRentReminderAction('rc-missing')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/introuvable/i)
  })
})
