'use client'

import { useState, useEffect } from 'react'
import { createUserService } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * Hook pour résoudre les IDs utilisateur JWT en UUIDs réels
 *
 * Gère la conversion des IDs avec préfixe `jwt_` en UUIDs database
 * pour éviter les erreurs PostgreSQL "invalid input syntax for type uuid"
 *
 * @param userId - ID utilisateur (peut être `jwt_xxxxx` ou UUID direct)
 * @returns UUID résolu ou null si en cours de résolution
 *
 * @example
 * ```tsx
 * const resolvedUserId = useResolvedUserId(user.id)
 *
 * if (!resolvedUserId) {
 *   return <LoadingSpinner />
 * }
 *
 * // Utiliser resolvedUserId dans les appels API
 * const data = await tenantService.getTenantData(resolvedUserId)
 * ```
 */
export function useResolvedUserId(userId: string | undefined): string | null {
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    // Reset si userId change
    setResolvedId(null)
    setIsResolving(false)

    if (!userId) {
      logger.debug('🔍 [useResolvedUserId] No userId provided')
      return
    }

    // Cas 1: UUID direct (pas de préfixe jwt_)
    if (!userId.startsWith('jwt_')) {
      logger.debug('🔍 [useResolvedUserId] Direct UUID detected', { userId })
      setResolvedId(userId)
      return
    }

    // Cas 2: ID avec préfixe jwt_ -> résolution async nécessaire
    const authUserId = userId.replace('jwt_', '')
    logger.info('🔄 [useResolvedUserId] Resolving JWT user ID', {
      jwtId: userId,
      authUserId
    })

    setIsResolving(true)

    // Résolution via UserService
    createUserService()
      .getByAuthUserId(authUserId)
      .then((result) => {
        if (result.success && result.data) {
          const actualUserId = result.data.id
          logger.info('✅ [useResolvedUserId] JWT user ID resolved', {
            jwtId: userId,
            authUserId,
            actualUserId
          })
          setResolvedId(actualUserId)
        } else {
          logger.error('❌ [useResolvedUserId] Failed to resolve JWT user ID', {
            jwtId: userId,
            authUserId,
            error: result.error
          })
          // En cas d'échec, retourner null (l'appelant gérera le loading state)
          setResolvedId(null)
        }
      })
      .catch((error) => {
        logger.error('❌ [useResolvedUserId] Exception during JWT resolution', {
          jwtId: userId,
          authUserId,
          error: error instanceof Error ? error.message : String(error)
        })
        setResolvedId(null)
      })
      .finally(() => {
        setIsResolving(false)
      })
  }, [userId])

  return resolvedId
}

/**
 * Variante du hook qui retourne également le statut de résolution
 *
 * @param userId - ID utilisateur (peut être `jwt_xxxxx` ou UUID direct)
 * @returns Objet avec `resolvedId`, `isResolving`, et `hasError`
 *
 * @example
 * ```tsx
 * const { resolvedId, isResolving, hasError } = useResolvedUserIdWithStatus(user.id)
 *
 * if (isResolving) {
 *   return <LoadingSpinner message="Résolution de l'utilisateur..." />
 * }
 *
 * if (hasError || !resolvedId) {
 *   return <ErrorMessage message="Impossible de charger les données utilisateur" />
 * }
 *
 * // Utiliser resolvedId
 * ```
 */
export function useResolvedUserIdWithStatus(userId: string | undefined): {
  resolvedId: string | null
  isResolving: boolean
  hasError: boolean
} {
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Reset state
    setResolvedId(null)
    setIsResolving(false)
    setHasError(false)

    if (!userId) {
      return
    }

    // UUID direct
    if (!userId.startsWith('jwt_')) {
      setResolvedId(userId)
      return
    }

    // JWT resolution
    const authUserId = userId.replace('jwt_', '')
    setIsResolving(true)

    createUserService()
      .getByAuthUserId(authUserId)
      .then((result) => {
        if (result.success && result.data) {
          setResolvedId(result.data.id)
          setHasError(false)
        } else {
          setResolvedId(null)
          setHasError(true)
        }
      })
      .catch(() => {
        setResolvedId(null)
        setHasError(true)
      })
      .finally(() => {
        setIsResolving(false)
      })
  }, [userId])

  return { resolvedId, isResolving, hasError }
}
