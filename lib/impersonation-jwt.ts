/**
 * Impersonation JWT Utilities
 *
 * Gere la creation et verification des tokens JWT pour l'impersonation admin.
 * Le cookie stocke l'email de l'admin original pour pouvoir restaurer sa session.
 */

import jwt from 'jsonwebtoken'

// Utilise le JWT secret de Supabase pour signer les tokens
// Supporte les deux noms de variable pour compatibilite
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET

export const IMPERSONATION_COOKIE_NAME = 'admin-impersonation'
export const IMPERSONATION_DURATION_HOURS = 4

interface ImpersonationPayload {
  admin_email: string
  admin_name?: string
  type: 'impersonation'
  iat: number
  exp: number
}

/**
 * Signe un token JWT pour stocker les infos de l'admin pendant l'impersonation
 */
export function signImpersonationToken(adminEmail: string, adminName?: string): string {
  if (!JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET not configured')
  }

  return jwt.sign(
    {
      admin_email: adminEmail,
      admin_name: adminName,
      type: 'impersonation'
    },
    JWT_SECRET,
    { expiresIn: `${IMPERSONATION_DURATION_HOURS}h` }
  )
}

/**
 * Verifie et decode un token d'impersonation
 * @returns null si le token est invalide ou expire
 */
export function verifyImpersonationToken(token: string): { admin_email: string; admin_name?: string } | null {
  if (!JWT_SECRET) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ImpersonationPayload

    if (decoded.type !== 'impersonation') {
      return null
    }

    return {
      admin_email: decoded.admin_email,
      admin_name: decoded.admin_name
    }
  } catch {
    // Token invalide ou expire
    return null
  }
}

/**
 * Decode un token sans verifier la signature (pour affichage client)
 * @returns null si le token est malformed
 */
export function decodeImpersonationToken(token: string): { admin_email: string; admin_name?: string } | null {
  try {
    const decoded = jwt.decode(token) as ImpersonationPayload | null

    if (!decoded || decoded.type !== 'impersonation') {
      return null
    }

    return {
      admin_email: decoded.admin_email,
      admin_name: decoded.admin_name
    }
  } catch {
    return null
  }
}
