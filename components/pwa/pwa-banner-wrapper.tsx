'use client'

/**
 * 📱 PWA BANNER WRAPPER
 * 
 * Composant wrapper qui fournit le contexte PWABanner et affiche le banner.
 * À utiliser dans les root layouts de chaque rôle pour wrapper le contenu.
 * 
 * Ce composant:
 * - Fournit le PWABannerProvider pour que tous les composants enfants
 *   (dont le header) puissent accéder à isBannerVisible
 * - Affiche le PWAInstallBanner en position fixe au-dessus du header
 * 
 * Usage:
 * ```tsx
 * // Dans le layout racine d'un rôle
 * <PWABannerWrapper>
 *   <main>
 *     <RealtimeWrapper>
 *       {children}
 *     </RealtimeWrapper>
 *   </main>
 * </PWABannerWrapper>
 * ```
 */

import { type ReactNode } from 'react'
import { PWABannerProvider } from '@/contexts/pwa-banner-context'
import { PWAInstallBanner } from './pwa-install-banner'

interface PWABannerWrapperProps {
  children: ReactNode
}

export function PWABannerWrapper({ children }: PWABannerWrapperProps) {
  return (
    <PWABannerProvider>
      <PWAInstallBanner />
      {children}
    </PWABannerProvider>
  )
}

