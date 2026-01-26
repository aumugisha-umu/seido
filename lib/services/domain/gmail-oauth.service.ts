/**
 * Gmail OAuth 2.0 Service
 *
 * Gère l'authentification OAuth pour les connexions Gmail:
 * - Génération d'URL d'autorisation avec state anti-CSRF
 * - Échange de code contre tokens
 * - Refresh automatique des tokens expirés
 * - Révocation d'accès
 *
 * @module lib/services/domain/gmail-oauth.service
 */

import { EncryptionService } from './encryption.service'

// Configuration Google OAuth
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const OAUTH_STATE_SECRET = process.env.EMAIL_ENCRYPTION_KEY! // Réutilise la clé de chiffrement

// URLs Google OAuth
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

// Scopes requis pour l'accès aux emails Gmail via IMAP/SMTP
// Voir: https://developers.google.com/workspace/gmail/imap/xoauth2-protocol
export const GMAIL_SCOPES = [
  'https://mail.google.com/',                        // Accès IMAP/SMTP complet (obligatoire pour XOAUTH2)
  'https://www.googleapis.com/auth/userinfo.email',  // Email de l'utilisateur
]

// Types
export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  scope: string
}

export interface OAuthState {
  teamId: string
  userId: string
  timestamp: number
}

export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  picture?: string
}

/**
 * Service pour gérer l'authentification OAuth Gmail
 */
export class GmailOAuthService {
  /**
   * Génère l'URL d'autorisation Google OAuth
   * @param teamId - ID de l'équipe
   * @param userId - ID de l'utilisateur
   * @param redirectUri - URI de callback
   * @returns URL d'autorisation complète
   */
  static generateAuthUrl(teamId: string, userId: string, redirectUri: string): string {
    // Créer le state parameter (anti-CSRF)
    const state: OAuthState = {
      teamId,
      userId,
      timestamp: Date.now()
    }
    const encryptedState = this.encryptState(state)

    // Construire les paramètres
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPES.join(' '),
      access_type: 'offline',        // Requis pour obtenir le refresh token
      prompt: 'consent',              // Force le consentement pour obtenir le refresh token
      state: encryptedState,
      include_granted_scopes: 'true'
    })

    return `${GOOGLE_AUTH_URL}?${params.toString()}`
  }

  /**
   * Échange le code d'autorisation contre des tokens
   * @param code - Code d'autorisation de Google
   * @param redirectUri - URI de callback (doit correspondre à l'original)
   * @returns Tokens OAuth
   */
  static async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`)
    }

    const data = await response.json()

    // Calculer la date d'expiration
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000))

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scope: data.scope
    }
  }

  /**
   * Rafraîchit l'access token avec le refresh token
   * @param refreshToken - Refresh token (déchiffré)
   * @returns Nouveau access token et date d'expiration
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
    }

    const data = await response.json()
    const expiresAt = new Date(Date.now() + (data.expires_in * 1000))

    return {
      accessToken: data.access_token,
      expiresAt
    }
  }

  /**
   * Révoque l'accès OAuth chez Google
   * @param token - Access token ou refresh token à révoquer
   */
  static async revokeAccess(token: string): Promise<void> {
    const response = await fetch(`${GOOGLE_REVOKE_URL}?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    // Google renvoie 200 même si le token était déjà révoqué
    if (!response.ok && response.status !== 200) {
      console.warn('Token revocation returned non-200 status:', response.status)
    }
  }

  /**
   * Récupère les informations de l'utilisateur Google
   * @param accessToken - Access token valide
   * @returns Informations utilisateur (email, etc.)
   */
  static async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get user info from Google')
    }

    return response.json()
  }

  /**
   * Chiffre le state parameter
   */
  static encryptState(state: OAuthState): string {
    const stateJson = JSON.stringify(state)
    return EncryptionService.encrypt(stateJson)
  }

  /**
   * Déchiffre et valide le state parameter
   * @param encryptedState - State chiffré
   * @param maxAgeMs - Âge maximum du state (défaut: 10 minutes)
   * @returns State déchiffré ou null si invalide
   */
  static decryptAndValidateState(encryptedState: string, maxAgeMs: number = 10 * 60 * 1000): OAuthState | null {
    try {
      const stateJson = EncryptionService.decrypt(encryptedState)
      const state: OAuthState = JSON.parse(stateJson)

      // Vérifier l'âge du state
      const age = Date.now() - state.timestamp
      if (age > maxAgeMs) {
        console.warn('OAuth state expired:', { age, maxAgeMs })
        return null
      }

      return state
    } catch (error) {
      console.error('Failed to decrypt OAuth state:', error)
      return null
    }
  }

  /**
   * Chiffre les tokens pour stockage en DB
   */
  static encryptTokens(tokens: OAuthTokens): {
    encryptedAccessToken: string
    encryptedRefreshToken: string
  } {
    return {
      encryptedAccessToken: EncryptionService.encrypt(tokens.accessToken),
      encryptedRefreshToken: EncryptionService.encrypt(tokens.refreshToken)
    }
  }

  /**
   * Déchiffre les tokens depuis la DB
   */
  static decryptTokens(encryptedAccessToken: string, encryptedRefreshToken: string): {
    accessToken: string
    refreshToken: string
  } {
    return {
      accessToken: EncryptionService.decrypt(encryptedAccessToken),
      refreshToken: EncryptionService.decrypt(encryptedRefreshToken)
    }
  }

  /**
   * Vérifie si un access token est expiré (avec marge de 5 minutes)
   */
  static isTokenExpired(expiresAt: Date): boolean {
    const marginMs = 5 * 60 * 1000 // 5 minutes de marge
    return new Date(expiresAt).getTime() - marginMs < Date.now()
  }

  /**
   * Génère le token XOAUTH2 pour l'authentification IMAP/SMTP
   * @param email - Email de l'utilisateur
   * @param accessToken - Access token OAuth
   * @returns Token XOAUTH2 encodé en base64
   */
  static generateXOAuth2Token(email: string, accessToken: string): string {
    // Format XOAUTH2: "user=" + email + "\x01auth=Bearer " + accessToken + "\x01\x01"
    const authString = `user=${email}\x01auth=Bearer ${accessToken}\x01\x01`
    return Buffer.from(authString).toString('base64')
  }
}
