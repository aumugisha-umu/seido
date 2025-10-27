'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Bouton d'installation PWA pour le header
 * Version légère, visible uniquement quand l'installation est possible
 */
export function InstallPWAHeaderButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      console.log('✅ [PWA-HEADER] beforeinstallprompt event fired!')
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      console.log('✅ [PWA-HEADER] App installed successfully')
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    // Check if already installed (display mode standalone)
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ [PWA-HEADER] App already installed (standalone mode)')
        setIsInstalled(true)
        return true
      }
      return false
    }

    // Initial check
    if (!checkIfInstalled()) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstall)
      window.addEventListener('appinstalled', handleAppInstalled)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return

    console.log('📲 [PWA-HEADER] User clicked install from header')

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      console.log(`📊 [PWA-HEADER] User choice: ${outcome}`)

      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } catch (error) {
      console.error('❌ [PWA-HEADER] Error:', error)
    }
  }

  // Masquer si déjà installé ou si pas de prompt disponible
  if (isInstalled || !installPrompt) return null

  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Installer</span>
    </Button>
  )
}
