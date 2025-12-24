import { NextRequest, NextResponse } from 'next/server'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

/**
 * Callback route pour les magic links des notifications email
 *
 * Flux:
 * 1. L'utilisateur clique sur un lien dans un email de notification
 * 2. Le lien pointe vers /auth/email-callback?token_hash=xxx&next=/gestionnaire/interventions/abc
 * 3. Ce route vérifie le token OTP via Supabase
 * 4. Si valide, la session est établie et l'utilisateur est redirigé vers `next`
 *
 * Sécurité:
 * - token_hash est un token OTP cryptographiquement sécurisé généré par Supabase
 * - Le paramètre `next` est validé pour éviter les open redirects
 * - Expiration configurable dans Supabase Dashboard (défaut: 1h, nous utilisons 7j)
 *
 * @see /app/auth/impersonate/callback/route.ts - Pattern de référence
 * @see /lib/services/domain/magic-link.service.ts - Génération des liens
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const next = searchParams.get('next') || '/gestionnaire/dashboard'

  logger.info('[EMAIL-CALLBACK] Processing magic link callback', {
    hasToken: !!tokenHash,
    next
  })

  // Validation du token_hash
  if (!tokenHash) {
    logger.error('[EMAIL-CALLBACK] Missing token_hash parameter')
    return NextResponse.redirect(
      new URL('/auth/login?error=missing_token&message=Lien+invalide', request.url)
    )
  }

  // Validation du paramètre next pour éviter open redirect
  // Ne permettre que les URLs relatives ou vers notre domaine
  const isValidNext = validateNextParameter(next, request.url)
  if (!isValidNext) {
    logger.warn('[EMAIL-CALLBACK] Invalid next parameter detected, using default', { next })
    return NextResponse.redirect(
      new URL('/gestionnaire/dashboard', request.url)
    )
  }

  try {
    // Créer le client Supabase qui peut écrire les cookies de session
    const supabase = await createServerActionSupabaseClient()

    // Vérifier le token OTP et établir la session
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink'
    })

    if (error) {
      logger.error('[EMAIL-CALLBACK] OTP verification failed:', {
        message: error.message,
        status: error.status
      })

      // Gérer les erreurs spécifiques
      if (error.message.includes('expired') || error.message.includes('Token has expired')) {
        return NextResponse.redirect(
          new URL('/auth/login?error=link_expired&message=Ce+lien+a+expire.+Veuillez+vous+connecter+manuellement.', request.url)
        )
      }

      return NextResponse.redirect(
        new URL(`/auth/login?error=invalid_token&message=${encodeURIComponent(error.message)}`, request.url)
      )
    }

    if (!data.session || !data.user) {
      logger.error('[EMAIL-CALLBACK] No session returned after OTP verification')
      return NextResponse.redirect(
        new URL('/auth/login?error=no_session&message=Session+non+etablie', request.url)
      )
    }

    logger.info('[EMAIL-CALLBACK] Session established successfully', {
      userId: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role
    })

    // Rediriger vers la page cible
    return NextResponse.redirect(new URL(next, request.url))

  } catch (error) {
    logger.error('[EMAIL-CALLBACK] Exception during callback processing:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=exception&message=Erreur+interne', request.url)
    )
  }
}

/**
 * Valide le paramètre `next` pour éviter les attaques open redirect
 *
 * Règles:
 * - URLs relatives sont autorisées (commencent par /)
 * - URLs absolues doivent pointer vers le même domaine
 * - Pas de protocoles externes (javascript:, data:, etc.)
 */
function validateNextParameter(next: string, requestUrl: string): boolean {
  // URL relative - OK
  if (next.startsWith('/') && !next.startsWith('//')) {
    return true
  }

  try {
    const nextUrl = new URL(next)
    const currentUrl = new URL(requestUrl)

    // Vérifier que le domaine correspond
    if (nextUrl.hostname === currentUrl.hostname) {
      return true
    }

    // Autoriser aussi le domaine de production
    const productionDomains = ['app.seido.immo', 'seido.app', 'localhost']
    if (productionDomains.includes(nextUrl.hostname)) {
      return true
    }

    return false
  } catch {
    // URL malformée - rejeter
    return false
  }
}
