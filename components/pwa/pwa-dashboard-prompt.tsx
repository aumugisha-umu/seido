"use client"

import { PWAInstallPromptModal } from './pwa-install-prompt-modal'
import { usePWAPromptOncePerSession } from '@/hooks/use-pwa-prompt-once-per-session'
import { logger } from '@/lib/logger'

/**
 * 📱 Composant : PWA Prompt pour Dashboards
 *
 * Composant réutilisable qui affiche la modale PWA sur les dashboards
 * de tous les rôles (gestionnaire, prestataire, locataire).
 *
 * Fonctionnalités :
 * - S'affiche automatiquement 3 secondes après l'arrivée sur le dashboard
 * - Affichage unique par session (sessionStorage)
 * - Gère les cas : installation réussie ou dismissal
 * - Ne s'affiche que si utilisateur authentifié + PWA installable
 *
 * Usage :
 * ```tsx
 * export default function MyDashboard() {
 *   return (
 *     <>
 *       <PWADashboardPrompt />
 *       <div>Contenu du dashboard...</div>
 *     </>
 *   )
 * }
 * ```
 */

export function PWADashboardPrompt() {
  const { shouldShowPrompt, markAsShown } = usePWAPromptOncePerSession()

  const handleInstallSuccess = (notificationsEnabled: boolean) => {
    logger.info('✅ [PWA-DASHBOARD-PROMPT] Installation successful', {
      notificationsEnabled
    })
    markAsShown()
  }

  const handleDismiss = () => {
    logger.info('❌ [PWA-DASHBOARD-PROMPT] User dismissed the prompt')
    markAsShown()
  }

  return (
    <PWAInstallPromptModal
      isOpen={shouldShowPrompt}
      onClose={markAsShown}
      onInstallSuccess={handleInstallSuccess}
      onDismiss={handleDismiss}
    />
  )
}
