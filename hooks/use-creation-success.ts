"use client"

import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCallback } from "react"
import { logger, logError } from '@/lib/logger'
interface CreationSuccessOptions {
  successTitle: string
  successDescription: string
  redirectPath: string
  refreshData?: () => Promise<void> | void
  hardRefreshFallback?: boolean
  hardRefreshDelay?: number
}

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
    logger.info("🎉 Handling creation success...")

    // 1. Refresh des données AVANT la navigation
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

      // Hard refresh fallback si nécessaire
      if (hardRefreshFallback) {
        logger.info(`🔄 Scheduling hard refresh in ${hardRefreshDelay}ms...`)
        setTimeout(() => {
          logger.info("🔄 Soft refresh failed, doing hard refresh...")
          window.location.reload()
        }, hardRefreshDelay)
        return // Exit early pour éviter la navigation
      }
    }

    // 2. Afficher le toast (seulement si un titre est fourni)
    if (successTitle) {
      toast({
        title: successTitle,
        description: successDescription,
        variant: "success",
      })
    }

    // 3. Navigation après un court délai pour garantir que le refresh est appliqué
    setTimeout(() => {
      logger.info(`🚀 Navigating to ${redirectPath}...`)
      router.push(redirectPath)
    }, 500) // Délai augmenté pour garantir la stabilité

  }, [router, toast])

  return { handleSuccess }
}

