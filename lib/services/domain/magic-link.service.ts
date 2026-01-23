/**
 * Magic Link Service - Génération de liens de connexion automatique
 *
 * Ce service génère des magic links Supabase pour les notifications email.
 * Les utilisateurs peuvent cliquer sur ces liens pour se connecter automatiquement
 * et être redirigés vers la page cible (ex: page d'intervention).
 *
 * Architecture:
 * - Utilise supabase.auth.admin.generateLink({ type: 'magiclink' })
 * - Le lien pointe vers /auth/email-callback avec token_hash et next
 * - Le callback vérifie le token et redirige vers next
 *
 * Expiration:
 * - Configurable dans Supabase Dashboard > Authentication > URL Configuration
 * - OTP Expiry recommandé: 604800 secondes (7 jours)
 *
 * @see /app/auth/email-callback/route.ts - Callback qui vérifie le token
 * @see /app/actions/impersonation-actions.ts - Pattern de référence
 */

import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

interface GenerateMagicLinkOptions {
  /** Email de l'utilisateur (doit exister dans Supabase Auth) */
  email: string
  /** URL de redirection après connexion (chemin relatif, ex: /gestionnaire/interventions/abc-123) */
  redirectTo: string
}

interface MagicLinkRecipient {
  email: string
  redirectTo: string
}

/**
 * Options for generating a magic link with an embedded action
 *
 * The action will be auto-executed on the client side after authentication.
 * This enables interactive email buttons (e.g., "Accept this slot").
 */
interface MagicLinkWithActionOptions {
  /** Email of the user (must exist in Supabase Auth) */
  email: string
  /** URL de redirection après connexion (chemin relatif) */
  redirectTo: string
  /** Action type to execute after auth (e.g., 'confirm_slot', 'validate_intervention') */
  action: string
  /** Parameters for the action (e.g., { slotId: 'xxx' }) */
  params?: Record<string, string>
  /** Whether to auto-execute the action on page load (default: true) */
  autoExecute?: boolean
}

/**
 * Recipient for batch magic link generation with actions
 */
interface MagicLinkActionRecipient extends MagicLinkWithActionOptions {
  // Inherits all fields from MagicLinkWithActionOptions
}

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════

/** Nombre max de magic links générés en parallèle (évite rate limiting) */
const MAX_CONCURRENT_GENERATIONS = 10

/** Délai entre les chunks de génération (ms) */
const CHUNK_DELAY_MS = 100

// ══════════════════════════════════════════════════════════════
// Main Functions
// ══════════════════════════════════════════════════════════════

/**
 * Génère un magic link Supabase pour connexion automatique
 *
 * Le lien généré pointe vers /auth/email-callback avec:
 * - token_hash: token OTP cryptographiquement sécurisé
 * - next: URL de redirection après connexion
 *
 * @param options - Email et URL de redirection
 * @returns URL complète du magic link, ou null en cas d'erreur
 *
 * @example
 * const magicLink = await generateNotificationMagicLink({
 *   email: 'user@example.com',
 *   redirectTo: '/gestionnaire/interventions/abc-123'
 * })
 * // Returns: https://app.seido.immo/auth/email-callback?token_hash=xxx&next=/gestionnaire/interventions/abc-123
 */
export async function generateNotificationMagicLink(
  options: GenerateMagicLinkOptions
): Promise<string | null> {
  const { email, redirectTo } = options

  try {
    const supabase = createServiceRoleSupabaseClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.seido.immo'

    // Générer le magic link via Supabase Admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (error) {
      // Log l'erreur mais pas l'email complet pour la sécurité
      logger.error({
        error: error.message,
        emailDomain: email.split('@')[1]
      }, '[MAGIC-LINK] Failed to generate magic link')
      return null
    }

    if (!data?.properties?.hashed_token) {
      logger.error({
        emailDomain: email.split('@')[1]
      }, '[MAGIC-LINK] No hashed_token in response')
      return null
    }

    // Construire l'URL du callback avec token + redirection
    const callbackUrl = new URL(`${siteUrl}/auth/email-callback`)
    callbackUrl.searchParams.set('token_hash', data.properties.hashed_token)
    callbackUrl.searchParams.set('next', redirectTo)

    logger.debug({
      emailDomain: email.split('@')[1],
      redirectTo
    }, '[MAGIC-LINK] Magic link generated successfully')

    return callbackUrl.toString()

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, '[MAGIC-LINK] Exception generating magic link')
    return null
  }
}

/**
 * Génère les magic links en batch pour plusieurs destinataires
 *
 * Optimisations:
 * - Génération en parallèle par chunks (max 10 concurrents)
 * - Délai entre les chunks pour éviter le rate limiting Supabase
 * - Fallback gracieux: si un lien échoue, les autres continuent
 *
 * @param recipients - Liste des destinataires avec leur URL de redirection
 * @returns Map<email, magicLinkUrl> - Uniquement les liens générés avec succès
 *
 * @example
 * const magicLinks = await generateMagicLinksBatch([
 *   { email: 'user1@example.com', redirectTo: '/gestionnaire/interventions/abc' },
 *   { email: 'user2@example.com', redirectTo: '/prestataire/interventions/abc' }
 * ])
 * // Returns Map with: 'user1@example.com' => 'https://...', etc.
 */
export async function generateMagicLinksBatch(
  recipients: MagicLinkRecipient[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  if (recipients.length === 0) {
    return results
  }

  logger.info({
    recipientCount: recipients.length
  }, '[MAGIC-LINK] Starting batch generation')

  // Diviser en chunks pour éviter le rate limiting
  const chunks = chunkArray(recipients, MAX_CONCURRENT_GENERATIONS)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    // Générer tous les liens du chunk en parallèle
    const promises = chunk.map(async (recipient) => {
      const magicLink = await generateNotificationMagicLink({
        email: recipient.email,
        redirectTo: recipient.redirectTo
      })
      if (magicLink) {
        results.set(recipient.email, magicLink)
      }
    })

    await Promise.all(promises)

    // Petit délai entre les chunks (sauf le dernier)
    if (i < chunks.length - 1) {
      await delay(CHUNK_DELAY_MS)
    }
  }

  logger.info({
    requested: recipients.length,
    generated: results.size,
    failed: recipients.length - results.size
  }, '[MAGIC-LINK] Batch generation completed')

  return results
}

/**
 * Génère un magic link ou retourne l'URL directe en fallback
 *
 * Utile pour les cas où on veut toujours avoir une URL,
 * même si la génération du magic link échoue.
 *
 * @param email - Email de l'utilisateur
 * @param redirectTo - Chemin relatif de redirection
 * @param siteUrl - URL de base du site (optionnel)
 * @returns Magic link si généré, sinon URL directe
 */
export async function generateMagicLinkWithFallback(
  email: string,
  redirectTo: string,
  siteUrl?: string
): Promise<string> {
  const baseUrl = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://app.seido.immo'

  const magicLink = await generateNotificationMagicLink({
    email,
    redirectTo
  })

  if (magicLink) {
    return magicLink
  }

  // Fallback: retourner l'URL directe (l'utilisateur devra se connecter manuellement)
  logger.warn({
    emailDomain: email.split('@')[1],
    redirectTo
  }, '[MAGIC-LINK] Fallback to direct URL')

  return `${baseUrl}${redirectTo}`
}

/**
 * Génère un magic link avec une action intégrée pour les emails interactifs
 *
 * Cette fonction crée un lien qui:
 * 1. Authentifie l'utilisateur via magic link Supabase
 * 2. Transfère les paramètres d'action au callback
 * 3. Le callback encode l'action pour le client
 * 4. Le hook useAutoExecuteAction exécute l'action automatiquement
 *
 * @param options - Configuration du magic link avec action
 * @returns URL complète du magic link avec paramètres d'action, ou null en cas d'erreur
 *
 * @example
 * ```typescript
 * // Générer un lien pour accepter un créneau
 * const acceptUrl = await generateMagicLinkWithAction({
 *   email: 'tenant@example.com',
 *   redirectTo: '/locataire/interventions/abc-123',
 *   action: 'confirm_slot',
 *   params: { slotId: 'slot-456' }
 * })
 * // Returns: https://app.seido.immo/auth/email-callback?token_hash=xxx&next=/locataire/interventions/abc-123&action=confirm_slot&param_slotId=slot-456&auto_execute=true
 * ```
 *
 * @see /app/auth/email-callback/route.ts - Processes the action params
 * @see /hooks/use-auto-execute-action.ts - Executes the action client-side
 */
export async function generateMagicLinkWithAction(
  options: MagicLinkWithActionOptions
): Promise<string | null> {
  const { email, redirectTo, action, params = {}, autoExecute = true } = options

  try {
    const supabase = createServiceRoleSupabaseClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.seido.immo'

    // Générer le magic link via Supabase Admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (error) {
      logger.error({
        error: error.message,
        emailDomain: email.split('@')[1],
        action
      }, '[MAGIC-LINK] Failed to generate action magic link')
      return null
    }

    if (!data?.properties?.hashed_token) {
      logger.error({
        emailDomain: email.split('@')[1],
        action
      }, '[MAGIC-LINK] No hashed_token in response for action link')
      return null
    }

    // Construire l'URL du callback avec token + action params
    const callbackUrl = new URL(`${siteUrl}/auth/email-callback`)
    callbackUrl.searchParams.set('token_hash', data.properties.hashed_token)
    callbackUrl.searchParams.set('next', redirectTo)
    callbackUrl.searchParams.set('action', action)
    callbackUrl.searchParams.set('auto_execute', autoExecute ? 'true' : 'false')

    // Ajouter les paramètres d'action avec préfixe param_
    for (const [key, value] of Object.entries(params)) {
      callbackUrl.searchParams.set(`param_${key}`, value)
    }

    logger.debug({
      emailDomain: email.split('@')[1],
      redirectTo,
      action,
      paramsCount: Object.keys(params).length
    }, '[MAGIC-LINK] Action magic link generated successfully')

    return callbackUrl.toString()

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      action
    }, '[MAGIC-LINK] Exception generating action magic link')
    return null
  }
}

/**
 * Génère un magic link avec action et fallback vers URL directe
 *
 * Combine generateMagicLinkWithAction avec un fallback gracieux.
 * Si la génération échoue, retourne l'URL directe (l'action ne sera pas auto-exécutée,
 * mais l'utilisateur pourra toujours effectuer l'action manuellement).
 *
 * @param options - Configuration du magic link avec action
 * @returns Magic link si généré, sinon URL directe
 */
export async function generateMagicLinkWithActionFallback(
  options: MagicLinkWithActionOptions
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.seido.immo'

  const magicLink = await generateMagicLinkWithAction(options)

  if (magicLink) {
    return magicLink
  }

  // Fallback: retourner l'URL directe sans action
  logger.warn({
    emailDomain: options.email.split('@')[1],
    action: options.action
  }, '[MAGIC-LINK] Fallback to direct URL for action link')

  return `${baseUrl}${options.redirectTo}`
}

/**
 * Génère des magic links avec actions en batch
 *
 * Optimisé pour générer plusieurs liens en parallèle avec rate limiting.
 * Utile pour les emails de créneaux où chaque slot a ses propres boutons.
 *
 * @param recipients - Liste des destinataires avec leurs actions
 * @returns Map<identifier, magicLinkUrl> - identifier = `${email}:${action}:${JSON.stringify(params)}`
 *
 * @example
 * ```typescript
 * const links = await generateMagicLinksWithActionBatch([
 *   {
 *     email: 'tenant@example.com',
 *     redirectTo: '/locataire/interventions/abc',
 *     action: 'confirm_slot',
 *     params: { slotId: 'slot-1' }
 *   },
 *   {
 *     email: 'tenant@example.com',
 *     redirectTo: '/locataire/interventions/abc',
 *     action: 'reject_slot',
 *     params: { slotId: 'slot-1' }
 *   }
 * ])
 * // Map with keys like 'tenant@example.com:confirm_slot:{"slotId":"slot-1"}'
 * ```
 */
export async function generateMagicLinksWithActionBatch(
  recipients: MagicLinkActionRecipient[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  if (recipients.length === 0) {
    return results
  }

  logger.info({
    recipientCount: recipients.length
  }, '[MAGIC-LINK] Starting batch action link generation')

  // Diviser en chunks pour éviter le rate limiting
  const chunks = chunkArray(recipients, MAX_CONCURRENT_GENERATIONS)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    // Générer tous les liens du chunk en parallèle
    const promises = chunk.map(async (recipient) => {
      const magicLink = await generateMagicLinkWithAction(recipient)
      if (magicLink) {
        // Create unique key for this action
        const key = createActionKey(recipient.email, recipient.action, recipient.params)
        results.set(key, magicLink)
      }
    })

    await Promise.all(promises)

    // Petit délai entre les chunks (sauf le dernier)
    if (i < chunks.length - 1) {
      await delay(CHUNK_DELAY_MS)
    }
  }

  logger.info({
    requested: recipients.length,
    generated: results.size,
    failed: recipients.length - results.size
  }, '[MAGIC-LINK] Batch action link generation completed')

  return results
}

/**
 * Crée une clé unique pour identifier un lien d'action
 */
function createActionKey(email: string, action: string, params?: Record<string, string>): string {
  return `${email}:${action}:${JSON.stringify(params || {})}`
}

/**
 * Parse une clé d'action pour extraire ses composants
 */
export function parseActionKey(key: string): { email: string; action: string; params: Record<string, string> } | null {
  try {
    const [email, action, paramsJson] = key.split(':')
    return {
      email,
      action,
      params: JSON.parse(paramsJson || '{}')
    }
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

/**
 * Divise un tableau en chunks de taille spécifiée
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Délai asynchrone
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
