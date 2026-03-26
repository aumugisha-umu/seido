/**
 * API Route: GET /api/bank/oauth/authorize
 *
 * Initiates the Tink Link OAuth flow for bank connection.
 *
 * Two modes:
 * - Sandbox: Simple redirect (no permanent user, no delegation grant)
 * - Production: Permanent user + delegation grant → authorization_code
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import {
  getClientToken,
  createTinkUser,
  createDelegationGrant,
  buildTinkLinkUrl,
} from '@/lib/services/domain/tink-api.service'
import { BankConnectionRepository } from '@/lib/services/repositories/bank-connection.repository'
import { logger } from '@/lib/logger'

const isSandbox = process.env.TINK_ENVIRONMENT === 'sandbox'

export async function GET() {
  try {
    // 1. Authenticate user
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) {
      return authResult.error
    }

    const { supabase, userProfile } = authResult.data

    if (!userProfile?.team_id) {
      logger.error('[BANK-OAUTH] User has no team_id')
      return NextResponse.json(
        { success: false, error: 'Equipe introuvable' },
        { status: 400 }
      )
    }

    const teamId = userProfile.team_id

    // 2. Generate CSRF state token
    const state = crypto.randomUUID()
    const cookieStore = await cookies()

    cookieStore.set('tink_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 60,
    })

    let tinkLinkUrl: string

    if (isSandbox) {
      // ── Sandbox: simple redirect without permanent user ──
      // Tink creates a temporary user. Callback exchanges code for tokens.
      tinkLinkUrl = buildTinkLinkUrl({ state, market: 'BE' })

      logger.info({ teamId, tinkLinkUrl }, '[BANK-OAUTH] Redirecting to Tink Link (sandbox mode)')
    } else {
      // ── Production: permanent user + delegation grant ──
      const repo = new BankConnectionRepository(supabase)
      let tinkUserId = await repo.findTinkUserIdForTeam(teamId)

      if (!tinkUserId) {
        const clientTokenForUser = await getClientToken(['user:create'])
        const tinkUser = await createTinkUser(clientTokenForUser.access_token, 'BE', 'fr_FR')
        tinkUserId = tinkUser.user_id
        logger.info({ teamId, tinkUserId }, '[BANK-OAUTH] Created new permanent Tink user')
      }

      const clientToken = await getClientToken(['authorization:grant'])
      const idHint = userProfile.first_name
        ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim()
        : userProfile.email || 'SEIDO User'
      const grantResponse = await createDelegationGrant(clientToken.access_token, tinkUserId, idHint)

      cookieStore.set('tink_user_id', tinkUserId, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 5 * 60,
      })

      tinkLinkUrl = buildTinkLinkUrl({
        authorizationCode: grantResponse.code,
        state,
        market: 'BE',
      })

      logger.info({ teamId, tinkUserId }, '[BANK-OAUTH] Redirecting to Tink Link (permanent user)')
    }

    return NextResponse.redirect(tinkLinkUrl)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    logger.error({ error: message }, '[BANK-OAUTH] Authorize error')
    return NextResponse.json(
      { success: false, error: 'Erreur interne' },
      { status: 500 }
    )
  }
}
