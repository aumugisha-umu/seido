'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWAButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      console.log('✅ [PWA-INSTALL] beforeinstallprompt event fired!')
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      console.log('✅ [PWA-INSTALL] App installed successfully')
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Debug logs
    console.log('🔍 [PWA-INSTALL] Listeners registered')
    console.log('🔍 [PWA-INSTALL] SW state:', navigator.serviceWorker?.controller ? 'active' : 'not active')

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return

    console.log('📲 [PWA-INSTALL] User clicked install')

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      console.log(`📊 [PWA-INSTALL] User choice: ${outcome}`)

      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } catch (error) {
      console.error('❌ [PWA-INSTALL] Error:', error)
    }
  }

  // Masquer si installé
  if (isInstalled) return null

  // Si pas de prompt disponible, afficher message informatif
  if (!installPrompt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Installer l'application
          </CardTitle>
          <CardDescription>
            Installez SEIDO sur votre appareil pour un accès rapide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Pour installer SEIDO :</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
              <li>• <strong>Chrome/Edge :</strong> Menu ⋮ → "Installer SEIDO"</li>
              <li>• <strong>Safari iOS :</strong> Partager → "Sur l'écran d'accueil"</li>
              <li>• Le prompt d'installation peut apparaître automatiquement</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si prompt disponible, afficher bouton d'installation
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Installer l'application
        </CardTitle>
        <CardDescription>
          Installez SEIDO sur votre appareil pour un accès rapide et une meilleure expérience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleInstallClick}
          className="w-full"
          size="lg"
        >
          <Download className="h-5 w-5 mr-2" />
          Installer SEIDO
        </Button>

        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Avantages :</strong> Accès instantané depuis votre écran d'accueil, notifications push, fonctionne hors ligne, expérience comme une app native.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
