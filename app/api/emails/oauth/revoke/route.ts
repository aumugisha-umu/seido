/**
 * API Route: POST /api/emails/oauth/revoke
 *
 * Révoque l'accès OAuth pour une connexion email.
 * - Révoque les tokens chez Google
 * - Supprime la connexion de la base de données
 */

import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { GmailOAuthService } from '@/lib/services/domain/gmail-oauth.service'

export async function POST(request: Request) {
  try {
    // 1. Vérifier l'authentification
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    if (!userProfile?.team_id) {
      return NextResponse.json(
        { error: 'No team found for user' },
        { status: 404 }
      )
    }

    // 2. Récupérer l'ID de la connexion et l'option de suppression des emails
    const body = await request.json()
    const { connectionId, deleteEmails = false } = body

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // 3. Récupérer la connexion et vérifier qu'elle appartient à l'équipe
    const { data: connection, error: fetchError } = await supabase
      .from('team_email_connections')
      .select('id, team_id, auth_method, oauth_access_token, oauth_refresh_token')
      .eq('id', connectionId)
      .eq('team_id', userProfile.team_id)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found or access denied' },
        { status: 404 }
      )
    }

    // 4. Vérifier que c'est une connexion OAuth
    if (connection.auth_method !== 'oauth') {
      return NextResponse.json(
        { error: 'This connection does not use OAuth' },
        { status: 400 }
      )
    }

    // 5. Révoquer les tokens chez Google
    if (connection.oauth_access_token || connection.oauth_refresh_token) {
      try {
        // Déchiffrer et révoquer l'access token ou le refresh token
        const tokens = GmailOAuthService.decryptTokens(
          connection.oauth_access_token || '',
          connection.oauth_refresh_token || ''
        )

        // Préférer révoquer le refresh token car il révoque aussi l'access token
        const tokenToRevoke = tokens.refreshToken || tokens.accessToken
        if (tokenToRevoke) {
          await GmailOAuthService.revokeAccess(tokenToRevoke)
        }
      } catch (revokeError) {
        // Log l'erreur mais continue - on veut supprimer la connexion même si la révocation échoue
        console.warn('Failed to revoke OAuth token (continuing anyway):', revokeError)
      }
    }

    // 5b. Si deleteEmails est true, supprimer les emails et éléments liés
    if (deleteEmails) {
      // Récupérer les IDs des emails de cette connexion
      const { data: emailIds } = await supabase
        .from('emails')
        .select('id')
        .eq('email_connection_id', connectionId)

      if (emailIds && emailIds.length > 0) {
        const ids = emailIds.map(e => e.id)

        // 1. Supprimer les liens email_links
        await supabase
          .from('email_links')
          .delete()
          .in('email_id', ids)

        // 2. Supprimer les pièces jointes
        await supabase
          .from('email_attachments')
          .delete()
          .in('email_id', ids)

        // 3. Supprimer les emails
        await supabase
          .from('emails')
          .delete()
          .eq('email_connection_id', connectionId)

        console.log(`Deleted ${ids.length} emails and related data for connection ${connectionId}`)
      }
    }

    // 6. Supprimer la connexion de la base de données
    const { error: deleteError } = await supabase
      .from('team_email_connections')
      .delete()
      .eq('id', connectionId)

    if (deleteError) {
      console.error('Failed to delete connection:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: deleteEmails
        ? 'OAuth access revoked, connection and emails deleted'
        : 'OAuth access revoked and connection deleted',
      emailsDeleted: deleteEmails
    })
  } catch (error: any) {
    console.error('OAuth revoke error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revoke OAuth access' },
      { status: 500 }
    )
  }
}
