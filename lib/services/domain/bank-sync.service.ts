/**
 * Bank Sync Service
 * Orchestrates transaction synchronization from Tink to the database.
 * Handles token refresh, transaction fetching, and sync state management.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'
import { BankTransactionRepository } from '@/lib/services/repositories/bank-transaction.repository'
import { fetchAllTransactions, refreshUserToken, fetchAccounts } from '@/lib/services/domain/tink-api.service'
import { logger } from '@/lib/logger'

/** Minimum remaining token lifetime before triggering a refresh (2 minutes). */
const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000

/** Default lookback period for first sync (90 days). */
const FIRST_SYNC_LOOKBACK_DAYS = 90

interface SyncResult {
  synced: number
  errors: string[]
}

/**
 * Check if a token is about to expire (within threshold).
 */
function isTokenExpiringSoon(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return true
  const expiresAt = new Date(tokenExpiresAt).getTime()
  const now = Date.now()
  return expiresAt - now < TOKEN_REFRESH_THRESHOLD_MS
}

/**
 * Calculate the sync start date based on last sync or default lookback.
 */
function getSyncStartDate(lastSyncAt: string | null): string {
  if (lastSyncAt) return lastSyncAt.split('T')[0]

  const lookback = new Date()
  lookback.setDate(lookback.getDate() - FIRST_SYNC_LOOKBACK_DAYS)
  return lookback.toISOString().split('T')[0]
}

/**
 * Sync a single bank connection: refresh tokens if needed, fetch transactions,
 * upsert into DB, and update sync state.
 */
export async function syncConnection(
  connectionId: string,
  supabase: SupabaseClient
): Promise<SyncResult> {
  const connectionRepo = new BankConnectionRepository(supabase)
  const transactionRepo = new BankTransactionRepository(supabase)
  const errors: string[] = []

  try {
    // 1. Get connection with tokens
    const { connection, accessToken: currentAccessToken, refreshToken, iban } =
      await connectionRepo.getConnectionWithTokens(connectionId)

    let accessToken = currentAccessToken

    // 2. Refresh token if expiring soon
    if (isTokenExpiringSoon(connection.token_expires_at)) {
      if (!refreshToken) {
        throw new Error('Token expired and no refresh token available')
      }

      logger.info('Refreshing Tink token for connection', { connectionId })

      const tokenResponse = await refreshUserToken(refreshToken)
      accessToken = tokenResponse.access_token

      await connectionRepo.updateTokens(connectionId, {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? refreshToken,
        tokenExpiresAt: new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ).toISOString(),
      })
    }

    // 3. Determine sync start date
    const syncStartDate = getSyncStartDate(connection.last_sync_at)

    // 4. Fetch transactions from Tink
    const tinkAccountId = connection.tink_account_id
    if (!tinkAccountId) {
      throw new Error('No Tink account ID associated with connection')
    }

    const transactions = await fetchAllTransactions(
      accessToken,
      tinkAccountId,
      syncStartDate
    )

    // 5. Upsert transactions into DB
    const synced = await transactionRepo.upsertTransactions(
      connection.team_id,
      connectionId,
      transactions
    )

    // 6. Fetch current balance from accounts endpoint
    let balance: number | undefined
    try {
      const accountsResponse = await fetchAccounts(accessToken)
      const account = accountsResponse.accounts?.find(
        (a: { id: string }) => a.id === tinkAccountId
      )
      if (account?.balances?.booked?.amount) {
        const { unscaledValue, scale } = account.balances.booked.amount
        balance = Number(unscaledValue) / Math.pow(10, Number(scale))
      }
    } catch (balanceError) {
      // Balance fetch is non-critical — log and continue
      logger.warn('Failed to fetch account balance', { connectionId, error: balanceError })
      errors.push('Failed to fetch account balance')
    }

    // 7. Update sync state to active
    await connectionRepo.updateSyncState(connectionId, {
      syncStatus: 'active',
      lastSyncAt: new Date().toISOString(),
      balance,
      syncErrorMessage: null,
    })

    logger.info('Bank sync completed', {
      connectionId,
      synced,
      transactionsFetched: transactions.length,
      iban,
    })

    return { synced, errors }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'

    logger.error('Bank sync failed', { connectionId, error: errorMessage })

    // Update sync state to error
    try {
      await connectionRepo.updateSyncState(connectionId, {
        syncStatus: 'error',
        syncErrorMessage: errorMessage,
      })
    } catch (updateError) {
      logger.error('Failed to update sync error state', { connectionId, error: updateError })
    }

    return { synced: 0, errors: [errorMessage] }
  }
}

/**
 * Sync all active bank connections (for cron job).
 * Processes each connection independently — one failure does not block others.
 */
export async function syncAllConnections(
  supabase: SupabaseClient
): Promise<{ results: Array<{ connectionId: string; result: SyncResult }> }> {
  const connectionRepo = new BankConnectionRepository(supabase)
  const connections = await connectionRepo.getActiveConnections()

  logger.info('Starting bulk bank sync', { connectionCount: connections.length })

  const settled = await Promise.allSettled(
    connections.map(async (connection) => {
      const result = await syncConnection(connection.id, supabase)
      return { connectionId: connection.id, result }
    })
  )

  const results = settled
    .filter((r): r is PromiseFulfilledResult<{ connectionId: string; result: SyncResult }> => r.status === 'fulfilled')
    .map(r => r.value)

  const totalSynced = results.reduce((sum, r) => sum + r.result.synced, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.result.errors.length, 0)

  logger.info('Bulk bank sync completed', {
    connections: connections.length,
    totalSynced,
    totalErrors,
  })

  return { results }
}
