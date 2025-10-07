"use client"

import { useEffect, useRef } from 'react'
import { createBrowserSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'

/**
 * 🔐 SESSION KEEPALIVE HOOK
 *
 * Maintient la session Supabase active pendant l'utilisation de l'application
 * pour éviter les problèmes de chargement après inactivité.
 *
 * Fonctionnalités :
 * - Vérifie la session toutes les 60 secondes si utilisateur actif
 * - Auto-refresh si session expire dans moins de 5 minutes
 * - Détecte l'inactivité (pas de mouvement souris pendant 30s)
 * - Désactive le keepalive pendant l'inactivité (économie ressources)
 * - Réactive au premier mouvement après inactivité
 *
 * Usage : Ajouter dans les layout-client de chaque rôle
 */

const SESSION_CHECK_INTERVAL = 60000 // 60 secondes
const SESSION_REFRESH_THRESHOLD = 300000 // 5 minutes avant expiration
const INACTIVITY_TIMEOUT = 30000 // 30 secondes d'inactivité

export function useSessionKeepalive() {
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null)
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)
  const mountedRef = useRef(true)

  // Fonction pour vérifier et maintenir la session
  const checkAndMaintainSession = async () => {
    if (!mountedRef.current || !isActiveRef.current) {
      return
    }

    try {
      const supabase = supabaseRef.current!
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        logger.warn('⚠️ [SESSION-KEEPALIVE] Error getting session:', error.message)
        // Tenter un refresh en cas d'erreur
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          logger.error('❌ [SESSION-KEEPALIVE] Failed to refresh session:', refreshError.message)
        } else {
          logger.info('✅ [SESSION-KEEPALIVE] Session refreshed after error')
        }
        return
      }

      if (!data?.session) {
        logger.warn('⚠️ [SESSION-KEEPALIVE] No active session found')
        return
      }

      // Calculer le temps restant avant expiration
      const expiresAt = data.session.expires_at
      if (!expiresAt) {
        logger.warn('⚠️ [SESSION-KEEPALIVE] Session has no expiration time')
        return
      }

      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = (expiresAt - now) * 1000 // Convertir en millisecondes

      logger.info(`🔐 [SESSION-KEEPALIVE] Session check - expires in ${Math.floor(timeUntilExpiry / 60000)} minutes`)

      // Si la session expire dans moins de 5 minutes, la refresh
      if (timeUntilExpiry < SESSION_REFRESH_THRESHOLD) {
        logger.info('🔄 [SESSION-KEEPALIVE] Session expiring soon, refreshing...')
        const { error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          logger.error('❌ [SESSION-KEEPALIVE] Failed to refresh session:', refreshError.message)
        } else {
          logger.info('✅ [SESSION-KEEPALIVE] Session refreshed successfully')
        }
      }
    } catch (err) {
      logger.error('❌ [SESSION-KEEPALIVE] Exception during session check:', err)
    }
  }

  // Fonction pour marquer l'utilisateur comme actif
  const markUserActive = () => {
    if (!isActiveRef.current) {
      logger.info('👋 [SESSION-KEEPALIVE] User became active')
      isActiveRef.current = true
      // Vérifier immédiatement la session après reprise d'activité
      checkAndMaintainSession()
    }

    // Réinitialiser le timeout d'inactivité
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        isActiveRef.current = false
        logger.info('😴 [SESSION-KEEPALIVE] User became inactive')
      }
    }, INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    mountedRef.current = true
    supabaseRef.current = createBrowserSupabaseClient()

    logger.info('🚀 [SESSION-KEEPALIVE] Initializing session keepalive')

    // Vérifier immédiatement la session au montage
    checkAndMaintainSession()

    // Configurer l'intervalle de vérification
    sessionIntervalRef.current = setInterval(() => {
      checkAndMaintainSession()
    }, SESSION_CHECK_INTERVAL)

    // Écouter les événements d'activité utilisateur
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      window.addEventListener(event, markUserActive, { passive: true })
    })

    // Marquer initialement comme actif
    markUserActive()

    // Cleanup
    return () => {
      mountedRef.current = false

      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current)
        sessionIntervalRef.current = null
      }

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
        inactivityTimeoutRef.current = null
      }

      activityEvents.forEach(event => {
        window.removeEventListener(event, markUserActive)
      })

      logger.info('🛑 [SESSION-KEEPALIVE] Session keepalive stopped')
    }
  }, [])

  return {
    // Exposer une fonction pour forcer un check manuel si nécessaire
    forceCheck: checkAndMaintainSession
  }
}
