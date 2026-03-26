import { NextRequest, NextResponse } from 'next/server'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { checkBetaAccess } from '@/lib/beta-access'
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

      // Detect invite-only hook rejection (403 from before-user-created hook)
      const errorMsg = exchangeError.message || ''
      const isInviteOnlyBlock = exchangeError.status === 403 ||
        errorMsg.includes('hook_block_uninvited') ||
        errorMsg.includes('invitation') ||
        errorMsg.includes('sur invitation')
      if (isInviteOnlyBlock) {
        logger.warn('[OAUTH-CALLBACK] Blocked by invite-only hook', {
          email: searchParams.get('email')
        })
        return NextResponse.redirect(
          new URL(
            '/auth/login?error=invite_only&message=' +
            encodeURIComponent("L'acces a SEIDO se fait sur invitation. Demandez votre acces sur la page d'inscription."),
            origin
          )
        )
      }

      // Sanitize error message — never expose internal hook URIs or DB details
      const userMessage = errorMsg.includes('pg-functions://') || errorMsg.includes('hook')
        ? 'Une erreur est survenue lors de la connexion. Veuillez reessayer.'
        : exchangeError.message
      return NextResponse.redirect(
        new URL(`/auth/login?error=exchange_failed&message=${encodeURIComponent(userMessage)}`, origin)
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
      .select('id, role, name, team_id')
      .eq('auth_user_id', data.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = "No rows found" - c'est OK, c'est un nouveau user
      logger.error('[OAUTH-CALLBACK] Profile lookup error:', profileError)
    }

    if (profile) {
      logger.info('[OAUTH-CALLBACK] Existing profile found', {
        userId: profile.id,
        role: profile.role,
        hasTeam: !!profile.team_id
      })

      // Partial profile (no team) → complete profile first
      if (!profile.team_id) {
        logger.info('[OAUTH-CALLBACK] Partial profile (no team), redirecting to complete-profile')
        return NextResponse.redirect(new URL('/auth/complete-profile', origin))
      }

      // Full profile → dashboard
      const dashboardPath = `/${profile.role}/dashboard`
      const destination = validateNextParameter(next, origin)
        ? next
        : dashboardPath

      return NextResponse.redirect(new URL(destination!, origin))
    }

    // New OAuth user — check invite-only gate before allowing profile creation
    const hasBetaAccess = await checkBetaAccess()
    if (!hasBetaAccess) {
      logger.warn('[OAUTH-CALLBACK] New user blocked by invite-only gate', {
        email: data.user.email
      })
      // Sign out the auth-only user to prevent orphan sessions
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL(
          '/auth/login?error=invite_only&message=' +
          encodeURIComponent('L\'accès à SEIDO se fait actuellement sur invitation. Demandez votre accès sur la page d\'inscription.'),
          origin
        )
      )
    }

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
    const productionDomains = ['app.seido.immo', 'seido-app.com', 'localhost']
    if (productionDomains.includes(nextUrl.hostname)) {
      return true
    }

    return false
  } catch {
    return false
  }
}
