/**
 * API Route: GET /api/emails/oauth/callback
 *
 * Callback OAuth de Google après autorisation.
 * - Valide le state parameter (anti-CSRF)
 * - Échange le code contre les tokens
 * - Crée la connexion email en base
 * - Redirige vers la page des paramètres email
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/services'
import { GmailOAuthService, GMAIL_SCOPES } from '@/lib/services/domain/gmail-oauth.service'
import { EncryptionService } from '@/lib/services/domain/encryption.service'
import { EMAIL_PROVIDERS } from '@/lib/constants/email-providers'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // URL de redirection
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const successUrl = `${baseUrl}/gestionnaire/parametres/emails?oauth=success`
    const errorUrl = `${baseUrl}/gestionnaire/parametres/emails?oauth=error`

    // 1. Vérifier les erreurs de Google
    if (error) {
      console.error('Google OAuth error:', error, url.searchParams.get('error_description'))
      return NextResponse.redirect(`${errorUrl}&message=${encodeURIComponent(error)}`)
    }

    // 2. Vérifier les paramètres requis
    if (!code || !state) {
      console.error('Missing code or state parameter')
      return NextResponse.redirect(`${errorUrl}&message=missing_parameters`)
    }

    // 3. Valider et déchiffrer le state
    const stateData = GmailOAuthService.decryptAndValidateState(state)
    if (!stateData) {
      console.error('Invalid or expired state parameter')
      return NextResponse.redirect(`${errorUrl}&message=invalid_state`)
    }

    const { teamId, userId } = stateData

    // 4. Créer le client Supabase serveur
    const supabase = await createServerSupabaseClient()

    // 5. Vérifier que l'utilisateur est toujours connecté et appartient à la team
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('User not authenticated during OAuth callback')
      return NextResponse.redirect(`${errorUrl}&message=not_authenticated`)
    }

    // 6. Vérifier le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, team_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile || profile.team_id !== teamId) {
      console.error('User profile mismatch or not found')
      return NextResponse.redirect(`${errorUrl}&message=team_mismatch`)
    }

    // 7. Échanger le code contre les tokens
    const redirectUri = `${baseUrl}/api/emails/oauth/callback`
    const tokens = await GmailOAuthService.exchangeCodeForTokens(code, redirectUri)

    // 8. Récupérer l'email de l'utilisateur Google
    const googleUser = await GmailOAuthService.getUserInfo(tokens.accessToken)
    if (!googleUser.email) {
      console.error('Failed to get email from Google')
      return NextResponse.redirect(`${errorUrl}&message=no_email`)
    }

    // 9. Chiffrer les tokens pour stockage
    const encryptedTokens = GmailOAuthService.encryptTokens(tokens)

    // 10. Vérifier si une connexion existe déjà pour cet email
    const { data: existingConnection } = await supabase
      .from('team_email_connections')
      .select('id')
      .eq('team_id', teamId)
      .eq('email_address', googleUser.email)
      .single()

    if (existingConnection) {
      // Mettre à jour la connexion existante vers OAuth
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
          // Garder les anciens paramètres IMAP/SMTP pour fallback
        })
        .eq('id', existingConnection.id)

      if (updateError) {
        console.error('Failed to update connection:', updateError)
        return NextResponse.redirect(`${errorUrl}&message=update_failed`)
      }

      // Redirection avec connectionId pour auto-sync
      return NextResponse.redirect(`${successUrl}&updated=true&connectionId=${existingConnection.id}`)
    }

    // 11. Créer une nouvelle connexion
    const gmailConfig = EMAIL_PROVIDERS.gmail
    const syncFromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 jours

    const { data: newConnection, error: insertError } = await supabase
      .from('team_email_connections')
      .insert({
        team_id: teamId,
        provider: 'gmail',
        email_address: googleUser.email,
        auth_method: 'oauth',
        // Tokens OAuth
        oauth_access_token: encryptedTokens.encryptedAccessToken,
        oauth_refresh_token: encryptedTokens.encryptedRefreshToken,
        oauth_token_expires_at: tokens.expiresAt.toISOString(),
        oauth_scope: tokens.scope,
        // Configuration IMAP/SMTP (pour référence, utilisera OAuth)
        imap_host: gmailConfig.imapHost,
        imap_port: gmailConfig.imapPort,
        imap_use_ssl: gmailConfig.imapUseSsl,
        imap_username: googleUser.email,
        imap_password_encrypted: null, // Pas de mot de passe pour OAuth
        smtp_host: gmailConfig.smtpHost,
        smtp_port: gmailConfig.smtpPort,
        smtp_use_tls: gmailConfig.smtpUseTls,
        smtp_username: googleUser.email,
        smtp_password_encrypted: null,
        // Sync
        sync_from_date: syncFromDate.toISOString(),
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError || !newConnection) {
      console.error('Failed to create connection:', insertError)
      return NextResponse.redirect(`${errorUrl}&message=insert_failed`)
    }

    // 12. Succès - Rediriger avec connectionId pour auto-sync
    return NextResponse.redirect(`${successUrl}&connectionId=${newConnection.id}`)
  } catch (error: any) {
    console.error('OAuth callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return NextResponse.redirect(
      `${baseUrl}/gestionnaire/parametres/emails?oauth=error&message=${encodeURIComponent(error.message || 'unknown_error')}`
    )
  }
}
