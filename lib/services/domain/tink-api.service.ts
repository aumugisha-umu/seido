/**
 * Tink API Service — SEIDO Bank Module
 *
 * Centralized client for Tink V2 API (Open Banking PSD2).
 * Handles OAuth tokens, user management, account/transaction fetching.
 *
 * Reference: docs.tink.com, design doc v3
 */

import type {
  TinkTokenResponse,
  TinkUserResponse,
  TinkAccountsResponse,
  TinkTransactionsResponse,
} from '@/lib/types/bank.types'

// ============================================================================
// CONFIG
// ============================================================================

const TINK_BASE_URL = 'https://api.tink.com'
const TINK_LINK_BASE = 'https://link.tink.com'

function getTinkConfig() {
  const clientId = process.env.TINK_CLIENT_ID
  const clientSecret = process.env.TINK_CLIENT_SECRET
  const redirectUri = process.env.TINK_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Tink configuration: TINK_CLIENT_ID, TINK_CLIENT_SECRET, TINK_REDIRECT_URI')
  }

  return { clientId, clientSecret, redirectUri }
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/** Shared helper — all token requests hit the same endpoint with client creds. */
async function requestToken(
  grantParams: Record<string, string>,
  label: string
): Promise<TinkTokenResponse> {
  const config = getTinkConfig()

  const response = await fetch(`${TINK_BASE_URL}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...grantParams,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tink ${label} failed (${response.status}): ${error}`)
  }

  return response.json()
}

/**
 * Get a client access token (30 min expiry).
 * Used for app-level operations: create users, generate authorization grants.
 */
export function getClientToken(scopes: string[] = ['authorization:grant', 'user:create']): Promise<TinkTokenResponse> {
  return requestToken(
    { grant_type: 'client_credentials', scope: scopes.join(',') },
    'client token'
  )
}

/**
 * Exchange an authorization code for a user access token + refresh token.
 * Called after Tink Link callback.
 */
export function exchangeAuthCode(code: string): Promise<TinkTokenResponse> {
  return requestToken(
    { grant_type: 'authorization_code', code },
    'auth code exchange'
  )
}

/**
 * Refresh an expired user access token.
 * Must be called before token expires (30 min, with 2 min buffer).
 */
export function refreshUserToken(refreshToken: string): Promise<TinkTokenResponse> {
  return requestToken(
    { grant_type: 'refresh_token', refresh_token: refreshToken },
    'token refresh'
  )
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Create a permanent Tink user (1 per SEIDO team).
 * Requires client token with user:create scope.
 */
export async function createTinkUser(
  clientToken: string,
  market: string = 'FR',
  locale: string = 'fr_FR'
): Promise<TinkUserResponse> {
  const response = await fetch(`${TINK_BASE_URL}/api/v1/user/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ market, locale }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tink user creation failed (${response.status}): ${error}`)
  }

  return response.json()
}

// ============================================================================
// DELEGATION GRANT (Permanent Users)
// ============================================================================

/**
 * Create a delegated authorization grant for a permanent Tink user.
 * Returns an authorization_code to pass to Tink Link.
 *
 * actor_client_id is a constant from Tink docs (Tink Link's client ID).
 */
export async function createDelegationGrant(
  clientToken: string,
  tinkUserId: string,
  idHint: string
): Promise<{ code: string }> {
  const response = await fetch(`${TINK_BASE_URL}/api/v1/oauth/authorization-grant/delegate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clientToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      user_id: tinkUserId,
      id_hint: idHint,
      actor_client_id: 'df05e4b379934cd09963197cc855bfe9',
      scope: 'accounts:read,transactions:read,credentials:read,credentials:refresh,credentials:write,providers:read,user:read,authorization:read',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Tink delegation grant failed (${response.status}): ${error}`)
  }

  return response.json()
}

// ============================================================================
// TINK LINK
// ============================================================================

/**
 * Build Tink Link redirect URL for bank connection (permanent users).
 * Uses /1.0/products/connect-accounts with authorization_code from delegation grant.
 */
export function buildTinkLinkUrl(params: {
  authorizationCode?: string
  state: string
  market?: string
  locale?: string
}): string {
  const config = getTinkConfig()
  const market = params.market || 'BE'

  // Locale must match the market (fr_FR is invalid for market BE)
  const defaultLocale = market === 'BE' ? 'fr_BE' : market === 'FR' ? 'fr_FR' : 'en_US'
  const locale = params.locale || defaultLocale

  const url = new URL(`${TINK_LINK_BASE}/1.0/transactions/connect-accounts`)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  if (params.authorizationCode) {
    url.searchParams.set('authorization_code', params.authorizationCode)
  }
  url.searchParams.set('market', market)
  url.searchParams.set('locale', locale)
  url.searchParams.set('state', params.state)

  // Sandbox mode: show Demo Bank test providers
  if (process.env.TINK_ENVIRONMENT === 'sandbox') {
    url.searchParams.set('test', 'true')
  }

  return url.toString()
}

// ============================================================================
// DATA FETCHING (V2 API)
// ============================================================================

/**
 * Fetch user's bank accounts from Tink.
 */
export async function fetchAccounts(accessToken: string): Promise<TinkAccountsResponse> {
  const response = await fetch(`${TINK_BASE_URL}/data/v2/accounts`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    await handleTinkError(response, 'fetchAccounts')
  }

  return response.json()
}

/**
 * Fetch transactions for a specific account, paginated.
 * Max 100 per page, cursor-based with nextPageToken.
 */
export async function fetchTransactions(
  accessToken: string,
  options: {
    accountId?: string
    pageSize?: number
    pageToken?: string
    bookedDateGte?: string
    bookedDateLte?: string
    statusIn?: string[]
  } = {}
): Promise<TinkTransactionsResponse> {
  const url = new URL(`${TINK_BASE_URL}/data/v2/transactions`)

  if (options.accountId) url.searchParams.set('accountIdIn', options.accountId)
  if (options.pageSize) url.searchParams.set('pageSize', String(Math.min(options.pageSize, 100)))
  if (options.pageToken) url.searchParams.set('pageToken', options.pageToken)
  if (options.bookedDateGte) url.searchParams.set('bookedDateGte', options.bookedDateGte)
  if (options.bookedDateLte) url.searchParams.set('bookedDateLte', options.bookedDateLte)
  if (options.statusIn) {
    for (const status of options.statusIn) {
      url.searchParams.append('statusIn', status)
    }
  }

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    await handleTinkError(response, 'fetchTransactions')
  }

  return response.json()
}

/**
 * Fetch ALL transactions for an account (auto-paginate).
 * Used during initial sync and cron jobs.
 */
export async function fetchAllTransactions(
  accessToken: string,
  accountId: string,
  bookedDateGte?: string
): Promise<TinkTransactionsResponse['transactions']> {
  const allTransactions: TinkTransactionsResponse['transactions'] = []
  let pageToken: string | undefined

  do {
    const response = await fetchTransactions(accessToken, {
      accountId,
      pageSize: 100,
      pageToken,
      bookedDateGte,
      statusIn: ['BOOKED'],
    })

    allTransactions.push(...response.transactions)
    pageToken = response.nextPageToken || undefined
  } while (pageToken)

  return allTransactions
}

// ============================================================================
// CONSENT
// ============================================================================

/**
 * Fetch provider consents to check PSD2 expiry dates.
 */
export async function fetchProviderConsents(accessToken: string) {
  const response = await fetch(`${TINK_BASE_URL}/api/v1/provider-consents`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    await handleTinkError(response, 'fetchProviderConsents')
  }

  return response.json() as Promise<{
    providerConsents: Array<{
      credentialsId: string
      providerName: string
      sessionExpiryDate: number
      status: string
      accountIds: string[]
    }>
  }>
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

async function handleTinkError(response: Response, operation: string): Promise<never> {
  const status = response.status
  const body = await response.text()

  if (status === 401) {
    throw new TinkAuthError(`Tink ${operation}: token expired or invalid`)
  }

  if (status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    throw new TinkRateLimitError(
      `Tink ${operation}: rate limited`,
      retryAfter ? parseInt(retryAfter, 10) : 60
    )
  }

  throw new Error(`Tink ${operation} failed (${status}): ${body}`)
}

export class TinkAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TinkAuthError'
  }
}

export class TinkRateLimitError extends Error {
  retryAfterSeconds: number

  constructor(message: string, retryAfterSeconds: number) {
    super(message)
    this.name = 'TinkRateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}
