"use client"

import { useTransition, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

/**
 * Hook pour gérer la navigation avec protection contre le double-clic
 *
 * Utilise React 19 useTransition pour:
 * - Fournir un état isPending pendant la navigation
 * - Permettre de désactiver les boutons pendant la navigation
 * - Éviter les navigations multiples
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPending, navigate } = useNavigationPending()
 *
 *   return (
 *     <Button
 *       disabled={isPending}
 *       onClick={() => navigate('/destination')}
 *     >
 *       {isPending ? <Spinner /> : 'Go'}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useNavigationPending() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const isNavigatingRef = useRef(false)

  const navigate = useCallback((url: string, options?: { replace?: boolean }) => {
    // Protection contre les navigations multiples
    if (isNavigatingRef.current || isPending) {
      logger.info(`🚫 [NAV-PENDING] Navigation blocked - already navigating to: ${url}`)
      return
    }

    isNavigatingRef.current = true
    logger.info(`🧭 [NAV-PENDING] Starting navigation to: ${url}`)

    startTransition(() => {
      if (options?.replace) {
        router.replace(url)
      } else {
        router.push(url)
      }
      // Reset après un délai pour permettre une nouvelle navigation
      setTimeout(() => {
        isNavigatingRef.current = false
      }, 500)
    })
  }, [router, isPending, startTransition])

  const refresh = useCallback(() => {
    if (isPending) {
      logger.info('🚫 [NAV-PENDING] Refresh blocked - navigation in progress')
      return
    }

    logger.info('🔄 [NAV-PENDING] Refreshing current page')
    startTransition(() => {
      router.refresh()
    })
  }, [router, isPending, startTransition])

  const back = useCallback(() => {
    if (isNavigatingRef.current || isPending) {
      logger.info('🚫 [NAV-PENDING] Back blocked - already navigating')
      return
    }

    isNavigatingRef.current = true
    logger.info('⬅️ [NAV-PENDING] Going back')
    startTransition(() => {
      router.back()
      setTimeout(() => {
        isNavigatingRef.current = false
      }, 500)
    })
  }, [router, isPending, startTransition])

  return {
    isPending,
    navigate,
    refresh,
    back,
    // Alias pour compatibilité
    isNavigating: isPending || isNavigatingRef.current
  }
}

/**
 * Hook pour actions avec protection contre les soumissions multiples
 * Utile pour les opérations CRUD qui ne sont pas des navigations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isPending, execute } = useActionPending()
 *
 *   const handleDelete = () => {
 *     execute(async () => {
 *       await deleteItem(id)
 *       toast.success('Item deleted')
 *     })
 *   }
 *
 *   return (
 *     <Button disabled={isPending} onClick={handleDelete}>
 *       {isPending ? 'Deleting...' : 'Delete'}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useActionPending() {
  const [isPending, startTransition] = useTransition()
  const isExecutingRef = useRef(false)

  const execute = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    // Protection contre les exécutions multiples
    if (isExecutingRef.current || isPending) {
      logger.info('🚫 [ACTION-PENDING] Action blocked - already executing')
      return undefined
    }

    isExecutingRef.current = true

    try {
      return await new Promise<T>((resolve, reject) => {
        startTransition(async () => {
          try {
            const result = await action()
            resolve(result)
          } catch (error) {
            reject(error)
          } finally {
            isExecutingRef.current = false
          }
        })
      })
    } catch (error) {
      isExecutingRef.current = false
      throw error
    }
  }, [isPending, startTransition])

  return {
    isPending,
    execute,
    isExecuting: isPending || isExecutingRef.current
  }
}
