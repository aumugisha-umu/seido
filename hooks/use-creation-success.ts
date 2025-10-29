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

    // 1. Redirection immédiate
    router.push(redirectPath)
    
    // 2. Après redirection, gérer le refresh et le toast
    setTimeout(async () => {
      let softRefreshSuccess = false

      // 3. Tentative de soft refresh avec router.refresh() FIRST
      try {
        logger.info("🔄 Attempting Next.js router refresh...")
        router.refresh() // Force Server Component re-fetch
        softRefreshSuccess = true
        logger.info("✅ Router refresh triggered")

        // 4. Optionally call additional refreshData if provided
        if (refreshData) {
          logger.info("🔄 Calling additional refreshData...")
          await refreshData()
        }
      } catch (error) {
        logger.warn("⚠️ Soft refresh failed:", error)
      }

      // 5. Toast après le refresh (seulement si un titre est fourni)
      if (successTitle) {
        toast({
          title: successTitle,
          description: successDescription,
          variant: "success",
        })
      }

      // 6. Hard refresh fallback si nécessaire
      if (!softRefreshSuccess && hardRefreshFallback) {
        logger.info(`🔄 Scheduling hard refresh in ${hardRefreshDelay}ms...`)
        setTimeout(() => {
          logger.info("🔄 Soft refresh failed, doing hard refresh...")
          window.location.reload()
        }, hardRefreshDelay)
      }
      
    }, 100) // Délai court pour permettre la redirection
    
  }, [router, toast])

  return { handleSuccess }
}

