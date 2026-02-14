'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone, CheckCircle, Monitor, Globe, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Fonction pour détecter le navigateur
function detectBrowser(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome'
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera'
  return 'Navigateur inconnu'
}

// Fonction pour détecter l'OS
function detectOS(ua: string): string {
  if (ua.includes('Win')) return 'Windows'
  if (ua.includes('Mac')) return 'macOS'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('Linux')) return 'Linux'
  return 'Système inconnu'
}

// Fonction pour détecter le type d'appareil
function detectDeviceType(ua: string): string {
  if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) {
    return 'Mobile'
  }
  if (ua.includes('iPad') || ua.includes('Tablet')) {
    return 'Tablette'
  }
  return 'Ordinateur'
}

// Fonction pour obtenir le mode d'affichage
function getDisplayMode(): string {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'Application (standalone)'
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'Plein écran'
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'Interface minimale'
  }
  return 'Navigateur'
}

// Fonction pour obtenir les infos de l'appareil
function getDeviceInfo() {
  const ua = navigator.userAgent
  return {
    browser: detectBrowser(ua),
    os: detectOS(ua),
    deviceType: detectDeviceType(ua),
    displayMode: getDisplayMode()
  }
}

export function InstallPWAButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed (display mode standalone)
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    // Initial check
    if (checkIfInstalled()) {
      return // Already installed, no need for event listeners
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        setInstallPrompt(null)
      }
    } catch (error) {
      console.error('❌ [PWA-INSTALL] Error:', error)
    }
  }

  // Si installé, afficher les informations de l'appareil
  if (isInstalled) {
    const deviceInfo = getDeviceInfo()

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Application installée
          </CardTitle>
          <CardDescription>
            SEIDO est installé sur cet appareil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Informations appareil */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
              <p className="text-sm font-medium text-green-900">
                ✅ Appareil actuel
              </p>
              <div className="text-sm text-green-800 space-y-1">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  <span><strong>Appareil:</strong> {deviceInfo.deviceType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span><strong>Navigateur:</strong> {deviceInfo.browser}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span><strong>Système:</strong> {deviceInfo.os}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span><strong>Mode:</strong> {deviceInfo.displayMode}</span>
                </div>
              </div>
            </div>

            {/* Info multi-appareils */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Installer sur d'autres appareils :</strong> Accédez aux Paramètres depuis vos autres appareils (téléphone, tablette, ordinateur) pour installer SEIDO partout.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

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
