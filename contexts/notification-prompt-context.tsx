'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useNotificationPrompt, type UseNotificationPromptReturn } from '@/hooks/use-notification-prompt'
import { NotificationPermissionModal } from '@/components/pwa/notification-permission-modal'

/**
 * Context pour la gestion globale du prompt de notification
 *
 * Fournit l'état et les méthodes du hook useNotificationPrompt
 * à tous les composants enfants, et affiche automatiquement
 * la modale quand nécessaire.
 */

const NotificationPromptContext = createContext<UseNotificationPromptReturn | null>(null)

interface NotificationPromptProviderProps {
  children: ReactNode
}

export function NotificationPromptProvider({ children }: NotificationPromptProviderProps) {
  const notificationPrompt = useNotificationPrompt()

  return (
    <NotificationPromptContext.Provider value={notificationPrompt}>
      {children}
      {/* La modale s'affiche automatiquement quand shouldShowModal est true */}
      <NotificationPermissionModal />
    </NotificationPromptContext.Provider>
  )
}

/**
 * Hook pour accéder au context de notification prompt
 * Peut être utilisé pour contrôler manuellement la modale
 * ou obtenir l'état des notifications
 */
export function useNotificationPromptContext(): UseNotificationPromptReturn | null {
  return useContext(NotificationPromptContext)
}
