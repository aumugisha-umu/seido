"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useCacheManagement } from './use-cache-management'

// Hook spécialisé pour gérer le refresh des données lors de la navigation
export function useNavigationRefresh() {
  const pathname = usePathname()
  const cacheManager = useCacheManagement()

  useEffect(() => {
    console.log(`🧭 [NAV-REFRESH] Navigation detected to: ${pathname}`)
    
    // ✅ FIX BOUCLE INFINIE: Délai pour éviter les appels en rafale lors de navigation rapide
    const timeoutId = setTimeout(() => {
      // Logique spécifique par section de l'application
      const refreshStrategies = {
        // Dashboard - refresh toutes les stats
        dashboard: () => {
          console.log(`🏠 [NAV-REFRESH] Dashboard section - refreshing stats`)
          cacheManager.triggerRefresh(['manager-stats', 'contact-stats'])
        },
        
        // Biens - refresh les bâtiments et lots
        biens: () => {
          console.log(`🏢 [NAV-REFRESH] Biens section - refreshing buildings and lots`)
          cacheManager.triggerRefresh(['manager-stats', 'buildings', 'lots'])
        },
        
        // Interventions - refresh les interventions et stats
        interventions: () => {
          console.log(`🔧 [NAV-REFRESH] Interventions section - refreshing interventions`)
          cacheManager.triggerRefresh(['manager-stats', 'interventions', 'intervention-stats'])
        },
        
        // Contacts - refresh les contacts
        contacts: () => {
          console.log(`👥 [NAV-REFRESH] Contacts section - refreshing contacts`)
          cacheManager.triggerRefresh(['contact-stats', 'contacts', 'contacts-data'])
        }
      }

      // Déterminer quelle section est active et appliquer la stratégie
      if (pathname.includes('/dashboard')) {
        refreshStrategies.dashboard()
      } else if (pathname.includes('/biens')) {
        refreshStrategies.biens()
      } else if (pathname.includes('/interventions')) {
        refreshStrategies.interventions()
      } else if (pathname.includes('/contacts')) {
        refreshStrategies.contacts()
      } else {
        // Pour toute autre navigation, faire un refresh général mais moins agressif
        console.log(`🔄 [NAV-REFRESH] General navigation - light refresh`)
        cacheManager.triggerRefresh(['manager-stats'])
      }
    }, 200) // ✅ FIX: Délai augmenté à 200ms pour éviter les appels en rafale
    
    return () => clearTimeout(timeoutId)
  }, [pathname, cacheManager])

  // Fonction pour forcer un refresh manuel
  const forceRefreshCurrentSection = () => {
    console.log(`🔄 [NAV-REFRESH] Force refresh requested for: ${pathname}`)
    
    if (pathname.includes('/dashboard')) {
      cacheManager.invalidateCache(['manager-stats', 'contact-stats'])
      cacheManager.triggerRefresh(['manager-stats', 'contact-stats'])
    } else if (pathname.includes('/biens')) {
      cacheManager.invalidateCache(['manager-stats', 'buildings', 'lots'])
      cacheManager.triggerRefresh(['manager-stats', 'buildings', 'lots'])
    } else if (pathname.includes('/interventions')) {
      cacheManager.invalidateCache(['manager-stats', 'interventions', 'intervention-stats'])
      cacheManager.triggerRefresh(['manager-stats', 'interventions', 'intervention-stats'])
    } else if (pathname.includes('/contacts')) {
      cacheManager.invalidateCache(['contact-stats', 'contacts'])
      cacheManager.triggerRefresh(['contact-stats', 'contacts'])
    } else {
      // Refresh global pour les autres sections
      cacheManager.invalidateAllCache()
      cacheManager.triggerGlobalRefresh()
    }
  }

  // Fonction pour refresh global (utilisé en cas d'erreur ou pour debug)
  const forceGlobalRefresh = () => {
    console.log(`🌍 [NAV-REFRESH] Global refresh requested`)
    cacheManager.invalidateAllCache()
    cacheManager.triggerGlobalRefresh()
  }

  return {
    currentPath: pathname,
    forceRefreshCurrentSection,
    forceGlobalRefresh
  }
}

// Hook pour détecter les changements de section spécifiques
export function useSectionChange(onSectionChange?: (section: string) => void) {
  const pathname = usePathname()
  
  useEffect(() => {
    // Extraire la section de l'URL
    const pathParts = pathname.split('/')
    const role = pathParts[1] // gestionnaire, locataire, etc.
    const section = pathParts[2] // dashboard, biens, interventions, etc.
    
    if (section && onSectionChange) {
      console.log(`📍 [SECTION-CHANGE] Section changed to: ${role}/${section}`)
      onSectionChange(section)
    }
  }, [pathname, onSectionChange])
  
  return pathname
}
