/**
 * API Route: GET /api/emails/oauth/callback
 *
 * Google OAuth callback after authorization.
 * - Validates the state parameter (anti-CSRF)
 * - Exchanges the code for tokens
 * - Creates the email connection in DB
 * - Redirects to the email settings page
 */

import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { GmailOAuthService } from '@/lib/services/domain/gmail-oauth.service'
import { EMAIL_PROVIDERS } from '@/lib/constants/email-providers'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Redirect URLs
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
    const successUrl = `${baseUrl}/gestionnaire/parametres/emails?oauth=success`
    const errorUrl = `${baseUrl}/gestionnaire/parametres/emails?oauth=error`

    // 1. Check for Google errors
    if (error) {
      logger.error({ error, description: url.searchParams.get('error_description') }, '[EMAILS-API] Google OAuth error')
      return NextResponse.redirect(`${errorUrl}&message=${encodeURIComponent(error)}`)
    }

    // 2. Verify required parameters
    if (!code || !state) {
      logger.error('[EMAILS-API] Missing code or state parameter')
      return NextResponse.redirect(`${errorUrl}&message=missing_parameters`)
    }

    // 3. Validate and decrypt state
    const stateData = GmailOAuthService.decryptAndValidateState(state)
    if (!stateData) {
      logger.error('[EMAILS-API] Invalid or expired state parameter')
      return NextResponse.redirect(`${errorUrl}&message=invalid_state`)
    }

    const { teamId, visibility: stateVisibility } = stateData

    // 4. Verify authentication via centralized helper
    const authResult = await getApiAuthContext()
    if (!authResult.success) {
      logger.error('[EMAILS-API] User not authenticated during OAuth callback')
      return NextResponse.redirect(`${errorUrl}&message=not_authenticated`)
    }

    const { supabase, userProfile } = authResult.data

    // 5. Verify profile matches OAuth state (anti-CSRF)
    if (!userProfile || userProfile.team_id !== teamId) {
      logger.error('[EMAILS-API] User profile mismatch or not found')
      return NextResponse.redirect(`${errorUrl}&message=team_mismatch`)
    }

    // 7. Exchange code for tokens
    const redirectUri = `${baseUrl}/api/emails/oauth/callback`
    const tokens = await GmailOAuthService.exchangeCodeForTokens(code, redirectUri)

    // 8. Get Google user email
    const googleUser = await GmailOAuthService.getUserInfo(tokens.accessToken)
    if (!googleUser.email) {
      logger.error('[EMAILS-API] Failed to get email from Google')
      return NextResponse.redirect(`${errorUrl}&message=no_email`)
    }

    // 9. Encrypt tokens for storage
    const encryptedTokens = GmailOAuthService.encryptTokens(tokens)

    // 10. Check if a connection already exists for this email
    const { data: existingConnection } = await supabase
      .from('team_email_connections')
      .select('id')
      .eq('team_id', teamId)
      .eq('email_address', googleUser.email)
      .single()

    if (existingConnection) {
      // Update existing connection to OAuth
      const { error: updateError } = await supabase
        .from('team_email_connections')
        .update({
          auth_method: 'oauth',
          oauth_access_token: encryptedTokens.encryptedAccessToken,
          oauth_refresh_token: encryptedTokens.encryptedRefreshToken,
          oauth_token_expires_at: tokens.expiresAt.toISOString(),
          oauth_scope: tokens.scope,
          is_active: true,
          last_error: null,
          // Keep old IMAP/SMTP settings for fallback
        })
        .eq('id', existingConnection.id)

      if (updateError) {
        logger.error({ error: updateError.message }, '[EMAILS-API] Failed to update connection')
        return NextResponse.redirect(`${errorUrl}&message=update_failed`)
      }

      // Redirect with connectionId for auto-sync
      return NextResponse.redirect(`${successUrl}&updated=true&connectionId=${existingConnection.id}`)
    }

    // 11. Create new connection
    const gmailConfig = EMAIL_PROVIDERS.gmail
    const syncFromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days

    const { data: newConnection, error: insertError } = await supabase
      .from('team_email_connections')
      .insert({
        team_id: teamId,
        provider: 'gmail',
        email_address: googleUser.email,
        auth_method: 'oauth',
        // OAuth tokens
        oauth_access_token: encryptedTokens.encryptedAccessToken,
        oauth_refresh_token: encryptedTokens.encryptedRefreshToken,
        oauth_token_expires_at: tokens.expiresAt.toISOString(),
        oauth_scope: tokens.scope,
        // IMAP/SMTP config (for reference, will use OAuth)
        imap_host: gmailConfig.imapHost,
        imap_port: gmailConfig.imapPort,
        imap_use_ssl: gmailConfig.imapUseSsl,
        imap_username: googleUser.email,
        imap_password_encrypted: null, // No password for OAuth
        smtp_host: gmailConfig.smtpHost,
        smtp_port: gmailConfig.smtpPort,
        smtp_use_tls: gmailConfig.smtpUseTls,
        smtp_username: googleUser.email,
        smtp_password_encrypted: null,
        // Sync
        sync_from_date: syncFromDate.toISOString(),
        is_active: true,
        // Visibility & ownership
        added_by_user_id: userProfile.id,
        visibility: stateVisibility || 'shared',
      })
      .select('id')
      .single()

    if (insertError || !newConnection) {
      logger.error({ error: insertError?.message }, '[EMAILS-API] Failed to create connection')
      return NextResponse.redirect(`${errorUrl}&message=insert_failed`)
    }

    // 12. Success - Redirect with connectionId for auto-sync
    return NextResponse.redirect(`${successUrl}&connectionId=${newConnection.id}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    logger.error({ error: message }, '[EMAILS-API] OAuth callback error');
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')
    return NextResponse.redirect(
      `${baseUrl}/gestionnaire/parametres/emails?oauth=error&message=${encodeURIComponent(message)}`
    )
  }
}
