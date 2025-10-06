/**
 * 🔄 HOOK LOADING D'AUTHENTIFICATION
 * 
 * Gère l'état de loading pendant les transitions d'authentification
 * pour éviter les scintillements et améliorer l'UX.
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
// Fonction simplifiée pour détecter les transitions d'auth (sans import DAL)
function isInAuthTransition(pathname: string): boolean {
  return pathname.includes('/auth/callback') ||
         pathname.includes('/auth/signup-success') ||
         pathname.includes('/auth/reset-password')
}

export interface AuthLoadingState {
  isAuthLoading: boolean
  isTransitioning: boolean
  loadingMessage: string
}

/**
 * Hook pour gérer l'état de loading des transitions d'auth
 */
export const useAuthLoading = (userLoading: boolean, user: unknown | null) => {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Vérification de l\'authentification...')
  const pathname = usePathname()

  useEffect(() => {
    // Déterminer l'état de transition
    const inTransition = isInAuthTransition(pathname || '')
    
    if (inTransition) {
      setIsTransitioning(true)
      if (pathname?.includes('/callback')) {
        setLoadingMessage('Finalisation de la connexion...')
      } else if (pathname?.includes('/signup-success')) {
        setLoadingMessage('Confirmation du compte...')
      } else if (pathname?.includes('/reset-password')) {
        setLoadingMessage('Vérification du lien de réinitialisation...')
      }
    } else {
      // Délai pour éviter le scintillement rapide
      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setLoadingMessage('Vérification de l\'authentification...')
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [pathname])

  // Auto-clear transitioning after successful auth
  useEffect(() => {
    if (user && isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 500) // Petit délai pour une transition fluide
      
      return () => clearTimeout(timer)
    }
  }, [user, isTransitioning])

  const isAuthLoading = userLoading || isTransitioning

  return {
    isAuthLoading,
    isTransitioning, 
    loadingMessage
  } as AuthLoadingState
}
