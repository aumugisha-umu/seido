"use client"

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'

/**
 * Hook simplifié pour gérer le refresh lors de la navigation
 * ✅ Next.js 15: Utilise router.refresh() au lieu de cache management custom
 */
export function useNavigationRefresh() {
  const pathname = usePathname()
  const router = useRouter()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    // Ne trigger que si le path a vraiment changé
    if (lastPathRef.current === pathname) {
      return
    }

    logger.info(`🧭 [NAV-REFRESH] Navigation detected to: ${pathname}`)
    lastPathRef.current = pathname

    // Délai pour éviter les appels en rafale lors de navigation rapide
    const timeoutId = setTimeout(() => {
      logger.info(`🔄 [NAV-REFRESH] Triggering router.refresh() for path: ${pathname}`)
      router.refresh() // Next.js 15 Data Cache refresh
    }, 200)

    return () => clearTimeout(timeoutId)
  }, [pathname, router])

  // Fonction pour forcer un refresh manuel
  const forceRefreshCurrentSection = () => {
    logger.info(`🔄 [NAV-REFRESH] Force refresh requested for: ${pathname}`)
    router.refresh()
  }

  // Fonction pour refresh global
  const forceGlobalRefresh = () => {
    logger.info(`🌍 [NAV-REFRESH] Global refresh requested`)
    router.refresh()
  }

  return {
    currentPath: pathname,
    forceRefreshCurrentSection,
    forceGlobalRefresh
  }
}

// Hook pour détecter les changements de section spécifiques
export function useSectionChange(onSectionChange?: (_section: string) => void) {
  const pathname = usePathname()
  
  useEffect(() => {
    // Extraire la section de l'URL
    const pathParts = pathname.split('/')
    const role = pathParts[1] // gestionnaire, locataire, etc.
    const section = pathParts[2] // dashboard, biens, interventions, etc.
    
    if (section && onSectionChange) {
      logger.info(`📍 [SECTION-CHANGE] Section changed to: ${role}/${section}`)
      onSectionChange(section)
    }
  }, [pathname, onSectionChange])
  
  return pathname
}
