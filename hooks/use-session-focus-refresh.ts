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
  const wasHiddenRef = useRef(false) // Track if window was actually hidden

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

    // ✅ FIX: Only trigger on visibility change (tab switching), not internal focus events
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && wasHiddenRef.current) {
        // Window was hidden and now visible again (user returned to tab)
        logger.info('👁️ [FOCUS-REFRESH] Window became visible after being hidden, refreshing...')
        wasHiddenRef.current = false
        await ensureSession()
        forceRefreshCurrentSection()
      } else if (document.visibilityState === 'hidden') {
        // Track that window became hidden
        wasHiddenRef.current = true
      }
    }

    // ❌ REMOVED: window.addEventListener('focus', handleFocus) - caused refresh on input clicks
    // ✅ KEPT: Only use visibilitychange for true tab switching
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [forceRefreshCurrentSection])
}


