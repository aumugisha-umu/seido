"use client"

import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCallback } from "react"

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
    console.log("🎉 Handling creation success...")

    // 1. Redirection immédiate
    router.push(redirectPath)
    
    // 2. Après redirection, gérer le refresh et le toast
    setTimeout(async () => {
      let softRefreshSuccess = false
      
      // 3. Tentative de soft refresh
      if (refreshData) {
        try {
          console.log("🔄 Attempting soft refresh...")
          await refreshData()
          softRefreshSuccess = true
          console.log("✅ Soft refresh successful")
        } catch (error) {
          console.warn("⚠️ Soft refresh failed:", error)
        }
      }
      
      // 4. Toast après le refresh
      toast({
        title: successTitle,
        description: successDescription,
        variant: "success",
      })
      
      // 5. Hard refresh fallback si nécessaire
      if (!softRefreshSuccess && hardRefreshFallback) {
        console.log(`🔄 Scheduling hard refresh in ${hardRefreshDelay}ms...`)
        setTimeout(() => {
          console.log("🔄 Soft refresh failed, doing hard refresh...")
          window.location.reload()
        }, hardRefreshDelay)
      }
      
    }, 100) // Délai court pour permettre la redirection
    
  }, [router, toast])

  return { handleSuccess }
}
