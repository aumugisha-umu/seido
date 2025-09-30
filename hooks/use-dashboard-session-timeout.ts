'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from './use-auth'
import { manualSessionCleanup } from '@/lib/session-cleanup'

/**
 * Hook pour détecter les sessions inactives sur le dashboard et déclencher un cleanup automatique
 */
export const useDashboardSessionTimeout = () => {
  const { user, loading } = useAuth()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredCleanup = useRef(false)

  useEffect(() => {
    // ✅ DÉSACTIVER LE HOOK EN MODE DEVELOPMENT (pour tests E2E et debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 [DASHBOARD-TIMEOUT] Development mode - session timeout hook DISABLED')
      return
    }

    console.log('🕐 [DASHBOARD-TIMEOUT] Session timeout hook initialized')

    // Démarrer le timeout de 30 secondes (augmenté de 8s pour plus de sécurité)
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ [DASHBOARD-TIMEOUT] 30 seconds elapsed - checking session state...')
      console.log('📊 [DASHBOARD-TIMEOUT] Current state:', { 
        user: user ? `${user.email} (${user.role})` : null, 
        loading,
        hasTriggeredCleanup: hasTriggeredCleanup.current 
      })

      // Si après 30 secondes, on n'a toujours pas d'utilisateur et pas de loading, c'est suspect
      if (!user && !loading && !hasTriggeredCleanup.current) {
        console.log('🚨 [DASHBOARD-TIMEOUT] Session appears inactive after 30s - triggering cleanup')
        hasTriggeredCleanup.current = true

        // Déclencher le cleanup manuel
        manualSessionCleanup().catch(error => {
          console.error('❌ [DASHBOARD-TIMEOUT] Cleanup failed:', error)
        })
      } else {
        console.log('✅ [DASHBOARD-TIMEOUT] Session state is valid - no action needed')
      }
    }, 30000) // 30 secondes

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        console.log('🧹 [DASHBOARD-TIMEOUT] Clearing timeout')
        clearTimeout(timeoutRef.current)
      }
    }
  }, []) // Seulement au montage initial

  // Si on a un utilisateur, annuler le timeout
  useEffect(() => {
    if (user && timeoutRef.current) {
      console.log('✅ [DASHBOARD-TIMEOUT] User loaded - canceling timeout')
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [user])

  return {
    isMonitoring: !!timeoutRef.current
  }
}

