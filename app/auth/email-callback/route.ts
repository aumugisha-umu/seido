import { NextRequest, NextResponse } from 'next/server'
import { createServerActionSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

/**
 * Callback route pour les magic links des notifications email
 *
 * Flux Standard (sans action):
 * 1. L'utilisateur clique sur un lien dans un email de notification
 * 2. Le lien pointe vers /auth/email-callback?token_hash=xxx&next=/gestionnaire/interventions/abc
 * 3. Ce route vérifie le token OTP via Supabase
 * 4. Si valide, la session est établie et l'utilisateur est redirigé vers `next`
 *
 * Flux Interactif (avec action):
 * 1. L'utilisateur clique sur un bouton d'action dans un email (ex: "Accepter ce créneau")
 * 2. Le lien contient: token_hash, next, action, auto_execute, param_*
 * 3. Après vérification OTP, l'action est encodée en base64url
 * 4. Redirect vers `next?pending_action=xxx` où xxx contient l'action encodée
 * 5. Le hook useAutoExecuteAction sur la page cible exécute l'action automatiquement
 *
 * Sécurité:
 * - token_hash est un token OTP cryptographiquement sécurisé généré par Supabase
 * - Le paramètre `next` est validé pour éviter les open redirects
 * - Les actions sont validées contre une liste blanche
 * - Expiration configurable dans Supabase Dashboard (défaut: 1h, nous utilisons 7j)
 *
 * @see /app/auth/impersonate/callback/route.ts - Pattern de référence
 * @see /lib/services/domain/magic-link.service.ts - Génération des liens
 * @see /hooks/use-auto-execute-action.ts - Exécution client des actions
 */

// Liste blanche des actions autorisées
const VALID_ACTIONS = [
  'confirm_slot',
  'reject_slot',
  'validate_intervention',
  'submit_quick_estimate',
  'accept_time_slot'
] as const
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const next = searchParams.get('next') || '/gestionnaire/dashboard'

  // Action parameters for interactive emails
  const action = searchParams.get('action')
  const autoExecute = searchParams.get('auto_execute') === 'true'

  logger.info('[EMAIL-CALLBACK] Processing magic link callback', {
    hasToken: !!tokenHash,
    next,
    hasAction: !!action,
    autoExecute
  })

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

    // ✅ AMÉLIORATION: Vérifier d'abord si l'utilisateur est déjà connecté
    // Si oui, on peut rediriger directement sans vérifier le token OTP
    // Cela permet de réutiliser le lien même après consommation du token
    const { data: existingSession } = await supabase.auth.getUser()

    if (existingSession?.user) {
      logger.info('[EMAIL-CALLBACK] User already authenticated, redirecting directly', {
        userId: existingSession.user.id,
        email: existingSession.user.email,
        hasAction: !!action
      })

      // Construire l'URL de redirection avec les paramètres d'action si présents
      let redirectUrl = next

      if (action && autoExecute && isValidAction(action)) {
        const actionParams: Record<string, string> = {}
        searchParams.forEach((value, key) => {
          if (key.startsWith('param_')) {
            const paramName = key.replace('param_', '')
            actionParams[paramName] = value
          }
        })

        const pendingAction = { action, params: actionParams }
        const encoded = Buffer.from(JSON.stringify(pendingAction)).toString('base64url')

        const redirectUrlObj = new URL(next, request.url)
        redirectUrlObj.searchParams.set('pending_action', encoded)
        redirectUrl = redirectUrlObj.pathname + redirectUrlObj.search

        logger.info('[EMAIL-CALLBACK] Action encoded for already-authenticated user', {
          action,
          paramsCount: Object.keys(actionParams).length
        })
      }

      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    // Pas de session existante - validation du token_hash obligatoire
    if (!tokenHash) {
      logger.error('[EMAIL-CALLBACK] Missing token_hash parameter and no existing session')
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_token&message=Lien+invalide.+Veuillez+vous+connecter.', request.url)
      )
    }

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

      // Gérer les erreurs spécifiques - proposer de se connecter manuellement
      if (error.message.includes('expired') || error.message.includes('Token has expired')) {
        // Encoder le next dans l'URL de login pour rediriger après connexion manuelle
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('error', 'link_expired')
        loginUrl.searchParams.set('message', 'Ce lien a expiré ou a déjà été utilisé. Connectez-vous pour accéder à la page.')
        loginUrl.searchParams.set('redirect', next)
        return NextResponse.redirect(loginUrl)
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

    // Build redirect URL
    let redirectUrl = next

    // If action is present and valid, encode it for client-side execution
    if (action && autoExecute && isValidAction(action)) {
      // Collect action parameters (param_*)
      const actionParams: Record<string, string> = {}
      searchParams.forEach((value, key) => {
        if (key.startsWith('param_')) {
          const paramName = key.replace('param_', '')
          actionParams[paramName] = value
        }
      })

      // Encode the action and params for URL transfer
      const pendingAction = {
        action,
        params: actionParams
      }
      const encoded = Buffer.from(JSON.stringify(pendingAction)).toString('base64url')

      // Append to redirect URL
      const redirectUrlObj = new URL(next, request.url)
      redirectUrlObj.searchParams.set('pending_action', encoded)
      redirectUrl = redirectUrlObj.pathname + redirectUrlObj.search

      logger.info('[EMAIL-CALLBACK] Action encoded for client execution', {
        action,
        paramsCount: Object.keys(actionParams).length
      })
    } else if (action && !isValidAction(action)) {
      logger.warn('[EMAIL-CALLBACK] Invalid action type received', { action })
    }

    // Rediriger vers la page cible
    return NextResponse.redirect(new URL(redirectUrl, request.url))

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

/**
 * Valide qu'une action est dans la liste blanche
 */
function isValidAction(action: string): action is typeof VALID_ACTIONS[number] {
  return (VALID_ACTIONS as readonly string[]).includes(action)
}
