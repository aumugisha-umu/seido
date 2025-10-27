"use client"

import { useState, useEffect, useCallback } from 'react'
import { PushNotificationManager } from '@/lib/push-notification-manager'
import { logger } from '@/lib/logger'
import { useAuth } from './use-auth'

/**
 * 📱 Hook PWA: Installation avec auto-subscription aux notifications
 *
 * Fonctionnalités:
 * - Capture l'événement beforeinstallprompt
 * - Déclenche l'installation programmatiquement
 * - S'inscrit automatiquement aux notifications après installation
 * - Gère les états de chargement et erreurs
 *
 * Usage:
 * ```tsx
 * const { canInstall, isInstalled, triggerInstall, isLoading, error } = usePWAInstallWithNotifications()
 *
 * if (canInstall) {
 *   <Button onClick={triggerInstall}>Installer l'app</Button>
 * }
 * ```
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallHookReturn {
  canInstall: boolean
  isInstalled: boolean
  isLoading: boolean
  error: string | null
  triggerInstall: () => Promise<{ success: boolean; notificationsEnabled: boolean }>
}

export function usePWAInstallWithNotifications(): PWAInstallHookReturn {
  const { user } = useAuth()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🎯 Capture l'événement beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      logger.info('📱 [PWA-HOOK] beforeinstallprompt event captured')
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      logger.info('📱 [PWA-HOOK] PWA installed successfully')
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    // Vérifier si déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      logger.info('📱 [PWA-HOOK] App already installed')
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  /**
   * 🚀 Déclenche l'installation + auto-subscribe aux notifications
   */
  const triggerInstall = useCallback(async (): Promise<{ success: boolean; notificationsEnabled: boolean }> => {
    if (!installPrompt) {
      logger.warn('📱 [PWA-HOOK] No install prompt available')
      setError('Installation non disponible')
      return { success: false, notificationsEnabled: false }
    }

    if (!user) {
      logger.warn('📱 [PWA-HOOK] User not authenticated')
      setError('Utilisateur non authentifié')
      return { success: false, notificationsEnabled: false }
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1️⃣ Déclencher le prompt d'installation natif
      logger.info('📱 [PWA-HOOK] Showing install prompt')
      await installPrompt.prompt()

      // 2️⃣ Attendre le choix de l'utilisateur
      const { outcome } = await installPrompt.userChoice
      logger.info('📱 [PWA-HOOK] User choice:', outcome)

      if (outcome === 'accepted') {
        logger.info('✅ [PWA-HOOK] Installation accepted by user')
        setInstallPrompt(null)
        setIsInstalled(true)

        // 3️⃣ Auto-subscription aux notifications
        let notificationsEnabled = false
        try {
          logger.info('🔔 [PWA-HOOK] Attempting automatic notification subscription')
          const notificationManager = PushNotificationManager.getInstance()
          await notificationManager.subscribe(user.id)
          notificationsEnabled = true
          logger.info('✅ [PWA-HOOK] Notifications enabled successfully')
        } catch (notifError) {
          // Ne pas bloquer l'installation si les notifications échouent
          logger.error('❌ [PWA-HOOK] Notification subscription failed:', notifError)
          // On ne set pas l'erreur ici car l'installation a réussi
        }

        setIsLoading(false)
        return { success: true, notificationsEnabled }
      } else {
        logger.info('❌ [PWA-HOOK] Installation dismissed by user')
        setIsLoading(false)
        return { success: false, notificationsEnabled: false }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'installation'
      logger.error('❌ [PWA-HOOK] Installation error:', err)
      setError(errorMessage)
      setIsLoading(false)
      return { success: false, notificationsEnabled: false }
    }
  }, [installPrompt, user])

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isLoading,
    error,
    triggerInstall
  }
}
