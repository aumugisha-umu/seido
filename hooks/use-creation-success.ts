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

