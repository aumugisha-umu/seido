/**
 * HMAC-signed document download token utility
 *
 * Provides cryptographically signed tokens for secure document downloads.
 * Tokens encode the documentId + expiry, signed with HMAC-SHA256.
 *
 * Format (base64url): base64url(`${documentId}:${exp}:${hmac_signature}`)
 *
 * @security Uses timing-safe comparison to prevent timing attacks.
 */

import crypto from 'crypto'

const TOKEN_SECRET =
  process.env.DOCUMENT_TOKEN_SECRET || process.env.SUPABASE_JWT_SECRET || ''

const TOKEN_TTL_SECONDS = 24 * 60 * 60 // 24 hours

/**
 * Generates a signed download token for a document.
 *
 * @param documentId  UUID of the document
 * @param expiresAt   Optional Unix timestamp (seconds). Defaults to now + 24h.
 * @returns           base64url-encoded signed token
 */
export function generateDocumentToken(
  documentId: string,
  expiresAt?: number
): string {
  const exp = expiresAt ?? Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  const payload = `${documentId}:${exp}`
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('hex')
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

/**
 * Verifies a signed download token against a document ID.
 *
 * Returns false if:
 * - Token is malformed
 * - documentId in token does not match the expected one
 * - Token has expired
 * - HMAC signature is invalid (using timing-safe comparison)
 *
 * @param token       base64url-encoded signed token
 * @param documentId  UUID to verify against
 * @returns           true if token is valid and not expired
 */
export function verifyDocumentToken(
  token: string,
  documentId: string
): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const parts = decoded.split(':')
    if (parts.length !== 3) return false

    const [tokenDocId, exp, signature] = parts

    if (tokenDocId !== documentId) return false
    if (parseInt(exp, 10) < Math.floor(Date.now() / 1000)) return false // expired

    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${tokenDocId}:${exp}`)
      .digest('hex')

    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expectedSignature)

    if (sigBuf.length !== expectedBuf.length) return false

    return crypto.timingSafeEqual(sigBuf, expectedBuf)
  } catch {
    return false
  }
}
