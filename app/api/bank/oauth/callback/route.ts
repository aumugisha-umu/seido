/**
 * API Route: GET /api/bank/oauth/callback
 *
 * Handles the Tink Link OAuth callback after bank authorization.
 * - Validates CSRF state from cookie
 * - Exchanges authorization code for user access token
 * - Reads tink_user_id from cookie (created in authorize step)
 * - Fetches accounts and creates bank connections
 * - Redirects to bank page with success/error toast
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import {
  exchangeAuthCode,
  fetchAccounts,
} from '@/lib/services/domain/tink-api.service'
import { parseTinkAmount } from '@/lib/types/bank.types'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'
import { logger } from '@/lib/logger'

const SUCCESS_REDIRECT = '/gestionnaire/banque?tab=comptes&toast=success&message=Compte+connect%C3%A9'
const ERROR_REDIRECT = '/gestionnaire/banque?tab=comptes&toast=error&message=Erreur+connexion'

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const credentialsId = url.searchParams.get('credentials_id')

    // 1. Validate required parameters
    if (!code || !state) {
      logger.error(
        { hasCode: !!code, hasState: !!state },
        '[BANK-OAUTH] Missing code or state parameter'
      )
      return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
    }

    // 2. Validate CSRF state against cookie
    const cookieStore = await cookies()
    const storedState = cookieStore.get('tink_oauth_state')?.value
    const tinkUserId = cookieStore.get('tink_user_id')?.value

    if (!storedState || storedState !== state) {
      logger.error('[BANK-OAUTH] CSRF state mismatch')
      return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
    }

    // tinkUserId is optional — sandbox mode doesn't create permanent users
    // We'll use 'sandbox' as fallback for the tink_user_id field

    // 3. Clear the cookies
    cookieStore.set('tink_oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
    cookieStore.set('tink_user_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    // 4. Authenticate user
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) {
      logger.error('[BANK-OAUTH] User not authenticated during callback')
      return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
    }

    const { supabase, userProfile } = authResult.data

    if (!userProfile?.team_id || !userProfile?.id) {
      logger.error('[BANK-OAUTH] User has no team_id or profile id')
      return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
    }

    const teamId = userProfile.team_id
    const userId = userProfile.id

    // 5. Exchange auth code for user access token
    const tokenResponse = await exchangeAuthCode(code)
    const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = tokenResponse

    if (!accessToken) {
      logger.error('[BANK-OAUTH] No access token in exchange response')
      return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
    }

    // 6. Fetch accounts from Tink
    const accountsResponse = await fetchAccounts(accessToken)
    const accounts = accountsResponse.accounts || []

    if (accounts.length === 0) {
      logger.warn({ teamId }, '[BANK-OAUTH] No accounts returned from Tink')
      return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
    }

    // 7. Calculate token expiry + PSD2 consent expiry (90 days)
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
    const consentExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    // 8. Create bank connections for each account
    const repo = new BankConnectionRepository(supabase)

    const results = await Promise.allSettled(
      accounts.map((account) => {
        const iban = account.identifiers?.iban?.iban || ''
        const balance = account.balances?.booked?.amount?.value
          ? parseTinkAmount(account.balances.booked.amount.value)
          : undefined

        return repo.createConnection({
          team_id: teamId,
          tink_user_id: tinkUserId || `sandbox-${teamId}`,
          tink_account_id: account.id,
          tink_credentials_id: credentialsId || undefined,
          bank_name: account.financialInstitutionId || 'Unknown Bank',
          account_name: account.name || undefined,
          account_type: account.type || undefined,
          iban: iban || 'UNKNOWN',
          currency: account.balances?.booked?.amount?.currencyCode || 'EUR',
          tink_access_token: accessToken,
          tink_refresh_token: refreshToken || '',
          token_expires_at: tokenExpiresAt,
          consent_expires_at: consentExpiresAt,
          balance,
          created_by: userId,
        })
      })
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    logger.info(
      { teamId, total: accounts.length, succeeded, failed, credentialsId },
      '[BANK-OAUTH] Bank connections created (permanent user)'
    )

    if (succeeded === 0) {
      logger.error({ teamId }, '[BANK-OAUTH] All connection creations failed')
      return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
    }

    // 9. Success redirect
    return NextResponse.redirect(`${baseUrl}${SUCCESS_REDIRECT}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    logger.error({ error: message }, '[BANK-OAUTH] Callback error')
    return NextResponse.redirect(`${baseUrl}${ERROR_REDIRECT}`)
  }
}
