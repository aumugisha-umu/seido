/**
 * Beta Access Utilities
 * Gestion des cookies et vérifications d'accès beta
 */

import { cookies } from 'next/headers'

// Constants
export const BETA_COOKIE_NAME = 'seido_beta_access'
export const BETA_COOKIE_DURATION = 90 * 24 * 60 * 60 * 1000 // 90 jours en millisecondes

/**
 * Vérifie si l'utilisateur a accès à la beta
 * @returns true si le cookie beta est présent et valide
 */
export async function checkBetaAccess(): Promise<boolean> {
  const cookieStore = await cookies()
  const betaCookie = cookieStore.get(BETA_COOKIE_NAME)

  return betaCookie !== undefined && betaCookie.value === 'granted'
}

/**
 * Définit le cookie d'accès beta (httpOnly, secure, 90 jours)
 */
export async function setBetaAccessCookie(): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set({
    name: BETA_COOKIE_NAME,
    value: 'granted',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: BETA_COOKIE_DURATION / 1000, // maxAge en secondes
    path: '/'
  })
}

/**
 * Supprime le cookie d'accès beta
 */
export async function removeBetaAccessCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(BETA_COOKIE_NAME)
}
