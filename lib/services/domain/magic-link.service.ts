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
