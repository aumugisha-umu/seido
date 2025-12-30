'use client'

/**
 * 📱 PWA INSTALL BANNER
 * 
 * Banner fixe en haut de l'écran pour encourager l'installation de la PWA.
 * Apparaît au-dessus du header et reste visible lors du scroll.
 * 
 * Features:
 * - Position fixe en haut de l'écran (z-50)
 * - Animation slide-down à l'apparition
 * - Bouton d'installation + bouton de fermeture
 * - Se masque pour la session quand fermé
 * - Réapparaît à chaque nouvelle connexion
 * 
 * Hauteur: 44px (exportée via PWA_BANNER_HEIGHT dans le contexte)
 */

import { Smartphone, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWABanner, PWA_BANNER_HEIGHT } from '@/contexts/pwa-banner-context'
import { cn } from '@/lib/utils'

export function PWAInstallBanner() {
  const { isBannerVisible, triggerInstall, dismissBanner } = usePWABanner()

  const handleInstall = async () => {
    await triggerInstall()
  }

  if (!isBannerVisible) return null

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-gradient-to-r from-primary to-primary/90',
        'text-primary-foreground',
        'border-b border-primary-foreground/10',
        'shadow-md',
        'animate-in slide-in-from-top duration-300'
      )}
      style={{ height: PWA_BANNER_HEIGHT }}
      role="banner"
      aria-label="Installer l'application SEIDO"
    >
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
        {/* Message */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Smartphone className="h-5 w-5 flex-shrink-0 hidden sm:block" />
          <p className="text-sm font-medium truncate">
            <span className="hidden sm:inline">
              Installez l'application SEIDO pour une meilleure expérience !
            </span>
            <span className="sm:hidden">
              Installez l'app SEIDO !
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleInstall}
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
          >
            <Download className="h-4 w-4" />
            <span className="hidden xs:inline">Installer</span>
          </Button>
          
          <Button
            onClick={dismissBanner}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-white/10 text-primary-foreground"
            aria-label="Fermer le banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Export de la hauteur pour les composants qui doivent ajuster leur positionnement
 */
export { PWA_BANNER_HEIGHT }









