"use client"

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'

/**
 * 📱 Hook : Affichage PWA unique par session
 *
 * @deprecated Utilisez plutôt le PWABannerProvider et usePWABanner() de
 * '@/contexts/pwa-banner-context' pour le nouveau système de banner.
 * Ce hook est conservé pour compatibilité avec l'ancienne modal.
 *
 * Gère la logique d'affichage de la modale PWA sur les dashboards :
 * - Vérifie que l'utilisateur est authentifié
 * - Vérifie que la PWA n'est pas déjà installée
 * - Vérifie que le prompt n'a pas déjà été affiché durant cette session
 * - Déclenche automatiquement après 3 secondes d'arrivée sur le dashboard
 *
 * Utilise sessionStorage pour tracking (réinitialise à chaque nouvelle session browser).
 *
 * Usage:
 * ```tsx
 * const { shouldShowPrompt, markAsShown } = usePWAPromptOncePerSession()
 *
 * <PWAInstallPromptModal
 *   isOpen={shouldShowPrompt}
 *   onClose={markAsShown}
 * />
 * ```
 */

const SESSION_STORAGE_KEY = 'pwa-prompt-shown'
const PROMPT_DELAY_MS = 3000 // 3 secondes

interface UsePWAPromptOncePerSessionReturn {
  shouldShowPrompt: boolean
  markAsShown: () => void
  canInstall: boolean
}

export function usePWAPromptOncePerSession(): UsePWAPromptOncePerSessionReturn {
  const { user } = useAuth()
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    // Vérifications préalables
    if (!user) {
      logger.info('📱 [PWA-PROMPT-SESSION] User not authenticated, skipping prompt')
      return
    }

    // Vérifier si la PWA est déjà installée
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    if (isInstalled) {
      logger.info('📱 [PWA-PROMPT-SESSION] PWA already installed, skipping prompt')
      return
    }

    // Vérifier si le prompt a déjà été affiché durant cette session
    const promptShown = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (promptShown === 'true') {
      logger.info('📱 [PWA-PROMPT-SESSION] Prompt already shown in this session, skipping')
      return
    }

    // Vérifier si le beforeinstallprompt est disponible (possibilité d'installer)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      logger.info('📱 [PWA-PROMPT-SESSION] beforeinstallprompt available, can show prompt')
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Déclencher le prompt après 3 secondes
    const timer = setTimeout(() => {
      logger.info('📱 [PWA-PROMPT-SESSION] Trigger delay elapsed, showing prompt')
      setShouldShowPrompt(true)
    }, PROMPT_DELAY_MS)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [user])

  /**
   * Marquer le prompt comme affiché pour cette session
   * Appelé quand :
   * - L'utilisateur installe la PWA
   * - L'utilisateur ferme/dismiss la modale
   */
  const markAsShown = () => {
    logger.info('📱 [PWA-PROMPT-SESSION] Marking prompt as shown for this session')
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
    setShouldShowPrompt(false)
  }

  return {
    shouldShowPrompt: shouldShowPrompt && canInstall,
    markAsShown,
    canInstall
  }
}
