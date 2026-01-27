/**
 * 📧 EmailReplyService - Service de génération et parsing d'adresses reply-to
 *
 * Permet aux locataires et prestataires de répondre directement aux emails
 * de notification d'intervention. Les réponses sont automatiquement liées
 * à l'intervention correspondante.
 *
 * Architecture:
 * - Génère des adresses reply-to uniques avec hash HMAC pour sécurité
 * - Parse les adresses entrantes pour extraire l'entité cible
 * - Vérifie l'intégrité via comparaison constant-time (timing attack safe)
 *
 * Format d'adresse: reply+int_{interventionId}_{hash8chars}@reply.seido-app.com
 *
 * @see app/api/webhooks/resend-inbound/route.ts - Webhook de réception
 * @see lib/services/domain/email-notification.service.ts - Utilisation du replyTo
 */

import * as crypto from 'crypto'
import { logger } from '@/lib/logger'

// ══════════════════════════════════════════════════════════════
// Configuration
// ══════════════════════════════════════════════════════════════

/**
 * Clé secrète HMAC pour signer les adresses reply-to
 * Doit être générée avec: openssl rand -hex 32
 */
const REPLY_TO_SECRET = process.env.REPLY_TO_SECRET || ''

/**
 * Domaine utilisé pour les adresses reply-to
 * Doit être configuré dans Resend avec MX records
 */
const INBOUND_DOMAIN = process.env.RESEND_INBOUND_DOMAIN || 'reply.seido-app.com'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

/**
 * Types d'entités supportées pour le reply-to
 */
export type ReplyToEntityType = 'intervention' | 'conversation'

/**
 * Types de threads de conversation
 */
export type ConversationThreadType = 'group' | 'tenant_to_managers' | 'provider_to_managers'

/**
 * Résultat du parsing d'une adresse reply-to (intervention)
 */
export interface ParsedReplyToAddress {
  type: ReplyToEntityType
  id: string
  hash: string
}

/**
 * Résultat du parsing d'une adresse reply-to (conversation)
 */
export interface ParsedConversationReplyToAddress {
  type: 'conversation'
  interventionId: string
  threadType: ConversationThreadType
  hash: string
}

// ══════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════

/**
 * Service de gestion des adresses reply-to pour les emails de notification
 */
export class EmailReplyService {
  /**
   * Génère une adresse reply-to unique pour une intervention
   *
   * Format: reply+int_{interventionId}_{hash8chars}@reply.seido-app.com
   *
   * Le hash HMAC permet de:
   * 1. Vérifier l'authenticité des réponses reçues
   * 2. Empêcher la falsification d'adresses (anti-spam)
   * 3. Lier automatiquement la réponse à l'intervention
   *
   * @param interventionId - UUID de l'intervention
   * @returns Adresse email reply-to unique
   *
   * @example
   * ```typescript
   * const replyTo = EmailReplyService.generateInterventionReplyTo('abc-123-def')
   * // => "SEIDO Intervention <reply+int_abc-123-def_a1b2c3d4@reply.seido-app.com>"
   * ```
   */
  static generateInterventionReplyTo(interventionId: string): string {
    if (!REPLY_TO_SECRET) {
      logger.warn({}, '⚠️ [EMAIL-REPLY] REPLY_TO_SECRET not configured - using fallback')
      // En dev sans secret, retourner une adresse de fallback (pas de tracking)
      // Format RFC 5322 requis par Resend: "Display Name <email@domain.com>"
      return `SEIDO <noreply@${INBOUND_DOMAIN}>`
    }

    const hash = this.generateHash('intervention', interventionId)
    // Format RFC 5322 requis par Resend: "Display Name <email@domain.com>"
    const emailAddress = `reply+int_${interventionId}_${hash}@${INBOUND_DOMAIN}`
    const replyTo = `SEIDO Intervention <${emailAddress}>`

    logger.debug(
      { interventionId, replyTo },
      '📧 [EMAIL-REPLY] Generated reply-to address for intervention'
    )

    return replyTo
  }

  /**
   * Génère un Message-ID unique pour le threading email
   *
   * Le Message-ID permet aux clients email de grouper les conversations.
   * Les réponses incluront ce Message-ID dans leur header "In-Reply-To".
   *
   * Format: <intervention.{id}.{timestamp}@seido-app.com>
   *
   * @param interventionId - UUID de l'intervention
   * @returns Message-ID au format RFC 5322
   *
   * @example
   * ```typescript
   * const messageId = EmailReplyService.generateMessageId('abc-123-def')
   * // => "<intervention.abc-123-def.1704067200000@seido-app.com>"
   * ```
   */
  static generateMessageId(interventionId: string): string {
    const timestamp = Date.now()
    return `<intervention.${interventionId}.${timestamp}@seido-app.com>`
  }

  // ══════════════════════════════════════════════════════════════
  // Conversation Reply-To (New Format)
  // ══════════════════════════════════════════════════════════════

  /**
   * Génère une adresse reply-to unique pour un thread de conversation
   *
   * Format: reply+conv_{interventionId}_{threadType}_{hash8chars}@reply.seido-app.com
   *
   * Ce format permet de router la réponse email directement vers le bon thread :
   * - group: Conversation visible par tous les participants
   * - tenant_to_managers: Messages privés locataire ↔ gestionnaires
   * - provider_to_managers: Messages privés prestataire ↔ gestionnaires
   *
   * @param interventionId - UUID de l'intervention
   * @param threadType - Type de thread cible
   * @returns Adresse email reply-to unique
   *
   * @example
   * ```typescript
   * const replyTo = EmailReplyService.generateConversationReplyTo(
   *   'abc-123-def',
   *   'tenant_to_managers'
   * )
   * // => "SEIDO Conversation <reply+conv_abc-123-def_tenant_to_managers_a1b2c3d4@reply.seido-app.com>"
   * ```
   */
  static generateConversationReplyTo(
    interventionId: string,
    threadType: ConversationThreadType
  ): string {
    if (!REPLY_TO_SECRET) {
      logger.warn({}, '⚠️ [EMAIL-REPLY] REPLY_TO_SECRET not configured - using fallback')
      return `SEIDO <noreply@${INBOUND_DOMAIN}>`
    }

    const hash = this.generateConversationHash(interventionId, threadType)
    // Format RFC 5322 requis par Resend: "Display Name <email@domain.com>"
    const emailAddress = `reply+conv_${interventionId}_${threadType}_${hash}@${INBOUND_DOMAIN}`
    const replyTo = `SEIDO Conversation <${emailAddress}>`

    logger.debug(
      { interventionId, threadType, replyTo },
      '📧 [EMAIL-REPLY] Generated conversation reply-to address'
    )

    return replyTo
  }

  /**
   * Parse une adresse reply-to conversation et extrait les composants
   *
   * Supporte le format: reply+conv_{uuid}_{threadType}_{hash}@domain
   *
   * @param address - Adresse email à parser
   * @returns Composants extraits ou null si format invalide
   *
   * @example
   * ```typescript
   * const parsed = EmailReplyService.parseConversationReplyToAddress(
   *   'reply+conv_abc-123-def_group_a1b2c3d4@reply.seido-app.com'
   * )
   * // => { type: 'conversation', interventionId: 'abc-123-def', threadType: 'group', hash: 'a1b2c3d4' }
   * ```
   */
  static parseConversationReplyToAddress(address: string): ParsedConversationReplyToAddress | null {
    if (!address) return null

    const normalizedAddress = address.toLowerCase().trim()

    // Match: reply+conv_{uuid}_{threadType}_{hash}@domain
    // UUID format: 8-4-4-4-12 hexadecimal characters with hyphens
    // ThreadType: group | tenant_to_managers | provider_to_managers
    const conversationMatch = normalizedAddress.match(
      /reply\+conv_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})_(group|tenant_to_managers|provider_to_managers)_([a-f0-9]{8})@/i
    )

    if (conversationMatch) {
      return {
        type: 'conversation',
        interventionId: conversationMatch[1],
        threadType: conversationMatch[2] as ConversationThreadType,
        hash: conversationMatch[3]
      }
    }

    logger.debug({ address }, '📧 [EMAIL-REPLY] Failed to parse conversation reply-to address')
    return null
  }

  /**
   * Vérifie que le hash correspond à la conversation (sécurité anti-falsification)
   *
   * @param interventionId - UUID de l'intervention
   * @param threadType - Type de thread
   * @param providedHash - Hash fourni dans l'adresse reply-to
   * @returns true si le hash est valide, false sinon
   */
  static verifyConversationHash(
    interventionId: string,
    threadType: ConversationThreadType,
    providedHash: string
  ): boolean {
    if (!REPLY_TO_SECRET) {
      logger.warn({}, '⚠️ [EMAIL-REPLY] REPLY_TO_SECRET not configured - cannot verify hash')
      return false
    }

    const expectedHash = this.generateConversationHash(interventionId, threadType)

    try {
      const expectedBuffer = Buffer.from(expectedHash, 'utf8')
      const providedBuffer = Buffer.from(providedHash.toLowerCase(), 'utf8')

      if (expectedBuffer.length !== providedBuffer.length) {
        logger.warn(
          { interventionId, threadType, providedHash: providedHash.substring(0, 4) + '...' },
          '⚠️ [EMAIL-REPLY] Conversation hash length mismatch'
        )
        return false
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer)

      if (!isValid) {
        logger.warn(
          { interventionId, threadType, providedHash: providedHash.substring(0, 4) + '...' },
          '⚠️ [EMAIL-REPLY] Invalid conversation hash - potential tampering attempt'
        )
      }

      return isValid
    } catch (error) {
      logger.error(
        { error, interventionId, threadType },
        '❌ [EMAIL-REPLY] Error during conversation hash verification'
      )
      return false
    }
  }

  /**
   * Génère un hash HMAC-SHA256 pour les conversations
   * Format: "conversation:{interventionId}:{threadType}"
   */
  private static generateConversationHash(
    interventionId: string,
    threadType: ConversationThreadType
  ): string {
    return crypto
      .createHmac('sha256', REPLY_TO_SECRET)
      .update(`conversation:${interventionId}:${threadType}`)
      .digest('hex')
      .substring(0, 8)
  }

  /**
   * Parse une adresse reply-to et extrait les composants
   *
   * Supporte le format: reply+int_{uuid}_{hash}@domain
   *
   * @param address - Adresse email à parser
   * @returns Composants extraits ou null si format invalide
   *
   * @example
   * ```typescript
   * const parsed = EmailReplyService.parseReplyToAddress(
   *   'reply+int_abc-123-def_a1b2c3d4@reply.seido-app.com'
   * )
   * // => { type: 'intervention', id: 'abc-123-def', hash: 'a1b2c3d4' }
   * ```
   */
  static parseReplyToAddress(address: string): ParsedReplyToAddress | null {
    if (!address) return null

    // Normaliser l'adresse (minuscules, trim)
    const normalizedAddress = address.toLowerCase().trim()

    // Match: reply+int_{uuid}_{hash}@domain
    // UUID format: 8-4-4-4-12 hexadecimal characters with hyphens
    const interventionMatch = normalizedAddress.match(
      /reply\+int_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})_([a-f0-9]{8})@/i
    )

    if (interventionMatch) {
      return {
        type: 'intervention',
        id: interventionMatch[1],
        hash: interventionMatch[2]
      }
    }

    logger.debug({ address }, '📧 [EMAIL-REPLY] Failed to parse reply-to address')
    return null
  }

  /**
   * Vérifie que le hash correspond à l'entité (sécurité anti-falsification)
   *
   * Utilise une comparaison constant-time pour éviter les timing attacks.
   *
   * @param type - Type d'entité ('intervention')
   * @param id - UUID de l'entité
   * @param providedHash - Hash fourni dans l'adresse reply-to
   * @returns true si le hash est valide, false sinon
   *
   * @example
   * ```typescript
   * const isValid = EmailReplyService.verifyHash('intervention', 'abc-123', 'a1b2c3d4')
   * ```
   */
  static verifyHash(type: string, id: string, providedHash: string): boolean {
    if (!REPLY_TO_SECRET) {
      logger.warn({}, '⚠️ [EMAIL-REPLY] REPLY_TO_SECRET not configured - cannot verify hash')
      return false
    }

    const expectedHash = this.generateHash(type, id)

    // Comparaison constant-time pour éviter timing attacks
    // crypto.timingSafeEqual requiert des Buffers de même longueur
    try {
      const expectedBuffer = Buffer.from(expectedHash, 'utf8')
      const providedBuffer = Buffer.from(providedHash.toLowerCase(), 'utf8')

      // Si les longueurs diffèrent, c'est forcément invalide
      if (expectedBuffer.length !== providedBuffer.length) {
        logger.warn(
          { type, id, providedHash: providedHash.substring(0, 4) + '...' },
          '⚠️ [EMAIL-REPLY] Hash length mismatch'
        )
        return false
      }

      const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer)

      if (!isValid) {
        logger.warn(
          { type, id, providedHash: providedHash.substring(0, 4) + '...' },
          '⚠️ [EMAIL-REPLY] Invalid hash - potential tampering attempt'
        )
      }

      return isValid
    } catch (error) {
      logger.error(
        { error, type, id },
        '❌ [EMAIL-REPLY] Error during hash verification'
      )
      return false
    }
  }

  /**
   * Vérifie si le service reply-to est correctement configuré
   *
   * @returns true si REPLY_TO_SECRET est défini
   */
  static isConfigured(): boolean {
    return !!REPLY_TO_SECRET
  }

  /**
   * Retourne le domaine inbound configuré
   */
  static getInboundDomain(): string {
    return INBOUND_DOMAIN
  }

  // ══════════════════════════════════════════════════════════════
  // Private Methods
  // ══════════════════════════════════════════════════════════════

  /**
   * Génère un hash HMAC-SHA256 tronqué à 8 caractères
   *
   * Le hash est utilisé pour:
   * 1. Identifier de manière unique l'entité dans l'adresse email
   * 2. Vérifier l'authenticité lors de la réception
   *
   * 8 caractères hex = 32 bits d'entropie = suffisant pour anti-falsification
   * avec vérification constant-time (pas de brute-force possible)
   *
   * @param type - Type d'entité ('intervention')
   * @param id - UUID de l'entité
   * @returns Hash hexadécimal de 8 caractères
   */
  private static generateHash(type: string, id: string): string {
    return crypto
      .createHmac('sha256', REPLY_TO_SECRET)
      .update(`${type}:${id}`)
      .digest('hex')
      .substring(0, 8)
  }
}

// ══════════════════════════════════════════════════════════════
// Factory Function
// ══════════════════════════════════════════════════════════════

/**
 * Crée une instance du EmailReplyService
 * Note: Cette classe utilise des méthodes statiques, pas besoin d'instanciation
 */
export const createEmailReplyService = () => EmailReplyService
