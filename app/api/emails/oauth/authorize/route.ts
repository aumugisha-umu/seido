/**
 * API Route: GET /api/emails/oauth/authorize
 *
 * Generates the Google OAuth authorization URL to connect a Gmail account.
 * Returns the URL to redirect the user to.
 */

import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { GmailOAuthService } from '@/lib/services/domain/gmail-oauth.service'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    // 1. Verify authentication
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile } = authResult.data

    if (!userProfile?.team_id) {
      return NextResponse.json(
        { error: 'No team found for user' },
        { status: 404 }
      )
    }

    // 2. Build callback URI
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
    const redirectUri = `${baseUrl}/api/emails/oauth/callback`

    // 3. Generate authorization URL with encrypted state (includes visibility preference)
    const url = new URL(request.url)
    const visibility = url.searchParams.get('visibility') as 'private' | 'shared' | null
    const authUrl = GmailOAuthService.generateAuthUrl(
      userProfile.team_id,
      userProfile.id,
      redirectUri,
      visibility || 'shared'
    )

    return NextResponse.json({ authUrl })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate auth URL';
    logger.error({ error: message }, '[EMAILS-API] OAuth authorize error');
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
