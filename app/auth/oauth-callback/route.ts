import { NextRequest, NextResponse } from 'next/server'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

/**
 * OAuth Callback Route Handler
 *
 * Flux:
 * 1. L'utilisateur clique "Continuer avec Google"
 * 2. signInWithOAuth redirige vers Google
 * 3. Google authentifie et redirige vers Supabase (/auth/v1/callback)
 * 4. Supabase redirige ici avec ?code=xxx
 * 5. On échange le code contre une session
 * 6. Redirection vers dashboard ou complete-profile (si nouveau user)
 *
 * Sécurité:
 * - PKCE flow activé dans supabase-client.ts
 * - State parameter géré automatiquement par Supabase (anti-CSRF)
 * - Validation du paramètre `next` pour éviter open redirect
 *
 * @see /lib/services/core/supabase-client.ts - Configuration PKCE
 * @see /components/auth/google-oauth-button.tsx - Déclenchement du flow
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  logger.info('[OAUTH-CALLBACK] Processing OAuth callback', {
    hasCode: !!code,
    hasError: !!error,
    next
  })

  // Gérer les erreurs OAuth (utilisateur a annulé, etc.)
  if (error) {
    logger.error('[OAUTH-CALLBACK] OAuth error:', { error, errorDescription })

    const message = errorDescription
      ? decodeURIComponent(errorDescription)
      : getOAuthErrorMessage(error)

    return NextResponse.redirect(
      new URL(`/auth/login?error=oauth_error&message=${encodeURIComponent(message)}`, origin)
    )
  }

  // Vérifier la présence du code
  if (!code) {
    logger.error('[OAUTH-CALLBACK] No code provided')
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_code&message=Code+d%27authentification+manquant', origin)
    )
  }

  try {
    const supabase = await createServerActionSupabaseClient()

    // Échanger le code contre une session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      logger.error('[OAUTH-CALLBACK] Code exchange failed:', {
        message: exchangeError.message,
        status: exchangeError.status
      })

      return NextResponse.redirect(
        new URL(`/auth/login?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`, origin)
      )
    }

    if (!data.user || !data.session) {
      logger.error('[OAUTH-CALLBACK] No user/session after exchange')
      return NextResponse.redirect(
        new URL('/auth/login?error=no_session&message=Session+non+etablie', origin)
      )
    }

    logger.info('[OAUTH-CALLBACK] Session established', {
      userId: data.user.id,
      email: data.user.email,
      provider: data.user.app_metadata?.provider
    })

    // Vérifier si un profil utilisateur existe déjà
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('auth_user_id', data.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = "No rows found" - c'est OK, c'est un nouveau user
      logger.error('[OAUTH-CALLBACK] Profile lookup error:', profileError)
    }

    if (profile) {
      // Utilisateur existant - rediriger vers le dashboard
      logger.info('[OAUTH-CALLBACK] Existing profile found', {
        userId: profile.id,
        role: profile.role
      })

      const dashboardPath = `/${profile.role}/dashboard`
      const destination = validateNextParameter(next, origin)
        ? next
        : dashboardPath

      return NextResponse.redirect(new URL(destination!, origin))
    }

    // Nouvel utilisateur OAuth - rediriger vers la page de complétion du profil
    logger.info('[OAUTH-CALLBACK] No profile found, redirecting to complete-profile')
    return NextResponse.redirect(new URL('/auth/complete-profile', origin))

  } catch (error) {
    logger.error('[OAUTH-CALLBACK] Exception:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=exception&message=Erreur+interne', origin)
    )
  }
}

/**
 * Traduit les codes d'erreur OAuth en messages utilisateur
 */
function getOAuthErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    'access_denied': 'Authentification annulée',
    'temporarily_unavailable': 'Service temporairement indisponible',
    'server_error': 'Erreur du serveur d\'authentification',
    'invalid_request': 'Requête invalide',
    'unauthorized_client': 'Client non autorisé',
    'unsupported_response_type': 'Type de réponse non supporté',
    'invalid_scope': 'Scope invalide',
  }

  return errorMessages[error] || `Erreur d'authentification: ${error}`
}

/**
 * Valide le paramètre `next` pour éviter les attaques open redirect
 */
function validateNextParameter(next: string | null, origin: string): boolean {
  if (!next) return false

  // URL relative - OK
  if (next.startsWith('/') && !next.startsWith('//')) {
    return true
  }

  try {
    const nextUrl = new URL(next)
    const originUrl = new URL(origin)

    // Vérifier que le domaine correspond
    if (nextUrl.hostname === originUrl.hostname) {
      return true
    }

    // Autoriser aussi les domaines de production
    const productionDomains = ['app.seido.immo', 'seido.app', 'localhost']
    if (productionDomains.includes(nextUrl.hostname)) {
      return true
    }

    return false
  } catch {
    return false
  }
}
