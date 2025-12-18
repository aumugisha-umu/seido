"use client"

/**
 * @deprecated Ce hook est DEPRECATED et ne doit plus être utilisé.
 *
 * PROBLÈMES CONNUS:
 * - `await refreshData()` peut bloquer indéfiniment si la requête échoue
 * - `setTimeout(..., 500)` ajoute un délai artificiel de 500ms avant navigation
 * - Pattern incohérent avec Next.js 15 Server Actions best practices
 *
 * ALTERNATIVES RECOMMANDÉES:
 *
 * 1. Pour les Server Actions avec navigation:
 *    - Utiliser `redirect()` directement dans la Server Action
 *    - Exemple: voir `createLotAction` dans `app/gestionnaire/(no-navbar)/biens/lots/nouveau/actions.ts`
 *
 * 2. Pour les composants clients appelant des API:
 *    - Utiliser `toast()` + `router.push()` directement
 *    - Exemple:
 *      ```typescript
 *      toast({ title: "Succès", description: "Créé!", variant: "success" })
 *      router.push('/destination')
 *      ```
 *
 * 3. Pour les cas avec upload de fichiers (FormData):
 *    - Garder les API routes mais utiliser le pattern simplifié côté client
 *    - Exemple: voir `nouvelle-intervention-client.tsx`
 *
 * Migration effectuée le: 2025-12-10
 * Ce fichier sera supprimé dans une future release.
 */

import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCallback } from "react"
import { logger } from '@/lib/logger'

interface CreationSuccessOptions {
  successTitle: string
  successDescription: string
  redirectPath: string
  refreshData?: () => Promise<void> | void
  hardRefreshFallback?: boolean
  hardRefreshDelay?: number
}

/**
 * @deprecated Utilisez `toast()` + `router.push()` ou `redirect()` dans Server Actions à la place.
 * @see ALTERNATIVES RECOMMANDÉES dans le commentaire de fichier ci-dessus
 */
export function useCreationSuccess() {
  const router = useRouter()
  const { toast } = useToast()

  const handleSuccess = useCallback(async ({
    successTitle,
    successDescription,
    redirectPath,
    refreshData,
    hardRefreshFallback = true,
    hardRefreshDelay = 3000
  }: CreationSuccessOptions) => {
    // Log deprecation warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[DEPRECATED] useCreationSuccess est deprecated. ' +
        'Utilisez toast() + router.push() ou redirect() dans Server Actions.'
      )
    }

    logger.info("🎉 [DEPRECATED] Handling creation success...")

    // 1. Afficher le toast immédiatement (seulement si un titre est fourni)
    if (successTitle) {
      toast({
        title: successTitle,
        description: successDescription,
        variant: "success",
      })
    }

    // 2. Essayer de refresh les données (non-bloquant)
    let refreshFailed = false
    try {
      if (refreshData) {
        logger.info("🔄 Calling refreshData before navigation...")
        await refreshData()
      }

      logger.info("🔄 Triggering router.refresh()...")
      router.refresh() // Force Server Component re-fetch
      logger.info("✅ Data refreshed successfully")
    } catch (error) {
      logger.warn("⚠️ Refresh failed:", error)
      refreshFailed = true
    }

    // 3. Navigation TOUJOURS vers la destination
    // Si le refresh a échoué, utiliser hard navigation comme fallback
    if (refreshFailed && hardRefreshFallback) {
      logger.info(`🔄 Using hard navigation to ${redirectPath}...`)
      setTimeout(() => {
        window.location.href = redirectPath
      }, 500)
    } else {
      setTimeout(() => {
        logger.info(`🚀 Navigating to ${redirectPath}...`)
        router.push(redirectPath)
      }, 500)
    }

  }, [router, toast])

  return { handleSuccess }
}
