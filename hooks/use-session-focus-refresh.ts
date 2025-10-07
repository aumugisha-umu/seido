"use client"

import { useEffect, useRef } from 'react'
import { createBrowserSupabaseClient } from '@/lib/services'
import { useNavigationRefresh } from './use-navigation-refresh'
import { logger } from '@/lib/logger'

// Rafraîchit la session Supabase à la reprise de focus/visibilité
// et déclenche un soft refresh de la section courante
export const useSessionFocusRefresh = () => {
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null)
  const { forceRefreshCurrentSection } = useNavigationRefresh()

  useEffect(() => {
    supabaseRef.current = createBrowserSupabaseClient()

    const ensureSession = async () => {
      try {
        const supabase = supabaseRef.current!
        const { data, error } = await supabase.auth.getSession()
        if (error || !data?.session) {
          logger.info('🔄 [FOCUS-REFRESH] No active session found, refreshing...')
          await supabase.auth.refreshSession()
        }
      } catch (err) {
        // Soft-fail; on continue et on laisse les requêtes échouer si besoin
        logger.warn('⚠️ [FOCUS-REFRESH] Session check failed:', err)
      }
    }

    const handleFocus = async () => {
      await ensureSession()
      forceRefreshCurrentSection()
    }

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        await ensureSession()
        forceRefreshCurrentSection()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [forceRefreshCurrentSection])
}


