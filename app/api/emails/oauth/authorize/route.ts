/**
 * API Route: GET /api/emails/oauth/authorize
 *
 * Génère l'URL d'autorisation Google OAuth pour connecter un compte Gmail.
 * Retourne l'URL vers laquelle rediriger l'utilisateur.
 */

import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { GmailOAuthService } from '@/lib/services/domain/gmail-oauth.service'

export async function GET() {
  try {
    // 1. Vérifier l'authentification
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile } = authResult.data

    if (!userProfile?.team_id) {
      return NextResponse.json(
        { error: 'No team found for user' },
        { status: 404 }
      )
    }

    // 2. Construire l'URI de callback
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/emails/oauth/callback`

    // 3. Générer l'URL d'autorisation avec state chiffré
    const authUrl = GmailOAuthService.generateAuthUrl(
      userProfile.team_id,
      userProfile.id,
      redirectUri
    )

    return NextResponse.json({ authUrl })
  } catch (error: any) {
    console.error('OAuth authorize error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}
